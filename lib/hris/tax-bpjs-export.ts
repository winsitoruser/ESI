/**
 * DJP e-Bupot & BPJS EDABU export formats
 */

export interface PPh21ExportRow {
  npwp: string;
  nik: string;
  employeeName: string;
  position: string;
  taxStatus: string; // TK/0, K/1, etc.
  grossIncome: number;
  ptkp: number;
  taxableIncome: number;
  pph21: number;
  period: string; // YYYY-MM
}

export interface BPJSExportRow {
  nik: string;
  employeeName: string;
  bpjsKesNumber?: string;
  bpjsTkNumber?: string;
  baseSalary: number;
  bpjsKesEmployee: number;
  bpjsKesEmployer: number;
  jhtEmployee: number;
  jhtEmployer: number;
  jpEmployee: number;
  jpEmployer: number;
  jkkEmployer: number;
  jkmEmployer: number;
  period: string;
}

export function generatePPh21Csv(rows: PPh21ExportRow[]): string {
  const header = 'NPWP,NIK,Nama,Jabatan,Status PTKP,Penghasilan Bruto,PTKP,Penghasilan Kena Pajak,PPh21,Masa Pajak';
  const body = rows.map(r =>
    [r.npwp, r.nik, `"${r.employeeName}"`, r.position, r.taxStatus,
      r.grossIncome, r.ptkp, r.taxableIncome, r.pph21, r.period].join(',')
  );
  return [header, ...body].join('\n');
}

/** DJP e-Bupot XML simplified structure */
export function generateEBupotXml(rows: PPh21ExportRow[], companyNpwp: string, period: string): string {
  const bukpotItems = rows.map((r, i) => `
    <BuktiPotong>
      <NomorUrut>${i + 1}</NomorUrut>
      <NPWPPemotong>${companyNpwp}</NPWPPemotong>
      <NPWP>${r.npwp || '000000000000000'}</NPWP>
      <NIK>${r.nik}</NIK>
      <Nama>${escapeXml(r.employeeName)}</Nama>
      <MasaPajak>${period.replace('-', '')}</MasaPajak>
      <PenghasilanBruto>${r.grossIncome}</PenghasilanBruto>
      <PPh21>${r.pph21}</PPh21>
    </BuktiPotong>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<eBupot xmlns="http://pajak.go.id/eBupot">
  <Header>
    <NPWPPemotong>${companyNpwp}</NPWPPemotong>
    <MasaPajak>${period}</MasaPajak>
    <JumlahBuktiPotong>${rows.length}</JumlahBuktiPotong>
  </Header>
  <DaftarBuktiPotong>${bukpotItems}
  </DaftarBuktiPotong>
</eBupot>`;
}

export function generateBPJSCsv(rows: BPJSExportRow[]): string {
  const header = 'NIK,Nama,Gaji Pokok,Iuran Kes Karyawan,Iuran Kes Perusahaan,JHT Karyawan,JHT Perusahaan,JP Karyawan,JP Perusahaan,JKK Perusahaan,JKM Perusahaan,Periode';
  const body = rows.map(r =>
    [r.nik, `"${r.employeeName}"`, r.baseSalary, r.bpjsKesEmployee, r.bpjsKesEmployer,
      r.jhtEmployee, r.jhtEmployer, r.jpEmployee, r.jpEmployer, r.jkkEmployer, r.jkmEmployer, r.period].join(',')
  );
  return [header, ...body].join('\n');
}

/** BPJS EDABU/DLP tab-separated format */
export function generateBPJSEdabu(rows: BPJSExportRow[], companyCode: string): string {
  const header = `EDABU\t${companyCode}\t${new Date().toISOString().slice(0, 10)}`;
  const body = rows.map(r =>
    [r.nik, r.employeeName, r.baseSalary, r.bpjsKesEmployee + r.bpjsKesEmployer,
      r.jhtEmployee + r.jhtEmployer, r.jpEmployee + r.jpEmployer, r.period].join('\t')
  );
  return [header, ...body].join('\n');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function getMockPPh21Rows(): PPh21ExportRow[] {
  return [
    { npwp: '12.345.678.9-012.000', nik: '3201010101010001', employeeName: 'Ahmad Wijaya', position: 'GM', taxStatus: 'K/1', grossIncome: 18000000, ptkp: 63000000, taxableIncome: 153000000, pph21: 850000, period: '2026-06' },
    { npwp: '', nik: '3201010202020002', employeeName: 'Siti Rahayu', position: 'Manager', taxStatus: 'TK/0', grossIncome: 9000000, ptkp: 54000000, taxableIncome: 54000000, pph21: 250000, period: '2026-06' },
  ];
}

export function getMockBPJSRows(): BPJSExportRow[] {
  return [
    { nik: '3201010101010001', employeeName: 'Ahmad Wijaya', baseSalary: 15000000, bpjsKesEmployee: 150000, bpjsKesEmployer: 600000, jhtEmployee: 300000, jhtEmployer: 555000, jpEmployee: 150000, jpEmployer: 300000, jkkEmployer: 180000, jkmEmployer: 45000, period: '2026-06' },
    { nik: '3201010202020002', employeeName: 'Siti Rahayu', baseSalary: 8000000, bpjsKesEmployee: 80000, bpjsKesEmployer: 320000, jhtEmployee: 160000, jhtEmployer: 296000, jpEmployee: 80000, jpEmployer: 160000, jkkEmployer: 96000, jkmEmployer: 24000, period: '2026-06' },
  ];
}
