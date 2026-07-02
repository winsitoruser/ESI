# ADR-002: Dual ORM Governance

## Status
✅ Accepted | Sprint 1 | 28 Juni 2026

## Context
Saat ini sistem menggunakan **dua ORM secara paralel**:
1.  **Sequelize** - ORM utama untuk semua write operations, business logic, existing code
2.  **Prisma** - Baru ditambahkan untuk reports dan read-heavy operations

Masalah: Tidak ada aturan yang jelas kapan pakai mana, ada resiko **schema drift** dan divergence antara kedua ORM.

## Decision
✅ **Zero schema divergence policy dengan pembagian tanggung jawab jelas:**

### Aturan baku:
| Operasi | ORM yang dipakai | Alasan |
|---|---|---|
| ✅ Schema Migrations | **Prisma** | Single source of truth untuk schema database |
| ✅ Write Operations | **Sequelize** | Semua INSERT / UPDATE / DELETE hanya lewat Sequelize |
| ✅ Read Operations / Reports | **Prisma** | Semua SELECT untuk report, dashboard, dan analytics |
| ✅ Transaction | **Sequelize** | Semua transaksi atomic hanya lewat Sequelize |
| ❌ DDL Operations | ❌ Sequelize | Jangan pernah buat migration di Sequelize lagi |
| ❌ Write Operations | ❌ Prisma | Prisma HANYA untuk read, tidak boleh write |

### Sync Policy:
1.  Semua perubahan schema HANYA dibuat via Prisma `schema.prisma`
2.  Setelah `prisma migrate dev`, jalankan script sinkronisasi otomatis yang update Sequelize models
3.  CI Pipeline akan gagal jika ada mismatch antara Prisma schema dan Sequelize models
4.  Tidak boleh ada kolom yang hanya ada di salah satu ORM

## Consequences
✅ **Positif:**
- Zero schema drift terjamin
- Setiap ORM digunakan sesuai kekuatannya
- Backward compatible 100% dengan existing code
- Migrasi gradual bisa dilakukan tanpa rewrite total

⚠️ **Negatif:**
- Perlu maintain dua set model
- Ada sedikit overhead untuk sinkronisasi
- Developer harus ingat aturan pembagian ini
