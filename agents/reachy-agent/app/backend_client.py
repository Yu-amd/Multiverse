"""
OpenAI-compatible backend client for AIM and other inference providers.
"""
import time
import sys
from pathlib import Path
from typing import Dict, Any, Optional
import httpx

# Add common framework to path
common_path = Path(__file__).parent.parent.parent / "common" / "app"
if str(common_path) not in sys.path:
    sys.path.insert(0, str(common_path))

from app.observability import record_aim_latency, StructuredLogger
from app.models import BackendType

logger = StructuredLogger(__name__)


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
            
            result = response.json()
            
            # Extract content from response
            content = ""
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
            
            logger.info(
                "Chat completion successful",
                backend=str(self.backend),
                model=model,
                latency_ms=elapsed_ms,
                tokens=result.get("usage", {}).get("total_tokens", 0)
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
            
            logger.error(
                "Chat completion failed",
                backend=str(self.backend),
                model=model,
                status_code=e.response.status_code,
                error=str(e),
                error_detail=error_detail,
                latency_ms=elapsed_ms
            )
            raise
        except httpx.HTTPError as e:
            elapsed_ms = int((time.time() - start_time) * 1000)
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

