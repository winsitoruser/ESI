const db = require('../../models');
const { Supplier } = db;

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const suppliers = await Supplier.findAll({
          where: { is_active: true },
          attributes: ['id', 'name', 'address', 'phone', 'email']
        });
        
        return res.status(200).json({
          success: true,
          data: suppliers
        });

      case 'POST':
        const newSupplier = await Supplier.create(req.body);
        
        return res.status(201).json({
          success: true,
          data: newSupplier,
          message: 'Supplier berhasil dibuat'
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Suppliers API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
