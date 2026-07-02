# 🚀 Admin Panel Setup Guide

**Admin Panel Bedagang** dapat dijalankan di port terpisah dari aplikasi utama untuk memudahkan development dan deployment.

---

## 📋 Port Configuration

### **Default Ports:**
- **Main Application:** `http://localhost:3001`
- **Admin Panel:** `http://localhost:3002`

Dengan konfigurasi ini, Anda dapat menjalankan aplikasi utama dan admin panel secara bersamaan tanpa konflik port.

---

## 🚀 Running the Application

### **Option 1: Run Main Application Only**

```bash
npm run dev
```

Server akan berjalan di: `http://localhost:3001`

**Access:**
- Main App: http://localhost:3001
- Admin Panel: http://localhost:3001/admin

---

### **Option 2: Run Admin Panel on Separate Port**

```bash
npm run dev:admin
```

Server akan berjalan di: `http://localhost:3002`

**Access:**
- Admin Panel: http://localhost:3002/admin
- Dashboard: http://localhost:3002/admin
- Partners: http://localhost:3002/admin/partners
- Activations: http://localhost:3002/admin/activations
- Outlets: http://localhost:3002/admin/outlets
- Transactions: http://localhost:3002/admin/transactions

---

### **Option 3: Run Both Simultaneously**

**Terminal 1 - Main Application:**
```bash
npm run dev
```

**Terminal 2 - Admin Panel:**
```bash
npm run dev:admin
```

Dengan setup ini:
- Main app berjalan di port 3001
- Admin panel berjalan di port 3002
- Keduanya dapat diakses bersamaan

---

## 🔐 Authentication

Admin panel memerlukan authentication dengan role `ADMIN` atau `SUPER_ADMIN`.

### **Check Your User Role:**

```sql
SELECT id, name, email, role FROM users WHERE email = 'your-email@example.com';
```

### **Update User Role to Admin:**

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

**Available Roles:**
- `owner` - Business owner
- `admin` - Administrator (can access admin panel)
- `manager` - Manager
- `cashier` - Cashier
- `staff` - Staff

---

## 📊 Sample Data

Sample data sudah tersedia untuk testing:

### **Partners (5):**
1. Apotek Sehat Sentosa (Jakarta) - Active
2. Toko Retail Jaya Abadi (Bandung) - Active
3. Warung Makan Sederhana (Yogyakarta) - Pending
4. Minimarket Berkah (Surabaya) - Pending
5. Klinik Sehat Bersama (Semarang) - Inactive

### **Outlets (4):**
- 1 outlet untuk Apotek Sehat Sentosa
- 3 outlets untuk Toko Retail Jaya Abadi

### **Activation Requests (2):**
- Warung Makan Sederhana (Enterprise package)
- Minimarket Berkah (Starter package)

### **Re-seed Sample Data:**

Jika ingin membuat ulang sample data:

```bash
node scripts/seed-admin-sample-data.js
```

---

## 🎯 Admin Panel Features

### **1. Dashboard** (`/admin`)
- Statistics overview
- Partner growth chart (6 months)
- Package distribution
- Quick actions

### **2. Partners Management** (`/admin/partners`)
- List all partners
- Search by name, email, phone
- Filter by status (active, pending, inactive, suspended)
- Filter by city
- CRUD operations
- Change partner status

### **3. Activation Requests** (`/admin/activations`)
- List activation requests
- Filter by status
- Approve with subscription creation
- Reject with reason
- Review notes

### **4. Outlets Management** (`/admin/outlets`)
- Grid view of all outlets
- Real-time sync status monitoring
- Transaction counts (today, monthly)
- Device tracking
- Search and filters

### **5. Transaction Overview** (`/admin/transactions`)
- Overall statistics
- Top performers ranking
- Group by partner or outlet
- Date range filtering
- Revenue analytics

---

## 🔧 Production Deployment

### **Build for Production:**

```bash
npm run build
```

### **Start Production Server:**

**Main Application:**
```bash
npm run start
```

**Admin Panel (separate port):**
```bash
npm run start:admin
```

---

## 🌐 Environment Variables

Pastikan environment variables sudah di-set dengan benar:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bedagang_dev

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key

# For Admin Panel on separate port
# NEXTAUTH_URL=http://localhost:3002
```

**Note:** Jika menjalankan admin di port 3002, update `NEXTAUTH_URL` sesuai kebutuhan.

---

## 📝 API Endpoints

### **Dashboard:**
- `GET /api/admin/dashboard/stats`

### **Partners:**
- `GET /api/admin/partners`
- `POST /api/admin/partners`
- `GET /api/admin/partners/:id`
- `PUT /api/admin/partners/:id`
- `DELETE /api/admin/partners/:id`
- `PATCH /api/admin/partners/:id/status`

### **Activations:**
- `GET /api/admin/activations`
- `POST /api/admin/activations/:id/approve`
- `POST /api/admin/activations/:id/reject`

### **Outlets:**
- `GET /api/admin/outlets`
- `GET /api/admin/outlets/:id`

### **Transactions:**
- `GET /api/admin/transactions`
- `GET /api/admin/transactions/summary`

---

## 🐛 Troubleshooting

### **Port Already in Use:**

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
1. Stop the running process on that port
2. Or use the admin-specific port:
   ```bash
   npm run dev:admin
   ```

### **Authentication Issues:**

**Error:** Unauthorized access to admin panel

**Solution:**
1. Make sure you're logged in
2. Check your user role in database
3. Update role to `ADMIN` or `SUPER_ADMIN`

### **Database Connection:**

**Error:** Cannot connect to database

**Solution:**
1. Check PostgreSQL is running
2. Verify database credentials in `.env`
3. Run migrations: `npm run db:migrate`

---

## 📚 Documentation

Complete documentation available:
- `ADMIN_PANEL_DESIGN.md` - Design & requirements
- `ADMIN_PANEL_IMPLEMENTATION.md` - Phase 1
- `ADMIN_PANEL_PHASE2_COMPLETE.md` - Phase 2
- `ADMIN_PANEL_PHASE3_COMPLETE.md` - Phase 3
- `ADMIN_PANEL_COMPLETE.md` - Complete guide
- `ADMIN_PANEL_SETUP.md` - This file

---

## ✅ Quick Start Checklist

- [ ] Database migrated: `npm run db:migrate`
- [ ] Sample data seeded: `node scripts/seed-admin-sample-data.js`
- [ ] User role set to ADMIN
- [ ] Server started: `npm run dev:admin`
- [ ] Access admin panel: http://localhost:3002/admin
- [ ] Test all features

---

## 🎉 Ready to Use!

Admin Panel sudah siap digunakan. Pilih port yang sesuai dengan kebutuhan Anda:

- **Port 3001** - Untuk development bersama main app
- **Port 3002** - Untuk admin panel terpisah

**Happy coding!** 🚀

---

**Last Updated:** February 7, 2026
