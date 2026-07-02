# Analisa Fitur Manajemen HPP (Harga Pokok Penjualan)

## 📋 Overview
Fitur untuk mengelola HPP (Cost of Goods Sold / COGS) pada produk, termasuk tracking komponen biaya, margin profit, dan analisa profitabilitas.

---

## 🎯 Business Requirements

### **A. HPP Components**
1. **Direct Costs (Biaya Langsung)**
   - Harga beli bahan baku (purchase price)
   - Biaya produksi langsung
   - Biaya packaging
   - Biaya tenaga kerja langsung

2. **Indirect Costs (Biaya Tidak Langsung)**
   - Overhead produksi
   - Utilities (listrik, air)
   - Depreciation equipment
   - Storage costs

3. **Calculation Methods**
   - FIFO (First In First Out)
   - LIFO (Last In First Out)
   - Average Cost
   - Standard Cost

### **B. HPP Features**
1. **HPP Calculation**
   - Auto-calculate dari purchase orders
   - Manual input untuk custom products
   - Recipe-based calculation (untuk produk rakitan)
   - Multi-component tracking

2. **Margin Analysis**
   - Gross margin (Selling Price - HPP)
   - Margin percentage
   - Markup percentage
   - Break-even analysis

3. **HPP History**
   - Track HPP changes over time
   - Compare HPP trends
   - Identify cost increases
   - Audit trail

4. **Reporting**
   - HPP by product
   - HPP by category
   - Profitability analysis
   - Cost variance reports

---

## 📊 Database Schema

### **1. Update Table: `products`**
Add HPP-related fields to existing products table:
```sql
ALTER TABLE products
ADD COLUMN hpp DECIMAL(15,2) DEFAULT 0,
ADD COLUMN hpp_method VARCHAR(20) DEFAULT 'average', -- 'fifo', 'lifo', 'average', 'standard'
ADD COLUMN last_purchase_price DECIMAL(15,2),
ADD COLUMN average_purchase_price DECIMAL(15,2),
ADD COLUMN standard_cost DECIMAL(15,2),
ADD COLUMN margin_amount DECIMAL(15,2),
ADD COLUMN margin_percentage DECIMAL(5,2),
ADD COLUMN markup_percentage DECIMAL(5,2),
ADD COLUMN min_margin_percentage DECIMAL(5,2) DEFAULT 20,
ADD COLUMN packaging_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN labor_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN overhead_cost DECIMAL(15,2) DEFAULT 0;

CREATE INDEX idx_products_hpp ON products(hpp);
CREATE INDEX idx_products_margin ON products(margin_percentage);
```

### **2. Table: `product_cost_history`**
Track HPP changes over time:
```sql
CREATE TABLE product_cost_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Cost Details
  old_hpp DECIMAL(15,2),
  new_hpp DECIMAL(15,2),
  change_amount DECIMAL(15,2),
  change_percentage DECIMAL(5,2),
  
  -- Cost Breakdown
  purchase_price DECIMAL(15,2),
  packaging_cost DECIMAL(15,2),
  labor_cost DECIMAL(15,2),
  overhead_cost DECIMAL(15,2),
  
  -- Reason & Source
  change_reason VARCHAR(255), -- 'purchase', 'adjustment', 'recipe_update', 'manual'
  source_reference VARCHAR(100), -- PO number, adjustment ID, etc.
  notes TEXT,
  
  -- Audit
  changed_by UUID REFERENCES employees(id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_history_product ON product_cost_history(product_id);
CREATE INDEX idx_cost_history_date ON product_cost_history(changed_at);
```

### **3. Table: `product_cost_components`**
Detailed cost breakdown for complex products:
```sql
CREATE TABLE product_cost_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  component_type VARCHAR(50) NOT NULL, -- 'material', 'packaging', 'labor', 'overhead', 'other'
  component_name VARCHAR(255) NOT NULL,
  component_description TEXT,
  
  cost_amount DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  unit VARCHAR(20),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cost_components_product ON product_cost_components(product_id);
CREATE INDEX idx_cost_components_type ON product_cost_components(component_type);
```

### **4. Integration dengan Purchase Orders**
Update `purchase_order_items` untuk auto-calculate HPP:
```sql
ALTER TABLE purchase_order_items
ADD COLUMN affects_hpp BOOLEAN DEFAULT TRUE,
ADD COLUMN unit_cost DECIMAL(15,2);
```

---

## 🔌 API Endpoints

### **A. HPP Management APIs**

#### **1. GET /api/products/:id/hpp**
Get detailed HPP information for a product
```typescript
Response:
{
  success: true,
  data: {
    productId: "uuid",
    productName: "Product A",
    currentHpp: 50000,
    hppMethod: "average",
    
    costBreakdown: {
      purchasePrice: 40000,
      packagingCost: 5000,
      laborCost: 3000,
      overheadCost: 2000,
      total: 50000
    },
    
    pricing: {
      sellingPrice: 75000,
      marginAmount: 25000,
      marginPercentage: 33.33,
      markupPercentage: 50
    },
    
    components: [
      {
        type: "material",
        name: "Bahan Baku A",
        cost: 40000,
        quantity: 1,
        unit: "kg"
      }
    ],
    
    history: [
      {
        date: "2026-02-01",
        oldHpp: 48000,
        newHpp: 50000,
        changePercentage: 4.17,
        reason: "purchase"
      }
    ]
  }
}
```

#### **2. PUT /api/products/:id/hpp**
Update product HPP
```typescript
Body:
{
  hpp?: 50000,
  hppMethod?: "average" | "fifo" | "lifo" | "standard",
  packagingCost?: 5000,
  laborCost?: 3000,
  overheadCost?: 2000,
  standardCost?: 50000,
  minMarginPercentage?: 20,
  reason?: "Manual adjustment",
  notes?: "Updated based on new supplier price"
}

Response:
{
  success: true,
  data: {
    productId: "uuid",
    oldHpp: 48000,
    newHpp: 50000,
    changePercentage: 4.17
  }
}
```

#### **3. POST /api/products/:id/hpp/calculate**
Auto-calculate HPP based on method
```typescript
Body:
{
  method: "average" | "fifo" | "lifo",
  includePurchaseOrders?: true,
  includeRecipe?: true
}

Response:
{
  success: true,
  data: {
    calculatedHpp: 50000,
    method: "average",
    breakdown: {...}
  }
}
```

#### **4. GET /api/products/hpp/analysis**
Get HPP analysis for all products
```typescript
Query params:
- categoryId?: string
- minMargin?: number
- maxMargin?: number
- sortBy?: "margin" | "hpp" | "name"

Response:
{
  success: true,
  data: [
    {
      productId: "uuid",
      productName: "Product A",
      hpp: 50000,
      sellingPrice: 75000,
      marginPercentage: 33.33,
      status: "healthy" | "warning" | "critical"
    }
  ],
  summary: {
    totalProducts: 100,
    averageMargin: 35.5,
    lowMarginCount: 5,
    negativeMarginCount: 2
  }
}
```

#### **5. POST /api/products/:id/hpp/components**
Add cost component
```typescript
Body:
{
  componentType: "material" | "packaging" | "labor" | "overhead",
  componentName: "Bahan Baku A",
  costAmount: 40000,
  quantity: 1,
  unit: "kg"
}
```

#### **6. GET /api/products/:id/hpp/history**
Get HPP change history

#### **7. POST /api/products/hpp/bulk-update**
Bulk update HPP for multiple products
```typescript
Body:
{
  updates: [
    {
      productId: "uuid",
      hpp: 50000,
      reason: "Supplier price increase"
    }
  ]
}
```

---

## 🎨 Frontend Features

### **1. Product Management Page Enhancement**
Add HPP section to existing product form:

**HPP Tab/Section:**
- HPP input field
- HPP method selector
- Cost breakdown inputs:
  - Purchase price (auto-filled from PO)
  - Packaging cost
  - Labor cost
  - Overhead cost
- Auto-calculated total HPP
- Margin calculator:
  - Selling price input
  - Margin amount (auto-calculated)
  - Margin % (auto-calculated)
  - Markup % (auto-calculated)
- Min margin warning
- Cost components table

**Components:**
- `HppForm.tsx` - HPP input form
- `MarginCalculator.tsx` - Interactive margin calculator
- `CostBreakdown.tsx` - Visual cost breakdown
- `CostComponentsList.tsx` - Manage cost components
- `HppHistory.tsx` - Show HPP changes over time

### **2. New Page: `/products/hpp-analysis`**
HPP Analysis Dashboard

**Features:**
- Summary cards:
  - Average margin
  - Products with low margin
  - Products with negative margin
  - Total products analyzed
- Products table with HPP details
- Filters:
  - Category
  - Margin range
  - HPP range
- Sort options
- Export to Excel
- Visual charts:
  - Margin distribution
  - HPP trends
  - Top/bottom performers

**Components:**
- `HppAnalysisDashboard.tsx` - Main dashboard
- `MarginDistributionChart.tsx` - Chart component
- `ProductHppTable.tsx` - Data table
- `HppFilters.tsx` - Filter controls

### **3. Integration Points**

#### **Purchase Order Integration**
- Auto-update HPP saat PO received
- Show HPP impact preview
- Option to apply/skip HPP update

#### **Recipe Integration**
- Calculate HPP from recipe ingredients
- Auto-update saat ingredient cost changes
- Show cost breakdown by ingredient

#### **POS Integration**
- Show margin info saat add to cart
- Alert untuk products dengan low margin
- Discount limit based on margin

---

## 🔄 Business Flows

### **Flow 1: Manual HPP Entry**
1. User buka product edit form
2. Input HPP components (purchase, packaging, labor, overhead)
3. System auto-calculate total HPP
4. Calculate margin based on selling price
5. Show warning jika margin < minimum
6. Save → Create history record

### **Flow 2: Auto HPP from Purchase Order**
1. PO received & goods receipt created
2. System calculate average purchase price
3. Update product HPP based on method (FIFO/LIFO/Average)
4. Create cost history record
5. Notify jika ada significant change
6. Update margin calculations

### **Flow 3: Recipe-based HPP**
1. Product has recipe dengan ingredients
2. Calculate total ingredient cost
3. Add packaging + labor + overhead
4. Set as product HPP
5. Auto-update saat ingredient cost changes

### **Flow 4: HPP Analysis**
1. User buka HPP Analysis page
2. View all products dengan margin info
3. Filter low margin products
4. Identify products needing price adjustment
5. Bulk update prices or HPP
6. Export report

---

## 📊 Calculations

### **1. HPP Calculation Methods**

**Average Cost:**
```
HPP = Total Cost of Inventory / Total Quantity
```

**FIFO (First In First Out):**
```
HPP = Cost of oldest inventory first
```

**LIFO (Last In First Out):**
```
HPP = Cost of newest inventory first
```

**Standard Cost:**
```
HPP = Predetermined standard cost (manual)
```

### **2. Margin Calculations**

**Margin Amount:**
```
Margin = Selling Price - HPP
```

**Margin Percentage:**
```
Margin % = (Margin / Selling Price) × 100
```

**Markup Percentage:**
```
Markup % = (Margin / HPP) × 100
```

**Break-even Price:**
```
Break-even = HPP / (1 - Desired Margin %)
```

---

## 🎯 Implementation Priority

### **Phase 1: Core HPP** (Immediate)
- ✅ Database schema updates
- ✅ Add HPP fields to products table
- ✅ Create cost history table
- ✅ Basic API endpoints
- ✅ Update product form dengan HPP section
- ✅ Margin calculator

### **Phase 2: Advanced Features** (Next)
- Cost components management
- HPP analysis dashboard
- Auto-calculation from PO
- Recipe integration
- Bulk operations

### **Phase 3: Analytics** (Future)
- Advanced reports
- Cost trends analysis
- Profitability forecasting
- Price optimization suggestions

---

## 🔧 Technical Considerations

1. **Data Accuracy**
   - Validate all cost inputs
   - Prevent negative HPP
   - Alert untuk unusual changes
   - Audit trail untuk semua changes

2. **Performance**
   - Index pada HPP fields
   - Cache calculated margins
   - Batch updates untuk bulk operations
   - Async processing untuk large datasets

3. **Integration**
   - Sync dengan purchase orders
   - Update dari recipe changes
   - Real-time margin calculations
   - Export capabilities

4. **Business Rules**
   - Minimum margin enforcement
   - Price change approval workflow
   - Cost variance thresholds
   - Alert notifications

---

## 📈 Benefits

1. **Better Pricing Decisions**
   - Know exact product costs
   - Set profitable prices
   - Identify loss-making products

2. **Cost Control**
   - Track cost changes
   - Identify cost increases early
   - Negotiate better with suppliers

3. **Profitability Analysis**
   - Understand margin by product
   - Focus on high-margin products
   - Optimize product mix

4. **Financial Accuracy**
   - Accurate COGS reporting
   - Better inventory valuation
   - Improved financial statements

---

**Status:** Ready for implementation
**Estimated Time:** 4-6 hours for Phase 1
