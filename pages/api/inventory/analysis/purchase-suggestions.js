const inventoryAnalysisService = require('../../../../services/inventoryAnalysisService');

/**
 * GET /api/inventory/analysis/purchase-suggestions
 * Returns purchase order suggestions based on velocity and stock levels
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const suggestions = await inventoryAnalysisService.generatePurchaseOrderSuggestions();

    // Group by priority
    const grouped = {
      high: suggestions.filter(s => s.priority === 'high'),
      medium: suggestions.filter(s => s.priority === 'medium'),
      low: suggestions.filter(s => s.priority === 'low')
    };

    return res.status(200).json({
      success: true,
      data: suggestions,
      grouped,
      summary: {
        total: suggestions.length,
        high_priority: grouped.high.length,
        medium_priority: grouped.medium.length,
        low_priority: grouped.low.length
      }
    });
  } catch (error) {
    console.error('Purchase Suggestions API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
