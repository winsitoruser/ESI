# 🚀 Admin Panel Standalone - Aplikasi Terpisah

**Date:** February 7, 2026, 2:45 AM  
**Status:** ✅ **COMPLETELY SEPARATED**

---

## 📋 Overview

Admin Panel Bedagang sekarang adalah **aplikasi Next.js yang benar-benar terpisah** dengan:

- ✅ Folder terpisah: `admin-panel/`
- ✅ Package.json terpisah
- ✅ Next.js config terpisah
- ✅ Authentication terpisah
- ✅ Port terpisah (3002)
- ✅ Login page sebagai halaman pertama

---

## 🗂️ Struktur Folder

```
bedagang/                          # Root project
├── admin-panel/                   # ✅ ADMIN PANEL (TERPISAH)
│   ├── package.json               # Dependencies admin
│   ├── next.config.js             # Config admin
│   ├── tsconfig.json              # TypeScript config
│   ├── tailwind.config.js         # Tailwind config
│   ├── postcss.config.js          # PostCSS config
│   ├── styles/
│   │   └── globals.css            # Global styles
│   ├── pages/
│   │   ├── _app.tsx               # App wrapper
│   │   ├── index.tsx              # Root → redirect ke login/dashboard
│   │   ├── login.tsx              # ✅ LOGIN PAGE (HALAMAN PERTAMA)
│   │   ├── dashboard.tsx          # Dashboard admin
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth].ts  # Auth API
│   └── components/                # Admin components
│
├── pages/                         # CLIENT APP (TERPISAH)
│   ├── index.tsx                  # Landing page
│   ├── dashboard.tsx              # User dashboard
│   ├── auth/
│   │   └── login.tsx              # Client login
│   └── ...                        # Client pages
│
├── models/                        # SHARED (digunakan kedua app)
│   ├── User.js
│   ├── Partner.js
│   └── ...
│
└── package.json                   # Dependencies client
```

---

## 🚀 Setup & Installation

### **Step 1: Install Dependencies Admin Panel**

```bash
cd admin-panel
npm install
```

### **Step 2: Environment Variables**

Buat file `.env.local` di folder `admin-panel/`:

```env
# Database (shared dengan client)
DATABASE_URL=postgresql://user:password@localhost:5432/bedagang_dev

# NextAuth
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=bedagang-admin-secret-key-change-in-production
```

### **Step 3: Start Admin Panel**

```bash
cd admin-panel
npm run dev
```

Server akan berjalan di: **http://localhost:3002**

---

## 🔐 Login Page (Halaman Pertama)

### **Akses:**
```
http://localhost:3002
```

**Otomatis redirect ke:**
```
http://localhost:3002/login
```

### **Features:**
- ✅ Dedicated admin login interface
- ✅ Shield icon branding
- ✅ Blue gradient design
- ✅ Email & password authentication
- ✅ Show/hide password toggle
- ✅ Role verification (ADMIN/SUPER_ADMIN only)
- ✅ Error handling
- ✅ Auto-redirect setelah login

### **Credentials:**
- Email: `demo@bedagang.com`
- Password: (password Anda)
- Role: `ADMIN` atau `SUPER_ADMIN`

---

## 📊 Routing Structure

### **Admin Panel (Port 3002):**

```
/                    → Redirect ke /login atau /dashboard
/login               → ✅ LOGIN PAGE (HALAMAN PERTAMA)
/dashboard           → Dashboard admin (after login)
/partners            → Partners management
/activations         → Activation requests
/outlets             → Outlets monitoring
/transactions        → Transaction analytics
```

### **Client App (Port 3001):**

```
/                    → Landing page
/auth/login          → Client login
/dashboard           → User dashboard
/pos                 → POS system
/inventory           → Inventory management
```

---

## 🔄 Authentication Flow

### **Scenario 1: First Access (Belum Login)**

```
User akses: http://localhost:3002
    ↓
pages/index.tsx checks session
    ↓
status = 'unauthenticated'
    ↓
Redirect to: /login
    ↓
✅ LOGIN PAGE MUNCUL (HALAMAN PERTAMA)
```

### **Scenario 2: Login Success (Admin)**

```
User login di /login
    ↓
NextAuth verify credentials
    ↓
Check role: ADMIN ✅
    ↓
Create session with role
    ↓
Redirect to: /dashboard
    ↓
✅ DASHBOARD ADMIN
```

### **Scenario 3: Login Failed (Non-Admin)**

```
User login di /login
    ↓
NextAuth verify credentials
    ↓
Check role: owner ❌
    ↓
Error: "Anda tidak memiliki akses"
    ↓
Redirect to: / (client app)
```

---

## 🔧 Development

### **Admin Panel:**

```bash
# Navigate to admin panel
cd admin-panel

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### **Client App:**

```bash
# Navigate to root
cd ..

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 🎯 Key Differences

### **Admin Panel vs Client App:**

| Aspect | Admin Panel | Client App |
|--------|-------------|------------|
| **Folder** | `admin-panel/` | Root folder |
| **Port** | 3002 | 3001 |
| **First Page** | Login page | Landing page |
| **Users** | ADMIN, SUPER_ADMIN | All users |
| **Purpose** | System management | Business operations |
| **Authentication** | Admin-only auth | General auth |
| **Database** | Shared models | Shared models |

---

## 📦 Dependencies

### **Admin Panel (`admin-panel/package.json`):**

```json
{
  "dependencies": {
    "next": "^15.2.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next-auth": "^4.24.11",
    "bcryptjs": "^3.0.2",
    "pg": "^8.17.1",
    "sequelize": "^6.37.7",
    "lucide-react": "^0.284.0",
    "tailwindcss": "^3.3.3"
  }
}
```

**Note:** Admin panel menggunakan models dari parent project (`../models`)

---

## 🔐 Security

### **Admin Panel Security:**

1. **Separate Authentication**
   - Own NextAuth configuration
   - Admin-only role verification
   - Separate session management

2. **Role Verification**
   - Check role on login
   - Verify ADMIN or SUPER_ADMIN
   - Reject non-admin users

3. **Protected Routes**
   - All pages check authentication
   - Auto-redirect if not logged in
   - Session-based protection

4. **Shared Database**
   - Uses same database as client
   - Access same user table
   - Shared models for consistency

---

## 🚀 Deployment

### **Option 1: Same Server, Different Ports**

```bash
# Terminal 1: Client App
cd /path/to/bedagang
npm run dev

# Terminal 2: Admin Panel
cd /path/to/bedagang/admin-panel
npm run dev
```

### **Option 2: Separate Servers**

**Client App:**
```bash
cd /path/to/bedagang
npm run build
npm start
# Runs on port 3001
```

**Admin Panel:**
```bash
cd /path/to/bedagang/admin-panel
npm run build
npm start
# Runs on port 3002
```

### **Option 3: Different Domains**

- Client: `https://bedagang.com`
- Admin: `https://admin.bedagang.com`

Update `NEXTAUTH_URL` accordingly.

---

## ✅ Verification Checklist

- [ ] Admin panel folder exists: `admin-panel/`
- [ ] Dependencies installed: `cd admin-panel && npm install`
- [ ] Server starts: `npm run dev`
- [ ] Access `http://localhost:3002` → Login page appears
- [ ] Login with admin credentials works
- [ ] After login → Dashboard appears
- [ ] Logout → Back to login page
- [ ] Non-admin user rejected

---

## 📝 Next Steps

### **To Complete Admin Panel:**

1. **Copy Admin Pages**
   ```bash
   # Copy dashboard page
   cp ../pages/admin/dashboard.tsx pages/dashboard.tsx
   
   # Copy other admin pages
   cp -r ../pages/admin/partners pages/
   cp -r ../pages/admin/activations pages/
   cp -r ../pages/admin/outlets pages/
   cp -r ../pages/admin/transactions pages/
   ```

2. **Copy API Endpoints**
   ```bash
   # Copy admin API endpoints
   cp -r ../pages/api/admin pages/api/
   ```

3. **Update Imports**
   - Update model imports to point to parent project
   - Adjust paths as needed

4. **Test All Features**
   - Login/logout
   - Dashboard statistics
   - Partners management
   - Activations approval
   - Outlets monitoring
   - Transactions analytics

---

## 🎉 Benefits

### **Completely Separated:**

1. **Independent Deployment**
   - Deploy admin panel separately
   - Different scaling strategies
   - Isolated updates

2. **Better Security**
   - Separate authentication
   - Isolated admin access
   - No client code exposure

3. **Cleaner Code**
   - Clear separation of concerns
   - Easier maintenance
   - Better organization

4. **Flexible Scaling**
   - Scale admin independently
   - Different server resources
   - Optimized performance

---

## 📚 Documentation

- **Setup Guide:** This file
- **Admin Features:** `ADMIN_PANEL_COMPLETE.md`
- **API Documentation:** `ADMIN_PANEL_PHASE3_COMPLETE.md`
- **Access Guide:** `ADMIN_ACCESS_GUIDE.md`

---

## 🎯 Summary

Admin Panel Bedagang sekarang adalah **aplikasi Next.js yang benar-benar terpisah**:

- ✅ Folder terpisah: `admin-panel/`
- ✅ Dependencies terpisah
- ✅ Configuration terpisah
- ✅ Authentication terpisah
- ✅ Port terpisah (3002)
- ✅ **Login page sebagai halaman pertama**
- ✅ Shared database models
- ✅ Independent deployment

**Start using:**
```bash
cd admin-panel
npm install
npm run dev
```

**Access:**
```
http://localhost:3002
```

**First page:** Login page ✅

---

**Last Updated:** February 7, 2026, 2:45 AM (UTC+07:00)
