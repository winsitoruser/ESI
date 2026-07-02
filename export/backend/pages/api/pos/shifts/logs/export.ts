import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const Shift = require('../../../../../models/Shift');
const ShiftHandover = require('../../../../../models/ShiftHandover');
const Employee = require('../../../../../models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const { Op } = require('sequelize');
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.shiftDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.shiftDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.shiftDate = {
        [Op.lte]: endDate
      };
    }

    const shifts = await Shift.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'opener',
          attributes: ['id', 'name', 'position']
        },
        {
          model: Employee,
          as: 'closer',
          attributes: ['id', 'name', 'position'],
          required: false
        },
        {
          model: ShiftHandover,
          as: 'handovers',
          required: false,
          include: [
            {
              model: Employee,
              as: 'handoverFromEmployee',
              attributes: ['id', 'name', 'position']
            },
            {
              model: Employee,
              as: 'handoverToEmployee',
              attributes: ['id', 'name', 'position']
            }
          ]
        }
      ],
      order: [['shiftDate', 'DESC'], ['openedAt', 'DESC']]
    });

    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(shifts);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=shift_log_${new Date().toISOString().split('T')[0]}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({ shifts });
  } catch (error: any) {
    console.error('Export Shift Log Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

function generateCSV(shifts: any[]): string {
  const headers = [
    'Tanggal',
    'Shift',
    'Status',
    'Dibuka Oleh',
    'Jabatan',
    'Waktu Buka',
    'Ditutup Oleh',
    'Waktu Tutup',
    'Kas Awal',
    'Kas Akhir',
    'Total Penjualan',
    'Total Transaksi',
    'Selisih Kas',
    'Diserahkan Kepada',
    'Catatan'
  ];

  const rows = shifts.map(shift => {
    const handover = shift.handovers && shift.handovers.length > 0 ? shift.handovers[0] : null;
    
    return [
      shift.shiftDate,
      shift.shiftName,
      shift.status === 'open' ? 'Terbuka' : 'Ditutup',
      shift.opener?.name || '-',
      shift.opener?.position || '-',
      new Date(shift.openedAt).toLocaleString('id-ID'),
      shift.closer?.name || '-',
      shift.closedAt ? new Date(shift.closedAt).toLocaleString('id-ID') : '-',
      shift.initialCashAmount || 0,
      shift.finalCashAmount || 0,
      shift.totalSales || 0,
      shift.totalTransactions || 0,
      shift.cashDifference || 0,
      handover?.handoverToEmployee?.name || '-',
      shift.notes || '-'
    ].map(field => `"${field}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
