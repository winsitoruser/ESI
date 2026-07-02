/**
 * API endpoint for managing receipt templates
 * 
 * Handles CRUD operations for receipt templates
 * GET - List all templates or get a specific template by ID
 * POST - Create a new template
 * PUT - Update an existing template
 * DELETE - Delete a template
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { getLogger } from '@/lib/logging';
import { authOptions } from '../auth/[...nextauth]';
import { withTimeout } from '@/lib/api-utils';

const logger = getLogger('api/pos/receipt-templates');

// Types for API response
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

// Mock database for templates (will be replaced with real DB integration)
let templateStorage: any[] = [];

/**
 * Receipt template API handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  const session = await getServerSession(req, res, authOptions);
  
  // Check if user is authenticated
  if (!session) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authenticated' 
    });
  }
  
  // Create child logger with request context
  const childLogger = logger.child({
    method: req.method,
    url: req.url,
    userId: (session as any)?.user?.id || 'unknown'
  });
  
  try {
    switch (req.method) {
      case 'GET':
        return await withTimeout(handleGet(req, res, childLogger), 5000);
      case 'POST':
        return await withTimeout(handlePost(req, res, childLogger), 5000);
      case 'PUT':
        return await withTimeout(handlePut(req, res, childLogger), 5000);
      case 'DELETE':
        return await withTimeout(handleDelete(req, res, childLogger), 5000);
      default:
        return res.status(405).json({ 
          success: false, 
          error: 'Method not allowed' 
        });
    }
  } catch (error) {
    childLogger.error('Error handling receipt template request', { error });
    
    // Check if error was caused by timeout
    if ((error as Error).message === 'Request timeout') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

/**
 * Handle GET requests
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>, logger: any) {
  const { id, storeId } = req.query;
  const tenantId = (req.query.tenantId as string) || (req as any).tenantId || 'default';
  
  logger.info('Fetching receipt templates', { id, storeId, tenantId });

  try {
    // Return a mock response for now
    // This will be replaced with real database calls later
    
    // If specific template requested by ID
    if (id) {
      // In the mock implementation, just return success
      return res.status(200).json({
        success: true,
        data: {
          id: id,
          name: 'Sample Template',
          description: 'A sample receipt template',
          isDefault: true,
          paperWidth: 80,
          paperAutocut: true,
          characterSet: 'PC437_USA',
          openCashDrawer: false,
          sections: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      });
    }
    
    // Return list of templates (mock)
    return res.status(200).json({
      success: true,
      data: [
        {
          id: 'default-58mm',
          name: 'Default 58mm Template',
          description: 'Default template for 58mm thermal printers',
          isDefault: true,
          paperWidth: 58,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: 'default-80mm',
          name: 'Default 80mm Template',
          description: 'Default template for 80mm thermal printers',
          isDefault: true,
          paperWidth: 80,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    });
  } catch (error) {
    logger.error('Failed to fetch receipt templates', { error });
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch templates'
    });
  }
}

/**
 * Handle POST requests to create a new template
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>, logger: any) {
  const tenantId = (req.query.tenantId as string) || (req as any).tenantId || 'default';
  const data = req.body;
  
  logger.info('Creating new receipt template', { tenantId });
  
  try {
    // Validate request data
    if (!data.name || !data.paperWidth) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name and paperWidth'
      });
    }
    
    // Create template in database (mock)
    const newTemplate = {
      ...data,
      id: `template-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Store in mock database
    templateStorage.push(newTemplate);
    
    logger.info('Created receipt template', { id: newTemplate.id });
    
    return res.status(201).json({
      success: true,
      data: newTemplate
    });
  } catch (error) {
    logger.error('Failed to create receipt template', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  }
}

/**
 * Handle PUT requests to update a template
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>, logger: any) {
  const { id } = req.query;
  const data = req.body;
  
  logger.info('Updating receipt template', { id });
  
  try {
    // Validate request data
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing template ID'
      });
    }
    
    // Update template in database (mock)
    // In real implementation, check if template exists and update it
    
    const updatedTemplate = {
      ...data,
      id,
      updatedAt: Date.now()
    };
    
    logger.info('Updated receipt template', { id });
    
    return res.status(200).json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    logger.error('Failed to update receipt template', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
}

/**
 * Handle DELETE requests to delete a template
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>, logger: any) {
  const { id } = req.query;
  
  logger.info('Deleting receipt template', { id });
  
  try {
    // Validate request data
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing template ID'
      });
    }
    
    // Delete template from database (mock)
    // In real implementation, check if template exists and delete it
    
    // Remove from mock storage
    templateStorage = templateStorage.filter((t: any) => t.id !== id);
    
    logger.info('Deleted receipt template', { id });
    
    return res.status(200).json({
      success: true,
      data: { id }
    });
  } catch (error) {
    logger.error('Failed to delete receipt template', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to delete template'
    });
  }
}
