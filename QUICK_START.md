# Quick Start Guide - BEDAGANG

Panduan cepat untuk memulai menggunakan BEDAGANG Retail Platform.

## 🚀 Setup dalam 5 Menit

### 1. Clone Repository
```bash
git clone https://github.com/winsitoruser/bedagang.git
cd bedagang
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
# Buat database PostgreSQL
createdb bedagang_dev

# Copy file environment
cp .env.example .env

# Edit .env dan sesuaikan dengan konfigurasi database Anda
```

### 4. Run Migrations
```bash
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```

Buka browser dan akses `http://localhost:3000`

## 📋 Default Credentials

Setelah seeding database, gunakan kredensial berikut:

**Admin:**
- Email: admin@bedagang.com
- Password: admin123

**Kasir:**
- Email: kasir@bedagang.com
- Password: kasir123

## 🎯 Fitur Utama yang Bisa Langsung Dicoba

### 1. Point of Sale (POS)
- Akses: `/pos`
- Buka shift kasir
- Scan/pilih produk
- Proses pembayaran
- Print receipt

### 2. Inventory Management
- Akses: `/inventory`
- Lihat stock real-time
- Buat purchase order
- Terima barang (goods receipt)
- Stock adjustment

### 3. Customer & Loyalty
- Akses: `/customers`
- Daftar customer baru
- Lihat purchase history
- Kelola loyalty points
- Redeem rewards

### 4. Dashboard
- Akses: `/dashboard`
- Lihat sales summary
- Monitor inventory
- Track keuangan
- Analytics real-time

## 🔧 Konfigurasi Penting

### Database
Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_dev
DB_USER=your_user
DB_PASSWORD=your_password
```

### NextAuth
Generate secret key:
```bash
openssl rand -base64 32
```

Masukkan ke `.env`:
```env
NEXTAUTH_SECRET=your_generated_secret
```

## 📦 Seed Data (Optional)

Untuk mengisi database dengan data contoh:
```bash
npm run db:seed
```

Data yang akan dibuat:
- 5 kategori produk
- 50 produk sample
- 20 customer
- 5 employee
- 1 branch
- Sample transactions

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Pastikan PostgreSQL berjalan
sudo service postgresql status

# Restart PostgreSQL
sudo service postgresql restart
```

### Port Already in Use
```bash
# Ubah port di package.json atau .env
PORT=3001
```

### Migration Error
```bash
# Reset database
npm run db:reset
```

## 📚 Next Steps

1. **Customize Settings**: Sesuaikan pengaturan toko di `/settings`
2. **Add Products**: Tambahkan produk Anda di `/inventory/products`
3. **Setup Branches**: Konfigurasi cabang di `/settings/branches`
4. **Configure Loyalty**: Setup program loyalty di `/customers/loyalty`
5. **Explore APIs**: Baca dokumentasi API di `/docs`

## 🆘 Butuh Bantuan?

- 📖 Dokumentasi lengkap: [README.md](./README.md)
- 🐛 Report issues: [GitHub Issues](https://github.com/winsitoruser/bedagang/issues)
- 💬 Diskusi: [GitHub Discussions](https://github.com/winsitoruser/bedagang/discussions)

---

**Happy Selling! 🛒**
