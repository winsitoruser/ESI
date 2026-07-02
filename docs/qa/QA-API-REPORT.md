# QA API Test Report
**Date:** 2026-07-02 13:55:46
**Environment:** Development (localhost:3001)
**Auth:** superadmin@bedagang.com (super_admin)
**Endpoints Tested:** 518 (60 modules)

## Summary
| Metric | Count |
|--------|-------|
| Total Endpoints | 518 |
| ✅ Pass (2xx) | 38 |
| ⚠️ Warn (4xx / success=false) | 370 |
| ❌ Fail (5xx) | 110 |
| 💥 Error (timeout/other) | 0 |
| **Pass Rate** | **7.3%** |

## Per-Module Summary
| Module | Total | ✅ Pass | ⚠️ Warn | ❌ Fail | 💥 Error | Pass Rate |
|--------|-------|---------|---------|---------|----------|-----------|
| Admin | 21 | 10 | 1 | 10 | 0 | 47.6% |
| Auth | 2 | 0 | 2 | 0 | 0 | 0.0% |
| Billing | 11 | 1 | 2 | 8 | 0 | 9.1% |
| Branches | 1 | 1 | 0 | 0 | 0 | 100.0% |
| Business | 2 | 2 | 0 | 0 | 0 | 100.0% |
| Cart | 1 | 0 | 1 | 0 | 0 | 0.0% |
| Customers | 12 | 1 | 4 | 7 | 0 | 8.3% |
| DMS | 28 | 0 | 2 | 26 | 0 | 0.0% |
| Dashboard | 3 | 2 | 1 | 0 | 0 | 66.7% |
| Driver | 2 | 0 | 2 | 0 | 0 | 0.0% |
| Employee | 2 | 0 | 2 | 0 | 0 | 0.0% |
| Employees | 6 | 1 | 0 | 5 | 0 | 16.7% |
| Finance | 41 | 0 | 16 | 25 | 0 | 0.0% |
| Fleet | 11 | 0 | 11 | 0 | 0 | 0.0% |
| HQ.Analytics | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Assets | 4 | 0 | 4 | 0 | 0 | 0.0% |
| HQ.Audit | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Billing | 4 | 0 | 4 | 0 | 0 | 0.0% |
| HQ.Branches | 10 | 0 | 10 | 0 | 0 | 0.0% |
| HQ.Bumdes | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Categories | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.Command | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Dashboard | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.Docs | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.EProc | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Export | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.Finance | 16 | 0 | 16 | 0 | 0 | 0.0% |
| HQ.Reports | 6 | 0 | 6 | 0 | 0 | 0.0% |
| HQ.Requisitions | 3 | 0 | 3 | 0 | 0 | 0.0% |
| HQ.Roles | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.SFA | 13 | 0 | 13 | 0 | 0 | 0.0% |
| HQ.Settings | 3 | 0 | 3 | 0 | 0 | 0.0% |
| HQ.Subscription | 5 | 0 | 5 | 0 | 0 | 0.0% |
| HQ.Suppliers | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Sync | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.TMS | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.Tenants | 1 | 0 | 1 | 0 | 0 | 0.0% |
| HQ.Users | 3 | 0 | 3 | 0 | 0 | 0.0% |
| HQ.Warehouse | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.Webhooks | 2 | 0 | 2 | 0 | 0 | 0.0% |
| HQ.WhatsApp | 1 | 0 | 1 | 0 | 0 | 0.0% |
| Health | 1 | 0 | 0 | 1 | 0 | 0.0% |
| Integration | 5 | 0 | 5 | 0 | 0 | 0.0% |
| Inventory | 66 | 16 | 25 | 25 | 0 | 24.2% |
| Loyalty | 11 | 0 | 11 | 0 | 0 | 0.0% |
| Modules | 4 | 0 | 4 | 0 | 0 | 0.0% |
| Notifications | 1 | 0 | 1 | 0 | 0 | 0.0% |
| Orders | 4 | 1 | 3 | 0 | 0 | 25.0% |
| Other | 99 | 1 | 98 | 0 | 0 | 1.0% |
| POS | 37 | 2 | 32 | 3 | 0 | 5.4% |
| Production | 2 | 0 | 2 | 0 | 0 | 0.0% |
| Products | 5 | 0 | 5 | 0 | 0 | 0.0% |
| Purchase | 1 | 0 | 1 | 0 | 0 | 0.0% |
| Recipes | 1 | 0 | 1 | 0 | 0 | 0.0% |
| Reports | 10 | 0 | 10 | 0 | 0 | 0.0% |
| Reservations | 4 | 0 | 4 | 0 | 0 | 0.0% |
| Settings | 27 | 0 | 27 | 0 | 0 | 0.0% |
| Tables | 3 | 0 | 3 | 0 | 0 | 0.0% |
| Warehouses | 1 | 0 | 1 | 0 | 0 | 0.0% |
| Waste | 1 | 0 | 1 | 0 | 0 | 0.0% |

## ❌ Failed Endpoints (5xx Errors)
| Module | URL | Status | Error | Preview |
|--------|-----|--------|-------|---------|
| Admin | `http://localhost:3001/api/admin/audit/global` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Admin | `http://localhost:3001/api/admin/analytics/overview` | 500 |  | {"success":false,"error":"column \"enabledcount\" does not exist"} |
| Admin | `http://localhost:3001/api/admin/products/distribute` | 500 |  | {"success":false,"error":"Internal server error","message":"relation \"audit_log |
| Admin | `http://localhost:3001/api/admin/reports/aggregator` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Admin | `http://localhost:3001/api/admin/tenants` | 500 |  | {"success":false,"error":"Partner is not associated to Tenant!"} |
| Admin | `http://localhost:3001/api/admin/transactions` | 500 |  | {"success":false,"error":"Failed to fetch transactions","details":"PartnerOutlet |
| Admin | `http://localhost:3001/api/admin/transactions/summary` | 500 |  | {"success":false,"error":"Failed to fetch transaction summary","details":"Partne |
| Admin | `http://localhost:3001/api/admin/settings/global` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Admin | `http://localhost:3001/api/admin/subscriptions` | 500 |  | {"success":false,"error":"Internal server error","details":"column package.price |
| Admin | `http://localhost:3001/api/admin/webhooks` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Billing | `http://localhost:3001/api/billing/invoices` | 500 |  | {"success":false,"error":"Internal server error","message":"WHERE parameter \"te |
| Billing | `http://localhost:3001/api/billing/payment-methods` | 500 |  | {"success":false,"error":"Internal server error","message":"Cannot read properti |
| Billing | `http://localhost:3001/api/billing/v2/invoices` | 501 |  | {"success":false,"error":"Service layer not implemented — InvoiceService.getInvo |
| Billing | `http://localhost:3001/api/billing/subscription` | 500 |  | {"success":false,"error":"Internal server error","message":"WHERE parameter \"te |
| Billing | `http://localhost:3001/api/billing/v2/analytics` | 501 |  | {"success":false,"error":"Not implemented — billing service layer not yet availa |
| Billing | `http://localhost:3001/api/billing/v2/subscription` | 501 |  | {"success":false,"error":"Not implemented — SubscriptionService.getCurrentSubscr |
| Billing | `http://localhost:3001/api/billing/v2/plans` | 501 |  | {"success":false,"error":"Service layer not implemented — PlanService.getPlans n |
| Billing | `http://localhost:3001/api/billing/v2/payment-methods` | 501 |  | {"success":false,"error":"Not implemented — ProviderService.getSavedPaymentMetho |
| Customers | `http://localhost:3001/api/customers/crud` | 500 |  | {"error":"Customer.findAndCountAll is not a function","details":"TypeError: Cust |
| Customers | `http://localhost:3001/api/customers/stats` | 500 |  | {"error":"Customer.count is not a function","details":"TypeError: Customer.count |
| Customers | `http://localhost:3001/api/customers/sync-tier` | 500 |  | {"error":"Customer.findAll is not a function","details":"TypeError: Customer.fin |
| Customers | `http://localhost:3001/api/customers/purchase-history` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Customers | `http://localhost:3001/api/customers` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Customers | `http://localhost:3001/api/customers/loyalty-programs` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Customers | `http://localhost:3001/api/customers/statistics` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Employees | `http://localhost:3001/api/employees/attendance/mobile` | 500 |  | {"success":false,"error":"Internal server error","message":"WHERE parameter \"te |
| Employees | `http://localhost:3001/api/employees/attendance/gps` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Employees | `http://localhost:3001/api/employees/schedules` | 500 |  | {"success":false,"error":"Internal server error","details":"include.model.getTab |
| Employees | `http://localhost:3001/api/employees/roaming` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Employees | `http://localhost:3001/api/employees/roster/multi-branch` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Finance | `http://localhost:3001/api/finance/balance-sheet-simple` | 500 |  | {"success":false,"error":"Cannot read properties of undefined (reading 'query')" |
| Finance | `http://localhost:3001/api/finance/dashboard-complete` | 500 |  | {"success":false,"error":"Cannot read properties of undefined (reading 'query')" |
| Finance | `http://localhost:3001/api/finance/daily-income` | 500 |  | {"error":"column \"transactionNumber\" does not exist"} |
| Finance | `http://localhost:3001/api/finance/accounts` | 500 |  | {"success":false,"error":"Internal server error","details":"column \"tenant_id\" |
| Finance | `http://localhost:3001/api/finance/expenses` | 500 |  | {"error":"column \"tenant_id\" does not exist"} |
| Finance | `http://localhost:3001/api/finance/budgets` | 500 |  | {"success":false,"error":"Internal server error","details":"column FinanceBudget |
| Finance | `http://localhost:3001/api/finance` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/dashboard-stats` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/expenses-simple` | 500 |  | {"success":false,"error":"Cannot read properties of undefined (reading 'query')" |
| Finance | `http://localhost:3001/api/finance/incomes-simple` | 500 |  | {"success":false,"error":"Cannot read properties of undefined (reading 'query')" |
| Finance | `http://localhost:3001/api/finance/inter-branch-invoices` | 500 |  | {"success":false,"error":"Internal server error","message":"Named replacement \" |
| Finance | `http://localhost:3001/api/finance/export` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/invoices` | 500 |  | {"success":false,"error":"Internal server error","details":"column FinanceInvoic |
| Finance | `http://localhost:3001/api/finance/monthly-income` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/profit-loss-simple` | 500 |  | {"success":false,"error":"Cannot read properties of undefined (reading 'query')" |
| Finance | `http://localhost:3001/api/finance/settings/bank-accounts` | 500 |  | {"success":false,"error":"database \"bedagang\" does not exist"} |
| Finance | `http://localhost:3001/api/finance/settings/chart-of-accounts` | 500 |  | {"success":false,"error":"database \"bedagang\" does not exist"} |
| Finance | `http://localhost:3001/api/finance/settings/assets` | 500 |  | {"success":false,"error":"database \"bedagang\" does not exist"} |
| Finance | `http://localhost:3001/api/finance/settings/categories` | 500 |  | {"success":false,"error":"database \"bedagang\" does not exist"} |
| Finance | `http://localhost:3001/api/finance/payables/payment` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/payables` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/receivables/payment` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/receivables` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Finance | `http://localhost:3001/api/finance/transactions-simple` | 500 |  | {"success":false,"error":"Cannot read properties of undefined (reading 'query')" |
| Finance | `http://localhost:3001/api/finance/summary` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Health | `http://localhost:3001/api/health` | 503 |  | {"status":"degraded","timestamp":"2026-07-02T06:53:17.229Z","services":{"api":"o |
| DMS | `http://localhost:3001/api/hq/dms/blockchain-mine` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/audit` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/analytics` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/destroy` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/detonate` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/disposal` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/files` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/knowledge-graph` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/lib/models` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/lib/use-mock` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/letter` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/mata-elang` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/move-tier` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/lib/helpers` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/hierarchy` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/folders` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/open-data` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/policies` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/storage` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/scan` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/shares` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/ppid` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/signature` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/overview` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/records` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| DMS | `http://localhost:3001/api/hq/dms/upload` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/categories/batch` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/analytics/stock-graph` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/analytics/dashboard` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/categories/stats` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/batch/operations` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/category-by-id` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/documents` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/dosage-forms` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/documents/upload` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/expiry` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/expiry-fixed` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/low-stock` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/expiry/index.new` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/price-groups` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/movements` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/returns` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/receipts/upload-document` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/returns/upload-document` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/receipts/statistics` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/receipts` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/shelf-position-by-id` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/stock/search` | 500 |  | {"success":false,"message":"Failed to search stock items"} |
| Inventory | `http://localhost:3001/api/inventory/transactions/prescription-processing` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| Inventory | `http://localhost:3001/api/inventory/warehouses` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| POS | `http://localhost:3001/api/pos/shifts/start` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| POS | `http://localhost:3001/api/pos/shifts/status` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |
| POS | `http://localhost:3001/api/pos/transactions/prescription-invoice` | 500 |  | <!DOCTYPE html><html><head><style data-next-hide-fouc="true">body{display:none}< |

## ⚠️ Warning Endpoints (4xx / success=false)
| Module | URL | Status | Error |
|--------|-----|--------|-------|
| Admin | `http://localhost:3001/api/admin/ai-models` | 400 |  |
| Auth | `http://localhost:3001/api/auth/register` | 405 |  |
| Auth | `http://localhost:3001/api/auth/switch-branch` | 405 |  |
| Billing | `http://localhost:3001/api/billing/webhooks/midtrans` | 405 |  |
| Billing | `http://localhost:3001/api/billing/v2/webhooks/midtrans` | 405 |  |
| Customers | `http://localhost:3001/api/customers/create` | 405 |  |
| Customers | `http://localhost:3001/api/customers/bridge` | 400 |  |
| Customers | `http://localhost:3001/api/customers/auto-upgrade-tiers` | 405 |  |
| Cart | `http://localhost:3001/api/cart/apply-promo` | 405 |  |
| Customers | `http://localhost:3001/api/customers/reports` | 400 |  |
| Dashboard | `http://localhost:3001/api/dashboard/compare` | 400 |  |
| Driver | `http://localhost:3001/api/driver/upload` | 405 |  |
| Employee | `http://localhost:3001/api/employee/field-visit` | 400 |  |
| Employee | `http://localhost:3001/api/employee/dashboard` | 400 |  |
| Driver | `http://localhost:3001/api/driver/dashboard` | 400 |  |
| Finance | `http://localhost:3001/api/finance/daily-income-sequelize` | 400 |  |
| Finance | `http://localhost:3001/api/finance/daily-income-bridge` | 400 |  |
| Finance | `http://localhost:3001/api/finance/integrations/inventory-webhook` | 405 |  |
| Finance | `http://localhost:3001/api/finance/integrations/invoice-webhook` | 405 |  |
| Finance | `http://localhost:3001/api/finance/integrations/pos-webhook` | 405 |  |
| Finance | `http://localhost:3001/api/finance/monthly-income-bridge` | 400 |  |
| Finance | `http://localhost:3001/api/finance/profit-loss` | 403 |  |
| Finance | `http://localhost:3001/api/finance/monthly-income-sequelize` | 400 |  |
| Finance | `http://localhost:3001/api/finance/profit-loss-sequelize` | 400 |  |
| Finance | `http://localhost:3001/api/finance/profit-loss-bridge` | 400 |  |
| Finance | `http://localhost:3001/api/finance/reconciliation` | 405 |  |
| Finance | `http://localhost:3001/api/finance/reports` | 400 |  |
| Fleet | `http://localhost:3001/api/fleet/export` | 405 |  |
| Fleet | `http://localhost:3001/api/fleet/costs` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/drivers` | 401 |  |
| Finance | `http://localhost:3001/api/finance/settlements` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/drivers/available` | 401 |  |
| Finance | `http://localhost:3001/api/finance/settings/summary` | 401 |  |
| Finance | `http://localhost:3001/api/finance/settings/payment-methods` | 401 |  |
| Finance | `http://localhost:3001/api/finance/transactions-crud` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/routes` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/routes/assignments` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/vehicles/available` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/fuel` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/vehicles` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/maintenance/schedules` | 401 |  |
| HQ.Analytics | `http://localhost:3001/api/hq/analytics` | 401 |  |
| HQ.Assets | `http://localhost:3001/api/hq/assets` | 401 |  |
| Fleet | `http://localhost:3001/api/fleet/tracking/live` | 401 |  |
| HQ.Billing | `http://localhost:3001/api/hq/billing/invoices` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches` | 401 |  |
| HQ.Billing | `http://localhost:3001/api/hq/billing/payment-methods` | 401 |  |
| HQ.Audit | `http://localhost:3001/api/hq/audit-logs` | 401 |  |
| HQ.Billing | `http://localhost:3001/api/hq/billing/overdue-sweep` | 400 |  |
| HQ.Assets | `http://localhost:3001/api/hq/assets/extensions` | 401 |  |
| HQ.Billing | `http://localhost:3001/api/hq/billing-info` | 401 |  |
| HQ.Assets | `http://localhost:3001/api/hq/assets/depreciation` | 401 |  |
| Other | `http://localhost:3001/api/hq/branch-settings` | 401 |  |
| HQ.Assets | `http://localhost:3001/api/hq/assets/integration` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/integrated` | 400 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/finance` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/inventory` | 401 |  |
| HQ.Bumdes | `http://localhost:3001/api/hq/bumdes` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/users` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/settings` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/enhanced` | 400 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/analytics` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches/performance` | 401 |  |
| HQ.Categories | `http://localhost:3001/api/hq/categories` | 401 |  |
| HQ.Command | `http://localhost:3001/api/hq/command/center` | 401 |  |
| DMS | `http://localhost:3001/api/hq/dms` | 401 |  |
| HQ.Dashboard | `http://localhost:3001/api/hq/dashboard/widget-layout` | 401 |  |
| HQ.Dashboard | `http://localhost:3001/api/hq/dashboard` | 401 |  |
| HQ.Docs | `http://localhost:3001/api/hq/documents` | 401 |  |
| HQ.Export | `http://localhost:3001/api/hq/export` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/cash-flow` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/ai-guardian` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/accounts` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/ai-autonomous` | 401 |  |
| HQ.EProc | `http://localhost:3001/api/hq/e-procurement` | 401 |  |
| DMS | `http://localhost:3001/api/hq/dms/upload-file` | 401 |  |
| HQ.Export | `http://localhost:3001/api/hq/export-import` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/budget` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/enhanced` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/journal` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/tax` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/summary` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/realtime` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/revenue` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/profit-loss` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/expenses` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/invoices` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/export` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/driver-route` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/integrations/finance` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/costs` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/command-center` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/expenses` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/fuel` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/drivers` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/integrations/driver-app` | 401 |  |
| HQ.Finance | `http://localhost:3001/api/hq/finance/transactions` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/integrations/hris` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/leaderboard` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/routes` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/live` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/maintenance` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/integrations/manufacturing` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/vehicles` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/tracking` | 401 |  |
| Other | `http://localhost:3001/api/hq/fms/analytics` | 401 |  |
| Other | `http://localhost:3001/api/hq/fleet/integrations/inventory` | 401 |  |
| Other | `http://localhost:3001/api/hq/fms` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/attendance` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/employees` | 401 |  |
| Other | `http://localhost:3001/api/hq/helpdesk` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/employee-profile` | 401 |  |
| Other | `http://localhost:3001/api/hq/fms/enhanced` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/export` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/attendance/device-sync` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/engagement` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/attendance/settings` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/attendance/devices` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/attendance-management` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/industrial-relations` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/leave` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/kpi` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/kpi-settings` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/kpi-templates` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/overtime` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/lifecycle` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/leave-management` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/organization` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/kpi-scoring` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/project-documents` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/project-management` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/training-development` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/performance` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/payroll-bulk` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/realtime` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/recruitment` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/reminders` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/payroll` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/training` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/upload-claim` | 405 |  |
| Other | `http://localhost:3001/api/hq/hris/workflow` | 401 |  |
| Other | `http://localhost:3001/api/hq/integrations/fms-tms` | 401 |  |
| Other | `http://localhost:3001/api/hq/integrations/providers` | 401 |  |
| Other | `http://localhost:3001/api/hq/integrations/crm-sfa` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/training-scoring` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/travel-expense` | 401 |  |
| Other | `http://localhost:3001/api/hq/integrations/configs` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/webhooks` | 401 |  |
| Other | `http://localhost:3001/api/hq/hris/workforce-analytics` | 401 |  |
| Other | `http://localhost:3001/api/hq/integrations/requests` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/pricing` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/stock` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/receipts` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/enhanced` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/stocktake` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/categories` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/products` | 401 |  |
| Other | `http://localhost:3001/api/hq/integrations/sfa-marketing` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/alerts` | 401 |  |
| Other | `http://localhost:3001/api/hq/managers` | 401 |  |
| Other | `http://localhost:3001/api/hq/manufacturing/integration` | 401 |  |
| Other | `http://localhost:3001/api/hq/manufacturing` | 401 |  |
| Other | `http://localhost:3001/api/hq/manufacturing/enhanced` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/transfers` | 401 |  |
| Other | `http://localhost:3001/api/hq/inventory/summary` | 401 |  |
| Other | `http://localhost:3001/api/hq/marketing` | 401 |  |
| Other | `http://localhost:3001/api/hq/marketplace` | 401 |  |
| Other | `http://localhost:3001/api/hq/manufacturing/advanced` | 401 |  |
| Other | `http://localhost:3001/api/hq/monitoring/realtime` | 401 |  |
| Other | `http://localhost:3001/api/hq/me/permissions` | 401 |  |
| Other | `http://localhost:3001/api/hq/modules` | 401 |  |
| Other | `http://localhost:3001/api/hq/modules/templates` | 401 |  |
| Other | `http://localhost:3001/api/hq/marketplace/webhook` | 405 |  |
| Other | `http://localhost:3001/api/hq/marketplace/logistics` | 401 |  |
| Other | `http://localhost:3001/api/hq/modules/catalog` | 401 |  |
| Other | `http://localhost:3001/api/hq/modules/history` | 401 |  |
| Other | `http://localhost:3001/api/hq/modules/deployment` | 401 |  |
| Other | `http://localhost:3001/api/hq/permissions/explorer` | 401 |  |
| HQ.Reports | `http://localhost:3001/api/hq/reports/enhanced` | 401 |  |
| Other | `http://localhost:3001/api/hq/products/categories` | 401 |  |
| Other | `http://localhost:3001/api/hq/realtime` | 401 |  |
| Other | `http://localhost:3001/api/hq/products` | 401 |  |
| HQ.Reports | `http://localhost:3001/api/hq/reports/comprehensive` | 401 |  |
| Other | `http://localhost:3001/api/hq/project-management` | 401 |  |
| Other | `http://localhost:3001/api/hq/products/pricing` | 401 |  |
| Other | `http://localhost:3001/api/hq/procurement/enhanced` | 401 |  |
| Other | `http://localhost:3001/api/hq/purchase-orders` | 401 |  |
| HQ.Reports | `http://localhost:3001/api/hq/reports/consolidated` | 401 |  |
| HQ.Requisitions | `http://localhost:3001/api/hq/requisitions/export` | 405 |  |
| HQ.Requisitions | `http://localhost:3001/api/hq/requisitions` | 401 |  |
| HQ.Settings | `http://localhost:3001/api/hq/settings/notifications` | 401 |  |
| HQ.Requisitions | `http://localhost:3001/api/hq/requisitions/available-branches` | 401 |  |
| HQ.Roles | `http://localhost:3001/api/hq/roles/audit` | 401 |  |
| HQ.Settings | `http://localhost:3001/api/hq/settings` | 401 |  |
| HQ.Reports | `http://localhost:3001/api/hq/reports/finance` | 401 |  |
| HQ.Roles | `http://localhost:3001/api/hq/roles` | 401 |  |
| HQ.Reports | `http://localhost:3001/api/hq/reports/sales` | 401 |  |
| HQ.Reports | `http://localhost:3001/api/hq/reports/inventory` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/hris-sync` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/data-export` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/audit-trail` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/crm` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/import-export` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/enhanced` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/advanced` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/ai-workflow` | 401 |  |
| HQ.Settings | `http://localhost:3001/api/hq/settings/taxes` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/notifications` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/sales-management` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/lookup` | 401 |  |
| HQ.SFA | `http://localhost:3001/api/hq/sfa/task-calendar` | 401 |  |
| HQ.Subscription | `http://localhost:3001/api/hq/subscription/resume` | 401 |  |
| HQ.Subscription | `http://localhost:3001/api/hq/subscription/current` | 401 |  |
| HQ.Suppliers | `http://localhost:3001/api/hq/suppliers` | 401 |  |
| HQ.Subscription | `http://localhost:3001/api/hq/subscription/cancel` | 401 |  |
| HQ.Subscription | `http://localhost:3001/api/hq/subscription/checkout` | 401 |  |
| HQ.Subscription | `http://localhost:3001/api/hq/subscription/plans` | 401 |  |
| HQ.Users | `http://localhost:3001/api/hq/users/by-role` | 401 |  |
| HQ.Tenants | `http://localhost:3001/api/hq/tenants` | 401 |  |
| HQ.Warehouse | `http://localhost:3001/api/hq/warehouse/smart` | 401 |  |
| HQ.TMS | `http://localhost:3001/api/hq/tms` | 401 |  |
| HQ.Sync | `http://localhost:3001/api/hq/sync/trigger` | 401 |  |
| HQ.Users | `http://localhost:3001/api/hq/users` | 401 |  |
| HQ.Users | `http://localhost:3001/api/hq/users/manage` | 401 |  |
| HQ.Sync | `http://localhost:3001/api/hq/sync` | 401 |  |
| HQ.TMS | `http://localhost:3001/api/hq/tms/enhanced` | 401 |  |
| HQ.Warehouse | `http://localhost:3001/api/hq/warehouse` | 401 |  |
| Integration | `http://localhost:3001/api/integration/pos-to-kitchen` | 405 |  |
| Integration | `http://localhost:3001/api/integration/unified-order-flow` | 405 |  |
| Inventory | `http://localhost:3001/api/inventory/adjustments` | 401 |  |
| Integration | `http://localhost:3001/api/integration/order-status` | 401 |  |
| Integration | `http://localhost:3001/api/integration/reservation-to-order` | 405 |  |
| HQ.WhatsApp | `http://localhost:3001/api/hq/whatsapp` | 401 |  |
| HQ.Webhooks | `http://localhost:3001/api/hq/webhooks` | 401 |  |
| Integration | `http://localhost:3001/api/integration/order-status-sync` | 405 |  |
| HQ.Webhooks | `http://localhost:3001/api/hq/webhooks/branch-realtime` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/alerts/low-stock` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/analytics/stock-performance` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/expired` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/brands` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/categories` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/export` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/goods-receipts/receive-with-stock-movements` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/low-stock-alerts` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/goods-receipts` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/tags` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/suppliers` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/units` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/summary` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/master/warehouses` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/reports` | 400 |  |
| Inventory | `http://localhost:3001/api/inventory/realtime` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/sales-orders` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/stock` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/stock-adjustments` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/warehouse/mapping` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/stocktake` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/dashboard` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/stockopname` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/suppliers` | 401 |  |
| Inventory | `http://localhost:3001/api/inventory/stock/movements` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/programs` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/members/crud` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/tiers/crud` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/pos/earn-points` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/rewards` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/tiers` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/rewards/crud` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/rewards/redeem` | 401 |  |
| Modules | `http://localhost:3001/api/modules/analytics` | 401 |  |
| Loyalty | `http://localhost:3001/api/loyalty/redeem` | 405 |  |
| Modules | `http://localhost:3001/api/modules/configure` | 401 |  |
| POS | `http://localhost:3001/api/pos` | 401 |  |
| Notifications | `http://localhost:3001/api/notifications/email/send` | 405 |  |
| Orders | `http://localhost:3001/api/orders/analytics` | 401 |  |
| Orders | `http://localhost:3001/api/orders/unified` | 401 |  |
| Orders | `http://localhost:3001/api/orders/sync` | 401 |  |
| Modules | `http://localhost:3001/api/modules/catalog` | 401 |  |
| Modules | `http://localhost:3001/api/modules/status` | 401 |  |
| POS | `http://localhost:3001/api/pos/ai-assistant` | 405 |  |
| POS | `http://localhost:3001/api/pos/analytics/bridge` | 401 |  |
| POS | `http://localhost:3001/api/pos/analytics/sales-performance` | 401 |  |
| POS | `http://localhost:3001/api/pos/invoices/bridge` | 401 |  |
| POS | `http://localhost:3001/api/pos/events/broadcast` | 401 |  |
| POS | `http://localhost:3001/api/pos/cart` | 401 |  |
| POS | `http://localhost:3001/api/pos/hold` | 401 |  |
| POS | `http://localhost:3001/api/pos/cashier/checkout` | 401 |  |
| POS | `http://localhost:3001/api/pos/dashboard-stats` | 401 |  |
| POS | `http://localhost:3001/api/pos/invoices/sequelize-handler` | 401 |  |
| POS | `http://localhost:3001/api/pos/receipt-templates` | 401 |  |
| POS | `http://localhost:3001/api/pos/shifts/logs/export` | 401 |  |
| POS | `http://localhost:3001/api/pos/settings` | 401 |  |
| POS | `http://localhost:3001/api/pos/members` | 401 |  |
| POS | `http://localhost:3001/api/pos/products` | 401 |  |
| POS | `http://localhost:3001/api/pos/shifts` | 401 |  |
| POS | `http://localhost:3001/api/pos/shifts/export` | 401 |  |
| POS | `http://localhost:3001/api/pos/receipts/list` | 401 |  |
| POS | `http://localhost:3001/api/pos/shifts/bridge` | 401 |  |
| POS | `http://localhost:3001/api/pos/reports` | 401 |  |
| POS | `http://localhost:3001/api/pos/stock/update` | 405 |  |
| POS | `http://localhost:3001/api/pos/test-print` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions/export` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions/create` | 405 |  |
| POS | `http://localhost:3001/api/pos/transactions/bridge` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions/held` | 401 |  |
| Products | `http://localhost:3001/api/products/hpp/bulk-update` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions/list` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions/hold` | 405 |  |
| Production | `http://localhost:3001/api/production` | 401 |  |
| Products | `http://localhost:3001/api/products/hpp/analysis` | 401 |  |
| Products | `http://localhost:3001/api/products/bulk-import` | 405 |  |
| POS | `http://localhost:3001/api/pos/transactions/history` | 401 |  |
| POS | `http://localhost:3001/api/pos/transactions/stats` | 401 |  |
| Production | `http://localhost:3001/api/production/inter-branch-transfer` | 401 |  |
| Reports | `http://localhost:3001/api/reports/branch-leaderboard` | 401 |  |
| Reports | `http://localhost:3001/api/reports/finance` | 401 |  |
| Purchase | `http://localhost:3001/api/purchase/requisitions` | 401 |  |
| Products | `http://localhost:3001/api/products/with-promos` | 401 |  |
| Reports | `http://localhost:3001/api/reports/daily-sales-summary` | 401 |  |
| Reports | `http://localhost:3001/api/reports/dashboard` | 401 |  |
| Reports | `http://localhost:3001/api/reports/consolidated-financial` | 401 |  |
| Reports | `http://localhost:3001/api/reports/comprehensive` | 401 |  |
| Products | `http://localhost:3001/api/products/simple` | 401 |  |
| Recipes | `http://localhost:3001/api/recipes` | 401 |  |
| Reports | `http://localhost:3001/api/reports/sales` | 401 |  |
| Reports | `http://localhost:3001/api/reports/wastage-analysis-hq` | 401 |  |
| Reservations | `http://localhost:3001/api/reservations/upcoming` | 401 |  |
| Reservations | `http://localhost:3001/api/reservations` | 401 |  |
| Reservations | `http://localhost:3001/api/reservations/availability` | 401 |  |
| Reservations | `http://localhost:3001/api/reservations/today` | 401 |  |
| Settings | `http://localhost:3001/api/settings/backup/create` | 405 |  |
| Reports | `http://localhost:3001/api/reports/summary` | 401 |  |
| Settings | `http://localhost:3001/api/settings/audit-history` | 401 |  |
| Reports | `http://localhost:3001/api/reports/inventory` | 401 |  |
| Settings | `http://localhost:3001/api/settings/hardware/printers` | 401 |  |
| Settings | `http://localhost:3001/api/settings/hardware` | 401 |  |
| Settings | `http://localhost:3001/api/settings/inventory/suppliers` | 401 |  |
| Settings | `http://localhost:3001/api/settings/integrations/webhooks` | 401 |  |
| Settings | `http://localhost:3001/api/settings/inventory/warehouses` | 401 |  |
| Settings | `http://localhost:3001/api/settings/inventory/categories` | 401 |  |
| Settings | `http://localhost:3001/api/settings/inventory/units` | 401 |  |
| Settings | `http://localhost:3001/api/settings/integrations` | 401 |  |
| Settings | `http://localhost:3001/api/settings/export` | 401 |  |
| Settings | `http://localhost:3001/api/settings/backup/list` | 401 |  |
| Settings | `http://localhost:3001/api/settings/security/audit-logs` | 401 |  |
| Settings | `http://localhost:3001/api/settings/store` | 401 |  |
| Settings | `http://localhost:3001/api/settings/security/password` | 405 |  |
| Settings | `http://localhost:3001/api/settings/roles` | 401 |  |
| Settings | `http://localhost:3001/api/settings/store/branches` | 401 |  |
| Settings | `http://localhost:3001/api/settings/reports/export` | 401 |  |
| Settings | `http://localhost:3001/api/settings/notifications` | 401 |  |
| Settings | `http://localhost:3001/api/settings/printers` | 401 |  |
| Settings | `http://localhost:3001/api/settings/security/2fa/enable` | 405 |  |
| Settings | `http://localhost:3001/api/settings/reports/analytics` | 401 |  |
| Tables | `http://localhost:3001/api/tables` | 401 |  |
| Settings | `http://localhost:3001/api/settings/validate` | 401 |  |
| Settings | `http://localhost:3001/api/settings/sync` | 401 |  |
| Settings | `http://localhost:3001/api/settings/store/settings` | 401 |  |
| Tables | `http://localhost:3001/api/tables/sessions` | 401 |  |
| Warehouses | `http://localhost:3001/api/warehouses` | 401 |  |
| Settings | `http://localhost:3001/api/settings/users` | 401 |  |
| Tables | `http://localhost:3001/api/tables/status` | 401 |  |
| Waste | `http://localhost:3001/api/waste` | 401 |  |
| Settings | `http://localhost:3001/api/settings/store/receipt-design` | 401 |  |
| HQ.Branches | `http://localhost:3001/api/hq/branches` | 401 |  |
| HQ.Categories | `http://localhost:3001/api/hq/categories` | 401 |  |

## 🐞 Bug Summary (dari 5xx errors)

| # | Module | Endpoint | Error | Severity | Type |
|---|--------|----------|-------|----------|------|
| 1 | `http://localhost:3001/api/admin/audit/global` | ``500`` |  | High | 5xx Server Error |
| 2 | `http://localhost:3001/api/admin/analytics/overview` | ``500`` |  | High | 5xx Server Error |
| 3 | `http://localhost:3001/api/admin/products/distribute` | ``500`` |  | High | 5xx Server Error |
| 4 | `http://localhost:3001/api/admin/reports/aggregator` | ``500`` |  | High | 5xx Server Error |
| 5 | `http://localhost:3001/api/admin/tenants` | ``500`` |  | High | 5xx Server Error |
| 6 | `http://localhost:3001/api/admin/transactions` | ``500`` |  | High | 5xx Server Error |
| 7 | `http://localhost:3001/api/admin/transactions/summary` | ``500`` |  | High | 5xx Server Error |
| 8 | `http://localhost:3001/api/admin/settings/global` | ``500`` |  | High | 5xx Server Error |
| 9 | `http://localhost:3001/api/admin/subscriptions` | ``500`` |  | High | 5xx Server Error |
| 10 | `http://localhost:3001/api/admin/webhooks` | ``500`` |  | High | 5xx Server Error |
| 11 | `http://localhost:3001/api/billing/invoices` | ``500`` |  | High | 5xx Server Error |
| 12 | `http://localhost:3001/api/billing/payment-methods` | ``500`` |  | High | 5xx Server Error |
| 13 | `http://localhost:3001/api/billing/v2/invoices` | ``501`` |  | High | 5xx Server Error |
| 14 | `http://localhost:3001/api/billing/subscription` | ``500`` |  | High | 5xx Server Error |
| 15 | `http://localhost:3001/api/billing/v2/analytics` | ``501`` |  | High | 5xx Server Error |
| 16 | `http://localhost:3001/api/billing/v2/subscription` | ``501`` |  | High | 5xx Server Error |
| 17 | `http://localhost:3001/api/billing/v2/plans` | ``501`` |  | High | 5xx Server Error |
| 18 | `http://localhost:3001/api/billing/v2/payment-methods` | ``501`` |  | High | 5xx Server Error |
| 19 | `http://localhost:3001/api/customers/crud` | ``500`` |  | High | 5xx Server Error |
| 20 | `http://localhost:3001/api/customers/stats` | ``500`` |  | High | 5xx Server Error |
| 21 | `http://localhost:3001/api/customers/sync-tier` | ``500`` |  | High | 5xx Server Error |
| 22 | `http://localhost:3001/api/customers/purchase-history` | ``500`` |  | High | 5xx Server Error |
| 23 | `http://localhost:3001/api/customers` | ``500`` |  | High | 5xx Server Error |
| 24 | `http://localhost:3001/api/customers/loyalty-programs` | ``500`` |  | High | 5xx Server Error |
| 25 | `http://localhost:3001/api/customers/statistics` | ``500`` |  | High | 5xx Server Error |
| 26 | `http://localhost:3001/api/employees/attendance/mobile` | ``500`` |  | High | 5xx Server Error |
| 27 | `http://localhost:3001/api/employees/attendance/gps` | ``500`` |  | High | 5xx Server Error |
| 28 | `http://localhost:3001/api/employees/schedules` | ``500`` |  | High | 5xx Server Error |
| 29 | `http://localhost:3001/api/employees/roaming` | ``500`` |  | High | 5xx Server Error |
| 30 | `http://localhost:3001/api/employees/roster/multi-branch` | ``500`` |  | High | 5xx Server Error |
| 31 | `http://localhost:3001/api/finance/balance-sheet-simple` | ``500`` |  | High | 5xx Server Error |
| 32 | `http://localhost:3001/api/finance/dashboard-complete` | ``500`` |  | High | 5xx Server Error |
| 33 | `http://localhost:3001/api/finance/daily-income` | ``500`` |  | High | 5xx Server Error |
| 34 | `http://localhost:3001/api/finance/accounts` | ``500`` |  | High | 5xx Server Error |
| 35 | `http://localhost:3001/api/finance/expenses` | ``500`` |  | High | 5xx Server Error |
| 36 | `http://localhost:3001/api/finance/budgets` | ``500`` |  | High | 5xx Server Error |
| 37 | `http://localhost:3001/api/finance` | ``500`` |  | High | 5xx Server Error |
| 38 | `http://localhost:3001/api/finance/dashboard-stats` | ``500`` |  | High | 5xx Server Error |
| 39 | `http://localhost:3001/api/finance/expenses-simple` | ``500`` |  | High | 5xx Server Error |
| 40 | `http://localhost:3001/api/finance/incomes-simple` | ``500`` |  | High | 5xx Server Error |
| 41 | `http://localhost:3001/api/finance/inter-branch-invoices` | ``500`` |  | High | 5xx Server Error |
| 42 | `http://localhost:3001/api/finance/export` | ``500`` |  | High | 5xx Server Error |
| 43 | `http://localhost:3001/api/finance/invoices` | ``500`` |  | High | 5xx Server Error |
| 44 | `http://localhost:3001/api/finance/monthly-income` | ``500`` |  | High | 5xx Server Error |
| 45 | `http://localhost:3001/api/finance/profit-loss-simple` | ``500`` |  | High | 5xx Server Error |
| 46 | `http://localhost:3001/api/finance/settings/bank-accounts` | ``500`` |  | High | 5xx Server Error |
| 47 | `http://localhost:3001/api/finance/settings/chart-of-accounts` | ``500`` |  | High | 5xx Server Error |
| 48 | `http://localhost:3001/api/finance/settings/assets` | ``500`` |  | High | 5xx Server Error |
| 49 | `http://localhost:3001/api/finance/settings/categories` | ``500`` |  | High | 5xx Server Error |
| 50 | `http://localhost:3001/api/finance/payables/payment` | ``500`` |  | High | 5xx Server Error |
| 51 | `http://localhost:3001/api/finance/payables` | ``500`` |  | High | 5xx Server Error |
| 52 | `http://localhost:3001/api/finance/receivables/payment` | ``500`` |  | High | 5xx Server Error |
| 53 | `http://localhost:3001/api/finance/receivables` | ``500`` |  | High | 5xx Server Error |
| 54 | `http://localhost:3001/api/finance/transactions-simple` | ``500`` |  | High | 5xx Server Error |
| 55 | `http://localhost:3001/api/finance/summary` | ``500`` |  | High | 5xx Server Error |
| 56 | `http://localhost:3001/api/health` | ``503`` |  | High | 5xx Server Error |
| 57 | `http://localhost:3001/api/hq/dms/blockchain-mine` | ``500`` |  | High | 5xx Server Error |
| 58 | `http://localhost:3001/api/hq/dms/audit` | ``500`` |  | High | 5xx Server Error |
| 59 | `http://localhost:3001/api/hq/dms/analytics` | ``500`` |  | High | 5xx Server Error |
| 60 | `http://localhost:3001/api/hq/dms/destroy` | ``500`` |  | High | 5xx Server Error |
| 61 | `http://localhost:3001/api/hq/dms/detonate` | ``500`` |  | High | 5xx Server Error |
| 62 | `http://localhost:3001/api/hq/dms/disposal` | ``500`` |  | High | 5xx Server Error |
| 63 | `http://localhost:3001/api/hq/dms/files` | ``500`` |  | High | 5xx Server Error |
| 64 | `http://localhost:3001/api/hq/dms/knowledge-graph` | ``500`` |  | High | 5xx Server Error |
| 65 | `http://localhost:3001/api/hq/dms/lib/models` | ``500`` |  | High | 5xx Server Error |
| 66 | `http://localhost:3001/api/hq/dms/lib/use-mock` | ``500`` |  | High | 5xx Server Error |
| 67 | `http://localhost:3001/api/hq/dms/letter` | ``500`` |  | High | 5xx Server Error |
| 68 | `http://localhost:3001/api/hq/dms/mata-elang` | ``500`` |  | High | 5xx Server Error |
| 69 | `http://localhost:3001/api/hq/dms/move-tier` | ``500`` |  | High | 5xx Server Error |
| 70 | `http://localhost:3001/api/hq/dms/lib/helpers` | ``500`` |  | High | 5xx Server Error |
| 71 | `http://localhost:3001/api/hq/dms/hierarchy` | ``500`` |  | High | 5xx Server Error |
| 72 | `http://localhost:3001/api/hq/dms/folders` | ``500`` |  | High | 5xx Server Error |
| 73 | `http://localhost:3001/api/hq/dms/open-data` | ``500`` |  | High | 5xx Server Error |
| 74 | `http://localhost:3001/api/hq/dms/policies` | ``500`` |  | High | 5xx Server Error |
| 75 | `http://localhost:3001/api/hq/dms/storage` | ``500`` |  | High | 5xx Server Error |
| 76 | `http://localhost:3001/api/hq/dms/scan` | ``500`` |  | High | 5xx Server Error |
| 77 | `http://localhost:3001/api/hq/dms/shares` | ``500`` |  | High | 5xx Server Error |
| 78 | `http://localhost:3001/api/hq/dms/ppid` | ``500`` |  | High | 5xx Server Error |
| 79 | `http://localhost:3001/api/hq/dms/signature` | ``500`` |  | High | 5xx Server Error |
| 80 | `http://localhost:3001/api/hq/dms/overview` | ``500`` |  | High | 5xx Server Error |
| 81 | `http://localhost:3001/api/hq/dms/records` | ``500`` |  | High | 5xx Server Error |
| 82 | `http://localhost:3001/api/hq/dms/upload` | ``500`` |  | High | 5xx Server Error |
| 83 | `http://localhost:3001/api/inventory` | ``500`` |  | High | 5xx Server Error |
| 84 | `http://localhost:3001/api/inventory/categories/batch` | ``500`` |  | High | 5xx Server Error |
| 85 | `http://localhost:3001/api/inventory/analytics/stock-graph` | ``500`` |  | High | 5xx Server Error |
| 86 | `http://localhost:3001/api/inventory/analytics/dashboard` | ``500`` |  | High | 5xx Server Error |
| 87 | `http://localhost:3001/api/inventory/categories/stats` | ``500`` |  | High | 5xx Server Error |
| 88 | `http://localhost:3001/api/inventory/batch/operations` | ``500`` |  | High | 5xx Server Error |
| 89 | `http://localhost:3001/api/inventory/category-by-id` | ``500`` |  | High | 5xx Server Error |
| 90 | `http://localhost:3001/api/inventory/documents` | ``500`` |  | High | 5xx Server Error |
| 91 | `http://localhost:3001/api/inventory/dosage-forms` | ``500`` |  | High | 5xx Server Error |
| 92 | `http://localhost:3001/api/inventory/documents/upload` | ``500`` |  | High | 5xx Server Error |
| 93 | `http://localhost:3001/api/inventory/expiry` | ``500`` |  | High | 5xx Server Error |
| 94 | `http://localhost:3001/api/inventory/expiry-fixed` | ``500`` |  | High | 5xx Server Error |
| 95 | `http://localhost:3001/api/inventory/low-stock` | ``500`` |  | High | 5xx Server Error |
| 96 | `http://localhost:3001/api/inventory/expiry/index.new` | ``500`` |  | High | 5xx Server Error |
| 97 | `http://localhost:3001/api/inventory/price-groups` | ``500`` |  | High | 5xx Server Error |
| 98 | `http://localhost:3001/api/inventory/movements` | ``500`` |  | High | 5xx Server Error |
| 99 | `http://localhost:3001/api/inventory/returns` | ``500`` |  | High | 5xx Server Error |
| 100 | `http://localhost:3001/api/inventory/receipts/upload-document` | ``500`` |  | High | 5xx Server Error |
| 101 | `http://localhost:3001/api/inventory/returns/upload-document` | ``500`` |  | High | 5xx Server Error |
| 102 | `http://localhost:3001/api/inventory/receipts/statistics` | ``500`` |  | High | 5xx Server Error |
| 103 | `http://localhost:3001/api/inventory/receipts` | ``500`` |  | High | 5xx Server Error |
| 104 | `http://localhost:3001/api/inventory/shelf-position-by-id` | ``500`` |  | High | 5xx Server Error |
| 105 | `http://localhost:3001/api/inventory/stock/search` | ``500`` |  | High | 5xx Server Error |
| 106 | `http://localhost:3001/api/inventory/transactions/prescription-processing` | ``500`` |  | High | 5xx Server Error |
| 107 | `http://localhost:3001/api/inventory/warehouses` | ``500`` |  | High | 5xx Server Error |
| 108 | `http://localhost:3001/api/pos/shifts/start` | ``500`` |  | High | 5xx Server Error |
| 109 | `http://localhost:3001/api/pos/shifts/status` | ``500`` |  | High | 5xx Server Error |
| 110 | `http://localhost:3001/api/pos/transactions/prescription-invoice` | ``500`` |  | High | 5xx Server Error |
