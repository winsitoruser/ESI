# ADR-003: Offline PoS Conflict Resolution

## Status
✅ Accepted | Sprint 1 | 28 Juni 2026

## Context
PoS client berjalan dalam mode offline menggunakan IndexedDB. Saat koneksi kembali, client akan sync semua transaksi yang dilakukan saat offline. Masalah utama adalah **conflict resolution** ketika ada perubahan data yang bersamaan di server dan client.

## Decision
✅ **Hybrid conflict resolution strategy berbasis tipe data:**

| Tipe Data | Strategy | Alasan |
|---|---|---|
| 📦 **Stock Inventory** | **Server Wins** | Stock adalah sumber kebenaran tunggal. Client tidak boleh override stock server. Jika conflict, client akan menampilkan popup konfirmasi ke kasir. |
| 🧾 **Transaksi Penjualan** | **Last Write Wins (timestamp)** | Transaksi unik, tidak mungkin diubah bersamaan. Pakai timestamp client yang dibuat saat transaksi dibuat. |
| 👤 **Master Data** | **Manual Merge** | Product, Customer, Supplier: jika ada perubahan di kedua sisi, tampilkan diff dan minta user pilih mana yang dipakai. |
| 📊 **Laporan / Statistik** | **Automatic Rebase** | Laporan akan dihitung ulang otomatis setelah sync selesai. |

### Aturan implementasi:
1.  **Semua operasi offline diberi UUID unik** dan timestamp saat dibuat di client
2.  Saat sync, server akan membandingkan `modified_at` dari client dan server
3.  Untuk stock: server selalu menang, client akan rollback operasi stock yang conflict dan memberitahu kasir
4.  Semua conflict dicatat di log `sync_conflicts` dan bisa ditinjau oleh admin
5.  Client akan retry sync dengan exponential backoff sampai berhasil

### Edge Cases:
- Jika stock menjadi negatif karena transaksi offline: transaksi TETAP disimpan, tapi admin diberikan alert untuk review
- Concurrent transaction pada invoice yang sama: server akan merge item tanpa overwrite
- Tidak ada hard delete: semua operasi adalah soft delete / cancel

## Consequences
✅ **Positif:**
- Data konsistensi terjaga terutama untuk inventory
- User experience bagus untuk kasir (tidak perlu menunggu)
- Tidak ada data loss: semua conflict dicatat dan bisa di audit

⚠️ **Negatif:**
- Perlu UI khusus untuk menampilkan conflict
- Ada kasus edge yang perlu ditangani secara manual
- Log sync conflict butuh maintenance berkala
