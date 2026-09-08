import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import { PayrollShell } from '@/components/humanify/PayrollModuleChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import {
  Shield, Users, DollarSign, Search, Eye, X, Heart, Building2, FileText, Settings
} from 'lucide-react';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const BPJS_RATES = {
  kesehatan: { employee: 1, company: 4, maxSalary: 12000000, label: 'BPJS Kesehatan' },
  jht: { employee: 2, company: 3.7, maxSalary: 0, label: 'Jaminan Hari Tua (JHT)' },
  jp: { employee: 1, company: 2, maxSalary: 10042300, label: 'Jaminan Pensiun (JP)' },
  jkk: { employee: 0, company: 0.24, maxSalary: 0, label: 'Jaminan Kecelakaan Kerja (JKK)' },
  jkm: { employee: 0, company: 0.3, maxSalary: 0, label: 'Jaminan Kematian (JKM)' },
};

interface BPJSItem {
  id: string; employee_name: string; position: string; department: string;
  base_salary: number; bpjs_kes_no: string; bpjs_tk_no: string;
  kes_employee: number; kes_company: number;
  jht_employee: number; jht_company: number;
  jp_employee: number; jp_company: number;
  jkk: number; jkm: number;
  total_employee: number; total_company: number;
  dependents: number; status: 'active' | 'inactive';
}

function calcBPJS(salary: number) {
  const kesSalary = Math.min(salary, BPJS_RATES.kesehatan.maxSalary || salary);
  const jpSalary = Math.min(salary, BPJS_RATES.jp.maxSalary || salary);
  const kes_e = Math.round(kesSalary * BPJS_RATES.kesehatan.employee / 100);
  const kes_c = Math.round(kesSalary * BPJS_RATES.kesehatan.company / 100);
  const jht_e = Math.round(salary * BPJS_RATES.jht.employee / 100);
  const jht_c = Math.round(salary * BPJS_RATES.jht.company / 100);
  const jp_e = Math.round(jpSalary * BPJS_RATES.jp.employee / 100);
  const jp_c = Math.round(jpSalary * BPJS_RATES.jp.company / 100);
  const jkk = Math.round(salary * BPJS_RATES.jkk.company / 100);
  const jkm = Math.round(salary * BPJS_RATES.jkm.company / 100);
  return { kes_e, kes_c, jht_e, jht_c, jp_e, jp_c, jkk, jkm, total_e: kes_e + jht_e + jp_e, total_c: kes_c + jht_c + jp_c + jkk + jkm };
}


const MOCK_BPJS: BPJSItem[] = [
  { id: '1', employee_name: 'Ahmad Wijaya', position: 'General Manager', department: 'MANAGEMENT', base_salary: 25000000, bpjs_kes_no: '0001234567890', bpjs_tk_no: '19800115001', dependents: 2, status: 'active', ...(() => { const b = calcBPJS(25000000); return { kes_employee: b.kes_e, kes_company: b.kes_c, jht_employee: b.jht_e, jht_company: b.jht_c, jp_employee: b.jp_e, jp_company: b.jp_c, jkk: b.jkk, jkm: b.jkm, total_employee: b.total_e, total_company: b.total_c }; })() },
  { id: '2', employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'OPERATIONS', base_salary: 18000000, bpjs_kes_no: '0001234567891', bpjs_tk_no: '19900620002', dependents: 0, status: 'active', ...(() => { const b = calcBPJS(18000000); return { kes_employee: b.kes_e, kes_company: b.kes_c, jht_employee: b.jht_e, jht_company: b.jht_c, jp_employee: b.jp_e, jp_company: b.jp_c, jkk: b.jkk, jkm: b.jkm, total_employee: b.total_e, total_company: b.total_c }; })() },
  { id: '3', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'OPERATIONS', base_salary: 18000000, bpjs_kes_no: '0001234567892', bpjs_tk_no: '19850303003', dependents: 3, status: 'active', ...(() => { const b = calcBPJS(18000000); return { kes_employee: b.kes_e, kes_company: b.kes_c, jht_employee: b.jht_e, jht_company: b.jht_c, jp_employee: b.jp_e, jp_company: b.jp_c, jkk: b.jkk, jkm: b.jkm, total_employee: b.total_e, total_company: b.total_c }; })() },
  { id: '5', employee_name: 'Eko Prasetyo', position: 'Warehouse Supervisor', department: 'WAREHOUSE', base_salary: 12000000, bpjs_kes_no: '0001234567894', bpjs_tk_no: '19880710005', dependents: 2, status: 'active', ...(() => { const b = calcBPJS(12000000); return { kes_employee: b.kes_e, kes_company: b.kes_c, jht_employee: b.jht_e, jht_company: b.jht_c, jp_employee: b.jp_e, jp_company: b.jp_c, jkk: b.jkk, jkm: b.jkm, total_employee: b.total_e, total_company: b.total_c }; })() },
  { id: '6', employee_name: 'Lisa Permata', position: 'Finance Manager', department: 'FINANCE', base_salary: 20000000, bpjs_kes_no: '0001234567895', bpjs_tk_no: '19920415006', dependents: 0, status: 'active', ...(() => { const b = calcBPJS(20000000); return { kes_employee: b.kes_e, kes_company: b.kes_c, jht_employee: b.jht_e, jht_company: b.jht_c, jp_employee: b.jp_e, jp_company: b.jp_c, jkk: b.jkk, jkm: b.jkm, total_employee: b.total_e, total_company: b.total_c }; })() },
  { id: '12', employee_name: 'Hendra Gunawan', position: 'Warehouse Staff', department: 'WAREHOUSE', base_salary: 3300000, bpjs_kes_no: '0001234567901', bpjs_tk_no: '19950820012', dependents: 1, status: 'active', ...(() => { const b = calcBPJS(3300000); return { kes_employee: b.kes_e, kes_company: b.kes_c, jht_employee: b.jht_e, jht_company: b.jht_c, jp_employee: b.jp_e, jp_company: b.jp_c, jkk: b.jkk, jkm: b.jkm, total_employee: b.total_e, total_company: b.total_c }; })() },
];

export default function BPJSPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<BPJSItem[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'kesehatan' | 'ketenagakerjaan' | 'tarif'>('kesehatan');
  const [selectedItem, setSelectedItem] = useState<BPJSItem | null>(null);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/humanify/payroll?action=bpjs');
        const json = await res.json().catch(() => null);
        if (res.ok && Array.isArray(json?.data)) {
          const mapped: BPJSItem[] = json.data.map((r: any) => ({
            id: String(r.id),
            employee_name: r.employee_name,
            position: r.position || '-',
            department: r.department || '-',
            base_salary: Number(r.base_salary || 0),
            bpjs_kes_no: r.bpjs_kesehatan_number || '-',
            bpjs_tk_no: r.bpjs_tk_number || '-',
            kes_employee: Number(r.bpjs_kesehatan_employee || 0),
            kes_company: Number(r.bpjs_kesehatan_employer || 0),
            jht_employee: Number(r.jht_employee || 0),
            jht_company: Number(r.jht_employer || 0),
            jp_employee: Number(r.jp_employee || 0),
            jp_company: Number(r.jp_employer || 0),
            jkk: Number(r.jkk || 0),
            jkm: Number(r.jkm || 0),
            total_employee: Number(r.employee_total || 0),
            total_company: Number(r.employer_total || 0),
            dependents: 0,
            status: 'active',
          }));
          setItems(mapped);
          setDataSource(mapped.length ? 'live' : 'empty');
        } else {
          setItems(USE_MOCK_UI ? MOCK_BPJS : []);
          if (USE_MOCK_UI) setDataSource('demo');
        }
      } catch {
        setItems(USE_MOCK_UI ? MOCK_BPJS : []);
        if (USE_MOCK_UI) setDataSource('demo');
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.employee_name.toLowerCase().includes(q) || i.department.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const totals = useMemo(() => ({
    kes_e: filtered.reduce((s, i) => s + i.kes_employee, 0),
    kes_c: filtered.reduce((s, i) => s + i.kes_company, 0),
    jht_e: filtered.reduce((s, i) => s + i.jht_employee, 0),
    jht_c: filtered.reduce((s, i) => s + i.jht_company, 0),
    jp_e: filtered.reduce((s, i) => s + i.jp_employee, 0),
    jp_c: filtered.reduce((s, i) => s + i.jp_company, 0),
    jkk: filtered.reduce((s, i) => s + i.jkk, 0),
    jkm: filtered.reduce((s, i) => s + i.jkm, 0),
    total_e: filtered.reduce((s, i) => s + i.total_employee, 0),
    total_c: filtered.reduce((s, i) => s + i.total_company, 0),
  }), [filtered]);

  if (!mounted) return null;

  return (
    <HQLayout title="BPJS Management" subtitle="Pengelolaan BPJS Kesehatan dan Ketenagakerjaan">
      <PayrollShell
        current="bpjs"
        title="BPJS Kesehatan & Ketenagakerjaan"
        subtitle="Iuran karyawan dan perusahaan, siap ekspor CSV atau EDABU."
        icon={Shield}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge source={dataSource} />
            <a href="/api/humanify/compliance-export?action=bpjs&format=csv" download className="hf-btn-secondary inline-flex items-center gap-2"><FileText className="h-4 w-4" /> CSV</a>
            <a href="/api/humanify/compliance-export?action=bpjs&format=edabu" download className="hf-btn-primary inline-flex items-center gap-2"><FileText className="h-4 w-4" /> EDABU</a>
          </div>
        )}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <OpsKpiShell><HRStatCard icon={Users} label="Peserta aktif" value={items.filter(i => i.status === 'active').length} accent="violet" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={DollarSign} label="Iuran karyawan / bln" value={fmtCurrency(totals.total_e)} accent="amber" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Building2} label="Iuran perusahaan / bln" value={fmtCurrency(totals.total_c)} accent="emerald" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Shield} label="Total iuran / bln" value={fmtCurrency(totals.total_e + totals.total_c)} accent="violet" /></OpsKpiShell>
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'kesehatan', label: 'BPJS Kesehatan', icon: Heart },
            { key: 'ketenagakerjaan', label: 'BPJS Ketenagakerjaan', icon: Shield },
            { key: 'tarif', label: 'Tarif & ketentuan', icon: Settings },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

          {activeTab === 'kesehatan' && (
            <div className="space-y-3">
              <OpsToolbar>
                <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="hf-input w-full pl-9" /></div>
              </OpsToolbar>
              {items.length === 0 ? (
                <HrisEmptyState
                  source={dataSource}
                  title="Belum ada data BPJS Kesehatan"
                  description="Data iuran BPJS Kesehatan akan muncul setelah konfigurasi gaji karyawan selesai."
                />
              ) : (
              <div className="hf-table-wrap overflow-x-auto">
                <table><thead><tr>
                  <th>Karyawan</th>
                  <th>No. BPJS Kes</th>
                  <th className="text-center">Tanggungan</th>
                  <th className="text-right">Gaji pokok</th>
                  <th className="text-right">Karyawan (1%)</th>
                  <th className="text-right">Perusahaan (4%)</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Aksi</th>
                </tr></thead>
                <tbody>{filtered.map(i => (
                  <tr key={i.id}>
                    <td><p className="font-medium text-[color:var(--hf-ink)]">{i.employee_name}</p><p className="text-xs text-[color:var(--hf-ink-muted)]">{i.position}</p></td>
                    <td className="font-mono text-xs">{i.bpjs_kes_no || '-'}</td>
                    <td className="text-center">{i.dependents}</td>
                    <td className="text-right tabular-nums">{fmtCurrency(Math.min(i.base_salary, 12000000))}</td>
                    <td className="text-right tabular-nums text-amber-700">{fmtCurrency(i.kes_employee)}</td>
                    <td className="text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(i.kes_company)}</td>
                    <td className="text-right font-semibold tabular-nums">{fmtCurrency(i.kes_employee + i.kes_company)}</td>
                    <td className="text-center"><button type="button" onClick={() => setSelectedItem(i)} className="hf-btn-secondary inline-flex items-center gap-1 !px-2.5 !py-1 text-xs"><Eye className="h-3.5 w-3.5" /> Detail</button></td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-[var(--hf-surface-muted)] font-semibold"><tr>
                  <td className="px-4 py-3 text-sm" colSpan={4}>Total ({filtered.length} karyawan)</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-amber-700">{fmtCurrency(totals.kes_e)}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(totals.kes_c)}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">{fmtCurrency(totals.kes_e + totals.kes_c)}</td>
                  <td></td>
                </tr></tfoot></table>
              </div>
              )}
            </div>
          )}

          {activeTab === 'ketenagakerjaan' && (
            <div className="space-y-3">
              <OpsToolbar>
                <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="hf-input w-full pl-9" /></div>
              </OpsToolbar>
              {items.length === 0 ? (
                <HrisEmptyState
                  source={dataSource}
                  title="Belum ada data BPJS Ketenagakerjaan"
                  description="Data iuran JHT, JP, JKK, dan JKM akan muncul setelah konfigurasi gaji karyawan selesai."
                />
              ) : (
              <div className="hf-table-wrap overflow-x-auto">
                <table><thead><tr>
                  <th>Karyawan</th>
                  <th>No. BPJS TK</th>
                  <th className="text-right">JHT (2%)</th>
                  <th className="text-right">JHT (3.7%)</th>
                  <th className="text-right">JP (1%)</th>
                  <th className="text-right">JP (2%)</th>
                  <th className="text-right">JKK</th>
                  <th className="text-right">JKM</th>
                  <th className="text-right">Total</th>
                </tr></thead>
                <tbody>{filtered.map(i => (
                  <tr key={i.id}>
                    <td><p className="font-medium text-[color:var(--hf-ink)]">{i.employee_name}</p><p className="text-xs text-[color:var(--hf-ink-muted)]">{i.position}</p></td>
                    <td className="font-mono text-xs">{i.bpjs_tk_no || '-'}</td>
                    <td className="text-right text-xs tabular-nums text-amber-700">{fmtCurrency(i.jht_employee)}</td>
                    <td className="text-right text-xs tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(i.jht_company)}</td>
                    <td className="text-right text-xs tabular-nums text-amber-700">{fmtCurrency(i.jp_employee)}</td>
                    <td className="text-right text-xs tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(i.jp_company)}</td>
                    <td className="text-right text-xs tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(i.jkk)}</td>
                    <td className="text-right text-xs tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(i.jkm)}</td>
                    <td className="text-right text-xs font-semibold tabular-nums">{fmtCurrency(i.total_employee + i.total_company)}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-[var(--hf-surface-muted)] font-semibold text-xs"><tr>
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{fmtCurrency(totals.jht_e)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(totals.jht_c)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{fmtCurrency(totals.jp_e)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(totals.jp_c)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(totals.jkk)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(totals.jkm)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtCurrency(totals.total_e + totals.total_c)}</td>
                </tr></tfoot></table>
              </div>
              )}
            </div>
          )}

          {activeTab === 'tarif' && (
            <div className="max-w-3xl space-y-4">
              <div className="hf-card overflow-hidden">
                <div className="border-b border-[var(--hf-border)] bg-emerald-50 px-4 py-3"><h4 className="flex items-center gap-2 font-semibold text-emerald-800"><Heart className="h-4 w-4" /> BPJS Kesehatan</h4></div>
                <div className="space-y-2 p-4 text-sm">
                  <div className="flex justify-between"><span>Iuran karyawan</span><span className="font-semibold">1% dari upah (maks {fmtCurrency(12000000)})</span></div>
                  <div className="flex justify-between"><span>Iuran perusahaan</span><span className="font-semibold">4% dari upah (maks {fmtCurrency(12000000)})</span></div>
                  <div className="flex justify-between border-t border-[var(--hf-border)] pt-2 text-[color:var(--hf-ink-muted)]"><span>Batas upah tertinggi</span><span>{fmtCurrency(12000000)}</span></div>
                  <div className="flex justify-between text-[color:var(--hf-ink-muted)]"><span>Tanggungan</span><span>Pekerja + 4 anggota keluarga</span></div>
                </div>
              </div>
              <div className="hf-card overflow-hidden">
                <div className="border-b border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3"><h4 className="flex items-center gap-2 font-semibold text-[color:var(--hf-brand-600)]"><Shield className="h-4 w-4" /> BPJS Ketenagakerjaan</h4></div>
                <div className="hf-table-wrap !rounded-none !border-0 !shadow-none">
                <table><thead><tr><th>Program</th><th className="text-right">Karyawan</th><th className="text-right">Perusahaan</th><th>Keterangan</th></tr></thead>
                <tbody>
                  <tr><td className="font-medium">JHT</td><td className="text-right">2%</td><td className="text-right">3.7%</td><td className="text-xs text-[color:var(--hf-ink-muted)]">Dicairkan saat pensiun/PHK</td></tr>
                  <tr><td className="font-medium">JP</td><td className="text-right">1%</td><td className="text-right">2%</td><td className="text-xs text-[color:var(--hf-ink-muted)]">Maks upah {fmtCurrency(10042300)}</td></tr>
                  <tr><td className="font-medium">JKK</td><td className="text-right">-</td><td className="text-right">0.24%</td><td className="text-xs text-[color:var(--hf-ink-muted)]">Risiko rendah</td></tr>
                  <tr><td className="font-medium">JKM</td><td className="text-right">-</td><td className="text-right">0.3%</td><td className="text-xs text-[color:var(--hf-ink-muted)]">Santunan kematian</td></tr>
                </tbody></table>
                </div>
              </div>
            </div>
          )}
      </PayrollShell>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="hf-card w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center"><h3 className="font-semibold">Detail BPJS - {selectedItem.employee_name}</h3><button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500">Jabatan</p><p className="font-medium">{selectedItem.position}</p></div>
                <div><p className="text-xs text-gray-500">Departemen</p><p className="font-medium">{selectedItem.department}</p></div>
                <div><p className="text-xs text-gray-500">No. BPJS Kes</p><p className="font-mono text-xs">{selectedItem.bpjs_kes_no}</p></div>
                <div><p className="text-xs text-gray-500">No. BPJS TK</p><p className="font-mono text-xs">{selectedItem.bpjs_tk_no}</p></div>
                <div><p className="text-xs text-gray-500">Gaji Pokok</p><p className="font-bold">{fmtCurrency(selectedItem.base_salary)}</p></div>
                <div><p className="text-xs text-gray-500">Tanggungan</p><p className="font-medium">{selectedItem.dependents} orang</p></div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Program</th><th className="px-3 py-2 text-right">Karyawan</th><th className="px-3 py-2 text-right">Perusahaan</th></tr></thead>
                <tbody className="divide-y">
                  <tr><td className="px-3 py-2">BPJS Kesehatan</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.kes_employee)}</td><td className="px-3 py-2 text-right text-[color:var(--hf-brand-600)]">{fmtCurrency(selectedItem.kes_company)}</td></tr>
                  <tr><td className="px-3 py-2">JHT</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.jht_employee)}</td><td className="px-3 py-2 text-right text-[color:var(--hf-brand-600)]">{fmtCurrency(selectedItem.jht_company)}</td></tr>
                  <tr><td className="px-3 py-2">JP</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.jp_employee)}</td><td className="px-3 py-2 text-right text-[color:var(--hf-brand-600)]">{fmtCurrency(selectedItem.jp_company)}</td></tr>
                  <tr><td className="px-3 py-2">JKK</td><td className="px-3 py-2 text-right">-</td><td className="px-3 py-2 text-right text-[color:var(--hf-brand-600)]">{fmtCurrency(selectedItem.jkk)}</td></tr>
                  <tr><td className="px-3 py-2">JKM</td><td className="px-3 py-2 text-right">-</td><td className="px-3 py-2 text-right text-[color:var(--hf-brand-600)]">{fmtCurrency(selectedItem.jkm)}</td></tr>
                  <tr className="font-bold bg-gray-50"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.total_employee)}</td><td className="px-3 py-2 text-right text-[color:var(--hf-brand-600)]">{fmtCurrency(selectedItem.total_company)}</td></tr>
                </tbody></table>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Grand Total BPJS / Bulan</p><p className="text-xl font-bold text-emerald-600">{fmtCurrency(selectedItem.total_employee + selectedItem.total_company)}</p></div>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
