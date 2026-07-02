import { NextApiRequest, NextApiResponse } from 'next';

interface AddToDefektaRequest {
  productId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  reorderPoint: number;
  price: number;
  supplier?: string;
  category?: string;
  unit?: string;
  location?: string;
  reason?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface DefektaItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  lastPurchasePrice: number;
  priority: 'high' | 'medium' | 'low';
  supplier: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  status: 'pending' | 'approved' | 'rejected';
  category: string;
  unit: string;
  location: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      productId,
      productName,
      sku,
      currentStock,
      reorderPoint,
      price,
      supplier,
      category,
      unit,
      location,
      reason,
      priority
    }: AddToDefektaRequest = req.body;

    // Validate required fields
    if (!productId || !productName) {
      return res.status(400).json({ 
        error: 'Product ID and name are required',
        details: 'productId and productName fields must be provided'
      });
    }

    // Calculate quantity needed
    const quantityNeeded = Math.max(reorderPoint - currentStock, 10);
    
    // Determine priority based on stock level if not provided
    let calculatedPriority: 'high' | 'medium' | 'low' = priority || 'medium';
    if (!priority) {
      if (currentStock === 0) {
        calculatedPriority = 'high';
      } else if (currentStock <= reorderPoint * 0.5) {
        calculatedPriority = 'high';
      } else if (currentStock <= reorderPoint * 0.8) {
        calculatedPriority = 'medium';
      } else {
        calculatedPriority = 'low';
      }
    }

    // Create defekta item
    const defektaItem: DefektaItem = {
      id: `def-inv-${Date.now()}`,
      productId,
      productName,
      sku: sku || productId,
      quantity: quantityNeeded,
      price,
      lastPurchasePrice: Math.round(price * 0.8), // Assume 80% of selling price
      priority: calculatedPriority,
      supplier: supplier || 'Unknown Supplier',
      currentStock,
      minimumStock: reorderPoint,
      reorderPoint,
      status: 'pending',
      category: category || 'General',
      unit: unit || 'pcs',
      location: location || 'Unknown Location',
      reason: reason || (currentStock === 0 
        ? 'Stok habis - perlu segera dipesan' 
        : `Stok rendah (${currentStock}/${reorderPoint})`),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real implementation, this would:
    // 1. Check if product already exists in defekta
    // 2. Save to database
    // 3. Send notification to purchasing team
    // 4. Update inventory tracking

    // For now, we'll call the purchasing defekta API to add the item
    try {
      const defektaResponse = await fetch(`${req.headers.origin || 'http://localhost:7072'}/api/purchasing/defecta/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(defektaItem),
      });

      if (!defektaResponse.ok) {
        console.error('Failed to add to defekta:', await defektaResponse.text());
        throw new Error('Failed to add to purchasing defekta');
      }

      const defektaResult = await defektaResponse.json();
      
      console.log('Successfully added to defekta:', defektaResult);

      return res.status(201).json({
        success: true,
        message: 'Product successfully added to defekta',
        data: {
          defektaItem: defektaResult,
          inventoryProduct: {
            productId,
            productName,
            currentStock,
            reorderPoint,
            quantityNeeded,
            priority: calculatedPriority
          }
        }
      });

    } catch (defektaError) {
      console.error('Error adding to defekta:', defektaError);
      
      // Still return success but with a note about defekta integration
      return res.status(201).json({
        success: true,
        message: 'Product processed for defekta (integration pending)',
        data: {
          defektaItem,
          inventoryProduct: {
            productId,
            productName,
            currentStock,
            reorderPoint,
            quantityNeeded,
            priority: calculatedPriority
          }
        },
        warning: 'Defekta integration temporarily unavailable'
      });
    }

  } catch (error: any) {
    console.error('Error in add-to-defekta API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to process defekta request'
    });
  }
}
