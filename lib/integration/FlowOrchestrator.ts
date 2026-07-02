/**
 * Flow Orchestrator
 * Manages integration flows between modules
 */

import { EventBus, FnBEvents, eventBus } from './EventBus';
import { ModuleRegistry, moduleRegistry } from '../modules/ModuleRegistry';

export interface IntegrationFlow {
  id: string;
  name: string;
  description: string;
  sourceModule: string;
  targetModule: string;
  eventType: string;
  handler: FlowHandler;
  isActive: boolean;
  tenantId?: string;
}

export type FlowHandler = (event: any, context: FlowContext) => Promise<void>;

export interface FlowContext {
  tenantId: string;
  userId?: string;
  moduleRegistry: ModuleRegistry;
  eventBus: EventBus;
}

export class FlowOrchestrator {
  private static instance: FlowOrchestrator;
  private flows: Map<string, IntegrationFlow> = new Map();
  private activeFlows: Map<string, Set<string>> = new Map(); // tenantId -> flowIds
  
  private constructor(
    private eventBus: EventBus,
    private moduleRegistry: ModuleRegistry
  ) {
    this.initializeStandardFlows();
  }
  
  public static getInstance(): FlowOrchestrator {
    if (!FlowOrchestrator.instance) {
      FlowOrchestrator.instance = new FlowOrchestrator(eventBus, moduleRegistry);
    }
    return FlowOrchestrator.instance;
  }
  
  /**
   * Initialize standard integration flows
   */
  private initializeStandardFlows(): void {
    // Order to Kitchen Flow
    this.registerFlow({
      id: 'order-to-kitchen',
      name: 'Order to Kitchen',
      description: 'Route orders to kitchen display system',
      sourceModule: 'POS_CORE',
      targetModule: 'KITCHEN_DISPLAY',
      eventType: FnBEvents.ORDER_CREATED,
      isActive: true,
      handler: this.orderToKitchenHandler.bind(this)
    });
    
    // Order to Inventory Flow
    this.registerFlow({
      id: 'order-to-inventory',
      name: 'Order to Inventory',
      description: 'Deduct stock when order is created',
      sourceModule: 'POS_CORE',
      targetModule: 'INVENTORY_CORE',
      eventType: FnBEvents.ORDER_CREATED,
      isActive: true,
      handler: this.orderToInventoryHandler.bind(this)
    });
    
    // Kitchen to Table Flow
    this.registerFlow({
      id: 'kitchen-to-table',
      name: 'Kitchen to Table',
      description: 'Update table status when order is ready',
      sourceModule: 'KITCHEN_DISPLAY',
      targetModule: 'TABLE_MANAGEMENT',
      eventType: FnBEvents.KITCHEN_ORDER_COMPLETE,
      isActive: true,
      handler: this.kitchenToTableHandler.bind(this)
    });
    
    // Payment to Loyalty Flow
    this.registerFlow({
      id: 'payment-to-loyalty',
      name: 'Payment to Loyalty',
      description: 'Award loyalty points on payment completion',
      sourceModule: 'POS_CORE',
      targetModule: 'LOYALTY_PROGRAM',
      eventType: FnBEvents.PAYMENT_COMPLETED,
      isActive: true,
      handler: this.paymentToLoyaltyHandler.bind(this)
    });
    
    // Reservation to Table Flow
    this.registerFlow({
      id: 'reservation-to-table',
      name: 'Reservation to Table',
      description: 'Reserve table when reservation is confirmed',
      sourceModule: 'RESERVATION',
      targetModule: 'TABLE_MANAGEMENT',
      eventType: FnBEvents.RESERVATION_CONFIRMED,
      isActive: true,
      handler: this.reservationToTableHandler.bind(this)
    });
  }
  
  /**
   * Register a new integration flow
   */
  public registerFlow(flow: IntegrationFlow): void {
    this.flows.set(flow.id, flow);
    console.log(`Flow registered: ${flow.name} (${flow.id})`);
  }
  
  /**
   * Setup flows for a tenant based on enabled modules
   */
  public async setupFlowsForTenant(
    tenantId: string,
    enabledModules: string[]
  ): Promise<void> {
    const applicableFlows = this.getApplicableFlows(enabledModules);
    
    if (!this.activeFlows.has(tenantId)) {
      this.activeFlows.set(tenantId, new Set());
    }
    
    for (const flow of applicableFlows) {
      await this.activateFlow(tenantId, flow);
    }
    
    console.log(`Setup ${applicableFlows.length} flows for tenant ${tenantId}`);
  }
  
  /**
   * Get flows applicable for given modules
   */
  private getApplicableFlows(enabledModules: string[]): IntegrationFlow[] {
    const moduleSet = new Set(enabledModules);
    
    return Array.from(this.flows.values()).filter(flow => {
      return moduleSet.has(flow.sourceModule) && moduleSet.has(flow.targetModule);
    });
  }
  
  /**
   * Activate a flow for a tenant
   */
  private async activateFlow(tenantId: string, flow: IntegrationFlow): Promise<void> {
    const flowId = `${tenantId}-${flow.id}`;
    
    // Subscribe to event
    this.eventBus.subscribe(
      flow.eventType,
      {
        id: flowId,
        handle: async (event) => {
          // Only process events for this tenant
          if (event.metadata.tenantId !== tenantId) {
            return;
          }
          
          const context: FlowContext = {
            tenantId,
            userId: event.metadata.userId,
            moduleRegistry: this.moduleRegistry,
            eventBus: this.eventBus
          };
          
          await flow.handler(event, context);
        }
      },
      {
        filter: (event) => event.metadata.tenantId === tenantId
      }
    );
    
    this.activeFlows.get(tenantId)!.add(flow.id);
  }
  
  /**
   * Flow Handlers
   */
  
  private async orderToKitchenHandler(event: any, context: FlowContext): Promise<void> {
    const order = event.payload;
    
    console.log(`[Flow] Order ${order.id} → Kitchen Display`);
    
    // Route order to kitchen
    await context.eventBus.publish(
      FnBEvents.KITCHEN_ORDER_RECEIVED,
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        items: order.items,
        tableId: order.tableId,
        tableName: order.tableName,
        priority: this.calculateOrderPriority(order),
        specialInstructions: order.notes,
        createdAt: order.createdAt
      },
      {
        tenantId: context.tenantId,
        userId: context.userId,
        source: 'flow.order-to-kitchen',
        correlationId: event.metadata.correlationId
      }
    );
  }
  
  private async orderToInventoryHandler(event: any, context: FlowContext): Promise<void> {
    const order = event.payload;
    
    console.log(`[Flow] Order ${order.id} → Inventory Deduction`);
    
    // Get recipe ingredients for ordered items
    const ingredients = await this.getIngredientsForOrder(order, context);
    
    // Deduct stock for each ingredient
    for (const ingredient of ingredients) {
      await context.eventBus.publish(
        FnBEvents.STOCK_DEDUCTED,
        {
          orderId: order.id,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          reason: 'order',
          timestamp: Date.now()
        },
        {
          tenantId: context.tenantId,
          source: 'flow.order-to-inventory',
          correlationId: event.metadata.correlationId
        }
      );
    }
    
    // Check for low stock
    await this.checkLowStock(context.tenantId, ingredients);
  }
  
  private async kitchenToTableHandler(event: any, context: FlowContext): Promise<void> {
    const { orderId, tableId } = event.payload;
    
    console.log(`[Flow] Kitchen Order ${orderId} Complete → Table ${tableId}`);
    
    if (tableId) {
      // Update table status
      await context.eventBus.publish(
        FnBEvents.TABLE_STATUS_CHANGED,
        {
          tableId,
          status: 'ready_to_serve',
          orderId,
          timestamp: Date.now()
        },
        {
          tenantId: context.tenantId,
          source: 'flow.kitchen-to-table',
          correlationId: event.metadata.correlationId
        }
      );
    }
  }
  
  private async paymentToLoyaltyHandler(event: any, context: FlowContext): Promise<void> {
    const payment = event.payload;
    
    console.log(`[Flow] Payment ${payment.id} → Loyalty Points`);
    
    if (payment.customerId) {
      // Calculate loyalty points (1 point per $1 spent, for example)
      const points = Math.floor(payment.amount);
      
      await context.eventBus.publish(
        FnBEvents.LOYALTY_POINTS_EARNED,
        {
          customerId: payment.customerId,
          orderId: payment.orderId,
          points,
          amount: payment.amount,
          reason: 'purchase',
          timestamp: Date.now()
        },
        {
          tenantId: context.tenantId,
          source: 'flow.payment-to-loyalty',
          correlationId: event.metadata.correlationId
        }
      );
    }
  }
  
  private async reservationToTableHandler(event: any, context: FlowContext): Promise<void> {
    const reservation = event.payload;
    
    console.log(`[Flow] Reservation ${reservation.id} → Table ${reservation.tableId}`);
    
    if (reservation.tableId) {
      await context.eventBus.publish(
        FnBEvents.TABLE_STATUS_CHANGED,
        {
          tableId: reservation.tableId,
          status: 'reserved',
          reservationId: reservation.id,
          reservationTime: reservation.reservationTime,
          guestName: reservation.guestName,
          partySize: reservation.partySize,
          timestamp: Date.now()
        },
        {
          tenantId: context.tenantId,
          source: 'flow.reservation-to-table',
          correlationId: event.metadata.correlationId
        }
      );
    }
  }
  
  /**
   * Helper Methods
   */
  
  private calculateOrderPriority(order: any): 'high' | 'normal' | 'low' {
    // Priority logic based on order type, time, etc.
    if (order.isUrgent) return 'high';
    if (order.type === 'delivery') return 'high';
    return 'normal';
  }
  
  private async getIngredientsForOrder(order: any, context: FlowContext): Promise<any[]> {
    // This would fetch recipe ingredients from database
    // For now, return mock data
    const ingredients: any[] = [];
    
    for (const item of order.items) {
      // Each order item would have associated recipe ingredients
      ingredients.push({
        id: `ing-${item.productId}`,
        name: `Ingredient for ${item.productName}`,
        quantity: item.quantity,
        unit: 'unit'
      });
    }
    
    return ingredients;
  }
  
  private async checkLowStock(tenantId: string, ingredients: any[]): Promise<void> {
    // Check if any ingredients are low on stock
    // This would query the database
    // For now, just log
    console.log(`[Flow] Checking low stock for ${ingredients.length} ingredients`);
  }
  
  /**
   * Get active flows for tenant
   */
  public getActiveFlows(tenantId: string): string[] {
    return Array.from(this.activeFlows.get(tenantId) || []);
  }
  
  /**
   * Deactivate all flows for tenant
   */
  public async deactivateFlowsForTenant(tenantId: string): Promise<void> {
    const flowIds = this.activeFlows.get(tenantId);
    if (flowIds) {
      flowIds.clear();
      console.log(`Deactivated all flows for tenant ${tenantId}`);
    }
  }
}

// Export singleton instance
export const flowOrchestrator = FlowOrchestrator.getInstance();
