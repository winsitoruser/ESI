import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import dynamic from 'next/dynamic';
import {
  FileText, Users, DollarSign, TrendingUp, ArrowLeft, BarChart3, PieChart,
  Calendar, Download, Building2, Filter, Layers, CheckCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtShort = (n: number) => {
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(0)}jt`;
  return fmtCurrency(n);
};

interface MonthlyData {
  month: string; label: string; gross: number; deductions: number; tax: number;
  bpjs: number; net: number; employees: number;
}

interface DeptData {
  department: string; employees: number; gross: number; net: number; avg_salary: number;
}

const DEFAULT_MONTHLY: MonthlyData[] = [
  { month: '2026-01', label: 'Jan', gross: 1790000000, deductions: 358000000, tax: 179000000, bpjs: 89500000, net: 1432000000, employees: 145 },
  { month: '2026-02', label: 'Feb', gross: 1850000000, deductions: 370000000, tax: 185000000, bpjs: 92500000, net: 1480000000, employees: 148 },
  { month: '2026-03', label: 'Mar', gross: 1860000000, deductions: 372000000, tax: 186000000, bpjs: 93000000, net: 1488000000, employees: 148 },
];

const DEFAULT_DEPT: DeptData[] = [
  { department: 'MANAGEMENT', employees: 5, gross: 110000000, net: 92000000, avg_salary: 22000000 },
  { department: 'OPERATIONS', employees: 42, gross: 420000000, net: 350000000, avg_salary: 10000000 },
  { department: 'SALES', employees: 30, gross: 270000000, net: 225000000, avg_salary: 9000000 },
  { department: 'FINANCE', employees: 17, gross: 187000000, net: 156000000, avg_salary: 11000000 },
  { department: 'WAREHOUSE', employees: 28, gross: 196000000, net: 163000000, avg_salary: 7000000 },
  { department: 'KITCHEN', employees: 22, gross: 132000000, net: 110000000, avg_salary: 6000000 },
  { department: 'IT', employees: 8, gross: 96000000, net: 80000000, avg_salary: 12000000 },
  { department: 'HR', employees: 6, gross: 60000000, net: 50000000, avg_salary: 10000000 },
];

const DEFAULT_DISTRIBUTION = [
  { range: '< 5jt', count: 22, pct: 14.9 },
  { range: '5-10jt', count: 48, pct: 32.4 },
  { range: '10-15jt', count: 38, pct: 25.7 },
  { range: '15-20jt', count: 25, pct: 16.9 },
  { range: '> 20jt', count: 15, pct: 10.1 },
];

export default function LaporanPage() {
  const [mounted, setMounted] = useState(false);
  const [activeReport, setActiveReport] = useState<'monthly' | 'department' | 'distribution' | 'ytd'>('monthly');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [monthly, setMonthly] = useState<MonthlyData[]>(DEFAULT_MONTHLY);
  const [byDept, setByDept] = useState<DeptData[]>(DEFAULT_DEPT);
  const [distribution, setDistribution] = useState(DEFAULT_DISTRIBUTION);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/hq/hris/payroll?action=laporan');
        const json = await res.json().catch(() => null);
        if (res.ok && json) {
          if (Array.isArray(json.monthly) && json.monthly.length > 0) {
            setMonthly(json.monthly.map((m: any) => ({
              month: m.month, label: m.month.split('-')[1],
              gross: Number(m.gross || 0), net: Number(m.net || 0),
              tax: Number(m.tax || 0), bpjs: Number(m.bpjs || 0),
              deductions: Number(m.gross || 0) - Number(m.net || 0),
              employees: 0,
            })));
          }
          if (Array.isArray(json.byDepartment) && json.byDepartment.length > 0) {
            setByDept(json.byDepartment.map((d: any) => ({
              department: d.department || 'Lainnya',
              employees: Number(d.employees || 0),
              gross: Number(d.total_basic || 0),
              net: Math.round(Number(d.total_basic || 0) * 0.83),
              avg_salary: d.employees > 0 ? Math.round(Number(d.total_basic) / Number(d.employees)) : 0,
            })));
          }
          if (Array.isArray(json.distribution) && json.distribution.length > 0) {
            const total = json.distribution.reduce((s: number, d: any) => s + Number(d.c || 0), 0) || 1;
            setDistribution(json.distribution.map((d: any) => ({
              range: d.bucket, count: Number(d.c || 0),
              pct: Math.round((Number(d.c || 0) / total) * 1000) / 10,
            })));
          }
        }
      } catch {}
    })();
  }, []);

  const latestMonth = monthly[monthly.length - 1];
  const ytdGross = monthly.reduce((s, m) => s + m.gross, 0);
  const ytdNet = monthly.reduce((s, m) => s + m.net, 0);
  const ytdTax = monthly.reduce((s, m) => s + m.tax, 0);

  const totalDeptGross = byDept.reduce((s, d) => s + d.gross, 0);

  if (!mounted) return null;

  return (
    <HQLayout title="Laporan Penggajian" subtitle="Laporan komprehensif penggajian karyawan">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hq/hris/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1"><h2 className="text-lg font-bold">Laporan Penggajian</h2><p className="text-sm text-gray-500">Analisis dan rekap penggajian komprehensif</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'YTD Gaji Kotor', value: ytdGross, icon: TrendingUp, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'YTD Gaji Bersih', value: ytdNet, icon: DollarSign, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'YTD Pajak', value: ytdTax, icon: FileText, bg: 'bg-amber-100', color: 'text-amber-600' },
            { label: 'Karyawan Aktif', value: latestMonth?.employees || 0, icon: Users, bg: 'bg-purple-100', color: 'text-purple-600', noFmt: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3"><div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div><div><p className="text-xs text-gray-500">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{'noFmt' in s ? s.value : fmtShort(s.value as number)}</p></div></div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex border-b overflow-x-auto">
            {[
              { key: 'monthly', label: 'Tren Bulanan', icon: BarChart3 },
              { key: 'department', label: 'Per Departemen', icon: Building2 },
              { key: 'distribution', label: 'Distribusi Gaji', icon: PieChart },
              { key: 'ytd', label: 'Year to Date', icon: Calendar },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveReport(tab.key as any)} className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeReport === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          {activeReport === 'monthly' && (
            <div className="p-6 space-y-6">
              <div className="h-[350px]">
                <Chart type="bar" height={350} options={{ chart: { id: 'payroll-trend', toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } }, dataLabels: { enabled: false }, xaxis: { categories: monthly.map(m => m.label) }, yaxis: { labels: { formatter: (v: number) => fmtShort(v) } }, colors: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'], legend: { position: 'top' }, tooltip: { y: { formatter: (v: number) => fmtCurrency(v) } } }} series={[
                  { name: 'Gaji Kotor', data: monthly.map(m => m.gross) },
                  { name: 'Potongan', data: monthly.map(m => m.deductions) },
                  { name: 'Pajak', data: monthly.map(m => m.tax) },
                  { name: 'Gaji Bersih', data: monthly.map(m => m.net) },
                ]} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bulan</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gaji Kotor</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Potongan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pajak</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">BPJS</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gaji Bersih</th>
                </tr></thead>
                <tbody className="divide-y">{monthly.map(m => (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{m.month}</td>
                    <td className="px-4 py-2 text-center">{m.employees}</td>
                    <td className="px-4 py-2 text-right">{fmtCurrency(m.gross)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{fmtCurrency(m.deductions)}</td>
                    <td className="px-4 py-2 text-right text-amber-600">{fmtCurrency(m.tax)}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{fmtCurrency(m.bpjs)}</td>
                    <td className="px-4 py-2 text-right font-bold text-green-600">{fmtCurrency(m.net)}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-gray-50 font-bold"><tr>
                  <td className="px-4 py-2">Total YTD</td><td></td>
                  <td className="px-4 py-2 text-right">{fmtCurrency(ytdGross)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{fmtCurrency(monthly.reduce((s, m) => s + m.deductions, 0))}</td>
                  <td className="px-4 py-2 text-right text-amber-600">{fmtCurrency(ytdTax)}</td>
                  <td className="px-4 py-2 text-right text-blue-600">{fmtCurrency(monthly.reduce((s, m) => s + m.bpjs, 0))}</td>
                  <td className="px-4 py-2 text-right text-green-600">{fmtCurrency(ytdNet)}</td>
                </tr></tfoot></table>
              </div>
            </div>
          )}

          {activeReport === 'department' && (
            <div className="p-6 space-y-6">
              <div className="h-[350px]">
                <Chart type="bar" height={350} options={{ chart: { id: 'dept-payroll', toolbar: { show: false } }, plotOptions: { bar: { horizontal: true, borderRadius: 4 } }, dataLabels: { enabled: false }, xaxis: { labels: { formatter: (v: number) => fmtShort(v) } }, yaxis: { labels: { style: { fontSize: '11px' } } }, colors: ['#3b82f6', '#10b981'], legend: { position: 'top' }, tooltip: { y: { formatter: (v: number) => fmtCurrency(v) } } }} series={[
                  { name: 'Gaji Kotor', data: byDept.map(d => ({ x: d.department, y: d.gross })) },
                  { name: 'Gaji Bersih', data: byDept.map(d => ({ x: d.department, y: d.net })) },
                ]} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead className="bg-gray-50"><tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Departemen</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gaji Kotor</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gaji Bersih</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rata-rata</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% dari Total</th>
                </tr></thead>
                <tbody className="divide-y">{byDept.map(d => (
                  <tr key={d.department} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{d.department}</td>
                    <td className="px-4 py-2 text-center">{d.employees}</td>
                    <td className="px-4 py-2 text-right">{fmtCurrency(d.gross)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{fmtCurrency(d.net)}</td>
                    <td className="px-4 py-2 text-right">{fmtCurrency(d.avg_salary)}</td>
                    <td className="px-4 py-2 text-right">{((d.gross / totalDeptGross) * 100).toFixed(1)}%</td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-gray-50 font-bold"><tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-center">{byDept.reduce((s, d) => s + d.employees, 0)}</td>
                  <td className="px-4 py-2 text-right">{fmtCurrency(totalDeptGross)}</td>
                  <td className="px-4 py-2 text-right text-green-600">{fmtCurrency(byDept.reduce((s, d) => s + d.net, 0))}</td>
                  <td className="px-4 py-2 text-right">{fmtCurrency(Math.round(totalDeptGross / byDept.reduce((s, d) => s + d.employees, 0)))}</td>
                  <td className="px-4 py-2 text-right">100%</td>
                </tr></tfoot></table>
              </div>
            </div>
          )}

          {activeReport === 'distribution' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <Chart type="donut" height={300} options={{ chart: { id: 'salary-dist' }, labels: distribution.map(s => s.range), colors: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'], legend: { position: 'bottom' }, plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${distribution.reduce((s, d) => s + d.count, 0)}` } } } } } }} series={distribution.map(s => s.count)} />
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Distribusi Rentang Gaji</h4>
                  {distribution.map(s => (
                    <div key={s.range} className="flex items-center gap-3">
                      <div className="w-20 text-sm font-medium">{s.range}</div>
                      <div className="flex-1"><div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${s.pct}%` }} /></div></div>
                      <div className="w-20 text-right text-sm"><span className="font-bold">{s.count}</span> <span className="text-gray-500">({s.pct}%)</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeReport === 'ytd' && (
            <div className="p-6 space-y-6">
              <h3 className="font-semibold text-lg">Ringkasan Year-to-Date {selectedYear}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Total Gaji Bruto', value: ytdGross, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Total Gaji Bersih', value: ytdNet, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Total Pajak PPh 21', value: ytdTax, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Total BPJS', value: monthly.reduce((s, m) => s + m.bpjs, 0), color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Total Potongan', value: monthly.reduce((s, m) => s + m.deductions, 0), color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Rata-rata per Bulan', value: Math.round(ytdGross / monthly.length), color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-xl p-4`}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color} mt-1`}>{fmtShort(item.value)}</p>
                  </div>
                ))}
              </div>
              <div className="border rounded-xl p-5 space-y-4">
                <h4 className="font-semibold">Komposisi Biaya YTD</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Gaji Bersih (Net Pay)', value: ytdNet, total: ytdGross, color: 'bg-green-500' },
                    { label: 'PPh 21', value: ytdTax, total: ytdGross, color: 'bg-amber-500' },
                    { label: 'BPJS', value: monthly.reduce((s, m) => s + m.bpjs, 0), total: ytdGross, color: 'bg-purple-500' },
                    { label: 'Potongan Lain', value: monthly.reduce((s, m) => s + m.deductions, 0) - ytdTax - monthly.reduce((s, m) => s + m.bpjs, 0), total: ytdGross, color: 'bg-red-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span className="font-medium">{fmtCurrency(item.value)} ({((item.value / item.total) * 100).toFixed(1)}%)</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2"><div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.value / item.total) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </HQLayout>
  );
}
