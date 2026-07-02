# Recipe & Production Integration Guide

## Overview
Sistem terintegrasi untuk manajemen recipe, production, dan stock opname untuk produk FMCG dengan bahan baku.

---

## 🔄 Integration Flow

### 1. Recipe Creation Flow
```
Recipe Management → Create Recipe → Define Ingredients → Save Formula
    ↓
Product automatically linked to recipe
    ↓
Raw materials tracked for availability
```

### 2. Production Flow
```
Production Management → Select Recipe → Check Material Availability
    ↓
Start Production → Consume Raw Materials → Track Progress
    ↓
Complete Production → Update Finished Goods Stock → Update Raw Material Stock
```

### 3. Stock Opname Flow
```
Stock Opname → Count Physical Stock
    ↓
For Recipe Products:
    - Count finished goods
    - Count raw materials used in recipe
    ↓
Calculate Differences → Adjust System Stock → Update All Related Items
```

---

## 📊 Data Structure

### Recipe Product
```typescript
{
  id: string,
  name: string,
  sku: string,
  isRecipeProduct: true,
  recipeId: string,
  category: string,
  stock: number,
  cost: number (calculated from recipe),
  price: number
}
```

### Production Batch
```typescript
{
  id: string,
  batchNumber: string,
  recipeId: string,
  recipeName: string,
  productSku: string,
  plannedQuantity: number,
  producedQuantity: number,
  status: 'planned' | 'in-progress' | 'completed',
  materialsUsed: [{
    materialId: string,
    plannedQty: number,
    usedQty: number
  }],
  totalCost: number
}
```

### Stock Opname Item (Recipe Product)
```typescript
{
  id: string,
  productId: string,
  productName: string,
  isRecipeProduct: true,
  recipeId: string,
  systemStock: number,
  physicalStock: number,
  difference: number,
  rawMaterials: [{
    materialId: string,
    materialName: string,
    systemStock: number,
    physicalStock: number,
    difference: number
  }]
}
```

---

## 🔗 Integration Points

### 1. Recipe → Product
- Setiap recipe otomatis membuat/link ke product
- Product cost dihitung dari recipe ingredients
- Product stock diupdate saat production complete

### 2. Recipe → Raw Materials
- Recipe ingredients link ke raw materials inventory
- Material availability checked before production
- Material stock consumed during production

### 3. Production → Inventory
**When Production Starts:**
- Reserve raw materials
- Create production batch record
- Status: 'in-progress'

**When Production Completes:**
- Deduct raw materials from stock
- Add finished goods to stock
- Update product cost (if material costs changed)
- Status: 'completed'

### 4. Stock Opname → Recipe Products
**For Recipe Products:**
- Count finished goods stock
- Count raw materials stock
- Calculate differences for both
- Adjust both finished goods and raw materials

**Adjustment Flow:**
```
Physical Count ≠ System Stock
    ↓
Calculate Difference
    ↓
For Recipe Products:
    - Adjust finished goods stock
    - Check if raw materials need adjustment
    - Update recipe cost if material costs changed
    ↓
Generate Adjustment Report
```

---

## 📝 Usage Examples

### Example 1: Create Recipe Product
```typescript
// 1. Create Recipe
Recipe: "Roti Tawar Premium"
Ingredients:
  - Tepung Terigu: 5 kg
  - Gula: 0.5 kg
  - Mentega: 0.3 kg
Batch Size: 10 loaf
Total Cost: Rp 109,200
Cost per Unit: Rp 10,920

// 2. Product Auto-Created
Product: "Roti Tawar Premium"
SKU: PRD-ROTI-001
Cost: Rp 10,920
Price: Rp 15,000 (markup 37%)
Stock: 0 (until production)
```

### Example 2: Production Process
```typescript
// 1. Start Production
Recipe: "Roti Tawar Premium"
Planned: 50 loaf (5 batches)
Materials Required:
  - Tepung: 25 kg (available: 500 kg) ✓
  - Gula: 2.5 kg (available: 300 kg) ✓
  - Mentega: 1.5 kg (available: 100 kg) ✓

// 2. During Production
Status: In Progress
Produced: 35 loaf
Materials Used:
  - Tepung: 17.5 kg
  - Gula: 1.75 kg
  - Mentega: 1.05 kg

// 3. Complete Production
Status: Completed
Produced: 50 loaf
Materials Consumed:
  - Tepung: 25 kg (new stock: 475 kg)
  - Gula: 2.5 kg (new stock: 297.5 kg)
  - Mentega: 1.5 kg (new stock: 98.5 kg)
Product Stock: +50 loaf
```

### Example 3: Stock Opname with Recipe Product
```typescript
// Stock Opname
Product: "Roti Tawar Premium"
System Stock: 50 loaf
Physical Count: 48 loaf
Difference: -2 loaf

Raw Materials Check:
  - Tepung: System 475 kg, Physical 470 kg, Diff: -5 kg
  - Gula: System 297.5 kg, Physical 295 kg, Diff: -2.5 kg
  - Mentega: System 98.5 kg, Physical 98 kg, Diff: -0.5 kg

Adjustment:
  - Finished Goods: -2 loaf
  - Raw Materials: Adjusted based on physical count
  - Cost Recalculation: If material costs changed
```

---

## 🎯 Key Features

### 1. Automatic Cost Calculation
- Recipe cost = Σ(ingredient quantity × ingredient cost)
- Product cost = Recipe cost ÷ batch size
- Auto-update when material costs change

### 2. Material Availability Check
- Before production: Check if materials sufficient
- Show max batches possible
- Alert on low stock materials

### 3. Production Tracking
- Real-time material consumption
- Batch progress monitoring
- Yield tracking (planned vs actual)

### 4. Stock Synchronization
- Finished goods stock
- Raw materials stock
- Automatic adjustments
- Audit trail

### 5. Cost Tracking
- Production cost per batch
- Material cost variance
- Profit margin calculation
- Historical cost data

---

## 📋 Reports Available

### 1. Production Report
- Total batches produced
- Material consumption
- Production costs
- Yield analysis

### 2. Recipe Costing Report
- Cost breakdown per ingredient
- Cost per unit
- Profit margin
- Price recommendations

### 3. Material Usage Report
- Materials consumed by recipe
- Usage trends
- Waste analysis
- Reorder recommendations

### 4. Stock Opname Report
- Finished goods adjustments
- Raw materials adjustments
- Variance analysis
- Cost impact

---

## 🔧 Configuration

### Recipe Settings
- Default markup percentage
- Batch size units
- Preparation time tracking
- Yield tolerance

### Production Settings
- Material reservation period
- Batch numbering format
- Quality check requirements
- Completion approval workflow

### Stock Opname Settings
- Opname frequency
- Variance tolerance
- Auto-adjustment threshold
- Approval requirements

---

## 🚀 Best Practices

### 1. Recipe Management
- Keep recipes updated with current costs
- Review recipes quarterly
- Document preparation steps
- Track recipe versions

### 2. Production Planning
- Check material availability daily
- Plan production based on demand
- Monitor yield percentages
- Track production time

### 3. Stock Control
- Regular stock opname (weekly/monthly)
- Immediate adjustment for variances
- Investigate significant differences
- Maintain audit trail

### 4. Cost Management
- Update material costs regularly
- Review product pricing
- Monitor profit margins
- Analyze cost trends

---

## 📱 Mobile Integration (Future)
- Mobile stock counting
- Production progress updates
- Material scanning
- Real-time notifications

---

## 🔐 Security & Permissions
- Recipe view/edit permissions
- Production start/complete approval
- Stock adjustment approval
- Cost data access control

---

## 📞 Support
For questions or issues, contact the development team.
