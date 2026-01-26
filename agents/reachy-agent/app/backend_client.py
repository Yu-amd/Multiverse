"""
OpenAI-compatible backend client for AIM and other inference providers.
"""
import time
import sys
from typing import Deque
from collections import deque
from pathlib import Path
from typing import Dict, Any, Optional
import httpx

# Add common framework to path
common_path = Path(__file__).parent.parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

from app.observability import (
    record_aim_latency,
    record_llm_rate_limited,
    record_llm_request,
    record_llm_timeout,
    record_llm_tokens_in,
    record_llm_tokens_out,
    record_llm_total_latency,
    record_llm_ttft,
    StructuredLogger,
)
from app.models import BackendType

logger = StructuredLogger(__name__)

_LLM_LATENCIES_MS: Deque[tuple[float, int]] = deque()
_LLM_REQUESTS_TS: Deque[float] = deque()
_LLM_TIMEOUTS_TS: Deque[float] = deque()
_LLM_RATE_LIMIT_TS: Deque[float] = deque()


def _prune_window(queue: Deque, cutoff: float) -> None:
    while queue:
        head = queue[0]
        ts = head[0] if isinstance(head, tuple) else head
        if ts < cutoff:
            queue.popleft()
        else:
            break


def _record_llm_request() -> None:
    _LLM_REQUESTS_TS.append(time.time())


def _record_llm_latency(latency_ms: int) -> None:
    _LLM_LATENCIES_MS.append((time.time(), latency_ms))


def _record_llm_timeout() -> None:
    _LLM_TIMEOUTS_TS.append(time.time())


def _record_llm_rate_limit() -> None:
    _LLM_RATE_LIMIT_TS.append(time.time())


def get_llm_health_snapshot(window_s: int = 300, ttft_budget_ms: int = 1500) -> Dict[str, object]:
    now = time.time()
    cutoff = now - window_s

    _prune_window(_LLM_REQUESTS_TS, cutoff)
    _prune_window(_LLM_TIMEOUTS_TS, cutoff)
    _prune_window(_LLM_RATE_LIMIT_TS, cutoff)
    _prune_window(_LLM_LATENCIES_MS, cutoff)

    request_count = len(_LLM_REQUESTS_TS)
    timeout_count = len(_LLM_TIMEOUTS_TS)
    rate_limited = len(_LLM_RATE_LIMIT_TS)
    latency_samples = [lat for _, lat in _LLM_LATENCIES_MS]
    latency_samples.sort()
    p95 = None
    if latency_samples:
        idx = max(0, int(0.95 * len(latency_samples)) - 1)
        p95 = latency_samples[idx]

    timeout_rate = (timeout_count / request_count) if request_count else 0.0
    degraded = False
    reasons = []
    if p95 is not None and p95 > ttft_budget_ms:
        degraded = True
        reasons.append("ttft_p95_budget")
    if timeout_rate > 0.01:
        degraded = True
        reasons.append("timeout_rate")
    if rate_limited > 0:
        degraded = True
        reasons.append("rate_limited")

    return {
        "request_count": request_count,
        "timeout_rate": timeout_rate,
        "p95_ttft_ms": p95,
        "degraded": degraded,
        "reasons": reasons,
    }


class BackendClient:
    """Client for OpenAI-compatible inference backends."""
    
    def __init__(
        self,
        backend: BackendType,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize backend client.
        
        Args:
            backend: Backend type (local or aim)
            base_url: Base URL for the API
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        self.backend = backend
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    async def chat_completion(
        self,
        model: str,
        messages: list[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Send chat completion request to backend.
        
        Args:
            model: Model identifier
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional parameters
            
        Returns:
            Response dict with 'content' and metadata
            
        Raises:
            httpx.HTTPError: If request fails
        """
        # OpenAI-compatible API uses /v1/chat/completions
        # base_url should already include /v1 if it's a full endpoint URL
        # If base_url ends with /v1, don't add it again
        if self.base_url.endswith('/v1'):
            url = f"{self.base_url}/chat/completions"
        else:
            url = f"{self.base_url}/v1/chat/completions"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": False,  # Explicitly set to False for non-streaming
            **kwargs
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
        
        start_time = time.time()
        _record_llm_request()
        backend_label = str(self.backend)
        
        try:
            logger.info(
                "Sending chat completion request",
                backend=str(self.backend),
                base_url=self.base_url,
                model=model
            )
            
            response = await self.client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            elapsed_ms = int((time.time() - start_time) * 1000)
            
            # Record latency for observability
            record_aim_latency("chat_completion", elapsed_ms)
            record_llm_request(backend_label, model, "success")
            record_llm_total_latency(backend_label, model, elapsed_ms)
            record_llm_ttft(backend_label, model, elapsed_ms)
            _record_llm_latency(elapsed_ms)
            
            result = response.json()
            
            # Extract content from response
            content = ""
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
            
            usage = result.get("usage", {}) if isinstance(result, dict) else {}
            if usage:
                input_tokens = int(usage.get("prompt_tokens", 0) or 0)
                output_tokens = int(usage.get("completion_tokens", 0) or 0)
                if input_tokens:
                    record_llm_tokens_in(backend_label, model, input_tokens)
                if output_tokens:
                    record_llm_tokens_out(backend_label, model, output_tokens)

            logger.info(
                "Chat completion successful",
                backend=str(self.backend),
                model=model,
                latency_ms=elapsed_ms,
                tokens=usage.get("total_tokens", 0)
            )
            
            return {
                "content": content,
                "model": result.get("model", model),
                "usage": result.get("usage", {}),
                "latency_ms": elapsed_ms,
                "raw_response": result
            }
            
        except httpx.HTTPStatusError as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            error_detail = None
            try:
                error_detail = e.response.json()
            except:
                error_detail = e.response.text

            status_code = e.response.status_code
            record_llm_request(backend_label, model, f"error_{status_code}")
            record_llm_total_latency(backend_label, model, elapsed_ms)
            if status_code == 429:
                record_llm_rate_limited(backend_label)
                _record_llm_rate_limit()
            
            logger.error(
                "Chat completion failed",
                backend=str(self.backend),
                model=model,
                status_code=status_code,
                error=str(e),
                error_detail=error_detail,
                latency_ms=elapsed_ms
            )
            raise
        except httpx.TimeoutException as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            record_llm_request(backend_label, model, "timeout")
            record_llm_total_latency(backend_label, model, elapsed_ms)
            record_llm_timeout(backend_label)
            _record_llm_timeout()
            logger.error(
                "Chat completion timed out",
                backend=str(self.backend),
                model=model,
                error=str(e),
                latency_ms=elapsed_ms
            )
            raise
        except httpx.HTTPError as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            record_llm_request(backend_label, model, "error")
            record_llm_total_latency(backend_label, model, elapsed_ms)
            logger.error(
                "Chat completion failed",
                backend=str(self.backend),
                model=model,
                error=str(e),
                latency_ms=elapsed_ms
            )
            raise
        except Exception as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
            record_llm_request(backend_label, model, "error")
            record_llm_total_latency(backend_label, model, elapsed_ms)
            logger.error(
                "Unexpected error in chat completion",
                backend=str(self.backend),
                model=model,
                error=str(e),
                latency_ms=elapsed_ms
            )
            raise
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

