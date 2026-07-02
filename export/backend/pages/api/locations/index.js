const { Location, Warehouse } = require('../../../models');

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        const { warehouse_id } = query;
        const where = { status: 'available' };
        
        if (warehouse_id) {
          where.warehouse_id = warehouse_id;
        }

        const locations = await Location.findAll({
          where,
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['id', 'code', 'name']
            }
          ],
          order: [['code', 'ASC']]
        });
        
        return res.status(200).json({ success: true, data: locations });

      case 'POST':
        const location = await Location.create(req.body);
        return res.status(201).json({ success: true, data: location });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Location API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
