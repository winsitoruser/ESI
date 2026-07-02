import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Gift, Users, DollarSign, Calculator, Calendar, CheckCircle, AlertCircle,
  Search, Eye, X, ArrowLeft, TrendingUp, Clock, Settings, Save, FileText
} from 'lucide-react';
import Link from 'next/link';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

interface THRConfig {
  year: number; religiousDay: string; payDate: string;
  calculationMethod: 'prorata' | 'full'; minimumMonths: number;
  maxAmount: number; includeAllowances: boolean;
}

interface THRItem {
  id: string; employee_id: string; employee_name: string; position: string;
  department: string; join_date: string; months_worked: number;
  base_salary: number; allowances: number; thr_amount: number;
  calculation: string; status: 'eligible' | 'prorata' | 'not_eligible';
}

const RELIGIOUS_DAYS = [
  { value: 'idul_fitri', label: 'Idul Fitri (Lebaran)' },
  { value: 'natal', label: 'Natal' },
  { value: 'nyepi', label: 'Nyepi' },
  { value: 'waisak', label: 'Waisak' },
  { value: 'imlek', label: 'Imlek' },
];

const MOCK_THR: THRItem[] = [
  { id: 't1', employee_id: '1', employee_name: 'Ahmad Wijaya', position: 'General Manager', department: 'MANAGEMENT', join_date: '2020-01-15', months_worked: 74, base_salary: 25000000, allowances: 2250000, thr_amount: 27250000, calculation: '1 bulan gaji (>12 bulan)', status: 'eligible' },
  { id: 't2', employee_id: '2', employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'OPERATIONS', join_date: '2021-06-01', months_worked: 57, base_salary: 18000000, allowances: 1750000, thr_amount: 19750000, calculation: '1 bulan gaji (>12 bulan)', status: 'eligible' },
  { id: 't3', employee_id: '3', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'OPERATIONS', join_date: '2022-03-10', months_worked: 48, base_salary: 18000000, allowances: 1750000, thr_amount: 19750000, calculation: '1 bulan gaji (>12 bulan)', status: 'eligible' },
  { id: 't4', employee_id: '5', employee_name: 'Eko Prasetyo', position: 'Warehouse Supervisor', department: 'WAREHOUSE', join_date: '2023-08-01', months_worked: 31, base_salary: 12000000, allowances: 1250000, thr_amount: 13250000, calculation: '1 bulan gaji (>12 bulan)', status: 'eligible' },
  { id: 't5', employee_id: '6', employee_name: 'Lisa Permata', position: 'Finance Manager', department: 'FINANCE', join_date: '2024-01-02', months_worked: 26, base_salary: 20000000, allowances: 1750000, thr_amount: 21750000, calculation: '1 bulan gaji (>12 bulan)', status: 'eligible' },
  { id: 't6', employee_id: '12', employee_name: 'Hendra Gunawan', position: 'Warehouse Staff', department: 'WAREHOUSE', join_date: '2025-11-01', months_worked: 4, base_salary: 3300000, allowances: 500000, thr_amount: 1266667, calculation: 'Prorata 4/12 bulan', status: 'prorata' },
  { id: 't7', employee_id: '20', employee_name: 'Rizki Firmansyah', position: 'IT Staff', department: 'IT', join_date: '2026-02-15', months_worked: 1, base_salary: 8000000, allowances: 750000, thr_amount: 0, calculation: 'Belum memenuhi syarat (<1 bulan)', status: 'not_eligible' },
];

export default function THRPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<THRItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'config'>('list');
  const [showDetail, setShowDetail] = useState<THRItem | null>(null);
  const [config, setConfig] = useState<THRConfig>({
    year: 2026, religiousDay: 'idul_fitri', payDate: '2026-03-28',
    calculationMethod: 'prorata', minimumMonths: 1, maxAmount: 0, includeAllowances: true
  });
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => { setToast({ type, message }); setTimeout(() => setToast(null), 3000); };

  const fetchTHR = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: String(config.year),
        minimumMonths: String(config.minimumMonths),
        includeAllowances: String(config.includeAllowances),
        refDate: config.payDate,
      });
      const res = await fetch(`/api/hq/hris/payroll?action=thr&${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (res.ok && Array.isArray(json?.data) && json.data.length > 0) {
        setItems(json.data);
      } else {
        setItems(MOCK_THR);
      }
    } catch {
      setItems(MOCK_THR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchTHR();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.employee_name.toLowerCase().includes(q) || i.department.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const eligible = filtered.filter(i => i.status === 'eligible');
  const prorata = filtered.filter(i => i.status === 'prorata');
  const notEligible = filtered.filter(i => i.status === 'not_eligible');
  const totalTHR = filtered.reduce((s, i) => s + i.thr_amount, 0);

  const handleCalculate = async () => {
    await fetchTHR();
    showToast('success', `THR berhasil dihitung ulang`);
  };

  if (!mounted) return null;

  return (
    <HQLayout title="THR - Tunjangan Hari Raya" subtitle="Perhitungan dan manajemen THR karyawan">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hq/hris/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1"><h2 className="text-lg font-bold">Tunjangan Hari Raya (THR)</h2><p className="text-sm text-gray-500">Perhitungan THR sesuai PP No. 36/2021</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Eligible', value: eligible.length, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Prorata', value: prorata.length, icon: Clock, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Tidak Eligible', value: notEligible.length, icon: AlertCircle, bg: 'bg-red-100', color: 'text-red-600' },
            { label: 'Total Karyawan', value: items.length, icon: Users, bg: 'bg-purple-100', color: 'text-purple-600' },
            { label: 'Total THR', value: totalTHR, icon: Gift, bg: 'bg-amber-100', color: 'text-amber-600', fmt: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3">
                <div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div><p className="text-xs text-gray-500">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{'fmt' in s && s.fmt ? fmtCurrency(s.value as number) : s.value}</p></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b">
            {[{ key: 'list', label: 'Daftar THR', icon: FileText }, { key: 'config', label: 'Konfigurasi', icon: Settings }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          {activeTab === 'config' && (
            <div className="p-6 max-w-2xl space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Tahun</label><input type="number" value={config.year} onChange={e => setConfig(c => ({ ...c, year: +e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Hari Raya</label><select value={config.religiousDay} onChange={e => setConfig(c => ({ ...c, religiousDay: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">{RELIGIOUS_DAYS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Tanggal Bayar THR</label><input type="date" value={config.payDate} onChange={e => setConfig(c => ({ ...c, payDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Minimum Masa Kerja (bulan)</label><input type="number" value={config.minimumMonths} onChange={e => setConfig(c => ({ ...c, minimumMonths: +e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" min={1} /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.includeAllowances} onChange={e => setConfig(c => ({ ...c, includeAllowances: e.target.checked }))} className="rounded" /> Sertakan Tunjangan Tetap</label>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold">Aturan Perhitungan THR (PP No. 36/2021):</p>
                <p>• Masa kerja ≥ 12 bulan: THR = 1 bulan gaji</p>
                <p>• Masa kerja 1-12 bulan: THR = masa kerja / 12 × gaji</p>
                <p>• Masa kerja &lt; 1 bulan: Tidak mendapatkan THR</p>
                <p>• Gaji = Gaji pokok + tunjangan tetap</p>
                <p>• THR dibayar paling lambat 7 hari sebelum hari raya</p>
              </div>
              <button onClick={handleCalculate} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"><Calculator className="w-4 h-4" /> Hitung THR</button>
            </div>
          )}

          {activeTab === 'list' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 border-b justify-between items-center">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
                <button onClick={handleCalculate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><Calculator className="w-4 h-4" /> Hitung Ulang</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Masa Kerja</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Pokok</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tunjangan</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">THR</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perhitungan</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(item => (
                      <tr key={item.id} className={`hover:bg-gray-50 ${item.status === 'not_eligible' ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3"><p className="font-medium text-sm">{item.employee_name}</p><p className="text-xs text-gray-500">{item.position} · {item.department}</p></td>
                        <td className="px-4 py-3 text-center text-sm">{item.months_worked} bln</td>
                        <td className="px-4 py-3 text-right text-sm">{fmtCurrency(item.base_salary)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">{fmtCurrency(item.allowances)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{item.thr_amount > 0 ? fmtCurrency(item.thr_amount) : '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{item.calculation}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${item.status === 'eligible' ? 'bg-green-100 text-green-700' : item.status === 'prorata' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.status === 'eligible' ? 'Penuh' : item.status === 'prorata' ? 'Prorata' : 'Tidak Eligible'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td className="px-4 py-3 text-sm" colSpan={4}>Total THR ({filtered.filter(f => f.thr_amount > 0).length} karyawan)</td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">{fmtCurrency(totalTHR)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      {toast && (<div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.message}</div>)}
    </HQLayout>
  );
}
