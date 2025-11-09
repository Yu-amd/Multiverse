export const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    
    // Network errors
    if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      return 'Network error: Unable to connect to the server. Please check your connection and endpoint URL.';
    }
    if (error.name === 'AbortError') {
      return 'Request was cancelled or timed out.';
    }
    
    // HTTP errors
    if (errorMessage.includes('404')) {
      return 'Endpoint not found. Please check your endpoint URL.';
    }
    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return 'Authentication failed. Please check your API key.';
    }
    if (errorMessage.includes('429')) {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return 'Server error. The service may be temporarily unavailable. Please try again later.';
    }
    
    // CORS errors
    if (errorMessage.includes('cors')) {
      return 'CORS error: The server may not allow requests from this origin.';
    }
    
    // Generic error
    return `Error: ${error.message}`;
  }
  return 'An unexpected error occurred. Please try again.';
};

