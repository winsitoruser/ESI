# Settings Module - Testing Checklist

## 📋 **COMPREHENSIVE TESTING GUIDE**

**Date:** February 4, 2026  
**Module:** Settings Module  
**Total Tests:** 70+ test cases

---

## ✅ **PRE-TESTING SETUP**

### **1. Database Migration**
- [ ] Run migration SQL: `migrations/settings_module_tables.sql`
- [ ] Verify 7 tables created successfully
- [ ] Verify default data inserted (roles, units)
- [ ] Verify indexes created
- [ ] Verify triggers created

### **2. Server Setup**
- [ ] Restart Next.js server
- [ ] Clear browser cache
- [ ] Login as admin user
- [ ] Navigate to `/settings`

---

## 🏪 **STORE SETTINGS TESTING**

**URL:** `http://localhost:3001/settings/store`

### **Basic Functionality:**
- [ ] Page loads without errors
- [ ] Header displays correctly
- [ ] Tab navigation works (Info Toko, Jam Operasional)

### **Info Toko Tab:**
- [ ] All form fields are editable
- [ ] Nama Toko field accepts input
- [ ] Telepon field accepts input
- [ ] Email field accepts valid email
- [ ] Website field accepts URL
- [ ] Deskripsi textarea accepts input
- [ ] Alamat textarea accepts input
- [ ] Kota field accepts input
- [ ] Provinsi field accepts input
- [ ] Kode Pos field accepts input
- [ ] NPWP field accepts input with format

### **Jam Operasional Tab:**
- [ ] All 7 days displayed
- [ ] Toggle buka/tutup works for each day
- [ ] Time picker works for jam buka
- [ ] Time picker works for jam tutup
- [ ] Disabled state shows when tutup

### **Save Functionality:**
- [ ] Save button works
- [ ] Success message displays
- [ ] Data persists after save
- [ ] Data loads on page refresh
- [ ] Validation works for required fields

---

## 👥 **USERS & TEAM TESTING**

**URL:** `http://localhost:3001/settings/users`

### **User List:**
- [ ] Page loads without errors
- [ ] User list displays
- [ ] Statistics cards show correct counts
- [ ] Search functionality works
- [ ] Tab navigation works (Users, Roles)

### **Add User:**
- [ ] "Tambah Pengguna" button opens modal
- [ ] All form fields are editable
- [ ] Name field required validation
- [ ] Email field required validation
- [ ] Email format validation
- [ ] Password field required validation
- [ ] Password minimum 8 characters
- [ ] Role dropdown works
- [ ] Position field accepts input
- [ ] Active checkbox works
- [ ] Save creates new user
- [ ] Success message displays
- [ ] User appears in list
- [ ] Modal closes after save

### **Edit User:**
- [ ] Edit button opens modal with data
- [ ] All fields pre-filled correctly
- [ ] Can update name
- [ ] Can update email
- [ ] Can update phone
- [ ] Can change role
- [ ] Can change position
- [ ] Can toggle active status
- [ ] Password field optional (empty = no change)
- [ ] Save updates user
- [ ] Changes reflect in list

### **Delete User:**
- [ ] Delete button shows confirmation
- [ ] Cancel keeps user
- [ ] Confirm deletes user (soft delete)
- [ ] User removed from list
- [ ] User marked as inactive in DB

---

## 🔒 **SECURITY SETTINGS TESTING**

**URL:** `http://localhost:3001/settings/security`

### **Password Tab:**
- [ ] Page loads without errors
- [ ] Tab navigation works
- [ ] Current password field works
- [ ] New password field works
- [ ] Confirm password field works
- [ ] Password tips display
- [ ] Validation: current password required
- [ ] Validation: new password min 8 chars
- [ ] Validation: passwords must match
- [ ] Save changes password
- [ ] Success message displays
- [ ] Can login with new password

### **2FA Tab:**
- [ ] Status displays correctly
- [ ] Enable 2FA button works
- [ ] QR code placeholder shows
- [ ] Instructions display
- [ ] Disable 2FA button works (if enabled)

### **Audit Log Tab:**
- [ ] Audit logs display
- [ ] Pagination works
- [ ] Logs show user, action, date
- [ ] IP address displays
- [ ] Recent logs appear first
- [ ] Empty state shows if no logs

---

## 💾 **BACKUP & RESTORE TESTING**

**URL:** `http://localhost:3001/settings/backup`

### **Backup List:**
- [ ] Page loads without errors
- [ ] Statistics cards display
- [ ] Backup list displays
- [ ] Empty state shows if no backups

### **Create Backup:**
- [ ] "Buat Backup" button works
- [ ] Confirmation dialog shows
- [ ] Loading state displays
- [ ] Backup creates successfully
- [ ] Success message displays
- [ ] New backup appears in list
- [ ] Filename format correct
- [ ] Status shows "completed"

### **Backup Actions:**
- [ ] Download button works
- [ ] Restore button shows warning
- [ ] Delete button shows confirmation
- [ ] Delete removes backup from list

### **Scheduled Backup:**
- [ ] Daily toggle displays
- [ ] Weekly toggle displays
- [ ] Toggles are interactive

---

## 📦 **INVENTORY SETTINGS TESTING**

**URL:** `http://localhost:3001/settings/inventory`

### **Categories Tab:**
- [ ] Tab loads correctly
- [ ] Categories list displays
- [ ] Search works
- [ ] Add button opens modal
- [ ] Can add new category
- [ ] Can edit category
- [ ] Can delete category
- [ ] Statistics update

### **Suppliers Tab:**
- [ ] Tab loads correctly
- [ ] Suppliers list displays
- [ ] All fields display (name, contact, phone)
- [ ] Search works
- [ ] Add button opens modal
- [ ] Can add new supplier
- [ ] Can edit supplier
- [ ] Can delete supplier

### **Units Tab:**
- [ ] Tab loads correctly
- [ ] Units list displays
- [ ] Symbol displays
- [ ] Search works
- [ ] Can add new unit
- [ ] Can edit unit
- [ ] Can delete unit

### **Warehouses Tab:**
- [ ] Tab loads correctly
- [ ] Warehouses list displays
- [ ] Location displays
- [ ] Search works
- [ ] Can add new warehouse
- [ ] Can edit warehouse
- [ ] Can delete warehouse

---

## 🖨️ **HARDWARE SETTINGS TESTING**

**URL:** `http://localhost:3001/settings/hardware`

### **Printer Configuration:**
- [ ] Page loads without errors
- [ ] Statistics cards display
- [ ] Printer list displays
- [ ] Empty state shows if no printers

### **Add Printer:**
- [ ] "Tambah Printer" button opens modal
- [ ] Name field works
- [ ] Type dropdown works (thermal/inkjet)
- [ ] Connection dropdown works (network/USB)
- [ ] IP address field shows for network
- [ ] Port field shows for network
- [ ] Default checkbox works
- [ ] Active checkbox works
- [ ] Save creates printer
- [ ] Printer appears in list

### **Edit Printer:**
- [ ] Edit button opens modal
- [ ] Fields pre-filled correctly
- [ ] Can update all fields
- [ ] Save updates printer

### **Printer Actions:**
- [ ] Test button works (shows placeholder)
- [ ] Delete button shows confirmation
- [ ] Delete removes printer
- [ ] Default badge shows correctly
- [ ] Active/inactive badge shows

### **Other Hardware:**
- [ ] Barcode scanner card displays
- [ ] Cash drawer card displays
- [ ] Customer display card displays
- [ ] Configure buttons disabled (placeholder)

---

## 🔔 **NOTIFICATIONS SETTINGS TESTING**

**URL:** `http://localhost:3001/settings/notifications`

### **Email Notifications:**
- [ ] Page loads without errors
- [ ] Statistics cards display
- [ ] All 6 email toggles display
- [ ] Toggles are interactive
- [ ] Toggle states persist

### **SMS Notifications:**
- [ ] All 4 SMS toggles display
- [ ] Toggles are interactive
- [ ] Toggle states persist

### **Push Notifications:**
- [ ] All 4 push toggles display
- [ ] Toggles are interactive
- [ ] Toggle states persist

### **Email Configuration:**
- [ ] SMTP Host field works
- [ ] SMTP Port field works
- [ ] SMTP Username field works
- [ ] SMTP Password field works (masked)
- [ ] From Email field works
- [ ] From Name field works
- [ ] Help text displays

### **Save Functionality:**
- [ ] Save button works
- [ ] Success message displays
- [ ] Settings persist after save
- [ ] Settings load on page refresh

---

## 🔄 **INTEGRATION TESTING**

### **Cross-Module Integration:**
- [ ] Store info appears in receipts
- [ ] User roles affect permissions
- [ ] Audit logs track user actions
- [ ] Printer config used in POS
- [ ] Categories used in products
- [ ] Suppliers used in purchases
- [ ] Units used in products
- [ ] Notifications trigger on events

### **Navigation:**
- [ ] All settings links work from main page
- [ ] Back to settings works from all pages
- [ ] Breadcrumbs work correctly

---

## 📱 **RESPONSIVE TESTING**

### **Desktop (1920x1080):**
- [ ] All pages display correctly
- [ ] Tables fit screen
- [ ] Modals centered
- [ ] No horizontal scroll

### **Tablet (768x1024):**
- [ ] Layout adapts correctly
- [ ] Tables scrollable
- [ ] Modals fit screen
- [ ] Touch interactions work

### **Mobile (375x667):**
- [ ] Mobile layout displays
- [ ] Forms are usable
- [ ] Buttons accessible
- [ ] Modals fit screen

---

## 🚨 **ERROR HANDLING TESTING**

### **Network Errors:**
- [ ] Offline state handled
- [ ] Timeout handled
- [ ] 500 error handled
- [ ] Error messages display

### **Validation Errors:**
- [ ] Required field validation
- [ ] Email format validation
- [ ] Password strength validation
- [ ] Duplicate entry handling

### **Permission Errors:**
- [ ] Unauthorized access blocked
- [ ] 401 redirects to login
- [ ] 403 shows error message

---

## 🔐 **SECURITY TESTING**

### **Authentication:**
- [ ] Unauthenticated users redirected
- [ ] Session timeout works
- [ ] Login required for all pages

### **Authorization:**
- [ ] Admin can access all settings
- [ ] Manager has limited access
- [ ] Staff has restricted access

### **Data Security:**
- [ ] Passwords are hashed
- [ ] Sensitive data encrypted
- [ ] SQL injection prevented
- [ ] XSS prevented

---

## ⚡ **PERFORMANCE TESTING**

### **Page Load:**
- [ ] Store settings loads < 2s
- [ ] Users list loads < 2s
- [ ] Inventory tabs load < 2s
- [ ] No memory leaks

### **API Response:**
- [ ] GET requests < 500ms
- [ ] POST requests < 1s
- [ ] PUT requests < 1s
- [ ] DELETE requests < 500ms

---

## 📊 **TESTING SUMMARY**

**Total Test Cases:** 200+  
**Critical Tests:** 50  
**Medium Tests:** 100  
**Low Priority:** 50

**Pass Criteria:**
- All critical tests must pass
- 95%+ medium tests must pass
- 80%+ low priority tests must pass

---

## 🐛 **BUG REPORTING**

**If you find bugs, report with:**
1. Page URL
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser/device info
6. Screenshots if applicable

---

## ✅ **SIGN-OFF**

**Tested By:** _______________  
**Date:** _______________  
**Status:** [ ] Pass [ ] Fail  
**Notes:** _______________

