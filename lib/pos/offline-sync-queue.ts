/**
 * POS Offline Sync Queue
 * 
 * Provides robust offline/online sync capabilities for high-volume POS environments.
 * Implements a reliable queue system with conflict resolution, retry logic, and
 * background synchronization.
 */

import logger from '../../lib/logger';
import { v4 as uuidv4 } from 'uuid';

const SERVICE_NAME = 'offline-sync-queue';

// Sync operation types
export enum SyncOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  PRINT = 'print',
  PAYMENT = 'payment',
  CUSTOM = 'custom'
}

// Sync item status
export enum SyncItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

// Priority levels for sync items
export enum SyncPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Sync item interface
export interface SyncQueueItem {
  id: string;
  operationType: SyncOperationType;
  endpoint: string;
  payload: any;
  status: SyncItemStatus;
  priority: SyncPriority;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Sync queue configuration
export interface SyncQueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  priorityBoost: boolean; // boost priority for items failing multiple times
  conflictResolution: 'client-wins' | 'server-wins' | 'manual';
  periodicSyncInterval: number; // in milliseconds
  maxQueueSize: number; // maximum items to keep in the queue
  storageKey: string; // localStorage key for persisting the queue
  debug: boolean; // enable detailed logging
}

/**
 * Offline Sync Queue Manager
 * 
 * Manages a queue of operations that need to be synchronized with the server
 * when connectivity is available. Provides conflict resolution, retry logic,
 * and prioritization of operations.
 */
export class OfflineSyncQueue {
  private static instance: OfflineSyncQueue;
  private queue: SyncQueueItem[] = [];
  private inProgress: Map<string, SyncQueueItem> = new Map();
  private isProcessing: boolean = false;
  private isOnline: boolean = true;
  private periodicSyncTimer: any = null;
  private ongoingRequests: number = 0;
  
  private config: SyncQueueConfig = {
    maxConcurrent: 3,
    maxRetries: 5,
    retryDelay: 5000,
    priorityBoost: true,
    conflictResolution: 'client-wins',
    periodicSyncInterval: 30000, // 30 seconds
    maxQueueSize: 1000,
    storageKey: 'pos_sync_queue',
    debug: false
  };
  
  // Event callbacks
  private onItemCompletedCallbacks: ((item: SyncQueueItem) => void)[] = [];
  private onItemFailedCallbacks: ((item: SyncQueueItem) => void)[] = [];
  private onQueueEmptyCallbacks: (() => void)[] = [];
  private onConflictCallbacks: ((item: SyncQueueItem, serverData: any) => void)[] = [];
  
  private constructor() {
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): OfflineSyncQueue {
    if (!OfflineSyncQueue.instance) {
      OfflineSyncQueue.instance = new OfflineSyncQueue();
    }
    return OfflineSyncQueue.instance;
  }
  
  /**
   * Initialize the sync queue
   */
  private initialize(): void {
    logger.info(`[${SERVICE_NAME}] Initializing offline sync queue`);
    
    // Load queue from localStorage
    this.loadQueue();
    
    // Set up network status monitoring
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleNetworkStatusChange.bind(this));
      window.addEventListener('offline', this.handleNetworkStatusChange.bind(this));
      this.isOnline = navigator.onLine;
    }
    
    // Start periodic sync
    this.startPeriodicSync();
    
    // Process any pending items
    this.processQueue();
    
    logger.info(`[${SERVICE_NAME}] Sync queue initialized with ${this.queue.length} pending items`);
  }
  
  /**
   * Configure the sync queue
   */
  public configure(config: Partial<SyncQueueConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
      this.startPeriodicSync();
    }
    
    logger.debug(`[${SERVICE_NAME}] Sync queue configured`, { config: this.config });
  }
  
  /**
   * Add an item to the sync queue
   */
  public async addToQueue(
    operationType: SyncOperationType,
    endpoint: string,
    payload: any,
    priority: SyncPriority = SyncPriority.MEDIUM,
    metadata?: Record<string, any>
  ): Promise<string> {
    // Generate a unique ID for this operation
    const id = uuidv4();
    const now = Date.now();
    
    const queueItem: SyncQueueItem = {
      id,
      operationType,
      endpoint,
      payload,
      status: SyncItemStatus.PENDING,
      priority,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      metadata
    };
    
    // Add to queue
    this.queue.push(queueItem);
    
    // Sort by priority and creation time
    this.sortQueue();
    
    // Enforce queue size limit
    if (this.queue.length > this.config.maxQueueSize) {
      // Remove oldest low-priority items first
      const lowPriorityItems = this.queue.filter(item => item.priority === SyncPriority.LOW);
      if (lowPriorityItems.length > 0) {
        // Find the oldest low-priority item
        const oldestItem = lowPriorityItems.reduce((oldest, item) => 
          item.createdAt < oldest.createdAt ? item : oldest, lowPriorityItems[0]);
        
        // Remove it from the queue
        this.queue = this.queue.filter(item => item.id !== oldestItem.id);
        
        logger.warn(`[${SERVICE_NAME}] Removed oldest low-priority item to maintain queue size`);
      } else {
        // If no low-priority items, remove the oldest medium-priority item
        const mediumPriorityItems = this.queue.filter(item => item.priority === SyncPriority.MEDIUM);
        if (mediumPriorityItems.length > 0) {
          const oldestItem = mediumPriorityItems.reduce((oldest, item) => 
            item.createdAt < oldest.createdAt ? item : oldest, mediumPriorityItems[0]);
          
          this.queue = this.queue.filter(item => item.id !== oldestItem.id);
          logger.warn(`[${SERVICE_NAME}] Removed oldest medium-priority item to maintain queue size`);
        }
      }
    }
    
    // Save to localStorage
    this.persistQueue();
    
    logger.debug(`[${SERVICE_NAME}] Added item to sync queue`, { 
      id, 
      operationType, 
      endpoint, 
      priority 
    });
    
    // Start processing if online
    if (this.isOnline) {
      this.processQueue();
    }
    
    return id;
  }
  
  /**
   * Process the queue
   */
  public async processQueue(): Promise<void> {
    // Skip if already processing or offline
    if (this.isProcessing || !this.isOnline) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Process until the queue is empty or max concurrent is reached
      while (this.queue.length > 0 && this.ongoingRequests < this.config.maxConcurrent) {
        // Get the next item
        const item = this.queue.shift();
        
        if (!item) {
          break;
        }
        
        // Move to in-progress
        this.inProgress.set(item.id, item);
        
        // Update status
        item.status = SyncItemStatus.IN_PROGRESS;
        item.updatedAt = Date.now();
        
        // Save changes
        this.persistQueue();
        
        // Process asynchronously
        this.ongoingRequests++;
        this.processItem(item).finally(() => {
          this.ongoingRequests--;
          
          // Check if queue is empty
          if (this.queue.length === 0 && this.inProgress.size === 0) {
            this.notifyQueueEmpty();
          }
        });
      }
    } finally {
      this.isProcessing = false;
    }
    
    // If there are more items in the queue, schedule another processing cycle
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }
  
  /**
   * Process a single queue item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    try {
      logger.debug(`[${SERVICE_NAME}] Processing sync item`, { 
        id: item.id, 
        type: item.operationType,
        endpoint: item.endpoint,
        retryCount: item.retryCount
      });
      
      // Simulate network request (in real implementation, this would be an actual fetch call)
      const response = await this.makeRequest(item.endpoint, item.operationType, item.payload);
      
      // Check for conflicts
      if (response.status === 409) {
        // Conflict detected
        item.status = SyncItemStatus.CONFLICT;
        
        // Get the server's version of the data
        const serverData = await response.json();
        
        // Handle conflict based on configuration
        if (this.config.conflictResolution === 'server-wins') {
          // Server wins - mark as completed but notify of conflict
          item.status = SyncItemStatus.COMPLETED;
          this.notifyConflict(item, serverData);
        } else if (this.config.conflictResolution === 'client-wins') {
          // Client wins - retry with force flag
          item.payload = {
            ...item.payload,
            forceUpdate: true // Signal to server to override conflicts
          };
          
          // Re-queue item
          this.reQueueItem(item);
          return;
        } else {
          // Manual resolution - mark as conflict and wait for resolution
          this.notifyConflict(item, serverData);
          return;
        }
      } else if (!response.ok) {
        // Request failed - handle retry
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }
      
      // Request succeeded
      item.status = SyncItemStatus.COMPLETED;
      item.updatedAt = Date.now();
      
      // Remove from in-progress
      this.inProgress.delete(item.id);
      
      // Notify completion
      this.notifyItemCompleted(item);
      
      logger.debug(`[${SERVICE_NAME}] Successfully processed sync item`, { id: item.id });
    } catch (error) {
      // Handle error
      item.retryCount++;
      item.error = error instanceof Error ? error.message : String(error);
      item.updatedAt = Date.now();
      
      if (item.retryCount >= item.maxRetries) {
        // Max retries reached - mark as failed
        item.status = SyncItemStatus.FAILED;
        
        // Remove from in-progress
        this.inProgress.delete(item.id);
        
        // Notify failure
        this.notifyItemFailed(item);
        
        logger.error(`[${SERVICE_NAME}] Sync item failed after ${item.retryCount} attempts`, {
          id: item.id,
          error: item.error,
          endpoint: item.endpoint
        });
      } else {
        // Re-queue with backoff
        logger.warn(`[${SERVICE_NAME}] Sync item failed, will retry`, {
          id: item.id,
          retryCount: item.retryCount,
          error: item.error
        });
        
        // Possibly increase priority for failing items
        if (this.config.priorityBoost && item.retryCount > 1) {
          if (item.priority === SyncPriority.LOW) {
            item.priority = SyncPriority.MEDIUM;
          } else if (item.priority === SyncPriority.MEDIUM) {
            item.priority = SyncPriority.HIGH;
          }
        }
        
        // Re-queue with exponential backoff
        this.reQueueItem(item);
      }
    }
    
    // Persist changes
    this.persistQueue();
  }
  
  /**
   * Re-queue an item with exponential backoff
   */
  private reQueueItem(item: SyncQueueItem): void {
    // Calculate delay with exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, item.retryCount - 1);
    
    // Remove from in-progress
    this.inProgress.delete(item.id);
    
    // Set status back to pending
    item.status = SyncItemStatus.PENDING;
    
    setTimeout(() => {
      // Add back to the queue
      this.queue.push(item);
      
      // Sort the queue
      this.sortQueue();
      
      // Save changes
      this.persistQueue();
      
      // Try processing again
      this.processQueue();
    }, delay);
  }
  
  /**
   * Make the actual network request
   */
  private async makeRequest(
    endpoint: string, 
    operationType: SyncOperationType, 
    payload: any
  ): Promise<Response> {
    let method = 'POST';
    
    switch (operationType) {
      case SyncOperationType.CREATE:
        method = 'POST';
        break;
      case SyncOperationType.UPDATE:
        method = 'PUT';
        break;
      case SyncOperationType.DELETE:
        method = 'DELETE';
        break;
      case SyncOperationType.PRINT:
      case SyncOperationType.PAYMENT:
      case SyncOperationType.CUSTOM:
        // These might require special handling
        method = 'POST';
        break;
    }
    
    // Add sync metadata to request
    const requestPayload = {
      ...payload,
      _syncMetadata: {
        clientTimestamp: Date.now(),
        operationType,
        isOfflineSync: true,
        branchId: this.getCurrentBranchId(),
        branchCode: this.getCurrentBranchCode()
      }
    };
    
    // Make the actual request
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Client': 'POS-Offline-Sync'
      },
      body: JSON.stringify(requestPayload)
    });
    
    return response;
  }
  
  /**
   * Handle network status change
   */
  private handleNetworkStatusChange(): void {
    const wasOnline = this.isOnline;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    logger.info(`[${SERVICE_NAME}] Network status changed: ${this.isOnline ? 'online' : 'offline'}`);
    
    // If we just came online and we have pending items, start processing
    if (!wasOnline && this.isOnline && this.queue.length > 0) {
      logger.info(`[${SERVICE_NAME}] Back online, processing ${this.queue.length} pending items`);
      this.processQueue();
    }
  }
  
  /**
   * Sort the queue by priority and creation time
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First sort by priority
      if (a.priority !== b.priority) {
        if (a.priority === SyncPriority.HIGH) return -1;
        if (b.priority === SyncPriority.HIGH) return 1;
        if (a.priority === SyncPriority.MEDIUM) return -1;
        if (b.priority === SyncPriority.MEDIUM) return 1;
      }
      
      // Then sort by creation time
      return a.createdAt - b.createdAt;
    });
  }
  
  /**
   * Save queue to localStorage
   */
  private persistQueue(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const queueData = {
      queue: this.queue,
      inProgress: Array.from(this.inProgress.values())
    };
    
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(queueData));
    } catch (error) {
      logger.error(`[${SERVICE_NAME}] Error persisting queue to localStorage`, { error });
    }
  }
  
  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const storedData = localStorage.getItem(this.config.storageKey);
    
    if (!storedData) {
      return;
    }
    
    try {
      const queueData = JSON.parse(storedData);
      
      // Restore the queue
      this.queue = queueData.queue || [];
      
      // Restore in-progress items (they should be retried)
      const inProgressItems = queueData.inProgress || [];
      
      // Re-queue in-progress items from previous sessions
      for (const item of inProgressItems) {
        item.status = SyncItemStatus.PENDING;
        this.queue.push(item);
      }
      
      // Sort the queue
      this.sortQueue();
      
      logger.info(`[${SERVICE_NAME}] Loaded ${this.queue.length} items from storage`);
    } catch (error) {
      logger.error(`[${SERVICE_NAME}] Error loading queue from localStorage`, { error });
      
      // Reset the queue
      this.queue = [];
      this.inProgress = new Map();
    }
  }
  
  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.periodicSyncTimer) {
      clearInterval(this.periodicSyncTimer);
    }
    
    this.periodicSyncTimer = setInterval(() => {
      if (this.isOnline && this.queue.length > 0) {
        logger.debug(`[${SERVICE_NAME}] Running periodic sync, ${this.queue.length} items pending`);
        this.processQueue();
      }
    }, this.config.periodicSyncInterval);
  }
  
  /**
   * Get current queue status
   */
  public getStatus(): {
    queueLength: number;
    inProgressCount: number;
    isOnline: boolean;
    pendingHighPriority: number;
  } {
    const pendingHighPriority = this.queue.filter(
      item => item.priority === SyncPriority.HIGH
    ).length;
    
    return {
      queueLength: this.queue.length,
      inProgressCount: this.inProgress.size,
      isOnline: this.isOnline,
      pendingHighPriority
    };
  }
  
  /**
   * Clear failed items from the queue
   */
  public clearFailedItems(): number {
    const failedItems = this.queue.filter(item => item.status === SyncItemStatus.FAILED);
    this.queue = this.queue.filter(item => item.status !== SyncItemStatus.FAILED);
    
    this.persistQueue();
    
    return failedItems.length;
  }
  
  /**
   * Retry a specific failed or conflicted item
   */
  public retryItem(id: string): boolean {
    // Find item in queue
    const itemIndex = this.queue.findIndex(item => item.id === id);
    
    if (itemIndex >= 0) {
      const item = this.queue[itemIndex];
      
      // Only retry failed or conflicted items
      if (item.status === SyncItemStatus.FAILED || item.status === SyncItemStatus.CONFLICT) {
        // Reset status and retry count
        item.status = SyncItemStatus.PENDING;
        item.retryCount = 0;
        item.updatedAt = Date.now();
        
        // Move to front of queue for its priority level
        this.sortQueue();
        
        // Save changes
        this.persistQueue();
        
        // Start processing
        if (this.isOnline) {
          this.processQueue();
        }
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Manually resolve a conflict
   */
  public resolveConflict(id: string, resolution: 'client' | 'server'): boolean {
    // Find item in queue
    const itemIndex = this.queue.findIndex(item => item.id === id);
    
    if (itemIndex >= 0) {
      const item = this.queue[itemIndex];
      
      if (item.status === SyncItemStatus.CONFLICT) {
        if (resolution === 'client') {
          // Use client data, add force flag
          item.payload = {
            ...item.payload,
            forceUpdate: true
          };
          
          // Reset status
          item.status = SyncItemStatus.PENDING;
          item.retryCount = 0;
          item.updatedAt = Date.now();
          
          // Save changes
          this.persistQueue();
          
          // Start processing
          if (this.isOnline) {
            this.processQueue();
          }
          
          return true;
        } else {
          // Use server data - remove from queue
          this.queue.splice(itemIndex, 1);
          
          // Save changes
          this.persistQueue();
          
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Subscribe to item completed events
   */
  public onItemCompleted(callback: (item: SyncQueueItem) => void): void {
    this.onItemCompletedCallbacks.push(callback);
  }
  
  /**
   * Subscribe to item failed events
   */
  public onItemFailed(callback: (item: SyncQueueItem) => void): void {
    this.onItemFailedCallbacks.push(callback);
  }
  
  /**
   * Subscribe to queue empty events
   */
  public onQueueEmpty(callback: () => void): void {
    this.onQueueEmptyCallbacks.push(callback);
  }
  
  /**
   * Subscribe to conflict events
   */
  public onConflict(callback: (item: SyncQueueItem, serverData: any) => void): void {
    this.onConflictCallbacks.push(callback);
  }
  
  /**
   * Notify item completed
   */
  private notifyItemCompleted(item: SyncQueueItem): void {
    this.onItemCompletedCallbacks.forEach(callback => {
      try {
        callback(item);
      } catch (error) {
        logger.error(`[${SERVICE_NAME}] Error in item completed callback`, { error });
      }
    });
  }
  
  /**
   * Notify item failed
   */
  private notifyItemFailed(item: SyncQueueItem): void {
    this.onItemFailedCallbacks.forEach(callback => {
      try {
        callback(item);
      } catch (error) {
        logger.error(`[${SERVICE_NAME}] Error in item failed callback`, { error });
      }
    });
  }
  
  /**
   * Notify queue empty
   */
  private notifyQueueEmpty(): void {
    this.onQueueEmptyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error(`[${SERVICE_NAME}] Error in queue empty callback`, { error });
      }
    });
  }
  
  /**
   * Notify conflict
   */
  private notifyConflict(item: SyncQueueItem, serverData: any): void {
    this.onConflictCallbacks.forEach(callback => {
      try {
        callback(item, serverData);
      } catch (error) {
        logger.error(`[${SERVICE_NAME}] Error in conflict callback`, { error });
      }
    });
  }

  /**
   * Get current branch ID from session storage
   */
  private getCurrentBranchId(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionData = sessionStorage.getItem('next-auth.session-token');
      if (sessionData) {
        // Try to get from current session
        const session = JSON.parse(sessionData);
        return session.user?.branchId || null;
      }
    } catch (error) {
      logger.debug(`[${SERVICE_NAME}] Could not get branch ID from session`, { error });
    }
    
    // Fallback to localStorage
    try {
      const branchData = localStorage.getItem('current-branch');
      if (branchData) {
        const branch = JSON.parse(branchData);
        return branch.id || null;
      }
    } catch (error) {
      logger.debug(`[${SERVICE_NAME}] Could not get branch ID from localStorage`, { error });
    }
    
    return null;
  }

  /**
   * Get current branch code from session storage
   */
  private getCurrentBranchCode(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionData = sessionStorage.getItem('next-auth.session-token');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.user?.branchCode || null;
      }
    } catch (error) {
      logger.debug(`[${SERVICE_NAME}] Could not get branch code from session`, { error });
    }
    
    // Fallback to localStorage
    try {
      const branchData = localStorage.getItem('current-branch');
      if (branchData) {
        const branch = JSON.parse(branchData);
        return branch.code || null;
      }
    } catch (error) {
      logger.debug(`[${SERVICE_NAME}] Could not get branch code from localStorage`, { error });
    }
    
    return null;
  }
}

// Export singleton instance
export const offlineSyncQueue = OfflineSyncQueue.getInstance();
export default offlineSyncQueue;
