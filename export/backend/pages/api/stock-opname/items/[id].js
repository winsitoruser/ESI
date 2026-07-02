const { StockOpnameItem, Product, Location } = require('../../../../models');

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  try {
    switch (method) {
      case 'PUT':
        const {
          physical_stock,
          counted_by,
          recount_value,
          recount_by,
          root_cause,
          corrective_action,
          notes,
          status
        } = req.body;

        const item = await StockOpnameItem.findByPk(id);
        
        if (!item) {
          return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Calculate variance if physical_stock is provided
        let updateData = { ...req.body };
        
        if (physical_stock !== undefined) {
          const difference = physical_stock - item.system_stock;
          const variancePercentage = item.system_stock > 0 
            ? (difference / item.system_stock) * 100 
            : 0;
          const varianceValue = difference * item.unit_cost;

          // Determine variance category
          let varianceCategory = 'none';
          const absVariancePercentage = Math.abs(variancePercentage);
          const absVarianceValue = Math.abs(varianceValue);

          if (absVariancePercentage > 5 || absVarianceValue > 500000) {
            varianceCategory = 'major';
          } else if (absVariancePercentage > 2 || absVarianceValue > 100000) {
            varianceCategory = 'moderate';
          } else if (difference !== 0) {
            varianceCategory = 'minor';
          }

          updateData = {
            ...updateData,
            difference,
            variance_percentage: variancePercentage,
            variance_value: varianceValue,
            variance_category: varianceCategory,
            count_date: new Date()
          };
        }

        await item.update(updateData);

        const updatedItem = await StockOpnameItem.findByPk(id, {
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
        });

        return res.status(200).json({ success: true, data: updatedItem });

      default:
        res.setHeader('Allow', ['PUT']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Stock Opname Item API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
