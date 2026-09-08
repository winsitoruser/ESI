import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { PayrollShell } from '@/components/humanify/PayrollModuleChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import dynamic from 'next/dynamic';
import {
  FileText, Users, DollarSign, TrendingUp, BarChart3, PieChart,
  Calendar, Download, Building2, Shield
} from 'lucide-react';

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


const MOCK_MONTHLY: MonthlyData[] = [
  { month: '2026-01', label: 'Jan', gross: 1790000000, deductions: 358000000, tax: 179000000, bpjs: 89500000, net: 1432000000, employees: 145 },
  { month: '2026-02', label: 'Feb', gross: 1850000000, deductions: 370000000, tax: 185000000, bpjs: 92500000, net: 1480000000, employees: 148 },
  { month: '2026-03', label: 'Mar', gross: 1860000000, deductions: 372000000, tax: 186000000, bpjs: 93000000, net: 1488000000, employees: 148 },
];

const MOCK_DEPT: DeptData[] = [
  { department: 'MANAGEMENT', employees: 5, gross: 110000000, net: 92000000, avg_salary: 22000000 },
  { department: 'OPERATIONS', employees: 42, gross: 420000000, net: 350000000, avg_salary: 10000000 },
  { department: 'SALES', employees: 30, gross: 270000000, net: 225000000, avg_salary: 9000000 },
  { department: 'FINANCE', employees: 17, gross: 187000000, net: 156000000, avg_salary: 11000000 },
  { department: 'WAREHOUSE', employees: 28, gross: 196000000, net: 163000000, avg_salary: 7000000 },
  { department: 'PRODUCTION', employees: 22, gross: 132000000, net: 110000000, avg_salary: 6000000 },
  { department: 'IT', employees: 8, gross: 96000000, net: 80000000, avg_salary: 12000000 },
  { department: 'HR', employees: 6, gross: 60000000, net: 50000000, avg_salary: 10000000 },
];

const MOCK_DISTRIBUTION = [
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
  const [monthly, setMonthly] = useState<MonthlyData[]>(USE_MOCK_UI ? MOCK_MONTHLY : []);
  const [byDept, setByDept] = useState<DeptData[]>(USE_MOCK_UI ? MOCK_DEPT : []);
  const [distribution, setDistribution] = useState(USE_MOCK_UI ? MOCK_DISTRIBUTION : []);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/humanify/payroll?action=laporan');
        const json = await res.json().catch(() => null);
        if (res.ok && json) {
          let hasLive = false;
          if (Array.isArray(json.monthly) && json.monthly.length > 0) {
            hasLive = true;
            setMonthly(json.monthly.map((m: any) => ({
              month: m.month, label: m.month.split('-')[1],
              gross: Number(m.gross || 0), net: Number(m.net || 0),
              tax: Number(m.tax || 0), bpjs: Number(m.bpjs || 0),
              deductions: Number(m.gross || 0) - Number(m.net || 0),
              employees: 0,
            })));
          } else {
            setMonthly(USE_MOCK_UI ? MOCK_MONTHLY : []);
          }
          if (Array.isArray(json.byDepartment) && json.byDepartment.length > 0) {
            hasLive = true;
            setByDept(json.byDepartment.map((d: any) => ({
              department: d.department || 'Lainnya',
              employees: Number(d.employees || 0),
              gross: Number(d.total_basic || 0),
              net: Math.round(Number(d.total_basic || 0) * 0.83),
              avg_salary: d.employees > 0 ? Math.round(Number(d.total_basic) / Number(d.employees)) : 0,
            })));
          } else {
            setByDept(USE_MOCK_UI ? MOCK_DEPT : []);
          }
          if (Array.isArray(json.distribution) && json.distribution.length > 0) {
            hasLive = true;
            const total = json.distribution.reduce((s: number, d: any) => s + Number(d.c || 0), 0) || 1;
            setDistribution(json.distribution.map((d: any) => ({
              range: d.bucket, count: Number(d.c || 0),
              pct: Math.round((Number(d.c || 0) / total) * 1000) / 10,
            })));
          } else {
            setDistribution(USE_MOCK_UI ? MOCK_DISTRIBUTION : []);
          }
          setDataSource(json.dataSource || (hasLive ? 'live' : (USE_MOCK_UI ? 'demo' : 'empty')));
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
      <PayrollShell
        current="laporan"
        title="Laporan penggajian"
        subtitle="Tren, rekap per departemen, distribusi gaji, dan year-to-date."
        icon={BarChart3}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge source={dataSource} />
            <a href="/api/humanify/payroll?action=export&type=salaries" download className="hf-btn-primary inline-flex items-center gap-2"><Download className="h-4 w-4" /> Export gaji</a>
          </div>
        )}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <OpsKpiShell><HRStatCard icon={TrendingUp} label="YTD gaji kotor" value={fmtShort(ytdGross)} accent="violet" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={DollarSign} label="YTD gaji bersih" value={fmtShort(ytdNet)} accent="emerald" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={FileText} label="YTD pajak" value={fmtShort(ytdTax)} accent="amber" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Users} label="Karyawan aktif" value={latestMonth?.employees || 0} accent="violet" /></OpsKpiShell>
        </div>

        <EnterpriseTabBar
          tabs={[
            { key: 'monthly', label: 'Tren bulanan', icon: BarChart3 },
            { key: 'department', label: 'Per departemen', icon: Building2 },
            { key: 'distribution', label: 'Distribusi gaji', icon: PieChart },
            { key: 'ytd', label: 'Year to date', icon: Calendar },
          ]}
          active={activeReport}
          onChange={setActiveReport}
        />

          {activeReport === 'monthly' && (
            monthly.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada laporan bulanan"
                description="Tren penggajian bulanan akan muncul setelah proses penggajian periode pertama selesai."
              />
            ) : (
            <div className="hf-card space-y-6 p-6">
              <div className="h-[350px]">
                <Chart type="bar" height={350} options={{ chart: { id: 'payroll-trend', toolbar: { show: false }, fontFamily: 'inherit' }, plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } }, dataLabels: { enabled: false }, xaxis: { categories: monthly.map(m => m.label) }, yaxis: { labels: { formatter: (v: number) => fmtShort(v) } }, colors: ['#5b21b6', '#94a3b8', '#d97706', '#059669'], legend: { position: 'top' }, tooltip: { y: { formatter: (v: number) => fmtCurrency(v) } } }} series={[
                  { name: 'Gaji Kotor', data: monthly.map(m => m.gross) },
                  { name: 'Potongan', data: monthly.map(m => m.deductions) },
                  { name: 'Pajak', data: monthly.map(m => m.tax) },
                  { name: 'Gaji Bersih', data: monthly.map(m => m.net) },
                ]} />
              </div>
              <div className="hf-table-wrap overflow-x-auto">
                <table><thead><tr>
                  <th>Bulan</th>
                  <th className="text-center">Karyawan</th>
                  <th className="text-right">Gaji kotor</th>
                  <th className="text-right">Potongan</th>
                  <th className="text-right">Pajak</th>
                  <th className="text-right">BPJS</th>
                  <th className="text-right">Gaji bersih</th>
                </tr></thead>
                <tbody>{monthly.map(m => (
                  <tr key={m.month}>
                    <td className="font-medium">{m.month}</td>
                    <td className="text-center">{m.employees}</td>
                    <td className="text-right tabular-nums">{fmtCurrency(m.gross)}</td>
                    <td className="text-right tabular-nums text-[color:var(--hf-danger)]">{fmtCurrency(m.deductions)}</td>
                    <td className="text-right tabular-nums text-amber-700">{fmtCurrency(m.tax)}</td>
                    <td className="text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(m.bpjs)}</td>
                    <td className="text-right font-semibold tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(m.net)}</td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-[var(--hf-surface-muted)] font-semibold"><tr>
                  <td className="px-4 py-2">Total YTD</td><td></td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(ytdGross)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[color:var(--hf-danger)]">{fmtCurrency(monthly.reduce((s, m) => s + m.deductions, 0))}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">{fmtCurrency(ytdTax)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[color:var(--hf-brand-600)]">{fmtCurrency(monthly.reduce((s, m) => s + m.bpjs, 0))}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(ytdNet)}</td>
                </tr></tfoot></table>
              </div>
            </div>
            )
          )}

          {activeReport === 'department' && (
            byDept.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada laporan per departemen"
                description="Rekap gaji per departemen akan muncul setelah data penggajian karyawan tersedia."
              />
            ) : (
            <div className="hf-card space-y-6 p-6">
              <div className="h-[350px]">
                <Chart type="bar" height={350} options={{ chart: { id: 'dept-payroll', toolbar: { show: false }, fontFamily: 'inherit' }, plotOptions: { bar: { horizontal: true, borderRadius: 4 } }, dataLabels: { enabled: false }, xaxis: { labels: { formatter: (v: number) => fmtShort(v) } }, yaxis: { labels: { style: { fontSize: '11px' } } }, colors: ['#5b21b6', '#059669'], legend: { position: 'top' }, tooltip: { y: { formatter: (v: number) => fmtCurrency(v) } } }} series={[
                  { name: 'Gaji Kotor', data: byDept.map(d => ({ x: d.department, y: d.gross })) },
                  { name: 'Gaji Bersih', data: byDept.map(d => ({ x: d.department, y: d.net })) },
                ]} />
              </div>
              <div className="hf-table-wrap overflow-x-auto">
                <table><thead><tr>
                  <th>Departemen</th>
                  <th className="text-center">Karyawan</th>
                  <th className="text-right">Gaji kotor</th>
                  <th className="text-right">Gaji bersih</th>
                  <th className="text-right">Rata-rata</th>
                  <th className="text-right">% dari total</th>
                </tr></thead>
                <tbody>{byDept.map(d => (
                  <tr key={d.department}>
                    <td className="font-medium">{d.department}</td>
                    <td className="text-center">{d.employees}</td>
                    <td className="text-right tabular-nums">{fmtCurrency(d.gross)}</td>
                    <td className="text-right tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(d.net)}</td>
                    <td className="text-right tabular-nums">{fmtCurrency(d.avg_salary)}</td>
                    <td className="text-right tabular-nums">{((d.gross / totalDeptGross) * 100).toFixed(1)}%</td>
                  </tr>
                ))}</tbody>
                <tfoot className="bg-[var(--hf-surface-muted)] font-semibold"><tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-center">{byDept.reduce((s, d) => s + d.employees, 0)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(totalDeptGross)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-[color:var(--hf-success)]">{fmtCurrency(byDept.reduce((s, d) => s + d.net, 0))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(Math.round(totalDeptGross / byDept.reduce((s, d) => s + d.employees, 0)))}</td>
                  <td className="px-4 py-2 text-right">100%</td>
                </tr></tfoot></table>
              </div>
            </div>
            )
          )}

          {activeReport === 'distribution' && (
            distribution.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada distribusi gaji"
                description="Distribusi rentang gaji akan muncul setelah data gaji karyawan tersedia."
              />
            ) : (
            <div className="hf-card space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px]">
                  <Chart type="donut" height={300} options={{ chart: { id: 'salary-dist', fontFamily: 'inherit' }, labels: distribution.map(s => s.range), colors: ['#5b21b6', '#7c3aed', '#94a3b8', '#d97706', '#059669'], legend: { position: 'bottom' }, plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${distribution.reduce((s, d) => s + d.count, 0)}` } } } } } }} series={distribution.map(s => s.count)} />
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Distribusi Rentang Gaji</h4>
                  {distribution.map(s => (
                    <div key={s.range} className="flex items-center gap-3">
                      <div className="w-20 text-sm font-medium">{s.range}</div>
                      <div className="flex-1"><div className="h-4 w-full rounded-full bg-[var(--hf-surface-muted)]"><div className="h-4 rounded-full bg-[var(--hf-brand-600)] transition-all" style={{ width: `${s.pct}%` }} /></div></div>
                      <div className="w-20 text-right text-sm"><span className="font-bold">{s.count}</span> <span className="text-gray-500">({s.pct}%)</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )
          )}

          {activeReport === 'ytd' && (
            <div className="hf-card space-y-6 p-6">
              <h3 className="text-lg font-semibold text-[color:var(--hf-ink)]">Ringkasan year-to-date {selectedYear}</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <OpsKpiShell><HRStatCard icon={TrendingUp} label="Total gaji bruto" value={fmtShort(ytdGross)} accent="violet" /></OpsKpiShell>
                <OpsKpiShell><HRStatCard icon={DollarSign} label="Total gaji bersih" value={fmtShort(ytdNet)} accent="emerald" /></OpsKpiShell>
                <OpsKpiShell><HRStatCard icon={FileText} label="Total PPh 21" value={fmtShort(ytdTax)} accent="amber" /></OpsKpiShell>
                <OpsKpiShell><HRStatCard icon={Shield} label="Total BPJS" value={fmtShort(monthly.reduce((s, m) => s + m.bpjs, 0))} accent="violet" /></OpsKpiShell>
                <OpsKpiShell><HRStatCard icon={DollarSign} label="Total potongan" value={fmtShort(monthly.reduce((s, m) => s + m.deductions, 0))} accent="rose" /></OpsKpiShell>
                <OpsKpiShell><HRStatCard icon={Calendar} label="Rata-rata per bulan" value={fmtShort(monthly.length ? Math.round(ytdGross / monthly.length) : 0)} accent="violet" /></OpsKpiShell>
              </div>
              <div className="hf-card space-y-4 p-5">
                <h4 className="font-semibold">Komposisi biaya YTD</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Gaji bersih (net pay)', value: ytdNet, total: ytdGross, color: 'bg-emerald-600' },
                    { label: 'PPh 21', value: ytdTax, total: ytdGross, color: 'bg-amber-500' },
                    { label: 'BPJS', value: monthly.reduce((s, m) => s + m.bpjs, 0), total: ytdGross, color: 'bg-[var(--hf-brand-600)]' },
                    { label: 'Potongan lain', value: monthly.reduce((s, m) => s + m.deductions, 0) - ytdTax - monthly.reduce((s, m) => s + m.bpjs, 0), total: ytdGross, color: 'bg-rose-500' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><span className="font-medium tabular-nums">{fmtCurrency(item.value)} ({item.total ? ((item.value / item.total) * 100).toFixed(1) : 0}%)</span></div>
                      <div className="h-2 w-full rounded-full bg-[var(--hf-surface-muted)]"><div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.total ? (item.value / item.total) * 100 : 0}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </PayrollShell>
    </HQLayout>
  );
}
