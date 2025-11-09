/**
 * In-memory cache for API responses
 * Supports TTL, size limits, and cache statistics
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

export interface CacheStats {
  size: number;
  simpleSize: number;
  hits: number;
  simpleHits: number;
  misses: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

class ResponseCache {
  private cache: Map<string, CacheEntry<any>> = new Map(); // Full-context cache
  private simpleCache: Map<string, CacheEntry<any>> = new Map(); // Simple Q&A cache (last message only)
  private defaultTTL: number = 10 * 60 * 1000; // 10 minutes default
  private maxSize: number = 100; // Maximum number of entries
  private hits: number = 0;
  private simpleHits: number = 0;
  private misses: number = 0;
  private readonly STORAGE_KEY = 'multiverse_response_cache';
  private readonly STATS_STORAGE_KEY = 'multiverse_cache_stats';
  private persistenceEnabled: boolean = true;

  /**
   * Generate a simple cache key from last message only (for Q&A caching)
   */
  private generateSimpleKey(endpoint: string, lastMessage: string, params: Record<string, any>): string {
    const normalizedMessage = typeof lastMessage === 'string' 
      ? lastMessage.trim().toLowerCase() 
      : String(lastMessage || '').trim().toLowerCase();
    
    // Normalize params to ensure consistent key generation
    const normalizedParams = {
      temperature: Number(params.temperature ?? params.temp ?? 0.7).toFixed(2),
      max_tokens: Number(params.max_tokens ?? params.maxTokens ?? 2048),
      top_p: Number(params.top_p ?? params.topP ?? 1.0).toFixed(2),
      stream: params.stream ?? false
    };
    
    const keyData = {
      endpoint: endpoint.trim().toLowerCase(),
      message: normalizedMessage,
      params: normalizedParams
    };
    
    const key = JSON.stringify(keyData);
    
    // Use a hash-like approach for shorter keys
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const cacheKey = `simple_${Math.abs(hash).toString(36)}`;
    
    // Debug logging in development
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.debug('🔑 Generated simple cache key:', {
        key: cacheKey,
        message: normalizedMessage.substring(0, 50),
        params: normalizedParams
      });
    }
    
    return cacheKey;
  }

  /**
   * Generate a cache key from request parameters (full context)
   */
  private generateKey(endpoint: string, messages: any[], params: Record<string, any>): string {
    // Normalize messages to only include role and content (ignore IDs, timestamps, edited flag)
    const normalizedMessages = messages.map(m => {
      const content = typeof m.content === 'string' ? m.content.trim().toLowerCase() : String(m.content || '').trim().toLowerCase();
      return {
        role: m.role,
        content: content
      };
    }).filter(m => m.content.length > 0); // Filter out empty messages
    
    // Normalize params to ensure consistent key generation
    // Handle both camelCase and snake_case parameter names
    const normalizedParams = {
      temperature: Number(params.temperature ?? params.temp ?? 0.7).toFixed(2),
      max_tokens: Number(params.max_tokens ?? params.maxTokens ?? 2048),
      top_p: Number(params.top_p ?? params.topP ?? 1.0).toFixed(2),
      stream: params.stream ?? false
    };
    
    const keyData = {
      endpoint: endpoint.trim().toLowerCase(),
      messages: normalizedMessages,
      params: normalizedParams
    };
    
    const key = JSON.stringify(keyData);
    
    // Use a hash-like approach for shorter keys
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const cacheKey = `cache_${Math.abs(hash).toString(36)}`;
    
    // Debug logging in development
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.debug('🔑 Generated cache key:', {
        key: cacheKey,
        messageCount: normalizedMessages.length,
        messages: normalizedMessages.map(m => ({ role: m.role, content: m.content.substring(0, 30) })),
        params: normalizedParams
      });
    }
    
    return cacheKey;
  }

  /**
   * Get cached response from simple cache (last message only)
   */
  getSimple<T>(endpoint: string, lastMessage: string, params: Record<string, any>): T | null {
    const key = this.generateSimpleKey(endpoint, lastMessage, params);
    const entry = this.simpleCache.get(key);

    if (!entry) {
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.debug('❌ Simple cache miss - no entry found', { 
          key, 
          cacheSize: this.simpleCache.size,
          message: lastMessage.substring(0, 50)
        });
      }
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.simpleCache.delete(key);
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.debug('❌ Simple cache miss - entry expired', { 
          key, 
          expiredAt: new Date(entry.expiresAt).toLocaleTimeString()
        });
      }
      return null;
    }

    this.simpleHits++;
    this.saveStatsToLocalStorage();
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('✅ Simple cache hit!', { 
        key, 
        age: Math.round((Date.now() - entry.timestamp) / 1000) + 's',
        message: lastMessage.substring(0, 50)
      });
    }
    return entry.data as T;
  }

  /**
   * Get cached response if available and not expired
   * Checks simple cache first, then full-context cache
   */
  get<T>(endpoint: string, messages: any[], params: Record<string, any>): T | null {
    // First, check simple cache (last message only)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' && lastMessage.content) {
        const simpleResult = this.getSimple<T>(endpoint, lastMessage.content, params);
        if (simpleResult) {
          return simpleResult;
        }
      }
    }
    
    // Fall back to full-context cache
    const key = this.generateKey(endpoint, messages, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      this.saveStatsToLocalStorage();
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        const normalizedMessages = messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content.trim().substring(0, 50) : String(m.content || '').trim().substring(0, 50)
        }));
        console.log('❌ Cache miss - no entry found', { 
          key, 
          cacheSize: this.cache.size,
          messageCount: messages.length,
          messages: normalizedMessages,
          params
        });
        // Log all cache keys for debugging
        const allKeys = Array.from(this.cache.keys());
        console.log('Available cache keys:', allKeys.slice(0, 10));
        // Log first few cache entries for comparison
        if (this.cache.size > 0) {
          const entries = Array.from(this.cache.entries()).slice(0, 3);
          entries.forEach(([k, v]) => {
            console.log('Cache entry:', {
              key: k,
              timestamp: new Date(v.timestamp).toLocaleTimeString(),
              expiresAt: new Date(v.expiresAt).toLocaleTimeString()
            });
          });
        }
      }
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      this.saveStatsToLocalStorage();
      if (typeof window !== 'undefined' && import.meta.env?.DEV) {
        console.log('❌ Cache miss - entry expired', { 
          key, 
          expiredAt: new Date(entry.expiresAt).toLocaleTimeString(),
          now: new Date().toLocaleTimeString()
        });
      }
      return null;
    }

    this.hits++;
    this.saveStatsToLocalStorage();
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('✅ Cache hit!', { 
        key, 
        age: Math.round((Date.now() - entry.timestamp) / 1000) + 's',
        messageCount: messages.length
      });
    }
    return entry.data as T;
  }

  /**
   * Store response in simple cache (last message only)
   */
  setSimple<T>(endpoint: string, lastMessage: string, params: Record<string, any>, data: T, ttl?: number): void {
    // Enforce max size by removing oldest entries
    if (this.simpleCache.size >= this.maxSize) {
      const oldestKey = Array.from(this.simpleCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) {
        this.simpleCache.delete(oldestKey);
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.debug('🗑️ Simple cache evicted oldest entry', { key: oldestKey });
        }
      }
    }

    const key = this.generateSimpleKey(endpoint, lastMessage, params);
    const now = Date.now();
    
    this.simpleCache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
      key
    });
    
    this.saveToLocalStorage();
    
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      console.log('💾 Response cached in simple cache', { 
        key, 
        cacheSize: this.simpleCache.size,
        message: lastMessage.substring(0, 50),
        params,
        expiresAt: new Date(now + (ttl || this.defaultTTL)).toLocaleTimeString()
      });
    }
  }

  /**
   * Store response in cache
   * Stores in both simple cache (last message) and full-context cache
   */
  set<T>(endpoint: string, messages: any[], params: Record<string, any>, data: T, ttl?: number): void {
    // Store in simple cache (last message only)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user' && lastMessage.content) {
        this.setSimple(endpoint, lastMessage.content, params, data, ttl);
      }
    }
    
    // Store in full-context cache
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
        if (typeof window !== 'undefined' && import.meta.env?.DEV) {
          console.debug('🗑️ Cache evicted oldest entry', { key: oldestKey });
        }
      }
    }

    const key = this.generateKey(endpoint, messages, params);
    const now = Date.now();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl || this.defaultTTL),
      key
    });
    
    if (typeof window !== 'undefined' && import.meta.env?.DEV) {
      const normalizedMessages = messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.trim().substring(0, 50) : String(m.content || '').trim().substring(0, 50)
      }));
      console.log('💾 Response cached in full-context cache', { 
        key, 
        cacheSize: this.cache.size,
        messageCount: messages.length,
        messages: normalizedMessages,
        params,
        expiresAt: new Date(now + (ttl || this.defaultTTL)).toLocaleTimeString()
      });
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;
    
    // Clear expired entries from full-context cache
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    // Clear expired entries from simple cache
    for (const [key, entry] of this.simpleCache.entries()) {
      if (now > entry.expiresAt) {
        this.simpleCache.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.simpleCache.clear();
    this.hits = 0;
    this.simpleHits = 0;
    this.misses = 0;
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.STATS_STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear cache from localStorage:', error);
      }
    }
  }

  /**
   * Get cache size (full-context cache)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get simple cache size
   */
  simpleSize(): number {
    return this.simpleCache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const simpleEntries = Array.from(this.simpleCache.values());
    const timestamps = entries.map(e => e.timestamp);
    const simpleTimestamps = simpleEntries.map(e => e.timestamp);
    const allTimestamps = [...timestamps, ...simpleTimestamps];
    
    const totalHits = this.hits + this.simpleHits;
    const totalRequests = totalHits + this.misses;
    
    return {
      size: this.cache.size,
      simpleSize: this.simpleCache.size,
      hits: this.hits,
      simpleHits: this.simpleHits,
      misses: this.misses,
      hitRate: totalRequests > 0 
        ? totalHits / totalRequests 
        : 0,
      oldestEntry: allTimestamps.length > 0 ? Math.min(...allTimestamps) : null,
      newestEntry: allTimestamps.length > 0 ? Math.max(...allTimestamps) : null
    };
  }

  /**
   * Reset statistics (keep cache entries)
   */
  resetStats(): void {
    this.hits = 0;
    this.simpleHits = 0;
    this.misses = 0;
    this.saveStatsToLocalStorage();
  }

  /**
   * Save cache entries to localStorage (public method for manual saves)
   */
  saveToLocalStorage(): void {
    if (!this.persistenceEnabled || typeof window === 'undefined') return;
    
    try {
      const now = Date.now();
      const cacheData: Array<{key: string, entry: CacheEntry<any>}> = [];
      const simpleCacheData: Array<{key: string, entry: CacheEntry<any>}> = [];
      
      // Only save non-expired entries
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt > now) {
          cacheData.push({ key, entry });
        }
      }
      
      for (const [key, entry] of this.simpleCache.entries()) {
        if (entry.expiresAt > now) {
          simpleCacheData.push({ key, entry });
        }
      }
      
      const data = {
        cache: cacheData,
        simpleCache: simpleCacheData,
        timestamp: now
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      
      if (import.meta.env?.DEV) {
        console.debug('💾 Cache saved to localStorage', {
          fullContextEntries: cacheData.length,
          simpleEntries: simpleCacheData.length
        });
      }
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  /**
   * Load cache entries from localStorage
   */
  loadFromLocalStorage(): void {
    if (!this.persistenceEnabled || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        if (import.meta.env?.DEV) {
          console.debug('No cached data found in localStorage');
        }
        return;
      }
      
      const data = JSON.parse(stored);
      const now = Date.now();
      let loadedFullContext = 0;
      let loadedSimple = 0;
      let expiredFullContext = 0;
      let expiredSimple = 0;
      
      // Load full-context cache
      if (data.cache && Array.isArray(data.cache)) {
        for (const { key, entry } of data.cache) {
          if (entry.expiresAt > now) {
            this.cache.set(key, entry);
            loadedFullContext++;
          } else {
            expiredFullContext++;
          }
        }
      }
      
      // Load simple cache
      if (data.simpleCache && Array.isArray(data.simpleCache)) {
        for (const { key, entry } of data.simpleCache) {
          if (entry.expiresAt > now) {
            this.simpleCache.set(key, entry);
            loadedSimple++;
          } else {
            expiredSimple++;
          }
        }
      }
      
      // Load statistics
      const statsStored = localStorage.getItem(this.STATS_STORAGE_KEY);
      if (statsStored) {
        try {
          const stats = JSON.parse(statsStored);
          this.hits = stats.hits || 0;
          this.simpleHits = stats.simpleHits || 0;
          this.misses = stats.misses || 0;
        } catch (e) {
          console.warn('Failed to load cache statistics:', e);
        }
      }
      
      if (import.meta.env?.DEV) {
        console.log('✅ Cache loaded from localStorage', {
          fullContextEntries: loadedFullContext,
          simpleEntries: loadedSimple,
          expiredFullContext,
          expiredSimple,
          age: data.timestamp ? Math.round((now - data.timestamp) / 1000) + 's' : 'unknown'
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  /**
   * Save statistics to localStorage
   */
  private saveStatsToLocalStorage(): void {
    if (!this.persistenceEnabled || typeof window === 'undefined') return;
    
    try {
      const stats = {
        hits: this.hits,
        simpleHits: this.simpleHits,
        misses: this.misses,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STATS_STORAGE_KEY, JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to save cache statistics to localStorage:', error);
    }
  }

  /**
   * Get cache keys for debugging
   */
  getCacheKeys(): Array<{key: string, type: 'full-context' | 'simple', age: number, expiresAt: number}> {
    const keys: Array<{key: string, type: 'full-context' | 'simple', age: number, expiresAt: number}> = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      keys.push({
        key,
        type: 'full-context',
        age: now - entry.timestamp,
        expiresAt: entry.expiresAt
      });
    }
    
    for (const [key, entry] of this.simpleCache.entries()) {
      keys.push({
        key,
        type: 'simple',
        age: now - entry.timestamp,
        expiresAt: entry.expiresAt
      });
    }
    
    return keys.sort((a, b) => b.age - a.age); // Sort by age (newest first)
  }

  /**
   * Get detailed cache information for debugging
   */
  getDebugInfo(): {
    fullContextCache: { size: number; entries: Array<{key: string, age: number, expiresAt: number}> };
    simpleCache: { size: number; entries: Array<{key: string, age: number, expiresAt: number}> };
    statistics: { hits: number; simpleHits: number; misses: number; hitRate: number };
    persistence: { enabled: boolean; localStorageAvailable: boolean };
  } {
    const now = Date.now();
    
    return {
      fullContextCache: {
        size: this.cache.size,
        entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
          key,
          age: now - entry.timestamp,
          expiresAt: entry.expiresAt
        })).sort((a, b) => b.age - a.age)
      },
      simpleCache: {
        size: this.simpleCache.size,
        entries: Array.from(this.simpleCache.entries()).map(([key, entry]) => ({
          key,
          age: now - entry.timestamp,
          expiresAt: entry.expiresAt
        })).sort((a, b) => b.age - a.age)
      },
      statistics: {
        hits: this.hits,
        simpleHits: this.simpleHits,
        misses: this.misses,
        hitRate: this.hits + this.simpleHits + this.misses > 0
          ? (this.hits + this.simpleHits) / (this.hits + this.simpleHits + this.misses)
          : 0
      },
      persistence: {
        enabled: this.persistenceEnabled,
        localStorageAvailable: typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      }
    };
  }

  /**
   * Enable or disable cache persistence
   */
  setPersistenceEnabled(enabled: boolean): void {
    this.persistenceEnabled = enabled;
    if (enabled && typeof window !== 'undefined') {
      this.saveToLocalStorage();
      this.saveStatsToLocalStorage();
    }
  }
}

export const responseCache = new ResponseCache();

// Load cache from localStorage on initialization
if (typeof window !== 'undefined') {
  // Load cache immediately
  responseCache.loadFromLocalStorage();
  
  // Clean up expired entries periodically
  setInterval(() => {
    responseCache.clearExpired();
    // Save after cleanup
    responseCache.saveToLocalStorage();
  }, 60 * 1000); // Every minute
  
  // Save cache before page unload
  window.addEventListener('beforeunload', () => {
    responseCache.saveToLocalStorage();
  });
}

