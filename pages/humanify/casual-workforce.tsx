import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';
import HRStatCard from '@/components/humanify/HRStatCard';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeeAvatar from '@/components/humanify/EmployeeAvatar';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { PageGuard } from '@/components/permissions';
import {
  HardHat, Users, ClipboardList, Plus, RefreshCw,
  Calendar, Package, MapPin, X, Save, Search,
  Shield, FileText, Send, Eye, UserCheck, AlertTriangle, Check,
} from 'lucide-react';
import {
  PAY_TYPES, PIECE_UNITS,
  FIELD_SHIFTS, SUPERVISION_ATTENDANCE, SUPERVISION_REPORT_STATUS,
  getEmploymentCategoryLabel, getPayTypeLabel, getPieceUnitLabel,
} from '@/lib/hris/workforce-types';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

type Tab = 'overview' | 'workers' | 'supervision' | 'piecework' | 'assignments';

const PIECE_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-800' },
  paid: { label: 'Dibayar', cls: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' },
};

const ASSIGN_STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-800' },
  in_progress: { label: 'Berjalan', cls: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]' },
  scheduled: { label: 'Terjadwal', cls: 'bg-slate-100 text-slate-600' },
};

const REPORT_STATUS: Record<string, { label: string; cls: string }> = {
  reviewed: { label: 'Direview', cls: 'bg-emerald-50 text-emerald-800' },
  submitted: { label: 'Menunggu HR', cls: 'bg-amber-50 text-amber-800' },
  rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-800' },
  draft: { label: 'Draf', cls: 'bg-slate-100 text-slate-600' },
};

function StatusPill({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const s = map[status] || { label: SUPERVISION_REPORT_STATUS.find((x) => x.code === status)?.label || status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function CasualWorkforcePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [workers, setWorkers] = useState<any[]>([]);
  const [piecework, setPiecework] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [supReports, setSupReports] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'piecework' | 'assignment' | 'supervisor' | 'report'>('piecework');
  const [form, setForm] = useState<any>({});
  const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [unsupervisedOnly, setUnsupervisedOnly] = useState(false);

  const showToast = (msg: string, type = 'success') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const qs = extra ? `&${extra}` : '';
    const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api/humanify/casual-workforce?action=${action}${qs}`, opts);
    return res.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, w, pw, asg, sup, reports, empList] = await Promise.all([
        api('overview'),
        api('casual-workers'),
        api('piecework', 'GET', undefined, 'status=pending'),
        api('assignments', 'GET', undefined, `date_from=${new Date().toISOString().split('T')[0]}`),
        api('supervisors'),
        api('supervision-reports', 'GET', undefined, `date_from=${new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]}`),
        fetch('/api/humanify/employee-profile?action=genealogy').then(r => r.json()).catch(() => ({ data: { flat: [] } })),
      ]);
      if (ov.success) setStats(ov.data);
      if (w.success) setWorkers(w.data || []);
      if (pw.success) setPiecework(pw.data || []);
      if (asg.success) setAssignments(asg.data || []);
      if (sup.success) setSupervisors(sup.data || []);
      if (reports.success) setSupReports(reports.data || []);
      setAllEmployees(empList?.data?.flat || []);
      const hasLive = (w.data?.length || 0) > 0 || (pw.data?.length || 0) > 0
        || (asg.data?.length || 0) > 0 || (sup.data?.length || 0) > 0
        || (reports.data?.length || 0) > 0 || (ov.data?.totalWorkers || 0) > 0;
      setDataSource(hasLive ? 'live' : 'empty');
    } catch {
      showToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const openModal = (type: typeof modalType, preset: any = {}) => {
    setModalType(type);
    if (type === 'piecework') {
      setForm({ workDate: new Date().toISOString().split('T')[0], unit: 'unit', quantity: 1, unitRate: 0, ...preset });
    } else if (type === 'assignment') {
      setForm({ assignmentDate: new Date().toISOString().split('T')[0], payType: 'daily', expectedHours: 8, ...preset });
    } else if (type === 'supervisor') {
      setForm({ employeeIds: preset.employeeIds || [], supervisorId: preset.supervisorId || '', employeeId: preset.employeeId });
    } else if (type === 'report') {
      setForm({
        reportDate: new Date().toISOString().split('T')[0], shift: 'full',
        supervisorId: preset.supervisorId || '', workers: preset.workers || [],
        ...preset,
      });
    }
    setShowModal(true);
  };

  const saveForm = async (opts?: { submitAfterSave?: boolean }) => {
    if (modalType === 'supervisor') {
      const res = await api('assign-supervisor', 'POST', {
        employeeIds: form.employeeIds?.length ? form.employeeIds : (form.employeeId ? [form.employeeId] : []),
        supervisorId: form.supervisorId || null,
      });
      if (res.success) { showToast(res.message || 'Pengawas ditetapkan'); setShowModal(false); loadData(); }
      else showToast(res.error || 'Gagal', 'error');
      return;
    }
    if (modalType === 'report') {
      const res = await api('supervision-report', 'POST', {
        supervisorId: form.supervisorId, reportDate: form.reportDate, location: form.location,
        shift: form.shift, summary: form.summary, issues: form.issues,
        recommendations: form.recommendations, productivityRating: form.productivityRating,
        safetyIncidents: form.safetyIncidents || 0, workers: form.workers || [],
      });
      if (res.success) {
        if (opts?.submitAfterSave) await api('submit-report', 'POST', { id: res.data?.id });
        showToast(opts?.submitAfterSave ? 'Laporan disimpan dan dikirim' : 'Laporan pengawasan tersimpan');
        setShowModal(false); loadData();
      } else showToast(res.error || 'Gagal', 'error');
      return;
    }
    const action = modalType === 'piecework' ? 'piecework' : 'assignment';
    const body = modalType === 'piecework'
      ? { employeeId: form.employeeId, workDate: form.workDate, description: form.description,
          workType: form.workType, quantity: form.quantity, unit: form.unit, unitRate: form.unitRate, notes: form.notes }
      : { employeeId: form.employeeId, assignmentDate: form.assignmentDate, location: form.location,
          role: form.role, payType: form.payType, dailyRate: form.dailyRate, hourlyRate: form.hourlyRate,
          expectedHours: form.expectedHours, notes: form.notes };
    const res = await api(action, 'POST', body);
    if (res.success) { showToast('Data tersimpan'); setShowModal(false); loadData(); }
    else showToast(res.error || 'Gagal menyimpan', 'error');
  };

  const approveSelected = async () => {
    if (selectedIds.length === 0) return;
    const res = await api('approve-batch', 'POST', { ids: selectedIds });
    if (res.success) { showToast(`${res.count} borongan disetujui`); setSelectedIds([]); loadData(); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tabs = [
    { key: 'overview' as Tab, label: 'Ringkasan', icon: HardHat },
    { key: 'workers' as Tab, label: 'Tenaga Kerja', icon: Users },
    { key: 'supervision' as Tab, label: 'Pengawasan', icon: Shield },
    { key: 'piecework' as Tab, label: 'Borongan', icon: Package },
    { key: 'assignments' as Tab, label: 'Penugasan Harian', icon: MapPin },
  ];

  const supervisorOptions = allEmployees.filter((e: any) =>
    ['SUPERVISOR', 'MANAGER', 'EXECUTIVE'].includes(e.work_role) ||
    /supervisor|manajer|kepala|lead/i.test(e.position || '')
  );

  const q = search.trim().toLowerCase();
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (unsupervisedOnly && w.supervisor_id) return false;
      if (!q) return true;
      const hay = `${w.name || ''} ${w.emp_code || ''} ${w.employee_id || ''} ${w.position || ''} ${w.supervisor_name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [workers, q, unsupervisedOnly]);

  const filteredPiecework = useMemo(() => {
    if (!q) return piecework;
    return piecework.filter((p) =>
      `${p.employee_name || ''} ${p.supervisor_name || ''} ${p.description || ''} ${p.work_type || ''}`.toLowerCase().includes(q)
    );
  }, [piecework, q]);

  const filteredAssignments = useMemo(() => {
    if (!q) return assignments;
    return assignments.filter((a) =>
      `${a.employee_name || ''} ${a.supervisor_name || ''} ${a.location || ''} ${a.role || ''}`.toLowerCase().includes(q)
    );
  }, [assignments, q]);

  const primaryAction = (() => {
    if (tab === 'piecework') return { label: 'Catat Borongan', onClick: () => openModal('piecework'), icon: Plus };
    if (tab === 'assignments') return { label: 'Jadwalkan Penugasan', onClick: () => openModal('assignment'), icon: Plus };
    if (tab === 'workers') return { label: 'Tetapkan Pengawas', onClick: () => openModal('supervisor', { employeeIds: workers.filter(w => !w.supervisor_id).map(w => w.id) }), icon: UserCheck };
    if (tab === 'supervision') return { label: 'Buat Laporan', onClick: () => openModal('report'), icon: Plus };
    return { label: 'Catat Borongan', onClick: () => openModal('piecework'), icon: Plus };
  })();

  const PrimaryIcon = primaryAction.icon;
  const showSearch = tab === 'workers' || tab === 'piecework' || tab === 'assignments';

  return (
    <PageGuard module="hris">
      <HQLayout title="Tenaga Harian & Borongan" subtitle="Karyawan harian, borongan, dan pengawasan lapangan">
        {toast && (
          <div
            role="status"
            className={`fixed top-4 right-4 z-50 rounded-[var(--hf-radius)] px-4 py-3 text-sm text-white shadow-[var(--hf-shadow-md)] ${toast.type === 'error' ? 'bg-[var(--hf-danger)]' : 'bg-[var(--hf-success)]'}`}
          >
            {toast.msg}
          </div>
        )}

        <div className="space-y-6">
          <EnterprisePageHeader
            title="Tenaga Harian & Borongan"
            subtitle="Kelola karyawan harian lepas, upah per jam/hari, borongan, dan laporan pengawas lapangan"
            badge="Workforce"
            icon={HardHat}
            variant="corporate"
            actions={
              <>
                <DataSourceBadge source={dataSource} />
                <button type="button" onClick={loadData} className="hf-btn-secondary inline-flex items-center gap-2">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Segarkan
                </button>
                <button type="button" onClick={primaryAction.onClick} className="hf-btn-primary inline-flex items-center gap-2">
                  <PrimaryIcon className="h-4 w-4" />
                  {primaryAction.label}
                </button>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {loading && Object.keys(stats).length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[108px] animate-pulse hf-card" />
              ))
            ) : (
              <>
                <HRStatCard label="Tenaga harian aktif" value={stats.casualWorkers || 0} icon={Users} accent="violet" onClick={() => setTab('workers')} />
                <HRStatCard label="Tanpa pengawas" value={stats.workersWithoutSupervisor || 0} icon={AlertTriangle} accent="rose" onClick={() => { setTab('workers'); setUnsupervisedOnly(true); }} />
                <HRStatCard label="Pengawas aktif" value={supervisors.length} icon={Shield} accent="indigo" onClick={() => setTab('supervision')} />
                <HRStatCard label="Laporan pending HR" value={stats.pendingSupervisionReports || 0} icon={FileText} accent="amber" onClick={() => setTab('supervision')} />
                <HRStatCard label="Borongan pending" value={stats.pendingPiecework || 0} icon={Package} accent="orange" onClick={() => setTab('piecework')} />
                <HRStatCard label="Penugasan hari ini" value={stats.todayAssignments || 0} icon={MapPin} accent="cyan" onClick={() => setTab('assignments')} />
              </>
            )}
          </div>

          <div className="hf-card overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-[var(--hf-border)] px-2" role="tablist" aria-label="Bagian tenaga harian">
              {tabs.map((item) => {
                const Icon = item.icon;
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setTab(item.key); setSearch(''); if (item.key !== 'workers') setUnsupervisedOnly(false); }}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'border-[var(--hf-brand-600)] text-[color:var(--hf-brand-600)]'
                        : 'border-transparent text-[color:var(--hf-ink-muted)] hover:text-[color:var(--hf-ink)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {item.label}
                  </button>
                );
              })}
            </div>

            <div className="p-4 sm:p-5">
              {tab === 'overview' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { title: 'Per jam / harian', desc: 'Upah dari absensi aktual, diawasi pengawas lapangan', icon: Calendar },
                      { title: 'Per proyek', desc: 'Timesheet disetujui pengawas proyek × tarif', icon: ClipboardList },
                      { title: 'Borongan', desc: 'Diverifikasi pengawas → disetujui HR → payroll', icon: Package },
                      { title: 'Laporan pengawas', desc: 'Laporan harian kehadiran & produktivitas ke HR', icon: Shield },
                    ].map((item) => (
                      <div key={item.title} className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)]/40 p-4">
                        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-semibold text-[color:var(--hf-ink)]">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {supervisors.length > 0 ? (
                    <div>
                      <h2 className="hf-section-label mb-3">Pengawas & tim lapangan</h2>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {supervisors.slice(0, 6).map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setTab('supervision')}
                            className="hf-tile-nested p-3 text-left"
                          >
                            <div className="flex items-start gap-3">
                              <EmployeeAvatar name={s.name} photoUrl={s.photo_url} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[color:var(--hf-ink)]">{s.name}</p>
                                <p className="truncate text-xs text-[color:var(--hf-ink-muted)]">{s.position}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  <span className="text-[color:var(--hf-brand-600)]">{s.casual_worker_count} bawahan</span>
                                  {Number(s.pending_reports) > 0 && (
                                    <span className="text-amber-700">{s.pending_reports} laporan pending</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : !loading ? (
                    <HrisEmptyState
                      source={dataSource}
                      title="Belum ada pengawas lapangan"
                      description="Tetapkan pengawas di tab Tenaga Kerja agar laporan harian dan borongan bisa diverifikasi."
                      action={
                        <button type="button" onClick={() => setTab('workers')} className="hf-btn-primary">
                          Buka tenaga kerja
                        </button>
                      }
                    />
                  ) : null}
                </div>
              )}

              {tab === 'workers' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative min-w-0 flex-1 sm:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama, NIK, jabatan, atau pengawas…"
                        className="hf-input w-full pl-9"
                        aria-label="Cari tenaga kerja"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-[color:var(--hf-ink-secondary)]">
                      <input
                        type="checkbox"
                        checked={unsupervisedOnly}
                        onChange={(e) => setUnsupervisedOnly(e.target.checked)}
                        className="rounded border-[var(--hf-border)]"
                      />
                      Tanpa pengawas saja
                    </label>
                  </div>
                  {filteredWorkers.length === 0 ? (
                    <HrisEmptyState
                      source={dataSource}
                      title={workers.length === 0 ? 'Belum ada tenaga harian' : 'Tidak ada yang cocok'}
                      description={workers.length === 0
                        ? 'Karyawan dengan kategori harian atau borongan akan muncul di sini setelah data master diisi.'
                        : 'Ubah kata kunci atau matikan filter tanpa pengawas.'}
                    />
                  ) : (
                    <div className="hf-table-wrap overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th>Karyawan</th>
                            <th>Pengawas</th>
                            <th>Kategori</th>
                            <th>Tipe gaji</th>
                            <th className="text-right">Tarif harian</th>
                            <th className="text-right">Tarif/jam</th>
                            <th className="text-right">Tarif borongan</th>
                            <th className="text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWorkers.map((w) => (
                            <tr key={w.id}>
                              <td>
                                <div className="flex items-center gap-2.5">
                                  <EmployeeAvatar name={w.name} photoUrl={w.photo_url} size="sm" />
                                  <div>
                                    <p className="font-medium text-[color:var(--hf-ink)]">{w.name}</p>
                                    <p className="text-xs text-[color:var(--hf-ink-faint)]">{w.emp_code || w.employee_id} · {w.position}</p>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {w.supervisor_name ? (
                                  <div>
                                    <p className="text-sm font-medium text-[color:var(--hf-ink)]">{w.supervisor_name}</p>
                                    <p className="text-xs text-[color:var(--hf-ink-faint)]">{w.supervisor_position}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium text-rose-600">Belum ditetapkan</span>
                                )}
                              </td>
                              <td>
                                <span className="inline-flex rounded-full bg-[var(--hf-brand-50)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--hf-brand-600)]">
                                  {getEmploymentCategoryLabel(w.employment_category)}
                                </span>
                              </td>
                              <td>{getPayTypeLabel(w.pay_type)}</td>
                              <td className="text-right tabular-nums">{fmtCur(Number(w.daily_rate))}</td>
                              <td className="text-right tabular-nums">{fmtCur(Number(w.hourly_rate))}</td>
                              <td className="text-right tabular-nums">
                                {Number(w.piece_rate) > 0 ? `${fmtCur(Number(w.piece_rate))}/${getPieceUnitLabel(w.piece_unit)}` : '—'}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  onClick={() => openModal('supervisor', { employeeId: w.id, supervisorId: w.supervisor_id || '' })}
                                  className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                                >
                                  Atur
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'supervision' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)]">
                      <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-4 py-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--hf-ink)]">
                          <Shield className="h-4 w-4 text-[color:var(--hf-brand-600)]" /> Daftar pengawas
                        </h3>
                      </div>
                      {supervisors.length === 0 ? (
                        <div className="p-4">
                          <HrisEmptyState
                            source={dataSource}
                            title="Belum ada pengawas"
                            description="Tetapkan atasan di tab Tenaga Kerja."
                          />
                        </div>
                      ) : (
                        <div className="hf-table-wrap !rounded-none !border-0 !shadow-none">
                          <table>
                            <thead>
                              <tr>
                                <th>Pengawas</th>
                                <th className="text-right">Bawahan</th>
                                <th className="text-right">Laporan</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {supervisors.map((s: any) => (
                                <tr key={s.id}>
                                  <td>
                                    <div className="flex items-center gap-2.5">
                                      <EmployeeAvatar name={s.name} photoUrl={s.photo_url} size="xs" />
                                      <div>
                                        <p className="font-medium text-[color:var(--hf-ink)]">{s.name}</p>
                                        <p className="text-xs text-[color:var(--hf-ink-faint)]">{s.position}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-right font-medium tabular-nums">{s.casual_worker_count}</td>
                                  <td className="text-right">
                                    {Number(s.pending_reports) > 0 ? (
                                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                        {s.pending_reports} pending
                                      </span>
                                    ) : <span className="text-[color:var(--hf-ink-faint)]">—</span>}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const supWorkers = workers.filter(w => w.supervisor_id === s.id).map((w: any) => ({
                                          employeeId: w.id, attendanceStatus: 'present', hoursWorked: 8, pieceworkVerified: false,
                                        }));
                                        openModal('report', { supervisorId: s.id, workers: supWorkers });
                                      }}
                                      className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                                    >
                                      + Laporan
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)]">
                      <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-4 py-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--hf-ink)]">
                          <FileText className="h-4 w-4 text-[color:var(--hf-brand-600)]" /> Laporan pengawasan
                        </h3>
                        <button type="button" onClick={() => openModal('report')} className="hf-btn-primary text-xs !px-3 !py-1.5">
                          Buat laporan
                        </button>
                      </div>
                      <div className="max-h-96 divide-y divide-[var(--hf-border-subtle)] overflow-y-auto">
                        {supReports.map((r: any) => (
                          <div key={r.id} className="px-4 py-3 hover:bg-[var(--hf-surface-muted)]/50">
                            <div className="flex justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[color:var(--hf-ink)]">{r.supervisor_name}</p>
                                <p className="text-xs text-[color:var(--hf-ink-muted)]">{fmtDate(r.report_date)} · {r.location || 'Lokasi tidak dicatat'}</p>
                                <p className="mt-1 text-xs text-[color:var(--hf-ink-secondary)]">
                                  Hadir: {r.total_workers_present}/{r.total_workers_scheduled}
                                  {r.productivity_rating && ` · Produktivitas: ${r.productivity_rating}/5`}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <StatusPill status={r.status} map={REPORT_STATUS} />
                                {r.status === 'submitted' && (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api('review-report', 'POST', { id: r.id, approved: true });
                                        showToast('Laporan disetujui'); loadData();
                                      }}
                                      className="text-xs font-medium text-emerald-700 hover:underline"
                                    >
                                      Setujui
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await api('review-report', 'POST', { id: r.id, approved: false });
                                        showToast('Laporan ditolak', 'error'); loadData();
                                      }}
                                      className="text-xs font-medium text-rose-700 hover:underline"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                )}
                                {r.status === 'draft' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api('submit-report', 'POST', { id: r.id });
                                      showToast('Laporan dikirim'); loadData();
                                    }}
                                    className="inline-flex items-center gap-0.5 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
                                  >
                                    <Send className="h-3 w-3" /> Kirim
                                  </button>
                                )}
                              </div>
                            </div>
                            {r.summary && <p className="mt-1 line-clamp-2 text-xs text-[color:var(--hf-ink-muted)]">{r.summary}</p>}
                          </div>
                        ))}
                        {supReports.length === 0 && (
                          <div className="p-4">
                            <HrisEmptyState
                              source={dataSource}
                              title="Belum ada laporan pengawasan"
                              description="Pengawas mengirim laporan harian kehadiran dan produktivitas dari sini."
                              action={
                                <button type="button" onClick={() => openModal('report')} className="hf-btn-primary">
                                  Buat laporan
                                </button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)]/40 p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[color:var(--hf-ink)]">
                      <Eye className="h-4 w-4 text-[color:var(--hf-brand-600)]" /> Alur pengawasan
                    </p>
                    <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed text-[color:var(--hf-ink-muted)]">
                      <li>HR tetapkan <strong className="font-medium text-[color:var(--hf-ink)]">pengawas</strong> per tenaga harian — terhubung ke genealogi karyawan</li>
                      <li>Pengawas jadwalkan <strong className="font-medium text-[color:var(--hf-ink)]">penugasan harian</strong> dan verifikasi <strong className="font-medium text-[color:var(--hf-ink)]">borongan</strong></li>
                      <li>Pengawas kirim <strong className="font-medium text-[color:var(--hf-ink)]">laporan harian</strong>: kehadiran, produktivitas, insiden keselamatan</li>
                      <li>HR review laporan → data masuk payroll &amp; analitik tenaga kerja</li>
                    </ol>
                  </div>
                </div>
              )}

              {tab === 'piecework' && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative min-w-0 flex-1 sm:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari karyawan, pekerjaan, atau pengawas…"
                        className="hf-input w-full pl-9"
                        aria-label="Cari borongan"
                      />
                    </div>
                    {selectedIds.length > 0 && (
                      <button type="button" onClick={approveSelected} className="inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                        <Check className="h-4 w-4" /> Setujui ({selectedIds.length})
                      </button>
                    )}
                  </div>
                  {filteredPiecework.length === 0 ? (
                    <HrisEmptyState
                      source={dataSource}
                      title={piecework.length === 0 ? 'Belum ada data borongan' : 'Tidak ada yang cocok'}
                      description="Catat hasil kerja satuan. Setelah pengawas verifikasi, HR menyetujui sebelum masuk payroll."
                      action={piecework.length === 0 ? (
                        <button type="button" onClick={() => openModal('piecework')} className="hf-btn-primary inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" /> Catat borongan
                        </button>
                      ) : undefined}
                    />
                  ) : (
                    <div className="hf-table-wrap overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th className="w-8" />
                            <th>Tanggal</th>
                            <th>Karyawan</th>
                            <th>Pengawas</th>
                            <th>Pekerjaan</th>
                            <th className="text-right">Qty</th>
                            <th className="text-right">Tarif</th>
                            <th className="text-right">Total</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPiecework.map((p) => (
                            <tr key={p.id}>
                              <td>
                                {p.status === 'pending' && (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(p.id)}
                                    onChange={() => toggleSelect(p.id)}
                                    className="rounded border-[var(--hf-border)]"
                                    aria-label={`Pilih borongan ${p.employee_name}`}
                                  />
                                )}
                              </td>
                              <td>{fmtDate(p.work_date)}</td>
                              <td className="font-medium text-[color:var(--hf-ink)]">{p.employee_name}</td>
                              <td className="text-xs">{p.supervisor_name || '—'}</td>
                              <td>{p.description || p.work_type || '—'}</td>
                              <td className="text-right tabular-nums">{p.quantity} {getPieceUnitLabel(p.unit)}</td>
                              <td className="text-right tabular-nums">{fmtCur(Number(p.unit_rate))}</td>
                              <td className="text-right font-medium tabular-nums text-[color:var(--hf-ink)]">{fmtCur(Number(p.total_amount))}</td>
                              <td><StatusPill status={p.status} map={PIECE_STATUS} /></td>
                              <td>
                                {p.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await api('approve-piecework', 'POST', { id: p.id });
                                      showToast('Disetujui'); loadData();
                                    }}
                                    className="text-xs font-medium text-emerald-700 hover:underline"
                                  >
                                    Setujui
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'assignments' && (
                <div className="space-y-4">
                  {showSearch && (
                    <div className="relative sm:max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[color:var(--hf-ink-faint)]" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari karyawan, lokasi, atau peran…"
                        className="hf-input w-full pl-9"
                        aria-label="Cari penugasan"
                      />
                    </div>
                  )}
                  {filteredAssignments.length === 0 ? (
                    <HrisEmptyState
                      source={dataSource}
                      title={assignments.length === 0 ? 'Belum ada penugasan' : 'Tidak ada yang cocok'}
                      description="Jadwalkan lokasi dan tarif harian atau per jam untuk tenaga lepas hari ini."
                      action={assignments.length === 0 ? (
                        <button type="button" onClick={() => openModal('assignment')} className="hf-btn-primary inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" /> Jadwalkan penugasan
                        </button>
                      ) : undefined}
                    />
                  ) : (
                    <div className="hf-table-wrap overflow-x-auto">
                      <table>
                        <thead>
                          <tr>
                            <th>Tanggal</th>
                            <th>Karyawan</th>
                            <th>Pengawas</th>
                            <th>Lokasi</th>
                            <th>Peran</th>
                            <th>Tipe gaji</th>
                            <th className="text-right">Tarif</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAssignments.map((a) => (
                            <tr key={a.id}>
                              <td>{fmtDate(a.assignment_date)}</td>
                              <td className="font-medium text-[color:var(--hf-ink)]">{a.employee_name}</td>
                              <td className="text-xs">{a.supervisor_name || '—'}</td>
                              <td>{a.location || '—'}</td>
                              <td>{a.role || '—'}</td>
                              <td>{getPayTypeLabel(a.pay_type)}</td>
                              <td className="text-right tabular-nums">
                                {a.pay_type === 'hourly' ? `${fmtCur(Number(a.hourly_rate))}/jam` : `${fmtCur(Number(a.daily_rate))}/hari`}
                              </td>
                              <td><StatusPill status={a.status} map={ASSIGN_STATUS} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setShowModal(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="casual-modal-title"
              className={`w-full hf-card ${modalType === 'report' ? 'max-w-lg' : 'max-w-md'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--hf-border)] px-5 py-4">
                <h3 id="casual-modal-title" className="text-sm font-semibold text-[color:var(--hf-ink)]">
                  {modalType === 'piecework' ? 'Catat borongan' :
                   modalType === 'assignment' ? 'Jadwalkan penugasan' :
                   modalType === 'supervisor' ? 'Tetapkan pengawas' : 'Laporan pengawasan harian'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="rounded-[var(--hf-radius)] p-1 hover:bg-[var(--hf-surface-muted)]" aria-label="Tutup">
                  <X className="h-5 w-5 text-[color:var(--hf-ink-faint)]" />
                </button>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
                {modalType === 'supervisor' && (
                  <>
                    <Field label="Pengawas (atasan langsung) *">
                      <select value={form.supervisorId || ''} onChange={e => setForm((f: any) => ({ ...f, supervisorId: e.target.value }))} className="hf-input w-full">
                        <option value="">Pilih pengawas…</option>
                        {(supervisorOptions.length > 0 ? supervisorOptions : allEmployees).map((e: any) => (
                          <option key={e.id} value={e.id}>{e.name} — {e.position}</option>
                        ))}
                      </select>
                    </Field>
                    {!form.employeeId && (
                      <div>
                        <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Karyawan tanpa pengawas</span>
                        <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-[var(--hf-radius)] border border-[var(--hf-border)] p-2">
                          {workers.filter(w => !w.supervisor_id).map(w => (
                            <label key={w.id} className="flex items-center gap-2 text-sm text-[color:var(--hf-ink)]">
                              <input
                                type="checkbox"
                                checked={(form.employeeIds || []).includes(w.id)}
                                onChange={e => setForm((f: any) => ({
                                  ...f, employeeIds: e.target.checked
                                    ? [...(f.employeeIds || []), w.id]
                                    : (f.employeeIds || []).filter((id: string) => id !== w.id)
                                }))}
                                className="rounded border-[var(--hf-border)]"
                              />
                              {w.name}
                            </label>
                          ))}
                          {workers.filter(w => !w.supervisor_id).length === 0 && (
                            <p className="px-1 py-2 text-xs text-[color:var(--hf-ink-muted)]">Semua tenaga harian sudah punya pengawas.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {modalType === 'report' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Pengawas *">
                        <select
                          value={form.supervisorId || ''}
                          onChange={e => {
                            const supId = e.target.value;
                            const supWorkers = workers.filter(w => w.supervisor_id === supId).map((w: any) => ({
                              employeeId: w.id, attendanceStatus: 'present', hoursWorked: 8,
                            }));
                            setForm((f: any) => ({ ...f, supervisorId: supId, workers: supWorkers }));
                          }}
                          className="hf-input w-full"
                        >
                          <option value="">Pilih pengawas…</option>
                          {supervisors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Tanggal *">
                        <input type="date" value={form.reportDate || ''} onChange={e => setForm((f: any) => ({ ...f, reportDate: e.target.value }))} className="hf-input w-full" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Lokasi">
                        <input type="text" value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} className="hf-input w-full" />
                      </Field>
                      <Field label="Shift">
                        <select value={form.shift || 'full'} onChange={e => setForm((f: any) => ({ ...f, shift: e.target.value }))} className="hf-input w-full">
                          {FIELD_SHIFTS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Ringkasan kegiatan">
                      <textarea value={form.summary || ''} onChange={e => setForm((f: any) => ({ ...f, summary: e.target.value }))} className="hf-input w-full" rows={2} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Rating produktivitas (1–5)">
                        <input type="number" min={1} max={5} step={0.1} value={form.productivityRating || ''} onChange={e => setForm((f: any) => ({ ...f, productivityRating: e.target.value }))} className="hf-input w-full" />
                      </Field>
                      <Field label="Insiden keselamatan">
                        <input type="number" min={0} value={form.safetyIncidents || 0} onChange={e => setForm((f: any) => ({ ...f, safetyIncidents: e.target.value }))} className="hf-input w-full" />
                      </Field>
                    </div>
                    {(form.workers || []).length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Verifikasi kehadiran bawahan</span>
                        <div className="mt-1 max-h-48 divide-y divide-[var(--hf-border-subtle)] overflow-y-auto rounded-[var(--hf-radius)] border border-[var(--hf-border)]">
                          {(form.workers || []).map((w: any, idx: number) => {
                            const emp = workers.find(ew => ew.id === w.employeeId);
                            return (
                              <div key={w.employeeId} className="flex items-center gap-2 px-3 py-2 text-sm">
                                <span className="min-w-0 flex-1 truncate">{emp?.name || w.employeeId}</span>
                                <select
                                  value={w.attendanceStatus || 'present'}
                                  onChange={e => {
                                    const updated = [...form.workers];
                                    updated[idx] = { ...w, attendanceStatus: e.target.value };
                                    setForm((f: any) => ({ ...f, workers: updated }));
                                  }}
                                  className="hf-input !px-1.5 !py-1 text-xs"
                                >
                                  {SUPERVISION_ATTENDANCE.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                                </select>
                                <input
                                  type="number"
                                  placeholder="jam"
                                  aria-label={`Jam kerja ${emp?.name || w.employeeId}`}
                                  value={w.hoursWorked || ''}
                                  onChange={e => {
                                    const updated = [...form.workers];
                                    updated[idx] = { ...w, hoursWorked: e.target.value };
                                    setForm((f: any) => ({ ...f, workers: updated }));
                                  }}
                                  className="hf-input w-14 !px-1.5 !py-1 text-xs"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(modalType === 'piecework' || modalType === 'assignment') && (
                  <>
                    <Field label="Karyawan *">
                      <select value={form.employeeId || ''} onChange={e => setForm((f: any) => ({ ...f, employeeId: e.target.value }))} className="hf-input w-full">
                        <option value="">Pilih karyawan…</option>
                        {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.emp_code})</option>)}
                      </select>
                    </Field>
                    {modalType === 'piecework' ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Tanggal *">
                            <input type="date" value={form.workDate || ''} onChange={e => setForm((f: any) => ({ ...f, workDate: e.target.value }))} className="hf-input w-full" />
                          </Field>
                          <Field label="Jenis pekerjaan">
                            <input type="text" value={form.workType || ''} onChange={e => setForm((f: any) => ({ ...f, workType: e.target.value }))} className="hf-input w-full" placeholder="mis. packing" />
                          </Field>
                        </div>
                        <Field label="Deskripsi">
                          <input type="text" value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="hf-input w-full" />
                        </Field>
                        <div className="grid grid-cols-3 gap-3">
                          <Field label="Kuantitas *">
                            <input type="number" value={form.quantity || ''} onChange={e => setForm((f: any) => ({ ...f, quantity: e.target.value }))} className="hf-input w-full" />
                          </Field>
                          <Field label="Satuan">
                            <select value={form.unit || 'unit'} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} className="hf-input w-full">
                              {PIECE_UNITS.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}
                            </select>
                          </Field>
                          <Field label="Tarif/satuan *">
                            <input type="number" value={form.unitRate || ''} onChange={e => setForm((f: any) => ({ ...f, unitRate: e.target.value }))} className="hf-input w-full" />
                          </Field>
                        </div>
                        {form.quantity && form.unitRate && (
                          <p className="text-sm font-medium text-emerald-700">
                            Total: {fmtCur(Math.round(parseFloat(form.quantity) * parseFloat(form.unitRate)))}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Tanggal *">
                            <input type="date" value={form.assignmentDate || ''} onChange={e => setForm((f: any) => ({ ...f, assignmentDate: e.target.value }))} className="hf-input w-full" />
                          </Field>
                          <Field label="Tipe gaji">
                            <select value={form.payType || 'daily'} onChange={e => setForm((f: any) => ({ ...f, payType: e.target.value }))} className="hf-input w-full">
                              {PAY_TYPES.filter(p => ['daily', 'hourly', 'project'].includes(p.code)).map(p =>
                                <option key={p.code} value={p.code}>{p.label}</option>)}
                            </select>
                          </Field>
                        </div>
                        <Field label="Lokasi">
                          <input type="text" value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} className="hf-input w-full" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Tarif harian">
                            <input type="number" value={form.dailyRate || ''} onChange={e => setForm((f: any) => ({ ...f, dailyRate: e.target.value }))} className="hf-input w-full" />
                          </Field>
                          <Field label="Tarif/jam">
                            <input type="number" value={form.hourlyRate || ''} onChange={e => setForm((f: any) => ({ ...f, hourlyRate: e.target.value }))} className="hf-input w-full" />
                          </Field>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-[var(--hf-border)] px-5 py-4">
                <button type="button" onClick={() => setShowModal(false)} className="hf-btn-secondary">Batal</button>
                {modalType === 'report' && (
                  <button
                    type="button"
                    onClick={() => saveForm({ submitAfterSave: true })}
                    className="inline-flex items-center gap-2 rounded-[var(--hf-radius)] bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <Send className="h-4 w-4" /> Simpan & kirim
                  </button>
                )}
                <button type="button" onClick={() => saveForm()} className="hf-btn-primary inline-flex items-center gap-2">
                  <Save className="h-4 w-4" /> Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
