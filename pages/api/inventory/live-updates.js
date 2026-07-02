const inventoryAnalysisService = require('../../../services/inventoryAnalysisService');

/**
 * GET /api/inventory/live-updates
 * Returns real-time inventory updates for marquee display
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const updates = await inventoryAnalysisService.getLiveUpdates();

    return res.status(200).json({
      success: true,
      data: updates,
      total: updates.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Live Updates API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
