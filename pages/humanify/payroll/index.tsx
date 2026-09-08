import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { OpsKpiShell, OpsPanel, OpsToolbar } from '@/components/humanify/OpsPageChrome';
import { PayrollShell } from '@/components/humanify/PayrollModuleChrome';
import {
  DollarSign, Users, FileText, Clock, Calculator, Layers, CreditCard,
  Gift, Shield, BarChart3, ChevronRight, Banknote, Percent, CheckCircle,
  Wallet, Calendar, RefreshCw, Search, ArrowRight, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d).slice(0, 10) : dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draf', className: 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]' },
  calculated: { label: 'Dihitung', className: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' },
  approved: { label: 'Disetujui', className: 'bg-emerald-50 text-[color:var(--hf-success)]' },
  paid: { label: 'Dibayar', className: 'bg-emerald-50 text-[color:var(--hf-success)]' },
  cancelled: { label: 'Dibatalkan', className: 'bg-rose-50 text-[color:var(--hf-danger)]' },
};

type PayrollRunRow = {
  id: string;
  run_code: string;
  name?: string;
  period_start?: string;
  period_end?: string;
  pay_date?: string;
  total_employees?: number;
  total_net?: number;
  status?: string;
};

type HubStats = {
  totalEmployees: number;
  configuredSalaries: number;
  monthlyPayroll: number;
  totalComponents: number;
  lastPayrollRun: PayrollRunRow | null;
};

const EMPTY_STATS: HubStats = {
  totalEmployees: 0, configuredSalaries: 0, monthlyPayroll: 0, totalComponents: 0, lastPayrollRun: null,
};

const INPUT_MODULES: Array<{ key: string; label: string; href: string; icon: LucideIcon }> = [
  { key: 'attendance', label: 'Absensi', href: '/humanify/attendance', icon: Clock },
  { key: 'leave', label: 'Cuti', href: '/humanify/leave', icon: Calendar },
  { key: 'overtime', label: 'Lembur', href: '/humanify/payroll/lembur', icon: Clock },
  { key: 'reimbursement', label: 'Klaim', href: '/humanify/reimbursement', icon: Wallet },
  { key: 'bonus', label: 'Bonus', href: '/humanify/payroll/bonus', icon: Gift },
  { key: 'cash-advance', label: 'Kasbon', href: '/humanify/payroll/cash-advance', icon: Wallet },
  { key: 'loan', label: 'Pinjaman', href: '/humanify/payroll/loan', icon: CreditCard },
  { key: 'thr', label: 'THR', href: '/humanify/payroll/thr', icon: Gift },
];

type PayrollModule = {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  cta?: string;
};

const MODULE_GROUPS: Array<{ title: string; subtitle: string; modules: PayrollModule[] }> = [
  {
    title: 'Proses inti',
    subtitle: 'Hitung, terbitkan slip, lalu transfer',
    modules: [
      { key: 'main', label: 'Penggajian utama', desc: 'Konfigurasi komponen, impor, dan proses run bulanan.', href: '/humanify/payroll/main', icon: Calculator, cta: 'Proses gaji' },
      { key: 'slip-gaji', label: 'Slip gaji', desc: 'Riwayat pendapatan, potongan, dan distribusi slip.', href: '/humanify/payroll/slip-gaji', icon: FileText },
      { key: 'disbursement', label: 'Transfer bank', desc: 'File disbursement BCA, Mandiri, atau CSV.', href: '/humanify/payroll/disbursement', icon: Banknote },
    ],
  },
  {
    title: 'Komponen variabel',
    subtitle: 'Masuk ke engine sebelum run disetujui',
    modules: [
      { key: 'lembur', label: 'Lembur', desc: 'Hitung jam lembur sesuai PP 35/2021.', href: '/humanify/payroll/lembur', icon: Clock },
      { key: 'bonus', label: 'Bonus & insentif', desc: 'Bonus kinerja, proyek, dan insentif.', href: '/humanify/payroll/bonus', icon: Gift },
      { key: 'thr', label: 'THR', desc: 'Perhitungan THR sesuai PP No. 36/2021.', href: '/humanify/payroll/thr', icon: Gift },
      { key: 'cash-advance', label: 'Kasbon', desc: 'Uang muka dengan potong gaji otomatis.', href: '/humanify/payroll/cash-advance', icon: Wallet },
      { key: 'loan', label: 'Pinjaman', desc: 'Cicilan otomatis dari gaji.', href: '/humanify/payroll/loan', icon: CreditCard },
    ],
  },
  {
    title: 'Pajak, BPJS & laporan',
    subtitle: 'Kepatuhan dan analitik periode',
    modules: [
      { key: 'pph21', label: 'PPh 21', desc: 'PTKP, tarif progresif, dan simulator pajak.', href: '/humanify/payroll/pph21', icon: Percent },
      { key: 'bpjs', label: 'BPJS', desc: 'Iuran Kesehatan, JHT, JP, JKK, JKM.', href: '/humanify/payroll/bpjs', icon: Shield },
      { key: 'laporan', label: 'Laporan gaji', desc: 'Tren bulanan, departemen, dan year-to-date.', href: '/humanify/payroll/laporan', icon: BarChart3 },
    ],
  },
];

export default function PayrollIndexPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HubStats>(EMPTY_STATS);
  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [fiscal, setFiscal] = useState<any>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payRes, fiscalRes] = await Promise.all([
        fetch('/api/humanify/payroll'),
        fetch('/api/humanify/payroll?action=fiscal-signoff'),
      ]);
      const pay = await payRes.json().catch(() => ({}));
      const fis = await fiscalRes.json().catch(() => ({}));
      if (pay.success) {
        const s = pay.stats || {};
        const mappedRuns: PayrollRunRow[] = (Array.isArray(pay.runs) ? pay.runs : []).map((r: any) => ({
          id: r.id,
          run_code: r.run_code || r.runCode || '',
          name: r.name,
          period_start: r.period_start || r.periodStart,
          period_end: r.period_end || r.periodEnd,
          pay_date: r.pay_date || r.payDate,
          total_employees: Number(r.total_employees ?? r.totalEmployees ?? 0),
          total_net: Number(r.total_net ?? r.totalNet ?? 0),
          status: r.status,
        }));
        const last = s.lastPayrollRun || mappedRuns[0] || null;
        setStats({
          totalEmployees: Number(s.totalEmployees || 0),
          configuredSalaries: Number(s.configuredSalaries || 0),
          monthlyPayroll: Number(s.monthlyPayroll || 0),
          totalComponents: Number(s.totalComponents || 0),
          lastPayrollRun: last ? {
            id: last.id,
            run_code: last.run_code || last.runCode || '',
            pay_date: last.pay_date || last.payDate,
            status: last.status,
          } : null,
        });
        setRuns(mappedRuns);
        setDataSource(pay.dataSource || (Number(s.totalEmployees || 0) > 0 ? 'live' : 'empty'));
      }
      if (fis.success) setFiscal(fis.data);
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
  }, [load]);

  const coverage = stats.totalEmployees > 0
    ? Math.round((stats.configuredSalaries / stats.totalEmployees) * 100)
    : 0;
  const lastRun = stats.lastPayrollRun;
  const lastStatus = lastRun?.status ? RUN_STATUS[lastRun.status] : null;

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULE_GROUPS;
    return MODULE_GROUPS
      .map((g) => ({
        ...g,
        modules: g.modules.filter((m) =>
          m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.key.includes(q),
        ),
      }))
      .filter((g) => g.modules.length > 0);
  }, [query]);

  if (!mounted) return null;

  return (
    <PageGuard
      anyPermission={['payroll.view', 'payroll.*', 'employees.*']}
      title="Modul Penggajian (Payroll)"
      description="Modul sensitif: slip gaji, PPh 21, BPJS, dan THR karyawan."
    >
      <HQLayout title="Dasbor Payroll" subtitle="Proses gaji, pajak, BPJS, dan transfer dari satu tempat">
        <PayrollShell
            current="hub"
            title="Dasbor Payroll"
            subtitle="Pantau cakupan gaji, run terakhir, lalu lanjut ke proses, slip, atau transfer bank."
            icon={DollarSign}
            score={coverage}
            scoreLabel="Cakupan"
            chips={[
              { icon: Users, label: `${stats.configuredSalaries}/${stats.totalEmployees} gaji terisi` },
              { icon: CheckCircle, label: lastRun?.run_code ? `Run ${lastRun.run_code}` : 'Belum ada run', tone: lastStatus?.className?.includes('success') ? 'text-emerald-700' : 'text-[color:var(--hf-brand-600)]' },
              { icon: Layers, label: `${stats.totalComponents} komponen aktif` },
            ]}
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <DataSourceBadge source={dataSource} />
                <button type="button" onClick={load} className="hf-btn-secondary inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
                <Link href="/humanify/payroll/main" className="hf-btn-primary inline-flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Proses gaji
                </Link>
              </div>
            )}
          >

          {fiscal && (
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--hf-radius-xl)] border px-4 py-3 text-sm ${
              fiscal.signedOff
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
            >
              <div className="flex items-start gap-2">
                {fiscal.signedOff ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="font-semibold">
                    Mesin fiskal {fiscal.engine?.version || '1.x'}
                    {fiscal.signedOff ? ' · sudah di-sign off' : ' · menunggu tanda tangan finance'}
                  </p>
                  <p className="mt-0.5 text-xs opacity-80">
                    Audit: {fiscal.auditEventCount ?? 0}
                    {fiscal.lastApprovedRun?.run_code ? ` · run terakhir ${fiscal.lastApprovedRun.run_code} (${fiscal.lastApprovedRun.status})` : ''}
                    {fiscal.sample?.pkp100MTax != null ? ` · sampel PKP 100jt → ${fmtCurrency(fiscal.sample.pkp100MTax)}` : ''}
                  </p>
                </div>
              </div>
              <Link href="/humanify/payroll/pph21" className="text-xs font-medium underline underline-offset-2 shrink-0">
                Buka PPh 21
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[108px] animate-pulse hf-card" />
              ))
            ) : (
              <>
                <OpsKpiShell>
                  <HRStatCard icon={Users} label="Karyawan aktif" value={stats.totalEmployees} sub={`${stats.configuredSalaries} sudah punya konfigurasi gaji`} accent="violet" />
                </OpsKpiShell>
                <OpsKpiShell>
                  <HRStatCard icon={CreditCard} label="Cakupan gaji" value={`${coverage}%`} sub="Konfigurasi vs karyawan aktif" accent="emerald" />
                </OpsKpiShell>
                <OpsKpiShell>
                  <HRStatCard icon={Banknote} label="Total gaji pokok / bulan" value={fmtCurrency(stats.monthlyPayroll)} accent="violet" />
                </OpsKpiShell>
                <OpsKpiShell>
                  <HRStatCard
                    icon={CheckCircle}
                    label="Run terakhir"
                    value={lastRun?.run_code || '—'}
                    sub={lastStatus ? `${lastStatus.label} · ${fmtDate(lastRun?.pay_date)}` : 'Belum ada proses gaji'}
                    accent={lastRun?.status === 'paid' || lastRun?.status === 'approved' ? 'emerald' : 'amber'}
                  />
                </OpsKpiShell>
              </>
            )}
          </div>

          <OpsPanel
            title="Alur input → engine"
            subtitle="Data operasional masuk ke perhitungan Daily / Weekly / Monthly, lalu ke PPh 21 dan BPJS."
            action={(
              <Link href="/humanify/payroll/main" className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                Buka proses gaji
              </Link>
            )}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {INPUT_MODULES.map((m) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={m.key}
                    href={m.href}
                    className="hf-tile hf-tile-interactive flex flex-col items-center gap-2 px-3 py-3 text-center"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-medium text-[color:var(--hf-ink)]">{m.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[color:var(--hf-ink-muted)]">
              {['Daily', 'Weekly', 'Monthly'].map((f) => (
                <span key={f} className="rounded-full border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] px-2.5 py-1 font-medium">{f}</span>
              ))}
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/humanify/payroll/pph21" className="rounded-full border border-[var(--hf-border)] bg-white px-2.5 py-1 font-medium hover:border-[var(--hf-brand-100)]">PPh 21</Link>
              <Link href="/humanify/payroll/bpjs" className="rounded-full border border-[var(--hf-border)] bg-white px-2.5 py-1 font-medium hover:border-[var(--hf-brand-100)]">BPJS</Link>
            </div>
          </OpsPanel>

          <OpsPanel
            title="Run penggajian"
            subtitle="Sepuluh proses terakhir. Buka proses gaji untuk menghitung atau menyetujui."
            action={(
              <Link href="/humanify/payroll/main" className="hf-btn-secondary inline-flex items-center gap-1.5 text-xs">
                Semua run <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          >
            {loading ? (
              <div className="h-32 animate-pulse rounded-[var(--hf-radius)] bg-[var(--hf-surface-muted)]" />
            ) : runs.length === 0 ? (
              <HrisEmptyState
                source={dataSource}
                title="Belum ada run gaji"
                description="Buat proses penggajian pertama dari konfigurasi gaji karyawan yang sudah terisi."
                action={(
                  <Link href="/humanify/payroll/main" className="hf-btn-primary inline-flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Mulai proses gaji
                  </Link>
                )}
              />
            ) : (
              <div className="hf-table-wrap overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Periode</th>
                      <th>Tanggal bayar</th>
                      <th className="text-right">Karyawan</th>
                      <th className="text-right">THP</th>
                      <th>Status</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.slice(0, 8).map((r) => {
                      const st = RUN_STATUS[r.status || ''] || RUN_STATUS.draft;
                      return (
                        <tr key={r.id || r.run_code}>
                          <td className="font-medium text-[color:var(--hf-ink)]">{r.run_code || '—'}</td>
                          <td className="whitespace-nowrap text-xs">{fmtDate(r.period_start)} – {fmtDate(r.period_end)}</td>
                          <td className="whitespace-nowrap">{fmtDate(r.pay_date)}</td>
                          <td className="text-right tabular-nums">{r.total_employees ?? 0}</td>
                          <td className="text-right tabular-nums">{fmtCurrency(Number(r.total_net || 0))}</td>
                          <td>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}>{st.label}</span>
                          </td>
                          <td className="text-right">
                            <Link href="/humanify/payroll/main" className="hf-btn-secondary inline-flex items-center gap-1 !px-2.5 !py-1 text-xs">
                              Detail
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </OpsPanel>

          <OpsToolbar>
            <div>
              <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Modul payroll</p>
              <p className="text-xs text-[color:var(--hf-ink-muted)]">Cari atau pilih alur kerja.</p>
            </div>
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari modul…"
                className="hf-input w-full pl-9"
              />
            </div>
          </OpsToolbar>

          {filteredGroups.length === 0 ? (
            <HrisEmptyState title="Modul tidak ditemukan" description="Coba kata kunci lain, misalnya slip, PPh, atau transfer." source="empty" />
          ) : filteredGroups.map((group) => (
            <OpsPanel key={group.title} title={group.title} subtitle={group.subtitle}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.modules.map((mod) => {
                  const Icon = mod.icon;
                  return (
                    <Link
                      key={mod.key}
                      href={mod.href}
                      className="group flex items-start gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white p-4 transition hover:border-[var(--hf-brand-100)] hover:shadow-[var(--hf-shadow-md)]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[color:var(--hf-ink)] group-hover:text-[color:var(--hf-brand-600)]">{mod.label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">{mod.desc}</p>
                        {mod.cta && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)]">
                            {mod.cta} <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[color:var(--hf-ink-faint)] group-hover:text-[color:var(--hf-brand-600)]" />
                    </Link>
                  );
                })}
              </div>
            </OpsPanel>
          ))}

          <OpsPanel title="Referensi cepat" subtitle="Tarif standar Indonesia yang dipakai engine — cek kebijakan perusahaan jika berbeda.">
            <div className="grid gap-6 md:grid-cols-3">
              <RefCol title="BPJS" rows={[
                ['Kesehatan karyawan', '1%'],
                ['Kesehatan perusahaan', '4%'],
                ['JHT karyawan', '2%'],
                ['JHT perusahaan', '3,7%'],
                ['JP karyawan', '1%'],
                ['JP perusahaan', '2%'],
              ]} />
              <RefCol title="PPh 21 (PKP tahunan)" rows={[
                ['0 – 60 jt', '5%'],
                ['60 – 250 jt', '15%'],
                ['250 – 500 jt', '25%'],
                ['500 jt – 5 M', '30%'],
                ['> 5 M', '35%'],
              ]} />
              <RefCol title="Lembur (PP 35/2021)" rows={[
                ['Hari kerja jam ke-1', '1,5× upah/jam'],
                ['Hari kerja jam ke-2+', '2× upah/jam'],
                ['Libur / weekend', '2× upah/jam'],
                ['Upah per jam', '1/173 × gaji'],
              ]} />
            </div>
          </OpsPanel>
        </PayrollShell>
      </HQLayout>
    </PageGuard>
  );
}

function RefCol({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[color:var(--hf-ink)]">{title}</h3>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-[var(--hf-border-subtle)] pb-1.5 last:border-0">
            <dt className="text-[color:var(--hf-ink-muted)]">{k}</dt>
            <dd className="shrink-0 font-medium tabular-nums text-[color:var(--hf-ink)]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
