import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { useTranslation } from '@/lib/i18n';
import { PageGuard } from '@/components/permissions';
import {
  HardHat, Users, ClipboardList, CheckCircle, Plus, RefreshCw,
  Calendar, DollarSign, Package, MapPin, X, Save, Trash2, Check,
  Shield, FileText, Send, Eye, UserCheck, AlertTriangle, Star,
} from 'lucide-react';
import {
  EMPLOYMENT_CATEGORIES, PAY_TYPES, PIECE_UNITS,
  FIELD_SHIFTS, SUPERVISION_ATTENDANCE, SUPERVISION_REPORT_STATUS,
  getEmploymentCategoryLabel, getPayTypeLabel, getPieceUnitLabel,
} from '@/lib/hris/workforce-types';

const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-';

type Tab = 'overview' | 'workers' | 'supervision' | 'piecework' | 'assignments';

export default function CasualWorkforcePage() {
  const { t } = useTranslation();
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

  const showToast = (msg: string, type = 'success') => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
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
    } catch (e) {
      showToast('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = (type: typeof modalType, preset: any = {}) => {
    setModalType(type);
    if (type === 'piecework') {
      setForm({ workDate: new Date().toISOString().split('T')[0], unit: 'unit', quantity: 1, unitRate: 0, ...preset });
    } else if (type === 'assignment') {
      setForm({ assignmentDate: new Date().toISOString().split('T')[0], payType: 'daily', expectedHours: 8, ...preset });
    } else if (type === 'supervisor') {
      setForm({ employeeIds: preset.employeeIds || [], supervisorId: preset.supervisorId || '' });
    } else if (type === 'report') {
      setForm({
        reportDate: new Date().toISOString().split('T')[0], shift: 'full',
        supervisorId: preset.supervisorId || '', workers: preset.workers || [],
        ...preset,
      });
    }
    setShowModal(true);
  };

  const saveForm = async () => {
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
        if (form.submitAfterSave) await api('submit-report', 'POST', { id: res.data?.id });
        showToast('Laporan pengawasan tersimpan'); setShowModal(false); loadData();
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

  const statusLabel = (code: string) =>
    SUPERVISION_REPORT_STATUS.find(s => s.code === code)?.label || code;

  return (
    <PageGuard module="hris">
      <HQLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {toast && (
            <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
              {toast.msg}
            </div>
          )}

          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HardHat className="w-7 h-7 text-amber-600" />
                Tenaga Harian & Borongan
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Kelola karyawan harian lepas, buruh, penggajian per jam/hari/proyek, dan sistem borongan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            </div>
          </div>

          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-indigo-800">Untuk perusahaan pembiayaan / multifinance (AO, Kolektor, Surveyor, komisi penagihan):</span>
            {/* Modul pembiayaan tidak tersedia di Humanify standalone */}
          </div>

          {/* Mekanisme info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            {[
              { title: 'Per Jam / Harian', desc: 'Upah dari absensi aktual, diawasi pengawas lapangan', icon: Calendar, bg: 'bg-violet-50 border-violet-100', ic: 'text-violet-600' },
              { title: 'Per Proyek', desc: 'Timesheet disetujui pengawas proyek × tarif', icon: ClipboardList, bg: 'bg-purple-50 border-purple-100', ic: 'text-purple-600' },
              { title: 'Borongan', desc: 'Diverifikasi pengawas → disetujui HR → payroll', icon: Package, bg: 'bg-amber-50 border-amber-100', ic: 'text-amber-600' },
              { title: 'Laporan Pengawas', desc: 'Pengawas kirim laporan harian kehadiran & produktivitas', icon: Shield, bg: 'bg-green-50 border-green-100', ic: 'text-green-600' },
            ].map(item => (
              <div key={item.title} className={`${item.bg} border rounded-xl p-4`}>
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={`w-4 h-4 ${item.ic}`} />
                  <span className="font-semibold text-sm text-gray-800">{item.title}</span>
                </div>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Tenaga Harian Aktif', value: stats.casualWorkers || 0, icon: Users, color: 'text-violet-600' },
                  { label: 'Tanpa Pengawas', value: stats.workersWithoutSupervisor || 0, icon: AlertTriangle, color: 'text-red-600' },
                  { label: 'Pengawas Aktif', value: supervisors.length, icon: Shield, color: 'text-indigo-600' },
                  { label: 'Laporan Pending HR', value: stats.pendingSupervisionReports || 0, icon: FileText, color: 'text-orange-600' },
                  { label: 'Borongan Pending', value: stats.pendingPiecework || 0, icon: Package, color: 'text-amber-600' },
                  { label: 'Penugasan Hari Ini', value: stats.todayAssignments || 0, icon: MapPin, color: 'text-purple-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white border rounded-xl p-4 shadow-sm">
                    <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {supervisors.length > 0 && (
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" /> Pengawas & Tim Lapangan
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {supervisors.slice(0, 6).map((s: any) => (
                      <div key={s.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.position}</p>
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="text-violet-700">{s.casual_worker_count} bawahan</span>
                          {Number(s.pending_reports) > 0 && (
                            <span className="text-orange-600">{s.pending_reports} laporan pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workers */}
          {tab === 'workers' && (
            <div>
              <div className="flex justify-end mb-3">
                <button onClick={() => openModal('supervisor', { employeeIds: workers.filter(w => !w.supervisor_id).map(w => w.id) })}
                  className="flex items-center gap-2 px-3 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm hover:bg-indigo-50">
                  <UserCheck className="w-4 h-4" /> Tetapkan Pengawas
                </button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">Karyawan</th>
                    <th className="px-4 py-3 text-left">Pengawas</th>
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-left">Tipe Gaji</th>
                    <th className="px-4 py-3 text-right">Tarif Harian</th>
                    <th className="px-4 py-3 text-right">Tarif/Jam</th>
                    <th className="px-4 py-3 text-right">Tarif Borongan</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {workers.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{w.name}</p>
                        <p className="text-xs text-gray-400">{w.emp_code || w.employee_id} · {w.position}</p>
                      </td>
                      <td className="px-4 py-3">
                        {w.supervisor_name ? (
                          <div>
                            <p className="text-sm font-medium text-indigo-700">{w.supervisor_name}</p>
                            <p className="text-xs text-gray-400">{w.supervisor_position}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500">Belum ditetapkan</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                          {getEmploymentCategoryLabel(w.employment_category)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{getPayTypeLabel(w.pay_type)}</td>
                      <td className="px-4 py-3 text-right">{fmtCur(Number(w.daily_rate))}</td>
                      <td className="px-4 py-3 text-right">{fmtCur(Number(w.hourly_rate))}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(w.piece_rate) > 0 ? `${fmtCur(Number(w.piece_rate))}/${getPieceUnitLabel(w.piece_unit)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openModal('supervisor', { employeeId: w.id, supervisorId: w.supervisor_id || '' })}
                          className="text-xs text-indigo-600 hover:underline">Atur</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workers.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada tenaga harian terdaftar</p>}
            </div>
            </div>
          )}

          {/* Supervision */}
          {tab === 'supervision' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Supervisors list */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-indigo-50 flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-indigo-900 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Daftar Pengawas
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 text-left">Pengawas</th>
                        <th className="px-4 py-2 text-right">Bawahan</th>
                        <th className="px-4 py-2 text-right">Laporan</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {supervisors.map((s: any) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.position}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{s.casual_worker_count}</td>
                          <td className="px-4 py-3 text-right">
                            {Number(s.pending_reports) > 0 ? (
                              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{s.pending_reports} pending</span>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => {
                              const supWorkers = workers.filter(w => w.supervisor_id === s.id).map((w: any) => ({
                                employeeId: w.id, attendanceStatus: 'present', hoursWorked: 8, pieceworkVerified: false,
                              }));
                              openModal('report', { supervisorId: s.id, workers: supWorkers });
                            }} className="text-xs text-indigo-600 hover:underline">+ Laporan</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {supervisors.length === 0 && (
                    <p className="text-center text-gray-400 py-6 text-sm">
                      Belum ada pengawas. Tetapkan atasan di tab Tenaga Kerja.
                    </p>
                  )}
                </div>

                {/* Supervision reports */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-green-50 flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-green-900 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Laporan Pengawasan
                    </h3>
                    <button onClick={() => openModal('report')} className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg">
                      + Buat Laporan
                    </button>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {supReports.map((r: any) => (
                      <div key={r.id} className="px-4 py-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{r.supervisor_name}</p>
                            <p className="text-xs text-gray-500">{fmtDate(r.report_date)} · {r.location || 'Lokasi tidak dicatat'}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Hadir: {r.total_workers_present}/{r.total_workers_scheduled}
                              {r.productivity_rating && ` · Produktivitas: ${r.productivity_rating}/5`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              r.status === 'reviewed' ? 'bg-green-100 text-green-700' :
                              r.status === 'submitted' ? 'bg-orange-100 text-orange-700' :
                              r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                            }`}>{statusLabel(r.status)}</span>
                            {r.status === 'submitted' && (
                              <div className="flex gap-1">
                                <button onClick={async () => {
                                  await api('review-report', 'POST', { id: r.id, approved: true });
                                  showToast('Laporan disetujui'); loadData();
                                }} className="text-xs text-green-600 hover:underline">Setujui</button>
                                <button onClick={async () => {
                                  await api('review-report', 'POST', { id: r.id, approved: false });
                                  showToast('Laporan ditolak', 'error'); loadData();
                                }} className="text-xs text-red-600 hover:underline">Tolak</button>
                              </div>
                            )}
                            {r.status === 'draft' && (
                              <button onClick={async () => {
                                await api('submit-report', 'POST', { id: r.id });
                                showToast('Laporan dikirim'); loadData();
                              }} className="text-xs text-violet-600 hover:underline flex items-center gap-0.5">
                                <Send className="w-3 h-3" /> Kirim
                              </button>
                            )}
                          </div>
                        </div>
                        {r.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.summary}</p>}
                      </div>
                    ))}
                    {supReports.length === 0 && (
                      <p className="text-center text-gray-400 py-6 text-sm">Belum ada laporan pengawasan</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mekanisme pengawasan */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-900">
                <p className="font-semibold mb-2 flex items-center gap-2"><Eye className="w-4 h-4" /> Alur Pengawasan</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-indigo-800">
                  <li>HR tetapkan <strong>pengawas</strong> (supervisor) per tenaga harian — terhubung ke Genealogi Karyawan</li>
                  <li>Pengawas jadwalkan <strong>penugasan harian</strong> dan verifikasi <strong>borongan</strong> bawahan</li>
                  <li>Pengawas kirim <strong>laporan harian</strong>: kehadiran, produktivitas, insiden keselamatan</li>
                  <li>HR review laporan → data masuk payroll &amp; workforce analytics</li>
                </ol>
              </div>
            </div>
          )}

          {/* Piecework */}
          {tab === 'piecework' && (
            <div>
              <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                  {selectedIds.length > 0 && (
                    <button onClick={approveSelected} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm">
                      <Check className="w-4 h-4" /> Setujui ({selectedIds.length})
                    </button>
                  )}
                </div>
                <button onClick={() => openModal('piecework')} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">
                  <Plus className="w-4 h-4" /> Catat Borongan
                </button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Karyawan</th>
                      <th className="px-4 py-3 text-left">Pengawas</th>
                      <th className="px-4 py-3 text-left">Pekerjaan</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Tarif</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {piecework.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {p.status === 'pending' && (
                            <input type="checkbox" checked={selectedIds.includes(p.id)}
                              onChange={() => toggleSelect(p.id)} className="rounded" />
                          )}
                        </td>
                        <td className="px-4 py-3">{fmtDate(p.work_date)}</td>
                        <td className="px-4 py-3">{p.employee_name}</td>
                        <td className="px-4 py-3 text-xs text-indigo-700">{p.supervisor_name || '—'}</td>
                        <td className="px-4 py-3">{p.description || p.work_type || '-'}</td>
                        <td className="px-4 py-3 text-right">{p.quantity} {getPieceUnitLabel(p.unit)}</td>
                        <td className="px-4 py-3 text-right">{fmtCur(Number(p.unit_rate))}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmtCur(Number(p.total_amount))}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            p.status === 'approved' ? 'bg-green-100 text-green-700' :
                            p.status === 'paid' ? 'bg-violet-100 text-violet-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {p.status === 'pending' && (
                            <button onClick={async () => {
                              await api('approve-piecework', 'POST', { id: p.id });
                              showToast('Disetujui'); loadData();
                            }} className="text-xs text-green-600 hover:underline">Setujui</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {piecework.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada data borongan</p>}
              </div>
            </div>
          )}

          {/* Assignments */}
          {tab === 'assignments' && (
            <div>
              <div className="flex justify-end mb-4">
                <button onClick={() => openModal('assignment')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">
                  <Plus className="w-4 h-4" /> Jadwalkan Penugasan
                </button>
              </div>
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Karyawan</th>
                      <th className="px-4 py-3 text-left">Pengawas</th>
                      <th className="px-4 py-3 text-left">Lokasi</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Tipe Gaji</th>
                      <th className="px-4 py-3 text-right">Tarif</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{fmtDate(a.assignment_date)}</td>
                        <td className="px-4 py-3">{a.employee_name}</td>
                        <td className="px-4 py-3 text-xs text-indigo-700">{a.supervisor_name || '—'}</td>
                        <td className="px-4 py-3">{a.location || '-'}</td>
                        <td className="px-4 py-3">{a.role || '-'}</td>
                        <td className="px-4 py-3">{getPayTypeLabel(a.pay_type)}</td>
                        <td className="px-4 py-3 text-right">
                          {a.pay_type === 'hourly' ? fmtCur(Number(a.hourly_rate)) + '/jam' : fmtCur(Number(a.daily_rate)) + '/hari'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            a.status === 'completed' ? 'bg-green-100 text-green-700' :
                            a.status === 'in_progress' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                          }`}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assignments.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada penugasan</p>}
              </div>
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center px-5 py-4 border-b">
                  <h3 className="font-semibold">
                    {modalType === 'piecework' ? 'Catat Borongan' :
                     modalType === 'assignment' ? 'Jadwalkan Penugasan' :
                     modalType === 'supervisor' ? 'Tetapkan Pengawas' : 'Laporan Pengawasan Harian'}
                  </h3>
                  <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                  {modalType === 'supervisor' && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500">Pengawas (Atasan Langsung) *</label>
                        <select value={form.supervisorId || ''} onChange={e => setForm((f: any) => ({ ...f, supervisorId: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                          <option value="">Pilih pengawas...</option>
                          {(supervisorOptions.length > 0 ? supervisorOptions : allEmployees).map((e: any) => (
                            <option key={e.id} value={e.id}>{e.name} — {e.position}</option>
                          ))}
                        </select>
                      </div>
                      {!form.employeeId && (
                        <div>
                          <label className="text-xs text-gray-500">Karyawan (pilih yang belum punya pengawas)</label>
                          <div className="mt-1 max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                            {workers.filter(w => !w.supervisor_id).map(w => (
                              <label key={w.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={(form.employeeIds || []).includes(w.id)}
                                  onChange={e => setForm((f: any) => ({
                                    ...f, employeeIds: e.target.checked
                                      ? [...(f.employeeIds || []), w.id]
                                      : (f.employeeIds || []).filter((id: string) => id !== w.id)
                                  }))} />
                                {w.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {modalType === 'report' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Pengawas *</label>
                          <select value={form.supervisorId || ''} onChange={e => {
                            const supId = e.target.value;
                            const supWorkers = workers.filter(w => w.supervisor_id === supId).map((w: any) => ({
                              employeeId: w.id, attendanceStatus: 'present', hoursWorked: 8,
                            }));
                            setForm((f: any) => ({ ...f, supervisorId: supId, workers: supWorkers }));
                          }} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                            <option value="">Pilih pengawas...</option>
                            {supervisors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tanggal *</label>
                          <input type="date" value={form.reportDate || ''} onChange={e => setForm((f: any) => ({ ...f, reportDate: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Lokasi</label>
                          <input type="text" value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Shift</label>
                          <select value={form.shift || 'full'} onChange={e => setForm((f: any) => ({ ...f, shift: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                            {FIELD_SHIFTS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Ringkasan Kegiatan</label>
                        <textarea value={form.summary || ''} onChange={e => setForm((f: any) => ({ ...f, summary: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Rating Produktivitas (1-5)</label>
                          <input type="number" min={1} max={5} step={0.1} value={form.productivityRating || ''}
                            onChange={e => setForm((f: any) => ({ ...f, productivityRating: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Insiden Keselamatan</label>
                          <input type="number" min={0} value={form.safetyIncidents || 0}
                            onChange={e => setForm((f: any) => ({ ...f, safetyIncidents: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                      </div>
                      {(form.workers || []).length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500 font-medium">Verifikasi Kehadiran Bawahan</label>
                          <div className="mt-1 border rounded-lg divide-y max-h-48 overflow-y-auto">
                            {(form.workers || []).map((w: any, idx: number) => {
                              const emp = workers.find(ew => ew.id === w.employeeId);
                              return (
                                <div key={w.employeeId} className="px-3 py-2 flex items-center gap-2 text-sm">
                                  <span className="flex-1 truncate">{emp?.name || w.employeeId}</span>
                                  <select value={w.attendanceStatus || 'present'}
                                    onChange={e => {
                                      const updated = [...form.workers];
                                      updated[idx] = { ...w, attendanceStatus: e.target.value };
                                      setForm((f: any) => ({ ...f, workers: updated }));
                                    }} className="text-xs border rounded px-1 py-0.5">
                                    {SUPERVISION_ATTENDANCE.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                                  </select>
                                  <input type="number" placeholder="jam" value={w.hoursWorked || ''}
                                    onChange={e => {
                                      const updated = [...form.workers];
                                      updated[idx] = { ...w, hoursWorked: e.target.value };
                                      setForm((f: any) => ({ ...f, workers: updated }));
                                    }} className="w-14 text-xs border rounded px-1 py-0.5" />
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
                  <div>
                    <label className="text-xs text-gray-500">Karyawan *</label>
                    <select value={form.employeeId || ''} onChange={e => setForm((f: any) => ({ ...f, employeeId: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="">Pilih karyawan...</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.emp_code})</option>)}
                    </select>
                  </div>
                  {modalType === 'piecework' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Tanggal *</label>
                          <input type="date" value={form.workDate || ''} onChange={e => setForm((f: any) => ({ ...f, workDate: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Jenis Pekerjaan</label>
                          <input type="text" value={form.workType || ''} onChange={e => setForm((f: any) => ({ ...f, workType: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="mis. packing" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Deskripsi</label>
                        <input type="text" value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Kuantitas *</label>
                          <input type="number" value={form.quantity || ''} onChange={e => setForm((f: any) => ({ ...f, quantity: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Satuan</label>
                          <select value={form.unit || 'unit'} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                            {PIECE_UNITS.map(u => <option key={u.code} value={u.code}>{u.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tarif/Satuan *</label>
                          <input type="number" value={form.unitRate || ''} onChange={e => setForm((f: any) => ({ ...f, unitRate: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                      </div>
                      {form.quantity && form.unitRate && (
                        <p className="text-sm text-green-700 font-medium">
                          Total: {fmtCur(Math.round(parseFloat(form.quantity) * parseFloat(form.unitRate)))}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Tanggal *</label>
                          <input type="date" value={form.assignmentDate || ''} onChange={e => setForm((f: any) => ({ ...f, assignmentDate: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tipe Gaji</label>
                          <select value={form.payType || 'daily'} onChange={e => setForm((f: any) => ({ ...f, payType: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                            {PAY_TYPES.filter(p => ['daily', 'hourly', 'project'].includes(p.code)).map(p =>
                              <option key={p.code} value={p.code}>{p.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Lokasi</label>
                        <input type="text" value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Tarif Harian</label>
                          <input type="number" value={form.dailyRate || ''} onChange={e => setForm((f: any) => ({ ...f, dailyRate: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tarif/Jam</label>
                          <input type="number" value={form.hourlyRate || ''} onChange={e => setForm((f: any) => ({ ...f, hourlyRate: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                        </div>
                      </div>
                    </>
                  )}
                  </>
                  )}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t">
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  {modalType === 'report' && (
                    <button onClick={() => { setForm((f: any) => ({ ...f, submitAfterSave: true })); saveForm(); }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
                      <Send className="w-4 h-4" /> Simpan & Kirim
                    </button>
                  )}
                  <button onClick={saveForm} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">
                    <Save className="w-4 h-4" /> Simpan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </HQLayout>
    </PageGuard>
  );
}
