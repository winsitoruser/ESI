import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { format = 'csv', filters = {} } = req.body;

    // Build query
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.dateFrom && filters.dateTo) {
      where.created_at = {
        [db.Sequelize.Op.between]: [filters.dateFrom, filters.dateTo]
      };
    }

    // Fetch requisitions
    const requisitions = await db.InternalRequisition.findAll({
      where,
      include: [
        { 
          model: db.Branch, 
          as: 'requestingBranch',
          attributes: ['id', 'code', 'name', 'city']
        },
        { 
          model: db.Branch, 
          as: 'fulfillingBranch',
          attributes: ['id', 'code', 'name', 'city']
        },
        { 
          model: db.InternalRequisitionItem, 
          as: 'items',
          attributes: ['id', 'product_id', 'requested_quantity', 'approved_quantity']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'No. IR',
        'Cabang Peminta',
        'Kota',
        'Dipenuhi Oleh',
        'Tipe Permintaan',
        'Prioritas',
        'Status',
        'Total Item',
        'Total Qty',
        'Est. Nilai (Rp)',
        'Tanggal Dibuat',
        'Tanggal Pengiriman'
      ];

      const rows = requisitions.map((req: any) => [
        req.ir_number,
        req.requestingBranch?.name || '-',
        req.requestingBranch?.city || '-',
        req.fulfillingBranch?.name || 'Belum ditentukan',
        req.request_type,
        req.priority,
        req.status,
        req.total_items,
        req.total_quantity,
        req.estimated_value,
        new Date(req.created_at).toLocaleDateString('id-ID'),
        req.requested_delivery_date ? new Date(req.requested_delivery_date).toLocaleDateString('id-ID') : '-'
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((cell: any) => {
          // Escape cells containing commas or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      // Add BOM for Excel UTF-8 support
      const bom = '\uFEFF';
      const csvWithBom = bom + csv;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=requisitions-${Date.now()}.csv`);
      return res.send(csvWithBom);

    } else if (format === 'json') {
      // JSON export
      const jsonData = requisitions.map((req: any) => ({
        irNumber: req.ir_number,
        requestingBranch: req.requestingBranch?.name || '-',
        city: req.requestingBranch?.city || '-',
        fulfillingBranch: req.fulfillingBranch?.name || 'Belum ditentukan',
        requestType: req.request_type,
        priority: req.priority,
        status: req.status,
        totalItems: req.total_items,
        totalQuantity: req.total_quantity,
        estimatedValue: req.estimated_value,
        createdAt: req.created_at,
        requestedDeliveryDate: req.requested_delivery_date
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=requisitions-${Date.now()}.json`);
      return res.json(jsonData);

    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

  } catch (error: any) {
    console.error('Export API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
