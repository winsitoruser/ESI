# ADR-001: Multi-Tenant Isolation Strategy

## Status
✅ Accepted | Sprint 1 | 28 Juni 2026

## Context
Audit CTO menemukan bahwa tidak ada strategi isolation formal untuk multi-tenant. Saat ini sistem sudah berjalan dengan kolom `tenantId` di sebagian tabel, tapi tidak ada enforcement di tingkat database.

### Alternatives dipertimbangkan:
1.  **Database per tenant** - Fully isolated, tapi berat untuk maintenance dan scaling
2.  **Schema per tenant** - Isolasi bagus, tapi migration overhead sangat besar
3.  **Row-level security + tenantId kolom** - Balance terbaik antara isolation dan scalability

## Decision
✅ **Kita menggunakan Row-level isolation via `tenantId` + Database Row Level Security (RLS)**

### Aturan implementasi:
1.  **SEMUA tabel** harus memiliki kolom `tenantId UUID NOT NULL` dengan foreign key ke tabel `tenants`
2.  Aktifkan PostgreSQL RLS di SEMUA tabel
3.  Buat policy RLS yang enforce `tenantId = current_setting('app.current_tenant')`
4.  Middleware akan set `app.current_tenant` di SETIAP koneksi database sebelum eksekusi query
5.  **Tidak boleh ada query manual** yang mengabaikan tenantId filter
6.  Superadmin role adalah satu-satunya yang bisa bypass RLS

### Scope:
- Berlaku untuk **Semua Sequelize dan Prisma queries**
- Test case wajib: buat unit test yang memverifikasi tenant A tidak bisa akses data tenant B

## Consequences
✅ **Positif:**
- Isolasi 100% terjamin di tingkat database (tidak bisa bypass di app level)
- Scalability bagus sampai ribuan tenant
- Migration dan maintenance sederhana

⚠️ **Negatif:**
- Perlu refactor semua tabel untuk menambahkan `tenantId`
- Semua existing query harus diaudit
- Ada sedikit overhead performa (~5%)
