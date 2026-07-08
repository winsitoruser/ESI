/**
 * Bank disbursement file generation — BCA, Mandiri, generic CSV
 */

export type BankFormat = 'bca' | 'mandiri' | 'generic';

export interface DisbursementRow {
  employeeId: string;
  employeeName: string;
  bankCode?: string;
  bankName?: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description?: string;
  email?: string;
}

export function generateBCAFile(rows: DisbursementRow[], companyAccount: string, transferDate: string): string {
  const header = [
    '0', companyAccount, transferDate.replace(/-/g, ''),
    String(rows.length), String(rows.reduce((s, r) => s + r.amount, 0)),
  ].join('|');
  const lines = rows.map((r, i) => [
    '1', String(i + 1), r.accountNumber, r.accountName.substring(0, 35),
    String(r.amount), 'IDR', (r.description || 'Payroll').substring(0, 30),
    r.email || '', 'N', 'N',
  ].join('|'));
  return [header, ...lines].join('\n');
}

export function generateMandiriFile(rows: DisbursementRow[], companyCode: string, batchId: string): string {
  const lines = [
    `H|${companyCode}|${batchId}|${new Date().toISOString().slice(0, 10)}|${rows.length}`,
    ...rows.map((r, i) =>
      `D|${String(i + 1).padStart(5, '0')}|${r.accountNumber}|${r.accountName}|${r.amount}|${r.bankCode || '008'}|Payroll`
    ),
    `F|${rows.length}|${rows.reduce((s, r) => s + r.amount, 0)}`,
  ];
  return lines.join('\n');
}

export function generateGenericCSV(rows: DisbursementRow[]): string {
  const header = 'No,Employee ID,Nama,No Rekening,Nama Rekening,Bank,Jumlah,Deskripsi';
  const body = rows.map((r, i) =>
    [i + 1, r.employeeId, `"${r.employeeName}"`, r.accountNumber, `"${r.accountName}"`,
      r.bankName || '', r.amount, `"${r.description || 'Payroll'}"`].join(',')
  );
  return [header, ...body].join('\n');
}

export function generateDisbursementFile(
  format: BankFormat, rows: DisbursementRow[], opts?: { companyAccount?: string; companyCode?: string; transferDate?: string }
): { content: string; mimeType: string; filename: string } {
  const date = opts?.transferDate || new Date().toISOString().slice(0, 10);
  switch (format) {
    case 'bca':
      return {
        content: generateBCAFile(rows, opts?.companyAccount || '1234567890', date),
        mimeType: 'text/plain',
        filename: `disbursement-bca-${date}.txt`,
      };
    case 'mandiri':
      return {
        content: generateMandiriFile(rows, opts?.companyCode || 'COMP001', `BATCH-${date.replace(/-/g, '')}`),
        mimeType: 'text/plain',
        filename: `disbursement-mandiri-${date}.txt`,
      };
    default:
      return {
        content: generateGenericCSV(rows),
        mimeType: 'text/csv',
        filename: `disbursement-${date}.csv`,
      };
  }
}

export function getMockDisbursementRows(): DisbursementRow[] {
  return [
    { employeeId: 'EMP-001', employeeName: 'Ahmad Wijaya', accountNumber: '1234567890', accountName: 'Ahmad Wijaya', bankName: 'BCA', bankCode: '014', amount: 15000000 },
    { employeeId: 'EMP-002', employeeName: 'Siti Rahayu', accountNumber: '9876543210', accountName: 'Siti Rahayu', bankName: 'Mandiri', bankCode: '008', amount: 8500000 },
    { employeeId: 'EMP-003', employeeName: 'Budi Santoso', accountNumber: '5555666677', accountName: 'Budi Santoso', bankName: 'BNI', bankCode: '009', amount: 7200000 },
  ];
}
