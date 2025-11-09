export interface ErrorDetails {
  message: string;
  type: 'network' | 'http' | 'timeout' | 'cors' | 'unknown';
  statusCode?: number;
  retryable: boolean;
}

export const getFriendlyErrorMessage = (error: unknown): string => {
  const details = getErrorDetails(error);
  return details.message;
};

export const getErrorDetails = (error: unknown): ErrorDetails => {
  // Check for DOMException first (AbortError is a DOMException)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      message: 'Request was cancelled or timed out.',
      type: 'timeout',
      retryable: true
    };
  }
  
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Network errors
    if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      return {
        message: 'Network error: Unable to connect to the server. Please check your connection and endpoint URL.',
        type: 'network',
        retryable: true
      };
    }
    // AbortError can be DOMException or Error with name 'AbortError'
    if (errorName === 'aborterror' || errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return {
        message: 'Request was cancelled or timed out.',
        type: 'timeout',
        retryable: true
      };
    }
    
    // HTTP errors
    if (errorMessage.includes('404')) {
      return {
        message: 'Endpoint not found. Please check your endpoint URL.',
        type: 'http',
        statusCode: 404,
        retryable: false
      };
    }
    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return {
        message: 'Authentication failed. Please check your API key.',
        type: 'http',
        statusCode: errorMessage.includes('401') ? 401 : 403,
        retryable: false
      };
    }
    if (errorMessage.includes('429')) {
      return {
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        type: 'http',
        statusCode: 429,
        retryable: true
      };
    }
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      const statusCode = errorMessage.includes('500') ? 500 : errorMessage.includes('502') ? 502 : 503;
      return {
        message: 'Server error. The service may be temporarily unavailable. Please try again later.',
        type: 'http',
        statusCode,
        retryable: true
      };
    }
    
    // CORS errors
    if (errorMessage.includes('cors')) {
      return {
        message: 'CORS error: The server may not allow requests from this origin.',
        type: 'cors',
        retryable: false
      };
    }
    
    // Generic error
    return {
      message: `Error: ${error.message}`,
      type: 'unknown',
      retryable: false
    };
  }
  
  return {
    message: 'An unexpected error occurred. Please try again.',
    type: 'unknown',
    retryable: false
  };
};

export const isRetryableError = (error: unknown): boolean => {
  return getErrorDetails(error).retryable;
};

