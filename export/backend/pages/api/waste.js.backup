const db = require('../../models');
const { ProductionWaste, Production, Product, User } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const {
          waste_type,
          waste_category,
          status,
          date_from,
          date_to,
          production_id
        } = req.query;

        const where = {};
        if (waste_type) where.waste_type = waste_type;
        if (waste_category) where.waste_category = waste_category;
        if (status) where.status = status;
        if (production_id) where.production_id = production_id;
        if (date_from || date_to) {
          where.waste_date = {};
          if (date_from) where.waste_date[db.Sequelize.Op.gte] = new Date(date_from);
          if (date_to) where.waste_date[db.Sequelize.Op.lte] = new Date(date_to);
        }

        const waste = await ProductionWaste.findAll({
          where,
          include: [
            {
              model: Production,
              as: 'production',
              attributes: ['id', 'batch_number', 'status'],
              required: false
            },
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku'],
              required: false
            },
            {
              model: User,
              as: 'recorder',
              attributes: ['id', 'name', 'email'],
              required: false
            }
          ],
          order: [['waste_date', 'DESC'], ['created_at', 'DESC']]
        });

        // Calculate summary stats
        const totalWaste = waste.length;
        const totalLoss = waste.reduce((sum, w) => sum + parseFloat(w.net_loss || 0), 0);
        const totalRecovery = waste.reduce((sum, w) => sum + parseFloat(w.clearance_price || 0), 0);

        return res.status(200).json({
          success: true,
          data: waste,
          summary: {
            total_records: totalWaste,
            total_loss: totalLoss,
            total_recovery: totalRecovery,
            net_loss: totalLoss - totalRecovery
          }
        });

      case 'POST':
        const {
          production_id: prodId,
          product_id,
          waste_type: wType,
          waste_category: wCategory,
          quantity: qty,
          unit: wUnit,
          cost_value,
          disposal_method,
          clearance_price,
          reason: wReason,
          notes: wNotes,
          recorded_by,
          waste_date
        } = req.body;

        if (!wType || !wCategory || !qty || !wUnit || !cost_value || !disposal_method) {
          return res.status(400).json({
            success: false,
            message: 'Required fields: waste_type, waste_category, quantity, unit, cost_value, disposal_method'
          });
        }

        // Generate waste number
        const count = await ProductionWaste.count();
        const wasteNumber = `WST-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        // Calculate net loss
        const netLoss = disposal_method === 'clearance_sale'
          ? parseFloat(cost_value) - parseFloat(clearance_price || 0)
          : parseFloat(cost_value);

        const wasteRecord = await ProductionWaste.create({
          waste_number: wasteNumber,
          production_id: prodId,
          product_id,
          waste_type: wType,
          waste_category: wCategory,
          quantity: qty,
          unit: wUnit,
          cost_value,
          disposal_method,
          clearance_price: clearance_price || 0,
          net_loss: netLoss,
          reason: wReason,
          notes: wNotes,
          recorded_by,
          waste_date: waste_date || new Date(),
          status: disposal_method === 'clearance_sale' ? 'recovered' : 'recorded'
        });

        return res.status(201).json({
          success: true,
          message: 'Waste record created successfully',
          data: wasteRecord
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Waste API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
