import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prescriptionAdapter from '@/server/sequelize/adapters/pos-prescription-adapter';
import { logger } from '@/server/monitoring';

const apiLogger = logger.child({ service: 'prescription-invoice-api' });

// Fee peracikan resep
const PRESCRIPTION_FEE = 10000;

/**
 * Endpoint untuk membuat invoice/bill otomatis saat resep selesai diracik
 * 
 * Request:
 * - prescriptionId: ID resep yang sudah selesai diracik
 * 
 * Response:
 * - success: true/false
 * - invoice: data invoice yang dibuat
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verifikasi autentikasi
  const session = await getServerSession(req, res, authOptions);
  
  // Enforce authentication in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!session) {
    if (isProduction) {
      return res.status(401).json({ message: 'Unauthorized' });
    } else {
      apiLogger.warn('Anonymous access to prescription invoice API in development mode');
      // Continue with test user in development
    }
  }

  // Cek jika user memiliki izin akses (PHARMACIST, CASHIER, ADMIN)
  if (session?.user?.role && !['ADMIN', 'PHARMACIST', 'CASHIER'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
  }

  // Hanya handle metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Setup timeout promise untuk safety
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('API timeout after 10 seconds')), 10000)
  );

  const tenantId = (session?.user as any)?.tenantId || 'default';
  const userId = (session?.user as any)?.id || 'test-user-id';
  
  apiLogger.info('Prescription invoice request received', { tenantId, userId });

  try {
    const { prescriptionId } = req.body;
    
    if (!prescriptionId) {
      return res.status(400).json({ 
        message: 'Data tidak lengkap. prescriptionId wajib diisi.' 
      });
    }
    
    // Ambil data resep dengan Sequelize
    const getPrescriptionPromise = prescriptionAdapter.getPrescriptionById(prescriptionId, tenantId);
    let prescription;
    
    try {
      prescription = await Promise.race([getPrescriptionPromise, timeoutPromise]);
      
      // Jika tidak ditemukan, coba gunakan mock data
      if (!prescription) {
        apiLogger.info(`Prescription not found, trying mock data for ${prescriptionId}`);
        prescription = prescriptionAdapter.generateMockPrescription(prescriptionId);
        
        if (!prescription && isProduction) {
          return res.status(404).json({ message: 'Resep tidak ditemukan.' });
        }
      }
      
      // Cek status resep
      if (prescription.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Resep ini sudah tidak aktif.' });
      }
      
      // Cek status peracikan
      if (prescription.dispensingStatus !== 'COMPLETED') {
        return res.status(400).json({ message: 'Peracikan resep ini belum selesai.' });
      }
    } catch (error) {
      apiLogger.error('Error fetching prescription:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback untuk testing di development
      if (!isProduction) {
        apiLogger.info(`Using mock prescription data for ${prescriptionId}`);
        prescription = prescriptionAdapter.generateMockPrescription(prescriptionId);
      } else {
        return res.status(500).json({ message: 'Gagal mengambil data resep.' });
      }
    }
    
    // Cek jika invoice sudah pernah dibuat dengan Sequelize
    const checkInvoicePromise = prescriptionAdapter.checkExistingInvoice(prescriptionId, tenantId);
    let existingInvoice;
    
    try {
      existingInvoice = await Promise.race([checkInvoicePromise, timeoutPromise]);
      
      if (existingInvoice) {
        apiLogger.info(`Invoice for prescription ${prescriptionId} already exists`);
        return res.status(200).json({
          success: true,
          message: 'Invoice untuk resep ini sudah dibuat sebelumnya.',
          invoice: existingInvoice,
          meta: {
            isFromMock: false
          }
        });
      }
    } catch (error) {
      apiLogger.error('Error checking existing invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Lanjutkan proses, asumsi belum ada invoice
    }
    // Buat invoice baru menggunakan adapter
    const createInvoicePromise = prescriptionAdapter.createPrescriptionInvoice(
      prescription,
      userId,
      tenantId
    );
    
    let invoice: any;
    try {
      invoice = await Promise.race([createInvoicePromise, timeoutPromise]) as any;
      
      apiLogger.info('Successfully created prescription invoice', {
        invoiceId: invoice.id,
        prescriptionId,
        isFromMock: !!invoice.isMock
      });
    } catch (error) {
      apiLogger.error('Error creating prescription invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Return error response in production
      if (isProduction) {
        return res.status(500).json({ 
          success: false,
          message: 'Terjadi kesalahan saat membuat invoice untuk resep',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Generate fallback invoice in development
      apiLogger.info('Using fallback mock invoice in development');
      invoice = {
        id: `INV-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        patientId: prescription.patient.id,
        referenceId: prescription.id,
        referenceType: 'PRESCRIPTION',
        status: 'PENDING',
        subTotal: 0,
        taxAmount: 0,
        taxRate: 0.1,
        total: 0,
        lineItems: [],
        createdBy: userId,
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isMock: true
      };
    }
    
    return res.status(201).json({
      success: true,
      message: 'Invoice berhasil dibuat untuk resep yang sudah diracik',
      invoice,
      meta: {
        isFromMock: !!invoice.isMock
      },
      redirectToCashier: `/pos/cashier/invoice/${invoice.id}`
    });
    
  } catch (error) {
    apiLogger.error('Unexpected error in prescription invoice API:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan saat membuat invoice untuk resep',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
