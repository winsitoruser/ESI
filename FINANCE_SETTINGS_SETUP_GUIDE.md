# 🚀 Finance Settings - Setup Guide

## Quick Start Guide

### Step 1: Run Database Migration

Jalankan SQL migration untuk membuat tabel Finance Settings:

```bash
# Option 1: Using psql command line
psql -U postgres -d bedagang -f prisma/migrations/create_finance_settings_tables.sql

# Option 2: Using pgAdmin atau database client lainnya
# 1. Buka pgAdmin
# 2. Connect ke database 'bedagang'
# 3. Open Query Tool
# 4. Copy paste isi file: prisma/migrations/create_finance_settings_tables.sql
# 5. Execute query
```

### Step 2: Verify Tables Created

Cek apakah semua tabel sudah dibuat:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'payment_methods',
  'bank_accounts', 
  'finance_categories',
  'chart_of_accounts',
  'company_assets',
  'finance_settings'
);

-- Check record counts
SELECT 
  (SELECT COUNT(*) FROM payment_methods) as payment_methods,
  (SELECT COUNT(*) FROM bank_accounts) as bank_accounts,
  (SELECT COUNT(*) FROM finance_categories) as finance_categories,
  (SELECT COUNT(*) FROM chart_of_accounts) as chart_of_accounts,
  (SELECT COUNT(*) FROM company_assets) as company_assets,
  (SELECT COUNT(*) FROM finance_settings) as finance_settings;
```

Expected results:
- payment_methods: 7
- bank_accounts: 3
- finance_categories: 15
- chart_of_accounts: 40+
- company_assets: 4
- finance_settings: 10

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Access Finance Settings

Open browser and navigate to:
```
http://localhost:3001/finance/settings-new
```

### Step 5: Test Features

1. **Overview Tab**
   - Check if statistics cards show correct counts
   - Verify company info displays
   - Check primary bank account

2. **Pembayaran Tab**
   - Should show 7 payment methods
   - Check fees and processing time
   - Verify active/inactive status

3. **Bank Tab**
   - Should show 3 bank accounts
   - Check BCA is marked as primary
   - Verify account numbers

4. **Kategori Tab**
   - Should show 10 expense categories
   - Should show 5 income categories
   - Check icons and colors

5. **Bagan Akun Tab**
   - Should show 40+ accounts
   - Check Indonesian COA structure
   - Verify system accounts

6. **Aset Tab**
   - Should show 4 assets
   - Check values and depreciation
   - Verify icons

### Step 6: Test Refresh

1. Click "Refresh" button in header
2. Data should reload
3. Auto-refresh happens every 30 seconds

---

## Troubleshooting

### Issue: Tables not created
**Solution:** Make sure PostgreSQL is running and database 'bedagang' exists

### Issue: No data showing
**Solution:** 
1. Check browser console for errors
2. Check API endpoints are accessible
3. Verify you're logged in (next-auth session)

### Issue: 401 Unauthorized
**Solution:** Login first at `/auth/signin`

### Issue: Database connection error
**Solution:** Check `lib/db.ts` configuration

---

## Next Development Steps

1. **Create CRUD Modals**
   - Add/Edit payment methods
   - Add/Edit bank accounts
   - Add/Edit categories
   - Add/Edit COA
   - Add/Edit assets

2. **Add Form Validation**
   - Required fields
   - Format validation (email, phone, etc)
   - Unique constraints
   - Custom validation rules

3. **Enhance Features**
   - Search functionality
   - Pagination
   - Sorting
   - Filtering
   - Export to Excel

4. **Testing**
   - Unit tests for API
   - Integration tests
   - E2E tests with Playwright

---

## API Testing with curl

### Get Summary
```bash
curl http://localhost:3001/api/finance/settings/summary \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Get Payment Methods
```bash
curl http://localhost:3001/api/finance/settings/payment-methods
```

### Create Payment Method
```bash
curl -X POST http://localhost:3001/api/finance/settings/payment-methods \
  -H "Content-Type: application/json" \
  -d '{
    "code": "GOPAY",
    "name": "GoPay",
    "fees": 1.0,
    "processing_time": "Instan",
    "icon": "FaMobile"
  }'
```

---

## Database Schema Quick Reference

### payment_methods
- 7 default methods (Cash, Bank Transfer, Credit Card, etc)
- Tracks fees and processing time

### bank_accounts
- 3 default accounts (BCA, Mandiri, BNI)
- Supports primary flag

### finance_categories
- 10 expense categories
- 5 income categories
- Hierarchical support

### chart_of_accounts
- Indonesian standard COA
- 5 main categories (Asset, Liability, Equity, Revenue, Expense)
- System account protection

### company_assets
- 4 default assets
- Depreciation tracking
- Value management

### finance_settings
- 10 company settings
- Tax rates, fiscal year, etc

---

**Ready to use!** 🚀
