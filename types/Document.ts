// Kategori dokumen yang didukung sistem
export type DocumentCategory = 
  | 'invoice'                // Faktur
  | 'delivery-note'          // Surat Jalan
  | 'quality-check'          // Laporan QC/QA
  | 'product-specification'  // Spesifikasi Produk
  | 'certificate'            // Sertifikat/Lisensi
  | 'other';                 // Dokumen Lainnya

/**
 * Interface untuk dokumen dalam sistem
 */
export interface Document {
  id: string;                  // ID unik dokumen
  filename: string;            // Nama file di penyimpanan
  originalName: string;        // Nama file asli saat diupload
  path?: string;               // Path relatif file dalam sistem penyimpanan
  fileType: string;            // Tipe MIME file
  size: number;                // Ukuran file dalam bytes
  url: string;                 // URL untuk mengakses file
  thumbnailUrl?: string;       // URL thumbnail untuk preview
  description?: string;        // Deskripsi dokumen
  category?: DocumentCategory; // Kategori dokumen
  tags?: string[];             // Tag untuk pencarian dan filtrasi
  receiptId?: string;          // ID penerimaan barang terkait
  returnId?: string;           // ID pengembalian barang terkait
  uploadedBy?: string;         // ID pengguna yang mengunggah dokumen
  tenantId: string;            // ID tenant dalam sistem multi-tenant
  isFromMock?: boolean;        // Flag untuk menandai dokumen dari mock data
  name?: string;               // Alias untuk originalName (kompatibilitas)
  type?: string;               // Alias untuk fileType (kompatibilitas)
  createdAt: Date;             // Tanggal pembuatan dokumen
  updatedAt: Date;             // Tanggal pembaruan terakhir
}

/**
 * Interface untuk input dokumen saat pembuatan
 */
export interface DocumentInput {
  filename: string;            // Nama file di penyimpanan
  originalName: string;        // Nama file asli saat diupload
  path?: string;               // Path relatif file dalam sistem penyimpanan
  fileType: string;            // Tipe MIME file
  size: number;                // Ukuran file dalam bytes
  url: string;                 // URL untuk mengakses file
  thumbnailUrl?: string;       // URL thumbnail untuk preview
  description?: string;        // Deskripsi dokumen
  category?: DocumentCategory; // Kategori dokumen
  tags?: string[];             // Tag untuk pencarian dan filtrasi
  receiptId?: string;          // ID penerimaan barang terkait
  returnId?: string;           // ID pengembalian barang terkait
  uploadedBy?: string;         // ID pengguna yang mengunggah dokumen
  tenantId?: string;           // ID tenant dalam sistem multi-tenant
}
