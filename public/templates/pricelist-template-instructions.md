# Template Upload Pricelist FARMANESIA

## Format File Excel (.xlsx)

### Kolom yang Diperlukan:

| Kolom | Deskripsi | Wajib | Contoh |
|-------|-----------|-------|--------|
| **Supplier ID** | ID supplier dari sistem | Ya | S001 |
| **Supplier Name** | Nama supplier/PBF | Ya | PT Pharma Indonesia |
| **Product ID** | ID produk dari inventory | Ya | P001 |
| **Product Name** | Nama produk obat/alkes | Ya | Paracetamol 500mg |
| **SKU** | Stock Keeping Unit | Ya | MED-PCT-500 |
| **Price** | Harga per unit (Rupiah) | Ya | 2500 |
| **Unit** | Satuan produk | Ya | Strip, Box, Botol |
| **Min Order** | Minimum order quantity | Ya | 10 |
| **Valid From** | Tanggal mulai berlaku | Ya | 2025-01-01 |
| **Valid To** | Tanggal berakhir | Ya | 2025-12-31 |
| **Status** | Status pricelist | Ya | active/inactive |

### Contoh Data:

```
Supplier ID | Supplier Name      | Product ID | Product Name       | SKU         | Price | Unit  | Min Order | Valid From | Valid To   | Status
S001        | PT Pharma Indonesia| P001       | Paracetamol 500mg  | MED-PCT-500 | 2500  | Strip | 10        | 2025-01-01 | 2025-12-31 | active
S001        | PT Pharma Indonesia| P002       | Amoxicillin 500mg  | MED-AMX-500 | 4500  | Strip | 5         | 2025-01-01 | 2025-12-31 | active
```

### Catatan Penting:

1. **Format Tanggal**: Gunakan format YYYY-MM-DD
2. **Harga**: Masukkan angka saja tanpa titik/koma pemisah
3. **Status**: Hanya gunakan "active" atau "inactive"
4. **Product ID**: Harus sesuai dengan ID produk yang ada di inventory
5. **Supplier ID**: Harus sesuai dengan ID supplier yang terdaftar

### Langkah Upload:

1. Download template Excel dari sistem
2. Isi data sesuai format yang ditentukan
3. Simpan file dalam format .xlsx
4. Upload melalui tombol "Upload Pricelist"
5. Sistem akan memvalidasi dan memproses data otomatis

### Validasi Sistem:

- ✅ Format file Excel/CSV
- ✅ Kolom wajib terisi semua
- ✅ Format tanggal valid
- ✅ Harga berupa angka positif
- ✅ Product ID dan Supplier ID valid
- ✅ Status sesuai enum yang diizinkan
