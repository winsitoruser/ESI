# 🔧 F&B Modular System - Implementation Guide

## 📋 Technical Implementation Details

### **1. Module Registry System**

```typescript
// /lib/modules/ModuleRegistry.ts
export class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();
  private integrations: Map<string, IntegrationFlow[]> = new Map();
  
  registerModule(module: ModuleDefinition): void {
    // Validate module definition
    this.validateModule(module);
    
    // Check dependencies
    this.checkDependencies(module);
    
    // Register module
    this.modules.set(module.code, module);
    
    // Setup integration hooks
    this.setupIntegrationHooks(module);
  }
  
  getModulesForBusinessType(
    businessType: string,
    includeOptional: boolean = false
  ): ModuleDefinition[] {
    const modules = Array.from(this.modules.values());
    
    return modules.filter(module => {
      const config = module.businessTypeConfig[businessType];
      if (!config) return false;
      
      if (config.isRequired) return true;
      if (config.isRecommended) return true;
      if (includeOptional && config.isOptional) return true;
      
      return false;
    });
  }
  
  resolveDependencies(moduleIds: string[]): string[] {
    const resolved = new Set<string>();
    const queue = [...moduleIds];
    
    while (queue.length > 0) {
      const moduleId = queue.shift()!;
      if (resolved.has(moduleId)) continue;
      
      resolved.add(moduleId);
      
      const module = this.modules.get(moduleId);
      if (module?.dependencies) {
        queue.push(...module.dependencies);
      }
    }
    
    return Array.from(resolved);
  }
}

// Module Definition Interface
export interface ModuleDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'core' | 'fnb' | 'optional' | 'addon';
  version: string;
  
  // Dependencies
  dependencies: string[];
  optionalDependencies: string[];
  
  // Business Type Configuration
  businessTypeConfig: {
    [businessType: string]: {
      isRequired: boolean;
      isRecommended: boolean;
      isOptional: boolean;
      features: string[];
      defaultConfig: Record<string, any>;
    };
  };
  
  // Integration Points
  integrationPoints: {
    provides: IntegrationPoint[];
    consumes: IntegrationPoint[];
  };
  
  // Features
  features: FeatureDefinition[];
  
  // API Routes
  routes: RouteDefinition[];
  
  // Database Models
  models: string[];
  
  // UI Components
  components: ComponentDefinition[];
}

export interface IntegrationPoint {
  name: string;
  type: 'event' | 'api' | 'data';
  description: string;
  schema: any;
}

export interface FeatureDefinition {
  code: string;
  name: string;
  description: string;
  isDefault: boolean;
  businessTypes: string[];
  config: Record<string, any>;
}
```

---

### **2. Event Bus for Module Communication**

```typescript
// /lib/integration/EventBus.ts
export class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();
  private eventLog: EventLog[] = [];
  
  // Publish event
  async publish<T = any>(
    eventType: string,
    payload: T,
    metadata?: EventMetadata
  ): Promise<void> {
    const event: Event<T> = {
      id: generateEventId(),
      type: eventType,
      payload,
      metadata: {
        timestamp: Date.now(),
        source: metadata?.source || 'system',
        tenantId: metadata?.tenantId,
        userId: metadata?.userId,
        ...metadata
      }
    };
    
    // Log event
    this.logEvent(event);
    
    // Get subscribers
    const handlers = this.subscribers.get(eventType) || [];
    
    // Execute handlers in parallel
    await Promise.all(
      handlers.map(handler => 
        this.executeHandler(handler, event)
      )
    );
    
    // Publish to event stream for real-time updates
    await this.publishToStream(event);
  }
  
  // Subscribe to event
  subscribe<T = any>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Unsubscribe {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    const wrappedHandler = {
      ...handler,
      options,
      id: generateHandlerId()
    };
    
    this.subscribers.get(eventType)!.push(wrappedHandler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex(h => h.id === wrappedHandler.id);
        if (index > -1) handlers.splice(index, 1);
      }
    };
  }
  
  private async executeHandler<T>(
    handler: EventHandler<T>,
    event: Event<T>
  ): Promise<void> {
    try {
      // Check if handler should process this event
      if (handler.options?.filter && !handler.options.filter(event)) {
        return;
      }
      
      // Execute with retry logic
      await this.retryHandler(
        () => handler.handle(event),
        handler.options?.retries || 3
      );
      
    } catch (error) {
      console.error(`Event handler error for ${event.type}:`, error);
      
      // Publish error event
      await this.publish('system.error', {
        originalEvent: event,
        error: error.message,
        handler: handler.id
      });
    }
  }
}

// Event Types for F&B Modules
export const FnBEvents = {
  // Order Events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  
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
  
  // Inventory Events
  STOCK_DEDUCTED: 'inventory.stock.deducted',
  STOCK_LOW: 'inventory.stock.low',
  STOCK_OUT: 'inventory.stock.out',
  STOCK_RECEIVED: 'inventory.stock.received',
  
  // Payment Events
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  
  // Reservation Events
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  RESERVATION_CANCELLED: 'reservation.cancelled',
  RESERVATION_ARRIVED: 'reservation.arrived',
  
  // Customer Events
  CUSTOMER_REGISTERED: 'customer.registered',
  LOYALTY_POINTS_EARNED: 'loyalty.points.earned',
  LOYALTY_REWARD_REDEEMED: 'loyalty.reward.redeemed'
};
```

---

### **3. Module Integration Flows**

```typescript
// /lib/integration/FlowOrchestrator.ts
export class FlowOrchestrator {
  constructor(
    private eventBus: EventBus,
    private moduleRegistry: ModuleRegistry
  ) {}
  
  // Setup integration flows for a tenant
  async setupFlowsForTenant(
    tenantId: string,
    enabledModules: string[]
  ): Promise<void> {
    const flows = this.getFlowsForModules(enabledModules);
    
    for (const flow of flows) {
      await this.activateFlow(tenantId, flow);
    }
  }
  
  // Example: Order to Kitchen Flow
  private setupOrderToKitchenFlow(tenantId: string): void {
    this.eventBus.subscribe(
      FnBEvents.ORDER_CREATED,
      {
        id: `order-to-kitchen-${tenantId}`,
        handle: async (event) => {
          const order = event.payload;
          
          // Check if Kitchen Display module is enabled
          if (!this.isModuleEnabled(tenantId, 'KITCHEN_DISPLAY')) {
            return;
          }
          
          // Route order to kitchen
          await this.routeOrderToKitchen(order);
          
          // Publish kitchen event
          await this.eventBus.publish(
            FnBEvents.KITCHEN_ORDER_RECEIVED,
            {
              orderId: order.id,
              items: order.items,
              tableId: order.tableId,
              priority: this.calculatePriority(order)
            },
            { tenantId, source: 'flow.order-to-kitchen' }
          );
        }
      },
      {
        filter: (event) => event.metadata.tenantId === tenantId
      }
    );
  }
  
  // Example: Order to Inventory Flow
  private setupOrderToInventoryFlow(tenantId: string): void {
    this.eventBus.subscribe(
      FnBEvents.ORDER_CREATED,
      {
        id: `order-to-inventory-${tenantId}`,
        handle: async (event) => {
          const order = event.payload;
          
          // Get recipe ingredients for ordered items
          const ingredients = await this.getIngredientsForOrder(order);
          
          // Deduct stock
          for (const ingredient of ingredients) {
            await this.deductStock(tenantId, ingredient);
          }
          
          // Publish stock deduction event
          await this.eventBus.publish(
            FnBEvents.STOCK_DEDUCTED,
            {
              orderId: order.id,
              ingredients,
              timestamp: Date.now()
            },
            { tenantId, source: 'flow.order-to-inventory' }
          );
          
          // Check for low stock
          await this.checkLowStock(tenantId, ingredients);
        }
      },
      {
        filter: (event) => event.metadata.tenantId === tenantId
      }
    );
  }
  
  // Example: Kitchen to Table Flow
  private setupKitchenToTableFlow(tenantId: string): void {
    this.eventBus.subscribe(
      FnBEvents.KITCHEN_ORDER_COMPLETE,
      {
        id: `kitchen-to-table-${tenantId}`,
        handle: async (event) => {
          const { orderId, tableId } = event.payload;
          
          // Check if Waiter App is enabled
          if (this.isModuleEnabled(tenantId, 'WAITER_APP')) {
            // Notify waiter
            await this.notifyWaiter(tenantId, {
              orderId,
              tableId,
              message: 'Order ready for serving'
            });
          }
          
          // Update table status
          if (this.isModuleEnabled(tenantId, 'TABLE_MANAGEMENT')) {
            await this.updateTableStatus(tenantId, tableId, {
              orderStatus: 'ready_to_serve'
            });
          }
        }
      },
      {
        filter: (event) => event.metadata.tenantId === tenantId
      }
    );
  }
}
```

---

### **4. API Endpoints for Module Management**

```typescript
// /pages/api/modules/catalog.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { businessType, includeOptional } = req.query;
    
    try {
      const db = getDb();
      const { Module, BusinessTypeModule } = db;
      
      // Get modules for business type
      let query: any = {
        isActive: true
      };
      
      if (businessType) {
        const modules = await BusinessTypeModule.findAll({
          where: { businessTypeId: businessType },
          include: [{
            model: Module,
            as: 'module',
            where: { isActive: true }
          }]
        });
        
        const catalogModules = modules.map((btm: any) => ({
          ...btm.module.toJSON(),
          isRequired: !btm.isOptional,
          isRecommended: btm.isDefault,
          isOptional: btm.isOptional,
          businessTypeConfig: btm.configuration
        }));
        
        return res.status(200).json({
          success: true,
          data: {
            businessType,
            modules: catalogModules,
            categories: this.categorizeModules(catalogModules)
          }
        });
      }
      
      // Get all modules
      const allModules = await Module.findAll({
        where: query,
        include: [{
          model: BusinessTypeModule,
          as: 'businessTypes'
        }],
        order: [['category', 'ASC'], ['sortOrder', 'ASC']]
      });
      
      return res.status(200).json({
        success: true,
        data: {
          modules: allModules,
          categories: this.categorizeModules(allModules)
        }
      });
      
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// /pages/api/modules/configure.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const { tenantId, moduleIds, businessType } = req.body;
    
    try {
      const db = getDb();
      const { TenantModule, Module } = db;
      
      // Resolve dependencies
      const allModuleIds = await this.resolveDependencies(moduleIds);
      
      // Validate modules for business type
      const validModules = await this.validateModulesForBusinessType(
        allModuleIds,
        businessType
      );
      
      // Enable modules for tenant
      const results = [];
      for (const moduleId of validModules) {
        const module = await Module.findByPk(moduleId);
        
        const [tenantModule, created] = await TenantModule.findOrCreate({
          where: { tenantId, moduleId },
          defaults: {
            tenantId,
            moduleId,
            isEnabled: true,
            configuration: this.getDefaultConfig(module, businessType),
            enabledAt: new Date(),
            enabledBy: session.user.id
          }
        });
        
        if (!created && !tenantModule.isEnabled) {
          await tenantModule.update({
            isEnabled: true,
            enabledAt: new Date(),
            enabledBy: session.user.id
          });
        }
        
        results.push({
          moduleId,
          moduleName: module.name,
          status: created ? 'enabled' : 'already_enabled'
        });
      }
      
      // Setup integration flows
      await this.setupIntegrationFlows(tenantId, validModules);
      
      return res.status(200).json({
        success: true,
        message: 'Modules configured successfully',
        data: {
          configured: results,
          totalModules: results.length
        }
      });
      
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// /pages/api/modules/features/[moduleId].ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { moduleId } = req.query;
  
  if (req.method === 'GET') {
    // Get features for module
    const db = getDb();
    const { ModuleFeature, TenantModuleFeature } = db;
    
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId;
    
    const features = await ModuleFeature.findAll({
      where: { moduleId }
    });
    
    if (tenantId) {
      // Get tenant-specific feature settings
      const tenantFeatures = await TenantModuleFeature.findAll({
        where: { tenantId, moduleId }
      });
      
      const featureMap = new Map(
        tenantFeatures.map(tf => [tf.featureId, tf.isEnabled])
      );
      
      const enrichedFeatures = features.map(f => ({
        ...f.toJSON(),
        isEnabled: featureMap.get(f.id) ?? f.isDefault
      }));
      
      return res.status(200).json({
        success: true,
        data: enrichedFeatures
      });
    }
    
    return res.status(200).json({
      success: true,
      data: features
    });
  }
  
  if (req.method === 'PUT') {
    // Update feature settings
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const { features } = req.body;
    const tenantId = session.user.tenantId;
    
    const db = getDb();
    const { TenantModuleFeature } = db;
    
    for (const feature of features) {
      await TenantModuleFeature.upsert({
        tenantId,
        moduleId,
        featureId: feature.featureId,
        isEnabled: feature.isEnabled
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Features updated successfully'
    });
  }
}
```

---

### **5. Module Selection UI Component**

```typescript
// /components/modules/ModuleSelector.tsx
export default function ModuleSelector({
  businessType,
  onModulesSelected
}: ModuleSelectorProps) {
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<'all' | 'core' | 'fnb' | 'optional'>('all');
  
  useEffect(() => {
    fetchModules();
  }, [businessType]);
  
  const fetchModules = async () => {
    const res = await fetch(`/api/modules/catalog?businessType=${businessType}`);
    const data = await res.json();
    
    if (data.success) {
      setModules(data.data.modules);
      
      // Auto-select required modules
      const required = data.data.modules
        .filter((m: CatalogModule) => m.isRequired)
        .map((m: CatalogModule) => m.id);
      
      setSelectedModules(new Set(required));
    }
  };
  
  const toggleModule = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module?.isRequired) return; // Cannot deselect required modules
    
    const newSelected = new Set(selectedModules);
    if (newSelected.has(moduleId)) {
      // Check if other modules depend on this
      const dependents = modules.filter(m => 
        m.dependencies?.includes(moduleId) && selectedModules.has(m.id)
      );
      
      if (dependents.length > 0) {
        alert(`Cannot deselect: ${dependents.map(d => d.name).join(', ')} depends on this module`);
        return;
      }
      
      newSelected.delete(moduleId);
    } else {
      newSelected.add(moduleId);
      
      // Auto-select dependencies
      if (module?.dependencies) {
        module.dependencies.forEach(dep => newSelected.add(dep));
      }
    }
    
    setSelectedModules(newSelected);
  };
  
  const filteredModules = modules.filter(m => {
    if (category === 'all') return true;
    return m.category === category;
  });
  
  const calculateTotalCost = () => {
    return Array.from(selectedModules)
      .map(id => modules.find(m => m.id === id))
      .reduce((sum, m) => sum + (m?.pricing?.monthlyFee || 0), 0);
  };
  
  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'core', 'fnb', 'optional'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat as any)}
            className={`px-4 py-2 font-medium ${
              category === cat
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            isSelected={selectedModules.has(module.id)}
            onToggle={() => toggleModule(module.id)}
          />
        ))}
      </div>
      
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          Selected Modules Summary
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-blue-700">Total Modules:</p>
            <p className="text-2xl font-bold text-blue-900">{selectedModules.size}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700">Monthly Cost:</p>
            <p className="text-2xl font-bold text-blue-900">
              ${calculateTotalCost().toFixed(2)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onModulesSelected(Array.from(selectedModules))}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Configure Selected Modules
        </button>
      </div>
    </div>
  );
}
```

---

### **6. Business Type Setup Wizard**

```typescript
// /components/onboarding/BusinessTypeWizard.tsx
export default function BusinessTypeWizard() {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [configuration, setConfiguration] = useState<any>({});
  
  const steps = [
    { id: 1, name: 'Business Type', component: BusinessTypeSelection },
    { id: 2, name: 'Module Selection', component: ModuleSelector },
    { id: 3, name: 'Configuration', component: ModuleConfiguration },
    { id: 4, name: 'Review & Confirm', component: ReviewConfirm }
  ];
  
  const handleBusinessTypeSelected = (type: string) => {
    setBusinessType(type);
    setStep(2);
  };
  
  const handleModulesSelected = (modules: string[]) => {
    setSelectedModules(modules);
    setStep(3);
  };
  
  const handleConfigurationComplete = (config: any) => {
    setConfiguration(config);
    setStep(4);
  };
  
  const handleConfirm = async () => {
    try {
      const res = await fetch('/api/modules/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          moduleIds: selectedModules,
          configuration
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Modules configured successfully!');
        router.push('/dashboard');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Configuration failed');
    }
  };
  
  const CurrentStepComponent = steps[step - 1].component;
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= s.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s.id ? <Check className="w-5 h-5" /> : s.id}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  step >= s.id ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {s.name}
                </p>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 ${
                  step > s.id ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <CurrentStepComponent
          businessType={businessType}
          selectedModules={selectedModules}
          configuration={configuration}
          onBusinessTypeSelected={handleBusinessTypeSelected}
          onModulesSelected={handleModulesSelected}
          onConfigurationComplete={handleConfigurationComplete}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
}
```

---

## 🎯 Next Steps

1. **Implement Module Registry** - Core infrastructure
2. **Setup Event Bus** - Module communication
3. **Create Module Catalog** - UI for module selection
4. **Build Integration Flows** - Auto-binding between modules
5. **Develop Business Type Wizard** - Onboarding experience
6. **Testing & QA** - End-to-end testing

**Status:** 📘 **IMPLEMENTATION GUIDE COMPLETE**  
**Ready for:** Development Phase 1
