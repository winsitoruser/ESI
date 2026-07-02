const db = require('../../../models');
const { LoyaltyTier } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const tiers = await LoyaltyTier.findAll({
          where: { isActive: true },
          order: [['tierLevel', 'ASC']],
          attributes: [
            'id',
            'tierName',
            'tierLevel',
            'minSpending',
            'pointMultiplier',
            'discountPercentage',
            'benefits',
            'color'
          ]
        });

        return res.status(200).json({
          success: true,
          data: tiers
        });

      default:
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Loyalty Tiers API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
