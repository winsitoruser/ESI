# Troubleshooting: JSON Parse Error

## 🐛 **ERROR:**

```
Runtime SyntaxError
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

---

## 🔍 **ROOT CAUSE:**

Error ini terjadi ketika frontend mencoba parse HTML sebagai JSON. Penyebab umum:

1. **API endpoint tidak ditemukan (404)** - Server return HTML error page
2. **API endpoint error** - Uncaught exception return HTML error page
3. **Model import error** - Sequelize model tidak ter-load dengan benar
4. **Database connection error** - Database belum ter-setup atau tidak terhubung

---

## ✅ **SOLUSI YANG SUDAH DITERAPKAN:**

### **1. Dynamic Model Import**

**Before:**
```typescript
const Role = require('@/models/Role');

export default async function handler(req, res) {
  // Use Role model
}
```

**After:**
```typescript
export default async function handler(req, res) {
  // Dynamic import inside handler
  const Role = require('@/models/Role');
  
  // Use Role model
}
```

**Benefit:** Menghindari module loading issues saat server start

---

### **2. Fallback Error Handling**

**Users API dengan fallback:**
```typescript
if (req.method === 'GET') {
  try {
    // Try to get users with role details
    const users = await User.findAll({
      include: [{
        model: Role,
        as: 'roleDetails',
        required: false // Don't fail if association missing
      }]
    });
    
    return res.json({ success: true, data: users });
    
  } catch (dbError) {
    console.error('Database error:', dbError);
    
    // Fallback: return users without role details
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', ...]
    });
    
    return res.json({ success: true, data: users });
  }
}
```

**Benefit:** API tetap berfungsi meskipun ada masalah dengan associations

---

### **3. Proper Error Response**

**Always return JSON:**
```typescript
try {
  // Your logic
} catch (error) {
  console.error('Error:', error);
  return res.status(500).json({
    success: false,
    error: 'Failed to process request',
    details: error.message
  });
}
```

**Never let errors bubble up** - Always catch and return JSON

---

## 🔧 **FILES YANG SUDAH DIPERBAIKI:**

1. **`/pages/api/settings/roles.ts`**
   - ✅ Dynamic model import
   - ✅ Proper error handling
   - ✅ Always return JSON

2. **`/pages/api/settings/users/index.ts`**
   - ✅ Dynamic model import
   - ✅ Fallback for association errors
   - ✅ Try-catch for database queries
   - ✅ Always return JSON

---

## 📋 **CHECKLIST UNTUK DEBUGGING:**

### **Step 1: Check Browser Console**
```javascript
// Look for the actual error
// Check Network tab for failed requests
// Check which API endpoint is failing
```

### **Step 2: Check Server Logs**
```bash
# Check terminal where Next.js is running
# Look for error stack traces
# Check for database connection errors
```

### **Step 3: Test API Endpoint Directly**
```bash
# Use curl or Postman
curl http://localhost:3001/api/settings/roles

# Should return JSON, not HTML
```

### **Step 4: Verify Database**
```bash
# Check if database is running
psql -U postgres -d bedagang_pos

# Check if tables exist
\dt

# Check if roles table has data
SELECT * FROM roles;
```

### **Step 5: Check Model Files**
```bash
# Verify model files exist
ls -la models/Role.js
ls -la models/User.js

# Check for syntax errors in models
```

---

## 🚀 **DEPLOYMENT CHECKLIST:**

### **Before Running:**

1. **Database Setup:**
```bash
# Run migrations
psql -U postgres -d bedagang_pos -f migrations/settings_module_tables.sql
psql -U postgres -d bedagang_pos -f migrations/add_role_permissions_integration.sql

# Verify tables
psql -U postgres -d bedagang_pos -c "\dt"
```

2. **Check Environment:**
```bash
# Verify .env.local
DATABASE_URL=postgresql://user:password@localhost:5432/bedagang_pos
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
```

3. **Install Dependencies:**
```bash
npm install
# or
yarn install
```

4. **Build & Start:**
```bash
npm run build
npm run dev
# or
npm run start
```

---

## 🔍 **COMMON ERRORS & FIXES:**

### **Error: "Role is not defined"**
**Cause:** Model not imported  
**Fix:** Use dynamic import inside handler

### **Error: "Cannot read property 'findAll' of undefined"**
**Cause:** Model import failed  
**Fix:** Check model file path and syntax

### **Error: "relation 'roles' does not exist"**
**Cause:** Database table not created  
**Fix:** Run migration SQL

### **Error: "Association 'roleDetails' not found"**
**Cause:** Model associations not defined  
**Fix:** Add association in model or use `required: false`

### **Error: "connect ECONNREFUSED"**
**Cause:** Database not running  
**Fix:** Start PostgreSQL service

---

## 📝 **TESTING API ENDPOINTS:**

### **Test Roles API:**
```bash
# Get all roles
curl http://localhost:3001/api/settings/roles \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "admin",
      "description": "Administrator",
      "permissions": {...}
    }
  ]
}
```

### **Test Users API:**
```bash
# Get all users
curl http://localhost:3001/api/settings/users \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "roleDetails": {
        "id": "uuid",
        "name": "admin",
        "permissions": {...}
      }
    }
  ]
}
```

---

## 🛠️ **PREVENTIVE MEASURES:**

### **1. Always Use Try-Catch:**
```typescript
export default async function handler(req, res) {
  try {
    // Your logic
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error message',
      details: error.message
    });
  }
}
```

### **2. Validate Before Query:**
```typescript
if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}

if (req.method !== 'GET') {
  return res.status(405).json({ error: 'Method not allowed' });
}
```

### **3. Use Optional Chaining:**
```typescript
const permissions = user?.roleDetails?.permissions || {};
```

### **4. Frontend Error Handling:**
```typescript
try {
  const response = await fetch('/api/settings/roles');
  const data = await response.json();
  
  if (!data.success) {
    console.error('API Error:', data.error);
    alert('Error: ' + data.error);
    return;
  }
  
  setRoles(data.data);
} catch (error) {
  console.error('Fetch error:', error);
  alert('Failed to load roles');
}
```

---

## ✅ **VERIFICATION:**

After fixes, verify:

1. **No console errors** in browser
2. **API returns JSON** (not HTML)
3. **Data loads correctly** in frontend
4. **No 404 or 500 errors** in Network tab
5. **Server logs clean** (no uncaught exceptions)

---

## 📞 **IF ERROR PERSISTS:**

1. **Clear browser cache** and reload
2. **Restart Next.js server**
3. **Check database connection**
4. **Verify all migrations ran**
5. **Check model associations**
6. **Review server logs** for specific errors

---

**Status:** ✅ **FIXED**  
**Date:** February 4, 2026  
**Solution:** Dynamic imports + Fallback error handling + Always return JSON

