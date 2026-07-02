import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  GraduationCap, Search, Plus, Eye, Edit, X, Calendar, Clock, Users, MapPin,
  Star, Award, BookOpen, CheckCircle2, BarChart3, TrendingUp, FileText, Download,
  Filter, ChevronRight, Target, Video, Monitor, Loader2, Trash2, Briefcase,
  ClipboardList, UserCheck, Building2, ArrowRight, AlertCircle, ChevronDown,
  Layers, Send, RefreshCw, Shield, PenTool, Layout, Network, UserPlus, Hash,
  HelpCircle, ListOrdered, CircleDot
} from 'lucide-react';

// ═══════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════
type TabKey = 'dashboard' | 'curricula' | 'modules' | 'batches' | 'schedules' | 'exams' | 'graduations' | 'placements' | 'pipeline';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', draft: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-200 text-gray-500', planned: 'bg-blue-100 text-blue-700',
  registration: 'bg-indigo-100 text-indigo-700', in_progress: 'bg-yellow-100 text-yellow-700',
  exam_phase: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700', scheduled: 'bg-blue-100 text-blue-700',
  open: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600',
  graded: 'bg-teal-100 text-teal-700', passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700', conditional: 'bg-orange-100 text-orange-700',
  remedial: 'bg-yellow-100 text-yellow-700', withdrawn: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700',
  recalled: 'bg-red-100 text-red-700', rescheduled: 'bg-orange-100 text-orange-700',
  submitted: 'bg-indigo-100 text-indigo-700',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif', draft: 'Draft', archived: 'Diarsipkan', planned: 'Direncanakan',
  registration: 'Registrasi', in_progress: 'Berlangsung', exam_phase: 'Fase Ujian',
  completed: 'Selesai', cancelled: 'Dibatalkan', scheduled: 'Terjadwal',
  open: 'Dibuka', closed: 'Ditutup', graded: 'Dinilai', passed: 'Lulus',
  failed: 'Tidak Lulus', conditional: 'Bersyarat', remedial: 'Remedial',
  withdrawn: 'Mengundurkan Diri', pending: 'Menunggu', confirmed: 'Dikonfirmasi',
  recalled: 'Ditarik Kembali', rescheduled: 'Dijadwal Ulang', submitted: 'Dikumpulkan',
};

const BATCH_TYPES: Record<string, string> = {
  regular: 'Regular', outsourcing: 'Outsourcing', onboarding: 'Onboarding',
  upskilling: 'Upskilling', reskilling: 'Reskilling',
};

const PLACEMENT_TYPES: Record<string, string> = {
  internal: 'Internal', outsourcing_deployment: 'Outsourcing', client_site: 'Client Site',
  branch_transfer: 'Transfer Cabang', project_based: 'Project Based',
};

const MODULE_TYPES: Record<string, string> = {
  lesson: 'Pelajaran', practical: 'Praktik', assessment: 'Assessment',
  workshop: 'Workshop', field_work: 'Kerja Lapangan', simulation: 'Simulasi',
};

const DELIVERY_METHODS: Record<string, string> = {
  classroom: 'Kelas', online: 'Online', hybrid: 'Hybrid',
  on_the_job: 'On the Job', self_paced: 'Mandiri',
};

const API = '/api/hq/hris/training-development';

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const fmtCur = (n: number) => !n ? '-' : `Rp ${n.toLocaleString('id-ID')}`;
const statusBadge = (s: string) => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[s] || s}</span>;

// ═══════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════
export default function TrainingDevelopmentPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Data states
  const [dashboard, setDashboard] = useState<any>({ totalCurricula: 6, totalModules: 24, totalBatches: 12, activeBatches: 4, totalParticipants: 185, avgScore: 78.5, passRate: 82, totalPlacements: 45 });
  const [curricula, setCurricula] = useState<any[]>([{ id: 'cur1', name: 'Barista Profesional', code: 'CUR-BAR-001', description: 'Kurikulum pelatihan barista', status: 'active', total_modules: 8, duration_weeks: 12, created_at: '2025-06-01' }]);
  const [modules, setModules] = useState<any[]>([{ id: 'mod1', curriculum_id: 'cur1', name: 'Dasar Espresso', code: 'MOD-001', module_type: 'lesson', delivery_method: 'classroom', duration_hours: 16, sort_order: 1, status: 'active' }]);
  const [batches, setBatches] = useState<any[]>([{ id: 'bat1', curriculum_id: 'cur1', name: 'Batch 12 - Maret 2026', batch_type: 'regular', status: 'in_progress', start_date: '2026-03-01', end_date: '2026-05-31', max_participants: 25, enrolled: 22 }]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [graduations, setGraduations] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any>({ stages: [{ name: 'Registrasi', count: 15 }, { name: 'Pelatihan', count: 22 }, { name: 'Ujian', count: 8 }, { name: 'Penempatan', count: 5 }], totalCandidates: 50 });
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionForm, setQuestionForm] = useState<any>({ options: [{ label: 'A', text: '', isCorrect: false }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] });
  const [enrollForm, setEnrollForm] = useState<any>({});

  // Modal states
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // ── Fetch functions ──
  const fetchData = useCallback(async (action: string, setter: (d: any[]) => void) => {
    try {
      const params = new URLSearchParams({ action });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('batch_type', filterType);
      const res = await fetch(`${API}?${params}`);
      const data = await res.json();
      if (data.data) setter(Array.isArray(data.data) ? data.data : [data.data]);
    } catch (e) { console.warn(`Failed to fetch ${action}:`, e); }
  }, [search, filterStatus, filterType]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=dashboard`);
      const data = await res.json();
      if (data.data) setDashboard(data.data);
    } catch (e) {
      console.warn('Failed to fetch dashboard:', e);
      setDashboard({ totalCurricula: 6, totalModules: 24, totalBatches: 12, activeBatches: 4, totalParticipants: 185, avgScore: 78.5, passRate: 82, totalPlacements: 45 });
    }
  }, []);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=outsourcing-pipeline`);
      const data = await res.json();
      if (data.data) setPipeline(data.data);
    } catch (e) {
      console.warn('Failed to fetch pipeline:', e);
      setPipeline({ stages: [{ name: 'Registrasi', count: 15 }, { name: 'Pelatihan', count: 22 }, { name: 'Ujian', count: 8 }, { name: 'Penempatan', count: 5 }], totalCandidates: 50 });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const loads: Promise<void>[] = [fetchDashboard(), fetchPipeline()];
    if (tab === 'curricula') loads.push(fetchData('curricula', setCurricula));
    if (tab === 'modules') loads.push(fetchData('modules', setModules));
    if (tab === 'batches') loads.push(fetchData('batches', setBatches));
    if (tab === 'schedules') loads.push(fetchData('schedules', setSchedules));
    if (tab === 'exams') loads.push(fetchData('exams', setExams));
    if (tab === 'graduations') loads.push(fetchData('graduations', setGraduations));
    if (tab === 'placements') loads.push(fetchData('placements', setPlacements));
    Promise.all(loads).finally(() => setLoading(false));
  }, [tab, fetchData, fetchDashboard, fetchPipeline]);

  // ── CRUD handlers ──
  async function handleCreate(action: string, body: any, refreshFn: () => void) {
    setSaving(true);
    try {
      const res = await fetch(`${API}?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { showToast('Data berhasil disimpan'); setShowModal(null); setForm({}); refreshFn(); }
      else showToast(data.error || 'Gagal menyimpan', 'error');
    } catch (e) { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  }

  async function handleUpdate(action: string, body: any, refreshFn: () => void) {
    setSaving(true);
    try {
      const res = await fetch(`${API}?action=${action}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { showToast('Data berhasil diperbarui'); setShowModal(null); setSelectedItem(null); refreshFn(); }
      else showToast(data.error || 'Gagal memperbarui', 'error');
    } catch (e) { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  }

  async function handleDelete(action: string, id: string, refreshFn: () => void) {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await fetch(`${API}?action=${action}&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Data dihapus'); setSelectedItem(null); refreshFn(); }
      else showToast(data.error || 'Gagal menghapus', 'error');
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  }

  const refreshCurricula = () => fetchData('curricula', setCurricula);
  const refreshModules = () => fetchData('modules', setModules);
  const refreshBatches = () => fetchData('batches', setBatches);
  const refreshSchedules = () => fetchData('schedules', setSchedules);
  const refreshExams = () => fetchData('exams', setExams);
  const refreshGraduations = () => fetchData('graduations', setGraduations);
  const refreshPlacements = () => fetchData('placements', setPlacements);

  const fetchQuestions = useCallback(async (examId: string) => {
    try {
      const res = await fetch(`${API}?action=exam-questions&exam_id=${examId}`);
      const data = await res.json();
      if (data.data) setQuestions(Array.isArray(data.data) ? data.data : []);
    } catch (e) { console.warn('Failed to fetch questions:', e); }
  }, []);

  const handleEnrollBatch = async () => {
    if (!enrollForm.employee_id || !enrollForm.batch_id) { showToast('ID Karyawan dan Batch wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}?action=enroll-batch`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollForm)
      });
      const data = await res.json();
      if (data.success) { showToast('Peserta berhasil didaftarkan'); setShowModal(null); setEnrollForm({}); refreshBatches(); refreshGraduations(); }
      else showToast(data.error || 'Gagal mendaftarkan', 'error');
    } catch { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  };

  const handleCreateQuestion = async () => {
    if (!questionForm.exam_id || !questionForm.question_text) { showToast('Soal wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}?action=create-question`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Soal berhasil ditambahkan');
        setShowModal('detail-exam');
        fetchQuestions(questionForm.exam_id);
        refreshExams();
        setQuestionForm({ options: [{ label: 'A', text: '', isCorrect: false }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] });
      } else showToast(data.error || 'Gagal menambah soal', 'error');
    } catch { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  };

  // ── Tabs config ──
  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dasbor', icon: Layout },
    { key: 'curricula', label: 'Kurikulum', icon: BookOpen },
    { key: 'modules', label: 'Modul', icon: Layers },
    { key: 'batches', label: 'Batch', icon: Users },
    { key: 'schedules', label: 'Jadwal', icon: Calendar },
    { key: 'exams', label: 'Ujian', icon: PenTool },
    { key: 'graduations', label: 'Kelulusan', icon: GraduationCap },
    { key: 'placements', label: 'Penempatan', icon: MapPin },
    { key: 'pipeline', label: 'Pipeline', icon: Network },
  ];

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <HQLayout title={t('hris.trainingDevTitle')} subtitle={t('hris.trainingDevSubtitle')}>
      <div className="space-y-6">
        {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto border-b pb-px">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterStatus(''); setFilterType(''); }}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /><span className="ml-2 text-sm text-gray-500">Memuat data...</span></div>}

        {/* ════════════════════════════════════════ */}
        {/* DASHBOARD TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'dashboard' && dashboard && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon={BookOpen} color="blue" value={dashboard.curricula?.active || 0} label="Kurikulum Aktif" />
              <StatCard icon={Users} color="purple" value={dashboard.batches?.active || 0} label="Batch Aktif" />
              <StatCard icon={GraduationCap} color="green" value={dashboard.graduations?.passed || 0} label="Lulusan" />
              <StatCard icon={MapPin} color="orange" value={dashboard.placements?.active || 0} label="Penempatan Aktif" />
              <StatCard icon={Target} color="teal" value={`${Number(dashboard.exams?.pass_rate || 0).toFixed(0)}%`} label="Tingkat Kelulusan" />
            </div>

            {/* Detail Cards Row */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-purple-600" /> Status Batch</h3>
                <div className="space-y-2">
                  <MetricRow label="Aktif / Berlangsung" value={dashboard.batches?.active || 0} color="text-yellow-600" />
                  <MetricRow label="Selesai" value={dashboard.batches?.completed || 0} color="text-green-600" />
                  <MetricRow label="Outsourcing" value={dashboard.batches?.outsourcing || 0} color="text-blue-600" />
                  <MetricRow label="Total Batch" value={dashboard.batches?.total || 0} color="text-gray-800" bold />
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-green-600" /> Status Kelulusan</h3>
                <div className="space-y-2">
                  <MetricRow label="Sedang Training" value={dashboard.graduations?.in_progress || 0} color="text-yellow-600" />
                  <MetricRow label="Lulus" value={dashboard.graduations?.passed || 0} color="text-green-600" />
                  <MetricRow label="Tidak Lulus" value={dashboard.graduations?.failed || 0} color="text-red-600" />
                  <MetricRow label="Siap Ditempatkan" value={dashboard.graduations?.ready_placement || 0} color="text-indigo-600" bold />
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600" /> Status Penempatan</h3>
                <div className="space-y-2">
                  <MetricRow label="Menunggu" value={dashboard.placements?.pending || 0} color="text-yellow-600" />
                  <MetricRow label="Aktif" value={dashboard.placements?.active || 0} color="text-green-600" />
                  <MetricRow label="Outsourcing" value={dashboard.placements?.outsourcing || 0} color="text-blue-600" />
                  <MetricRow label="Total Penempatan" value={dashboard.placements?.total || 0} color="text-gray-800" bold />
                </div>
              </div>
            </div>

            {/* Outsourcing Pipeline */}
            {pipeline && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Network className="w-5 h-5 text-indigo-600" /> Pipeline Outsourcing (Rekrutmen → Pelatihan → Penyaluran)</h3>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {[
                    { label: 'Rekrutmen', value: pipeline.recruiting || 0, color: 'bg-blue-500' },
                    { label: 'Dalam Pelatihan', value: pipeline.in_training || 0, color: 'bg-yellow-500' },
                    { label: 'Siap Ditempatkan', value: pipeline.ready_deploy || 0, color: 'bg-indigo-500' },
                    { label: 'Ditempatkan', value: pipeline.deployed || 0, color: 'bg-green-500' },
                    { label: 'Selesai Kontrak', value: pipeline.completed || 0, color: 'bg-gray-500' },
                  ].map((stage, i) => (
                    <div key={stage.label} className="flex items-center gap-2">
                      <div className="min-w-[130px] bg-white rounded-lg p-3 text-center border shadow-sm">
                        <p className={`text-2xl font-bold`}>{stage.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stage.label}</p>
                        <div className={`h-1 rounded-full mt-2 ${stage.color}`} />
                      </div>
                      {i < 4 && <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exam Stats */}
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><PenTool className="w-4 h-4 text-teal-600" /> Statistik Ujian</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-teal-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-teal-600">{dashboard.exams?.total || 0}</p>
                  <p className="text-xs text-gray-500">Total Peserta Ujian</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{Number(dashboard.exams?.pass_rate || 0).toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Tingkat Kelulusan</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{Number(dashboard.exams?.avg_score || 0).toFixed(1)}</p>
                  <p className="text-xs text-gray-500">Rata-rata Skor</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* CURRICULA TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'curricula' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari kurikulum..." />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Status</option>
                  <option value="active">Aktif</option><option value="draft">Draft</option><option value="archived">Diarsipkan</option>
                </select>
              </div>
              <button onClick={() => { setForm({}); setShowModal('create-curriculum'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Kurikulum</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {curricula.map(c => (
                <div key={c.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group" onClick={() => { setSelectedItem(c); setShowModal('detail-curriculum'); }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{c.code}</span>
                        {statusBadge(c.status)}
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-1.5">{c.title}</h3>
                    </div>
                    <BookOpen className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{c.description || 'Tidak ada deskripsi'}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{c.module_count || 0} modul</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.batch_count || 0} batch</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.total_hours || 0} jam</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />KKM: {c.passing_score}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{c.category}</span>
                    {c.target_audience && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{c.target_audience}</span>}
                  </div>
                </div>
              ))}
              {curricula.length === 0 && <EmptyState message="Belum ada kurikulum" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* MODULES TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'modules' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari modul..." />
              <button onClick={() => { setForm({}); setShowModal('create-module'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Tambah Modul</button>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Modul</th>
                  <th className="px-4 py-3 text-left">Kurikulum</th>
                  <th className="px-4 py-3 text-center">Tipe</th>
                  <th className="px-4 py-3 text-center">Metode</th>
                  <th className="px-4 py-3 text-center">Durasi</th>
                  <th className="px-4 py-3 text-center">Ujian</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr></thead>
                <tbody className="divide-y">
                  {modules.filter(m => !search || m.title?.toLowerCase().includes(search.toLowerCase())).map((m, i) => (
                    <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedItem(m); setShowModal('detail-module'); }}>
                      <td className="px-4 py-3 text-gray-400">{m.order_index ?? i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.title}</p>
                        <p className="text-xs text-gray-400">{m.code}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.curriculum_title || '-'}</td>
                      <td className="px-4 py-3 text-center"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{MODULE_TYPES[m.module_type] || m.module_type}</span></td>
                      <td className="px-4 py-3 text-center text-xs">{DELIVERY_METHODS[m.delivery_method] || m.delivery_method}</td>
                      <td className="px-4 py-3 text-center text-xs">{m.duration_hours} jam</td>
                      <td className="px-4 py-3 text-center">{m.has_exam ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(m.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {modules.length === 0 && <EmptyState message="Belum ada modul pembelajaran" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* BATCHES TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'batches' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari batch..." />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Status</option>
                  {['planned','registration','in_progress','exam_phase','completed','cancelled'].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Tipe</option>
                  {Object.entries(BATCH_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button onClick={() => { setForm({}); setShowModal('create-batch'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Batch</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {batches.map(b => (
                <div key={b.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => { setSelectedItem(b); setShowModal('detail-batch'); }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-purple-500 bg-purple-50 px-2 py-0.5 rounded">{b.batch_code}</span>
                        {statusBadge(b.status)}
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{BATCH_TYPES[b.batch_type] || b.batch_type}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-1.5">{b.batch_name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{b.curriculum_title || '-'}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(b.start_date)} - {fmtDate(b.end_date)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.current_participants || b.participant_count || 0}/{b.max_participants}</span>
                  </div>
                  {b.client_company && <div className="flex items-center gap-1 text-xs text-blue-600"><Building2 className="w-3 h-3" /> {b.client_company}</div>}
                  {b.instructor && <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><UserCheck className="w-3 h-3" /> {b.instructor}</div>}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${b.participant_count > 0 ? Math.round((b.passed_count || 0) / b.participant_count * 100) : 0}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{b.passed_count || 0} lulus</span>
                  </div>
                </div>
              ))}
              {batches.length === 0 && <EmptyState message="Belum ada batch pelatihan" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* SCHEDULES TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'schedules' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <SearchInput value={search} onChange={setSearch} placeholder="Cari jadwal..." />
              <button onClick={() => { setForm({}); setShowModal('create-schedule'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Tambah Jadwal</button>
            </div>
            <div className="space-y-3">
              {schedules.filter(s => !search || s.session_title?.toLowerCase().includes(search.toLowerCase())).map(s => (
                <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelectedItem(s); setShowModal('detail-schedule'); }}>
                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-bold text-indigo-600">{s.session_date ? new Date(s.session_date).getDate() : '-'}</p>
                    <p className="text-xs text-gray-500">{s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { month: 'short' }) : '-'}</p>
                  </div>
                  <div className="w-px h-12 bg-gray-200" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{s.session_title}</h3>
                      {statusBadge(s.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.start_time?.substring(0,5)} - {s.end_time?.substring(0,5)}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location || '-'}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.batch_name || '-'}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>{s.module_title || '-'}</p>
                    <p className="text-gray-400">{s.instructor || '-'}</p>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && <EmptyState message="Belum ada jadwal" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* EXAMS TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'exams' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari ujian..." />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Status</option>
                  {['draft','scheduled','open','in_progress','closed','graded'].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <button onClick={() => { setForm({}); setShowModal('create-exam'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Ujian</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {exams.filter(e => !search || e.title?.toLowerCase().includes(search.toLowerCase())).map(e => (
                <div key={e.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => { setSelectedItem(e); setShowModal('detail-exam'); fetchQuestions(e.id); }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{e.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {statusBadge(e.status)}
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{e.exam_type}</span>
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded capitalize">{e.exam_scope}</span>
                      </div>
                    </div>
                    <PenTool className="w-5 h-5 text-gray-300" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span><strong>{e.total_questions}</strong> soal</span>
                    <span>KKM: <strong>{e.passing_score}</strong></span>
                    <span><Clock className="w-3 h-3 inline" /> {e.duration_minutes} menit</span>
                    {e.exam_date && <span><Calendar className="w-3 h-3 inline" /> {fmtDate(e.exam_date)}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs mt-2">
                    {e.batch_name && <span className="text-purple-600">Batch: {e.batch_name}</span>}
                    {e.curriculum_title && <span className="text-blue-600">{e.curriculum_title}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs">
                    <span className="text-gray-500">Peserta: <strong>{e.total_participants || 0}</strong></span>
                    <span className="text-green-600">Lulus: <strong>{e.passed_count || 0}</strong></span>
                    <span className="text-gray-500">Avg: <strong>{Number(e.avg_score || 0).toFixed(1)}</strong></span>
                  </div>
                </div>
              ))}
              {exams.length === 0 && <EmptyState message="Belum ada ujian" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* GRADUATIONS TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'graduations' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari peserta..." />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Status</option>
                  {['in_progress','passed','failed','conditional','remedial','withdrawn'].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Peserta</th>
                  <th className="px-4 py-3 text-left">Batch</th>
                  <th className="px-4 py-3 text-center">Skor Akhir</th>
                  <th className="px-4 py-3 text-center">Ujian Avg</th>
                  <th className="px-4 py-3 text-center">Kehadiran</th>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Penempatan</th>
                </tr></thead>
                <tbody className="divide-y">
                  {graduations.filter(g => !search || g.employee_name?.toLowerCase().includes(search.toLowerCase())).map(g => (
                    <tr key={g.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedItem(g); setShowModal('detail-graduation'); }}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{g.employee_name || '-'}</p>
                        <p className="text-xs text-gray-400">{g.employee_id?.substring(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{g.batch_name || '-'}</p>
                        <p className="text-xs text-gray-400">{g.batch_code}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{g.final_score ? Number(g.final_score).toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-center">{g.exam_score_avg ? Number(g.exam_score_avg).toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-center">{g.attendance_rate ? `${Number(g.attendance_rate).toFixed(0)}%` : '-'}</td>
                      <td className="px-4 py-3 text-center">{g.rank || '-'}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(g.graduation_status)}</td>
                      <td className="px-4 py-3 text-center">
                        {g.ready_for_placement ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Siap</span> : <span className="text-xs text-gray-400">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {graduations.length === 0 && <EmptyState message="Belum ada data kelulusan" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* PLACEMENTS TAB */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'placements' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari penempatan..." />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Status</option>
                  {['pending','confirmed','active','completed','cancelled','recalled'].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Semua Tipe</option>
                  {Object.entries(PLACEMENT_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <button onClick={() => { setForm({}); setShowModal('create-placement'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Penempatan</button>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Karyawan</th>
                  <th className="px-4 py-3 text-left">Posisi</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Lokasi / Klien</th>
                  <th className="px-4 py-3 text-center">Periode</th>
                  <th className="px-4 py-3 text-center">Skor Training</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr></thead>
                <tbody className="divide-y">
                  {placements.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedItem(p); setShowModal('detail-placement'); }}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.employee_name || '-'}</p>
                        <p className="text-xs text-gray-400">{p.batch_name || '-'}</p>
                      </td>
                      <td className="px-4 py-3">{p.position}<br /><span className="text-xs text-gray-400">{p.department || '-'}</span></td>
                      <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{PLACEMENT_TYPES[p.placement_type] || p.placement_type}</span></td>
                      <td className="px-4 py-3 text-xs">
                        {p.client_company && <p className="text-blue-600 font-medium">{p.client_company}</p>}
                        {p.client_site && <p className="text-gray-500">{p.client_site}</p>}
                        {p.target_branch_name && <p className="text-gray-500">{p.target_branch_name}</p>}
                        {!p.client_company && !p.target_branch_name && '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">{fmtDate(p.start_date)}<br />{p.end_date ? fmtDate(p.end_date) : 'Ongoing'}</td>
                      <td className="px-4 py-3 text-center font-semibold">{p.final_score ? Number(p.final_score).toFixed(1) : '-'}</td>
                      <td className="px-4 py-3 text-center">{statusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {placements.length === 0 && <EmptyState message="Belum ada data penempatan" />}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* PIPELINE TAB (Outsourcing) */}
        {/* ════════════════════════════════════════ */}
        {!loading && tab === 'pipeline' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Pipeline Outsourcing</h2>
              <p className="text-sm text-gray-500 mb-4">Alur lengkap dari perekrutan → pembinaan/pelatihan → penyaluran karyawan outsourcing</p>
              {pipeline && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {[
                    { label: 'Rekrutmen', desc: 'Calon karyawan dalam proses seleksi', value: pipeline.recruiting || 0, color: 'from-blue-500 to-blue-600', icon: UserCheck },
                    { label: 'Pelatihan', desc: 'Dalam program pelatihan & pembinaan', value: pipeline.in_training || 0, color: 'from-yellow-500 to-yellow-600', icon: BookOpen },
                    { label: 'Siap Ditempatkan', desc: 'Lulus pelatihan, siap ditempatkan', value: pipeline.ready_deploy || 0, color: 'from-indigo-500 to-indigo-600', icon: GraduationCap },
                    { label: 'Ditempatkan', desc: 'Aktif bekerja di lokasi klien', value: pipeline.deployed || 0, color: 'from-green-500 to-green-600', icon: MapPin },
                    { label: 'Selesai', desc: 'Kontrak selesai / selesai penempatan', value: pipeline.completed || 0, color: 'from-gray-500 to-gray-600', icon: CheckCircle2 },
                  ].map((stage, i) => (
                    <div key={stage.label} className="flex items-center gap-3">
                      <div className="min-w-[160px] bg-white rounded-xl p-4 text-center border shadow-sm">
                        <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                          <stage.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stage.value}</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{stage.label}</p>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{stage.desc}</p>
                      </div>
                      {i < 4 && <ArrowRight className="w-6 h-6 text-indigo-300 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Integrasi Modul</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Rekrutmen</h4>
                  <p className="text-xs text-blue-700 mt-1">Terintegrasi dengan modul Rekrutmen HRIS. Kandidat yang diterima (hired) dapat langsung didaftarkan ke batch pelatihan.</p>
                  <a href="/hq/hris/recruitment" className="text-xs text-blue-600 font-medium mt-2 inline-block hover:underline">Buka Modul Rekrutmen →</a>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="font-medium text-purple-900 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Pelatihan & Sertifikasi</h4>
                  <p className="text-xs text-purple-700 mt-1">Terintegrasi dengan modul Training & Sertifikasi. Program pelatihan dapat dikaitkan dengan kurikulum dan batch.</p>
                  <a href="/hq/hris/training" className="text-xs text-purple-600 font-medium mt-2 inline-block hover:underline">Buka Pelatihan →</a>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h4 className="font-medium text-green-900 flex items-center gap-2"><Award className="w-4 h-4" /> KPI & Performance</h4>
                  <p className="text-xs text-green-700 mt-1">Terintegrasi dengan KPI dan Performance Review. Hasil pelatihan dapat mempengaruhi evaluasi kinerja karyawan.</p>
                  <a href="/hq/hris/kpi" className="text-xs text-green-600 font-medium mt-2 inline-block hover:underline">Buka KPI →</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* MODALS */}
        {/* ════════════════════════════════════════ */}

        {/* Create Curriculum Modal */}
        {showModal === 'create-curriculum' && (
          <Modal title="Buat Kurikulum Baru" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-curriculum', form, refreshCurricula); }} className="space-y-3">
              <FormField label="Kode Kurikulum *" value={form.code || ''} onChange={v => setForm({...form, code: v})} placeholder="CUR-2026-001" required />
              <FormField label="Judul Kurikulum *" value={form.title || ''} onChange={v => setForm({...form, title: v})} required />
              <FormTextarea label="Deskripsi" value={form.description || ''} onChange={v => setForm({...form, description: v})} />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Kategori" value={form.category || 'general'} onChange={v => setForm({...form, category: v})}
                  options={[['general','General'],['onboarding','Onboarding'],['technical','Technical'],['soft_skill','Soft Skill'],['compliance','Compliance'],['outsourcing_induction','Outsourcing Induction'],['safety','Safety']]} />
                <FormSelect label="Target Audiens" value={form.target_audience || 'existing_employee'} onChange={v => setForm({...form, target_audience: v})}
                  options={[['new_hire','Karyawan Baru'],['existing_employee','Karyawan Existing'],['outsourcing_candidate','Kandidat Outsourcing'],['promotion_candidate','Kandidat Promosi'],['all','Semua']]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Total Jam" type="number" value={form.total_hours || ''} onChange={v => setForm({...form, total_hours: Number(v)})} />
                <FormField label="KKM (Passing Score)" type="number" value={form.passing_score || '70'} onChange={v => setForm({...form, passing_score: Number(v)})} />
              </div>
              <FormSelect label="Status" value={form.status || 'draft'} onChange={v => setForm({...form, status: v})}
                options={[['draft','Draft'],['active','Aktif'],['archived','Diarsipkan']]} />
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Create Module Modal */}
        {showModal === 'create-module' && (
          <Modal title="Tambah Modul Pembelajaran" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-module', form, refreshModules); }} className="space-y-3">
              <FormSelect label="Kurikulum *" value={form.curriculum_id || ''} onChange={v => setForm({...form, curriculum_id: v})}
                options={curricula.map(c => [c.id, `${c.code} - ${c.title}`])} placeholder="Pilih kurikulum" required />
              <FormField label="Kode Modul" value={form.code || ''} onChange={v => setForm({...form, code: v})} placeholder="MOD-001" />
              <FormField label="Judul Modul *" value={form.title || ''} onChange={v => setForm({...form, title: v})} required />
              <FormTextarea label="Deskripsi" value={form.description || ''} onChange={v => setForm({...form, description: v})} />
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Urutan" type="number" value={form.order_index || ''} onChange={v => setForm({...form, order_index: Number(v)})} />
                <FormField label="Durasi (jam)" type="number" value={form.duration_hours || ''} onChange={v => setForm({...form, duration_hours: Number(v)})} />
                <FormField label="KKM Modul" type="number" value={form.passing_score || ''} onChange={v => setForm({...form, passing_score: Number(v)})} placeholder="70" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Tipe Modul" value={form.module_type || 'lesson'} onChange={v => setForm({...form, module_type: v})}
                  options={Object.entries(MODULE_TYPES)} />
                <FormSelect label="Metode Penyampaian" value={form.delivery_method || 'classroom'} onChange={v => setForm({...form, delivery_method: v})}
                  options={Object.entries(DELIVERY_METHODS)} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.has_exam || false} onChange={e => setForm({...form, has_exam: e.target.checked})} className="rounded" />
                <label className="text-sm">Modul ini memiliki ujian</label>
              </div>
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Create Batch Modal */}
        {showModal === 'create-batch' && (
          <Modal title="Buat Batch Pelatihan" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-batch', form, refreshBatches); }} className="space-y-3">
              <FormSelect label="Kurikulum *" value={form.curriculum_id || ''} onChange={v => setForm({...form, curriculum_id: v})}
                options={curricula.map(c => [c.id, `${c.code} - ${c.title}`])} placeholder="Pilih kurikulum" required />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Kode Batch" value={form.batch_code || ''} onChange={v => setForm({...form, batch_code: v})} placeholder="BATCH-2026-001" />
                <FormField label="Nama Batch *" value={form.batch_name || ''} onChange={v => setForm({...form, batch_name: v})} required />
              </div>
              <FormSelect label="Tipe Batch" value={form.batch_type || 'regular'} onChange={v => setForm({...form, batch_type: v})}
                options={Object.entries(BATCH_TYPES)} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tanggal Mulai *" type="date" value={form.start_date || ''} onChange={v => setForm({...form, start_date: v})} required />
                <FormField label="Tanggal Selesai *" type="date" value={form.end_date || ''} onChange={v => setForm({...form, end_date: v})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Maks Peserta" type="number" value={form.max_participants || '30'} onChange={v => setForm({...form, max_participants: Number(v)})} />
                <FormField label="Instruktur" value={form.instructor || ''} onChange={v => setForm({...form, instructor: v})} />
              </div>
              <FormField label="Lokasi" value={form.location || ''} onChange={v => setForm({...form, location: v})} />
              {(form.batch_type === 'outsourcing') && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg">
                  <FormField label="Perusahaan Klien" value={form.client_company || ''} onChange={v => setForm({...form, client_company: v})} />
                  <FormField label="No. Kontrak/PO" value={form.contract_id || ''} onChange={v => setForm({...form, contract_id: v})} />
                </div>
              )}
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Create Schedule Modal */}
        {showModal === 'create-schedule' && (
          <Modal title="Tambah Jadwal Sesi" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-schedule', form, refreshSchedules); }} className="space-y-3">
              <FormSelect label="Batch *" value={form.batch_id || ''} onChange={v => setForm({...form, batch_id: v})}
                options={batches.map(b => [b.id, `${b.batch_code} - ${b.batch_name}`])} placeholder="Pilih batch" required />
              <FormSelect label="Modul (opsional)" value={form.module_id || ''} onChange={v => setForm({...form, module_id: v})}
                options={modules.map(m => [m.id, `${m.code} - ${m.title}`])} placeholder="Pilih modul" />
              <FormField label="Judul Sesi *" value={form.session_title || ''} onChange={v => setForm({...form, session_title: v})} required />
              <FormField label="Tanggal *" type="date" value={form.session_date || ''} onChange={v => setForm({...form, session_date: v})} required />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Jam Mulai" type="time" value={form.start_time || '08:00'} onChange={v => setForm({...form, start_time: v})} />
                <FormField label="Jam Selesai" type="time" value={form.end_time || '17:00'} onChange={v => setForm({...form, end_time: v})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Instruktur" value={form.instructor || ''} onChange={v => setForm({...form, instructor: v})} />
                <FormField label="Lokasi" value={form.location || ''} onChange={v => setForm({...form, location: v})} />
              </div>
              <FormSelect label="Tipe Sesi" value={form.session_type || 'class'} onChange={v => setForm({...form, session_type: v})}
                options={[['class','Kelas'],['lab','Lab/Praktik'],['exam','Ujian'],['review','Review'],['field_visit','Kunjungan Lapangan'],['presentation','Presentasi']]} />
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Create Exam Modal */}
        {showModal === 'create-exam' && (
          <Modal title="Buat Ujian" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-exam', form, refreshExams); }} className="space-y-3">
              <FormField label="Judul Ujian *" value={form.title || ''} onChange={v => setForm({...form, title: v})} required />
              <FormTextarea label="Deskripsi" value={form.description || ''} onChange={v => setForm({...form, description: v})} />
              <FormSelect label="Batch (opsional)" value={form.batch_id || ''} onChange={v => setForm({...form, batch_id: v})}
                options={batches.map(b => [b.id, `${b.batch_code} - ${b.batch_name}`])} placeholder="Pilih batch" />
              <FormSelect label="Kurikulum (opsional)" value={form.curriculum_id || ''} onChange={v => setForm({...form, curriculum_id: v})}
                options={curricula.map(c => [c.id, `${c.code} - ${c.title}`])} placeholder="Pilih kurikulum" />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Tipe Ujian" value={form.exam_type || 'written'} onChange={v => setForm({...form, exam_type: v})}
                  options={[['written','Tertulis'],['practical','Praktik'],['oral','Lisan'],['online','Online'],['mixed','Campuran']]} />
                <FormSelect label="Scope" value={form.exam_scope || 'module'} onChange={v => setForm({...form, exam_scope: v})}
                  options={[['module','Per Modul'],['midterm','UTS'],['final','UAS'],['competency','Kompetensi'],['certification','Sertifikasi']]} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="KKM" type="number" value={form.passing_score || '70'} onChange={v => setForm({...form, passing_score: Number(v)})} />
                <FormField label="Durasi (menit)" type="number" value={form.duration_minutes || '60'} onChange={v => setForm({...form, duration_minutes: Number(v)})} />
                <FormField label="Maks Percobaan" type="number" value={form.max_attempts || '1'} onChange={v => setForm({...form, max_attempts: Number(v)})} />
              </div>
              <FormField label="Tanggal Ujian" type="date" value={form.exam_date || ''} onChange={v => setForm({...form, exam_date: v})} />
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Create Placement Modal */}
        {showModal === 'create-placement' && (
          <Modal title="Buat Penempatan" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-placement', form, refreshPlacements); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="ID Karyawan *" value={form.employee_id || ''} onChange={v => setForm({...form, employee_id: v})} required />
                <FormField label="Nama Karyawan" value={form.employee_name || ''} onChange={v => setForm({...form, employee_name: v})} />
              </div>
              <FormField label="Posisi *" value={form.position || ''} onChange={v => setForm({...form, position: v})} required />
              <FormField label="Departemen" value={form.department || ''} onChange={v => setForm({...form, department: v})} />
              <FormSelect label="Tipe Penempatan" value={form.placement_type || 'internal'} onChange={v => setForm({...form, placement_type: v})}
                options={Object.entries(PLACEMENT_TYPES)} />
              <FormSelect label="Batch (opsional)" value={form.batch_id || ''} onChange={v => setForm({...form, batch_id: v})}
                options={batches.map(b => [b.id, `${b.batch_code} - ${b.batch_name}`])} placeholder="Pilih batch" />
              {(form.placement_type === 'outsourcing_deployment' || form.placement_type === 'client_site') && (
                <div className="p-3 bg-blue-50 rounded-lg space-y-3">
                  <FormField label="Perusahaan Klien" value={form.client_company || ''} onChange={v => setForm({...form, client_company: v})} />
                  <FormField label="Lokasi Klien" value={form.client_site || ''} onChange={v => setForm({...form, client_site: v})} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tanggal Mulai" type="date" value={form.start_date || ''} onChange={v => setForm({...form, start_date: v})} />
                <FormField label="Tanggal Selesai" type="date" value={form.end_date || ''} onChange={v => setForm({...form, end_date: v})} />
              </div>
              <FormField label="Nilai Kontrak (Rp)" type="number" value={form.contract_value || ''} onChange={v => setForm({...form, contract_value: Number(v)})} />
              <FormTextarea label="Catatan" value={form.remarks || ''} onChange={v => setForm({...form, remarks: v})} />
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Detail Curriculum Modal */}
        {showModal === 'detail-curriculum' && selectedItem && (
          <Modal title="Detail Kurikulum" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{selectedItem.code}</span>
                {statusBadge(selectedItem.status)}
              </div>
              <h3 className="text-lg font-bold">{selectedItem.title}</h3>
              <p className="text-sm text-gray-600">{selectedItem.description || '-'}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Kategori" value={selectedItem.category} />
                <DetailField label="Target Audiens" value={selectedItem.target_audience} />
                <DetailField label="Total Jam" value={`${selectedItem.total_hours} jam`} />
                <DetailField label="Total Modul" value={selectedItem.module_count || selectedItem.total_modules} />
                <DetailField label="KKM" value={selectedItem.passing_score} />
                <DetailField label="Versi" value={selectedItem.version} />
                <DetailField label="Jumlah Batch" value={selectedItem.batch_count || 0} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDelete('delete-curriculum', selectedItem.id, refreshCurricula)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Batch Modal */}
        {showModal === 'detail-batch' && selectedItem && (
          <Modal title="Detail Batch" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-purple-500 bg-purple-50 px-2 py-0.5 rounded">{selectedItem.batch_code}</span>
                {statusBadge(selectedItem.status)}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{BATCH_TYPES[selectedItem.batch_type] || selectedItem.batch_type}</span>
              </div>
              <h3 className="text-lg font-bold">{selectedItem.batch_name}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Kurikulum" value={selectedItem.curriculum_title} />
                <DetailField label="Instruktur" value={selectedItem.instructor} />
                <DetailField label="Periode" value={`${fmtDate(selectedItem.start_date)} - ${fmtDate(selectedItem.end_date)}`} />
                <DetailField label="Lokasi" value={selectedItem.location} />
                <DetailField label="Peserta" value={`${selectedItem.current_participants || selectedItem.participant_count || 0} / ${selectedItem.max_participants}`} />
                <DetailField label="Lulus" value={selectedItem.passed_count || 0} />
                {selectedItem.client_company && <DetailField label="Klien" value={selectedItem.client_company} />}
                {selectedItem.contract_id && <DetailField label="No. Kontrak" value={selectedItem.contract_id} />}
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setEnrollForm({ batch_id: selectedItem.id }); setShowModal('enroll-batch'); }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center justify-center gap-1"><UserPlus className="w-4 h-4" /> Daftarkan Peserta</button>
                <button onClick={() => handleDelete('delete-batch', selectedItem.id, refreshBatches)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Exam Modal (Enhanced with Question Management) */}
        {showModal === 'detail-exam' && selectedItem && (
          <Modal title="Detail Ujian" onClose={() => { setShowModal(null); setSelectedItem(null); setQuestions([]); }}>
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{selectedItem.title}</h3>
              <div className="flex items-center gap-2">
                {statusBadge(selectedItem.status)}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{selectedItem.exam_type}</span>
                <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded capitalize">{selectedItem.exam_scope}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedItem.description || '-'}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Total Soal" value={selectedItem.total_questions} />
                <DetailField label="KKM" value={selectedItem.passing_score} />
                <DetailField label="Durasi" value={`${selectedItem.duration_minutes} menit`} />
                <DetailField label="Maks Percobaan" value={selectedItem.max_attempts} />
                <DetailField label="Tanggal" value={fmtDate(selectedItem.exam_date)} />
                {selectedItem.batch_name && <DetailField label="Batch" value={selectedItem.batch_name} />}
                <DetailField label="Peserta" value={selectedItem.total_participants || 0} />
                <DetailField label="Lulus" value={selectedItem.passed_count || 0} />
                <DetailField label="Avg Skor" value={Number(selectedItem.avg_score || 0).toFixed(1)} />
              </div>

              {/* Question List Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><ListOrdered className="w-4 h-4 text-indigo-600" /> Daftar Soal ({questions.length})</h4>
                  <div className="flex gap-2">
                    {questions.length === 0 && (
                      <button onClick={() => fetchQuestions(selectedItem.id)} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Eye className="w-3 h-3" /> Muat Soal</button>
                    )}
                    <button onClick={() => {
                      setQuestionForm({ exam_id: selectedItem.id, question_type: 'multiple_choice', score: 1, difficulty: 'medium', question_number: (questions.length || selectedItem.total_questions || 0) + 1, options: [{ label: 'A', text: '', isCorrect: false }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] });
                      setShowModal('create-question');
                    }} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Tambah Soal</button>
                  </div>
                </div>
                {questions.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{q.question_number || i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 line-clamp-2">{q.question_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded capitalize">{q.question_type?.replace('_', ' ')}</span>
                            <span className="text-[10px] text-gray-400">{q.score} poin</span>
                            <span className="text-[10px] text-gray-400 capitalize">{q.difficulty}</span>
                            {q.correct_answer && <span className="text-[10px] text-green-600 font-medium">Jawaban: {q.correct_answer}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete('delete-question', q.id, () => fetchQuestions(selectedItem.id))} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDelete('delete-exam', selectedItem.id, refreshExams)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Graduation Modal */}
        {showModal === 'detail-graduation' && selectedItem && (
          <Modal title="Detail Kelulusan" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{selectedItem.employee_name || 'Peserta'}</h3>
              <div className="flex items-center gap-2">
                {statusBadge(selectedItem.graduation_status)}
                {selectedItem.ready_for_placement && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Siap Ditempatkan</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Batch" value={selectedItem.batch_name} />
                <DetailField label="Kurikulum" value={selectedItem.curriculum_title} />
                <DetailField label="Skor Akhir" value={selectedItem.final_score ? Number(selectedItem.final_score).toFixed(1) : '-'} />
                <DetailField label="Rata-rata Ujian" value={selectedItem.exam_score_avg ? Number(selectedItem.exam_score_avg).toFixed(1) : '-'} />
                <DetailField label="Kehadiran" value={selectedItem.attendance_rate ? `${Number(selectedItem.attendance_rate).toFixed(0)}%` : '-'} />
                <DetailField label="Skor Praktik" value={selectedItem.practical_score ? Number(selectedItem.practical_score).toFixed(1) : '-'} />
                <DetailField label="Ranking" value={selectedItem.rank || '-'} />
                <DetailField label="Tgl Lulus" value={fmtDate(selectedItem.graduation_date)} />
                {selectedItem.certificate_number && <DetailField label="No. Sertifikat" value={selectedItem.certificate_number} />}
              </div>
              {selectedItem.remarks && <div><p className="text-xs text-gray-500 mb-1">Catatan</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedItem.remarks}</p></div>}
              <div className="flex gap-2 pt-2">
                {selectedItem.graduation_status === 'in_progress' && (
                  <>
                    <button onClick={() => handleUpdate('update-graduation', { id: selectedItem.id, graduation_status: 'passed', ready_for_placement: true, graduation_date: new Date().toISOString().split('T')[0] }, refreshGraduations)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> Luluskan</button>
                    <button onClick={() => handleUpdate('update-graduation', { id: selectedItem.id, graduation_status: 'failed' }, refreshGraduations)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">Tidak Lulus</button>
                  </>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Placement Modal */}
        {showModal === 'detail-placement' && selectedItem && (
          <Modal title="Detail Penempatan" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{selectedItem.employee_name || 'Karyawan'}</h3>
              <div className="flex items-center gap-2">
                {statusBadge(selectedItem.status)}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{PLACEMENT_TYPES[selectedItem.placement_type] || selectedItem.placement_type}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Posisi" value={selectedItem.position} />
                <DetailField label="Departemen" value={selectedItem.department} />
                <DetailField label="Batch" value={selectedItem.batch_name} />
                <DetailField label="Skor Training" value={selectedItem.final_score ? Number(selectedItem.final_score).toFixed(1) : '-'} />
                {selectedItem.client_company && <DetailField label="Klien" value={selectedItem.client_company} />}
                {selectedItem.client_site && <DetailField label="Lokasi Klien" value={selectedItem.client_site} />}
                {selectedItem.target_branch_name && <DetailField label="Cabang" value={selectedItem.target_branch_name} />}
                <DetailField label="Mulai" value={fmtDate(selectedItem.start_date)} />
                <DetailField label="Selesai" value={selectedItem.end_date ? fmtDate(selectedItem.end_date) : 'Ongoing'} />
                {selectedItem.contract_value && <DetailField label="Nilai Kontrak" value={fmtCur(selectedItem.contract_value)} />}
              </div>
              {selectedItem.remarks && <div><p className="text-xs text-gray-500 mb-1">Catatan</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedItem.remarks}</p></div>}
              <div className="flex gap-2 pt-2">
                {selectedItem.status === 'pending' && (
                  <button onClick={() => handleUpdate('update-placement', { id: selectedItem.id, status: 'active', start_date: new Date().toISOString().split('T')[0] }, refreshPlacements)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Aktifkan Penempatan</button>
                )}
                {selectedItem.status === 'active' && (
                  <button onClick={() => handleUpdate('update-placement', { id: selectedItem.id, status: 'completed', end_date: new Date().toISOString().split('T')[0] }, refreshPlacements)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Selesai Penempatan</button>
                )}
                <button onClick={() => handleDelete('delete-placement', selectedItem.id, refreshPlacements)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Create Question Modal */}
        {showModal === 'create-question' && (
          <Modal title="Tambah Soal Ujian" onClose={() => setShowModal('detail-exam')}>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <FormField label="No. Soal" type="number" value={questionForm.question_number || ''} onChange={v => setQuestionForm({...questionForm, question_number: Number(v)})} />
                <FormSelect label="Tipe Soal" value={questionForm.question_type || 'multiple_choice'} onChange={v => setQuestionForm({...questionForm, question_type: v})}
                  options={[['multiple_choice','Pilihan Ganda'],['true_false','Benar/Salah'],['short_answer','Jawaban Singkat'],['essay','Essay']]} />
                <FormSelect label="Kesulitan" value={questionForm.difficulty || 'medium'} onChange={v => setQuestionForm({...questionForm, difficulty: v})}
                  options={[['easy','Mudah'],['medium','Sedang'],['hard','Sulit']]} />
              </div>
              <FormTextarea label="Pertanyaan *" value={questionForm.question_text || ''} onChange={v => setQuestionForm({...questionForm, question_text: v})} />
              <FormField label="Poin/Skor" type="number" value={questionForm.score || '1'} onChange={v => setQuestionForm({...questionForm, score: Number(v)})} />

              {(questionForm.question_type === 'multiple_choice') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Opsi Jawaban</label>
                  {(questionForm.options || []).map((opt: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${questionForm.correct_answer === opt.label ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{opt.label}</span>
                      <input type="text" value={opt.text} onChange={e => {
                        const opts = [...questionForm.options];
                        opts[i] = { ...opts[i], text: e.target.value };
                        setQuestionForm({...questionForm, options: opts});
                      }} placeholder={`Opsi ${opt.label}`} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <button type="button" onClick={() => setQuestionForm({...questionForm, correct_answer: opt.label})}
                        className={`text-xs px-2 py-1 rounded ${questionForm.correct_answer === opt.label ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-green-50'}`}>
                        {questionForm.correct_answer === opt.label ? '✓ Benar' : 'Pilih'}
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const labels = 'ABCDEFGHIJ';
                    const opts = [...(questionForm.options || [])];
                    if (opts.length < 10) opts.push({ label: labels[opts.length], text: '', isCorrect: false });
                    setQuestionForm({...questionForm, options: opts});
                  }} className="text-xs text-indigo-600 hover:underline">+ Tambah Opsi</button>
                </div>
              )}

              {questionForm.question_type === 'true_false' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Jawaban Benar</label>
                  <div className="flex gap-3 mt-1">
                    <button type="button" onClick={() => setQuestionForm({...questionForm, correct_answer: 'true', options: [{ label: 'true', text: 'Benar' }, { label: 'false', text: 'Salah' }]})}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${questionForm.correct_answer === 'true' ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-100 text-gray-600 border-2 border-transparent'}`}>Benar</button>
                    <button type="button" onClick={() => setQuestionForm({...questionForm, correct_answer: 'false', options: [{ label: 'true', text: 'Benar' }, { label: 'false', text: 'Salah' }]})}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium ${questionForm.correct_answer === 'false' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-100 text-gray-600 border-2 border-transparent'}`}>Salah</button>
                  </div>
                </div>
              )}

              {(questionForm.question_type === 'short_answer') && (
                <FormField label="Jawaban Benar" value={questionForm.correct_answer || ''} onChange={v => setQuestionForm({...questionForm, correct_answer: v})} placeholder="Jawaban yang benar" />
              )}

              <FormTextarea label="Penjelasan (opsional)" value={questionForm.explanation || ''} onChange={v => setQuestionForm({...questionForm, explanation: v})} />

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal('detail-exam')} className="flex-1 px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="button" onClick={handleCreateQuestion} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan Soal
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Enroll Participant to Batch Modal */}
        {showModal === 'enroll-batch' && (
          <Modal title="Daftarkan Peserta ke Batch" onClose={() => { setShowModal(null); setEnrollForm({}); }}>
            <div className="space-y-3">
              <div className="p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800 mb-2">
                <p className="font-medium">Batch: {selectedItem?.batch_name || batches.find(b => b.id === enrollForm.batch_id)?.batch_name || '-'}</p>
                <p className="text-xs text-indigo-600">{selectedItem?.batch_code || ''}</p>
              </div>
              <FormField label="ID Karyawan / Kandidat *" value={enrollForm.employee_id || ''} onChange={v => setEnrollForm({...enrollForm, employee_id: v})} placeholder="UUID atau ID karyawan" required />
              <FormField label="Nama Peserta" value={enrollForm.employee_name || ''} onChange={v => setEnrollForm({...enrollForm, employee_name: v})} placeholder="Nama lengkap peserta" />
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                <p>Peserta akan didaftarkan dengan status <strong>in_progress</strong>. Gunakan halaman Kelulusan untuk mengelola status kelulusan.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(null); setEnrollForm({}); }} className="flex-1 px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button type="button" onClick={handleEnrollBatch} disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Daftarkan
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Module Modal */}
        {showModal === 'detail-module' && selectedItem && (
          <Modal title="Detail Modul" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{selectedItem.code}</span>
                {statusBadge(selectedItem.status)}
              </div>
              <h3 className="text-lg font-bold">{selectedItem.title}</h3>
              <p className="text-sm text-gray-600">{selectedItem.description || '-'}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Kurikulum" value={selectedItem.curriculum_title} />
                <DetailField label="Tipe" value={MODULE_TYPES[selectedItem.module_type] || selectedItem.module_type} />
                <DetailField label="Metode" value={DELIVERY_METHODS[selectedItem.delivery_method] || selectedItem.delivery_method} />
                <DetailField label="Durasi" value={`${selectedItem.duration_hours} jam`} />
                <DetailField label="Urutan" value={selectedItem.order_index} />
                <DetailField label="Ada Ujian" value={selectedItem.has_exam ? 'Ya' : 'Tidak'} />
                {selectedItem.passing_score && <DetailField label="KKM" value={selectedItem.passing_score} />}
                <DetailField label="Wajib" value={selectedItem.is_mandatory ? 'Ya' : 'Opsional'} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDelete('delete-module', selectedItem.id, refreshModules)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Schedule Modal */}
        {showModal === 'detail-schedule' && selectedItem && (
          <Modal title="Detail Jadwal" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{selectedItem.session_title}</h3>
              {statusBadge(selectedItem.status)}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <DetailField label="Tanggal" value={fmtDate(selectedItem.session_date)} />
                <DetailField label="Waktu" value={`${selectedItem.start_time?.substring(0,5)} - ${selectedItem.end_time?.substring(0,5)}`} />
                <DetailField label="Batch" value={selectedItem.batch_name} />
                <DetailField label="Modul" value={selectedItem.module_title || '-'} />
                <DetailField label="Instruktur" value={selectedItem.instructor || '-'} />
                <DetailField label="Lokasi" value={selectedItem.location || '-'} />
                <DetailField label="Tipe Sesi" value={selectedItem.session_type} />
              </div>
              {selectedItem.notes && <div><p className="text-xs text-gray-500 mb-1">Catatan</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedItem.notes}</p></div>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDelete('delete-schedule', selectedItem.id, refreshSchedules)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </HQLayout>
  );
}

// ═══════════════════════════════════════════
// Reusable Sub-Components
// ═══════════════════════════════════════════
function StatCard({ icon: Icon, color, value, label }: { icon: any; color: string; value: any; label: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', purple: 'bg-purple-100 text-purple-600', green: 'bg-green-100 text-green-600', orange: 'bg-orange-100 text-orange-600', teal: 'bg-teal-100 text-teal-600', red: 'bg-red-100 text-red-600' };
  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color] || colors.blue}`}><Icon className="w-5 h-5" /></div>
        <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color, bold }: { label: string; value: any; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${color || 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-gray-400 py-12 col-span-2">{message}</p>;
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
  );
}

function FormTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; options: string[][]; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="font-medium">{value ?? '-'}</p>
    </div>
  );
}

function ModalActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border rounded-lg text-sm">Batal</button>
      <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
      </button>
    </div>
  );
}
