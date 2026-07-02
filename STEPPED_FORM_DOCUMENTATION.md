# Stepped Product Form - Complete Documentation

## 🎯 Overview
Form wizard modern dengan 4 langkah untuk menambahkan produk, dilengkapi dengan SKU generator otomatis dan profit calculator real-time.

---

## ✨ Fitur Utama

### **1. SKU Generator** ✅
- **Auto Mode:** Generate SKU otomatis berdasarkan tipe produk & kategori
- **Manual Mode:** Input SKU manual dengan suggestions
- **Real-time Validation:** Check SKU availability
- **Format:** `TYPE-CAT-DATE-XXXX` (e.g., `FIN-BAK-260124-3456`)

### **2. Profit Calculator** ✅
- **Real-time Calculation:** Hitung profit saat input harga
- **Visual Display:** Profit amount, margin, markup dalam card
- **Profit Status:** Badge dengan warna (Excellent/Good/Fair/Poor)
- **Interactive Slider:** Adjust markup dengan slider 0-200%

### **3. Modern Stepped UI** ✅
- **4 Steps:** Basic Info → Pricing → Supplier/Production → Stock
- **Progress Indicator:** Visual progress bar dengan icons
- **Smooth Navigation:** Next/Previous buttons
- **Validation:** Per-step validation

### **4. Professional Design** ✅
- **Gradient Headers:** Indigo-purple gradient
- **Card-based Layout:** Clean card design
- **Responsive:** Mobile-friendly
- **Animations:** Smooth transitions

---

## 📋 Form Steps

### **Step 1: Informasi Dasar** 📝
```
✓ Product Type Selection (3 cards)
  - Produk Jadi (Finished)
  - Bahan Baku (Raw Material)
  - Produk Manufaktur (Manufactured)

✓ Product Name (required)

✓ SKU Generator
  - Toggle: Auto / Manual
  - Auto: Generate button
  - Manual: Input + Suggestions
  - Real-time availability check

✓ Category (dropdown)

✓ Unit (dropdown)

✓ Description (textarea)
```

### **Step 2: Harga & Profit** 💰
```
✓ Cost Input
  - Harga Beli (for Finished/Raw Material)
  - Biaya Produksi (for Manufactured)

✓ Markup Slider (0-200%)
  - Interactive range slider
  - Real-time percentage display

✓ Selling Price (auto-calculated)

✓ Profit Analysis Card
  - Profit Amount (Rp)
  - Profit Margin (%)
  - Markup (%)
  - Status Badge (Excellent/Good/Fair/Poor)
  - Breakdown: Cost → Selling Price → Net Profit
```

### **Step 3: Supplier/Produksi** 🏭
```
For Finished & Raw Material:
✓ Supplier Selection (dropdown)
✓ Lead Time (days)

For Manufactured:
✓ Recipe Selection (dropdown)
✓ Production Time (minutes)
✓ Batch Size
```

### **Step 4: Stok & Kualitas** 📦
```
✓ Stock Levels
  - Initial Stock
  - Min Stock
  - Max Stock
  - Reorder Point

✓ Quality Settings
  - Quality Grade (A/B/C)
  - Shelf Life (days)
  - Storage Temperature

✓ Tracking Options
  ☑ Requires Batch Tracking
  ☑ Requires Expiry Tracking
  ☑ Product Active
```

---

## 🎨 UI Components

### **Progress Steps**
```tsx
<div className="flex items-center justify-between">
  {steps.map((step) => (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-full ${
        isActive ? 'bg-indigo-600 scale-110' : 
        isCompleted ? 'bg-green-500' : 'bg-gray-200'
      }`}>
        {isCompleted ? <FaCheck /> : <Icon />}
      </div>
      <span>{step.title}</span>
    </div>
  ))}
</div>
```

### **SKU Generator**
```tsx
<div className="flex space-x-2">
  <input 
    value={formData.sku}
    readOnly={skuMode === 'auto'}
    className={skuAvailable === false ? 'border-red-500' : 'border-green-500'}
  />
  {skuMode === 'auto' && (
    <Button onClick={handleGenerateSKU}>
      <FaRandom /> Generate
    </Button>
  )}
</div>
```

### **Profit Analysis Card**
```tsx
<div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6">
  <h3>Analisis Profit</h3>
  <Badge className={profitStatus.color}>
    {profitStatus.label}
  </Badge>
  
  <div className="grid grid-cols-3 gap-4">
    <div>Profit Amount: {formatCurrency(profit)}</div>
    <div>Profit Margin: {margin}%</div>
    <div>Markup: {markup}%</div>
  </div>
  
  <div className="breakdown">
    Cost → Selling Price → Net Profit
  </div>
</div>
```

### **Markup Slider**
```tsx
<input
  type="range"
  name="markup_percentage"
  value={formData.markup_percentage}
  min="0"
  max="200"
  step="5"
  className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200"
/>
```

---

## 🔧 Utilities

### **SKU Generator (`utils/skuGenerator.ts`)**
```typescript
// Generate SKU
generateSKU({
  productType: 'finished',
  category: 'Bakery',
  includeDate: true
})
// Output: "FIN-BAK-260124-3456"

// Generate suggestions
generateSKUSuggestions("Roti Tawar Premium", 3)
// Output: ["RTP-1234", "RTP-5678", "RTP-9012"]

// Check availability
checkSKUAvailability("FIN-BAK-260124-3456")
// Output: true/false
```

### **Profit Calculator (`utils/profitCalculator.ts`)**
```typescript
// Calculate profit
calculateProfit(cost: 10000, sellingPrice: 15000)
// Output: {
//   profit: 5000,
//   profitMargin: 33.33,
//   markup: 50,
//   profitAmount: 5000
// }

// Calculate selling price from markup
calculateSellingPriceFromMarkup(cost: 10000, markup: 50)
// Output: 15000

// Get profit status
getProfitStatus(profitMargin: 35)
// Output: {
//   status: 'good',
//   color: 'text-blue-600 bg-blue-100',
//   label: 'Baik'
// }
```

---

## 🔌 API Integration

### **Check SKU Availability**
```javascript
GET /api/products/check-sku?sku=FIN-BAK-260124-3456

Response:
{
  success: true,
  available: true,
  message: "SKU tersedia"
}
```

### **Create Product**
```javascript
POST /api/products
Body: {
  name: "Roti Tawar Premium",
  sku: "FIN-BAK-260124-3456",
  product_type: "finished",
  purchase_price: 10000,
  markup_percentage: 50,
  price: 15000,
  profit_amount: 5000,
  profit_margin: 33.33,
  ...
}
```

---

## 📊 Profit Status Thresholds

```
Profit Margin:
- ≥ 40%  → Excellent (Green)
- ≥ 25%  → Good (Blue)
- ≥ 15%  → Fair (Yellow)
- < 15%  → Poor (Red)
```

---

## 🎯 User Flow

### **Complete Flow Example:**

**Step 1: Basic Info**
```
1. User selects "Produk Jadi"
2. User enters name: "Roti Tawar Premium"
3. SKU auto-generated: "FIN-BAK-260124-3456"
4. User selects category: "Bakery"
5. User selects unit: "Loaf"
6. Click "Selanjutnya" →
```

**Step 2: Pricing**
```
1. User enters cost: Rp 10,000
2. User adjusts markup slider to 50%
3. Selling price auto-calculated: Rp 15,000
4. Profit card shows:
   - Profit Amount: Rp 5,000
   - Profit Margin: 33.33%
   - Status: "Baik" (Good)
5. Click "Selanjutnya" →
```

**Step 3: Supplier**
```
1. User selects supplier: "PT Bahan Baku Nusantara"
2. User enters lead time: 7 days
3. Click "Selanjutnya" →
```

**Step 4: Stock**
```
1. User enters initial stock: 100
2. User enters min stock: 20
3. User checks "Requires Expiry Tracking"
4. Click "Simpan Produk"
5. ✅ Product created successfully
6. Redirect to /inventory
```

---

## 🎨 Color Scheme

```css
Primary: Indigo-600 (#4F46E5)
Secondary: Purple-600 (#9333EA)
Success: Green-600 (#16A34A)
Warning: Yellow-600 (#CA8A04)
Danger: Red-600 (#DC2626)

Gradients:
- Header: from-indigo-600 to-purple-600
- Step 1: from-indigo-50 to-purple-50
- Step 2: from-green-50 to-emerald-50
- Profit Card: from-indigo-50 to-purple-50
```

---

## ✅ Features Checklist

**SKU Generator:**
- [x] Auto-generate SKU
- [x] Manual SKU input
- [x] SKU suggestions
- [x] Real-time availability check
- [x] Validation (format check)

**Profit Calculator:**
- [x] Real-time calculation
- [x] Profit amount display
- [x] Profit margin display
- [x] Markup percentage
- [x] Visual status badge
- [x] Breakdown display

**Stepped Form:**
- [x] 4-step wizard
- [x] Progress indicator
- [x] Step navigation
- [x] Per-step validation
- [x] Smooth transitions

**Modern UI:**
- [x] Gradient headers
- [x] Card-based layout
- [x] Responsive design
- [x] Interactive elements
- [x] Professional styling

---

## 🚀 Usage

### **Access Form:**
```
http://localhost:3000/inventory/products/new
```

### **Old Simple Form (Backup):**
```
http://localhost:3000/inventory/products/new-simple
```

---

## 📝 Notes

- Form automatically saves SKU to prevent duplicates
- Profit calculation updates in real-time
- All fields validated before submission
- Smooth step transitions with animations
- Mobile-responsive design

---

**Status:** ✅ **FULLY IMPLEMENTED & READY**

Last Updated: 2026-01-24 23:10 WIB
