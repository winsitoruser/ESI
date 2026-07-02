const { IncidentReport, Product, StockOpname, StockOpnameItem } = require('../../../models');

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        const incidents = await IncidentReport.findAll({
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            },
            {
              model: StockOpname,
              as: 'stockOpname',
              attributes: ['id', 'opname_number']
            }
          ],
          order: [['created_at', 'DESC']],
          limit: 50
        });
        
        return res.status(200).json({ success: true, data: incidents });

      case 'POST':
        const {
          incident_number,
          stock_opname_id,
          stock_opname_item_id,
          product_id,
          variance_quantity,
          variance_value,
          variance_category,
          why_1,
          why_2,
          why_3,
          why_4,
          why_5,
          root_cause,
          evidence_notes,
          witness_statement,
          immediate_action,
          corrective_action,
          preventive_action,
          responsible_person,
          target_date,
          approval_level,
          approver_comments
        } = req.body;

        const incident = await IncidentReport.create({
          incident_number,
          stock_opname_id,
          stock_opname_item_id,
          product_id,
          variance_quantity,
          variance_value,
          variance_category,
          why_1,
          why_2,
          why_3,
          why_4,
          why_5,
          root_cause,
          evidence_notes,
          witness_statement,
          immediate_action,
          corrective_action,
          preventive_action,
          responsible_person,
          target_date,
          approval_level,
          approval_status: 'pending',
          approver_comments
        });

        // Update stock opname item status
        if (stock_opname_item_id) {
          await StockOpnameItem.update(
            { 
              status: 'investigated',
              root_cause,
              corrective_action
            },
            { where: { id: stock_opname_item_id } }
          );
        }

        const createdIncident = await IncidentReport.findByPk(incident.id, {
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        });

        return res.status(201).json({ success: true, data: createdIncident });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Incident Report API Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
