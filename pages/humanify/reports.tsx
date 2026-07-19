import { useState, useEffect } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { exportToCSV, exportToExcel } from '@/utils/export-utils';
import {
  BarChart3, Download, FileSpreadsheet, FileText, Users, Clock, Target,
  Award, Calendar, DollarSign, Building2, RefreshCw, ChevronRight, Filter,
  TrendingUp, UserCheck, ClipboardList
} from 'lucide-react';
import Link from 'next/link';

const CATEGORY_ICONS: Record<string, any> = {
  kepegawaian: Users, kehadiran: Clock, kinerja: Target, cuti: Calendar, payroll: DollarSign,
};
const CATEGORY_COLORS: Record<string, string> = {
  kepegawaian: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)] border-[var(--hf-brand-100)]',
  kehadiran: 'bg-green-50 text-green-700 border-green-200',
  kinerja: 'bg-purple-50 text-purple-700 border-purple-200',
  cuti: 'bg-amber-50 text-amber-700 border-amber-200',
  payroll: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function HRISReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({});
  const [reports, setReports] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/humanify/reports-hub?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.summary || {});
        const rows = json.reports || [];
        setReports(rows);
        setDataSource(rows.length ? 'live' : 'empty');
      }
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [period]);

  const filtered = categoryFilter === 'all' ? reports : reports.filter(r => r.category === categoryFilter);

  const handleExport = async (report: any, format: 'csv' | 'xlsx') => {
    if (!report.exportType) {
      if (report.data) {
        const fn = `hris-${report.id}-${period}`;
        if (format === 'csv') exportToCSV(report.data, fn);
        else exportToExcel(report.data, fn);
      }
      return;
    }
    setExporting(report.id);
    try {
      const res = await fetch(`/api/humanify/export?type=${report.exportType}&period=${period}`);
      const json = await res.json();
      if (json.success && json.data?.length) {
        const fn = `hris-${report.exportType}-${period}`;
        if (format === 'csv') exportToCSV(json.data, fn);
        else exportToExcel(json.data, fn);
      }
    } catch { /* */ }
    finally { setExporting(null); }
  };

  const statCards = [
    { label: 'Total Karyawan', value: summary.employees?.total ?? '-', sub: `${summary.employees?.active ?? 0} aktif`, icon: Users, color: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)]' },
    { label: 'Kehadiran Bulan Ini', value: summary.attendance?.present ?? '-', sub: `${summary.attendance?.absent ?? 0} absen`, icon: Clock, color: 'text-green-600 bg-green-50' },
    { label: 'Rata-rata KPI', value: summary.kpi?.avg_achievement ? `${summary.kpi.avg_achievement}%` : '-', sub: `${summary.kpi?.employees ?? 0} karyawan`, icon: Target, color: 'text-purple-600 bg-purple-50' },
    { label: 'Cuti Pending', value: summary.leave?.pending ?? '-', sub: `${summary.leave?.approved ?? 0} disetujui`, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
    { label: 'Payroll', value: summary.payroll?.runs ?? '-', sub: summary.payroll?.total_employees ? `${summary.payroll.total_employees} karyawan` : 'belum diproses', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Evaluasi Kinerja', value: summary.performance?.completed ?? '-', sub: summary.performance?.avg_score ? `skor ${summary.performance.avg_score}` : '-', icon: Award, color: 'text-[color:var(--hf-brand-600)] bg-[var(--hf-brand-50)]' },
  ];

  return (
    <HQLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Laporan HRIS</h1>
            <p className="text-sm text-gray-500 mt-1">Pusat laporan kepegawaian, kehadiran, KPI, cuti & payroll</p>
          </div>
          <div className="flex items-center gap-3">
            <DataSourceBadge source={dataSource} />
            <input type="month" value={period} onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm" />
            <button onClick={fetchReports} className="p-2 border rounded-lg hover:bg-gray-50" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white border rounded-xl p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.color} mb-2`}><s.icon className="w-4 h-4" /></div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Headcount by dept */}
        {summary.headcountByDept?.length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Headcount per Departemen
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {summary.headcountByDept.map((d: any) => (
                <div key={d.department} className="border rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 truncate">{d.department}</p>
                  <p className="text-lg font-bold text-gray-900">{d.count}</p>
                  <p className="text-xs text-green-600">{d.active} aktif</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'kepegawaian', 'kehadiran', 'kinerja', 'cuti', 'payroll'].map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === cat ? 'bg-[var(--hf-brand-600)] text-white border-[var(--hf-brand-600)]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {cat === 'all' ? 'Semua' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-12 text-gray-400">Memuat laporan...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">Tidak ada laporan untuk periode ini</div>
          ) : filtered.map(report => {
            const Icon = CATEGORY_ICONS[report.category] || ClipboardList;
            const colorCls = CATEGORY_COLORS[report.category] || 'bg-gray-50 text-gray-700 border-gray-200';
            return (
              <div key={report.id} className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg border ${colorCls}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{report.category}</span>
                      <h3 className="font-semibold text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
                      {report.count > 0 && <p className="text-xs text-[color:var(--hf-brand-600)] mt-1">{report.count} record</p>}
                    </div>
                  </div>
                  {report.href && (
                    <Link href={report.href} className="text-gray-400 hover:text-[color:var(--hf-brand-600)] flex-shrink-0">
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  {report.formats?.includes('csv') && (
                    <button onClick={() => handleExport(report, 'csv')} disabled={exporting === report.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">
                      <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                  )}
                  {report.formats?.includes('xlsx') && (
                    <button onClick={() => handleExport(report, 'xlsx')} disabled={exporting === report.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                    </button>
                  )}
                  {report.exportType && (
                    <Link href={`/humanify/${report.exportType === 'kpi' ? 'kpi' : report.exportType === 'attendance' ? 'attendance' : report.exportType === 'performance' ? 'performance' : 'employees'}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 ml-auto text-[color:var(--hf-brand-600)]">
                      <TrendingUp className="w-3.5 h-3.5" /> Buka Modul
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick links */}
        <div className="bg-gradient-to-r from-[var(--hf-brand-600)] to-purple-50 border border-[var(--hf-brand-100)] rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Modul Terkait</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'KPI Dashboard', href: '/humanify/kpi' },
              { label: 'Kehadiran', href: '/humanify/attendance' },
              { label: 'Cuti', href: '/humanify/leave' },
              { label: 'Payroll', href: '/humanify/payroll/laporan' },
              { label: 'Evaluasi Kinerja', href: '/humanify/performance' },
              { label: 'Analytics', href: '/humanify/workforce-analytics' },
              { label: 'Aktivitas HR', href: '/humanify/activities' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="px-3 py-1.5 bg-white border rounded-lg text-sm text-gray-700 hover:border-[var(--hf-brand-100)] hover:text-[color:var(--hf-brand)] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
