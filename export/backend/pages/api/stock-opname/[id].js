const { StockOpname, StockOpnameItem, Product, Location, Warehouse } = require('../../../models');

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  try {
    switch (method) {
      case 'GET':
        const stockOpname = await StockOpname.findByPk(id, {
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['id', 'code', 'name']
            },
            {
              model: Location,
              as: 'location',
              attributes: ['id', 'code', 'name']
            },
            {
              model: StockOpnameItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  attributes: ['id', 'name', 'sku', 'unit']
                },
                {
                  model: Location,
                  as: 'location',
                  attributes: ['id', 'code', 'name']
                }
              ]
            }
          ]
        });

        if (!stockOpname) {
          return res.status(404).json({ success: false, message: 'Stock opname not found' });
        }

        return res.status(200).json({ success: true, data: stockOpname });

      case 'PUT':
        const updateData = req.body;
        
        await StockOpname.update(updateData, {
          where: { id }
        });

        const updatedOpname = await StockOpname.findByPk(id, {
          include: [
            {
              model: Warehouse,
              as: 'warehouse'
            },
            {
              model: Location,
              as: 'location'
            }
          ]
        });

        return res.status(200).json({ success: true, data: updatedOpname });

      case 'DELETE':
        const opname = await StockOpname.findByPk(id);
        
        if (!opname) {
          return res.status(404).json({ success: false, message: 'Stock opname not found' });
        }

        if (opname.status !== 'draft') {
          return res.status(400).json({ 
            success: false, 
            message: 'Only draft stock opname can be deleted' 
          });
        }

        await opname.destroy();
        
        return res.status(200).json({ success: true, message: 'Stock opname deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Stock Opname API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
