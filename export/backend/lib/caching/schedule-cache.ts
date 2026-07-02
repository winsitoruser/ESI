// Types for schedule data
interface DoctorInfo {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  specialty?: string;
  phone?: string;
}

interface ScheduleWithDoctor {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  doctorInfo: DoctorInfo;
  [key: string]: any;
}

interface ScheduleStatistics {
  totalSchedules: any;
  upcomingSchedules: any;
  upcomingAppointments: any;
  doctorsWithSchedule: any;
  success?: boolean;
  adapter?: string;
  module?: string;
  [key: string]: any;
}

interface CacheParams {
  start_date?: string;
  end_date?: string;
  doctor_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: any;
}
import LRUCache from 'lru-cache';

/**
 * Cache for storing schedule data to optimize retrieval
 * - Uses LRU (Least Recently Used) caching strategy
 * - Stores data with tenant-specific keys to maintain multi-tenant separation
 * - Cache invalidation on write operations (create, update, delete)
 */
export class ScheduleCache {
  private static instance: ScheduleCache;
  private cache: any; // LRUCache instance

  private constructor() {
    // Configure cache with size and TTL limits
    this.cache = new LRUCache({
      max: 100, // Maximum number of items in cache
      ttl: 1000 * 60 * 10, // 10 minutes TTL
      allowStale: false,
      updateAgeOnGet: true, // Update item age on retrieval
      dispose: (key: string, value: any) => {
        // Optional: Log cache evictions if needed
        // console.log(`Cache item evicted: ${key}`);
      },
    });
  }

  /**
   * Get singleton instance of the cache
   */
  public static getInstance(): ScheduleCache {
    if (!ScheduleCache.instance) {
      ScheduleCache.instance = new ScheduleCache();
    }
    return ScheduleCache.instance;
  }

  /**
   * Generate cache key for a schedule list with filters
   */
  private generateSchedulesKey(tenantId: string, params: CacheParams): string {
    // Create a stable string representation of the params object
    const paramsString = Object.entries(params || {})
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return `tenant:${tenantId}:schedules:${paramsString || 'all'}`;
  }

  /**
   * Set a list of schedules in the cache
   */
  public setSchedules(tenantId: string, schedules: ScheduleWithDoctor[], params: CacheParams): void {
    const key = this.generateSchedulesKey(tenantId, params);
    this.cache.set(key, schedules);
  }

  /**
   * Get schedules from cache
   * @returns Array of schedules if cache hit, null if cache miss
   */
  public getSchedules(tenantId: string, params: CacheParams): ScheduleWithDoctor[] | null {
    const key = this.generateSchedulesKey(tenantId, params);
    return this.cache.get(key) || null;
  }

  /**
   * Set statistics in the cache
   */
  public setStatistics(tenantId: string, statistics: ScheduleStatistics): void {
    const key = this.generateStatisticsKey(tenantId);
    this.cache.set(key, statistics);
  }

  /**
   * Generate cache key for statistics
   */
  private generateStatisticsKey(tenantId: string): string {
    return `tenant:${tenantId}:statistics`;
  }

  /**
   * Get statistics from cache
   */
  public getStatistics(tenantId: string): ScheduleStatistics | null {
    const key = this.generateStatisticsKey(tenantId);
    return this.cache.get(key) || null;
  }

  /**
   * Set a schedule in the cache
   */
  public setSchedule(tenantId: string, scheduleId: string, schedule: ScheduleWithDoctor): void {
    const key = this.generateScheduleKey(tenantId, scheduleId);
    this.cache.set(key, schedule);
  }

  /**
   * Generate cache key for a schedule
   */
  private generateScheduleKey(tenantId: string, scheduleId: string): string {
    return `tenant:${tenantId}:schedule:${scheduleId}`;
  }

  /**
   * Get a schedule from the cache
   */
  public getSchedule(tenantId: string, scheduleId: string): ScheduleWithDoctor | null {
    const key = this.generateScheduleKey(tenantId, scheduleId);
    return this.cache.get(key) || null;
  }

  /**
   * Invalidate all schedules for a tenant
   * Called after write operations (create, update, delete)
   */
  public invalidateSchedules(tenantId: string): void {
    // Delete all schedule entries for this tenant
    for (const key of this.cache.keys()) {
      if (key.startsWith(`tenant:${tenantId}:schedules:`) || key.startsWith(`tenant:${tenantId}:statistics`) || key.startsWith(`tenant:${tenantId}:schedule:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate a specific schedule
   */
  public invalidateSchedule(tenantId: string, scheduleId: string): void {
    const key = this.generateScheduleKey(tenantId, scheduleId);
    this.cache.delete(key);
    this.invalidateSchedules(tenantId); // Also invalidate schedule lists
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
  }
}

// Export a singleton instance
export default ScheduleCache.getInstance();
