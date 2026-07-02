const { Warehouse, Location } = require('../../../models');

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const warehouses = await Warehouse.findAll({
          where: { status: 'active' },
          order: [['name', 'ASC']]
        });
        return res.status(200).json({ success: true, data: warehouses });

      case 'POST':
        const warehouse = await Warehouse.create(req.body);
        return res.status(201).json({ success: true, data: warehouse });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Warehouse API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
