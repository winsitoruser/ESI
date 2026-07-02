import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const DEPARTMENTS = ['MANAGEMENT','OPERATIONS','SALES','FINANCE','ADMINISTRATION','WAREHOUSE','KITCHEN','CUSTOMER_SERVICE','IT','HR','CLINICAL','PHARMACY','MARKETING','LOGISTICS','PRODUCTION'];
const PAY_TYPES = ['monthly','daily','hourly','weekly'];
const TAX_STATUSES = ['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'];
const TAX_METHODS = ['gross','gross_up','nett'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { action } = req.query;

    if (req.method === 'GET') {
      if (action === 'template-csv') return downloadTemplateCSV(req, res);
      if (action === 'template-excel') return downloadTemplateExcel(req, res);
      if (action === 'employees') return getEmployeeList(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    if (req.method === 'POST') {
      if (action === 'save') return handleBulkSave(req, res, session);
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Payroll Bulk API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

// ===== Template Headers & Example Data =====
function getTemplateHeaders() {
  return [
    { key: 'employee_id_code', label: 'Kode Karyawan *', desc: 'Kode unik karyawan (wajib, contoh: EMP001)', example: 'EMP001' },
    { key: 'employee_name', label: 'Nama Karyawan', desc: 'Nama lengkap (otomatis dari sistem, untuk referensi)', example: 'Ahmad Wijaya' },
    { key: 'department', label: 'Departemen', desc: `Departemen: ${DEPARTMENTS.join(', ')}`, example: 'OPERATIONS' },
    { key: 'position', label: 'Jabatan', desc: 'Posisi/jabatan karyawan', example: 'Branch Manager' },
    { key: 'pay_type', label: 'Tipe Gaji *', desc: `Tipe perhitungan: ${PAY_TYPES.join(', ')}`, example: 'monthly' },
    { key: 'base_salary', label: 'Gaji Pokok *', desc: 'Gaji pokok (angka, tanpa titik/koma ribuan)', example: '5000000' },
    { key: 'hourly_rate', label: 'Tarif per Jam', desc: 'Khusus tipe hourly (opsional, default: gaji pokok/173)', example: '30000' },
    { key: 'daily_rate', label: 'Tarif per Hari', desc: 'Khusus tipe daily (opsional, default: gaji pokok/22)', example: '200000' },
    { key: 'weekly_hours', label: 'Jam Kerja/Minggu', desc: 'Jam kerja per minggu (default: 40)', example: '40' },
    { key: 'overtime_multiplier', label: 'Multiplier Lembur', desc: 'Pengali lembur hari biasa (default: 1.5)', example: '1.5' },
    { key: 'overtime_holiday_multiplier', label: 'Multiplier Lembur Libur', desc: 'Pengali lembur hari libur (default: 2.0)', example: '2.0' },
    { key: 'tax_status', label: 'Status PTKP *', desc: `Status pajak: ${TAX_STATUSES.join(', ')}`, example: 'TK/0' },
    { key: 'tax_method', label: 'Metode Pajak', desc: `Metode: ${TAX_METHODS.join(', ')} (default: gross_up)`, example: 'gross_up' },
    { key: 'bank_name', label: 'Nama Bank', desc: 'Nama bank (BCA, BRI, Mandiri, BNI, dll)', example: 'BCA' },
    { key: 'bank_account_number', label: 'No. Rekening', desc: 'Nomor rekening bank', example: '1234567890' },
    { key: 'bank_account_name', label: 'Atas Nama Rekening', desc: 'Nama pemilik rekening', example: 'Ahmad Wijaya' },
    { key: 'bpjs_kesehatan', label: 'No. BPJS Kesehatan', desc: 'Nomor BPJS Kesehatan', example: '0001234567890' },
    { key: 'bpjs_ketenagakerjaan', label: 'No. BPJS TK', desc: 'Nomor BPJS Ketenagakerjaan', example: '0009876543210' },
    { key: 'npwp', label: 'NPWP', desc: 'Nomor Pokok Wajib Pajak', example: '12.345.678.9-012.000' },
  ];
}

function getExampleRows() {
  return [
    ['EMP001', 'Ahmad Wijaya', 'OPERATIONS', 'Branch Manager', 'monthly', '8000000', '', '', '40', '1.5', '2.0', 'K/1', 'gross_up', 'BCA', '1234567890', 'Ahmad Wijaya', '0001234567890', '0009876543210', '12.345.678.9-012.000'],
    ['EMP002', 'Siti Rahayu', 'OPERATIONS', 'Branch Manager', 'monthly', '7500000', '', '', '40', '1.5', '2.0', 'TK/0', 'gross_up', 'BRI', '0987654321', 'Siti Rahayu', '0001234567891', '0009876543211', ''],
    ['EMP003', 'Budi Santoso', 'SALES', 'Kasir Senior', 'monthly', '4500000', '', '', '40', '1.5', '2.0', 'K/0', 'gross', 'Mandiri', '1122334455', 'Budi Santoso', '', '', ''],
    ['EMP004', 'Dewi Lestari', 'WAREHOUSE', 'Staff Gudang', 'daily', '3500000', '', '170000', '40', '1.5', '2.0', 'TK/0', 'gross_up', 'BNI', '5566778899', 'Dewi Lestari', '', '', ''],
    ['EMP005', 'Eko Prasetyo', 'KITCHEN', 'Chef', 'hourly', '4000000', '25000', '', '45', '1.5', '2.0', 'K/2', 'nett', 'BCA', '9988776655', 'Eko Prasetyo', '0001234567894', '0009876543214', '98.765.432.1-012.000'],
  ];
}

// ===== GET: Download CSV Template =====
async function downloadTemplateCSV(req: NextApiRequest, res: NextApiResponse) {
  const headers = getTemplateHeaders();
  const examples = getExampleRows();

  // Build CSV with BOM for Excel compatibility
  let csv = '\uFEFF';

  // Instruction rows
  csv += '"=== TEMPLATE IMPORT DATA GAJI KARYAWAN ==="\n';
  csv += '"Petunjuk Pengisian:"\n';
  csv += '"1. Kolom bertanda * (bintang) wajib diisi"\n';
  csv += '"2. Kode Karyawan harus sesuai dengan data di sistem"\n';
  csv += '"3. Tipe Gaji: monthly (bulanan), daily (harian), hourly (per jam), weekly (mingguan)"\n';
  csv += '"4. Gaji Pokok: isi angka tanpa titik/koma ribuan (contoh: 5000000)"\n';
  csv += '"5. Status PTKP: TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3"\n';
  csv += '"6. Metode Pajak: gross (potong gaji), gross_up (ditanggung perusahaan), nett (pajak perusahaan)"\n';
  csv += '"7. Baris ini (baris 1-9) akan diabaikan saat import, hapus jika tidak diperlukan"\n';
  csv += '\n';

  // Header row
  csv += headers.map(h => `"${h.label}"`).join(',') + '\n';

  // Description row
  csv += headers.map(h => `"${h.desc}"`).join(',') + '\n';

  // Example rows
  for (const row of examples) {
    csv += row.map(v => `"${v}"`).join(',') + '\n';
  }

  // Empty rows for user data
  for (let i = 0; i < 20; i++) {
    csv += headers.map(() => '""').join(',') + '\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="template_gaji_karyawan.csv"');
  return res.send(csv);
}

// ===== GET: Download Excel Template =====
async function downloadTemplateExcel(req: NextApiRequest, res: NextApiResponse) {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bedagang ERP';
    workbook.created = new Date();

    // ===== Sheet 1: Data Gaji =====
    const ws = workbook.addWorksheet('Data Gaji Karyawan', {
      properties: { tabColor: { argb: '3B82F6' } },
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    const headers = getTemplateHeaders();
    const examples = getExampleRows();

    // Title row
    ws.mergeCells(1, 1, 1, headers.length);
    const titleCell = ws.getCell('A1');
    titleCell.value = 'TEMPLATE IMPORT DATA GAJI KARYAWAN - Bedagang ERP';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 35;

    // Subtitle/instruction row
    ws.mergeCells(2, 1, 2, headers.length);
    const subCell = ws.getCell('A2');
    subCell.value = 'Kolom bertanda * (bintang) WAJIB diisi. Kode Karyawan harus sesuai data sistem. Baris contoh (biru muda) bisa dihapus.';
    subCell.font = { italic: true, size: 10, color: { argb: '1E40AF' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;

    // Header row (row 3)
    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h.label;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: '1E40AF' } } };

      // Add comment with description
      cell.note = {
        texts: [{ text: h.desc, font: { size: 9 } }],
      };
    });
    headerRow.height = 30;

    // Set column widths
    const colWidths = [16, 22, 18, 20, 12, 14, 14, 14, 14, 14, 16, 12, 14, 12, 18, 20, 20, 20, 24];
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // Example data rows (light blue background)
    examples.forEach((row, rowIdx) => {
      const excelRow = ws.getRow(4 + rowIdx);
      row.forEach((val, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1);
        // Numeric columns
        if ([5, 6, 7, 8, 9, 10].includes(colIdx)) {
          cell.value = val ? parseFloat(val) : null;
          cell.numFmt = colIdx >= 8 ? '0.0' : '#,##0';
        } else {
          cell.value = val;
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
        cell.font = { size: 10, color: { argb: '1E40AF' }, italic: true };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'BFDBFE' } }
        };
      });
    });

    // Empty rows for user data (alternating light gray)
    for (let i = 0; i < 50; i++) {
      const excelRow = ws.getRow(4 + examples.length + i);
      headers.forEach((_, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1);
        if (i % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
        }
        cell.border = { bottom: { style: 'thin', color: { argb: 'E5E7EB' } } };
        // Numeric formatting
        if ([5, 6, 7].includes(colIdx)) cell.numFmt = '#,##0';
        if ([8, 9, 10].includes(colIdx)) cell.numFmt = '0.0';
      });
    }

    // Data validation for pay_type
    const payTypeCol = 5; // 1-indexed column E
    for (let r = 4; r <= 60; r++) {
      ws.getCell(r, payTypeCol).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"monthly,daily,hourly,weekly"'],
        showErrorMessage: true, errorTitle: 'Tipe Gaji Invalid',
        error: 'Pilih: monthly, daily, hourly, atau weekly'
      };
    }

    // Data validation for tax_status
    const taxCol = 12;
    for (let r = 4; r <= 60; r++) {
      ws.getCell(r, taxCol).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"TK/0,TK/1,TK/2,TK/3,K/0,K/1,K/2,K/3"'],
        showErrorMessage: true, errorTitle: 'Status PTKP Invalid',
        error: 'Pilih status PTKP yang valid'
      };
    }

    // Data validation for tax_method
    const taxMethodCol = 13;
    for (let r = 4; r <= 60; r++) {
      ws.getCell(r, taxMethodCol).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: ['"gross,gross_up,nett"'],
        showErrorMessage: true, errorTitle: 'Metode Pajak Invalid',
        error: 'Pilih: gross, gross_up, atau nett'
      };
    }

    // ===== Sheet 2: Petunjuk =====
    const wsGuide = workbook.addWorksheet('Petunjuk Pengisian', {
      properties: { tabColor: { argb: '10B981' } }
    });

    wsGuide.getColumn(1).width = 5;
    wsGuide.getColumn(2).width = 25;
    wsGuide.getColumn(3).width = 60;
    wsGuide.getColumn(4).width = 25;

    // Title
    wsGuide.mergeCells('A1:D1');
    const guideTitle = wsGuide.getCell('A1');
    guideTitle.value = 'PETUNJUK PENGISIAN TEMPLATE GAJI KARYAWAN';
    guideTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    guideTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '059669' } };
    guideTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    wsGuide.getRow(1).height = 35;

    // Guide headers
    const guideHeaders = ['No', 'Kolom', 'Keterangan', 'Contoh'];
    const guideHeaderRow = wsGuide.getRow(3);
    guideHeaders.forEach((h, i) => {
      const cell = guideHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Guide data
    headers.forEach((h, i) => {
      const row = wsGuide.getRow(4 + i);
      row.getCell(1).value = i + 1;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).value = h.label;
      row.getCell(2).font = { bold: h.label.includes('*') };
      row.getCell(3).value = h.desc;
      row.getCell(3).alignment = { wrapText: true };
      row.getCell(4).value = h.example;
      row.getCell(4).font = { italic: true, color: { argb: '6B7280' } };
      if (i % 2 === 0) {
        [1,2,3,4].forEach(c => {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } };
        });
      }
    });

    // Additional notes
    const notesStart = 4 + headers.length + 2;
    wsGuide.mergeCells(`A${notesStart}:D${notesStart}`);
    const notesTitle = wsGuide.getCell(`A${notesStart}`);
    notesTitle.value = 'CATATAN PENTING';
    notesTitle.font = { bold: true, size: 12, color: { argb: 'DC2626' } };

    const notes = [
      'Kolom bertanda * (bintang) WAJIB diisi, kolom lain opsional',
      'Kode Karyawan harus sudah terdaftar di sistem (contoh: EMP001)',
      'Gaji Pokok diisi angka bulat tanpa titik/koma ribuan (contoh: 5000000 bukan 5.000.000)',
      'Untuk karyawan harian, isi Tarif per Hari. Untuk per jam, isi Tarif per Jam',
      'Status PTKP: TK = Tidak Kawin, K = Kawin. Angka = jumlah tanggungan',
      'Metode Pajak: gross = dipotong dari gaji, gross_up = ditanggung perusahaan, nett = pajak ditanggung perusahaan',
      'Baris contoh (berwarna biru muda) pada sheet Data Gaji bisa dihapus sebelum upload',
      'Simpan file dalam format .xlsx sebelum upload',
      'Maksimal 500 baris data per upload',
    ];
    notes.forEach((note, i) => {
      const row = wsGuide.getRow(notesStart + 1 + i);
      row.getCell(1).value = i + 1;
      row.getCell(1).alignment = { horizontal: 'center' };
      wsGuide.mergeCells(`B${notesStart + 1 + i}:D${notesStart + 1 + i}`);
      row.getCell(2).value = note;
      row.getCell(2).font = { size: 10 };
    });

    // ===== Sheet 3: Referensi =====
    const wsRef = workbook.addWorksheet('Referensi', {
      properties: { tabColor: { argb: 'F59E0B' } }
    });

    wsRef.getColumn(1).width = 25;
    wsRef.getColumn(2).width = 50;

    wsRef.mergeCells('A1:B1');
    const refTitle = wsRef.getCell('A1');
    refTitle.value = 'DATA REFERENSI';
    refTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };
    refTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D97706' } };
    refTitle.alignment = { horizontal: 'center' };
    wsRef.getRow(1).height = 30;

    // Pay types reference
    let r = 3;
    wsRef.getCell(`A${r}`).value = 'TIPE GAJI';
    wsRef.getCell(`A${r}`).font = { bold: true, size: 11 };
    wsRef.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    wsRef.getCell(`B${r}`).value = 'Keterangan';
    wsRef.getCell(`B${r}`).font = { bold: true };
    wsRef.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    r++;
    const payTypeDescs = [
      ['monthly', 'Gaji bulanan tetap (default). Gaji = Gaji Pokok per bulan'],
      ['daily', 'Gaji harian. Gaji = Tarif per Hari × Hari kerja aktual'],
      ['hourly', 'Gaji per jam. Gaji = Tarif per Jam × Jam kerja/minggu × 4.33'],
      ['weekly', 'Gaji mingguan. Gaji = Gaji Pokok per minggu × 4.33'],
    ];
    payTypeDescs.forEach(([type, desc]) => {
      wsRef.getCell(`A${r}`).value = type;
      wsRef.getCell(`A${r}`).font = { bold: true, color: { argb: '2563EB' } };
      wsRef.getCell(`B${r}`).value = desc;
      r++;
    });

    r += 2;
    wsRef.getCell(`A${r}`).value = 'STATUS PTKP';
    wsRef.getCell(`A${r}`).font = { bold: true, size: 11 };
    wsRef.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    wsRef.getCell(`B${r}`).value = 'PTKP (Penghasilan Tidak Kena Pajak)';
    wsRef.getCell(`B${r}`).font = { bold: true };
    wsRef.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    r++;
    const ptkpData = [
      ['TK/0', 'Tidak Kawin, 0 tanggungan - Rp 54.000.000/tahun'],
      ['TK/1', 'Tidak Kawin, 1 tanggungan - Rp 58.500.000/tahun'],
      ['TK/2', 'Tidak Kawin, 2 tanggungan - Rp 63.000.000/tahun'],
      ['TK/3', 'Tidak Kawin, 3 tanggungan - Rp 67.500.000/tahun'],
      ['K/0', 'Kawin, 0 tanggungan - Rp 58.500.000/tahun'],
      ['K/1', 'Kawin, 1 tanggungan - Rp 63.000.000/tahun'],
      ['K/2', 'Kawin, 2 tanggungan - Rp 67.500.000/tahun'],
      ['K/3', 'Kawin, 3 tanggungan - Rp 72.000.000/tahun'],
    ];
    ptkpData.forEach(([status, desc]) => {
      wsRef.getCell(`A${r}`).value = status;
      wsRef.getCell(`A${r}`).font = { bold: true };
      wsRef.getCell(`B${r}`).value = desc;
      r++;
    });

    r += 2;
    wsRef.getCell(`A${r}`).value = 'DEPARTEMEN';
    wsRef.getCell(`A${r}`).font = { bold: true, size: 11 };
    wsRef.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    wsRef.getCell(`B${r}`).value = 'Kode Departemen Valid';
    wsRef.getCell(`B${r}`).font = { bold: true };
    wsRef.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    r++;
    DEPARTMENTS.forEach(d => {
      wsRef.getCell(`A${r}`).value = d;
      r++;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_gaji_karyawan.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (e: any) {
    console.error('Excel template error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ===== GET: Employee List =====
async function getEmployeeList(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, data: [] });
  try {
    const [rows] = await sequelize.query(`
      SELECT id, employee_id as emp_code, name, department, position, status
      FROM employees WHERE status = 'ACTIVE' ORDER BY name LIMIT 500
    `);
    return res.json({ success: true, data: rows || [] });
  } catch (e: any) {
    return res.json({ success: true, data: [] });
  }
}

// ===== POST: Save bulk data (receives JSON from client-side parsed file) =====
async function handleBulkSave(req: NextApiRequest, res: NextApiResponse, session: any) {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada data untuk disimpan' });
    }

    // Get existing employees for mapping emp_code -> UUID
    let employeeMap: Record<string, any> = {};
    if (sequelize) {
      try {
        const [emps] = await sequelize.query(`SELECT id, employee_id as emp_code, name FROM employees WHERE status = 'ACTIVE'`);
        (emps || []).forEach((e: any) => { employeeMap[e.emp_code] = e; });
      } catch (e) {}
    }

    const tenantId = (session.user as any).tenantId;
    let savedCount = 0;
    const results: any[] = [];

    for (const row of rows) {
      const empCode = String(row.employee_id_code || '').trim();
      const employee = employeeMap[empCode];
      const errors: string[] = [];

      if (!employee) {
        errors.push(`Kode Karyawan "${empCode}" tidak ditemukan di sistem`);
        results.push({ ...row, status: 'error', errors });
        continue;
      }

      if (!sequelize) {
        results.push({ ...row, status: 'saved', errors: [] });
        savedCount++;
        continue;
      }

      try {
        // Deactivate old salary config
        await sequelize.query(`
          UPDATE employee_salaries SET is_active = false, end_date = CURRENT_DATE, updated_at = NOW()
          WHERE employee_id = :empId AND is_active = true
        `, { replacements: { empId: employee.id } });

        // Insert new salary config
        await sequelize.query(`
          INSERT INTO employee_salaries (id, tenant_id, employee_id, pay_type, base_salary,
            hourly_rate, daily_rate, weekly_hours, overtime_rate_multiplier, overtime_holiday_multiplier,
            tax_status, tax_method, bank_name, bank_account_number, bank_account_name,
            bpjs_kesehatan_number, bpjs_ketenagakerjaan_number, npwp, is_active, created_at, updated_at)
          VALUES (uuid_generate_v4(), :tenantId, :empId, :payType, :baseSalary,
            :hourlyRate, :dailyRate, :weeklyHours, :otMult, :otHoliday,
            :taxStatus, :taxMethod, :bankName, :bankAccNum, :bankAccName,
            :bpjsKes, :bpjsTk, :npwp, true, NOW(), NOW())
        `, {
          replacements: {
            tenantId, empId: employee.id,
            payType: row.pay_type || 'monthly',
            baseSalary: parseFloat(row.base_salary) || 0,
            hourlyRate: parseFloat(row.hourly_rate) || 0,
            dailyRate: parseFloat(row.daily_rate) || 0,
            weeklyHours: parseFloat(row.weekly_hours) || 40,
            otMult: parseFloat(row.overtime_multiplier) || 1.5,
            otHoliday: parseFloat(row.overtime_holiday_multiplier) || 2.0,
            taxStatus: row.tax_status || 'TK/0',
            taxMethod: row.tax_method || 'gross_up',
            bankName: row.bank_name || null,
            bankAccNum: row.bank_account_number || null,
            bankAccName: row.bank_account_name || null,
            bpjsKes: row.bpjs_kesehatan || null,
            bpjsTk: row.bpjs_ketenagakerjaan || null,
            npwp: row.npwp || null
          }
        });
        results.push({ ...row, status: 'saved', errors: [] });
        savedCount++;
      } catch (e: any) {
        results.push({ ...row, status: 'error', errors: [`DB Error: ${e.message}`] });
      }
    }

    return res.json({
      success: savedCount > 0,
      message: `${savedCount} dari ${rows.length} data gaji berhasil disimpan`,
      totalRows: rows.length,
      validCount: rows.length,
      savedCount,
      errorCount: rows.length - savedCount,
      data: results
    });
  } catch (e: any) {
    console.error('Bulk save error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
