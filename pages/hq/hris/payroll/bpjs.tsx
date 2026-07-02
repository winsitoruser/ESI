import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  Shield, Users, DollarSign, CheckCircle, AlertCircle, Search, ArrowLeft,
  TrendingUp, Eye, X, Heart, Building2, FileText, Settings
} from 'lucide-react';
import Link from 'next/link';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'kesehatan' | 'ketenagakerjaan' | 'tarif'>('kesehatan');
  const [selectedItem, setSelectedItem] = useState<BPJSItem | null>(null);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/hq/hris/payroll?action=bpjs');
        const json = await res.json().catch(() => null);
        if (res.ok && Array.isArray(json?.data) && json.data.length > 0) {
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
        } else {
          setItems(MOCK_BPJS);
        }
      } catch {
        setItems(MOCK_BPJS);
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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hq/hris/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1"><h2 className="text-lg font-bold">BPJS Kesehatan & Ketenagakerjaan</h2><p className="text-sm text-gray-500">Iuran BPJS karyawan dan perusahaan</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Peserta Aktif', value: items.filter(i => i.status === 'active').length, icon: Users, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Iuran Karyawan/Bln', value: totals.total_e, icon: DollarSign, bg: 'bg-amber-100', color: 'text-amber-600', fmt: true },
            { label: 'Iuran Perusahaan/Bln', value: totals.total_c, icon: Building2, bg: 'bg-green-100', color: 'text-green-600', fmt: true },
            { label: 'Total Iuran/Bln', value: totals.total_e + totals.total_c, icon: Shield, bg: 'bg-purple-100', color: 'text-purple-600', fmt: true },
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
              { key: 'kesehatan', label: 'BPJS Kesehatan', icon: Heart },
              { key: 'ketenagakerjaan', label: 'BPJS Ketenagakerjaan', icon: Shield },
              { key: 'tarif', label: 'Tarif & Ketentuan', icon: Settings },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          {activeTab === 'kesehatan' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 border-b">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. BPJS Kes</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tanggungan</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gaji Pokok</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Karyawan (1%)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Perusahaan (4%)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr></thead>
                <tbody className="divide-y">{filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-medium text-sm">{i.employee_name}</p><p className="text-xs text-gray-500">{i.position}</p></td>
                    <td className="px-4 py-3 text-xs font-mono">{i.bpjs_kes_no || '-'}</td>
                    <td className="px-4 py-3 text-center text-sm">{i.dependents}</td>
                    <td className="px-4 py-3 text-right text-sm">{fmtCurrency(Math.min(i.base_salary, 12000000))}</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-600">{fmtCurrency(i.kes_employee)}</td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">{fmtCurrency(i.kes_company)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">{fmtCurrency(i.kes_employee + i.kes_company)}</td>
                    <td className="px-4 py-3 text-center"><button onClick={() => setSelectedItem(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button></td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-gray-50 font-bold"><tr>
                  <td className="px-4 py-3 text-sm" colSpan={4}>Total ({filtered.length} karyawan)</td>
                  <td className="px-4 py-3 text-right text-sm text-amber-600">{fmtCurrency(totals.kes_e)}</td>
                  <td className="px-4 py-3 text-right text-sm text-blue-600">{fmtCurrency(totals.kes_c)}</td>
                  <td className="px-4 py-3 text-right text-sm">{fmtCurrency(totals.kes_e + totals.kes_c)}</td>
                  <td></td>
                </tr></tfoot></table>
              </div>
            </div>
          )}

          {activeTab === 'ketenagakerjaan' && (
            <div>
              <div className="p-4 flex flex-wrap gap-3 border-b">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full"><thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. BPJS TK</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">JHT (2%)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">JHT (3.7%)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">JP (1%)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">JP (2%)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">JKK</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">JKM</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr></thead>
                <tbody className="divide-y">{filtered.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-medium text-sm">{i.employee_name}</p><p className="text-xs text-gray-500">{i.position}</p></td>
                    <td className="px-4 py-3 text-xs font-mono">{i.bpjs_tk_no || '-'}</td>
                    <td className="px-4 py-3 text-right text-xs text-amber-600">{fmtCurrency(i.jht_employee)}</td>
                    <td className="px-4 py-3 text-right text-xs text-blue-600">{fmtCurrency(i.jht_company)}</td>
                    <td className="px-4 py-3 text-right text-xs text-amber-600">{fmtCurrency(i.jp_employee)}</td>
                    <td className="px-4 py-3 text-right text-xs text-blue-600">{fmtCurrency(i.jp_company)}</td>
                    <td className="px-4 py-3 text-right text-xs text-blue-600">{fmtCurrency(i.jkk)}</td>
                    <td className="px-4 py-3 text-right text-xs text-blue-600">{fmtCurrency(i.jkm)}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold">{fmtCurrency(i.total_employee + i.total_company)}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-gray-50 font-bold text-xs"><tr>
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmtCurrency(totals.jht_e)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmtCurrency(totals.jht_c)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{fmtCurrency(totals.jp_e)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmtCurrency(totals.jp_c)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmtCurrency(totals.jkk)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmtCurrency(totals.jkm)}</td>
                  <td className="px-4 py-3 text-right">{fmtCurrency(totals.total_e + totals.total_c)}</td>
                </tr></tfoot></table>
              </div>
            </div>
          )}

          {activeTab === 'tarif' && (
            <div className="p-6 max-w-3xl space-y-6">
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-green-50 border-b"><h4 className="font-semibold text-green-800 flex items-center gap-2"><Heart className="w-4 h-4" /> BPJS Kesehatan</h4></div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Iuran Karyawan</span><span className="font-bold">1% dari upah (maks {fmtCurrency(12000000)})</span></div>
                  <div className="flex justify-between"><span>Iuran Perusahaan</span><span className="font-bold">4% dari upah (maks {fmtCurrency(12000000)})</span></div>
                  <div className="flex justify-between border-t pt-2 text-gray-500"><span>Batas upah tertinggi</span><span>{fmtCurrency(12000000)}</span></div>
                  <div className="flex justify-between text-gray-500"><span>Tanggungan</span><span>Pekerja + 4 anggota keluarga</span></div>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b"><h4 className="font-semibold text-blue-800 flex items-center gap-2"><Shield className="w-4 h-4" /> BPJS Ketenagakerjaan</h4></div>
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Program</th><th className="px-4 py-2 text-right">Karyawan</th><th className="px-4 py-2 text-right">Perusahaan</th><th className="px-4 py-2 text-left">Keterangan</th></tr></thead>
                <tbody className="divide-y">
                  <tr><td className="px-4 py-2 font-medium">JHT</td><td className="px-4 py-2 text-right">2%</td><td className="px-4 py-2 text-right">3.7%</td><td className="px-4 py-2 text-xs text-gray-500">Dicairkan saat pensiun/PHK</td></tr>
                  <tr><td className="px-4 py-2 font-medium">JP</td><td className="px-4 py-2 text-right">1%</td><td className="px-4 py-2 text-right">2%</td><td className="px-4 py-2 text-xs text-gray-500">Maks upah {fmtCurrency(10042300)}</td></tr>
                  <tr><td className="px-4 py-2 font-medium">JKK</td><td className="px-4 py-2 text-right">-</td><td className="px-4 py-2 text-right">0.24%</td><td className="px-4 py-2 text-xs text-gray-500">Risiko rendah</td></tr>
                  <tr><td className="px-4 py-2 font-medium">JKM</td><td className="px-4 py-2 text-right">-</td><td className="px-4 py-2 text-right">0.3%</td><td className="px-4 py-2 text-xs text-gray-500">Santunan kematian</td></tr>
                </tbody></table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
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
                  <tr><td className="px-3 py-2">BPJS Kesehatan</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.kes_employee)}</td><td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(selectedItem.kes_company)}</td></tr>
                  <tr><td className="px-3 py-2">JHT</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.jht_employee)}</td><td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(selectedItem.jht_company)}</td></tr>
                  <tr><td className="px-3 py-2">JP</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.jp_employee)}</td><td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(selectedItem.jp_company)}</td></tr>
                  <tr><td className="px-3 py-2">JKK</td><td className="px-3 py-2 text-right">-</td><td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(selectedItem.jkk)}</td></tr>
                  <tr><td className="px-3 py-2">JKM</td><td className="px-3 py-2 text-right">-</td><td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(selectedItem.jkm)}</td></tr>
                  <tr className="font-bold bg-gray-50"><td className="px-3 py-2">Total</td><td className="px-3 py-2 text-right text-amber-600">{fmtCurrency(selectedItem.total_employee)}</td><td className="px-3 py-2 text-right text-blue-600">{fmtCurrency(selectedItem.total_company)}</td></tr>
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
