const inventoryAnalysisService = require('../../../../services/inventoryAnalysisService');

/**
 * GET /api/inventory/analysis/stock-suggestions
 * Returns stock level suggestions based on min/max parameters
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const suggestions = await inventoryAnalysisService.generateStockSuggestions();

    // Group by severity
    const grouped = {
      critical: suggestions.filter(s => s.severity === 'critical'),
      warning: suggestions.filter(s => s.severity === 'warning'),
      info: suggestions.filter(s => s.severity === 'info')
    };

    return res.status(200).json({
      success: true,
      data: suggestions,
      grouped,
      summary: {
        total: suggestions.length,
        critical: grouped.critical.length,
        warning: grouped.warning.length,
        info: grouped.info.length
      }
    });
  } catch (error) {
    console.error('Stock Suggestions API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
