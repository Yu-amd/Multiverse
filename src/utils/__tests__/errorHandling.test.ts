import { describe, it, expect } from 'vitest';
import { getFriendlyErrorMessage, getErrorDetails, isRetryableError } from '../errorHandling';

describe('getFriendlyErrorMessage', () => {
  it('should handle network errors', () => {
    const error = new TypeError('Failed to fetch');
    const result = getFriendlyErrorMessage(error);
    expect(result.toLowerCase()).toContain('network');
    expect(result.toLowerCase()).toContain('connection');
  });

  it('should handle fetch errors', () => {
    const error = new TypeError('Failed to fetch');
    const result = getFriendlyErrorMessage(error);
    expect(result.toLowerCase()).toContain('network');
  });

  it('should handle HTTP errors in message', () => {
    const error = new Error('404 Not Found');
    const result = getFriendlyErrorMessage(error);
    expect(result).toContain('Endpoint not found');
  });

  it('should handle CORS errors', () => {
    const error = new Error('CORS policy');
    const result = getFriendlyErrorMessage(error);
    expect(result).toContain('CORS');
  });

  it('should handle timeout errors', () => {
    const error = new DOMException('The operation was aborted', 'AbortError');
    const result = getFriendlyErrorMessage(error);
    // The message is "Request was cancelled or timed out." which contains "timed out"
    expect(result.toLowerCase()).toMatch(/timeout|timed out/);
  });

  it('should handle generic errors', () => {
    const error = new Error('Something went wrong');
    const result = getFriendlyErrorMessage(error);
    expect(result).toBe('Error: Something went wrong');
  });

  it('should handle non-Error objects', () => {
    const error = { message: 'Custom error' };
    const result = getFriendlyErrorMessage(error);
    expect(result).toContain('error');
  });

  it('should handle errors without message', () => {
    const error = {};
    const result = getFriendlyErrorMessage(error);
    expect(result).toContain('error');
  });

  it('should handle null/undefined', () => {
    const result1 = getFriendlyErrorMessage(null);
    const result2 = getFriendlyErrorMessage(undefined);
    expect(result1).toContain('error');
    expect(result2).toContain('error');
  });
});

describe('getErrorDetails', () => {
  it('should return error details with type and retryable flag', () => {
    const error = new TypeError('Failed to fetch');
    const details = getErrorDetails(error);
    expect(details.type).toBe('network');
    expect(details.retryable).toBe(true);
    expect(details.message).toContain('Network error');
  });

  it('should identify retryable errors', () => {
    const networkError = new TypeError('Failed to fetch');
    const timeoutError = new DOMException('The operation was aborted', 'AbortError');
    const rateLimitError = new Error('429 Rate limit');
    const serverError = new Error('500 Server error');
    
    expect(getErrorDetails(networkError).retryable).toBe(true);
    expect(getErrorDetails(timeoutError).retryable).toBe(true);
    expect(getErrorDetails(rateLimitError).retryable).toBe(true);
    expect(getErrorDetails(serverError).retryable).toBe(true);
  });

  it('should identify non-retryable errors', () => {
    const notFoundError = new Error('404 Not Found');
    const authError = new Error('401 Unauthorized');
    const corsError = new Error('CORS policy');
    
    expect(getErrorDetails(notFoundError).retryable).toBe(false);
    expect(getErrorDetails(authError).retryable).toBe(false);
    expect(getErrorDetails(corsError).retryable).toBe(false);
  });

  it('should include status code for HTTP errors', () => {
    const error404 = new Error('404 Not Found');
    const error500 = new Error('500 Server error');
    
    expect(getErrorDetails(error404).statusCode).toBe(404);
    expect(getErrorDetails(error500).statusCode).toBe(500);
  });
});

describe('isRetryableError', () => {
  it('should return true for retryable errors', () => {
    const networkError = new TypeError('Failed to fetch');
    const timeoutError = new DOMException('The operation was aborted', 'AbortError');
    
    expect(isRetryableError(networkError)).toBe(true);
    expect(isRetryableError(timeoutError)).toBe(true);
  });

  it('should return false for non-retryable errors', () => {
    const notFoundError = new Error('404 Not Found');
    const authError = new Error('401 Unauthorized');
    
    expect(isRetryableError(notFoundError)).toBe(false);
    expect(isRetryableError(authError)).toBe(false);
  });
});

