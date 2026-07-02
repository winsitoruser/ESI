import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import ExcelJS from 'exceljs';

const Shift = require('@/models/Shift');
const Employee = require('@/models/Employee');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { format = 'excel', status, dateFrom, dateTo } = req.query;

    // Build where clause
    const whereClause: any = {};

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (dateFrom) {
      whereClause.shiftDate = { ...whereClause.shiftDate, $gte: dateFrom };
    }

    if (dateTo) {
      whereClause.shiftDate = { ...whereClause.shiftDate, $lte: dateTo };
    }

    // Fetch shifts
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
        }
      ],
      order: [['shiftDate', 'DESC'], ['openedAt', 'DESC']]
    });

    if (format === 'excel') {
      return await exportToExcel(shifts, res);
    } else {
      return res.status(400).json({ error: 'Unsupported format' });
    }

  } catch (error: any) {
    console.error('Export error:', error);
    return res.status(500).json({ 
      error: 'Failed to export data',
      details: error.message 
    });
  }
}

async function exportToExcel(shifts: any[], res: NextApiResponse) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Shifts');

  // Set column headers
  worksheet.columns = [
    { header: 'ID Shift', key: 'id', width: 15 },
    { header: 'Nama Shift', key: 'shiftName', width: 12 },
    { header: 'Tanggal', key: 'shiftDate', width: 12 },
    { header: 'Jam Mulai', key: 'startTime', width: 10 },
    { header: 'Jam Selesai', key: 'endTime', width: 10 },
    { header: 'Kasir Buka', key: 'opener', width: 20 },
    { header: 'Kasir Tutup', key: 'closer', width: 20 },
    { header: 'Modal Awal', key: 'initialCash', width: 15 },
    { header: 'Modal Akhir', key: 'finalCash', width: 15 },
    { header: 'Total Penjualan', key: 'totalSales', width: 15 },
    { header: 'Selisih Kas', key: 'cashDifference', width: 15 },
    { header: 'Total Transaksi', key: 'totalTransactions', width: 15 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Catatan', key: 'notes', width: 30 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE74C3C' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  shifts.forEach((shift) => {
    worksheet.addRow({
      id: shift.id?.substring(0, 8) || 'N/A',
      shiftName: shift.shiftName || 'N/A',
      shiftDate: shift.shiftDate || 'N/A',
      startTime: shift.startTime || 'N/A',
      endTime: shift.endTime || 'N/A',
      opener: shift.opener?.name || 'N/A',
      closer: shift.closer?.name || '-',
      initialCash: shift.initialCashAmount || 0,
      finalCash: shift.finalCashAmount || 0,
      totalSales: shift.totalSales || 0,
      cashDifference: shift.cashDifference || 0,
      totalTransactions: shift.totalTransactions || 0,
      status: shift.status === 'open' ? 'Aktif' : 'Selesai',
      notes: shift.notes || '-'
    });
  });

  // Format currency columns
  ['initialCash', 'finalCash', 'totalSales', 'cashDifference'].forEach(col => {
    const column = worksheet.getColumn(col);
    column.numFmt = 'Rp #,##0';
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Add summary row
  const summaryRowNum = worksheet.rowCount + 2;
  worksheet.getCell(`A${summaryRowNum}`).value = 'TOTAL';
  worksheet.getCell(`A${summaryRowNum}`).font = { bold: true };
  
  const totalInitialCash = shifts.reduce((sum, s) => sum + (s.initialCashAmount || 0), 0);
  const totalFinalCash = shifts.reduce((sum, s) => sum + (s.finalCashAmount || 0), 0);
  const totalSales = shifts.reduce((sum, s) => sum + (s.totalSales || 0), 0);
  const totalTransactions = shifts.reduce((sum, s) => sum + (s.totalTransactions || 0), 0);

  worksheet.getCell(`H${summaryRowNum}`).value = totalInitialCash;
  worksheet.getCell(`I${summaryRowNum}`).value = totalFinalCash;
  worksheet.getCell(`J${summaryRowNum}`).value = totalSales;
  worksheet.getCell(`L${summaryRowNum}`).value = totalTransactions;

  worksheet.getRow(summaryRowNum).font = { bold: true };
  worksheet.getRow(summaryRowNum).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8E8E8' }
  };

  // Set response headers
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=shifts-${new Date().toISOString().split('T')[0]}.xlsx`
  );

  // Write to response
  await workbook.xlsx.write(res);
  res.end();
}
