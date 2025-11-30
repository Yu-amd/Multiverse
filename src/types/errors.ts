/**
 * Structured error model for the application
 * All errors are mapped to this type for consistent handling
 */

export type AppErrorType = 
  | 'network'      // Network connectivity issues
  | 'timeout'      // Request timeout
  | 'validation'   // Input validation errors
  | 'server'       // Server-side errors (5xx)
  | 'rate_limit'   // Rate limiting (429)
  | 'auth'         // Authentication errors (401, 403)
  | 'not_found'    // Resource not found (404)
  | 'cors'         // CORS errors
  | 'unknown';     // Unknown errors

export interface AppError {
  type: AppErrorType;
  message: string;
  originalError?: unknown;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number; // Seconds to wait before retry (for rate limits)
  field?: string; // For validation errors, which field failed
}

/**
 * Create an AppError from various error sources
 */
export function createAppError(
  error: unknown,
  context?: { field?: string; endpoint?: string }
): AppError {
  // Check for DOMException (AbortError)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: 'Request was cancelled or timed out.',
      originalError: error,
      retryable: true
    };
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network errors
    if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      return {
        type: 'network',
        message: `Network error: Unable to connect to ${context?.endpoint || 'the server'}. Please check your connection and endpoint URL.`,
        originalError: error,
        retryable: true
      };
    }

    // Timeout errors
    if (errorName === 'aborterror' || errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request was cancelled or timed out.',
        originalError: error,
        retryable: true
      };
    }

    // HTTP errors
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return {
        type: 'not_found',
        message: 'Endpoint not found. Please check your endpoint URL.',
        originalError: error,
        statusCode: 404,
        retryable: false
      };
    }

    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return {
        type: 'auth',
        message: 'Authentication failed. Please check your API key.',
        originalError: error,
        statusCode: 401,
        retryable: false
      };
    }

    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return {
        type: 'auth',
        message: 'Access forbidden. Please check your API key and permissions.',
        originalError: error,
        statusCode: 403,
        retryable: false
      };
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      // Try to extract retry-after from error message or headers
      const retryAfterMatch = errorMessage.match(/retry[-\s]after[:\s]+(\d+)/i);
      const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) : undefined;

      return {
        type: 'rate_limit',
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        originalError: error,
        statusCode: 429,
        retryable: true,
        retryAfter
      };
    }

    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      const statusCode = errorMessage.includes('500') ? 500 : 
                        errorMessage.includes('502') ? 502 : 503;
      return {
        type: 'server',
        message: 'Server error. The service may be temporarily unavailable. Please try again later.',
        originalError: error,
        statusCode,
        retryable: true
      };
    }

    // CORS errors
    if (errorMessage.includes('cors') || errorMessage.includes('cross-origin')) {
      return {
        type: 'cors',
        message: 'CORS error: The server may not allow requests from this origin.',
        originalError: error,
        retryable: false
      };
    }

    // Validation errors (check for field context)
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        type: 'validation',
        message: error.message || 'Validation error. Please check your input.',
        originalError: error,
        field: context?.field,
        retryable: false
      };
    }

    // Generic error
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      originalError: error,
      retryable: false
    };
  }

  // Unknown error type
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
    retryable: false
  };
}

/**
 * Check if error is retryable with exponential backoff
 */
export function shouldRetry(error: AppError, attempt: number, maxAttempts: number = 3): boolean {
  if (!error.retryable) return false;
  if (attempt >= maxAttempts) return false;
  
  // For rate limits, respect retry-after
  if (error.type === 'rate_limit' && error.retryAfter) {
    return true; // Will be handled by retryAfter delay
  }
  
  return true;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function getRetryDelay(error: AppError, attempt: number): number {
  // For rate limits, use retry-after if available
  if (error.type === 'rate_limit' && error.retryAfter) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s...
  return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
}

