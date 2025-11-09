import { describe, it, expect } from 'vitest';
import { getFriendlyErrorMessage } from '../errorHandling';

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
    const error = new Error('timeout');
    const result = getFriendlyErrorMessage(error);
    expect(result).toContain('timeout');
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

