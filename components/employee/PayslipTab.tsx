import { useState, useEffect, useCallback } from 'react';
import { Wallet, ChevronDown, ChevronUp, Loader2, Receipt, TrendingDown, TrendingUp, Printer } from 'lucide-react';
import { printPayslipHtml } from '@/components/employee/payslip-print';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const fmtMonth = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : '-';

export default function PayslipTab() {
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchPayslips = useCallback(async (month?: string) => {
    setLoading(true);
    try {
      const params = month ? `&month=${month}` : '';
      const res = await fetch(`/api/employee/dashboard?action=payslip${params}`);
      const data = await res.json();
      setPayslips(Array.isArray(data.data) ? data.data : []);
    } catch { setPayslips([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayslips(selectedMonth); }, [selectedMonth, fetchPayslips]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hf-brand-600)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 text-white"
        style={{ background: 'linear-gradient(135deg, var(--hf-brand-600), var(--hf-brand))' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5" />
          <span className="font-bold text-sm">Slip Gaji</span>
        </div>
        <p className="text-xs opacity-90">Akses payslip bulanan Anda secara aman</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Periode</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as string]: 'var(--hf-brand-100)' }}
        />
      </div>

      {payslips.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Belum ada slip gaji</p>
          <p className="text-xs mt-1">Slip gaji akan tersedia setelah payroll diproses</p>
        </div>
      ) : payslips.map(ps => {
        const isOpen = expanded === ps.id;
        const earnings = Array.isArray(ps.earnings) ? ps.earnings : [];
        const deductions = Array.isArray(ps.deductions) ? ps.deductions : [];

        return (
          <div key={ps.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : ps.id)}
              className="w-full p-4 text-left active:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{fmtMonth(ps.period_start)}</p>
                  <p className="text-[11px] text-slate-500">{ps.run_code} · Dibayar {fmtDate(ps.pay_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 text-sm">{fmtCur(ps.net_salary)}</p>
                  <p className="text-[10px] text-slate-400">Take home pay</p>
                </div>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 mt-2" /> : <ChevronDown className="w-4 h-4 text-slate-400 mt-2" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-slate-50 space-y-3">
                <div className="pt-3 grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 text-emerald-700 mb-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Pendapatan</span>
                    </div>
                    <p className="font-bold text-sm text-emerald-800">{fmtCur(ps.total_earnings)}</p>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 text-rose-700 mb-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Potongan</span>
                    </div>
                    <p className="font-bold text-sm text-rose-800">{fmtCur(ps.total_deductions)}</p>
                  </div>
                </div>

                {earnings.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Rincian Pendapatan</p>
                    {earnings.map((e: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <span className="text-slate-600">{e.name || e.label}</span>
                        <span className="font-medium text-slate-900">{fmtCur(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {deductions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Rincian Potongan</p>
                    {deductions.map((d: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                        <span className="text-slate-600">{d.name || d.label}</span>
                        <span className="font-medium text-rose-600">-{fmtCur(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {ps.tax_amount > 0 && (
                  <div className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-600">PPh 21</span>
                    <span className="font-medium">{fmtCur(ps.tax_amount)}</span>
                  </div>
                )}

                <div
                  className="flex justify-between items-center text-white rounded-xl px-4 py-3"
                  style={{ background: 'var(--hf-brand-600)' }}
                >
                  <span className="text-sm font-semibold">Gaji Bersih</span>
                  <span className="font-bold">{fmtCur(ps.net_salary)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const ok = printPayslipHtml(ps);
                    if (!ok) window.alert('Izinkan pop-up untuk mencetak / unduh PDF slip gaji.');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="w-4 h-4" /> Cetak / Unduh PDF
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
