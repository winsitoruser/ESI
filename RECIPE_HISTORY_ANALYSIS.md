# 📊 Recipe History & Inactive Recipes - Complete Analysis

**Date:** 26 Jan 2026, 05:45 PM  
**Objective:** Create complete history/inactive recipes viewing system

---

## 🔍 CURRENT STATE ANALYSIS

### **1. Database Schema (Models)**

#### **Recipe Model** (`/models/Recipe.js`)
```javascript
Fields:
- id (PK)
- code (unique)
- name
- description
- status (ENUM: 'active', 'draft', 'archived') ✅
- version (INTEGER, default: 1) ✅
- total_cost
- cost_per_unit
- batch_size
- batch_unit
- created_at
- updated_at

Associations:
- hasMany RecipeIngredient
- hasMany RecipeHistory ✅
- belongsTo Product
```

#### **RecipeHistory Model** (`/models/RecipeHistory.js`)
```javascript
Fields:
- id (PK)
- recipe_id (FK)
- version
- change_type (ENUM: 'created', 'updated', 'archived', 'restored') ✅
- changed_by (FK to User)
- changes_summary (TEXT)
- changes_json (JSONB) - Full snapshot
- snapshot_data (JSONB) - Recipe data at that point
- created_at

Associations:
- belongsTo Recipe
- belongsTo User (changedBy)
```

**Status:** ✅ Models exist and properly structured

---

### **2. Backend API**

#### **Existing Endpoints:**

**GET /api/recipes**
- Returns active recipes only
- No filter for archived/inactive
- ❌ Missing: status filter parameter

**GET /api/recipes/[id]**
- Returns single recipe
- ✅ Has status field

**GET /api/recipes/[id]/history**
- Returns history for specific recipe
- ✅ Exists but need to verify implementation

**Missing Endpoints:**
- ❌ GET /api/recipes/history (all history entries)
- ❌ GET /api/recipes/archived (archived recipes)
- ❌ GET /api/recipes/inactive (inactive/past recipes)

---

### **3. Frontend**

#### **Existing Pages:**

**`/inventory/recipes`** (Main page)
- Shows active recipes
- Has "Riwayat" button per recipe
- ❌ No dedicated history/archive view
- ❌ No filter for status

**`/inventory/recipes/new`** (Create page)
- ✅ Working

**Missing Pages:**
- ❌ `/inventory/recipes/history` (All history)
- ❌ `/inventory/recipes/archived` (Archived recipes)
- ❌ Recipe detail history modal/page

---

## 🎯 REQUIRED FEATURES

### **1. View All Recipe History**
- Timeline of all changes across all recipes
- Filter by recipe, date, change type
- Show who made changes
- Display before/after snapshots

### **2. View Inactive/Archived Recipes**
- List of archived recipes
- Ability to restore
- View full details
- See why archived (history)

### **3. View Individual Recipe History**
- Version timeline
- Compare versions
- Restore previous version
- Download historical data

---

## 🏗️ IMPLEMENTATION PLAN

### **Phase 1: Backend API** ✅

#### **A. Enhance GET /api/recipes**
Add query parameters:
```javascript
GET /api/recipes?status=active|archived|draft
GET /api/recipes?include_history=true
```

#### **B. Create GET /api/recipes/history**
```javascript
// Returns all history entries
GET /api/recipes/history
Query params:
- recipe_id (optional)
- change_type (optional)
- date_from, date_to (optional)
- limit, offset (pagination)

Response:
{
  success: true,
  data: [
    {
      id: 1,
      recipe_id: 5,
      recipe_name: "Roti Tawar",
      recipe_code: "RCP-001",
      version: 2,
      change_type: "updated",
      changed_by: 1,
      changed_by_name: "Admin",
      changes_summary: "Updated batch size",
      created_at: "2026-01-26T10:00:00Z",
      snapshot_data: {...}
    }
  ],
  pagination: {
    total: 50,
    page: 1,
    limit: 20
  }
}
```

#### **C. Enhance GET /api/recipes/[id]/history**
Add comparison feature:
```javascript
GET /api/recipes/[id]/history?compare=true&version1=1&version2=2
```

---

### **Phase 2: Frontend Pages** 📱

#### **A. Recipe History Page**
**Path:** `/pages/inventory/recipes/history.tsx`

**Features:**
- Timeline view of all changes
- Filter by recipe, date, type
- Search functionality
- Expandable details
- Restore action
- Export history

**Layout:**
```
┌─────────────────────────────────────┐
│  Recipe History & Changes           │
├─────────────────────────────────────┤
│  [Filters: Recipe | Type | Date]    │
├─────────────────────────────────────┤
│  Timeline:                          │
│  ○ 26 Jan 2026, 10:00              │
│    Roti Tawar (v2) - Updated       │
│    by Admin                         │
│    [View Details] [Compare]         │
│                                     │
│  ○ 25 Jan 2026, 15:30              │
│    Kue Lapis (v1) - Created        │
│    by User                          │
│    [View Details]                   │
└─────────────────────────────────────┘
```

#### **B. Archived Recipes Page**
**Path:** `/pages/inventory/recipes/archived.tsx`

**Features:**
- List of archived recipes
- Reason for archiving
- Restore functionality
- View history
- Permanent delete (admin only)

**Layout:**
```
┌─────────────────────────────────────┐
│  Archived Recipes                   │
├─────────────────────────────────────┤
│  [Search] [Filter by Date]          │
├─────────────────────────────────────┤
│  Card: Roti Tawar (RCP-001)        │
│  Archived: 20 Jan 2026              │
│  Reason: Replaced by new formula    │
│  [Restore] [View History] [Delete]  │
│                                     │
│  Card: Kue Bolu (RCP-005)          │
│  Archived: 15 Jan 2026              │
│  Reason: Discontinued product       │
│  [Restore] [View History] [Delete]  │
└─────────────────────────────────────┘
```

#### **C. Recipe Detail History Modal**
**Component:** `/components/inventory/RecipeHistoryModal.tsx`

**Features:**
- Version comparison
- Visual diff
- Restore specific version
- Download snapshot

---

### **Phase 3: Integration Flow** 🔄

#### **Flow 1: View All History**
```
User clicks "History" tab
  ↓
Frontend: GET /api/recipes/history
  ↓
Backend: Query RecipeHistory with joins
  ↓
Return: History entries with recipe info
  ↓
Frontend: Display timeline
```

#### **Flow 2: View Archived Recipes**
```
User clicks "Archived" tab
  ↓
Frontend: GET /api/recipes?status=archived
  ↓
Backend: Query Recipe WHERE status='archived'
  ↓
Return: Archived recipes list
  ↓
Frontend: Display cards with restore option
```

#### **Flow 3: Restore Recipe**
```
User clicks "Restore" on archived recipe
  ↓
Frontend: PUT /api/recipes/[id]/restore
  ↓
Backend: 
  - Update Recipe.status = 'active'
  - Create RecipeHistory entry (change_type='restored')
  - Increment version
  ↓
Return: Success message
  ↓
Frontend: Refresh list, show success alert
```

#### **Flow 4: View Recipe History**
```
User clicks "Riwayat" on recipe card
  ↓
Frontend: GET /api/recipes/[id]/history
  ↓
Backend: Query RecipeHistory WHERE recipe_id=[id]
  ↓
Return: Version timeline
  ↓
Frontend: Display modal with versions
```

---

## 📋 DATABASE QUERIES

### **Query 1: Get All History**
```sql
SELECT 
  rh.id,
  rh.recipe_id,
  r.name as recipe_name,
  r.code as recipe_code,
  rh.version,
  rh.change_type,
  rh.changed_by,
  u.name as changed_by_name,
  rh.changes_summary,
  rh.snapshot_data,
  rh.created_at
FROM recipe_history rh
LEFT JOIN recipes r ON rh.recipe_id = r.id
LEFT JOIN users u ON rh.changed_by = u.id
ORDER BY rh.created_at DESC
LIMIT 20 OFFSET 0;
```

### **Query 2: Get Archived Recipes**
```sql
SELECT 
  r.*,
  (SELECT created_at 
   FROM recipe_history 
   WHERE recipe_id = r.id 
   AND change_type = 'archived' 
   ORDER BY created_at DESC 
   LIMIT 1) as archived_at,
  (SELECT changes_summary 
   FROM recipe_history 
   WHERE recipe_id = r.id 
   AND change_type = 'archived' 
   ORDER BY created_at DESC 
   LIMIT 1) as archive_reason
FROM recipes r
WHERE r.status = 'archived'
ORDER BY r.updated_at DESC;
```

### **Query 3: Get Recipe History**
```sql
SELECT 
  rh.*,
  u.name as changed_by_name
FROM recipe_history rh
LEFT JOIN users u ON rh.changed_by = u.id
WHERE rh.recipe_id = ?
ORDER BY rh.version DESC;
```

---

## 🎨 UI/UX DESIGN

### **Color Scheme:**
- Active: Green (#10B981)
- Archived: Gray (#6B7280)
- Draft: Yellow (#F59E0B)
- Created: Blue (#3B82F6)
- Updated: Purple (#8B5CF6)
- Restored: Teal (#14B8A6)

### **Icons:**
- History: FaHistory
- Archived: FaArchive
- Restore: FaUndo
- Compare: FaCodeBranch
- Timeline: FaStream
- Version: FaTag

---

## ✅ IMPLEMENTATION CHECKLIST

### **Backend:**
- [ ] Create GET /api/recipes/history endpoint
- [ ] Add status filter to GET /api/recipes
- [ ] Create PUT /api/recipes/[id]/restore endpoint
- [ ] Add comparison to GET /api/recipes/[id]/history
- [ ] Test all endpoints

### **Frontend:**
- [ ] Create /pages/inventory/recipes/history.tsx
- [ ] Create /pages/inventory/recipes/archived.tsx
- [ ] Create RecipeHistoryModal component
- [ ] Add tabs to main recipes page
- [ ] Implement restore functionality
- [ ] Add version comparison UI

### **Integration:**
- [ ] Connect history page to API
- [ ] Connect archived page to API
- [ ] Test restore flow
- [ ] Test history viewing
- [ ] Add error handling
- [ ] Add loading states

---

## 🚀 PRIORITY ORDER

1. **High Priority:**
   - GET /api/recipes/history endpoint
   - Archived recipes page
   - Restore functionality

2. **Medium Priority:**
   - History timeline page
   - Version comparison
   - Filter/search

3. **Low Priority:**
   - Export history
   - Permanent delete
   - Advanced analytics

---

**Next Step:** Start implementation with backend API endpoints
