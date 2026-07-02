import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import DocumentExportButton from '@/components/documents/DocumentExportButton';
import {
  Search, FileText, Download, Eye, X, Calendar, Users, DollarSign,
  ChevronRight, Filter, Printer, CheckCircle, AlertCircle, Clock,
  Building2, CreditCard, TrendingUp, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

interface PayslipItem {
  id: string; employee_id: string; employee_name: string; employee_position: string;
  department: string; pay_type: string; base_salary: number; total_earnings: number;
  total_deductions: number; tax_amount: number; net_salary: number;
  earnings: any[]; deductions: any[]; working_days: number;
  bpjs_kes_employee?: number; bpjs_tk_jht_employee?: number; bpjs_tk_jp_employee?: number;
  run_code?: string; period_start?: string; period_end?: string; pay_date?: string; run_status?: string;
}

const MOCK_PAYSLIPS: PayslipItem[] = [
  { id: 'ps1', employee_id: '1', employee_name: 'Ahmad Wijaya', employee_position: 'General Manager', department: 'MANAGEMENT', pay_type: 'monthly', base_salary: 25000000, total_earnings: 27250000, total_deductions: 3725000, tax_amount: 2100000, net_salary: 23525000, earnings: [{ name: 'Gaji Pokok', amount: 25000000 }, { name: 'Tunj. Jabatan', amount: 1500000 }, { name: 'Tunj. Makan', amount: 750000 }], deductions: [{ name: 'BPJS Kesehatan', amount: 250000 }, { name: 'BPJS JHT', amount: 500000 }, { name: 'BPJS JP', amount: 95596 }, { name: 'PPh 21', amount: 2100000 }], working_days: 22, run_code: 'PAY-2026-03', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', run_status: 'paid' },
  { id: 'ps2', employee_id: '2', employee_name: 'Siti Rahayu', employee_position: 'Branch Manager', department: 'OPERATIONS', pay_type: 'monthly', base_salary: 18000000, total_earnings: 19750000, total_deductions: 2437000, tax_amount: 1200000, net_salary: 17313000, earnings: [{ name: 'Gaji Pokok', amount: 18000000 }, { name: 'Tunj. Jabatan', amount: 1000000 }, { name: 'Tunj. Makan', amount: 750000 }], deductions: [{ name: 'BPJS Kesehatan', amount: 180000 }, { name: 'BPJS JHT', amount: 360000 }, { name: 'BPJS JP', amount: 95596 }, { name: 'PPh 21', amount: 1200000 }], working_days: 22, run_code: 'PAY-2026-03', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', run_status: 'paid' },
  { id: 'ps3', employee_id: '3', employee_name: 'Budi Santoso', employee_position: 'Branch Manager', department: 'OPERATIONS', pay_type: 'monthly', base_salary: 18000000, total_earnings: 19750000, total_deductions: 2437000, tax_amount: 1200000, net_salary: 17313000, earnings: [{ name: 'Gaji Pokok', amount: 18000000 }, { name: 'Tunj. Jabatan', amount: 1000000 }, { name: 'Tunj. Makan', amount: 750000 }], deductions: [{ name: 'BPJS Kesehatan', amount: 180000 }, { name: 'BPJS JHT', amount: 360000 }, { name: 'BPJS JP', amount: 95596 }, { name: 'PPh 21', amount: 1200000 }], working_days: 22, run_code: 'PAY-2026-03', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', run_status: 'paid' },
  { id: 'ps4', employee_id: '5', employee_name: 'Eko Prasetyo', employee_position: 'Warehouse Supervisor', department: 'WAREHOUSE', pay_type: 'monthly', base_salary: 12000000, total_earnings: 13250000, total_deductions: 1587000, tax_amount: 600000, net_salary: 11663000, earnings: [{ name: 'Gaji Pokok', amount: 12000000 }, { name: 'Tunj. Jabatan', amount: 500000 }, { name: 'Tunj. Makan', amount: 750000 }], deductions: [{ name: 'BPJS Kesehatan', amount: 120000 }, { name: 'BPJS JHT', amount: 240000 }, { name: 'BPJS JP', amount: 95596 }, { name: 'PPh 21', amount: 600000 }], working_days: 22, run_code: 'PAY-2026-03', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', run_status: 'paid' },
  { id: 'ps5', employee_id: '6', employee_name: 'Lisa Permata', employee_position: 'Finance Manager', department: 'FINANCE', pay_type: 'monthly', base_salary: 20000000, total_earnings: 21750000, total_deductions: 2937000, tax_amount: 1500000, net_salary: 18813000, earnings: [{ name: 'Gaji Pokok', amount: 20000000 }, { name: 'Tunj. Jabatan', amount: 1000000 }, { name: 'Tunj. Makan', amount: 750000 }], deductions: [{ name: 'BPJS Kesehatan', amount: 200000 }, { name: 'BPJS JHT', amount: 400000 }, { name: 'BPJS JP', amount: 95596 }, { name: 'PPh 21', amount: 1500000 }], working_days: 22, run_code: 'PAY-2026-03', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', run_status: 'paid' },
  { id: 'ps6', employee_id: '12', employee_name: 'Hendra Gunawan', employee_position: 'Warehouse Staff', department: 'WAREHOUSE', pay_type: 'daily', base_salary: 3300000, total_earnings: 3800000, total_deductions: 266000, tax_amount: 0, net_salary: 3534000, earnings: [{ name: 'Gaji Pokok', amount: 3300000 }, { name: 'Tunj. Makan', amount: 500000 }], deductions: [{ name: 'BPJS Kesehatan', amount: 33000 }, { name: 'BPJS JHT', amount: 66000 }, { name: 'BPJS JP', amount: 33000 }], working_days: 22, run_code: 'PAY-2026-03', period_start: '2026-03-01', period_end: '2026-03-31', pay_date: '2026-03-31', run_status: 'paid' },
];

export default function SlipGajiPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipItem | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => { setMounted(true); fetchPayslips(); }, []);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/payroll?action=payslip');
      const json = await res.json();
      if (json.success && json.data?.length) setPayslips(json.data);
      else setPayslips(MOCK_PAYSLIPS);
    } catch { setPayslips(MOCK_PAYSLIPS); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let data = payslips;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(p => p.employee_name?.toLowerCase().includes(q) || p.department?.toLowerCase().includes(q) || p.employee_position?.toLowerCase().includes(q));
    }
    if (filterDept !== 'all') data = data.filter(p => p.department === filterDept);
    if (filterPeriod) data = data.filter(p => p.period_start?.startsWith(filterPeriod));
    return data;
  }, [payslips, searchQuery, filterDept, filterPeriod]);

  const departments = useMemo(() => [...new Set(payslips.map(p => p.department))].sort(), [payslips]);
  const totalNet = filtered.reduce((s, p) => s + (p.net_salary || 0), 0);
  const totalGross = filtered.reduce((s, p) => s + (p.total_earnings || 0), 0);
  const totalTax = filtered.reduce((s, p) => s + (p.tax_amount || 0), 0);

  if (!mounted) return null;

  return (
    <HQLayout title="Slip Gaji Karyawan" subtitle="Riwayat slip gaji, detail pendapatan dan potongan per karyawan">
      <div className="space-y-6">
        {/* Back + Summary */}
        <div className="flex items-center gap-3">
          <Link href="/hq/hris/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1"><h2 className="text-lg font-bold">Slip Gaji Karyawan</h2><p className="text-sm text-gray-500">Daftar slip gaji dari semua periode penggajian</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Karyawan', value: filtered.length, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600', fmt: false },
            { label: 'Total Gaji Kotor', value: totalGross, icon: TrendingUp, bg: 'bg-green-100', color: 'text-green-600', fmt: true },
            { label: 'Total Pajak', value: totalTax, icon: DollarSign, bg: 'bg-amber-100', color: 'text-amber-600', fmt: true },
            { label: 'Total Gaji Bersih', value: totalNet, icon: CreditCard, bg: 'bg-emerald-100', color: 'text-emerald-600', fmt: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div><p className="text-xs text-gray-500">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{s.fmt ? fmtCurrency(s.value as number) : s.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 flex flex-wrap gap-3 border-b">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari nama, jabatan, departemen..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Departemen</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input type="month" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-gray-400"><Clock className="w-8 h-8 mx-auto mb-2 animate-spin" /><p>Memuat data...</p></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400"><FileText className="w-12 h-12 mx-auto mb-3" /><p>Tidak ada slip gaji ditemukan</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Periode</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Kotor</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Potongan</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pajak</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Bersih</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium text-sm">{p.employee_name}</p><p className="text-xs text-gray-500">{p.employee_position} · {p.department}</p></td>
                      <td className="px-4 py-3 text-center text-xs text-gray-600">{p.run_code}<br /><span className="text-gray-400">{fmtDate(p.period_start || '')} - {fmtDate(p.period_end || '')}</span></td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{fmtCurrency(p.total_earnings)}</td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">{fmtCurrency(p.total_deductions)}</td>
                      <td className="px-4 py-3 text-right text-sm text-amber-600">{fmtCurrency(p.tax_amount)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{fmtCurrency(p.net_salary)}</td>
                      <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.run_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{p.run_status === 'paid' ? 'Dibayar' : 'Proses'}</span></td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setSelectedPayslip(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Detail"><Eye className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div><h3 className="text-lg font-semibold">Slip Gaji - {selectedPayslip.employee_name}</h3><p className="text-xs text-gray-500">{selectedPayslip.run_code} · {fmtDate(selectedPayslip.period_start || '')} s/d {fmtDate(selectedPayslip.period_end || '')}</p></div>
              <div className="flex items-center gap-2">
                <DocumentExportButton documentType="payslip" variant="icon" data={{ employeeName: selectedPayslip.employee_name, employeeId: selectedPayslip.employee_id, position: selectedPayslip.employee_position, department: selectedPayslip.department, period: `${selectedPayslip.period_start} s/d ${selectedPayslip.period_end}`, earnings: selectedPayslip.earnings, deductions: selectedPayslip.deductions, totalEarnings: selectedPayslip.total_earnings, totalDeductions: selectedPayslip.total_deductions, netPay: selectedPayslip.net_salary }} meta={{ documentNumber: `PSL-${selectedPayslip.run_code}-${selectedPayslip.employee_id}`, period: `${selectedPayslip.period_start} - ${selectedPayslip.period_end}` }} showFormats={['pdf']} />
                <button onClick={() => setSelectedPayslip(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-500">Nama Karyawan</p><p className="font-semibold">{selectedPayslip.employee_name}</p></div>
                <div><p className="text-xs text-gray-500">Jabatan</p><p className="font-medium">{selectedPayslip.employee_position}</p></div>
                <div><p className="text-xs text-gray-500">Departemen</p><p className="font-medium">{selectedPayslip.department}</p></div>
                <div><p className="text-xs text-gray-500">Tipe Gaji</p><p className="font-medium capitalize">{selectedPayslip.pay_type}</p></div>
                <div><p className="text-xs text-gray-500">Hari Kerja</p><p className="font-medium">{selectedPayslip.working_days} hari</p></div>
                <div><p className="text-xs text-gray-500">Tgl Bayar</p><p className="font-medium">{fmtDate(selectedPayslip.pay_date || '')}</p></div>
              </div>
              {/* Earnings */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-green-50 border-b"><p className="text-sm font-semibold text-green-700 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Pendapatan</p></div>
                <div className="divide-y">{selectedPayslip.earnings.map((e, i) => (<div key={i} className="px-4 py-2.5 flex justify-between text-sm"><span className="text-gray-700">{e.name}</span><span className="font-medium">{fmtCurrency(e.amount)}</span></div>))}</div>
                <div className="px-4 py-2.5 bg-green-50 flex justify-between text-sm font-bold text-green-700 border-t"><span>Total Pendapatan</span><span>{fmtCurrency(selectedPayslip.total_earnings)}</span></div>
              </div>
              {/* Deductions */}
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-red-50 border-b"><p className="text-sm font-semibold text-red-700 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Potongan</p></div>
                <div className="divide-y">{selectedPayslip.deductions.map((d, i) => (<div key={i} className="px-4 py-2.5 flex justify-between text-sm"><span className="text-gray-700">{d.name}</span><span className="font-medium text-red-600">-{fmtCurrency(d.amount)}</span></div>))}</div>
                <div className="px-4 py-2.5 bg-red-50 flex justify-between text-sm font-bold text-red-700 border-t"><span>Total Potongan</span><span>-{fmtCurrency(selectedPayslip.total_deductions)}</span></div>
              </div>
              {/* Net */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-5 text-white text-center">
                <p className="text-sm opacity-80">Gaji Bersih (Take Home Pay)</p>
                <p className="text-3xl font-bold mt-1">{fmtCurrency(selectedPayslip.net_salary)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (<div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.message}</div>)}
    </HQLayout>
  );
}
