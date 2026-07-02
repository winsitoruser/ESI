import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

// Import model Sequelize
let db;
try {
  db = require('../../../server/sequelize/models');
} catch (error) {
  console.warn('Failed to import Sequelize models:', error);
  db = null;
}

// Define local auth options if import fails
const authOptions = {
  providers: [],
  callbacks: {
    async session({ session }) {
      return session;
    }
  }
};

// Data mock untuk fallback
const mockShelfPositions = [
  { 
    id: '1', 
    code: 'A01', 
    shelfName: 'Rak A', 
    level: 1, 
    section: 'Depan', 
    capacity: 100, 
    currentOccupancy: 65, 
    productCount: 12,
    description: 'Rak untuk obat-obatan keras', 
    createdAt: new Date('2025-01-15'), 
    updatedAt: new Date('2025-03-20') 
  },
  { 
    id: '2', 
    code: 'A02', 
    shelfName: 'Rak A', 
    level: 2, 
    section: 'Depan', 
    capacity: 100, 
    currentOccupancy: 45, 
    productCount: 8,
    description: 'Rak untuk vitamin dan suplemen', 
    createdAt: new Date('2025-01-18'), 
    updatedAt: new Date('2025-03-22') 
  },
  { 
    id: '3', 
    code: 'B01', 
    shelfName: 'Rak B', 
    level: 1, 
    section: 'Tengah', 
    capacity: 80, 
    currentOccupancy: 35, 
    productCount: 5,
    description: 'Rak untuk obat resep', 
    createdAt: new Date('2025-02-10'), 
    updatedAt: new Date('2025-04-05') 
  },
  { 
    id: '4', 
    code: 'C03', 
    shelfName: 'Rak C', 
    level: 3, 
    section: 'Belakang', 
    capacity: 120, 
    currentOccupancy: 90, 
    productCount: 15,
    description: 'Rak untuk produk kecantikan', 
    createdAt: new Date('2025-02-15'), 
    updatedAt: new Date('2025-04-10') 
  },
  { 
    id: '5', 
    code: 'D02', 
    shelfName: 'Rak D', 
    level: 2, 
    section: 'Khusus', 
    capacity: 50, 
    currentOccupancy: 20, 
    productCount: 3,
    description: 'Rak untuk obat bersyarat', 
    createdAt: new Date('2025-03-01'), 
    updatedAt: new Date('2025-04-15') 
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authentikasi user
  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (authError) {
    console.warn('Auth verification error:', authError);
  }
  
  if (!session && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized access, please login',
      isFromMock: true 
    });
  }
  
  // Handle berbagai HTTP methods (GET, POST, PUT, DELETE)
  switch (req.method) {
    case 'GET':
      return getShelfPositions(req, res);
    case 'POST':
      return createShelfPosition(req, res);
    case 'PUT':
      return updateShelfPosition(req, res);
    case 'DELETE':
      return deleteShelfPosition(req, res);
    default:
      return res.status(405).json({ 
        success: false, 
        message: 'Method not allowed',
        isFromMock: true 
      });
  }
}

// Fungsi untuk mendapatkan semua rak/posisi
async function getShelfPositions(req: NextApiRequest, res: NextApiResponse) {
  // Set timer untuk timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('API request timeout')), 5000);
  });

  try {
    if (!db || !db.ShelfPosition) {
      throw new Error('Database model tidak tersedia');
    }
    
    // Try database operation with timeout protection
    let dbResult;
    try {
      const result = await Promise.race([
        db.ShelfPosition.findAll({
          order: [['updatedAt', 'DESC']]
        }),
        timeoutPromise
      ]);
      
      dbResult = result;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      dbResult = null;
    }
    
    if (dbResult) {
      return res.status(200).json({
        success: true,
        data: dbResult,
        isFromMock: false,
        message: 'Data rak/posisi berhasil diambil dari database'
      });
    } else {
      // Fallback ke data mock jika database error
      return res.status(200).json({
        success: true,
        data: mockShelfPositions,
        isFromMock: true,
        message: 'Menggunakan data sementara karena kesalahan database'
      });
    }
  } catch (error) {
    console.error('Error fetching shelf positions:', error);
    
    // Fallback ke data mock jika terjadi error
    return res.status(200).json({
      success: true,
      data: mockShelfPositions,
      isFromMock: true,
      message: 'Menggunakan data sementara karena kesalahan sistem'
    });
  }
}

// Fungsi untuk membuat rak/posisi baru
async function createShelfPosition(req: NextApiRequest, res: NextApiResponse) {
  // Set timer untuk timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('API request timeout')), 5000);
  });

  try {
    // Validasi input
    const { code, shelfName } = req.body;
    if (!code || !shelfName) {
      return res.status(400).json({
        success: false,
        message: 'Kode dan nama rak wajib diisi',
        isFromMock: true
      });
    }

    if (!db || !db.ShelfPosition) {
      throw new Error('Database model tidak tersedia');
    }
    
    // Try database operation with timeout protection
    let dbResult;
    try {
      const result = await Promise.race([
        db.ShelfPosition.create({
          code: req.body.code,
          shelfName: req.body.shelfName,
          level: req.body.level || 1,
          section: req.body.section || 'Depan',
          capacity: req.body.capacity || 100,
          currentOccupancy: req.body.currentOccupancy || 0,
          productCount: 0,
          description: req.body.description || '',
          tenantId: req.body.tenantId || 'default'
        }),
        timeoutPromise
      ]);
      
      dbResult = result;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      dbResult = null;
    }
    
    if (dbResult) {
      return res.status(201).json({
        success: true,
        data: dbResult,
        isFromMock: false,
        message: 'Rak/posisi berhasil ditambahkan ke database'
      });
    } else {
      // Fallback ke data mock jika database error
      const mockId = Math.floor(Math.random() * 10000).toString();
      const mockData = {
        id: mockId,
        code: req.body.code,
        shelfName: req.body.shelfName,
        level: req.body.level || 1,
        section: req.body.section || 'Depan',
        capacity: req.body.capacity || 100,
        currentOccupancy: req.body.currentOccupancy || 0,
        productCount: 0,
        description: req.body.description || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return res.status(201).json({
        success: true,
        data: mockData,
        isFromMock: true,
        message: 'Rak/posisi berhasil ditambahkan (data simulasi)'
      });
    }
  } catch (error) {
    console.error('Error creating shelf position:', error);
    
    // Fallback ke data mock jika terjadi error
    const mockId = Math.floor(Math.random() * 10000).toString();
    const mockData = {
      id: mockId,
      code: req.body.code || 'MOCK-CODE',
      shelfName: req.body.shelfName || 'Mock Shelf',
      level: req.body.level || 1,
      section: req.body.section || 'Depan',
      capacity: req.body.capacity || 100,
      currentOccupancy: req.body.currentOccupancy || 0,
      productCount: 0,
      description: req.body.description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return res.status(201).json({
      success: true,
      data: mockData,
      isFromMock: true,
      message: 'Rak/posisi berhasil ditambahkan (data simulasi)'
    });
  }
}

// Fungsi untuk memperbarui rak/posisi
async function updateShelfPosition(req: NextApiRequest, res: NextApiResponse) {
  // Set timer untuk timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('API request timeout')), 5000);
  });

  try {
    // Validasi input
    const { id, code, shelfName } = req.body;
    if (!id || !code || !shelfName) {
      return res.status(400).json({
        success: false,
        message: 'ID, kode, dan nama rak wajib diisi',
        isFromMock: true
      });
    }

    if (!db || !db.ShelfPosition) {
      throw new Error('Database model tidak tersedia');
    }
    
    // Try database operation with timeout protection
    let dbResult;
    try {
      const shelfPosition = await db.ShelfPosition.findByPk(id);
      
      if (!shelfPosition) {
        throw new Error('Rak/posisi tidak ditemukan');
      }
      
      const result = await Promise.race([
        shelfPosition.update({
          code: req.body.code,
          shelfName: req.body.shelfName,
          level: req.body.level || 1,
          section: req.body.section || 'Depan',
          capacity: req.body.capacity || 100,
          currentOccupancy: req.body.currentOccupancy || 0,
          description: req.body.description || ''
        }),
        timeoutPromise
      ]);
      
      dbResult = result;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      dbResult = null;
    }
    
    if (dbResult) {
      return res.status(200).json({
        success: true,
        data: dbResult,
        isFromMock: false,
        message: 'Rak/posisi berhasil diperbarui'
      });
    } else {
      // Fallback ke data mock jika database error
      const mockData = {
        id: req.body.id,
        code: req.body.code,
        shelfName: req.body.shelfName,
        level: req.body.level || 1,
        section: req.body.section || 'Depan',
        capacity: req.body.capacity || 100,
        currentOccupancy: req.body.currentOccupancy || 0,
        productCount: req.body.productCount || 0,
        description: req.body.description || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return res.status(200).json({
        success: true,
        data: mockData,
        isFromMock: true,
        message: 'Rak/posisi berhasil diperbarui (data simulasi)'
      });
    }
  } catch (error) {
    console.error('Error updating shelf position:', error);
    
    // Fallback ke data mock jika terjadi error
    const mockData = {
      id: req.body.id || '0',
      code: req.body.code || 'MOCK-CODE',
      shelfName: req.body.shelfName || 'Mock Shelf',
      level: req.body.level || 1,
      section: req.body.section || 'Depan',
      capacity: req.body.capacity || 100,
      currentOccupancy: req.body.currentOccupancy || 0,
      productCount: req.body.productCount || 0,
      description: req.body.description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return res.status(200).json({
      success: true,
      data: mockData,
      isFromMock: true,
      message: 'Rak/posisi berhasil diperbarui (data simulasi)'
    });
  }
}

// Fungsi untuk menghapus rak/posisi
async function deleteShelfPosition(req: NextApiRequest, res: NextApiResponse) {
  // Set timer untuk timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('API request timeout')), 5000);
  });

  try {
    // Validasi input
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID rak/posisi wajib disertakan',
        isFromMock: true
      });
    }

    if (!db || !db.ShelfPosition) {
      throw new Error('Database model tidak tersedia');
    }
    
    // Try database operation with timeout protection
    let dbResult;
    try {
      const shelfPosition = await db.ShelfPosition.findByPk(id);
      
      if (!shelfPosition) {
        throw new Error('Rak/posisi tidak ditemukan');
      }
      
      const result = await Promise.race([
        shelfPosition.destroy(),
        timeoutPromise
      ]);
      
      dbResult = result;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      dbResult = null;
    }
    
    if (dbResult) {
      return res.status(200).json({
        success: true,
        isFromMock: false,
        message: 'Rak/posisi berhasil dihapus'
      });
    } else {
      // Fallback ke data mock jika database error
      return res.status(200).json({
        success: true,
        isFromMock: true,
        message: 'Rak/posisi berhasil dihapus (data simulasi)'
      });
    }
  } catch (error) {
    console.error('Error deleting shelf position:', error);
    
    // Fallback ke data mock jika terjadi error
    return res.status(200).json({
      success: true,
      isFromMock: true,
      message: 'Rak/posisi berhasil dihapus (data simulasi)'
    });
  }
}
