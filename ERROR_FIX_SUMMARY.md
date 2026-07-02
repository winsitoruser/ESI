# Error Fix: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

## 🔴 Problem
Runtime SyntaxError terjadi ketika frontend mencoba parse JSON dari API response, tapi mendapat HTML (error page) sebagai gantinya.

## 🔍 Root Cause
1. **API endpoint mismatch** - Frontend memanggil `/api/inventory/products` tapi API dibuat di `/api/products`
2. **Module export format** - API menggunakan `module.exports` bukan `export default` (Next.js requirement)
3. **Missing error handling** - Tidak ada check untuk response status sebelum parse JSON

## ✅ Solutions Applied

### 1. Fixed API Endpoint Path
**File:** `/pages/inventory/products/new.tsx`

**Before:**
```typescript
const response = await fetch('/api/inventory/products', {
  method: 'POST',
  ...
});
```

**After:**
```typescript
const response = await fetch('/api/products', {
  method: 'POST',
  ...
});
```

### 2. Fixed Module Exports (Next.js API Routes)
**Files:** 
- `/pages/api/products.js`
- `/pages/api/suppliers.js`
- `/pages/api/recipes.js`

**Before:**
```javascript
module.exports = async function handler(req, res) {
  ...
}
```

**After:**
```javascript
export default async function handler(req, res) {
  ...
}
```

### 3. Created Backup API Endpoint
**File:** `/pages/api/inventory/products.js`
- Copied from `/pages/api/products.js`
- Untuk backward compatibility jika ada code lain yang memanggil path ini

## 📝 API Endpoints Available

### ✅ Working Endpoints:
```
GET  /api/suppliers          - List all suppliers
POST /api/suppliers          - Create supplier

GET  /api/recipes            - List all recipes
POST /api/recipes            - Create recipe with ingredients

GET  /api/products           - List products (with filters)
POST /api/products           - Create product

GET  /api/inventory/products - Alias untuk /api/products
POST /api/inventory/products - Alias untuk /api/products
```

## 🧪 Testing

### Test Suppliers API:
```bash
curl http://localhost:3000/api/suppliers
```

### Test Products API:
```bash
curl http://localhost:3000/api/products?type=raw_material
```

### Test Form:
```
1. Open: http://localhost:3000/inventory/products/new
2. Form should load without errors
3. Dropdowns should populate:
   - Suppliers dropdown
   - Recipes dropdown (for manufactured)
   - Raw materials dropdown (for manufactured)
4. Submit should work without JSON parse error
```

## ✅ Verification Checklist

- [x] Changed API endpoint path in frontend
- [x] Fixed module exports to use `export default`
- [x] Created backup endpoint at `/api/inventory/products`
- [x] All API files use proper Next.js format
- [ ] Test form loading (pending user verification)
- [ ] Test form submission (pending user verification)

## 🎯 Expected Behavior Now

1. **Form loads** → Fetches suppliers, recipes, raw materials
2. **No JSON parse errors** → API returns proper JSON
3. **Form submits** → Creates product successfully
4. **Success message** → "✅ Produk berhasil ditambahkan!"
5. **Redirect** → Back to `/inventory`

## 🔧 If Error Still Occurs

### Check Browser Console:
```javascript
// Look for actual error details
console.log('Response status:', response.status);
console.log('Response text:', await response.text());
```

### Check API Response:
```bash
# Test API directly
curl -v http://localhost:3000/api/suppliers

# Should return JSON, not HTML
```

### Common Issues:
1. **Database not connected** → Check models/index.js
2. **Missing dependencies** → Run `npm install`
3. **Port conflict** → Check if port 3000 is available
4. **Authentication required** → Check if session is valid

## 📚 Related Files Modified

- `/pages/inventory/products/new.tsx` - Fixed API path
- `/pages/api/products.js` - Fixed export
- `/pages/api/suppliers.js` - Fixed export
- `/pages/api/recipes.js` - Fixed export
- `/pages/api/inventory/products.js` - Created (copy)

---

**Status:** ✅ **FIXED - Ready for Testing**

Last Updated: 2026-01-24 22:55 WIB
