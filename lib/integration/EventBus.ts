/**
 * Event Bus System
 * Handles event-driven communication between modules
 */

export interface Event<T = any> {
  id: string;
  type: string;
  payload: T;
  metadata: EventMetadata;
}

export interface EventMetadata {
  timestamp: number;
  source: string;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface EventHandler<T = any> {
  id?: string;
  handle: (event: Event<T>) => Promise<void> | void;
  options?: SubscriptionOptions;
}

export interface SubscriptionOptions {
  filter?: (event: Event) => boolean;
  retries?: number;
  timeout?: number;
  priority?: number;
}

export type Unsubscribe = () => void;

interface EventLog {
  event: Event;
  timestamp: number;
  status: 'success' | 'error';
  error?: string;
}

export class EventBus {
  private static instance: EventBus;
  private subscribers: Map<string, EventHandler[]> = new Map();
  private eventLog: EventLog[] = [];
  private maxLogSize = 1000;
  
  private constructor() {}
  
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
  
  /**
   * Publish an event to all subscribers
   */
  async publish<T = any>(
    eventType: string,
    payload: T,
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    const event: Event<T> = {
      id: this.generateEventId(),
      type: eventType,
      payload,
      metadata: {
        timestamp: Date.now(),
        source: metadata?.source || 'system',
        tenantId: metadata?.tenantId,
        userId: metadata?.userId,
        correlationId: metadata?.correlationId || this.generateCorrelationId(),
        ...metadata
      }
    };
    
    // Log event
    this.logEvent(event, 'success');
    
    // Get subscribers for this event type
    const handlers = this.subscribers.get(eventType) || [];
    
    // Sort by priority
    const sortedHandlers = handlers.sort((a, b) => {
      const priorityA = a.options?.priority || 0;
      const priorityB = b.options?.priority || 0;
      return priorityB - priorityA;
    });
    
    // Execute handlers
    const promises = sortedHandlers.map(handler => 
      this.executeHandler(handler, event)
    );
    
    await Promise.allSettled(promises);
    
    // Publish to real-time stream if available
    if (typeof window !== 'undefined' && (window as any).eventStream) {
      (window as any).eventStream.emit(eventType, event);
    }
  }
  
  /**
   * Subscribe to an event type
   */
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T> | ((event: Event<T>) => Promise<void> | void),
    options?: SubscriptionOptions
  ): Unsubscribe {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    const wrappedHandler: EventHandler<T> = typeof handler === 'function'
      ? { handle: handler, options }
      : { ...handler, options: options || handler.options };
    
    wrappedHandler.id = wrappedHandler.id || this.generateHandlerId();
    
    this.subscribers.get(eventType)!.push(wrappedHandler);
    
    console.log(`Subscribed to ${eventType} (handler: ${wrappedHandler.id})`);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex(h => h.id === wrappedHandler.id);
        if (index > -1) {
          handlers.splice(index, 1);
          console.log(`Unsubscribed from ${eventType} (handler: ${wrappedHandler.id})`);
        }
      }
    };
  }
  
  /**
   * Subscribe to multiple event types
   */
  subscribeMultiple(
    eventTypes: string[],
    handler: EventHandler | ((event: Event) => Promise<void> | void),
    options?: SubscriptionOptions
  ): Unsubscribe[] {
    return eventTypes.map(type => this.subscribe(type, handler, options));
  }
  
  /**
   * Execute a single handler with error handling and retry logic
   */
  private async executeHandler<T>(
    handler: EventHandler<T>,
    event: Event<T>
  ): Promise<void> {
    try {
      // Check if handler should process this event
      if (handler.options?.filter && !handler.options.filter(event)) {
        return;
      }
      
      // Execute with timeout if specified
      if (handler.options?.timeout) {
        await this.executeWithTimeout(
          () => handler.handle(event),
          handler.options.timeout
        );
      } else {
        await handler.handle(event);
      }
      
    } catch (error: any) {
      console.error(`Event handler error for ${event.type}:`, error);
      
      // Retry logic
      const retries = handler.options?.retries || 0;
      if (retries > 0) {
        await this.retryHandler(handler, event, retries);
      } else {
        // Log error
        this.logEvent(event, 'error', error.message);
        
        // Publish error event
        await this.publish('system.error', {
          originalEvent: event,
          error: error.message,
          handler: handler.id,
          stack: error.stack
        }, {
          source: 'event-bus',
          correlationId: event.metadata.correlationId
        });
      }
    }
  }
  
  /**
   * Retry handler execution
   */
  private async retryHandler<T>(
    handler: EventHandler<T>,
    event: Event<T>,
    retriesLeft: number
  ): Promise<void> {
    for (let i = 0; i < retriesLeft; i++) {
      try {
        await handler.handle(event);
        return; // Success
      } catch (error) {
        if (i === retriesLeft - 1) {
          // Last retry failed
          throw error;
        }
        // Wait before retry (exponential backoff)
        await this.sleep(Math.pow(2, i) * 1000);
      }
    }
  }
  
  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      Promise.resolve(fn()),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Handler timeout')), timeout)
      )
    ]);
  }
  
  /**
   * Log event for debugging and monitoring
   */
  private logEvent(event: Event, status: 'success' | 'error', error?: string): void {
    this.eventLog.push({
      event,
      timestamp: Date.now(),
      status,
      error
    });
    
    // Trim log if too large
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }
  }
  
  /**
   * Get event log
   */
  public getEventLog(limit?: number): EventLog[] {
    if (limit) {
      return this.eventLog.slice(-limit);
    }
    return [...this.eventLog];
  }
  
  /**
   * Clear event log
   */
  public clearEventLog(): void {
    this.eventLog = [];
  }
  
  /**
   * Get all subscribers for an event type
   */
  public getSubscribers(eventType: string): EventHandler[] {
    return this.subscribers.get(eventType) || [];
  }
  
  /**
   * Get all event types with subscribers
   */
  public getEventTypes(): string[] {
    return Array.from(this.subscribers.keys());
  }
  
  /**
   * Clear all subscribers
   */
  public clearAllSubscribers(): void {
    this.subscribers.clear();
  }
  
  /**
   * Helper functions
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateHandlerId(): string {
    return `hdl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateCorrelationId(): string {
    return `cor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * F&B Event Types
 */
export const FnBEvents = {
  // Order Events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_ITEM_ADDED: 'order.item.added',
  ORDER_ITEM_REMOVED: 'order.item.removed',
  
  // Kitchen Events
  KITCHEN_ORDER_RECEIVED: 'kitchen.order.received',
  KITCHEN_ITEM_STARTED: 'kitchen.item.started',
  KITCHEN_ITEM_READY: 'kitchen.item.ready',
  KITCHEN_ORDER_COMPLETE: 'kitchen.order.complete',
  
  // Table Events
  TABLE_OCCUPIED: 'table.occupied',
  TABLE_RELEASED: 'table.released',
  TABLE_MERGED: 'table.merged',
  TABLE_SPLIT: 'table.split',
  TABLE_STATUS_CHANGED: 'table.status.changed',
  
  // Inventory Events
  STOCK_DEDUCTED: 'inventory.stock.deducted',
  STOCK_LOW: 'inventory.stock.low',
  STOCK_OUT: 'inventory.stock.out',
  STOCK_RECEIVED: 'inventory.stock.received',
  STOCK_ADJUSTED: 'inventory.stock.adjusted',
  
  // Payment Events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Reservation Events
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  RESERVATION_ARRIVED: 'reservation.arrived',
  RESERVATION_NO_SHOW: 'reservation.no_show',
  
  // Customer Events
  CUSTOMER_REGISTERED: 'customer.registered',
  CUSTOMER_UPDATED: 'customer.updated',
  LOYALTY_POINTS_EARNED: 'loyalty.points.earned',
  LOYALTY_REWARD_REDEEMED: 'loyalty.reward.redeemed',
  
  // Delivery Events
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_IN_TRANSIT: 'delivery.in_transit',
  DELIVERY_COMPLETED: 'delivery.completed',
  DELIVERY_FAILED: 'delivery.failed',
  
  // System Events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
  SYSTEM_INFO: 'system.info'
};

// Export singleton instance
export const eventBus = EventBus.getInstance();
