import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsPageHero, OpsPanel, OpsKpiShell, OpsStage } from '@/components/humanify/OpsPageChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { useTranslation } from '@/lib/i18n';
import { exportToCSV, exportToExcel } from '@/utils/export-utils';
import {
  BarChart3, Download, FileSpreadsheet, Users, Clock, Target,
  Award, Calendar, DollarSign, Building2, RefreshCw, ChevronRight, Filter,
  TrendingUp, ClipboardList, CheckCircle2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  kepegawaian: Users, kehadiran: Clock, kinerja: Target, cuti: Calendar, payroll: DollarSign,
};

type CatKey = 'all' | 'kepegawaian' | 'kehadiran' | 'kinerja' | 'cuti' | 'payroll';

export default function HRISReportsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({});
  const [reports, setReports] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [categoryFilter, setCategoryFilter] = useState<CatKey>('all');
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

  const filtered = categoryFilter === 'all' ? reports : reports.filter((r) => r.category === categoryFilter);

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

  const healthScore = useMemo(() => {
    const attendance = Number(summary.attendance?.present || 0);
    const totalEmp = Number(summary.employees?.active || summary.employees?.total || 0) || 1;
    const attRate = Math.min(100, (attendance / Math.max(totalEmp, 1)) * 100);
    const kpi = Number(summary.kpi?.avg_achievement || 0);
    return Math.round((Number.isFinite(attRate) ? attRate : 0) * 0.5 + kpi * 0.5);
  }, [summary]);

  const catTabs: { key: CatKey; label: string; icon: any; count?: number }[] = [
    { key: 'all', label: 'Semua', icon: Filter, count: reports.length },
    { key: 'kepegawaian', label: 'Kepegawaian', icon: Users },
    { key: 'kehadiran', label: 'Kehadiran', icon: Clock },
    { key: 'kinerja', label: 'Kinerja', icon: Target },
    { key: 'cuti', label: 'Cuti', icon: Calendar },
    { key: 'payroll', label: 'Payroll', icon: DollarSign },
  ];

  return (
    <HQLayout title="Laporan HRIS" subtitle="Pusat laporan kepegawaian, kehadiran, KPI, cuti & payroll">
      <OpsStage>
        <OpsPageHero
          title="Pusat Laporan HRIS"
          subtitle={`Ekspor dan pantau ringkasan operasional SDM · periode ${period}`}
          badge="Reports Hub"
          liveLabel="Reports"
          icon={BarChart3}
          score={healthScore}
          scoreLabel="Ops"
          chips={[
            { icon: CheckCircle2, label: `${reports.length} laporan`, tone: 'text-emerald-700' },
            { icon: Users, label: `${summary.employees?.active ?? 0} karyawan aktif`, tone: 'text-[color:var(--hf-brand-600)]' },
            { icon: ClipboardList, label: t ? 'Export CSV / Excel' : 'Export CSV / Excel', tone: 'text-[color:var(--hf-ink-muted)]' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <label className="sr-only" htmlFor="reports-period">Periode</label>
              <input
                id="reports-period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="hf-input bg-white/80 backdrop-blur"
              />
              <button type="button" onClick={fetchReports} className="hf-btn-primary inline-flex items-center gap-2" title="Muat ulang">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Muat ulang
              </button>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <OpsKpiShell>
            <HRStatCard label="Total Karyawan" value={summary.employees?.total ?? '—'} sub={`${summary.employees?.active ?? 0} aktif`} icon={Users} accent="violet" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard label="Kehadiran" value={summary.attendance?.present ?? '—'} sub={`${summary.attendance?.absent ?? 0} absen`} icon={Clock} accent="emerald" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard label="Rata-rata KPI" value={summary.kpi?.avg_achievement ? `${summary.kpi.avg_achievement}%` : '—'} sub={`${summary.kpi?.employees ?? 0} karyawan`} icon={Target} accent="indigo" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard label="Cuti Pending" value={summary.leave?.pending ?? '—'} sub={`${summary.leave?.approved ?? 0} disetujui`} icon={Calendar} accent="amber" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard label="Payroll Run" value={summary.payroll?.runs ?? '—'} sub={summary.payroll?.total_employees ? `${summary.payroll.total_employees} karyawan` : 'belum diproses'} icon={DollarSign} accent="cyan" />
          </OpsKpiShell>
          <OpsKpiShell>
            <HRStatCard label="Evaluasi" value={summary.performance?.completed ?? '—'} sub={summary.performance?.avg_score ? `skor ${summary.performance.avg_score}` : '—'} icon={Award} accent="blue" />
          </OpsKpiShell>
        </div>

        {summary.headcountByDept?.length > 0 && (
          <OpsPanel title="Headcount per departemen" subtitle="Distribusi karyawan aktif">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {summary.headcountByDept.map((d: any) => (
                <div key={d.department} className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)]/50 px-3 py-2.5 text-center">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[color:var(--hf-ink-faint)]">{d.department}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-[color:var(--hf-ink)]">{d.count}</p>
                  <p className="text-[11px] text-[color:var(--hf-success)]">{d.active} aktif</p>
                </div>
              ))}
            </div>
          </OpsPanel>
        )}

        <EnterpriseTabBar tabs={catTabs} active={categoryFilter} onChange={setCategoryFilter} />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {loading && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-[var(--hf-radius-xl)] bg-[var(--hf-surface-muted)]" />
              ))}
            </>
          )}
          {!loading && filtered.length === 0 && (
            <div className="md:col-span-2">
              <HrisEmptyState
                title="Tidak ada laporan"
                description="Belum ada laporan untuk filter/periode ini."
                source={dataSource}
              />
            </div>
          )}
          {!loading && filtered.map((report) => {
            const Icon = CATEGORY_ICONS[report.category] || ClipboardList;
            return (
              <article key={report.id} className="hf-card hf-analytics-panel group relative overflow-hidden p-0">
                <div className="hf-analytics-panel__rail" aria-hidden />
                <div className="p-4 pl-5 md:p-5 md:pl-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] p-2.5 text-[color:var(--hf-brand-600)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="hf-section-label">{report.category}</p>
                        <h3 className="text-sm font-semibold text-[color:var(--hf-ink)]">{report.title}</h3>
                        <p className="mt-0.5 text-sm text-[color:var(--hf-ink-muted)]">{report.description}</p>
                        {report.count > 0 && (
                          <p className="mt-1 text-xs font-medium text-[color:var(--hf-brand-600)]">{report.count} record</p>
                        )}
                      </div>
                    </div>
                    {report.href && (
                      <Link href={report.href} className="text-[color:var(--hf-ink-faint)] transition group-hover:text-[color:var(--hf-brand-600)]">
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--hf-border-subtle)] pt-3">
                    {report.formats?.includes('csv') && (
                      <button type="button" onClick={() => handleExport(report, 'csv')} disabled={exporting === report.id} className="hf-btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs disabled:opacity-50">
                        <Download className="h-3.5 w-3.5" /> CSV
                      </button>
                    )}
                    {report.formats?.includes('xlsx') && (
                      <button type="button" onClick={() => handleExport(report, 'xlsx')} disabled={exporting === report.id} className="hf-btn-secondary inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs disabled:opacity-50">
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                      </button>
                    )}
                    {report.exportType && (
                      <Link
                        href={`/humanify/${report.exportType === 'kpi' ? 'kpi' : report.exportType === 'attendance' ? 'attendance' : report.exportType === 'performance' ? 'performance' : 'employees'}`}
                        className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                      >
                        <TrendingUp className="h-3.5 w-3.5" /> Buka modul
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <OpsPanel title="Modul terkait" subtitle="Lompat cepat ke dasbor operasional">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'KPI Dashboard', href: '/humanify/kpi' },
              { label: 'Kehadiran', href: '/humanify/attendance' },
              { label: 'Cuti', href: '/humanify/leave' },
              { label: 'Payroll', href: '/humanify/payroll/laporan' },
              { label: 'Evaluasi Kinerja', href: '/humanify/performance' },
              { label: 'HR Analytics', href: '/humanify/hr-analytics' },
              { label: 'Workforce', href: '/humanify/workforce-analytics' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-1.5 text-sm text-[color:var(--hf-ink-secondary)] transition hover:border-[var(--hf-brand-100)] hover:text-[color:var(--hf-brand)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </OpsPanel>
      </OpsStage>
    </HQLayout>
  );
}
