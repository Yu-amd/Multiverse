import { describe, it, expect } from 'vitest';
import { createAppError, shouldRetry, getRetryDelay, type AppError } from '../errors';

describe('createAppError', () => {
  it('should handle DOMException AbortError', () => {
    const error = new DOMException('Aborted', 'AbortError');
    const result = createAppError(error);
    
    expect(result.type).toBe('timeout');
    expect(result.message).toBe('Request was cancelled or timed out.');
    expect(result.retryable).toBe(true);
  });

  it('should handle network errors (TypeError with fetch)', () => {
    const error = new TypeError('Failed to fetch');
    const result = createAppError(error, { endpoint: 'http://localhost:1234' });
    
    expect(result.type).toBe('network');
    expect(result.message).toContain('Network error');
    expect(result.message).toContain('http://localhost:1234');
    expect(result.retryable).toBe(true);
  });

  it('should handle timeout errors', () => {
    const error = new Error('Request timeout');
    const result = createAppError(error);
    
    expect(result.type).toBe('timeout');
    expect(result.retryable).toBe(true);
  });

  it('should handle 404 errors', () => {
    const error = new Error('404 Not Found');
    const result = createAppError(error);
    
    expect(result.type).toBe('not_found');
    expect(result.statusCode).toBe(404);
    expect(result.retryable).toBe(false);
  });

  it('should handle 401 errors', () => {
    const error = new Error('401 Unauthorized');
    const result = createAppError(error);
    
    expect(result.type).toBe('auth');
    expect(result.statusCode).toBe(401);
    expect(result.retryable).toBe(false);
  });

  it('should handle 403 errors', () => {
    const error = new Error('403 Forbidden');
    const result = createAppError(error);
    
    expect(result.type).toBe('auth');
    expect(result.statusCode).toBe(403);
    expect(result.retryable).toBe(false);
  });

  it('should handle 429 rate limit errors', () => {
    const error = new Error('429 Rate limit exceeded');
    const result = createAppError(error);
    
    expect(result.type).toBe('rate_limit');
    expect(result.statusCode).toBe(429);
    expect(result.retryable).toBe(true);
  });

  it('should extract retry-after from rate limit error', () => {
    const error = new Error('429 Rate limit exceeded. Retry-After: 60');
    const result = createAppError(error);
    
    expect(result.type).toBe('rate_limit');
    expect(result.retryAfter).toBe(60);
  });

  it('should handle 500 server errors', () => {
    const error = new Error('500 Internal Server Error');
    const result = createAppError(error);
    
    expect(result.type).toBe('server');
    expect(result.statusCode).toBe(500);
    expect(result.retryable).toBe(true);
  });

  it('should handle 502 server errors', () => {
    const error = new Error('502 Bad Gateway');
    const result = createAppError(error);
    
    expect(result.type).toBe('server');
    expect(result.statusCode).toBe(502);
    expect(result.retryable).toBe(true);
  });

  it('should handle 503 server errors', () => {
    const error = new Error('503 Service Unavailable');
    const result = createAppError(error);
    
    expect(result.type).toBe('server');
    expect(result.statusCode).toBe(503);
    expect(result.retryable).toBe(true);
  });

  it('should handle CORS errors', () => {
    const error = new Error('CORS error: blocked');
    const result = createAppError(error);
    
    expect(result.type).toBe('cors');
    expect(result.retryable).toBe(false);
  });

  it('should handle validation errors', () => {
    const error = new Error('Validation error: invalid input');
    const result = createAppError(error, { field: 'endpoint' });
    
    expect(result.type).toBe('validation');
    expect(result.field).toBe('endpoint');
    expect(result.retryable).toBe(false);
  });

  it('should handle unknown errors', () => {
    const error = new Error('Something unexpected');
    const result = createAppError(error);
    
    expect(result.type).toBe('unknown');
    expect(result.message).toBe('Something unexpected');
    expect(result.retryable).toBe(false);
  });

  it('should handle non-Error objects', () => {
    const error = 'String error';
    const result = createAppError(error);
    
    expect(result.type).toBe('unknown');
    expect(result.message).toBe('An unexpected error occurred. Please try again.');
    expect(result.retryable).toBe(false);
  });
});

describe('shouldRetry', () => {
  it('should return false for non-retryable errors', () => {
    const error: AppError = {
      type: 'auth',
      message: 'Authentication failed',
      retryable: false
    };
    
    expect(shouldRetry(error, 0)).toBe(false);
  });

  it('should return true for retryable errors within max attempts', () => {
    const error: AppError = {
      type: 'network',
      message: 'Network error',
      retryable: true
    };
    
    expect(shouldRetry(error, 0)).toBe(true);
    expect(shouldRetry(error, 1)).toBe(true);
    expect(shouldRetry(error, 2)).toBe(true);
  });

  it('should return false when max attempts reached', () => {
    const error: AppError = {
      type: 'network',
      message: 'Network error',
      retryable: true
    };
    
    expect(shouldRetry(error, 3, 3)).toBe(false);
    expect(shouldRetry(error, 4, 3)).toBe(false);
  });

  it('should return true for rate limit errors with retry-after', () => {
    const error: AppError = {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      retryable: true,
      retryAfter: 60
    };
    
    expect(shouldRetry(error, 0)).toBe(true);
    expect(shouldRetry(error, 1)).toBe(true);
  });
});

describe('getRetryDelay', () => {
  it('should use retry-after for rate limit errors', () => {
    const error: AppError = {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      retryable: true,
      retryAfter: 60
    };
    
    expect(getRetryDelay(error, 0)).toBe(60000); // 60 seconds in milliseconds
    expect(getRetryDelay(error, 1)).toBe(60000); // Always uses retry-after
  });

  it('should use exponential backoff for other retryable errors', () => {
    const error: AppError = {
      type: 'network',
      message: 'Network error',
      retryable: true
    };
    
    expect(getRetryDelay(error, 0)).toBe(1000); // 1s
    expect(getRetryDelay(error, 1)).toBe(2000); // 2s
    expect(getRetryDelay(error, 2)).toBe(4000); // 4s
    expect(getRetryDelay(error, 3)).toBe(8000); // 8s
  });

  it('should cap exponential backoff at 30 seconds', () => {
    const error: AppError = {
      type: 'network',
      message: 'Network error',
      retryable: true
    };
    
    // 2^10 = 1024 seconds, but should be capped at 30s
    const delay = getRetryDelay(error, 10);
    expect(delay).toBeLessThanOrEqual(30000);
  });
});

