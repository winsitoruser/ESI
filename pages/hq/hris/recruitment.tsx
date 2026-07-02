import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { UserPlus, Search, Filter, Plus, Eye, Edit, Trash2, X, Check, ChevronRight, Briefcase, MapPin, Clock, Users, Star, FileText, Download, Upload, Calendar, DollarSign, BarChart3, TrendingUp, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

type TabKey = 'openings' | 'candidates' | 'pipeline' | 'analytics';

const STAGES = ['applied', 'screening', 'test', 'interview', 'offer', 'hired', 'rejected'];
const STAGE_LABELS: Record<string, string> = { applied: 'Lamaran Masuk', screening: 'Penyaringan', test: 'Tes', interview: 'Wawancara', offer: 'Penawaran', hired: 'Diterima', rejected: 'Ditolak' };
const STAGE_COLORS: Record<string, string> = { applied: 'bg-gray-100 text-gray-700', screening: 'bg-blue-100 text-blue-700', test: 'bg-indigo-100 text-indigo-700', interview: 'bg-purple-100 text-purple-700', offer: 'bg-orange-100 text-orange-700', hired: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
const PRIORITY_COLORS: Record<string, string> = { high: 'border-red-400 bg-red-50', medium: 'border-yellow-400 bg-yellow-50', low: 'border-gray-300 bg-gray-50' };

const emptyForm = { title: '', department: '', location: '', type: 'full_time', priority: 'medium', salary_min: '', salary_max: '', description: '', requirements: '', deadline: '' };

const MOCK_OPENINGS = [
  { id: 'op1', title: 'Branch Manager - Yogyakarta', department: 'OPERATIONS', location: 'Cabang Yogyakarta', type: 'full_time', priority: 'high', salary_min: 15000000, salary_max: 20000000, status: 'open', applicants: 28, deadline: '2026-03-31', created_at: '2026-02-15' },
  { id: 'op2', title: 'Senior Barista', department: 'KITCHEN', location: 'Cabang Bali', type: 'full_time', priority: 'medium', salary_min: 5000000, salary_max: 7000000, status: 'open', applicants: 45, deadline: '2026-04-15', created_at: '2026-03-01' },
  { id: 'op3', title: 'Warehouse Staff', department: 'WAREHOUSE', location: 'Gudang Bekasi', type: 'full_time', priority: 'high', salary_min: 4500000, salary_max: 5500000, status: 'open', applicants: 62, deadline: '2026-03-25', created_at: '2026-02-20' },
  { id: 'op4', title: 'IT Support Specialist', department: 'IT', location: 'HQ Jakarta', type: 'full_time', priority: 'medium', salary_min: 8000000, salary_max: 12000000, status: 'open', applicants: 18, deadline: '2026-04-10', created_at: '2026-03-05' },
  { id: 'op5', title: 'Sales Representative', department: 'SALES', location: 'Cabang Semarang', type: 'full_time', priority: 'low', salary_min: 4000000, salary_max: 6000000, status: 'closed', applicants: 35, deadline: '2026-02-28', created_at: '2026-01-15' },
];

const MOCK_CANDIDATES = [
  { id: 'c1', name: 'Andi Saputra', email: 'andi@email.com', phone: '081234567001', opening_title: 'Branch Manager - Yogyakarta', stage: 'interview', current_stage: 'interview', applied_date: '2026-02-20', rating: 4, experience_years: 8, education: 'S1 Manajemen' },
  { id: 'c2', name: 'Maya Putri', email: 'maya@email.com', phone: '081234567002', opening_title: 'Senior Barista', stage: 'test', current_stage: 'test', applied_date: '2026-03-05', rating: 3, experience_years: 4, education: 'SMA' },
  { id: 'c3', name: 'Dimas Prasetyo', email: 'dimas@email.com', phone: '081234567003', opening_title: 'IT Support Specialist', stage: 'screening', current_stage: 'screening', applied_date: '2026-03-10', rating: 0, experience_years: 3, education: 'S1 Teknik Informatika' },
  { id: 'c4', name: 'Rani Kusuma', email: 'rani@email.com', phone: '081234567004', opening_title: 'Warehouse Staff', stage: 'offer', current_stage: 'offer', applied_date: '2026-02-25', rating: 5, experience_years: 5, education: 'D3 Logistik' },
  { id: 'c5', name: 'Bambang Suryadi', email: 'bambang2@email.com', phone: '081234567005', opening_title: 'Sales Representative', stage: 'hired', current_stage: 'hired', applied_date: '2026-01-20', rating: 4, experience_years: 6, education: 'S1 Marketing' },
  { id: 'c6', name: 'Sinta Dewi', email: 'sinta@email.com', phone: '081234567006', opening_title: 'Branch Manager - Yogyakarta', stage: 'interview', current_stage: 'interview', applied_date: '2026-02-22', rating: 4, experience_years: 10, education: 'S2 MBA' },
];

const MOCK_RECRUITMENT_ANALYTICS = {
  totalOpenings: 5, activeOpenings: 4, totalApplicants: 188, hiredThisMonth: 3,
  avgTimeToHire: 28, avgCostPerHire: 2500000, offerAcceptanceRate: 85,
  byStage: { applied: 52, screening: 38, test: 28, interview: 22, offer: 8, hired: 12, rejected: 28 },
};

export default function RecruitmentPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('openings');
  const [openings, setOpenings] = useState<any[]>(MOCK_OPENINGS);
  const [candidates, setCandidates] = useState<any[]>(MOCK_CANDIDATES);
  const [analytics, setAnalytics] = useState<any>(MOCK_RECRUITMENT_ANALYTICS);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [selectedOpening, setSelectedOpening] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  // ── API fetch functions ──
  const fetchOpenings = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/hris/recruitment?action=openings');
      const data = await res.json();
      if (data.data?.length) setOpenings(Array.isArray(data.data) ? data.data : MOCK_OPENINGS);
      else setOpenings(MOCK_OPENINGS);
    } catch (e) { console.warn('Failed to fetch openings:', e); setOpenings(MOCK_OPENINGS); }
  }, []);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/hris/recruitment?action=candidates');
      const data = await res.json();
      if (data.data?.length) setCandidates(Array.isArray(data.data) ? data.data : MOCK_CANDIDATES);
      else setCandidates(MOCK_CANDIDATES);
    } catch (e) { console.warn('Failed to fetch candidates:', e); setCandidates(MOCK_CANDIDATES); }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/hris/recruitment?action=analytics');
      const data = await res.json();
      if (data.data) setAnalytics(data.data);
      else setAnalytics(MOCK_RECRUITMENT_ANALYTICS);
    } catch (e) { console.warn('Failed to fetch analytics:', e); setAnalytics(MOCK_RECRUITMENT_ANALYTICS); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOpenings(), fetchCandidates(), fetchAnalytics()]).finally(() => setLoading(false));
  }, [fetchOpenings, fetchCandidates, fetchAnalytics]);

  // ── CRUD handlers ──
  async function handleCreateOpening(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.title || !createForm.department) { showToast('Judul dan departemen wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/hq/hris/recruitment?action=create-opening', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, salary_min: Number(createForm.salary_min) || 0, salary_max: Number(createForm.salary_max) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Lowongan berhasil dibuat');
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        fetchOpenings();
      } else { showToast(data.error || 'Gagal membuat lowongan', 'error'); }
    } catch (e) { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  }

  async function handleDeleteOpening(id: string) {
    if (!confirm('Hapus lowongan ini?')) return;
    try {
      const res = await fetch(`/api/hq/hris/recruitment?action=delete-opening&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Lowongan dihapus'); setSelectedOpening(null); fetchOpenings(); }
    } catch (e) { showToast('Gagal menghapus', 'error'); }
  }

  async function handleAdvanceCandidate(candidate: any) {
    const curStage = candidate.stage || candidate.current_stage;
    const nextIdx = STAGES.indexOf(curStage) + 1;
    if (nextIdx >= STAGES.length) return;
    const nextStage = STAGES[nextIdx];
    try {
      const res = await fetch('/api/hq/hris/recruitment?action=update-candidate', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id, stage: nextStage })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Kandidat dimajukan ke ${STAGE_LABELS[nextStage]}`);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, stage: nextStage, current_stage: nextStage } : c));
        setSelectedCandidate((prev: any) => prev ? { ...prev, stage: nextStage, current_stage: nextStage } : null);
      }
    } catch (e) { showToast('Gagal memperbarui stage', 'error'); }
  }

  async function handleRejectCandidate(candidate: any) {
    try {
      const res = await fetch('/api/hq/hris/recruitment?action=update-candidate', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: candidate.id, stage: 'rejected', status: 'inactive' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Kandidat ditolak', 'error');
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, stage: 'rejected', current_stage: 'rejected' } : c));
        setSelectedCandidate((prev: any) => prev ? { ...prev, stage: 'rejected', current_stage: 'rejected' } : null);
      }
    } catch (e) { showToast('Gagal menolak kandidat', 'error'); }
  }

  // ── Derived data ──
  const filteredOpenings = openings.filter(o => {
    if (search && !o.title?.toLowerCase().includes(search.toLowerCase()) && !(o.department || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDept && o.department !== filterDept) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    return true;
  });

  const filteredCandidates = candidates.filter(c => {
    const stage = c.stage || c.current_stage;
    if (search && !(c.name || c.full_name || '').toLowerCase().includes(search.toLowerCase()) && !(c.position || c.position_applied || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && stage !== filterStatus) return false;
    return true;
  });

  const pipelineStats = STAGES.filter(s => s !== 'rejected').map(stage => ({
    stage, label: STAGE_LABELS[stage],
    count: candidates.filter(c => (c.stage || c.current_stage) === stage).length,
    candidates: candidates.filter(c => (c.stage || c.current_stage) === stage)
  }));

  const totalApplicants = candidates.length;
  const hiredCount = candidates.filter(c => (c.stage || c.current_stage) === 'hired').length;
  const openCount = openings.filter(o => o.status === 'open').length;
  const avgTimeToHire = analytics?.avgTimeToHire || 21;
  const departments = [...new Set(openings.map(o => o.department).filter(Boolean))];

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'openings', label: 'Lowongan', icon: Briefcase },
    { key: 'candidates', label: 'Kandidat', icon: Users },
    { key: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { key: 'analytics', label: 'Analitik', icon: BarChart3 },
  ];

  const getCandidateName = (c: any) => c.name || c.full_name || 'N/A';
  const getCandidatePosition = (c: any) => c.position || c.position_applied || c.job_id || '-';
  const getCandidateStage = (c: any) => c.stage || c.current_stage || 'applied';

  return (
    <HQLayout title={t('hris.recruitmentTitle')} subtitle={t('hris.recruitmentSubtitle')}>
      <div className="space-y-6">
        {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><Briefcase className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs text-gray-500">Lowongan Aktif</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold">{totalApplicants}</p><p className="text-xs text-gray-500">Total Pelamar</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold">{hiredCount}</p><p className="text-xs text-gray-500">Diterima</p></div></div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><Clock className="w-5 h-5 text-orange-600" /></div>
              <div><p className="text-2xl font-bold">{avgTimeToHire}d</p><p className="text-xs text-gray-500">Rata-rata Waktu Rekrut</p></div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterDept(''); setFilterStatus(''); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /><span className="ml-2 text-sm text-gray-500">Memuat data...</span></div>}

        {/* OPENINGS TAB */}
        {!loading && tab === 'openings' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex gap-2 flex-wrap flex-1">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari lowongan..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">Semua Dept</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">Semua Status</option><option value="open">Buka</option><option value="closed">Ditutup</option><option value="on_hold">Ditunda</option></select>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Lowongan</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {filteredOpenings.map(o => (
                <div key={o.id} className={`bg-white border-l-4 ${PRIORITY_COLORS[o.priority] || 'border-gray-300'} border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer`} onClick={() => setSelectedOpening(o)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{o.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{o.department}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.location}</span>
                        <span className="capitalize">{(o.type || '').replace('_', ' ')}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${o.status === 'open' ? 'bg-green-100 text-green-700' : o.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-3">{o.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex gap-4 text-xs">
                      <span><strong className="text-gray-900">{o.applicants || 0}</strong> <span className="text-gray-500">pelamar</span></span>
                    </div>
                    <span className="text-xs text-gray-400">{fmtCur(o.salary_min)} - {fmtCur(o.salary_max)}</span>
                  </div>
                </div>
              ))}
              {filteredOpenings.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Tidak ada lowongan ditemukan</p>}
            </div>
          </div>
        )}

        {/* CANDIDATES TAB */}
        {!loading && tab === 'candidates' && (
          <div>
            <div className="flex gap-2 flex-wrap mb-4">
              <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kandidat..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm"><option value="">Semua Stage</option>{STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Kandidat</th><th className="px-4 py-3 text-left">Posisi</th><th className="px-4 py-3 text-left">Sumber</th>
                  <th className="px-4 py-3 text-center">Pengalaman</th><th className="px-4 py-3 text-center">Rating</th><th className="px-4 py-3 text-center">Stage</th><th className="px-4 py-3 text-center">Aksi</th>
                </tr></thead>
                <tbody className="divide-y">
                  {filteredCandidates.map(c => {
                    const name = getCandidateName(c);
                    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    const stage = getCandidateStage(c);
                    return (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                            <div><p className="font-medium">{name}</p><p className="text-xs text-gray-500">{c.email}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getCandidatePosition(c)}</td>
                        <td className="px-4 py-3 text-xs">{c.source || '-'}</td>
                        <td className="px-4 py-3 text-center">{c.experience_years || c.experience || '-'}</td>
                        <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /><span className="font-medium">{c.rating || 0}</span></div></td>
                        <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${STAGE_COLORS[stage] || STAGE_COLORS.applied}`}>{STAGE_LABELS[stage] || stage}</span></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => setSelectedCandidate(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredCandidates.length === 0 && <p className="text-center text-gray-400 py-8">Tidak ada kandidat ditemukan</p>}
            </div>
          </div>
        )}

        {/* PIPELINE TAB */}
        {!loading && tab === 'pipeline' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Alur Rekrutmen</h2>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {pipelineStats.map((ps) => (
                <div key={ps.stage} className="min-w-[220px] flex-1 bg-white border rounded-xl overflow-hidden">
                  <div className={`px-4 py-2.5 ${STAGE_COLORS[ps.stage]} font-medium text-sm flex justify-between`}>
                    <span>{ps.label}</span><span className="font-bold">{ps.count}</span>
                  </div>
                  <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
                    {ps.candidates.map((c: any) => (
                      <div key={c.id} onClick={() => setSelectedCandidate(c)} className="p-2.5 bg-gray-50 rounded-lg hover:bg-indigo-50 cursor-pointer transition-colors">
                        <p className="text-sm font-medium text-gray-900 truncate">{getCandidateName(c)}</p>
                        <p className="text-xs text-gray-500 truncate">{getCandidatePosition(c)}</p>
                        <div className="flex items-center gap-1 mt-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="text-xs">{c.rating || 0}</span></div>
                      </div>
                    ))}
                    {ps.candidates.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Kosong</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {!loading && tab === 'analytics' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Sumber Pelamar</h3>
              <div className="space-y-3">
                {(analytics?.sourceStats || ['LinkedIn', 'Jobstreet', 'Walk-in', 'Referral'].map(s => ({ source: s, count: candidates.filter(c => c.source === s).length }))).map((src: any) => {
                  const pct = totalApplicants > 0 ? Math.round((src.count || 0) / totalApplicants * 100) : 0;
                  return (
                    <div key={src.source}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-700">{src.source}</span><span className="font-medium">{src.count} ({pct}%)</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Status per Lowongan</h3>
              <div className="space-y-3">
                {openings.filter(o => o.status === 'open').map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="text-sm font-medium">{o.title}</p><p className="text-xs text-gray-500">{o.department} - {o.location}</p></div>
                    <div className="text-right"><p className="text-sm font-bold text-indigo-600">{o.applicants || 0}</p><p className="text-xs text-gray-500">pelamar</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Konversi Alur</h3>
              <div className="space-y-2">
                {pipelineStats.map((ps) => {
                  const pct = totalApplicants > 0 ? Math.round(ps.count / totalApplicants * 100) : 0;
                  return (
                    <div key={ps.stage} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20">{ps.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(pct, 8)}%` }}>
                          <span className="text-[10px] text-white font-bold">{ps.count}</span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Metrik Rekrutmen</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-blue-600">{avgTimeToHire}</p><p className="text-xs text-gray-500">Rata-rata Hari Rekrut</p></div>
                <div className="bg-green-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-green-600">{totalApplicants > 0 ? Math.round(hiredCount / totalApplicants * 100) : 0}%</p><p className="text-xs text-gray-500">Tingkat Penerimaan</p></div>
                <div className="bg-purple-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-purple-600">{openCount}</p><p className="text-xs text-gray-500">Posisi Terbuka</p></div>
                <div className="bg-orange-50 rounded-lg p-4 text-center"><p className="text-2xl font-bold text-orange-600">{totalApplicants > 0 ? Math.round(candidates.filter(c => (c.rating || 0) >= 4).length / totalApplicants * 100) : 0}%</p><p className="text-xs text-gray-500">Tingkat Kualitas Rekrut</p></div>
              </div>
            </div>
          </div>
        )}

        {/* CREATE OPENING MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">Buat Lowongan Baru</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateOpening} className="p-5 space-y-3">
                <div><label className="text-sm font-medium text-gray-700">Judul Posisi *</label><input value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Departemen *</label><input value={createForm.department} onChange={e => setCreateForm({ ...createForm, department: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" required /></div>
                  <div><label className="text-sm font-medium text-gray-700">Lokasi</label><input value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Tipe</label><select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="full_time">Penuh Waktu</option><option value="part_time">Paruh Waktu</option><option value="contract">Kontrak</option><option value="internship">Magang</option></select></div>
                  <div><label className="text-sm font-medium text-gray-700">Prioritas</label><select value={createForm.priority} onChange={e => setCreateForm({ ...createForm, priority: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="high">Tinggi</option><option value="medium">Sedang</option><option value="low">Rendah</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Gaji Min</label><input type="number" value={createForm.salary_min} onChange={e => setCreateForm({ ...createForm, salary_min: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="5000000" /></div>
                  <div><label className="text-sm font-medium text-gray-700">Gaji Max</label><input type="number" value={createForm.salary_max} onChange={e => setCreateForm({ ...createForm, salary_max: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="10000000" /></div>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Batas Lamaran</label><input type="date" value={createForm.deadline} onChange={e => setCreateForm({ ...createForm, deadline: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Persyaratan</label><textarea value={createForm.requirements} onChange={e => setCreateForm({ ...createForm, requirements: e.target.value })} rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Satu persyaratan per baris" /></div>
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

        {/* CANDIDATE DETAIL MODAL */}
        {selectedCandidate && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">{getCandidateName(selectedCandidate).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                    <div><h3 className="font-bold text-lg">{getCandidateName(selectedCandidate)}</h3><p className="text-sm text-gray-500">{getCandidatePosition(selectedCandidate)}</p></div>
                  </div>
                  <button onClick={() => setSelectedCandidate(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STAGE_COLORS[getCandidateStage(selectedCandidate)] || STAGE_COLORS.applied}`}>{STAGE_LABELS[getCandidateStage(selectedCandidate)] || getCandidateStage(selectedCandidate)}</span>
                  <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="text-sm font-medium">{selectedCandidate.rating || 0}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium">{selectedCandidate.email || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Telepon</p><p className="font-medium">{selectedCandidate.phone || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Pengalaman</p><p className="font-medium">{selectedCandidate.experience || selectedCandidate.experience_years || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Pendidikan</p><p className="font-medium">{selectedCandidate.education || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Sumber</p><p className="font-medium">{selectedCandidate.source || '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Tgl Melamar</p><p className="font-medium">{selectedCandidate.applied_date ? new Date(selectedCandidate.applied_date).toLocaleDateString('id-ID') : '-'}</p></div>
                </div>
                {selectedCandidate.notes && <div><p className="text-xs text-gray-500 mb-1">Catatan</p><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedCandidate.notes}</p></div>}
                <div className="flex gap-2 pt-2">
                  {getCandidateStage(selectedCandidate) !== 'hired' && getCandidateStage(selectedCandidate) !== 'rejected' && (
                    <>
                      <button onClick={() => handleAdvanceCandidate(selectedCandidate)}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center justify-center gap-1"><ChevronRight className="w-4 h-4" /> Majukan Stage</button>
                      <button onClick={() => handleRejectCandidate(selectedCandidate)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50"><XCircle className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OPENING DETAIL MODAL */}
        {selectedOpening && !selectedCandidate && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between items-start">
                <div><h3 className="font-bold text-lg">{selectedOpening.title}</h3><p className="text-sm text-gray-500">{selectedOpening.department} - {selectedOpening.location}</p></div>
                <button onClick={() => setSelectedOpening(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${selectedOpening.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{selectedOpening.status}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${selectedOpening.priority === 'high' ? 'bg-red-100 text-red-700' : selectedOpening.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>Prioritas {selectedOpening.priority}</span>
                </div>
                <p className="text-sm text-gray-700">{selectedOpening.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs">Gaji</p><p className="font-medium">{fmtCur(selectedOpening.salary_min)} - {fmtCur(selectedOpening.salary_max)}</p></div>
                  <div><p className="text-gray-500 text-xs">Tipe</p><p className="font-medium capitalize">{(selectedOpening.type || '').replace('_', ' ')}</p></div>
                  <div><p className="text-gray-500 text-xs">Diposting</p><p className="font-medium">{selectedOpening.posted_date ? new Date(selectedOpening.posted_date).toLocaleDateString('id-ID') : '-'}</p></div>
                  <div><p className="text-gray-500 text-xs">Batas Lamaran</p><p className="font-medium">{selectedOpening.deadline ? new Date(selectedOpening.deadline).toLocaleDateString('id-ID') : '-'}</p></div>
                </div>
                {selectedOpening.requirements && (
                  <div><p className="text-xs text-gray-500 mb-2">Persyaratan</p><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-line">{selectedOpening.requirements}</p></div>
                )}
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                  <div><p className="text-sm font-medium text-indigo-900">{selectedOpening.applicants || 0} Pelamar</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedOpening(null); setTab('candidates'); }} className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Lihat Kandidat</button>
                    <button onClick={() => handleDeleteOpening(selectedOpening.id)} className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Hapus</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
  );
}
