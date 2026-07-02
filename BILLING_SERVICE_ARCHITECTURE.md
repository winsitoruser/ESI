# Billing Service Architecture

## Overview

Sistem billing telah direorganisasi dengan arsitektur yang lebih baik menggunakan Service Layer Pattern untuk memisahkan business logic dari API layer.

## 📁 Structure

```
src/services/billing/
├── index.ts                    # Export all services
├── plan.service.ts            # Plan management
├── subscription.service.ts    # Subscription management
├── invoice.service.ts         # Invoice operations
├── usage.service.ts           # Usage tracking & analytics
├── provider.service.ts        # Payment provider integration
├── billing.service.ts         # Billing cycles & automation
└── providers/
    ├── midtrans.service.ts    # Midtrans integration
    └── stripe.service.ts      # Stripe integration

pages/api/billing/
├── v2/                        # New API endpoints with service layer
│   ├── plans/
│   │   └── index.ts
│   ├── subscription.ts
│   ├── invoices/
│   │   └── index.ts
│   ├── payment-methods/
│   │   └── index.ts
│   └── webhooks/
│       ├── midtrans.ts
│       └── stripe.ts
└── [original files]           # Legacy endpoints (still functional)
```

## 🎯 Service Layer Responsibilities

### 1. Plan Service (`plan.service.ts`)
- **Get Plans**: Fetch available plans with filters
- **Create Plan**: Admin operations for plan management
- **Update Plan**: Modify plan details
- **Delete Plan**: Remove plans (with validation)
- **Plan Comparison**: Compare multiple plans

### 2. Subscription Service (`subscription.service.ts`)
- **Current Subscription**: Get tenant's active subscription
- **Create Subscription**: Start new subscription
- **Change Subscription**: Upgrade/downgrade plans
- **Cancel Subscription**: Cancel with options
- **Reactivate**: Restore cancelled subscription
- **Process Renewal**: Handle automatic renewals
- **Expiring Soon**: Get subscriptions near expiry
- **Analytics**: Subscription metrics

### 3. Invoice Service (`invoice.service.ts`)
- **Get Invoices**: List with filters and pagination
- **Generate Invoice**: Create from billing cycles
- **Update Status**: Change invoice states
- **Send Invoice**: Email/SMS notifications
- **Overdue Management**: Track overdue invoices
- **Void/Refund**: Handle invoice adjustments
- **Export**: CSV/PDF/Excel exports
- **Analytics**: Invoice metrics

### 4. Usage Service (`usage.service.ts`)
- **Track Usage**: Record metric values
- **Current Usage**: Get usage for period
- **Analytics**: Trends and predictions
- **Check Limits**: Enforce plan limits
- **Handle Overage**: Calculate charges
- **Aggregation**: Daily/periodic aggregation
- **Recommendations**: Usage insights

### 5. Provider Service (`provider.service.ts`)
- **Process Payment**: Route to correct provider
- **Get Status**: Check payment status
- **Handle Webhooks**: Process notifications
- **Save Methods**: Store payment methods
- **Refund**: Process refunds
- **Provider Abstraction**: Unified interface

### 6. Billing Service (`billing.service.ts`)
- **Billing Cycles**: Create and manage cycles
- **Process Billing**: Automated billing runs
- **Dunning**: Overdue payment handling
- **MRR Calculation**: Monthly recurring revenue
- **Churn Rate**: Customer churn metrics
- **ARPU**: Average revenue per user

## 🔄 Data Flow

```
Frontend → API Endpoint → Service Layer → Database/External APIs
    ↓
Response ← Service Layer ← Database/External APIs
```

### Example Flow: Create Subscription
1. **Frontend**: POST /api/billing/v2/subscription
2. **API**: Validates session, calls SubscriptionService.createSubscription()
3. **Service**: 
   - Checks existing subscription
   - Validates plan
   - Creates subscription record
   - Sets trial period
4. **Database**: Saves subscription
5. **Response**: Returns subscription details

## 🚀 API Endpoints (v2)

### Plans
- `GET /api/billing/v2/plans` - List plans
- `POST /api/billing/v2/plans` - Create plan (admin)

### Subscription
- `GET /api/billing/v2/subscription` - Get current
- `POST /api/billing/v2/subscription` - Create new
- `PUT /api/billing/v2/subscription` - Change plan
- `DELETE /api/billing/v2/subscription` - Cancel

### Invoices
- `GET /api/billing/v2/invoices` - List invoices
- `GET /api/billing/v2/invoices/[id]` - Get details
- `POST /api/billing/v2/invoices/[id]/pay` - Process payment
- `GET /api/billing/v2/invoices/[id]/download` - Download PDF

### Payment Methods
- `GET /api/billing/v2/payment-methods` - List methods
- `POST /api/billing/v2/payment-methods` - Add method
- `PUT /api/billing/v2/payment-methods/[id]` - Update
- `DELETE /api/billing/v2/payment-methods/[id]` - Remove

### Webhooks
- `POST /api/billing/v2/webhooks/midtrans` - Midtrans notifications
- `POST /api/billing/v2/webhooks/stripe` - Stripe notifications

## 🔧 Key Features

### 1. **Separation of Concerns**
- Business logic in services
- API layer handles HTTP concerns
- Database layer handles persistence

### 2. **Provider Abstraction**
- Easy to add new payment providers
- Unified interface for all providers
- Provider-specific implementations isolated

### 3. **Error Handling**
- Centralized error handling in services
- Consistent error responses
- Detailed logging

### 4. **Validation**
- Input validation in services
- Business rule enforcement
- Data integrity checks

### 5. **Analytics & Reporting**
- Built-in analytics methods
- Revenue metrics calculation
- Usage insights

## 📊 Usage Examples

### Using Service in API
```typescript
import { SubscriptionService } from '@/src/services/billing';

// Get current subscription
const subscription = await SubscriptionService.getCurrentSubscription(tenantId);

// Change subscription plan
const result = await SubscriptionService.changeSubscription(
  tenantId, 
  newPlanId, 
  { immediate: false }
);
```

### Using Service in Cron Job
```typescript
import { BillingService } from '@/src/services/billing';

// Process all billing cycles
const result = await BillingService.processBillingCycle();

// Process dunning
const dunningResult = await BillingService.processDunning();
```

## 🔄 Migration from v1

### Benefits of v2:
1. **Cleaner Code**: Business logic separated
2. **Better Testing**: Services can be unit tested
3. **Reusability**: Services can be used anywhere
4. **Maintainability**: Easier to modify and extend
5. **Type Safety**: Full TypeScript support

### Migration Steps:
1. Update API imports to use v2 endpoints
2. Frontend changes minimal (same response format)
3. Gradually migrate each endpoint
4. Keep v1 for backward compatibility

## 🧪 Testing

Service layer enables better testing:
- Unit tests for each service
- Mock external dependencies
- Test business rules in isolation
- Integration tests for workflows

## 📈 Performance

- Reduced database queries through optimization
- Caching can be added at service layer
- Batch operations for bulk processing
- Lazy loading for complex relationships

## 🔒 Security

- All services validate tenant access
- Input sanitization in services
- Rate limiting can be implemented
- Audit logging through services

## 🚀 Future Enhancements

1. **Event System**: Emit events for subscription changes
2. **Caching Layer**: Redis for frequently accessed data
3. **Queue System**: Background job processing
4. **Multi-currency**: Support for multiple currencies
5. **Tax Engine**: Complex tax calculations
6. **Discount Engine**: Promo codes and campaigns
