# FE-COMMERCE Audit Report — Bedagang ERP/PoS

**Audit Date:** 2026-07-02  
**Auditor:** bedagang-frontend-2  
**Scope:** Dashboard, Products, Inventory, POS pages

---

## Executive Summary

This audit identified **14 issues** across frontend pages and API endpoints. The most critical finding is that API response shapes don't match what the frontend expects (MOCK_HQ_PRODUCTS shape), combined with silent error handling that masks real failures using fallback mock data.

---

## 1. Critical Issues

### 1.1 API Shape Mismatch — Multiple Endpoints

**Severity:** CRITICAL  
**Files:**
- `pages/api/hq/products/index.ts`
- `pages/api/hq/inventory/products.ts`

**Problem:**
The frontend expects product objects matching `MOCK_HQ_PRODUCTS`:
```typescript
{
  id: number,
  sku: string,
  name: string,
  categoryName: string,  // ← Frontend expects this
  basePrice: number,      // ← Frontend expects this
  costPrice: number,
  stock: number,
  minStock: number,
  pricing: {
    isStandard: boolean,
    lockedBy: string | null,
    lockedAt: string | null,
    branchPrices: []
  }
}
```

But `pages/api/hq/products/index.ts:59-79` returns:
```typescript
{
  id: product.id,
  categoryName: product.category?.name || '',  // ← Sometimes undefined
  basePrice: parseFloat(product.price) || 0,    // ← Correct
  stock: 0,                                        // ← ALWAYS 0!
  minStock: product.minStock || 10,
  pricing: { isStandard: true, lockedBy: null, lockedAt: null, branchPrices: [] }
}
```

**Critical Bug:** `stock: 0` is HARDCODED — no stock data is ever returned from `/api/hq/products`.

**Additional Mismatch — Inventory Products API:**
`pages/api/hq/inventory/products.ts:62-70` uses different field names:
- Frontend expects `categoryName` → API returns `category`
- Frontend expects `basePrice` → API returns `sellPrice`
- Frontend expects `costPrice` → API returns `buyPrice`
- Frontend expects `stock` → API returns `totalStock`
- Frontend expects `pricing` object → NOT PRESENT

### 1.2 Silent Error Swallowing Returns 200 OK

**Severity:** CRITICAL  
**File:** `pages/api/hq/products/index.ts:88-96`

```typescript
} catch (error) {
  console.error('Error fetching products:', error);
  return res.status(200).json({  // ← BUG: 200 OK on ERROR!
    products: getMockProducts(),
    total: 5,
    page: 1,
    limit: 10,
    totalPages: 1
  });
}
```

**Problem:** When the database query fails, it returns HTTP 200 with mock data instead of 500. This:
- Masks real production failures
- Makes debugging impossible (frontend never sees the error)
- Creates "it works on my machine" syndrome with mock data

---

## 2. High Priority Issues

### 2.1 `rowsOr` Falls Back on Empty Arrays

**Severity:** HIGH  
**File:** `lib/hq/mock-data.ts:7-8`

```typescript
export function rowsOr<T>(rows: T[] | null | undefined, fallback: T[]): T[] {
  return rows && rows.length > 0 ? rows : fallback;
}
```

**Problem:** Falls back to mock data when `rows.length === 0`. This means:
- If a tenant truly has 0 products, they see mock products instead
- Empty state UI never triggers
- Users think they have data when they don't

**Recommendation:** Only fallback on `null | undefined`, not empty arrays.

### 2.2 No User-Facing Error Feedback

**Severity:** HIGH  
**Files:** Multiple frontend pages

**Pattern Found:**
```typescript
try {
  const response = await fetch('/api/...');
  const data = await response.json();
  // ... use data
} catch (error) {
  console.error('Error:', error);  // ← Only console, no user feedback
}
```

**Pages with this issue:**
- `pages/hq/dashboard.tsx` (fallback to MOCK_DATA)
- `pages/hq/home.tsx` (fallback to MOCK_DATA)
- `pages/hq/inventory/index.tsx` (fallback to MOCK_INV_SUMMARY)
- `pages/hq/products/index.tsx` (API returns mock on error)

**Missing:**
- No `toast.error()` calls
- No `error` state variables
- No error UI components
- No `!response.ok` checks before `.json()`

### 2.3 Missing `!response.ok` Check

**Severity:** HIGH  
**Pattern across codebase:**

```typescript
const response = await fetch(url);
const data = await response.json();  // ← BUG: Never checks if response.ok
```

**Found in:**
- `pages/hq/products/index.tsx:90` — no response.ok check
- `pages/hq/inventory/index.tsx:136-140` — checks `.ok` but fallback swallows
- `pages/pos/cashier.tsx:96` — no response.ok check

**Example from products page:**
```typescript
const response = await fetch(`/api/hq/products?page=${page}&limit=${pageSize}`);
const result = await response.json();  // Will throw on 500, but 401/403 returns JSON

// No check like:
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

---

## 3. Medium Priority Issues

### 3.1 Inconsistent Loading State Patterns

**Pages with proper loading:**
- `pages/pos/cashier.tsx` — `isLoadingProducts`, `isProcessingCheckout`
- `pages/hq/inventory/index.tsx` — `loading` state

**Pages needing improvement:**
- `pages/hq/products/index.tsx` — uses `refreshing` but no initial `loading`
- `pages/hq/dashboard.tsx` — no explicit loading UI
- `pages/hq/home.tsx` — complex widget loading not centralized

### 3.2 API Returns Different Wrapper Formats

**Problem:** Different endpoints use different response wrappers:

| Endpoint | Wrapper |
|----------|---------|
| `/api/hq/dashboard` | `{ success: true, data: {...} }` |
| `/api/hq/products` | `{ products: [...], total, page, ... }` |
| `/api/hq/inventory/products` | `{ data: [...], meta: {...} }` (via successResponse) |
| `/api/pos/products` | `{ success: true, products: [...], categories, total }` |

**Frontend has to handle all these differently — standardize on one pattern.**

### 3.3 `alert()` Used Instead of Toast

**Severity:** MEDIUM  
**File:** `pages/pos/cashier.tsx`

```typescript
alert('Nama dan nomor telepon harus diisi!');  // Line 130
alert('Member baru berhasil ditambahkan!');     // Line 149
alert('Gagal menambahkan member');              // Line 152
// ... ~15 more alert() calls
```

**Recommendation:** Use `react-hot-toast` which is already imported in HQ pages.

### 3.4 No Empty State UI

**Severity:** MEDIUM  
**Pattern:** Because `rowsOr` falls back to mock data on empty arrays, the UI never shows "No products yet" or similar empty states.

**Checklist for empty states:**
- [ ] Products — no empty card/illustration
- [ ] Inventory — shows mock when 0 products
- [ ] Dashboard widgets — fallback to mock instead of empty

---

## 4. Low Priority / Best Practice Issues

### 4.1 SSR Dynamic Import Needed

**Good:** Some pages use `dynamic` with `ssr: false`:
```typescript
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
```

**Check:** All recharts/apexcharts imports should use this pattern for SSR compatibility.

### 4.2 Type Safety Gaps

**Found:** Uses of `any` that could be typed:
- `const [products, setProducts] = useState<any[]>([]);`
- API response types not defined
- No Zod/Runtypes validation on API responses

### 4.3 Pagination Not Always Implemented

**Products API** supports pagination (`page`, `limit`, `offset`), but:
- Some fetch calls use `limit=100` hardcoded
- Infinite scroll not implemented for large catalogs

---

## 5. Strengths Found

✅ **POS Page has good loading states:** `isLoadingProducts`, `isProcessingCheckout`  
✅ **Most API endpoints have auth checks:** `withHQAuth`, `getServerSession`  
✅ **Proper permissions checks:** `super_admin`/`admin` role validation in dashboard  
✅ **Component patterns are consistent:** `DataTable`, `HQLayout`, `useTranslation`  
✅ **toast is imported in HQ pages:** `react-hot-toast` available (just not always used)  
✅ **Error logging exists:** `console.error` is used (needs user-facing layer)

---

## 6. Action Plan — Priority Order

### Phase 1 (Critical — This Week)
1. **Fix API `/api/hq/products/index.ts:88-96`** — Return proper HTTP status codes, don't return 200 with mock on error
2. **Fix `stock: 0` bug** — Join Stock association properly in products API
3. **Standardize field names** — Align `categoryName`/`category`, `basePrice`/`sellPrice`, etc.

### Phase 2 (High — This Sprint)
4. **Fix `rowsOr`** — Only fallback on `null | undefined`, not `length === 0`
5. **Add `response.ok` checks** before `.json()` on all fetch calls
6. **Add user-facing error UI** — Use `toast.error()` or error banners

### Phase 3 (Medium — Next Sprint)
7. **Replace `alert()` with toast** in POS pages
8. **Standardize API response wrapper format** across all endpoints
9. **Add proper loading skeletons** instead of spinners only
10. **Implement empty state components** for all data tables

### Phase 4 (Low — Backlog)
11. **Add TypeScript interfaces** for all API responses
12. **Consider Zod validation** on frontend for API contracts
13. **Audit accessibility** — ARIA labels, keyboard navigation
14. **Performance audit** — Lighthouse scores, bundle size

---

## 7. Files to Modify

| Priority | File | Change |
|----------|------|--------|
| 🔴 CRITICAL | `pages/api/hq/products/index.ts` | Fix catch block to return 500, fix stock=0 |
| 🔴 CRITICAL | `pages/api/hq/inventory/products.ts` | Align field names with frontend expectations |
| 🟠 HIGH | `lib/hq/mock-data.ts` | Fix rowsOr to not fallback on empty array |
| 🟠 HIGH | `pages/hq/products/index.tsx` | Add response.ok check, error state |
| 🟠 HIGH | `pages/hq/inventory/index.tsx` | Add toast errors, proper loading/empty states |
| 🟡 MEDIUM | `pages/pos/cashier.tsx` | Replace alert() with toast |
| 🟡 MEDIUM | All API endpoints | Standardize response wrapper |

---

## 8. Verification Checklist

Before marking this complete:
- [ ] API returns 500 on error, not 200 with mock
- [ ] Products API returns actual stock, not hardcoded 0
- [ ] Field names consistent between API and MOCK_HQ_PRODUCTS
- [ ] Empty arrays show "No data" instead of mock data
- [ ] HTTP 401/403/500 show user-facing errors
- [ ] Loading states visible during all async operations

---

**End of Report**  
Generated by bedagang-frontend-2 for kanban task t_8c91668f
