import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prescriptionAdapter from '@/server/sequelize/adapters/inventory-prescription-adapter';
import { logger } from '@/server/monitoring';

// Create a child logger for this endpoint
const endpointLogger = logger.child({
  endpoint: '/api/inventory/transactions/prescription-processing',
  service: 'api'
});

/**
 * Endpoint untuk memproses pengurangan stok ketika resep obat diproses/diracik
 * 
 * Request:
 * - prescriptionId: ID resep yang sedang diproses
 * - action: 'reserve' (saat peracikan dimulai) atau 'commit' (saat peracikan selesai)
 * - tenantId: ID tenant (opsional, default jika tidak disediakan)
 * 
 * Response:
 * - success: true/false
 * - stockUpdates: daftar item yang stoknya diperbarui
 * - outOfStockItems: daftar item yang stoknya tidak mencukupi (jika ada)
 * - isFromMock: boolean yang menunjukkan apakah data berasal dari mock data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();
  endpointLogger.info('Request received', { method: req.method });
  
  // Verifikasi autentikasi
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    endpointLogger.warn('Unauthorized access attempt');
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized' 
    });
  }

  // Cek jika user memiliki izin akses (PHARMACIST, ADMIN)
  const allowedRoles = ['ADMIN', 'PHARMACIST'];
  if (!allowedRoles.includes(session.user.role)) {
    endpointLogger.warn('Insufficient permissions', { userRole: session.user.role });
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Insufficient permissions' 
    });
  }

  // Hanya handle metode POST
  if (req.method !== 'POST') {
    endpointLogger.warn('Method not allowed', { method: req.method });
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }
  
  // Extract tenant ID from request or session
  const tenantId = req.body.tenantId || session.user.tenantId;

  try {
    const { prescriptionId, action } = req.body;
    
    endpointLogger.info('Processing prescription', { 
      prescriptionId, 
      action, 
      tenantId,
      userId: session.user.id 
    });
    
    if (!prescriptionId || !action) {
      endpointLogger.warn('Incomplete request data');
      return res.status(400).json({ 
        success: false,
        message: 'Data tidak lengkap. prescriptionId dan action wajib diisi.' 
      });
    }
    
    // Hanya mendukung action 'reserve' dan 'commit'
    if (action !== 'reserve' && action !== 'commit') {
      endpointLogger.warn('Invalid action', { action });
      return res.status(400).json({ 
        success: false,
        message: 'Action tidak valid. Harus \'reserve\' atau \'commit\'.' 
      });
    }
    
    // Ambil data resep dengan adapter
    let prescription;
    let isFromMock = false;
    
    const { prescription: fetchedPrescription, isMock } = await prescriptionAdapter.getPrescriptionById(
      prescriptionId,
      tenantId
    );
    
    prescription = fetchedPrescription;
    isFromMock = isMock;
    
    if (!prescription) {
      endpointLogger.warn('Prescription not found', { prescriptionId, tenantId });
      return res.status(404).json({ 
        success: false,
        message: 'Resep tidak ditemukan.' 
      });
    }
    
    // Cek status resep
    if (prescription.status !== 'ACTIVE') {
      endpointLogger.warn('Prescription is inactive', { prescriptionId, status: prescription.status });
      return res.status(400).json({ 
        success: false,
        message: 'Resep ini sudah tidak aktif.' 
      });
    }
    
    // Cek status peracikan sesuai dengan action
    if (action === 'reserve' && prescription.dispensingStatus !== 'PENDING') {
      endpointLogger.warn('Invalid dispensing status for reserve action', { 
        prescriptionId, 
        dispensingStatus: prescription.dispensingStatus 
      });
      return res.status(400).json({ 
        success: false,
        message: 'Resep ini sudah dalam proses peracikan atau sudah selesai.' 
      });
    }
    
    if (action === 'commit' && prescription.dispensingStatus !== 'IN_PROGRESS') {
      endpointLogger.warn('Invalid dispensing status for commit action', { 
        prescriptionId, 
        dispensingStatus: prescription.dispensingStatus 
      });
      return res.status(400).json({ 
        success: false,
        message: 'Resep ini belum dalam proses peracikan atau sudah selesai.' 
      });
    }
    
    // Proses pengurangan stok
    const stockUpdates = [];
    const outOfStockItems = [];
    let itemFromMock = false;
    
    // Lakukan operasi stok untuk setiap item obat
    for (const item of prescription.items as any[]) {
      try {
        endpointLogger.info('Processing drug stock', { 
          drugId: item.drugId, 
          drugName: item.drugName, 
          quantity: item.quantity 
        });
        
        // Cek stok tersedia menggunakan adapter
        const { drugStock, isMock: stockFromMock } = await prescriptionAdapter.findDrugStock(
          item.drugId, 
          tenantId
        );
        
        if (stockFromMock) {
          itemFromMock = true;
        }
        
        if (!drugStock || drugStock.quantity < item.quantity) {
          endpointLogger.warn('Insufficient stock', { 
            drugId: item.drugId, 
            requested: item.quantity, 
            available: drugStock ? drugStock.quantity : 0 
          });
          
          outOfStockItems.push({
            drugId: item.drugId,
            drugName: item.drugName,
            requestedQuantity: item.quantity,
            availableQuantity: drugStock ? drugStock.quantity : 0
          });
          continue;
        }
        
        // Tentukan operasi stok berdasarkan action
        if (action === 'reserve') {
          // Reservasi stok (tandai sebagai "reserved")
          const { data: updatedStock, isMock: updateFromMock } = await prescriptionAdapter.updateDrugStock(
            drugStock.id, 
            { reserved: drugStock.reserved + item.quantity }, 
            tenantId
          );
          
          if (updateFromMock) {
            itemFromMock = true;
          }
          
          // Catat log transaksi stok
          const transactionData = {
            drugId: item.drugId,
            quantity: -item.quantity, // Negatif untuk pengurangan
            transactionType: 'RESERVATION',
            referenceId: prescription.id,
            referenceType: 'PRESCRIPTION',
            notes: `Reservasi stok untuk resep ${prescription.id}`,
            createdBy: session.user.id
          };
          
          const { data: transaction, isMock: transactionFromMock } = await prescriptionAdapter.createInventoryTransaction(
            transactionData,
            tenantId
          );
          
          if (transactionFromMock) {
            itemFromMock = true;
          }
          
        } else if (action === 'commit') {
          // Commit stok (kurangi stok aktual)
          const { data: updatedStock, isMock: updateFromMock } = await prescriptionAdapter.updateDrugStock(
            drugStock.id, 
            { 
              quantity: drugStock.quantity - item.quantity,
              reserved: drugStock.reserved - item.quantity 
            }, 
            tenantId
          );
          
          if (updateFromMock) {
            itemFromMock = true;
          }
          
          // Catat log transaksi stok
          const transactionData = {
            drugId: item.drugId,
            quantity: -item.quantity, // Negatif untuk pengurangan
            transactionType: 'DISPENSED',
            referenceId: prescription.id,
            referenceType: 'PRESCRIPTION',
            notes: `Pengurangan stok untuk resep ${prescription.id}`,
            createdBy: session.user.id
          };
          
          const { data: transaction, isMock: transactionFromMock } = await prescriptionAdapter.createInventoryTransaction(
            transactionData,
            tenantId
          );
          
          if (transactionFromMock) {
            itemFromMock = true;
          }
        }
        
        // Tambahkan ke daftar berhasil diupdate
        stockUpdates.push({
          drugId: item.drugId,
          drugName: item.drugName,
          quantity: item.quantity,
          action: action === 'reserve' ? 'reserved' : 'dispensed'
        });
        
        endpointLogger.info('Successfully updated stock', { 
          drugId: item.drugId, 
          action: action === 'reserve' ? 'reserved' : 'dispensed', 
          quantity: item.quantity 
        });
        
      } catch (error) {
        endpointLogger.error('Error processing stock for drug', { 
          drugId: item.drugId, 
          error: error.message 
        });
        
        // Tambahkan ke daftar gagal
        outOfStockItems.push({
          drugId: item.drugId,
          drugName: item.drugName,
          requestedQuantity: item.quantity,
          error: 'Database error'
        });
      }
    }
    
    // Jika ada item yang stoknya tidak cukup, return error
    if (outOfStockItems.length > 0) {
      endpointLogger.warn('Some items are out of stock', { 
        outOfStockCount: outOfStockItems.length,
        prescriptionId
      });
      
      return res.status(400).json({
        success: false,
        message: 'Beberapa item tidak memiliki stok yang cukup',
        outOfStockItems,
        stockUpdates,
        isFromMock: isFromMock || itemFromMock
      });
    }
    
    // Update status peracikan resep
    let updatedPrescription;
    let prescriptionUpdateFromMock = false;
    
    const newStatus = action === 'reserve' ? 'IN_PROGRESS' : 'COMPLETED';
    
    try {
      const { data, isMock: updateFromMock } = await prescriptionAdapter.updatePrescriptionStatus(
        prescription.id,
        newStatus,
        tenantId
      );
      
      updatedPrescription = data;
      prescriptionUpdateFromMock = updateFromMock;
      
      endpointLogger.info('Prescription status updated', { 
        prescriptionId, 
        newStatus, 
        isFromMock: updateFromMock 
      });
      
    } catch (error) {
      endpointLogger.error('Error updating prescription status', { 
        prescriptionId, 
        error: error.message 
      });
      // Non-critical error, continue with success response
    }
    
    const responseTime = Date.now() - startTime;
    endpointLogger.info('Request completed successfully', { 
      prescriptionId, 
      responseTime,
      updatesCount: stockUpdates.length
    });
    
    return res.status(200).json({
      success: true,
      message: action === 'reserve' 
        ? 'Stok obat berhasil direservasi untuk peracikan' 
        : 'Stok obat berhasil diperbarui setelah peracikan',
      stockUpdates,
      updatedPrescription,
      isFromMock: isFromMock || itemFromMock || prescriptionUpdateFromMock,
      responseTime
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    endpointLogger.error('Error processing prescription stock', { 
      error: error.message, 
      stack: error.stack,
      responseTime
    });
    
    return res.status(500).json({ 
      success: false,
      message: 'Terjadi kesalahan saat memproses stok untuk resep',
      error: error.message,
      responseTime
    });
  }
}
