# Running Dual Servers - Admin & User/Store

## 🚀 Quick Start

Bedagang platform dapat dijalankan dengan dua instance terpisah untuk Admin dan User/Store.

---

## 📊 SERVER CONFIGURATION

### **Admin Server**
- **Port:** 3001
- **URL:** http://localhost:3001
- **Access:** `/admin/*` routes
- **Login:** http://localhost:3001/admin/login

### **User/Store Server**
- **Port:** 3002
- **URL:** http://localhost:3002
- **Access:** `/store/*`, `/pos/*`, `/inventory/*` routes
- **Login:** http://localhost:3002/login

---

## 🔧 AVAILABLE COMMANDS

### **Option 1: Run Admin Only (Port 3001)**
```bash
npm run dev:admin
```

### **Option 2: Run Store Only (Port 3002)**
```bash
npm run dev:store
```

### **Option 3: Run Both Simultaneously**

**Windows (PowerShell):**
```powershell
# Terminal 1 - Admin
npm run dev:admin

# Terminal 2 - Store (buka terminal baru)
npm run dev:store
```

**Alternative - Single Command (requires concurrently):**
```bash
npm run dev:both
```

---

## 📝 STEP-BY-STEP INSTRUCTIONS

### **Method 1: Manual (Recommended)**

#### **Step 1: Start Admin Server**
1. Buka terminal/PowerShell
2. Navigate ke folder project:
   ```bash
   cd d:\bedagang
   ```
3. Jalankan admin server:
   ```bash
   npm run dev:admin
   ```
4. Tunggu hingga muncul: `✓ Ready in Xs`
5. Admin server sekarang berjalan di: http://localhost:3001

#### **Step 2: Start Store Server**
1. Buka terminal/PowerShell BARU (jangan tutup terminal pertama)
2. Navigate ke folder project:
   ```bash
   cd d:\bedagang
   ```
3. Jalankan store server:
   ```bash
   npm run dev:store
   ```
4. Tunggu hingga muncul: `✓ Ready in Xs`
5. Store server sekarang berjalan di: http://localhost:3002

### **Method 2: Using Concurrently (Optional)**

**Install concurrently first:**
```bash
npm install --save-dev concurrently
```

**Then run both servers:**
```bash
npm run dev:both
```

---

## 🌐 ACCESS URLS

### **Admin Panel (Port 3001)**
- Dashboard: http://localhost:3001/admin/dashboard
- Login: http://localhost:3001/admin/login
- Tenants: http://localhost:3001/admin/tenants
- Modules: http://localhost:3001/admin/modules
- Partners: http://localhost:3001/admin/partners
- Analytics: http://localhost:3001/admin/analytics

### **User/Store (Port 3002)**
- Store: http://localhost:3002/store
- POS: http://localhost:3002/pos
- Inventory: http://localhost:3002/inventory
- Finance: http://localhost:3002/finance
- Login: http://localhost:3002/login

---

## 🔐 LOGIN CREDENTIALS

### **Admin Panel (Port 3001)**
```
Email: admin@bedagang.com
Password: admin123

Super Admin:
Email: superadmin@bedagang.com
Password: admin123
```

### **User/Store (Port 3002)**
```
Email: demo@bedagang.com
Password: demo123

Owner:
Email: owner@bedagang.com
Password: owner123
```

---

## ⚙️ CONFIGURATION

### **package.json Scripts**
```json
{
  "scripts": {
    "dev:admin": "next dev --port=3001",
    "dev:store": "next dev --port=3002",
    "dev:both": "concurrently \"npm run dev:admin\" \"npm run dev:store\"",
    "start:admin": "next start --port=3001",
    "start:store": "next start --port=3002"
  }
}
```

---

## 🛠️ TROUBLESHOOTING

### **Problem: Port Already in Use**
```
Error: Port 3001 is already in use
```

**Solution:**
1. Stop the running process on that port
2. Or use different port:
   ```bash
   next dev --port=3003
   ```

### **Problem: Cannot Run Two Instances**
**Note:** Next.js dari folder yang sama akan share `.next` build folder.

**Solution:**
- Jalankan di terminal terpisah
- Atau gunakan `concurrently` package

### **Problem: Changes Not Reflecting**
**Solution:**
1. Stop both servers (Ctrl+C)
2. Delete `.next` folder:
   ```bash
   rm -rf .next
   ```
3. Restart servers

---

## 📊 CURRENT STATUS

### **Admin Server (Port 3001)**
✅ **RUNNING**
- Started successfully
- Ready to accept connections
- Access: http://localhost:3001/admin

### **Store Server (Port 3002)**
⏳ **READY TO START**
- Run: `npm run dev:store`
- Will be available at: http://localhost:3002

---

## 🎯 TESTING CHECKLIST

### **Admin Panel (3001)**
- [ ] Login page loads
- [ ] Dashboard displays stats
- [ ] Sidebar navigation works
- [ ] Can create/edit tenants
- [ ] Can manage modules

### **Store (3002)**
- [ ] Login page loads
- [ ] Store dashboard works
- [ ] POS system functional
- [ ] Inventory management works
- [ ] Reports accessible

---

## 💡 TIPS

1. **Use Separate Browsers/Profiles**
   - Chrome for Admin (3001)
   - Firefox for Store (3002)
   - Prevents session conflicts

2. **Keep Terminals Open**
   - Don't close terminals while servers are running
   - Use Ctrl+C to stop servers gracefully

3. **Monitor Console**
   - Watch for errors in terminal
   - Check browser console for frontend errors

4. **Database Connection**
   - Both servers share the same database
   - Changes in one will reflect in the other

---

## 🚀 PRODUCTION DEPLOYMENT

### **Build for Production**
```bash
npm run build
```

### **Start Production Servers**
```bash
# Admin
npm run start:admin

# Store
npm run start:store
```

---

## 📚 ADDITIONAL RESOURCES

- Admin Panel Documentation: `ADMIN_PANEL_COMPLETE_SUMMARY.md`
- Quick Reference: `README_ADMIN_PANEL.md`
- Sidebar Implementation: `ADMIN_SIDEBAR_PROGRESS_UPDATE.md`

---

## ✅ SUMMARY

**Current Setup:**
- ✅ Admin server configured for port 3001
- ✅ Store server configured for port 3002
- ✅ Scripts added to package.json
- ✅ Admin server currently running

**Next Steps:**
1. Open new terminal
2. Run: `npm run dev:store`
3. Access both servers simultaneously

**URLs:**
- Admin: http://localhost:3001/admin
- Store: http://localhost:3002/store

---

**🎉 Both servers can now run simultaneously!**
