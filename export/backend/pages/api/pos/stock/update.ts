import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Authenticate user - comment out for testing if needed
    // const user = await authenticateUser(req);
    // if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'PHARMACIST'])) {
    //   return res.status(403).json({ message: 'Unauthorized access' });
    // }
    
    // Handle POST request to update stock data
    if (req.method === 'POST') {
      const { stocktakeItems, updateSource } = req.body;
      
      if (!stocktakeItems || !Array.isArray(stocktakeItems)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid input: stocktakeItems must be an array' 
        });
      }
      
      // Log updates for audit trail
      console.log(`Stock update from ${updateSource || 'unknown source'}:`, stocktakeItems);
      
      // In a real implementation, this would update a database
      // For now, simulate a successful update
      
      // Return a success response with updated item count
      return res.status(200).json({ 
        success: true,
        message: `Successfully updated ${stocktakeItems.length} items`,
        updatedCount: stocktakeItems.length,
        timestamp: new Date().toISOString()
      });
    }
    
    // Method not allowed
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error processing stock update request:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error'
    });
  }
}
