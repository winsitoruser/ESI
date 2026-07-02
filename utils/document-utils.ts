import { Document } from '@/types/Document';

/**
 * Utilitas untuk mengelola dokumen dalam aplikasi
 * Menggunakan pola "Data Mock First" untuk fallback ke data dummy jika API gagal
 */

// Kategori dokumen yang didukung
export type DocumentCategory = 
  | 'invoice'                // Faktur
  | 'delivery-note'          // Surat Jalan
  | 'quality-check'          // Laporan QC/QA
  | 'product-specification'  // Spesifikasi Produk
  | 'certificate'            // Sertifikat/Lisensi
  | 'other';                 // Dokumen Lainnya

// Konstanta untuk tipe file yang didukung
export const SUPPORTED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/jpg', 'image/gif',
  'application/pdf', 
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

// Ukuran file maksimum (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Data mock untuk fallback
const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-mock-1',
    filename: 'Faktur-ABC123.pdf',
    originalName: 'Faktur-ABC123.pdf',
    name: 'Faktur-ABC123.pdf',
    path: '/uploads/documents/Faktur-ABC123.pdf',
    fileType: 'application/pdf',
    type: 'application/pdf',
    size: 256000,
    url: '/mock/documents/mock-invoice.pdf',
    thumbnailUrl: '/mock/documents/mock-invoice-thumb.jpg',
    category: 'invoice',
    description: 'Faktur pembelian obat batch ABC123',
    receiptId: 'receipt-mock-1',
    uploadedBy: 'admin',
    tenantId: 'default',
    createdAt: new Date(),
    updatedAt: new Date(),
    isFromMock: true
  },
  {
    id: 'doc-mock-2',
    filename: 'SuratJalan-DEF456.pdf',
    originalName: 'SuratJalan-DEF456.pdf',
    name: 'SuratJalan-DEF456.pdf',
    path: '/uploads/documents/SuratJalan-DEF456.pdf',
    fileType: 'application/pdf',
    type: 'application/pdf',
    size: 198000,
    url: '/mock/documents/mock-delivery.pdf',
    thumbnailUrl: '/mock/documents/mock-delivery-thumb.jpg',
    category: 'delivery-note',
    description: 'Surat jalan pengiriman batch DEF456',
    receiptId: 'receipt-mock-1',
    uploadedBy: 'admin',
    tenantId: 'default',
    createdAt: new Date(),
    updatedAt: new Date(),
    isFromMock: true
  }
];

// Logger untuk error monitoring
const logError = (message: string, error: any) => {
  console.error(`[DocumentUtils] ${message}:`, error);
  // Implementasi logger lebih lanjut bisa ditambahkan di sini
};

/**
 * Validasi file sebelum upload
 * @param file File yang akan divalidasi
 * @returns Hasil validasi: valid atau pesan error
 */
export const validateFile = (file: File): { valid: boolean; message: string } => {
  // Validasi ukuran file
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File ${file.name} melebihi batas ukuran 5MB`
    };
  }
  
  // Validasi tipe file
  if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      message: `File ${file.name} memiliki format yang tidak didukung. Gunakan format PDF, JPG, PNG, DOC, atau XLS`
    };
  }
  
  return { valid: true, message: 'File valid' };
};

/**
 * Upload dokumen ke server
 * @param files File yang akan diupload
 * @param metadata Metadata terkait (receiptId, returnId, deskripsi, kategori)
 * @returns Dokumen yang berhasil diupload dengan informasinya
 */
export const uploadDocuments = async (
  files: File[],
  metadata: {
    receiptId?: string;
    returnId?: string;
    description?: string;
    category?: DocumentCategory;
    tags?: string[];
  }
): Promise<Document[]> => {
  if (!files.length) return [];
  
  // Validasi file sebelum upload
  const validFiles: File[] = [];
  const invalidFiles: { file: File; reason: string }[] = [];
  
  files.forEach(file => {
    const validation = validateFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, reason: validation.message });
    }
  });
  
  if (invalidFiles.length > 0) {
    logError('Beberapa file tidak valid:', invalidFiles);
  }
  
  if (validFiles.length === 0) {
    return [];
  }
  
  try {
    const formData = new FormData();
    
    // Tambahkan file ke formData
    validFiles.forEach(file => {
      formData.append('files', file);
    });
    
    // Tambahkan metadata
    if (metadata.receiptId) {
      formData.append('receiptId', metadata.receiptId);
    }
    
    if (metadata.returnId) {
      formData.append('returnId', metadata.returnId);
    }
    
    if (metadata.description) {
      formData.append('description', metadata.description);
    }
    
    if (metadata.category) {
      formData.append('category', metadata.category);
    }
    
    if (metadata.tags && metadata.tags.length > 0) {
      formData.append('tags', JSON.stringify(metadata.tags));
    }
    
    // Kirim permintaan ke server
    const response = await fetch('/api/inventory/documents/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Error saat upload dokumen: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Validasi respons server
    if (!result.data || !Array.isArray(result.data)) {
      logError('Format respons tidak valid:', result);
      return []; // Fallback ke array kosong
    }
    
    return result.data;
  } catch (error) {
    logError('Gagal upload dokumen', error);
    
    // Fallback ke mock data jika dalam mode development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DocumentUtils] Menggunakan mock data sebagai fallback');
      return MOCK_DOCUMENTS.filter(doc => {
        if (metadata.receiptId) return doc.receiptId === metadata.receiptId;
        if (metadata.returnId) return doc.returnId === metadata.returnId;
        return true;
      });
    }
    
    throw error;
  }
};

/**
 * Obtiene los documentos asociados a un recibo o devolución
 * @param params Parámetros de consulta (receiptId o returnId)
 * @returns Lista de documentos
 */
export const fetchDocuments = async (params: { 
  receiptId?: string; 
  returnId?: string;
}): Promise<Document[]> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.receiptId) {
      queryParams.append('receiptId', params.receiptId);
    }
    
    if (params.returnId) {
      queryParams.append('returnId', params.returnId);
    }
    
    const response = await fetch(`/api/inventory/documents?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Error al obtener documentos: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return [];
  }
};

/**
 * Elimina un documento
 * @param documentId ID del documento a eliminar
 * @returns true si fue eliminado correctamente
 */
export const deleteDocument = async (documentId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/inventory/documents?id=${documentId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Error al eliminar documento: ${response.status} ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return false;
  }
};

/**
 * Actualiza la descripción de un documento
 * @param documentId ID del documento
 * @param description Nueva descripción
 * @returns Documento actualizado o null si hubo un error
 */
export const updateDocumentDescription = async (
  documentId: string, 
  description: string
): Promise<Document | null> => {
  try {
    const response = await fetch(`/api/inventory/documents?id=${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ description })
    });
    
    if (!response.ok) {
      throw new Error(`Error al actualizar documento: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    return null;
  }
};
