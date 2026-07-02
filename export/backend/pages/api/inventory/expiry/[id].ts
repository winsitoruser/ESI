import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { logger } from '@/server/monitoring';

// Import database dari models
const db = require('../../../../models');

const apiLogger = logger.child({ service: 'expiry-item-api' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authentikasi
    const session = await getServerSession(req, res, authOptions);
    
    // Skip auth check in development only
    if (!session && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const tenantId = session?.user?.tenantId || 'default-tenant';
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'ID produk kadaluarsa diperlukan'
      });
    }
    
    // GET - mengambil detail item kadaluarsa
    if (req.method === 'GET') {
      try {
        // Ambil item kadaluarsa dari database
        const expiryItem = await db.ProductExpiry.findOne({
          where: { id, tenantId }
        });
        
        if (!expiryItem) {
          return res.status(404).json({
            success: false,
            message: 'Item kadaluarsa tidak ditemukan'
          });
        }
        
        // Format item
        const itemData = expiryItem.toJSON();
        const today = new Date();
        const expiryDate = new Date(itemData.expiryDate);
        
        // Hitung days remaining
        const oneDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((expiryDate.getTime() - today.getTime()) / oneDay);
        
        // Hitung total value
        const value = parseFloat(itemData.costPrice) * itemData.currentStock;
        
        const formattedItem = {
          ...itemData,
          daysRemaining: diffDays,
          value,
          isFromMock: false
        };
        
        return res.status(200).json({
          success: true,
          data: formattedItem
        });
      } catch (error) {
        apiLogger.error('Error mengambil detail item kadaluarsa:', { error, id });
        
        // Fallback ke mock data
        // Generate random mock data for this ID
        const mockItem = generateMockItem(id);
        
        return res.status(200).json({
          success: true,
          data: mockItem,
          message: 'Detail produk kadaluarsa (data simulasi)',
          isFromMock: true
        });
      }
    }
    // PATCH - mengupdate status item kadaluarsa
    else if (req.method === 'PATCH') {
      const { actionTaken, notes } = req.body;
      
      if (!actionTaken) {
        return res.status(400).json({
          success: false,
          message: 'Aksi yang akan diambil harus disertakan'
        });
      }
      
      try {
        // Validasi aksi yang dibolehkan
        const validActions = ['none', 'discard', 'defecta', 'salesPromotion'];
        if (!validActions.includes(actionTaken)) {
          return res.status(400).json({
            success: false,
            message: 'Aksi tidak valid'
          });
        }
        
        // Cari item kadaluarsa di database
        const expiryItem = await db.ProductExpiry.findOne({
          where: { id, tenantId }
        });
        
        if (!expiryItem) {
          return res.status(404).json({
            success: false,
            message: 'Item kadaluarsa tidak ditemukan'
          });
        }
        
        // Update status aksi
        await expiryItem.update({
          actionTaken,
          notes: notes || expiryItem.notes,
          actionDate: new Date(),
          actionBy: session?.user?.name || 'unknown'
        });
        
        apiLogger.info(`Berhasil mengupdate aksi item kadaluarsa`, {
          id,
          action: actionTaken,
          tenantId
        });
        
        return res.status(200).json({
          success: true,
          message: 'Status item kadaluarsa berhasil diperbarui',
          data: expiryItem.toJSON()
        });
      } catch (error) {
        apiLogger.error('Error mengupdate status item kadaluarsa:', { error, id });
        
        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan saat mengupdate status item kadaluarsa'
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'PATCH']);
      return res.status(405).json({
        success: false,
        message: 'Method Not Allowed'
      });
    }
  } catch (error) {
    apiLogger.error('Error pada API item kadaluarsa:', { error });
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
}

// Generate a mock item for a given ID
function generateMockItem(id: string) {
  const categories = ["Analgesik", "Antibiotik", "Vitamin", "Suplemen", "Antihistamin", "Antiseptik", "Antidiabetes"];
  const locations = ["Rak A", "Rak B", "Rak C", "Rak D", "Gudang Utama"];
  const suppliers = ["PT. Farma Utama", "CV. Sehat Sentosa", "PT. Medika Jaya", "PT. Sarana Husada", "CV. Prima Farma"];
  
  const today = new Date();
  
  // Use the ID to generate consistent mock data
  const idNum = parseInt(id.replace('exp-', '')) || Math.floor(Math.random() * 100);
  
  // Generate expiry date
  const randomDays = (idNum * 7) % 180 - 20; // Some items already expired
  const expiryDate = new Date();
  expiryDate.setDate(today.getDate() + randomDays);
  
  // Calculate days remaining
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((expiryDate.getTime() - today.getTime()) / oneDay);
  
  // Set status based on days remaining
  let status: "expired" | "critical" | "warning" | "good";
  if (diffDays <= 0) {
    status = "expired";
  } else if (diffDays <= 30) {
    status = "critical";
  } else if (diffDays <= 90) {
    status = "warning";
  } else {
    status = "good";
  }
  
  // Stock and price based on ID
  const currentStock = (idNum * 3) % 100 + 1;
  const costPrice = ((idNum * 17) % 495000) + 5000;
  
  // Category, location, supplier based on ID
  const categoryIndex = idNum % categories.length;
  const locationIndex = idNum % locations.length;
  const supplierIndex = idNum % suppliers.length;
  
  return {
    id,
    productId: `prod-${idNum}`,
    productName: `Produk Farmasi ${idNum}`,
    sku: `SKU-${10000 + idNum}`,
    batchNumber: `BATCH-${String.fromCharCode(65 + (idNum % 26))}${Math.floor(idNum / 26) + 1}`,
    expiryDate,
    daysRemaining: diffDays,
    currentStock,
    value: costPrice * currentStock,
    status,
    category: categories[categoryIndex],
    quantity: currentStock,
    location: locations[locationIndex],
    supplier: suppliers[supplierIndex],
    costPrice,
    isFromMock: true,
    actionTaken: 'none',
    notes: '',
    actionDate: null,
    actionBy: null,
    tenantId: 'default-tenant',
    createdAt: new Date(Date.now() - (idNum * 86400000) % (365 * 86400000)),
    updatedAt: new Date(Date.now() - (idNum * 43200000) % (30 * 86400000))
  };
}
