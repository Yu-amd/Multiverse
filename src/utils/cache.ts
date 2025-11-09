/**
 * Simple in-memory cache for API responses
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  /**
   * Generate a cache key from request parameters
   */
  private generateKey(endpoint: string, messages: any[], params: Record<string, any>): string {
    const key = JSON.stringify({
      endpoint,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      params
    });
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Get cached response if available and not expired
   */
  get<T>(endpoint: string, messages: any[], params: Record<string, any>): T | null {
    const key = this.generateKey(endpoint, messages, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store response in cache
   */
  set<T>(endpoint: string, messages: any[], params: Record<string, any>, data: T, ttl?: number): void {
    const key = this.generateKey(endpoint, messages, params);
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL)
    });
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

export const responseCache = new ResponseCache();

// Clean up expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    responseCache.clearExpired();
  }, 60 * 1000); // Every minute
}

