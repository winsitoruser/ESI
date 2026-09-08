import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { PayrollShell } from '@/components/humanify/PayrollModuleChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import {
  Gift, Users, Calculator, CheckCircle, AlertCircle,
  Search, Clock, Settings, FileText
} from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<THRItem[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
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
      const res = await fetch(`/api/humanify/payroll?action=thr&${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (res.ok && Array.isArray(json?.data)) {
        setItems(json.data);
        setDataSource(json.data.length ? 'live' : 'empty');
      } else {
        setItems(USE_MOCK_UI ? MOCK_THR : []);
        if (USE_MOCK_UI) setDataSource('demo');
      }
    } catch {
      setItems(USE_MOCK_UI ? MOCK_THR : []);
      if (USE_MOCK_UI) setDataSource('demo');
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
      <PayrollShell
        current="thr"
        title="Tunjangan Hari Raya"
        subtitle="Hitung THR sesuai PP No. 36/2021, lalu ekspor untuk proses gaji."
        icon={Gift}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge source={dataSource} />
            <a href={`/api/humanify/payroll?action=export&type=thr&year=${config.year}&minimumMonths=${config.minimumMonths}&includeAllowances=${config.includeAllowances}&refDate=${config.payDate}`} download className="hf-btn-secondary inline-flex items-center gap-2">
              <FileText className="h-4 w-4" /> Export CSV
            </a>
          </div>
        )}
      >

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <OpsKpiShell><HRStatCard icon={CheckCircle} label="Eligible" value={eligible.length} accent="emerald" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Clock} label="Prorata" value={prorata.length} accent="violet" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={AlertCircle} label="Tidak eligible" value={notEligible.length} accent="rose" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Users} label="Total karyawan" value={items.length} accent="violet" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Gift} label="Total THR" value={fmtCurrency(totalTHR)} accent="amber" /></OpsKpiShell>
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'list', label: 'Daftar THR', icon: FileText, count: filtered.length || undefined },
            { key: 'config', label: 'Konfigurasi', icon: Settings },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'config' && (
            <div className="hf-card max-w-2xl space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1 block text-sm font-medium text-[color:var(--hf-ink)]">Tahun</label><input type="number" value={config.year} onChange={e => setConfig(c => ({ ...c, year: +e.target.value }))} className="hf-input w-full" /></div>
                <div><label className="mb-1 block text-sm font-medium text-[color:var(--hf-ink)]">Hari raya</label><select value={config.religiousDay} onChange={e => setConfig(c => ({ ...c, religiousDay: e.target.value }))} className="hf-input w-full">{RELIGIOUS_DAYS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                <div><label className="mb-1 block text-sm font-medium text-[color:var(--hf-ink)]">Tanggal bayar THR</label><input type="date" value={config.payDate} onChange={e => setConfig(c => ({ ...c, payDate: e.target.value }))} className="hf-input w-full" /></div>
                <div><label className="mb-1 block text-sm font-medium text-[color:var(--hf-ink)]">Minimum masa kerja (bulan)</label><input type="number" value={config.minimumMonths} onChange={e => setConfig(c => ({ ...c, minimumMonths: +e.target.value }))} className="hf-input w-full" min={1} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm text-[color:var(--hf-ink)]"><input type="checkbox" checked={config.includeAllowances} onChange={e => setConfig(c => ({ ...c, includeAllowances: e.target.checked }))} className="rounded" /> Sertakan tunjangan tetap</label>
              <div className="space-y-1 rounded-[var(--hf-radius)] border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] p-4 text-sm text-[color:var(--hf-brand-600)]">
                <p className="font-semibold">Aturan perhitungan THR (PP No. 36/2021)</p>
                <p>• Masa kerja ≥ 12 bulan: THR = 1 bulan gaji</p>
                <p>• Masa kerja 1–12 bulan: THR = masa kerja / 12 × gaji</p>
                <p>• Masa kerja &lt; 1 bulan: tidak mendapatkan THR</p>
                <p>• Gaji = gaji pokok + tunjangan tetap</p>
                <p>• THR dibayar paling lambat 7 hari sebelum hari raya</p>
              </div>
              <button type="button" onClick={handleCalculate} className="hf-btn-primary inline-flex items-center gap-2"><Calculator className="h-4 w-4" /> Hitung THR</button>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="hf-input w-full pl-9" /></div>
                <button type="button" onClick={handleCalculate} className="hf-btn-primary inline-flex items-center gap-2"><Calculator className="h-4 w-4" /> Hitung ulang</button>
              </div>
              {!loading && items.length === 0 ? (
                <HrisEmptyState
                  source={dataSource}
                  title="Belum ada data THR"
                  description='Klik "Hitung THR" untuk menghitung tunjangan hari raya karyawan.'
                />
              ) : (
              <div className="hf-table-wrap overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Karyawan</th>
                      <th className="text-center">Masa kerja</th>
                      <th className="text-right">Gaji pokok</th>
                      <th className="text-right">Tunjangan</th>
                      <th className="text-right">THR</th>
                      <th>Perhitungan</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => (
                      <tr key={item.id} className={item.status === 'not_eligible' ? 'opacity-50' : ''}>
                        <td><p className="font-medium text-[color:var(--hf-ink)]">{item.employee_name}</p><p className="text-xs text-[color:var(--hf-ink-muted)]">{item.position} · {item.department}</p></td>
                        <td className="text-center">{item.months_worked} bln</td>
                        <td className="text-right tabular-nums">{fmtCurrency(item.base_salary)}</td>
                        <td className="text-right tabular-nums">{fmtCurrency(item.allowances)}</td>
                        <td className="text-right font-semibold tabular-nums text-[color:var(--hf-success)]">{item.thr_amount > 0 ? fmtCurrency(item.thr_amount) : '-'}</td>
                        <td className="text-xs text-[color:var(--hf-ink-muted)]">{item.calculation}</td>
                        <td className="text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.status === 'eligible' ? 'bg-emerald-50 text-[color:var(--hf-success)]' : item.status === 'prorata' ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' : 'bg-rose-50 text-[color:var(--hf-danger)]'}`}>{item.status === 'eligible' ? 'Penuh' : item.status === 'prorata' ? 'Prorata' : 'Tidak eligible'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[var(--hf-surface-muted)] font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-sm" colSpan={4}>Total THR ({filtered.filter(f => f.thr_amount > 0).length} karyawan)</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(totalTHR)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              )}
            </div>
          )}
      </PayrollShell>
      {toast && (<div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.message}</div>)}
    </HQLayout>
  );
}
