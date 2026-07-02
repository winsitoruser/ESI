import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { GraduationCap, Search, Plus, Eye, Edit, X, Calendar, Clock, Users, MapPin, Star, Award, BookOpen, CheckCircle2, BarChart3, TrendingUp, FileText, Download, Filter, ChevronRight, Target, Bookmark, Video, Monitor, Loader2, Trash2 } from 'lucide-react';

type TabKey = 'programs' | 'schedule' | 'certifications' | 'reports';

const TYPE_ICONS: Record<string, any> = { workshop: BookOpen, course: GraduationCap, hands_on: Monitor, certification: Award, online: Video, training: GraduationCap };
const STATUS_COLORS: Record<string, string> = { active: 'bg-green-100 text-green-700', upcoming: 'bg-blue-100 text-blue-700', completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' };
const CERT_STATUS_COLORS: Record<string, string> = { active: 'bg-green-100 text-green-700', expiring_soon: 'bg-yellow-100 text-yellow-700', expired: 'bg-red-100 text-red-700' };
const LEVEL_COLORS: Record<string, string> = { beginner: 'text-green-600', intermediate: 'text-blue-600', advanced: 'text-purple-600' };

const emptyProgramForm = { title: '', category: 'technical', type: 'training', trainer: '', location: '', status: 'upcoming', start_date: '', end_date: '', max_participants: '30', cost_per_person: '0', description: '' };

const MOCK_PROGRAMS = [
  { id: 'tp1', title: 'Food Safety & Hygiene', category: 'compliance', type: 'workshop', trainer: 'Dr. Andi Firmansyah', location: 'HQ Jakarta', status: 'active', start_date: '2026-03-01', end_date: '2026-03-15', max_participants: 30, enrolled: 24, completed: 12, rating: 4.5, cost_per_person: 500000 },
  { id: 'tp2', title: 'Leadership Development Program', category: 'leadership', type: 'course', trainer: 'External - John Maxwell Team', location: 'Hotel Borobudur', status: 'upcoming', start_date: '2026-03-18', end_date: '2026-03-19', max_participants: 20, enrolled: 18, completed: 0, rating: 0, cost_per_person: 2500000 },
  { id: 'tp3', title: 'Advanced Excel & Data Analytics', category: 'technical', type: 'hands_on', trainer: 'Rizki Firmansyah', location: 'Online (Zoom)', status: 'active', start_date: '2026-02-15', end_date: '2026-04-15', max_participants: 50, enrolled: 42, completed: 28, rating: 4.2, cost_per_person: 0 },
  { id: 'tp4', title: 'Customer Service Excellence', category: 'soft_skill', type: 'workshop', trainer: 'Yuni Kartika', location: 'Cabang Surabaya', status: 'completed', start_date: '2026-02-01', end_date: '2026-02-05', max_participants: 25, enrolled: 22, completed: 22, rating: 4.7, cost_per_person: 350000 },
  { id: 'tp5', title: 'Barista Certification Program', category: 'technical', type: 'certification', trainer: 'Made Wirawan', location: 'Cabang Bali', status: 'active', start_date: '2026-03-10', end_date: '2026-03-28', max_participants: 15, enrolled: 12, completed: 0, rating: 0, cost_per_person: 1500000 },
];

const MOCK_CERTS = [
  { id: 'cert1', employee_name: 'Ahmad Wijaya', cert_name: 'Certified Business Manager', issuer: 'BNSP', issue_date: '2025-06-15', expiry_date: '2028-06-15', status: 'active' },
  { id: 'cert2', employee_name: 'Lisa Permata', cert_name: 'Certified Management Accountant', issuer: 'IMA', issue_date: '2024-12-01', expiry_date: '2026-12-01', status: 'active' },
  { id: 'cert3', employee_name: 'Rina Anggraini', cert_name: 'Food Safety Certification', issuer: 'BPOM', issue_date: '2025-03-01', expiry_date: '2026-03-01', status: 'expiring_soon' },
  { id: 'cert4', employee_name: 'Made Wirawan', cert_name: 'SCA Barista Skills Foundation', issuer: 'SCA', issue_date: '2024-08-20', expiry_date: '2027-08-20', status: 'active' },
  { id: 'cert5', employee_name: 'Agus Setiawan', cert_name: 'SIM B2 Umum', issuer: 'Polri', issue_date: '2024-01-15', expiry_date: '2029-01-15', status: 'active' },
];

const MOCK_TRAINING_ANALYTICS = {
  totalPrograms: 12, activePrograms: 3, totalEnrolled: 118, totalCompleted: 62,
  totalBudget: 45000000, budgetUsed: 28500000, avgRating: 4.35, expiringCerts: 3, expiredCerts: 1,
};

export default function TrainingPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('programs');
  const [programs, setPrograms] = useState<any[]>(MOCK_PROGRAMS);
  const [certs, setCerts] = useState<any[]>(MOCK_CERTS);
  const [analytics, setAnalytics] = useState<any>(MOCK_TRAINING_ANALYTICS);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyProgramForm);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fmtCur = (n: number) => !n ? 'Gratis' : `Rp ${n.toLocaleString('id-ID')}`;

  // ── API fetch functions ──
  const fetchPrograms = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/hris/training?action=programs');
      const data = await res.json();
      if (data.data?.length) setPrograms(Array.isArray(data.data) ? data.data : MOCK_PROGRAMS);
      else setPrograms(MOCK_PROGRAMS);
    } catch (e) { console.warn('Failed to fetch programs:', e); setPrograms(MOCK_PROGRAMS); }
  }, []);

  const fetchCerts = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/hris/training?action=certifications');
      const data = await res.json();
      if (data.data?.length) setCerts(Array.isArray(data.data) ? data.data : MOCK_CERTS);
      else setCerts(MOCK_CERTS);
    } catch (e) { console.warn('Failed to fetch certifications:', e); setCerts(MOCK_CERTS); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/hris/training?action=analytics');
      const data = await res.json();
      if (data.data) setAnalytics(data.data);
      else setAnalytics(MOCK_TRAINING_ANALYTICS);
    } catch (e) { console.warn('Failed to fetch analytics:', e); setAnalytics(MOCK_TRAINING_ANALYTICS); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPrograms(), fetchCerts(), fetchAnalytics()]).finally(() => setLoading(false));
  }, [fetchPrograms, fetchCerts, fetchAnalytics]);

  // ── CRUD handlers ──
  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title) { showToast('Judul program wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/hq/hris/training?action=create-program', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, max_participants: Number(createForm.max_participants) || 30, cost_per_person: Number(createForm.cost_per_person) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Program pelatihan berhasil dibuat');
        setShowCreateModal(false);
        setCreateForm(emptyProgramForm);
        fetchPrograms();
      } else { showToast(data.error || 'Gagal membuat program', 'error'); }
    } catch (e) { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  }

  async function handleDeleteProgram(id: string) {
    if (!confirm('Hapus program pelatihan ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/training?action=delete-program&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Program dihapus'); setSelected(null); fetchPrograms(); }
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  }

  // ── Derived data ──
  const categories = [...new Set(programs.map(p => p.category).filter(Boolean))];

  const filtered = programs.filter(p => {
    if (search && !(p.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const filteredCerts = certs.filter(c => {
    const name = c.employee_name || '';
    const certName = c.cert_name || c.certification_name || '';
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !certName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const totalEnrolled = analytics?.totalEnrolled ?? programs.reduce((s, p) => s + (p.enrolled || p.current_participants || 0), 0);
  const totalCompleted = analytics?.totalCompleted ?? programs.reduce((s, p) => s + (p.completed || 0), 0);
  const activeProgramCount = analytics?.activePrograms ?? programs.filter(p => p.status === 'active').length;
  const ratedPrograms = programs.filter(p => (p.rating || 0) > 0);
  const avgRating = ratedPrograms.length > 0 ? ratedPrograms.reduce((s, p) => s + p.rating, 0) / ratedPrograms.length : 0;
  const expiringCerts = (analytics?.expiringCerts ?? 0) + (analytics?.expiredCerts ?? 0) || certs.filter(c => c.status === 'expiring_soon' || c.status === 'expired').length;

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'programs', label: 'Program Pelatihan', icon: BookOpen },
    { key: 'schedule', label: 'Jadwal', icon: Calendar },
    { key: 'certifications', label: 'Sertifikasi', icon: Award },
    { key: 'reports', label: 'Laporan', icon: BarChart3 },
  ];

  const getProgramType = (p: any) => p.type || p.training_type || 'training';
  const getCertName = (c: any) => c.cert_name || c.certification_name || '-';
  const getCertNumber = (c: any) => c.cert_number || c.credential_id || '-';

  return (
    <HQLayout title={t('hris.trainingTitle')} subtitle={t('hris.trainingSubtitle')}>
      <div className="space-y-6">
        {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><BookOpen className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{activeProgramCount}</p><p className="text-xs text-gray-500">Program Aktif</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold">{totalEnrolled}</p><p className="text-xs text-gray-500">Total Peserta</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{totalCompleted}</p><p className="text-xs text-gray-500">Selesai Pelatihan</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Star className="w-5 h-5 text-yellow-600" /></div>
              <div><p className="text-2xl font-bold">{avgRating.toFixed(1)}</p><p className="text-xs text-gray-500">Rata-rata Rating</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-red-100 rounded-lg"><Award className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-2xl font-bold">{expiringCerts}</p><p className="text-xs text-gray-500">Sertifikasi Perhatian</p></div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterCat(''); setFilterStatus(''); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /><span className="ml-2 text-sm text-gray-500">Memuat data...</span></div>}

        {/* PROGRAMS TAB */}
        {!loading && tab === 'programs' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari program..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">Semua Kategori</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">Semua Status</option><option value="active">Aktif</option><option value="upcoming">Akan Datang</option><option value="completed">Selesai</option></select>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Program</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map(p => {
                const pType = getProgramType(p);
                const Icon = TYPE_ICONS[pType] || BookOpen;
                const enrolled = p.enrolled || p.current_participants || 0;
                const maxP = p.max_participants || 30;
                const pct = maxP > 0 ? Math.round(enrolled / maxP * 100) : 0;
                return (
                  <div key={p.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group" onClick={() => setSelected(p)}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors"><Icon className="w-5 h-5 text-indigo-600" /></div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{p.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{p.category}</span>
                            {p.level && <><span className="text-xs text-gray-300">|</span><span className={`text-xs font-medium ${LEVEL_COLORS[p.level] || ''}`}>{p.level}</span></>}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[p.status] || ''}`}>{p.status === 'active' ? 'Aktif' : p.status === 'upcoming' ? 'Akan Datang' : p.status === 'completed' ? 'Selesai' : p.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {p.duration_hours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration_hours} jam</span>}
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location || '-'}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolled}/{maxP}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex-1 mr-3">
                        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                        <p className="text-[10px] text-gray-400 mt-1">{pct}% terisi</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{fmtCur(p.cost_per_person || 0)}</p>
                        {(p.rating || 0) > 0 && <div className="flex items-center gap-1 justify-end mt-0.5"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-xs">{p.rating}</span></div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Tidak ada program ditemukan</p>}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {!loading && tab === 'schedule' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Jadwal Pelatihan</h2>
            <div className="space-y-3">
              {programs.filter(p => p.status !== 'completed').sort((a, b) => (a.start_date || '').localeCompare(b.start_date || '')).map(p => {
                const pType = getProgramType(p);
                const Icon = TYPE_ICONS[pType] || BookOpen;
                const enrolled = p.enrolled || p.current_participants || 0;
                return (
                  <div key={p.id} className="bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelected(p)}>
                    <div className="text-center min-w-[60px]">
                      <p className="text-2xl font-bold text-indigo-600">{p.start_date ? new Date(p.start_date).getDate() : '-'}</p>
                      <p className="text-xs text-gray-500">{p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}</p>
                    </div>
                    <div className="w-px h-12 bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[p.status] || ''}`}>{p.status === 'upcoming' ? 'Akan Datang' : 'Berlangsung'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Icon className="w-3 h-3" />{p.category || '-'}</span>
                        {p.duration_hours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration_hours} jam</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location || '-'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{enrolled}/{p.max_participants || '-'} peserta</p>
                      <p className="text-xs text-gray-500">{p.trainer || p.trainer_name || p.instructor || '-'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                );
              })}
              {programs.filter(p => p.status !== 'completed').length === 0 && <p className="text-center text-gray-400 py-8">Tidak ada jadwal pelatihan mendatang</p>}
            </div>
          </div>
        )}

        {/* CERTIFICATIONS TAB */}
        {!loading && tab === 'certifications' && (
          <div>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari sertifikasi..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">Semua Status</option><option value="active">Aktif</option><option value="expiring_soon">Segera Kedaluwarsa</option><option value="expired">Kedaluwarsa</option></select>
            </div>
            {expiringCerts > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div><p className="text-sm font-medium text-amber-900">{expiringCerts} sertifikasi perlu diperhatikan</p><p className="text-xs text-amber-700 mt-0.5">Ada sertifikasi yang akan atau sudah kedaluwarsa. Segera jadwalkan perpanjangan.</p></div>
              </div>
            )}
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Karyawan</th><th className="px-4 py-3 text-left">Sertifikasi</th><th className="px-4 py-3 text-left">Penerbit</th>
                  <th className="px-4 py-3 text-center">Berlaku</th><th className="px-4 py-3 text-center">Kedaluwarsa</th><th className="px-4 py-3 text-center">Status</th>
                </tr></thead>
                <tbody className="divide-y">
                  {filteredCerts.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><p className="font-medium">{c.employee_name || '-'}</p><p className="text-xs text-gray-500">{c.employee_id}</p></td>
                      <td className="px-4 py-3"><p className="font-medium">{getCertName(c)}</p><p className="text-xs text-gray-500">{getCertNumber(c)}</p></td>
                      <td className="px-4 py-3 text-sm">{c.issuer || c.issuing_organization || '-'}</td>
                      <td className="px-4 py-3 text-center text-xs">{c.issued_date ? new Date(c.issued_date).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-center text-xs">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('id-ID') : '-'}</td>
                      <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${CERT_STATUS_COLORS[c.status] || ''}`}>{c.status === 'active' ? 'Aktif' : c.status === 'expiring_soon' ? 'Segera Kedaluwarsa' : 'Kedaluwarsa'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCerts.length === 0 && <p className="text-center text-gray-400 py-8">Tidak ada sertifikasi ditemukan</p>}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {!loading && tab === 'reports' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Pelatihan per Kategori</h3>
              <div className="space-y-3">
                {categories.map(cat => {
                  const count = programs.filter(p => p.category === cat).length;
                  const enrolled = programs.filter(p => p.category === cat).reduce((s, p) => s + (p.enrolled || p.current_participants || 0), 0);
                  return (
                    <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><p className="text-sm font-medium">{cat}</p><p className="text-xs text-gray-500">{count} program</p></div>
                      <p className="text-sm font-bold text-indigo-600">{enrolled} peserta</p>
                    </div>
                  );
                })}
                {categories.length === 0 && <p className="text-sm text-gray-400">Belum ada data</p>}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Tingkat Penyelesaian</h3>
              <div className="space-y-3">
                {programs.map(p => {
                  const enrolled = p.enrolled || p.current_participants || 0;
                  const completed = p.completed || 0;
                  const pct = enrolled > 0 ? Math.round(completed / enrolled * 100) : 0;
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-700 truncate mr-2">{p.title}</span><span className="font-medium">{pct}%</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Anggaran Pelatihan</h3>
              <div className="space-y-3">
                {programs.map(p => {
                  const enrolled = p.enrolled || p.current_participants || 0;
                  const totalCost = (p.cost_per_person || 0) * enrolled;
                  return (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate mr-2">{p.title}</span>
                      <span className="text-sm font-medium whitespace-nowrap">{fmtCur(totalCost)}</span>
                    </div>
                  );
                })}
                <div className="pt-3 border-t flex justify-between">
                  <span className="font-semibold">Total Anggaran</span>
                  <span className="font-bold text-indigo-600">{fmtCur(analytics?.totalBudget ?? programs.reduce((s, p) => s + (p.cost_per_person || 0) * (p.enrolled || p.current_participants || 0), 0))}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Status Sertifikasi</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-green-600">{analytics?.activeCerts ?? certs.filter(c => c.status === 'active').length}</p><p className="text-xs text-gray-500">Aktif</p></div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{analytics?.expiringCerts ?? certs.filter(c => c.status === 'expiring_soon').length}</p><p className="text-xs text-gray-500">Segera Kedaluwarsa</p></div>
                <div className="bg-red-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-red-600">{analytics?.expiredCerts ?? certs.filter(c => c.status === 'expired').length}</p><p className="text-xs text-gray-500">Kedaluwarsa</p></div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE PROGRAM MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">Buat Program Pelatihan</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateProgram} className="p-5 space-y-3">
                <div><label className="text-sm font-medium text-gray-700">Judul Program *</label><input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Kategori</label><select value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="technical">Teknikal</option><option value="soft_skill">Soft Skill</option><option value="leadership">Kepemimpinan</option><option value="compliance">Kepatuhan</option><option value="finance">Keuangan</option><option value="operations">Operasional</option></select></div>
                  <div><label className="text-sm font-medium text-gray-700">Tipe</label><select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="training">Pelatihan</option><option value="workshop">Lokakarya</option><option value="certification">Sertifikasi</option><option value="online">Daring</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Trainer</label><input value={createForm.trainer} onChange={e => setCreateForm({ ...createForm, trainer: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Lokasi</label><input value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Tanggal Mulai</label><input type="date" value={createForm.start_date} onChange={e => setCreateForm({ ...createForm, start_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Tanggal Selesai</label><input type="date" value={createForm.end_date} onChange={e => setCreateForm({ ...createForm, end_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Maks Peserta</label><input type="number" value={createForm.max_participants} onChange={e => setCreateForm({ ...createForm, max_participants: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Biaya/Orang</label><input type="number" value={createForm.cost_per_person} onChange={e => setCreateForm({ ...createForm, cost_per_person: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PROGRAM DETAIL MODAL */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {(() => { const Icon = TYPE_ICONS[getProgramType(selected)] || BookOpen; return <div className="p-2.5 bg-indigo-50 rounded-xl"><Icon className="w-6 h-6 text-indigo-600" /></div>; })()}
                  <div><h3 className="font-bold text-lg">{selected.title}</h3><p className="text-sm text-gray-500">{selected.category}{selected.level ? ` - ${selected.level}` : ''}</p></div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selected.status] || ''}`}>{selected.status}</span>
                  {(selected.rating || 0) > 0 && <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="text-sm font-medium">{selected.rating}</span></div>}
                </div>
                <p className="text-sm text-gray-700">{selected.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Instruktur</p><p className="font-medium">{selected.trainer || selected.trainer_name || selected.instructor || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Lokasi</p><p className="font-medium">{selected.location || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Biaya/Orang</p><p className="font-medium">{fmtCur(selected.cost_per_person || 0)}</p></div>
                  <div><p className="text-gray-500 text-xs">Peserta</p><p className="font-medium">{selected.enrolled || selected.current_participants || 0}/{selected.max_participants || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Mulai</p><p className="font-medium">{selected.start_date ? new Date(selected.start_date).toLocaleDateString('id-ID') : '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Selesai</p><p className="font-medium">{selected.end_date ? new Date(selected.end_date).toLocaleDateString('id-ID') : '-'}</p></div>
                </div>
                {(() => {
                  const enrolled = selected.enrolled || selected.current_participants || 0;
                  const maxP = selected.max_participants || 1;
                  return (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Kapasitas Terisi</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-3"><div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${Math.round(enrolled / maxP * 100)}%` }} /></div>
                        <span className="text-sm font-medium">{enrolled}/{maxP}</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleDeleteProgram(selected.id)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus Program</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
