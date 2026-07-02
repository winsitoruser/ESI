# Grouped Sidebar Menu - Implementation Guide

## ✅ SIDEBAR SUDAH DIKELOMPOKKAN!

Sidebar menu sekarang dikelompokkan menjadi 3 kategori utama dengan section headers.

---

## 📋 STRUKTUR MENU BARU

### **1. OUTLET** (Operasi Harian)
Menu untuk operasional outlet sehari-hari:
- ✅ **Dasbor** - Dashboard overview
- ✅ **Kasir** - Point of Sale / Cashier
- ✅ **Inventori** - Inventory management
- ✅ **Pelanggan** - Customer management
- ✅ **Jadwal & Shift** - Employee scheduling
- ✅ **Program Loyalitas** - Loyalty program

### **2. OPERASIONAL** (Fitur Tambahan)
Menu untuk fitur operasional tambahan:
- ✅ **Manajemen Meja** - Table management
- ✅ **Reservasi** - Reservation system
- ✅ **Promo & Voucher** - Promotions and vouchers

### **3. BACKOFFICE** (Administrasi)
Menu untuk administrasi dan reporting:
- ✅ **Keuangan** - Finance management
- ✅ **Laporan** - Reports and analytics
- ✅ **Pengaturan** - System settings

---

## 🎨 VISUAL DESIGN

### **Expanded Sidebar:**
```
┌─────────────────────────┐
│ BEDAGANG               │
├─────────────────────────┤
│                         │
│ OUTLET                  │ ← Section Header
│ 📊 Dasbor              │
│ 🛒 Kasir               │
│ 📦 Inventori           │
│ 👥 Pelanggan           │
│ 📆 Jadwal & Shift      │
│ 🏆 Program Loyalitas   │
│                         │
│ OPERASIONAL             │ ← Section Header
│ 🍽️ Manajemen Meja      │
│ 📅 Reservasi           │
│ 🎫 Promo & Voucher     │
│                         │
│ BACKOFFICE              │ ← Section Header
│ 💰 Keuangan            │
│ 📈 Laporan             │
│ ⚙️ Pengaturan          │
│                         │
├─────────────────────────┤
│ User Info & Logout      │
└─────────────────────────┘
```

### **Collapsed Sidebar:**
```
┌───┐
│ B │
├───┤
│ 📊│
│ 🛒│
│ 📦│
│ 👥│
│ 📆│
│ 🏆│
├───┤ ← Divider between groups
│ 🍽️│
│ 📅│
│ 🎫│
├───┤ ← Divider between groups
│ 💰│
│ 📈│
│ ⚙️│
├───┤
│ U │
└───┘
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### **Menu Structure:**

```typescript
const menuGroups = [
  {
    title: 'OUTLET',
    items: [
      { code: 'dashboard', icon: LayoutDashboard, label: 'Dasbor', href: '/dashboard' },
      { code: 'pos', icon: ShoppingCart, label: 'Kasir', href: '/pos' },
      { code: 'inventory', icon: Package, label: 'Inventori', href: '/inventory' },
      { code: 'customers', icon: Users, label: 'Pelanggan', href: '/customers' },
      { code: 'employees', icon: CalendarDays, label: 'Jadwal & Shift', href: '/employees/schedules' },
      { code: 'loyalty', icon: Award, label: 'Program Loyalitas', href: '/loyalty-program' },
    ]
  },
  {
    title: 'OPERASIONAL',
    items: [
      { code: 'tables', icon: Utensils, label: 'Manajemen Meja', href: '/tables' },
      { code: 'reservations', icon: Calendar, label: 'Reservasi', href: '/reservations' },
      { code: 'promo', icon: Ticket, label: 'Promo & Voucher', href: '/promo-voucher' },
    ]
  },
  {
    title: 'BACKOFFICE',
    items: [
      { code: 'finance', icon: Wallet, label: 'Keuangan', href: '/finance' },
      { code: 'reports', icon: BarChart3, label: 'Laporan', href: '/reports' },
      { code: 'settings', icon: Settings, label: 'Pengaturan', href: '/settings' },
    ]
  }
];
```

### **Filtering Logic:**

```typescript
const filteredMenuGroups = menuGroups.map(group => ({
  ...group,
  items: configLoading
    ? group.items // Show all during loading
    : isOwnerOrSuperAdmin
      ? group.items // Owner and super_admin see ALL menus
      : group.items.filter(item => hasModule(item.code)) // Others filtered by modules
})).filter(group => group.items.length > 0); // Remove empty groups
```

### **Rendering:**

```typescript
{filteredMenuGroups.map((group, groupIndex) => (
  <div key={groupIndex}>
    {/* Section Header (only when expanded) */}
    {!sidebarCollapsed && (
      <div className="px-4 mb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {group.title}
        </h3>
      </div>
    )}
    
    {/* Divider (only when collapsed, between groups) */}
    {sidebarCollapsed && groupIndex > 0 && (
      <div className="my-2 border-t border-gray-200"></div>
    )}
    
    {/* Menu Items */}
    <div className="space-y-1">
      {group.items.map((item) => (
        <Link key={item.href} href={item.href}>
          {/* Menu item rendering */}
        </Link>
      ))}
    </div>
  </div>
))}
```

---

## 🎯 FEATURES

### **Section Headers:**
- ✅ Displayed only when sidebar is expanded
- ✅ Uppercase text with gray color
- ✅ Clear visual separation between groups
- ✅ Helps users understand menu organization

### **Dividers (Collapsed State):**
- ✅ Thin horizontal lines between groups
- ✅ Only shown when sidebar is collapsed
- ✅ Provides visual grouping without text

### **Smart Filtering:**
- ✅ Groups with no items are hidden
- ✅ Module-based filtering still works
- ✅ Owner/super_admin see all groups
- ✅ Empty groups automatically removed

### **Responsive Design:**
- ✅ Works on desktop and mobile
- ✅ Smooth transitions between states
- ✅ Tooltips on collapsed state
- ✅ Touch-friendly on mobile

---

## 🚀 HOW TO USE

### **View Grouped Sidebar:**

1. **Login:**
   ```
   http://localhost:3001/auth/login
   Email: fullaccess@bedagang.com
   Password: fullaccess123
   ```

2. **Navigate to any page**

3. **Check sidebar:**
   - See section headers: OUTLET, OPERASIONAL, BACKOFFICE
   - Menus grouped under each section
   - Clear visual organization

### **Toggle Sidebar:**

**Expand/Collapse:**
- Click arrow button on sidebar edge
- Expanded: Shows section headers + menu labels
- Collapsed: Shows dividers + icons only

---

## 📊 MENU GROUPING LOGIC

### **Why This Grouping?**

**OUTLET (Daily Operations):**
- Core features for daily business operations
- Most frequently used menus
- Direct customer/sales interaction

**OPERASIONAL (Additional Features):**
- Supporting operational features
- Restaurant/service-specific features
- Less frequent but important

**BACKOFFICE (Administration):**
- Management and reporting
- Financial oversight
- System configuration
- Used by managers/owners

---

## 🎨 STYLING DETAILS

### **Section Headers:**
```css
- Font: 12px, semibold
- Color: Gray-400
- Transform: Uppercase
- Spacing: Tracking-wider
- Padding: 16px horizontal, 8px bottom
```

### **Dividers:**
```css
- Border: 1px solid gray-200
- Margin: 8px vertical
- Only shown when collapsed
- Between groups only
```

### **Menu Items:**
```css
- Padding: 12px vertical, 16px horizontal
- Border radius: 8px
- Hover: Gray-50 background
- Active: Sky-50 background, Sky-600 text
- Transition: All properties smooth
```

---

## 🔄 CUSTOMIZATION

### **Add New Menu to Group:**

```typescript
// In DashboardLayout.tsx
{
  title: 'OUTLET',
  items: [
    // ... existing items
    { code: 'newmenu', icon: NewIcon, label: 'New Menu', href: '/newmenu' },
  ]
}
```

### **Add New Group:**

```typescript
{
  title: 'NEW GROUP',
  items: [
    { code: 'menu1', icon: Icon1, label: 'Menu 1', href: '/menu1' },
    { code: 'menu2', icon: Icon2, label: 'Menu 2', href: '/menu2' },
  ]
}
```

### **Change Group Order:**

Simply reorder the groups in the `menuGroups` array.

---

## ✅ BENEFITS

### **Better Organization:**
- ✅ Clear categorization of features
- ✅ Easier to find specific menus
- ✅ Logical grouping by function

### **Improved UX:**
- ✅ Reduced cognitive load
- ✅ Faster navigation
- ✅ Professional appearance

### **Scalability:**
- ✅ Easy to add new menus
- ✅ Easy to add new groups
- ✅ Maintains clean structure

### **Flexibility:**
- ✅ Works with module filtering
- ✅ Works with role-based access
- ✅ Adapts to collapsed state

---

## 🐛 TROUBLESHOOTING

### **Section headers not showing:**
- Check if sidebar is expanded (not collapsed)
- Section headers only show when expanded

### **Dividers not showing:**
- Dividers only show when sidebar is collapsed
- Only between groups, not within groups

### **Empty groups:**
- Groups with no items are automatically hidden
- Check module filtering
- Verify user has access to at least one item in group

---

## 📝 FILES MODIFIED

**Main File:**
- `components/layouts/DashboardLayout.tsx`

**Changes:**
1. ✅ Replaced flat `allMenuItems` with grouped `menuGroups`
2. ✅ Updated filtering logic for groups
3. ✅ Added section header rendering
4. ✅ Added divider rendering for collapsed state
5. ✅ Updated page title logic to work with groups

---

## 🎉 RESULT

**Before:**
- Flat list of 12 menus
- No organization
- Hard to scan

**After:**
- 3 clear groups
- Section headers
- Easy to navigate
- Professional look

---

## 🚀 NEXT STEPS

**To see the grouped sidebar:**

1. **Hard refresh browser:**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

2. **Login if needed:**
   ```
   Email: fullaccess@bedagang.com
   Password: fullaccess123
   ```

3. **Check sidebar:**
   - Look for section headers
   - Verify menu grouping
   - Test collapse/expand

---

**Grouped sidebar is now live!** 🎊

**Structure:**
- 📦 **OUTLET** - 6 menus
- 🔧 **OPERASIONAL** - 3 menus  
- 💼 **BACKOFFICE** - 3 menus

**Total: 12 menus organized in 3 groups!**
