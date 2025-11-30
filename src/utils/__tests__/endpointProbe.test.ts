import { describe, it, expect, vi, beforeEach } from 'vitest';
import { probeEndpointHealth, clearAllHealthCache, getCachedHealth } from '../endpointProbe';

// Mock fetch
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('endpointProbe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllHealthCache(); // Clear all cache before each test
  });

  it('should return offline status for unreachable endpoints', async () => {
    const endpoint = 'http://invalid-endpoint.com';
    
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await probeEndpointHealth(endpoint);

    expect(result.status).toBe('offline');
    expect(result.error).toBeDefined();
  });

  it('should return degraded status for 401 errors', async () => {
    const endpoint = 'http://localhost:1234';
    
    // Mock /health failing, then chat endpoint returning 401
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

    const result = await probeEndpointHealth(endpoint);

    expect(result.status).toBe('degraded');
    expect(result.error).toContain('Authentication failed');
  });

  it('should return degraded status for 500 errors', async () => {
    const endpoint = 'http://localhost:5000';
    
    // Mock /health failing, then chat endpoint returning 500
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: vi.fn().mockReturnValue(null)
        }
      });

    const result = await probeEndpointHealth(endpoint);

    expect(result.status).toBe('degraded');
    expect(result.error).toContain('Server error');
  });

  it('should handle API key parameter', async () => {
    const endpoint = 'http://localhost:9999';
    const apiKey = 'test-api-key';
    
    mockFetch.mockRejectedValue(new Error('Network error'));

    // Just verify the function accepts API key without throwing
    const result = await probeEndpointHealth(endpoint, apiKey);
    expect(result).toBeDefined();
    expect(result.status).toBe('offline');
  });

  it('should clear all cache', () => {
    clearAllHealthCache();
    const cached = getCachedHealth('http://localhost:1234');
    expect(cached).toBeNull();
  });

  it('should return null for non-existent cache', () => {
    clearAllHealthCache();
    const cached = getCachedHealth('http://nonexistent.com');
    expect(cached).toBeNull();
  });
});
