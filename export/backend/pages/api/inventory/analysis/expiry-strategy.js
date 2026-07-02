const inventoryAnalysisService = require('../../../../services/inventoryAnalysisService');

/**
 * GET /api/inventory/analysis/expiry-strategy
 * Returns expiry analysis and FIFO/FEFO recommendations
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const analysis = await inventoryAnalysisService.analyzeExpiryAndStrategy();

    return res.status(200).json({
      success: true,
      data: analysis,
      message: 'Expiry strategy analysis completed'
    });
  } catch (error) {
    console.error('Expiry Strategy API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
