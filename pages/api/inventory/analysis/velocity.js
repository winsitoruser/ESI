const inventoryAnalysisService = require('../../../../services/inventoryAnalysisService');

/**
 * GET /api/inventory/analysis/velocity
 * Returns product velocity analysis (fast moving, slow moving)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { days = 30 } = req.query;
    const analysis = await inventoryAnalysisService.analyzeProductVelocity(parseInt(days));

    return res.status(200).json({
      success: true,
      data: analysis,
      message: `Velocity analysis for ${days} days completed`
    });
  } catch (error) {
    console.error('Velocity Analysis API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
