import { Printer, Download } from 'lucide-react';

/** Print / download ESS payslip (ESS-S2-1). Uses browser print stylesheet; gate = row already from released payroll API. */
export function printPayslipHtml(ps: {
  period_start?: string;
  period_end?: string;
  run_code?: string;
  pay_date?: string;
  net_salary?: number;
  total_earnings?: number;
  total_deductions?: number;
  tax_amount?: number;
  earnings?: Array<{ name?: string; label?: string; amount?: number }>;
  deductions?: Array<{ name?: string; label?: string; amount?: number }>;
}) {
  const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const fmtMonth = (d?: string) =>
    d ? new Date(d).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-';

  const earnings = Array.isArray(ps.earnings) ? ps.earnings : [];
  const deductions = Array.isArray(ps.deductions) ? ps.deductions : [];

  const earnRows = earnings
    .map((e) => `<tr><td>${e.name || e.label || '-'}</td><td style="text-align:right">${fmtCur(e.amount || 0)}</td></tr>`)
    .join('');
  const dedRows = deductions
    .map((d) => `<tr><td>${d.name || d.label || '-'}</td><td style="text-align:right">-${fmtCur(d.amount || 0)}</td></tr>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><title>Slip Gaji ${fmtMonth(ps.period_start)}</title>
<meta charset="utf-8"/>
<style>
  body{font-family:system-ui,sans-serif;color:#0f172a;padding:24px;max-width:640px;margin:0 auto}
  h1{font-size:18px;margin:0 0 4px} .muted{color:#64748b;font-size:12px}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}
  th,td{padding:6px 0;border-bottom:1px solid #e2e8f0}
  .net{background:#6d28d9;color:#fff;padding:12px 16px;border-radius:12px;display:flex;justify-content:space-between;margin-top:16px}
  @media print{body{padding:0}}
</style></head><body>
  <h1>Slip Gaji — Humanify</h1>
  <p class="muted">${fmtMonth(ps.period_start)} · ${ps.run_code || ''} · Dibayar ${ps.pay_date || '-'}</p>
  <h2 style="font-size:14px;margin-top:20px">Pendapatan</h2>
  <table>${earnRows || '<tr><td colspan="2">-</td></tr>'}
  <tr><th>Total</th><th style="text-align:right">${fmtCur(ps.total_earnings || 0)}</th></tr></table>
  <h2 style="font-size:14px">Potongan</h2>
  <table>${dedRows || '<tr><td colspan="2">-</td></tr>'}
  <tr><th>Total</th><th style="text-align:right">-${fmtCur(ps.total_deductions || 0)}</th></tr></table>
  ${(ps.tax_amount || 0) > 0 ? `<p class="muted">PPh 21: ${fmtCur(ps.tax_amount || 0)}</p>` : ''}
  <div class="net"><span>Gaji Bersih</span><strong>${fmtCur(ps.net_salary || 0)}</strong></div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
