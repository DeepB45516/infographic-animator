import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { StatsResponse } from "@shared/stats";

/**
 * Enhanced stats interface with additional metrics and metadata
 */
interface Stats {
  totalUsers: number;
  totalInfographics: number;
  totalLogins: number;
  uptime: number;
  averageRating: number;
  activeSessions: number;
  lastUpdated: Date;
  // Enhanced metrics
  dailyActiveUsers?: number;
  monthlyActiveUsers?: number;
  totalCharts?: number;
  totalFiles?: number;
  averageSessionDuration?: number;
  popularChartTypes?: Array<{ type: string; count: number }>;
  systemHealth?: {
    cpu: number;
    memory: number;
    disk: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  recentActivity?: Array<{
    type: 'login' | 'infographic' | 'chart' | 'rating';
    timestamp: Date;
    userId?: string;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Configuration options for the stats hook
 */
interface UseStatsConfig {
  autoRefreshInterval?: number;
  enableTracking?: boolean;
  enableRealtime?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
}

/**
 * Return type for the enhanced stats hook
 */
interface UseStatsReturn {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  isUsingFallback: boolean;
  isStale: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  refetch: () => Promise<void>;
  trackLogin: (userId: string, metadata?: Record<string, any>) => Promise<void>;
  trackInfographic: (userId: string, title?: string, metadata?: Record<string, any>) => Promise<void>;
  trackChart: (userId: string, chartType: string, metadata?: Record<string, any>) => Promise<void>;
  trackRating: (rating: number, userId?: string, metadata?: Record<string, any>) => Promise<void>;
  clearError: () => void;
  resetStats: () => void;
}

/**
 * Cache management for stats data
 */
class StatsCache {
  private static instance: StatsCache;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  static getInstance(): StatsCache {
    if (!StatsCache.instance) {
      StatsCache.instance = new StatsCache();
    }
    return StatsCache.instance;
  }

  set(key: string, data: any, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Enhanced API client for stats operations
 */
class StatsApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    baseUrl = "/api/stats",
    timeout = 5000,
    maxRetries = 3,
    retryDelay = 1000
  ) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(this.retryDelay);
        return this.withRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeout, and certain HTTP status codes
    return (
      error.name === 'TypeError' || // Network error
      error.name === 'AbortError' || // Timeout
      (error.status && [408, 429, 500, 502, 503, 504].includes(error.status))
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createAbortController(timeout: number): AbortController {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Clean up timeout when request completes
    const originalSignal = controller.signal;
    const cleanup = () => clearTimeout(timeoutId);
    originalSignal.addEventListener('abort', cleanup, { once: true });
    
    return controller;
  }

  async fetchStats(): Promise<StatsResponse> {
    return this.withRetry(async () => {
      const controller = this.createAbortController(this.defaultTimeout);
      
      const response = await fetch(this.baseUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    });
  }

  async trackEvent(
    endpoint: string,
    payload: Record<string, any>
  ): Promise<void> {
    return this.withRetry(async () => {
      const controller = this.createAbortController(3000);
      
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    });
  }
}

/**
 * Enhanced stats hook with comprehensive functionality
 */
export function useStats(config: UseStatsConfig = {}): UseStatsReturn {
  const {
    autoRefreshInterval = 30000,
    enableTracking = true,
    enableRealtime = false,
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 5000,
    enableCache = true,
    cacheTimeout = 60000
  } = config;

  // State management
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  // Refs for cleanup and tracking
  const apiClient = useRef<StatsApiClient | null>(null);
  const cache = useRef<StatsCache | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  // Initialize API client and cache
  useEffect(() => {
    apiClient.current = new StatsApiClient("/api/stats", timeout, maxRetries, retryDelay);
    if (enableCache) {
      cache.current = StatsCache.getInstance();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [timeout, maxRetries, retryDelay, enableCache]);

  // Memoized fallback stats with more realistic data
  const fallbackStats = useMemo((): Stats => ({
    totalUsers: 1247 + Math.floor(Math.random() * 100),
    totalInfographics: 3891 + Math.floor(Math.random() * 50),
    totalLogins: 15642 + Math.floor(Math.random() * 200),
    totalCharts: 5624 + Math.floor(Math.random() * 75),
    totalFiles: 8913 + Math.floor(Math.random() * 100),
    uptime: 99.8 - Math.random() * 0.5,
    averageRating: 4.7 + (Math.random() - 0.5) * 0.4,
    activeSessions: 142 + Math.floor(Math.random() * 50),
    dailyActiveUsers: 324 + Math.floor(Math.random() * 40),
    monthlyActiveUsers: 2891 + Math.floor(Math.random() * 200),
    averageSessionDuration: 12.5 + (Math.random() - 0.5) * 3,
    lastUpdated: new Date(),
    popularChartTypes: [
      { type: 'bar', count: 1245 },
      { type: 'line', count: 987 },
      { type: 'pie', count: 756 },
      { type: 'scatter', count: 432 }
    ],
    systemHealth: {
      cpu: 35 + Math.random() * 30,
      memory: 60 + Math.random() * 25,
      disk: 45 + Math.random() * 20,
      status: Math.random() > 0.8 ? 'warning' : 'healthy'
    },
    recentActivity: []
  }), []);

  // Check if data is stale
  const isStale = useMemo(() => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched.getTime() > autoRefreshInterval * 2;
  }, [lastFetched, autoRefreshInterval]);

  /**
   * Enhanced fetch function with caching and better error handling
   */
  const fetchStats = useCallback(async (): Promise<void> => {
    if (!mountedRef.current || !apiClient.current) return;

    // Check cache first
    if (enableCache && cache.current?.has('stats')) {
      const cachedStats = cache.current.get('stats');
      if (cachedStats) {
        setStats(cachedStats);
        setLastFetched(new Date());
        setLoading(false);
        return;
      }
    }

    setConnectionStatus('connecting');
    
    try {
      const response = await apiClient.current.fetchStats();

      if (response.success && response.data) {
        const processedStats: Stats = {
          ...response.data,
          lastUpdated: new Date(response.data.lastUpdated),
          // Process nested date fields if they exist
          recentActivity: response.data.recentActivity?.map((activity: any) => ({
            ...activity,
            timestamp: new Date(activity.timestamp)
          })) || []
        };

        if (mountedRef.current) {
          setStats(processedStats);
          setError(null);
          setIsUsingFallback(false);
          setConnectionStatus('connected');
          setLastFetched(new Date());

          // Cache the results
          if (enableCache && cache.current) {
            cache.current.set('stats', processedStats, cacheTimeout);
          }
        }
      } else {
        throw new Error(response.error || "Invalid response format");
      }
    } catch (err: any) {
      console.warn("Stats API unavailable, using fallback data:", err.message || err);
      
      if (mountedRef.current) {
        setStats(fallbackStats);
        setError(null); // Don't show error for fallback data
        setIsUsingFallback(true);
        setConnectionStatus('disconnected');
        setLastFetched(new Date());
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [enableCache, cacheTimeout, fallbackStats]);

  /**
   * Enhanced tracking functions with better error handling
   */
  const trackEvent = useCallback(async (
    endpoint: string,
    payload: Record<string, any>
  ): Promise<void> => {
    if (!enableTracking || !apiClient.current || isUsingFallback) return;

    try {
      await apiClient.current.trackEvent(endpoint, payload);
      
      // Refresh stats after successful tracking (debounced)
      if (!loading) {
        setTimeout(() => fetchStats(), 1000);
      }
    } catch (err: any) {
      // Silent fail for tracking - log but don't disrupt UX
      console.warn(`Stats tracking failed (${endpoint}):`, err.message || err);
    }
  }, [enableTracking, isUsingFallback, loading, fetchStats]);

  const trackLogin = useCallback(async (
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    return trackEvent('login', { userId, ...metadata });
  }, [trackEvent]);

  const trackInfographic = useCallback(async (
    userId: string,
    title?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    return trackEvent('infographic', { userId, title, ...metadata });
  }, [trackEvent]);

  const trackChart = useCallback(async (
    userId: string,
    chartType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    return trackEvent('chart', { userId, chartType, ...metadata });
  }, [trackEvent]);

  const trackRating = useCallback(async (
    rating: number,
    userId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    return trackEvent('rating', { rating, userId, ...metadata });
  }, [trackEvent]);

  /**
   * Utility functions
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const resetStats = useCallback((): void => {
    setStats(null);
    setError(null);
    setLastFetched(null);
    setLoading(true);
    setIsUsingFallback(false);
    setConnectionStatus('connecting');
    
    if (enableCache && cache.current) {
      cache.current.clear();
    }
  }, [enableCache]);

  /**
   * WebSocket connection for real-time updates
   */
  useEffect(() => {
    if (!enableRealtime || isUsingFallback) return;

    const connectWebSocket = () => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/stats/ws`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log('Stats WebSocket connected');
          setConnectionStatus('connected');
        };

        wsRef.current.onmessage = (event) => {
          try {
            const update = JSON.parse(event.data);
            if (mountedRef.current && update.type === 'stats_update') {
              setStats(prev => prev ? { ...prev, ...update.data } : null);
            }
          } catch (err) {
            console.warn('Invalid WebSocket message:', err);
          }
        };

        wsRef.current.onclose = () => {
          console.log('Stats WebSocket disconnected');
          setConnectionStatus('disconnected');
          
          // Attempt to reconnect after delay
          setTimeout(connectWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
          console.warn('Stats WebSocket error:', error);
        };
      } catch (err) {
        console.warn('Failed to connect WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enableRealtime, isUsingFallback]);

  /**
   * Initial fetch effect
   */
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /**
   * Auto-refresh interval effect
   */
  useEffect(() => {
    if (!autoRefreshInterval || isUsingFallback || enableRealtime) return;

    intervalRef.current = setInterval(() => {
      if (!document.hidden && mountedRef.current) {
        fetchStats();
      }
    }, autoRefreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchStats, autoRefreshInterval, isUsingFallback, enableRealtime]);

  /**
   * Cleanup effect
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * Page visibility effect - pause/resume when tab is hidden/visible
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mountedRef.current && isStale && !loading) {
        fetchStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStats, isStale, loading]);

  return {
    stats,
    loading,
    error,
    lastFetched,
    isUsingFallback,
    isStale,
    connectionStatus,
    refetch: fetchStats,
    trackLogin,
    trackInfographic,
    trackChart,
    trackRating,
    clearError,
    resetStats,
  };
}
