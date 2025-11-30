/**
 * Endpoint health and capability probing
 * Probes endpoints to detect health status and capabilities
 */

import type { EndpointHealth, EndpointCapabilities, EndpointHealthStatus } from '../types/endpoint';
import { createAppError } from '../types/errors';
import { logger } from './logger';

const PROBE_TIMEOUT = 5000; // 5 seconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedHealth {
  health: EndpointHealth;
  timestamp: number;
}

const healthCache = new Map<string, CachedHealth>();

/**
 * Probe endpoint health by trying /health endpoint first, then a minimal chat request
 */
export async function probeEndpointHealth(
  endpoint: string,
  apiKey?: string
): Promise<EndpointHealth> {
  // Check cache first
  const cached = healthCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('Using cached health check for:', endpoint);
    return cached.health;
  }

  const startTime = Date.now();
  let status: EndpointHealthStatus = 'unknown';
  let capabilities: EndpointCapabilities | undefined;
  let error: string | undefined;

  try {
    // Try /health endpoint first
    try {
      const healthResponse = await fetchWithTimeout(
        `${endpoint}/health`,
        {
          method: 'GET',
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
        },
        PROBE_TIMEOUT
      );

      if (healthResponse.ok) {
        status = 'healthy';
        const responseTime = Date.now() - startTime;
        
        // Try to detect capabilities
        capabilities = await detectCapabilities(endpoint, apiKey);
        
        const health: EndpointHealth = {
          status,
          lastChecked: Date.now(),
          responseTime,
          capabilities
        };
        
        // Cache the result
        healthCache.set(endpoint, { health, timestamp: Date.now() });
        return health;
      }
    } catch (healthError) {
      // /health endpoint not available, try minimal chat request
      logger.debug('/health endpoint not available, trying chat endpoint');
    }

    // Fallback: Try a minimal chat completions request
    const chatResponse = await fetchWithTimeout(
      `${endpoint}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` })
        },
        body: JSON.stringify({
          model: 'test',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1
        })
      },
      PROBE_TIMEOUT
    );

    const responseTime = Date.now() - startTime;

    if (chatResponse.ok) {
      status = 'healthy';
      capabilities = await detectCapabilities(endpoint, apiKey);
    } else if (chatResponse.status === 401 || chatResponse.status === 403) {
      status = 'degraded';
      error = 'Authentication failed';
    } else if (chatResponse.status >= 500) {
      status = 'degraded';
      error = `Server error: ${chatResponse.status}`;
    } else {
      status = 'degraded';
      error = `Unexpected status: ${chatResponse.status}`;
    }

    const health: EndpointHealth = {
      status,
      lastChecked: Date.now(),
      responseTime,
      capabilities,
      error
    };

    // Cache the result
    healthCache.set(endpoint, { health, timestamp: Date.now() });
    return health;
  } catch (err) {
    const appError = createAppError(err, { endpoint });
    status = 'offline';
    error = appError.message;

    const health: EndpointHealth = {
      status,
      lastChecked: Date.now(),
      responseTime: Date.now() - startTime,
      error
    };

    // Cache offline status for shorter time (1 minute)
    healthCache.set(endpoint, { health, timestamp: Date.now() });
    return health;
  }
}

/**
 * Detect endpoint capabilities by making test requests
 */
async function detectCapabilities(
  endpoint: string,
  apiKey?: string
): Promise<EndpointCapabilities> {
  const capabilities: EndpointCapabilities = {
    streaming: false,
    tools: false,
    systemPrompt: false,
    supportsModelsEndpoint: false
  };

  try {
    // Test 1: Check if /v1/models endpoint exists
    try {
      const modelsResponse = await fetchWithTimeout(
        `${endpoint}/v1/models`,
        {
          method: 'GET',
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
        },
        3000
      );
      if (modelsResponse.ok) {
        capabilities.supportsModelsEndpoint = true;
        const data = await modelsResponse.json();
        if (data.data && data.data.length > 0) {
          capabilities.model = data.data[0].id;
        }
      }
    } catch {
      // /v1/models not available, that's okay
    }

    // Test 2: Try a streaming request
    try {
      const streamResponse = await fetchWithTimeout(
        `${endpoint}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { Authorization: `Bearer ${apiKey}` })
          },
          body: JSON.stringify({
            model: capabilities.model || 'test',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5,
            stream: true
          })
        },
        3000
      );

      if (streamResponse.ok) {
        const contentType = streamResponse.headers.get('content-type');
        if (contentType && contentType.includes('text/event-stream')) {
          capabilities.streaming = true;
        }
      }
    } catch {
      // Streaming test failed, assume not supported
    }

    // Test 3: Try with system prompt
    try {
      const systemResponse = await fetchWithTimeout(
        `${endpoint}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { Authorization: `Bearer ${apiKey}` })
          },
          body: JSON.stringify({
            model: capabilities.model || 'test',
            messages: [
              { role: 'system', content: 'You are a test.' },
              { role: 'user', content: 'hi' }
            ],
            max_tokens: 1
          })
        },
        3000
      );

      if (systemResponse.ok) {
        capabilities.systemPrompt = true;
      }
    } catch {
      // System prompt test failed
    }

    // Test 4: Try with tools/function calling (if supported)
    try {
      const toolsResponse = await fetchWithTimeout(
        `${endpoint}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey && { Authorization: `Bearer ${apiKey}` })
          },
          body: JSON.stringify({
            model: capabilities.model || 'test',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 1,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'test_function',
                  description: 'A test function',
                  parameters: { type: 'object', properties: {} }
                }
              }
            ]
          })
        },
        3000
      );

      if (toolsResponse.ok) {
        capabilities.tools = true;
      }
    } catch {
      // Tools test failed
    }
  } catch (err) {
    logger.warn('Error detecting capabilities:', err);
  }

  return capabilities;
}

/**
 * Fetch with timeout
 */
function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    fetch(url, { ...options, signal: controller.signal })
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Clear health cache for an endpoint
 */
export function clearHealthCache(endpoint: string): void {
  healthCache.delete(endpoint);
}

/**
 * Clear all health cache
 */
export function clearAllHealthCache(): void {
  healthCache.clear();
}

/**
 * Get cached health (if available and not expired)
 */
export function getCachedHealth(endpoint: string): EndpointHealth | null {
  const cached = healthCache.get(endpoint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.health;
  }
  return null;
}

