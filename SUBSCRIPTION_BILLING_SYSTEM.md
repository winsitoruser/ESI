# 💳 Subscription & Billing System - Bedagang PoS

## 🎯 Overview

Sistem subscription dan billing yang dirancang untuk mendukung model multi-tenant dengan berbagai tier pricing, usage tracking, dan automated billing cycles.

---

## 📊 Database Schema Design

### **1. Plans Table**
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_interval VARCHAR(20) NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  currency VARCHAR(3) DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT true,
  features JSONB, -- { "pos": true, "inventory": true, "kitchen": false }
  metadata JSONB, -- Additional plan data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_plans_active ON plans(is_active);
CREATE INDEX idx_plans_interval ON plans(billing_interval);
```

### **2. Plan Limits Table**
```sql
CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL, -- 'users', 'branches', 'products', etc
  max_value INTEGER NOT NULL,
  unit VARCHAR(20), -- 'users', 'branches', 'transactions/month'
  is_soft_limit BOOLEAN DEFAULT false, -- Allow overage with charges
  overage_rate DECIMAL(10,4), -- Price per unit over limit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_plan_limits_unique ON plan_limits(plan_id, metric_name);
```

### **3. Subscriptions Table**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(current_period_end);
```

### **4. Billing Cycles Table**
```sql
CREATE TABLE billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL, -- Plan base price
  overage_amount DECIMAL(10,2) DEFAULT 0, -- Extra usage charges
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_cycles_subscription ON billing_cycles(subscription_id);
CREATE INDEX idx_billing_cycles_status ON billing_cycles(status);
CREATE INDEX idx_billing_cycles_due_date ON billing_cycles(due_date);
```

### **5. Invoices Table**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_cycle_id UUID REFERENCES billing_cycles(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  
  -- Payment details
  payment_provider VARCHAR(50), -- 'stripe', 'midtrans', 'manual'
  payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', 'ewallet'
  external_id VARCHAR(100), -- External payment ID
  payment_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Customer details
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_address TEXT,
  
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

### **6. Invoice Items Table**
```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'plan', 'overage', 'discount', 'tax'
  reference_type VARCHAR(50), -- 'plan', 'usage_metric'
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_type ON invoice_items(type);
```

### **7. Usage Metrics Table**
```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL, -- 'users', 'transactions', 'storage'
  metric_value DECIMAL(15,2) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL, -- Daily aggregation
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(50), -- 'system', 'manual', 'api'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_usage_metrics_tenant ON usage_metrics(tenant_id);
CREATE INDEX idx_usage_metrics_metric ON usage_metrics(metric_name);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(period_start, period_end);
CREATE UNIQUE INDEX idx_usage_metrics_unique ON usage_metrics(tenant_id, metric_name, period_start);
```

### **8. Payment Transactions Table**
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  provider VARCHAR(50) NOT NULL, -- 'stripe', 'midtrans', 'manual'
  provider_transaction_id VARCHAR(100),
  payment_method VARCHAR(50),
  failure_reason TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
```

---

## 🚀 Implementation Plan

### **Phase 1: Core Models & APIs**

#### **1. Database Models**
```javascript
// models/Plan.js
const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: DataTypes.TEXT,
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  billingInterval: {
    type: DataTypes.ENUM('monthly', 'yearly'),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'IDR'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  features: DataTypes.JSONB,
  metadata: DataTypes.JSONB
});

// models/Subscription.js
const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'tenants', key: 'id' }
  },
  planId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'plans', key: 'id' }
  },
  status: {
    type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'expired'),
    defaultValue: 'active'
  },
  trialEndsAt: DataTypes.DATE,
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: false
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: false
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});
```

#### **2. API Endpoints**
```typescript
// pages/api/billing/plans/index.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      // Get all available plans
      const plans = await Plan.findAll({ where: { isActive: true } });
      return res.json({ success: true, data: plans });
      
    case 'POST':
      // Create new plan (admin only)
      const plan = await Plan.create(req.body);
      return res.json({ success: true, data: plan });
      
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// pages/api/billing/subscribe.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (req.method === 'POST') {
    const { planId } = req.body;
    const tenantId = session.user.tenantId;
    
    // Create subscription
    const subscription = await Subscription.create({
      tenantId,
      planId,
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
    
    return res.json({ success: true, data: subscription });
  }
}
```

### **Phase 2: Usage Tracking**

#### **1. Usage Tracking Service**
```javascript
// services/UsageTrackingService.js
class UsageTrackingService {
  static async trackUsage(tenantId, metricName, value, metadata = {}) {
    // Get or create daily metric record
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
    
    const [metric, created] = await UsageMetric.findOrCreate({
      where: {
        tenantId,
        metricName,
        periodStart
      },
      defaults: {
        metricValue: value,
        periodEnd,
        source: 'system',
        metadata
      }
    });
    
    if (!created) {
      metric.metricValue += value;
      await metric.save();
    }
    
    // Check limits
    await this.checkLimits(tenantId, metricName, metric.metricValue);
  }
  
  static async checkLimits(tenantId, metricName, currentValue) {
    const subscription = await Subscription.findOne({
      where: { tenantId, status: 'active' },
      include: [{
        model: Plan,
        include: [{ model: PlanLimit, where: { metricName } }]
      }]
    });
    
    if (!subscription) return;
    
    const limit = subscription.Plan.PlanLimits[0];
    if (!limit) return;
    
    if (currentValue > limit.maxValue) {
      // Handle overage
      await this.handleOverage(tenantId, limit, currentValue - limit.maxValue);
    }
  }
  
  static async handleOverage(tenantId, limit, overageAmount) {
    // Calculate overage charges
    const overageCharge = overageAmount * limit.overageRate;
    
    // Create usage record for billing
    await UsageMetric.create({
      tenantId,
      metricName: `overage_${limit.metricName}`,
      metricValue: overageCharge,
      periodStart: new Date(),
      periodEnd: new Date(),
      source: 'billing'
    });
  }
}
```

#### **2. Middleware for Usage Tracking**
```javascript
// middleware/usageTracking.js
const usageTracking = async (req, res, next) => {
  const tenantId = req.user?.tenantId;
  
  if (tenantId) {
    // Track API usage
    await UsageTrackingService.trackUsage(tenantId, 'api_calls', 1, {
      endpoint: req.path,
      method: req.method
    });
    
    // Track specific actions
    if (req.path.includes('/transactions')) {
      await UsageTrackingService.trackUsage(tenantId, 'transactions', 1);
    }
  }
  
  next();
};
```

### **Phase 3: Billing Automation**

#### **1. Billing Service**
```javascript
// services/BillingService.js
class BillingService {
  static async generateBillingCycles() {
    const subscriptions = await Subscription.findAll({
      where: {
        status: 'active',
        currentPeriodEnd: { [Op.lte]: new Date() }
      }
    });
    
    for (const subscription of subscriptions) {
      await this.createBillingCycle(subscription);
    }
  }
  
  static async createBillingCycle(subscription) {
    const plan = await Plan.findByPk(subscription.planId);
    
    // Calculate base amount
    const baseAmount = plan.price;
    
    // Calculate overage charges
    const overageAmount = await this.calculateOverageCharges(
      subscription.tenantId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd
    );
    
    // Create billing cycle
    const billingCycle = await BillingCycle.create({
      subscriptionId: subscription.id,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      baseAmount,
      overageAmount,
      totalAmount: baseAmount + overageAmount,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending'
    });
    
    // Generate invoice
    await this.generateInvoice(billingCycle);
    
    // Update subscription period
    const nextPeriodStart = subscription.currentPeriodEnd;
    const nextPeriodEnd = new Date(
      nextPeriodStart.getTime() + 
      (plan.billingInterval === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000
    );
    
    await subscription.update({
      currentPeriodStart: nextPeriodStart,
      currentPeriodEnd: nextPeriodEnd
    });
  }
  
  static async calculateOverageCharges(tenantId, periodStart, periodEnd) {
    const overageMetrics = await UsageMetric.findAll({
      where: {
        tenantId,
        metricName: { [Op.like]: 'overage_%' },
        periodStart: { [Op.gte]: periodStart },
        periodEnd: { [Op.lte]: periodEnd }
      }
    });
    
    return overageMetrics.reduce((total, metric) => total + metric.metricValue, 0);
  }
}
```

#### **2. Cron Job for Billing**
```javascript
// scripts/billing-cron.js
const cron = require('node-cron');
const { BillingService } = require('../services/BillingService');

// Run daily at 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily billing cycle...');
  await BillingService.generateBillingCycles();
  console.log('Billing cycle completed');
});

// Run hourly for usage metrics processing
cron.schedule('0 * * * *', async () => {
  console.log('Processing usage metrics...');
  await UsageTrackingService.processDailyMetrics();
  console.log('Usage metrics processed');
});
```

### **Phase 4: Payment Integration**

#### **1. Payment Providers**
```javascript
// services/payment/MidtransService.js
class MidtransService {
  static async createPayment(invoice) {
    const payload = {
      transaction_details: {
        order_id: invoice.id,
        gross_amount: invoice.totalAmount
      },
      customer_details: {
        first_name: invoice.customerName,
        email: invoice.customerEmail
      },
      item_details: await this.getInvoiceItems(invoice)
    };
    
    const response = await midtrans.charge(payload);
    
    // Save payment transaction
    await PaymentTransaction.create({
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      provider: 'midtrans',
      providerTransactionId: response.transaction_id,
      status: 'pending'
    });
    
    return response;
  }
  
  static async handleWebhook(notification) {
    const transaction = await PaymentTransaction.findOne({
      where: { providerTransactionId: notification.transaction_id },
      include: [{ model: Invoice }]
    });
    
    if (transaction) {
      await transaction.update({
        status: notification.transaction_status,
        processedAt: new Date()
      });
      
      if (notification.transaction_status === 'capture') {
        await transaction.Invoice.update({ status: 'paid', paidDate: new Date() });
      }
    }
  }
}
```

---

## 📊 Frontend Implementation

### **1. Subscription Management Page**
```typescript
// pages/billing/subscription.tsx
const SubscriptionPage = () => {
  const { data: subscription } = useQuery(['subscription'], fetchSubscription);
  const { data: plans } = useQuery(['plans'], fetchPlans);
  const { data: usage } = useQuery(['usage'], fetchUsageMetrics);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{subscription?.plan.name}</h3>
                <p className="text-gray-500">{subscription?.plan.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(subscription?.plan.price)}
                </p>
                <p className="text-sm text-gray-500">/{subscription?.plan.billingInterval}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Usage Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {usage?.metrics.map((metric) => (
                <div key={metric.name} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm">
                      {metric.value} / {metric.limit}
                    </span>
                  </div>
                  <Progress 
                    value={(metric.value / metric.limit) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Available Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {plans?.map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-2xl font-bold my-2">
                    {formatCurrency(plan.price)}
                  </p>
                  <Button 
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={plan.id === subscription?.planId}
                    className="w-full"
                  >
                    {plan.id === subscription?.planId ? 'Current' : 'Upgrade'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
```

### **2. Billing History Page**
```typescript
// pages/billing/invoices.tsx
const InvoicesPage = () => {
  const { data: invoices } = useQuery(['invoices'], fetchInvoices);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(invoice.issuedDate)}</TableCell>
                    <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
```

---

## 🔧 Advanced Features

### **1. Feature Flags per Plan**
```javascript
// utils/featureFlags.js
export const checkFeatureAccess = (tenant, feature) => {
  const subscription = tenant.subscription;
  const planFeatures = subscription.plan.features;
  
  return planFeatures[feature] || false;
};

// Usage in components
const KitchenModule = () => {
  const { tenant } = useTenant();
  
  if (!checkFeatureAccess(tenant, 'kitchen')) {
    return <UpgradePrompt feature="Kitchen Display System" />;
  }
  
  return <KitchenDashboard />;
};
```

### **2. Automated Dunning Management**
```javascript
// services/DunningService.js
class DunningService {
  static async processOverdueInvoices() {
    const overdueInvoices = await Invoice.findAll({
      where: {
        status: 'overdue',
        dueDate: { [Op.lt]: new Date() }
      },
      include: [{ model: Tenant }]
    });
    
    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor(
        (new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24)
      );
      
      // Send reminder based on dunning schedule
      if (daysOverdue === 3) {
        await this.sendFirstReminder(invoice);
      } else if (daysOverdue === 7) {
        await this.sendSecondReminder(invoice);
      } else if (daysOverdue === 14) {
        await this.sendFinalNotice(invoice);
      } else if (daysOverdue >= 30) {
        await this.suspendSubscription(invoice.tenant);
      }
    }
  }
}
```

### **3. Revenue Recognition**
```javascript
// services/RevenueRecognitionService.js
class RevenueRecognitionService {
  static async recognizeRevenue(invoice) {
    // Split revenue across service period
    const daysInPeriod = Math.floor(
      (invoice.billingCycle.periodEnd - invoice.billingCycle.periodStart) 
      / (1000 * 60 * 60 * 24)
    );
    
    const dailyRevenue = invoice.totalAmount / daysInPeriod;
    
    // Create daily revenue records
    for (let i = 0; i < daysInPeriod; i++) {
      const date = new Date(invoice.billingCycle.periodStart);
      date.setDate(date.getDate() + i);
      
      await RevenueRecord.create({
        tenantId: invoice.tenantId,
        invoiceId: invoice.id,
        amount: dailyRevenue,
        recognizedDate: date,
        recognizedAt: new Date()
      });
    }
  }
}
```

---

## 📈 Analytics & Reporting

### **1. MRR (Monthly Recurring Revenue)**
```sql
SELECT 
  DATE_TRUNC('month', created_at) as month,
  SUM(CASE WHEN billing_interval = 'monthly' THEN price ELSE price/12 END) as mrr
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.status = 'active'
GROUP BY month
ORDER BY month DESC;
```

### **2. Churn Rate**
```sql
SELECT 
  DATE_TRUNC('month', cancelled_at) as month,
  COUNT(*) as cancelled_subscriptions,
  COUNT(*) * 100.0 / LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', cancelled_at)) as churn_rate
FROM subscriptions
WHERE status = 'cancelled'
GROUP BY month
ORDER BY month DESC;
```

### **3. ARPU (Average Revenue Per User)**
```sql
SELECT 
  DATE_TRUNC('month', i.paid_date) as month,
  AVG(i.total_amount) as arpu,
  COUNT(DISTINCT i.tenant_id) as active_tenants
FROM invoices i
WHERE i.status = 'paid'
GROUP BY month
ORDER BY month DESC;
```

---

## 🚀 Deployment Checklist

### **1. Database Setup**
- [ ] Run all migrations
- [ ] Seed initial plans
- [ ] Set up indexes for performance
- [ ] Configure backup strategy

### **2. Environment Variables**
```env
# Billing Configuration
BILLING_WEBHOOK_SECRET=your_webhook_secret
MIDTRANS_SERVER_KEY=your_midtrans_key
STRIPE_SECRET_KEY=your_stripe_key

# Cron Jobs
ENABLE_BILLING_CRON=true
BILLING_CRON_SCHEDULE=0 0 * * *
```

### **3. Monitoring**
- [ ] Set up billing metrics monitoring
- [ ] Configure alerts for payment failures
- [ ] Track revenue metrics
- [ ] Monitor usage limits

---

**Sistem subscription & billing ini siap diimplementasikan dengan fitur lengkap untuk mendukung scale Bedagang PoS!** 💳✨
