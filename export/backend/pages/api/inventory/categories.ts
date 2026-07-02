import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import InventoryAdapter from '../../../lib/adapters/inventory-adapter';

const inventoryAdapter = new InventoryAdapter();

// Simple auth options for session handling
const authOptions = {
  callbacks: {
    session: ({ session, token }: any) => ({
      ...session,
      user: {
        ...session.user,
        id: token?.sub,
        tenantId: 'default-tenant'
      }
    })
  }
};

// Mock categories data for fallback
const mockCategories = [
  {
    id: '1',
    name: 'Obat Bebas',
    description: 'Obat yang dapat dibeli tanpa resep dokter',
    color: '#10B981',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '2',
    name: 'Obat Bebas Terbatas',
    description: 'Obat yang dapat dibeli dengan batasan tertentu',
    color: '#F59E0B',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '3',
    name: 'Obat Keras',
    description: 'Obat yang hanya dapat dibeli dengan resep dokter',
    color: '#EF4444',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '4',
    name: 'Obat Psikotropika',
    description: 'Obat yang mempengaruhi sistem saraf pusat',
    color: '#8B5CF6',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: '5',
    name: 'Suplemen & Vitamin',
    description: 'Suplemen makanan dan vitamin',
    color: '#06B6D4',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get session for authentication
    const session = await getServerSession(req, res, authOptions);
    const tenantId = session?.user?.tenantId || 'default-tenant';
    const userId = session?.user?.id || 'anonymous';

    const { method } = req;

    switch (method) {
      case 'GET':
        return handleGetCategories(req, res);
      case 'POST':
        return handleCreateCategory(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error: any) {
    console.error('Categories API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleGetCategories(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { page = '1', limit = '10', search, isActive } = req.query;
    const pageNum = parseInt(page.toString(), 10);
    const limitNum = Math.min(parseInt(limit.toString(), 10), 100);

    // Use mock data with proper filtering and pagination
    let filteredCategories = [...mockCategories];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toString().toLowerCase();
      filteredCategories = filteredCategories.filter(category => 
        category.name.toLowerCase().includes(searchLower) ||
        category.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply active status filter
    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      filteredCategories = filteredCategories.filter(category => 
        category.isActive === activeFilter
      );
    }

    // Apply pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

    return res.status(200).json({
      success: true,
      data: paginatedCategories,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(filteredCategories.length / limitNum),
        totalItems: filteredCategories.length,
        itemsPerPage: limitNum
      },
      message: 'Categories retrieved successfully'
    });
  } catch (error: any) {
    console.error('Error getting categories:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleCreateCategory(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { name, description, color, isActive = true } = req.body;

  // Basic validation
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required' });
  }

  console.log('Creating category', { name });

  try {
    // Generate new ID
    const newId = (mockCategories.length + 1).toString();
    
    // Create new category
    const newCategory = {
      id: newId,
      name,
      description: description || '',
      color: color || '#6B7280',
      isActive: Boolean(isActive),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to mock data (in production, this would be saved to database)
    mockCategories.push(newCategory);
    
    console.log('Category created successfully', { id: newCategory.id });
    
    res.status(201).json({
      success: true,
      data: newCategory,
      meta: {
        isMock: true
      }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
}
