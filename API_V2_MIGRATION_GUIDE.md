# API v2 Migration Guide

## Overview

API v2 menggunakan service layer architecture yang lebih baik, memisahkan business logic dari API layer. Ini membuat kode lebih maintainable, testable, dan reusable.

## 🔄 Migration Path

### Current API (v1)
```
/api/billing/subscription
/api/billing/plans
/api/billing/invoices
/api/billing/payment-methods
/api/billing/webhooks/midtrans
```

### New API (v2)
```
/api/billing/v2/subscription
/api/billing/v2/plans
/api/billing/v2/invoices
/api/billing/v2/payment-methods
/api/billing/v2/webhooks/midtrans
/api/billing/v2/analytics
```

## 📋 API Endpoints v2

### 1. Plans
- `GET /api/billing/v2/plans` - List available plans
  - Query params: `interval`, `includeInactive`
- `POST /api/billing/v2/plans` - Create plan (admin only)

### 2. Subscription
- `GET /api/billing/v2/subscription` - Get current subscription
- `POST /api/billing/v2/subscription` - Create new subscription
  - Body: `{ planId }`
- `PUT /api/billing/v2/subscription` - Change subscription
  - Body: `{ planId, immediate?, reason? }`
- `DELETE /api/billing/v2/subscription` - Cancel subscription
  - Body: `{ atPeriodEnd?, reason?, immediate? }`

### 3. Invoices
- `GET /api/billing/v2/invoices` - List invoices
  - Query params: `status`, `limit`, `offset`, `dateFrom`, `dateTo`
- `POST /api/billing/v2/invoices/[id]/pay` - Process payment
  - Body: `{ provider, paymentDetails }`

### 4. Payment Methods
- `GET /api/billing/v2/payment-methods` - List saved methods
- `POST /api/billing/v2/payment-methods` - Add new method
  - Body: `{ provider, type, name, description?, isDefault?, details?, metadata? }`

### 5. Webhooks
- `POST /api/billing/v2/webhooks/midtrans` - Midtrans notifications
- `POST /api/billing/v2/webhooks/stripe` - Stripe notifications

### 6. Analytics (NEW!)
- `GET /api/billing/v2/analytics` - Get analytics data
  - Query params: `period`, `type`
  - Types: `overview`, `subscription`, `billing`, `invoices`, `mrr`, `churn`, `arpu`

## 🔄 Response Format

Response format tetap sama untuk backward compatibility:

```typescript
{
  success: boolean,
  data?: any,
  error?: string,
  message?: string
}
```

## 🚀 Migration Steps

### 1. Update Frontend API Calls

Ganti endpoint dari v1 ke v2:

```typescript
// Before
fetch('/api/billing/subscription')

// After
fetch('/api/billing/v2/subscription')
```

### 2. Update Analytics (New Feature)

Tambahkan analytics dashboard:

```typescript
// Get overview analytics
fetch('/api/billing/v2/analytics?period=current_month')

// Get specific metrics
fetch('/api/billing/v2/analytics?type=mrr')
fetch('/api/billing/v2/analytics?type=churn&period=last_month')
```

### 3. Payment Processing Update

Payment processing sekarang menggunakan provider service:

```typescript
// Process payment
fetch('/api/billing/v2/invoices/[id]/pay', {
  method: 'POST',
  body: JSON.stringify({
    provider: 'midtrans',
    paymentDetails: {
      type: 'credit_card',
      tokenId: 'token_123'
    }
  })
})
```

## 🎯 Benefits of v2

### 1. **Better Architecture**
- Business logic terpisah dari API layer
- Services dapat digunakan di mana saja (cron jobs, CLI, etc)
- Lebih mudah untuk unit testing

### 2. **Type Safety**
- Full TypeScript support
- Type definitions untuk semua models
- Compile-time error checking

### 3. **New Features**
- Analytics endpoint dengan berbagai metrics
- Lebih banyak payment provider options
- Better error handling

### 4. **Performance**
- Optimized database queries
- Better caching opportunities
- Reduced code duplication

## 📊 Example: Using Services Directly

Services dapat digunakan langsung di luar API:

```typescript
// In cron job
import { BillingService } from '@/src/services/billing';

// Process all billing cycles
const result = await BillingService.processBillingCycle();

// In CLI script
import { SubscriptionService } from '@/src/services/billing';

// Get expiring subscriptions
const expiring = await SubscriptionService.getExpiringSubscriptions(7);
```

## 🧪 Testing

Service layer memungkinkan better testing:

```typescript
// Unit test for service
import { PlanService } from '@/src/services/billing';

describe('PlanService', () => {
  it('should get plans', async () => {
    const plans = await PlanService.getPlans();
    expect(plans).toBeDefined();
  });
});
```

## 🔧 Configuration

Environment variables yang dibutuhkan:

```bash
# Midtrans
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📈 Monitoring & Logging

v2 memiliki better logging:

```typescript
// Service logs
console.log('Processing subscription for tenant:', tenantId);
console.error('Payment failed:', error);

// Structured logging (future)
logger.info('subscription.created', { tenantId, planId });
```

## 🚦 Rollback Plan

Jika ada masalah dengan v2:

1. Update frontend untuk menggunakan v1 lagi
2. v1 API masih available dan functional
3. Gradual migration per endpoint

## 📝 Checklist Migration

- [ ] Update frontend API calls to v2
- [ ] Test all endpoints
- [ ] Update webhook URLs di Midtrans/Stripe dashboards
- [ ] Add analytics dashboard
- [ ] Monitor error rates
- [ ] Update documentation

## 🆘 Troubleshooting

### Common Issues

1. **Import errors**: Pastikan path import benar
2. **Type errors**: Gunakan type definitions di `/src/types/models`
3. **Database errors**: Pastikan migration sudah dijalankan
4. **Payment errors**: Check environment variables

### Debug Mode

Enable debug logging:

```typescript
// In development
if (process.env.NODE_ENV === 'development') {
  console.log('Debug:', data);
}
```

## 🎉 Next Steps

1. **Complete Migration**: Pindah semua frontend ke v2
2. **Add Features**: Implement promo codes, advanced analytics
3. **Performance**: Add caching layer
4. **Monitoring**: Add metrics and alerts
5. **Documentation**: Update API docs
