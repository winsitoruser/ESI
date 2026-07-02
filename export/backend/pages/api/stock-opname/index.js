const { StockOpname, StockOpnameItem, Product, Location, Warehouse } = require('../../../models');

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const stockOpnames = await StockOpname.findAll({
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
            }
          ],
          order: [['created_at', 'DESC']],
          limit: 50
        });
        
        return res.status(200).json({ success: true, data: stockOpnames });

      case 'POST':
        const {
          opname_number,
          opname_type,
          warehouse_id,
          location_id,
          locations,
          scheduled_date,
          performed_by,
          supervised_by,
          notes,
          items
        } = req.body;

        // Create stock opname
        const stockOpname = await StockOpname.create({
          opname_number,
          opname_type: opname_type || 'full',
          warehouse_id,
          location_id: location_id || null,
          scheduled_date,
          performed_by,
          supervised_by,
          notes,
          status: 'draft',
          total_items: 0
        });

        // If locations array provided, load products from those locations
        let opnameItems = [];
        if (locations && locations.length > 0) {
          // Get products from Stock table for each location
          const { Stock } = require('../../../models');
          
          for (const loc of locations) {
            // Get products in this location
            const stocks = await Stock.findAll({
              where: {
                warehouseLocation: loc.location_code
              },
              include: [
                {
                  model: Product,
                  as: 'product',
                  required: true
                }
              ]
            });

            // Create opname items for each product
            for (const stock of stocks) {
              opnameItems.push({
                stock_opname_id: stockOpname.id,
                product_id: stock.productId,
                location_id: loc.location_id,
                system_stock: parseFloat(stock.quantity) || 0,
                unit_cost: parseFloat(stock.averageCost) || 0,
                status: 'pending'
              });
            }
          }
        } else if (items && items.length > 0) {
          // Use provided items
          opnameItems = items.map(item => ({
            stock_opname_id: stockOpname.id,
            product_id: item.product_id,
            location_id: item.location_id,
            system_stock: item.system_stock || 0,
            unit_cost: item.unit_cost || 0,
            status: 'pending'
          }));
        }

        if (opnameItems.length > 0) {
          await StockOpnameItem.bulkCreate(opnameItems);
          
          // Update total items
          await stockOpname.update({
            total_items: opnameItems.length
          });
        }

        // Fetch created opname with relations
        const createdOpname = await StockOpname.findByPk(stockOpname.id, {
          include: [
            {
              model: Warehouse,
              as: 'warehouse'
            },
            {
              model: Location,
              as: 'location'
            },
            {
              model: StockOpnameItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product'
                },
                {
                  model: Location,
                  as: 'location'
                }
              ]
            }
          ]
        });

        return res.status(201).json({ success: true, data: createdOpname });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Stock Opname API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
