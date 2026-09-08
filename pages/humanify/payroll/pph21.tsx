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
  FileText, Users, DollarSign, Calculator, CheckCircle, AlertCircle,
  Search, Percent, Download, Eye, X
} from 'lucide-react';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

const PTKP_TABLE: Record<string, { label: string; amount: number }> = {
  'TK/0': { label: 'Tidak Kawin, 0 Tanggungan', amount: 54000000 },
  'TK/1': { label: 'Tidak Kawin, 1 Tanggungan', amount: 58500000 },
  'TK/2': { label: 'Tidak Kawin, 2 Tanggungan', amount: 63000000 },
  'TK/3': { label: 'Tidak Kawin, 3 Tanggungan', amount: 67500000 },
  'K/0': { label: 'Kawin, 0 Tanggungan', amount: 58500000 },
  'K/1': { label: 'Kawin, 1 Tanggungan', amount: 63000000 },
  'K/2': { label: 'Kawin, 2 Tanggungan', amount: 67500000 },
  'K/3': { label: 'Kawin, 3 Tanggungan', amount: 72000000 },
};

const TAX_BRACKETS = [
  { min: 0, max: 60000000, rate: 5 },
  { min: 60000000, max: 250000000, rate: 15 },
  { min: 250000000, max: 500000000, rate: 25 },
  { min: 500000000, max: 5000000000, rate: 30 },
  { min: 5000000000, max: Infinity, rate: 35 },
];

function calcPPh21(pkp: number): number {
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (pkp <= 0) break;
    const taxable = Math.min(pkp, b.max - b.min);
    tax += taxable * b.rate / 100;
    pkp -= taxable;
  }
  return Math.round(tax);
}

interface TaxItem {
  id: string; employee_name: string; position: string; department: string;
  tax_status: string; gross_annual: number; deductible: number; ptkp: number;
  pkp: number; annual_tax: number; monthly_tax: number; ytd_paid: number; remaining: number;
  tax_method: string;
}


const MOCK_TAX: TaxItem[] = [
  { id: '1', employee_name: 'Ahmad Wijaya', position: 'General Manager', department: 'MANAGEMENT', tax_status: 'K/1', gross_annual: 327000000, deductible: 16350000, ptkp: 63000000, pkp: 247650000, annual_tax: 31147500, monthly_tax: 2595625, ytd_paid: 7786875, remaining: 23360625, tax_method: 'gross_up' },
  { id: '2', employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'OPERATIONS', tax_status: 'TK/0', gross_annual: 237000000, deductible: 11850000, ptkp: 54000000, pkp: 171150000, annual_tax: 19672500, monthly_tax: 1639375, ytd_paid: 4918125, remaining: 14754375, tax_method: 'gross_up' },
  { id: '3', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'OPERATIONS', tax_status: 'K/2', gross_annual: 237000000, deductible: 11850000, ptkp: 67500000, pkp: 157650000, annual_tax: 17647500, monthly_tax: 1470625, ytd_paid: 4411875, remaining: 13235625, tax_method: 'gross_up' },
  { id: '5', employee_name: 'Eko Prasetyo', position: 'Warehouse Supervisor', department: 'WAREHOUSE', tax_status: 'K/1', gross_annual: 159000000, deductible: 7950000, ptkp: 63000000, pkp: 88050000, annual_tax: 7207500, monthly_tax: 600625, ytd_paid: 1801875, remaining: 5405625, tax_method: 'gross' },
  { id: '6', employee_name: 'Lisa Permata', position: 'Finance Manager', department: 'FINANCE', tax_status: 'TK/0', gross_annual: 261000000, deductible: 13050000, ptkp: 54000000, pkp: 193950000, annual_tax: 23092500, monthly_tax: 1924375, ytd_paid: 5773125, remaining: 17319375, tax_method: 'gross_up' },
];

export default function PPh21Page() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<TaxItem[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'ptkp' | 'brackets' | 'simulator'>('summary');
  const [simGross, setSimGross] = useState('10000000');
  const [simStatus, setSimStatus] = useState('TK/0');
  const [simMethod, setSimMethod] = useState('gross');
  const [selectedItem, setSelectedItem] = useState<TaxItem | null>(null);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/humanify/payroll?action=pph21');
        const json = await res.json().catch(() => null);
        if (res.ok && Array.isArray(json?.data)) {
          const mapped: TaxItem[] = json.data.map((r: any) => ({
            id: String(r.id),
            employee_name: r.employee_name,
            position: r.position || '-',
            department: r.department || '-',
            tax_status: r.tax_status || 'TK/0',
            gross_annual: Number(r.gross_income || 0),
            deductible: Number(r.biaya_jabatan || 0),
            ptkp: Number(r.ptkp || 0),
            pkp: Number(r.pkp || 0),
            annual_tax: Number(r.pph21_annual || 0),
            monthly_tax: Number(r.pph21_monthly || 0),
            ytd_paid: 0,
            remaining: Number(r.pph21_annual || 0),
            tax_method: 'gross',
          }));
          setItems(mapped);
          setDataSource(mapped.length ? 'live' : 'empty');
        } else {
          setItems(USE_MOCK_UI ? MOCK_TAX : []);
          if (USE_MOCK_UI) setDataSource('demo');
        }
      } catch {
        setItems(USE_MOCK_UI ? MOCK_TAX : []);
        if (USE_MOCK_UI) setDataSource('demo');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.employee_name.toLowerCase().includes(q) || i.department.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const totalAnnualTax = filtered.reduce((s, i) => s + i.annual_tax, 0);
  const totalYTD = filtered.reduce((s, i) => s + i.ytd_paid, 0);

  // Simulator calculation
  const simMonthlyGross = parseFloat(simGross) || 0;
  const simAnnualGross = simMonthlyGross * 12;
  const simDeductible = simAnnualGross * 0.05; // biaya jabatan 5% max 6jt
  const simPTKP = PTKP_TABLE[simStatus]?.amount || 54000000;
  const simPKP = Math.max(0, simAnnualGross - Math.min(simDeductible, 6000000) - simPTKP);
  const simAnnualTax = calcPPh21(simPKP);
  const simMonthlyTax = Math.round(simAnnualTax / 12);

  if (!mounted) return null;

  return (
    <HQLayout title="PPh 21 - Pajak Penghasilan" subtitle="Perhitungan dan pelaporan PPh 21 karyawan">
      <PayrollShell
        current="pph21"
        title="PPh 21"
        subtitle="Rekap pajak penghasilan karyawan, simulator, dan ekspor e-Bupot."
        icon={Percent}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge source={dataSource} />
            <a href="/api/humanify/compliance-export?action=pph21&format=csv" download className="hf-btn-secondary inline-flex items-center gap-2"><Download className="h-4 w-4" /> CSV</a>
            <a href="/api/humanify/compliance-export?action=pph21&format=xml" download className="hf-btn-primary inline-flex items-center gap-2"><FileText className="h-4 w-4" /> e-Bupot XML</a>
          </div>
        )}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <OpsKpiShell><HRStatCard icon={Users} label="Wajib pajak" value={items.length} accent="violet" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={DollarSign} label="PPh 21 / tahun" value={fmtCurrency(totalAnnualTax)} accent="amber" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={CheckCircle} label="YTD disetor" value={fmtCurrency(totalYTD)} accent="emerald" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={AlertCircle} label="Sisa kewajiban" value={fmtCurrency(totalAnnualTax - totalYTD)} accent="rose" /></OpsKpiShell>
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'summary', label: 'Rekap PPh 21', icon: FileText, count: filtered.length || undefined },
            { key: 'simulator', label: 'Simulator', icon: Calculator },
            { key: 'ptkp', label: 'Tabel PTKP', icon: Users },
            { key: 'brackets', label: 'Tarif progresif', icon: Percent },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

          {activeTab === 'summary' && (
            <div className="space-y-3">
              <OpsToolbar>
                <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="hf-input w-full pl-9" /></div>
              </OpsToolbar>
              {!loading && items.length === 0 ? (
                <HrisEmptyState
                  source={dataSource}
                  title="Belum ada data PPh 21"
                  description="Rekap pajak penghasilan akan muncul setelah konfigurasi gaji dan status PTKP karyawan selesai."
                />
              ) : (
              <div className="hf-table-wrap overflow-x-auto">
                <table>
                  <thead><tr>
                    <th>Karyawan</th>
                    <th className="text-center">PTKP</th>
                    <th className="text-right">Bruto/thn</th>
                    <th className="text-right">PKP</th>
                    <th className="text-right">PPh 21/thn</th>
                    <th className="text-right">PPh 21/bln</th>
                    <th className="text-right">YTD setor</th>
                    <th className="text-center">Metode</th>
                    <th className="text-center">Aksi</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(i => (
                      <tr key={i.id}>
                        <td><p className="font-medium text-[color:var(--hf-ink)]">{i.employee_name}</p><p className="text-xs text-[color:var(--hf-ink-muted)]">{i.position} · {i.department}</p></td>
                        <td className="text-center text-xs font-medium">{i.tax_status}</td>
                        <td className="text-right tabular-nums">{fmtCurrency(i.gross_annual)}</td>
                        <td className="text-right tabular-nums">{fmtCurrency(i.pkp)}</td>
                        <td className="text-right font-semibold tabular-nums text-amber-700">{fmtCurrency(i.annual_tax)}</td>
                        <td className="text-right tabular-nums">{fmtCurrency(i.monthly_tax)}</td>
                        <td className="text-right tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(i.ytd_paid)}</td>
                        <td className="text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${i.tax_method === 'gross_up' ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' : i.tax_method === 'nett' ? 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink)]' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>{i.tax_method === 'gross_up' ? 'Gross Up' : i.tax_method === 'nett' ? 'Nett' : 'Gross'}</span></td>
                        <td className="text-center"><button type="button" onClick={() => setSelectedItem(i)} className="hf-btn-secondary inline-flex items-center gap-1 !px-2.5 !py-1 text-xs"><Eye className="h-3.5 w-3.5" /> Detail</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[var(--hf-surface-muted)] font-semibold"><tr>
                    <td className="px-4 py-3 text-sm" colSpan={4}>Total ({filtered.length} karyawan)</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-amber-700">{fmtCurrency(totalAnnualTax)}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">{fmtCurrency(Math.round(totalAnnualTax / 12))}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(totalYTD)}</td>
                    <td colSpan={2}></td>
                  </tr></tfoot>
                </table>
              </div>
              )}
            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="hf-card max-w-3xl p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[color:var(--hf-ink)]"><Calculator className="h-5 w-5 text-[color:var(--hf-brand-600)]" /> Simulator perhitungan PPh 21</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div><label className="mb-1 block text-sm font-medium">Gaji kotor per bulan</label><input type="number" value={simGross} onChange={e => setSimGross(e.target.value)} className="hf-input w-full" placeholder="10000000" /></div>
                  <div><label className="mb-1 block text-sm font-medium">Status PTKP</label><select value={simStatus} onChange={e => setSimStatus(e.target.value)} className="hf-input w-full">{Object.entries(PTKP_TABLE).map(([k, v]) => <option key={k} value={k}>{k} - {v.label}</option>)}</select></div>
                  <div><label className="mb-1 block text-sm font-medium">Metode pajak</label><select value={simMethod} onChange={e => setSimMethod(e.target.value)} className="hf-input w-full"><option value="gross">Gross (potong gaji)</option><option value="gross_up">Gross up (ditanggung perusahaan)</option><option value="nett">Nett</option></select></div>
                </div>
                <div className="hf-tile-nested space-y-3 p-5">
                  <h4 className="text-sm font-semibold">Hasil perhitungan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[color:var(--hf-ink-muted)]">Gaji bruto/tahun</span><span className="font-medium tabular-nums">{fmtCurrency(simAnnualGross)}</span></div>
                    <div className="flex justify-between"><span className="text-[color:var(--hf-ink-muted)]">Biaya jabatan (5%)</span><span className="font-medium tabular-nums text-[color:var(--hf-danger)]">-{fmtCurrency(Math.min(simDeductible, 6000000))}</span></div>
                    <div className="flex justify-between"><span className="text-[color:var(--hf-ink-muted)]">PTKP ({simStatus})</span><span className="font-medium tabular-nums text-[color:var(--hf-danger)]">-{fmtCurrency(simPTKP)}</span></div>
                    <div className="flex justify-between border-t border-[var(--hf-border)] pt-2"><span className="font-semibold">PKP</span><span className="font-bold tabular-nums">{fmtCurrency(simPKP)}</span></div>
                    <div className="flex justify-between border-t border-[var(--hf-border)] pt-2"><span>PPh 21 / tahun</span><span className="font-bold tabular-nums text-amber-700">{fmtCurrency(simAnnualTax)}</span></div>
                    <div className="flex justify-between"><span>PPh 21 / bulan</span><span className="font-bold tabular-nums text-amber-700">{fmtCurrency(simMonthlyTax)}</span></div>
                    <div className="flex justify-between border-t border-[var(--hf-border)] pt-2"><span className="font-semibold">Take home pay / bulan</span><span className="font-bold tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(simMonthlyGross - simMonthlyTax)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ptkp' && (
            <div className="max-w-2xl space-y-3">
              <h3 className="text-lg font-semibold text-[color:var(--hf-ink)]">Tabel PTKP</h3>
              <div className="hf-table-wrap">
                <table><thead><tr><th>Status</th><th>Keterangan</th><th className="text-right">PTKP / tahun</th><th className="text-right">PTKP / bulan</th></tr></thead>
                  <tbody>{Object.entries(PTKP_TABLE).map(([k, v]) => (<tr key={k}><td className="font-mono font-semibold">{k}</td><td className="text-[color:var(--hf-ink-muted)]">{v.label}</td><td className="text-right tabular-nums font-medium">{fmtCurrency(v.amount)}</td><td className="text-right tabular-nums text-[color:var(--hf-ink-muted)]">{fmtCurrency(Math.round(v.amount / 12))}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'brackets' && (
            <div className="max-w-2xl space-y-3">
              <h3 className="text-lg font-semibold text-[color:var(--hf-ink)]">Tarif pajak progresif PPh 21</h3>
              <div className="hf-table-wrap">
                <table><thead><tr><th className="text-center">Layer</th><th>PKP</th><th className="text-center">Tarif</th></tr></thead>
                  <tbody>{TAX_BRACKETS.map((b, i) => (<tr key={i}><td className="text-center font-semibold">{i + 1}</td><td>{fmtCurrency(b.min)} – {b.max === Infinity ? '∞' : fmtCurrency(b.max)}</td><td className="text-center"><span className="rounded-full bg-[var(--hf-brand-50)] px-3 py-1 text-sm font-semibold text-[color:var(--hf-brand-600)]">{b.rate}%</span></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
      </PayrollShell>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="hf-card w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center"><h3 className="font-semibold">Detail PPh 21 - {selectedItem.employee_name}</h3><button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500">Jabatan</p><p className="font-medium">{selectedItem.position}</p></div>
                <div><p className="text-xs text-gray-500">Departemen</p><p className="font-medium">{selectedItem.department}</p></div>
                <div><p className="text-xs text-gray-500">Status PTKP</p><p className="font-bold">{selectedItem.tax_status}</p></div>
                <div><p className="text-xs text-gray-500">Metode</p><p className="font-medium capitalize">{selectedItem.tax_method.replace('_', ' ')}</p></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Penghasilan Bruto/Tahun</span><span className="font-medium">{fmtCurrency(selectedItem.gross_annual)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Pengurang</span><span className="font-medium text-red-600">-{fmtCurrency(selectedItem.deductible)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">PTKP</span><span className="font-medium text-red-600">-{fmtCurrency(selectedItem.ptkp)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-semibold">PKP</span><span className="font-bold">{fmtCurrency(selectedItem.pkp)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-gray-600">PPh 21/Tahun</span><span className="font-bold text-amber-600">{fmtCurrency(selectedItem.annual_tax)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">PPh 21/Bulan</span><span className="font-bold text-amber-600">{fmtCurrency(selectedItem.monthly_tax)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-gray-600">Sudah Disetor (YTD)</span><span className="font-medium text-green-600">{fmtCurrency(selectedItem.ytd_paid)}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Sisa Kewajiban</span><span className="font-bold text-red-600">{fmtCurrency(selectedItem.remaining)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
