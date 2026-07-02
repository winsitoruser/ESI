import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  FileText, Users, DollarSign, Calculator, CheckCircle, AlertCircle,
  Search, ArrowLeft, TrendingUp, Percent, Settings, Download, Eye, X
} from 'lucide-react';
import Link from 'next/link';

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
        const res = await fetch('/api/hq/hris/payroll?action=pph21');
        const json = await res.json().catch(() => null);
        if (res.ok && Array.isArray(json?.data) && json.data.length > 0) {
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
        } else {
          setItems(MOCK_TAX);
        }
      } catch {
        setItems(MOCK_TAX);
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hq/hris/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1"><h2 className="text-lg font-bold">PPh 21 - Pajak Penghasilan</h2><p className="text-sm text-gray-500">Perhitungan pajak penghasilan karyawan (TER 2024)</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Wajib Pajak', value: items.length, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Total PPh 21/Tahun', value: totalAnnualTax, icon: DollarSign, bg: 'bg-amber-100', color: 'text-amber-600', fmt: true },
            { label: 'YTD Disetor', value: totalYTD, icon: CheckCircle, bg: 'bg-green-100', color: 'text-green-600', fmt: true },
            { label: 'Sisa Kewajiban', value: totalAnnualTax - totalYTD, icon: AlertCircle, bg: 'bg-red-100', color: 'text-red-600', fmt: true },
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
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'summary', label: 'Rekap PPh 21', icon: FileText },
              { key: 'simulator', label: 'Simulator Pajak', icon: Calculator },
              { key: 'ptkp', label: 'Tabel PTKP', icon: Users },
              { key: 'brackets', label: 'Tarif Progresif', icon: Percent },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          {activeTab === 'summary' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 border-b">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PTKP</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bruto/Thn</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PKP</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PPh 21/Thn</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PPh 21/Bln</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">YTD Setor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Metode</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {filtered.map(i => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><p className="font-medium text-sm">{i.employee_name}</p><p className="text-xs text-gray-500">{i.position} · {i.department}</p></td>
                        <td className="px-4 py-3 text-center text-xs font-medium">{i.tax_status}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmtCurrency(i.gross_annual)}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmtCurrency(i.pkp)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-amber-600">{fmtCurrency(i.annual_tax)}</td>
                        <td className="px-4 py-3 text-right text-sm">{fmtCurrency(i.monthly_tax)}</td>
                        <td className="px-4 py-3 text-right text-sm text-green-600">{fmtCurrency(i.ytd_paid)}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${i.tax_method === 'gross_up' ? 'bg-blue-100 text-blue-700' : i.tax_method === 'nett' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{i.tax_method === 'gross_up' ? 'Gross Up' : i.tax_method === 'nett' ? 'Nett' : 'Gross'}</span></td>
                        <td className="px-4 py-3 text-center"><button onClick={() => setSelectedItem(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold"><tr>
                    <td className="px-4 py-3 text-sm" colSpan={4}>Total ({filtered.length} karyawan)</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-600">{fmtCurrency(totalAnnualTax)}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmtCurrency(Math.round(totalAnnualTax / 12))}</td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">{fmtCurrency(totalYTD)}</td>
                    <td colSpan={2}></td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="p-6 max-w-3xl">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-600" /> Simulator Perhitungan PPh 21</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Gaji Kotor per Bulan</label><input type="number" value={simGross} onChange={e => setSimGross(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="10000000" /></div>
                  <div><label className="block text-sm font-medium mb-1">Status PTKP</label><select value={simStatus} onChange={e => setSimStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">{Object.entries(PTKP_TABLE).map(([k, v]) => <option key={k} value={k}>{k} - {v.label}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Metode Pajak</label><select value={simMethod} onChange={e => setSimMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="gross">Gross (Potong Gaji)</option><option value="gross_up">Gross Up (Ditanggung Perusahaan)</option><option value="nett">Nett</option></select></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  <h4 className="font-semibold text-sm">Hasil Perhitungan</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Gaji Bruto/Tahun</span><span className="font-medium">{fmtCurrency(simAnnualGross)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Biaya Jabatan (5%)</span><span className="font-medium text-red-600">-{fmtCurrency(Math.min(simDeductible, 6000000))}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">PTKP ({simStatus})</span><span className="font-medium text-red-600">-{fmtCurrency(simPTKP)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="text-gray-600 font-semibold">PKP</span><span className="font-bold">{fmtCurrency(simPKP)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="text-gray-600">PPh 21 / Tahun</span><span className="font-bold text-amber-600">{fmtCurrency(simAnnualTax)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">PPh 21 / Bulan</span><span className="font-bold text-amber-600">{fmtCurrency(simMonthlyTax)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="text-gray-600 font-semibold">Take Home Pay / Bulan</span><span className="font-bold text-green-600">{fmtCurrency(simMonthlyGross - simMonthlyTax)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ptkp' && (
            <div className="p-6 max-w-2xl">
              <h3 className="font-semibold text-lg mb-4">Tabel PTKP (Penghasilan Tidak Kena Pajak)</h3>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PTKP / Tahun</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PTKP / Bulan</th></tr></thead>
                  <tbody className="divide-y">{Object.entries(PTKP_TABLE).map(([k, v]) => (<tr key={k} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono font-bold text-sm">{k}</td><td className="px-4 py-3 text-sm text-gray-600">{v.label}</td><td className="px-4 py-3 text-right text-sm font-medium">{fmtCurrency(v.amount)}</td><td className="px-4 py-3 text-right text-sm text-gray-500">{fmtCurrency(Math.round(v.amount / 12))}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'brackets' && (
            <div className="p-6 max-w-2xl">
              <h3 className="font-semibold text-lg mb-4">Tarif Pajak Progresif PPh 21</h3>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Layer</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PKP</th><th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tarif</th></tr></thead>
                  <tbody className="divide-y">{TAX_BRACKETS.map((b, i) => (<tr key={i} className="hover:bg-gray-50"><td className="px-4 py-3 text-center font-bold text-sm">{i + 1}</td><td className="px-4 py-3 text-sm">{fmtCurrency(b.min)} - {b.max === Infinity ? '∞' : fmtCurrency(b.max)}</td><td className="px-4 py-3 text-center"><span className={`px-3 py-1 rounded-full text-sm font-bold ${i === 0 ? 'bg-green-100 text-green-700' : i === 1 ? 'bg-blue-100 text-blue-700' : i === 2 ? 'bg-yellow-100 text-yellow-700' : i === 3 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{b.rate}%</span></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
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
