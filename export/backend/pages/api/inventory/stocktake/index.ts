import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getSequelize } from '@/server/sequelize/connection';
import { InventoryStocktakeAdapter } from '@/server/sequelize/adapters/inventory-stocktake-adapter';
import logger from '@/lib/logger';
import { StocktakeSession } from '@/modules/inventory/services/stocktake-service';

// Initialize Sequelize and adapter
const sequelize = getSequelize();
const stocktakeAdapter = new InventoryStocktakeAdapter(sequelize);

/**
 * Handle stocktake API requests
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    logger.warn('Unauthorized access attempt to stocktake API');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // GET request handlers
    if (req.method === 'GET') {
      // Get data based on dataType parameter
      const { dataType, id, location, shelf } = req.query;

      switch (dataType) {
        case 'locations':
          return await handleGetLocations(req, res);
        case 'shelves':
          return await handleGetShelves(req, res, location as string);
        case 'products':
          return await handleGetProducts(req, res, shelf as string);
        case 'history':
          return await handleGetHistory(req, res);
        case 'historyDetail':
          return await handleGetHistoryDetail(req, res, id as string);
        default:
          logger.warn(`Invalid dataType parameter: ${dataType}`);
          return res.status(400).json({ success: false, message: 'Invalid dataType parameter' });
      }
    }
    
    // POST request handler - create new stocktake
    else if (req.method === 'POST') {
      return await handleCreateStocktake(req, res);
    }
    
    // PUT request handler - update stocktake status
    else if (req.method === 'PUT') {
      return await handleUpdateStocktake(req, res);
    }
    
    // Handle unsupported methods
    else {
      logger.warn(`Unsupported method: ${req.method} for stocktake API`);
      return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error: any) {
    logger.error('Error in stocktake API:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
}

/**
 * GET handler for locations
 */
async function handleGetLocations(req: NextApiRequest, res: NextApiResponse) {
  try {
    const locations = await stocktakeAdapter.getLocations();
    return res.status(200).json(locations);
  } catch (error: any) {
    logger.error('Error fetching stocktake locations:', error);
    
    // In development, return mock data
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Falling back to mock locations data');
      const mockLocations = stocktakeAdapter.getMockLocations();
      return res.status(200).json(mockLocations);
    }
    
    return res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
}

/**
 * GET handler for shelves
 */
async function handleGetShelves(req: NextApiRequest, res: NextApiResponse, locationId: string) {
  if (!locationId) {
    return res.status(400).json({ success: false, message: 'Location ID is required' });
  }
  
  try {
    const shelves = await stocktakeAdapter.getShelves(locationId);
    return res.status(200).json(shelves);
  } catch (error: any) {
    logger.error(`Error fetching shelves for location ${locationId}:`, error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shelves' });
  }
}

/**
 * GET handler for products
 */
async function handleGetProducts(req: NextApiRequest, res: NextApiResponse, shelfId: string) {
  if (!shelfId) {
    return res.status(400).json({ success: false, message: 'Shelf ID is required' });
  }
  
  try {
    const products = await stocktakeAdapter.getProducts(shelfId);
    return res.status(200).json(products);
  } catch (error: any) {
    logger.error(`Error fetching products for shelf ${shelfId}:`, error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
}

/**
 * GET handler for stocktake history
 */
async function handleGetHistory(req: NextApiRequest, res: NextApiResponse) {
  try {
    const history = await stocktakeAdapter.getHistory();
    return res.status(200).json(history);
  } catch (error: any) {
    logger.error('Error fetching stocktake history:', error);
    
    // In development, return mock data
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Falling back to mock history data');
      const mockHistory = stocktakeAdapter.getMockStocktakeHistory();
      return res.status(200).json(mockHistory);
    }
    
    return res.status(500).json({ success: false, message: 'Failed to fetch stocktake history' });
  }
}

/**
 * GET handler for stocktake history detail
 */
async function handleGetHistoryDetail(req: NextApiRequest, res: NextApiResponse, id: string) {
  if (!id) {
    return res.status(400).json({ success: false, message: 'Stocktake ID is required' });
  }
  
  try {
    const detail = await stocktakeAdapter.getHistoryDetail(id);
    return res.status(200).json(detail);
  } catch (error: any) {
    logger.error(`Error fetching stocktake history detail for ID ${id}:`, error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: `Stocktake session with ID ${id} not found` });
    }
    
    return res.status(500).json({ success: false, message: 'Failed to fetch stocktake detail' });
  }
}

/**
 * POST handler for creating a new stocktake
 */
async function handleCreateStocktake(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate request body
    const session = req.body as StocktakeSession;
    
    if (!session.date || !session.location || !session.stocktakeBy) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: date, location, and stocktakeBy are required' 
      });
    }
    
    if (!session.items || session.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stocktake session must have at least one item' 
      });
    }
    
    // Create stocktake
    const result = await stocktakeAdapter.saveSession(session);
    
    return res.status(201).json({
      success: true,
      id: result.id
    });
  } catch (error: any) {
    logger.error('Error creating stocktake:', error);
    return res.status(500).json({ success: false, message: `Failed to create stocktake: ${error.message}` });
  }
}

/**
 * PUT handler for updating stocktake status
 */
async function handleUpdateStocktake(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate request body
    const { id, status, notes, approvedBy } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: id and status are required' 
      });
    }
    
    // Valid status values
    const validStatus = ['completed', 'investigation', 'pending', 'cancelled'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status value. Must be one of: ${validStatus.join(', ')}` 
      });
    }
    
    // If status is completed, approvedBy is required
    if (status === 'completed' && !approvedBy) {
      return res.status(400).json({ 
        success: false, 
        message: 'approvedBy is required when status is completed' 
      });
    }
    
    // Update status
    const updated = await stocktakeAdapter.updateStatus(id, status, notes, approvedBy);
    
    if (!updated) {
      return res.status(404).json({ 
        success: false, 
        message: `Stocktake session with ID ${id} not found` 
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Stocktake status updated to ${status}`
    });
  } catch (error: any) {
    logger.error('Error updating stocktake status:', error);
    return res.status(500).json({ success: false, message: `Failed to update stocktake: ${error.message}` });
  }
}
