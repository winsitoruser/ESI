import type { NextApiRequest, NextApiResponse } from 'next';
import InventoryAdapter from '../../../lib/adapters/inventory-adapter';

const inventoryAdapter = new InventoryAdapter();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return handleGetProducts(req, res);
      case 'POST':
        return handleCreateProduct(req, res);
      case 'PUT':
        return handleUpdateProduct(req, res);
      case 'DELETE':
        return handleDeleteProduct(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ 
          success: false, 
          message: `Method ${method} not allowed` 
        });
    }
  } catch (error: any) {
    console.error('Products API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleGetProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      page = '1', 
      limit = '20', 
      search = '', 
      category = '', 
      lowStock = 'false'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const filters = {
      search: search as string,
      category: category as string,
      lowStock: lowStock === 'true',
      page: pageNum,
      limit: limitNum
    };

    const result = await inventoryAdapter.getProducts(filters);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to fetch products'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data?.items || [],
      pagination: result.data?.pagination || {
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0
      },
      message: 'Products retrieved successfully'
    });

  } catch (error: any) {
    console.error('Get Products Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleCreateProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, sku, category, unit, price, stock, reorderPoint, supplier } = req.body;

    // Validate required fields
    if (!name || !category || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, price, and stock are required'
      });
    }

    const productData = {
      name,
      sku: sku || `SKU-${Date.now()}`,
      category,
      unit: unit || 'PCS',
      price: parseFloat(price),
      stock: parseInt(stock),
      reorderPoint: parseInt(reorderPoint) || 10,
      supplier: supplier || 'Unknown'
    };

    const result = await inventoryAdapter.createProduct(productData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to create product'
      });
    }

    return res.status(201).json({
      success: true,
      data: result.data,
      message: 'Product created successfully'
    });

  } catch (error: any) {
    console.error('Create Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleUpdateProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Convert numeric fields
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock);
    }
    if (updateData.reorderPoint !== undefined) {
      updateData.reorderPoint = parseInt(updateData.reorderPoint);
    }

    const result = await inventoryAdapter.updateProduct(id as string, updateData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to update product'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Product updated successfully'
    });

  } catch (error: any) {
    console.error('Update Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function handleDeleteProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // For safety, we'll mark as inactive instead of hard delete
    const result = await inventoryAdapter.updateProduct(id as string, { isActive: false });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to delete product'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      message: 'Product deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

