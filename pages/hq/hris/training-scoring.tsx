import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Settings, Plus, Loader2, X, Target, BarChart3, Users, GraduationCap, Award,
  CheckCircle2, Trash2, Eye, Calculator, RefreshCw, PenTool, Layers, UserPlus,
  Mail, Lock, Search, TrendingUp, AlertCircle, BookOpen
} from 'lucide-react';

const API = '/api/hq/hris/training-scoring';
const API_TD = '/api/hq/hris/training-development';

const COMP_CATEGORIES: Record<string, string> = {
  technical: 'Teknikal', soft_skill: 'Soft Skill', knowledge: 'Pengetahuan',
  leadership: 'Kepemimpinan', safety: 'Keselamatan', attitude: 'Sikap',
};

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700', D: 'bg-orange-100 text-orange-700',
  E: 'bg-red-100 text-red-700',
};

type TabKey = 'configs' | 'scores' | 'competencies' | 'candidates';

const MOCK_TS_CONFIGS = [{ id: 'sc1', name: 'Scoring Barista Standard', curriculum_id: 'cur1', passing_score: 70, max_score: 100, weight_theory: 30, weight_practical: 50, weight_attitude: 20, grading_scale: 'A-E', status: 'active' }];
const MOCK_TS_COMPETENCIES = [
  { id: 'comp1', name: 'Pengetahuan Kopi', category: 'knowledge', description: 'Pemahaman tentang jenis dan proses kopi', max_score: 100, weight: 15 },
  { id: 'comp2', name: 'Teknik Brewing', category: 'technical', description: 'Kemampuan teknik penyeduhan', max_score: 100, weight: 25 },
  { id: 'comp3', name: 'Latte Art', category: 'technical', description: 'Kemampuan latte art', max_score: 100, weight: 20 },
  { id: 'comp4', name: 'Pelayanan Pelanggan', category: 'soft_skill', description: 'Kemampuan melayani pelanggan', max_score: 100, weight: 20 },
];

export default function TrainingScoringPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('configs');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [search, setSearch] = useState('');

  // Data
  const [configs, setConfigs] = useState<any[]>(MOCK_TS_CONFIGS);
  const [competencies, setCompetencies] = useState<any[]>(MOCK_TS_COMPETENCIES);
  const [scores, setScores] = useState<any[]>([]);
  const [scoreSummary, setScoreSummary] = useState<any>(null);
  const [candidateAccounts, setCandidateAccounts] = useState<any[]>([]);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Modal
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedConfig, setSelectedConfig] = useState('');

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Fetch helpers
  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=configs`);
      const data = await res.json();
      if (data.data) setConfigs(data.data);
    } catch (e) { console.warn(e); setConfigs(MOCK_TS_CONFIGS); }
  }, []);

  const fetchCompetencies = useCallback(async () => {
    try {
      const res = await fetch(`${API}?action=competencies`);
      const data = await res.json();
      if (data.data) setCompetencies(data.data);
    } catch (e) { console.warn(e); setCompetencies(MOCK_TS_COMPETENCIES); }
  }, []);

  const fetchScores = useCallback(async (batchId?: string) => {
    if (!batchId) return;
    try {
      const [scoresRes, summaryRes] = await Promise.all([
        fetch(`${API}?action=participant-scores&batch_id=${batchId}`),
        fetch(`${API}?action=score-summary&batch_id=${batchId}`)
      ]);
      const scoresData = await scoresRes.json();
      const summaryData = await summaryRes.json();
      if (scoresData.data) setScores(scoresData.data);
      if (summaryData.data) setScoreSummary(summaryData.data);
    } catch (e) { console.warn(e); }
  }, []);

  const fetchCandidateAccounts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: 'candidate-accounts' });
      if (search) params.set('search', search);
      const res = await fetch(`${API}?${params}`);
      const data = await res.json();
      if (data.data) setCandidateAccounts(data.data);
    } catch (e) { console.warn(e); }
  }, [search]);

  const fetchCurricula = useCallback(async () => {
    try {
      const res = await fetch(`${API_TD}?action=curricula`);
      const data = await res.json();
      if (data.data) setCurricula(data.data);
    } catch (e) { console.warn(e); }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch(`${API_TD}?action=batches`);
      const data = await res.json();
      if (data.data) setBatches(data.data);
    } catch (e) { console.warn(e); }
  }, []);

  useEffect(() => {
    setLoading(true);
    const loads: Promise<void>[] = [fetchCurricula(), fetchBatches()];
    if (tab === 'configs') loads.push(fetchConfigs());
    if (tab === 'competencies') loads.push(fetchCompetencies());
    if (tab === 'scores' && selectedBatch) loads.push(fetchScores(selectedBatch));
    if (tab === 'candidates') loads.push(fetchCandidateAccounts());
    Promise.all(loads).finally(() => setLoading(false));
  }, [tab, selectedBatch, fetchConfigs, fetchCompetencies, fetchScores, fetchCandidateAccounts, fetchCurricula, fetchBatches, search]);

  // CRUD
  async function handleCreate(action: string, body: any, refreshFn: () => void) {
    setSaving(true);
    try {
      const res = await fetch(`${API}?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) { showToast('Berhasil disimpan'); setShowModal(null); setForm({}); refreshFn(); }
      else showToast(data.error || 'Gagal menyimpan', 'error');
    } catch { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  }

  async function handleDelete(action: string, id: string, refreshFn: () => void) {
    if (!confirm('Hapus data ini?')) return;
    try {
      const res = await fetch(`${API}?action=${action}&id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { showToast('Dihapus'); refreshFn(); }
      else showToast(data.error || 'Gagal menghapus', 'error');
    } catch { showToast('Gagal menghapus', 'error'); }
  }

  async function handleCalculateScores() {
    if (!selectedBatch || !selectedConfig) { showToast('Pilih batch dan konfigurasi scoring', 'error'); return; }
    if (!confirm('Hitung ulang semua skor peserta di batch ini?')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}?action=calculate-scores`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: selectedBatch, scoring_config_id: selectedConfig })
      });
      const data = await res.json();
      if (data.success) { showToast(`${data.processed} peserta berhasil dinilai`); fetchScores(selectedBatch); }
      else showToast(data.error || 'Gagal menghitung skor', 'error');
    } catch { showToast('Terjadi kesalahan', 'error'); }
    setSaving(false);
  }

  const totalWeight = Number(form.weight_exam || 0) + Number(form.weight_attendance || 0) +
    Number(form.weight_practical || 0) + Number(form.weight_assignment || 0) + Number(form.weight_attitude || 0);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'configs', label: 'Konfigurasi Scoring', icon: Settings },
    { key: 'scores', label: 'Skor Peserta', icon: BarChart3 },
    { key: 'competencies', label: 'Kompetensi', icon: Target },
    { key: 'candidates', label: 'Akun Kandidat', icon: Users },
  ];

  return (
    <HQLayout title={t('hris.trainingScoringTitle')} subtitle={t('hris.trainingScoringSubtitle')}>
      <div className="space-y-6">
        {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b pb-px">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /><span className="ml-2 text-sm text-gray-500">Memuat...</span></div>}

        {/* ═══════════════════════════════ */}
        {/* CONFIGS TAB */}
        {/* ═══════════════════════════════ */}
        {!loading && tab === 'configs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Konfigurasi Bobot & Skala Penilaian</h2>
              <button onClick={() => { setForm({ weight_exam: 40, weight_attendance: 15, weight_practical: 25, weight_assignment: 10, weight_attitude: 10, passing_score: 70, min_attendance_rate: 80, max_remedial_attempts: 2, remedial_passing_score: 70 }); setShowModal('create-config'); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Buat Konfigurasi</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {configs.map(c => (
                <div key={c.id} className="bg-white border rounded-xl p-5 hover:shadow-lg transition cursor-pointer" onClick={() => { setSelectedItem(c); setShowModal('detail-config'); }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{c.config_name}</h3>
                      <p className="text-xs text-gray-500">{c.curriculum_title || 'Default (Semua Kurikulum)'}</p>
                    </div>
                    {c.is_default && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Default</span>}
                  </div>

                  {/* Weight Bars */}
                  <div className="space-y-1.5 mb-3">
                    <WeightBar label="Ujian" value={c.weight_exam} color="bg-indigo-500" />
                    <WeightBar label="Kehadiran" value={c.weight_attendance} color="bg-blue-500" />
                    <WeightBar label="Praktik" value={c.weight_practical} color="bg-purple-500" />
                    <WeightBar label="Tugas" value={c.weight_assignment} color="bg-teal-500" />
                    <WeightBar label="Sikap" value={c.weight_attitude} color="bg-orange-500" />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>KKM: <strong>{c.passing_score}</strong></span>
                    <span>Min Hadir: <strong>{c.min_attendance_rate}%</strong></span>
                    {c.allow_remedial && <span className="text-green-600">Remedial: ✓</span>}
                  </div>

                  {/* Grade Scale Preview */}
                  <div className="flex gap-1 mt-3">
                    {(Array.isArray(c.grade_scale) ? c.grade_scale : []).map((g: any) => (
                      <span key={g.grade} className={`text-xs px-2 py-0.5 rounded font-medium ${GRADE_COLORS[g.grade] || 'bg-gray-100'}`}>
                        {g.grade} ({g.min_score}-{g.max_score})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {configs.length === 0 && <p className="text-gray-400 text-center py-8 col-span-2">Belum ada konfigurasi scoring</p>}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* SCORES TAB */}
        {/* ═══════════════════════════════ */}
        {!loading && tab === 'scores' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Pilih Batch</label>
                <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">-- Pilih Batch --</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.batch_code} - {b.batch_name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Konfigurasi Scoring</label>
                <select value={selectedConfig} onChange={e => setSelectedConfig(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">-- Pilih Config --</option>
                  {configs.map(c => <option key={c.id} value={c.id}>{c.config_name}</option>)}
                </select>
              </div>
              <button onClick={handleCalculateScores} disabled={saving || !selectedBatch || !selectedConfig}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} Hitung Skor
              </button>
            </div>

            {/* Summary */}
            {scoreSummary?.summary && selectedBatch && (
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-600" /> Ringkasan Batch</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                  <MiniStat label="Total" value={scoreSummary.summary.total_participants} />
                  <MiniStat label="Lulus" value={scoreSummary.summary.passed} color="text-green-600" />
                  <MiniStat label="Tidak Lulus" value={scoreSummary.summary.failed} color="text-red-600" />
                  <MiniStat label="Avg Skor" value={Number(scoreSummary.summary.avg_score).toFixed(1)} />
                  <MiniStat label="Tertinggi" value={Number(scoreSummary.summary.max_score).toFixed(1)} color="text-green-600" />
                  <MiniStat label="Terendah" value={Number(scoreSummary.summary.min_score).toFixed(1)} color="text-red-600" />
                </div>
                {/* Grade Distribution */}
                {scoreSummary.grade_distribution?.length > 0 && (
                  <div className="flex gap-2">
                    {scoreSummary.grade_distribution.map((g: any) => (
                      <span key={g.grade} className={`text-sm px-3 py-1 rounded-lg font-medium ${GRADE_COLORS[g.grade] || 'bg-gray-100'}`}>
                        {g.grade}: {g.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Score Table */}
            {selectedBatch && scores.length > 0 && (
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">Peserta</th>
                    <th className="px-3 py-3 text-center">Ujian</th>
                    <th className="px-3 py-3 text-center">Hadir</th>
                    <th className="px-3 py-3 text-center">Praktik</th>
                    <th className="px-3 py-3 text-center">Tugas</th>
                    <th className="px-3 py-3 text-center">Sikap</th>
                    <th className="px-3 py-3 text-center font-bold">Skor Akhir</th>
                    <th className="px-3 py-3 text-center">Grade</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {scores.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3"><p className="font-medium">{s.employee_name || '-'}</p></td>
                        <td className="px-3 py-3 text-center">{s.exam_score != null ? Number(s.exam_score).toFixed(0) : '-'}</td>
                        <td className="px-3 py-3 text-center">{s.attendance_score != null ? Number(s.attendance_score).toFixed(0) : '-'}</td>
                        <td className="px-3 py-3 text-center">{s.practical_score != null ? Number(s.practical_score).toFixed(0) : '-'}</td>
                        <td className="px-3 py-3 text-center">{s.assignment_score != null ? Number(s.assignment_score).toFixed(0) : '-'}</td>
                        <td className="px-3 py-3 text-center">{s.attitude_score != null ? Number(s.attitude_score).toFixed(0) : '-'}</td>
                        <td className="px-3 py-3 text-center font-bold text-lg">{s.weighted_score != null ? Number(s.weighted_score).toFixed(1) : '-'}</td>
                        <td className="px-3 py-3 text-center">
                          {s.grade && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GRADE_COLORS[s.grade] || 'bg-gray-100'}`}>{s.grade}</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {s.is_passed === true && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Lulus</span>}
                          {s.is_passed === false && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Gagal</span>}
                          {s.is_passed == null && <span className="text-xs text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {selectedBatch && scores.length === 0 && !loading && <p className="text-center text-gray-400 py-8">Belum ada skor. Klik "Hitung Skor" untuk menghitung.</p>}
            {!selectedBatch && <p className="text-center text-gray-400 py-8">Pilih batch untuk melihat skor peserta</p>}
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* COMPETENCIES TAB */}
        {/* ═══════════════════════════════ */}
        {!loading && tab === 'competencies' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Kompetensi Penilaian</h2>
              <button onClick={() => { setForm({ passing_level: 3, weight: 1, category: 'technical' }); setShowModal('create-competency'); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> Tambah Kompetensi</button>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Kompetensi</th>
                  <th className="px-4 py-3 text-left">Kurikulum</th>
                  <th className="px-4 py-3 text-center">Kategori</th>
                  <th className="px-4 py-3 text-center">Bobot</th>
                  <th className="px-4 py-3 text-center">Min Level</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr></thead>
                <tbody className="divide-y">
                  {competencies.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-indigo-600 text-xs">{c.code}</td>
                      <td className="px-4 py-3"><p className="font-medium">{c.name}</p><p className="text-xs text-gray-400">{c.description}</p></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.curriculum_title || '-'}</td>
                      <td className="px-4 py-3 text-center"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{COMP_CATEGORIES[c.category] || c.category}</span></td>
                      <td className="px-4 py-3 text-center font-medium">{c.weight}</td>
                      <td className="px-4 py-3 text-center">{c.passing_level}/5</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete('delete-competency', c.id, fetchCompetencies)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {competencies.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada kompetensi</p>}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* CANDIDATE ACCOUNTS TAB */}
        {/* ═══════════════════════════════ */}
        {!loading && tab === 'candidates' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama/email kandidat..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
              </div>
              <button onClick={() => { setForm({}); setShowModal('create-candidate'); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"><UserPlus className="w-4 h-4" /> Buat Akun Kandidat</button>
            </div>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Telepon</th>
                  <th className="px-4 py-3 text-center">Pendidikan</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Login Terakhir</th>
                </tr></thead>
                <tbody className="divide-y">
                  {candidateAccounts.map(ca => (
                    <tr key={ca.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ca.name}</td>
                      <td className="px-4 py-3 text-gray-500">{ca.email}</td>
                      <td className="px-4 py-3 text-gray-500">{ca.phone || '-'}</td>
                      <td className="px-4 py-3 text-center text-xs">{ca.education || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ca.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{ca.status === 'active' ? 'Aktif' : ca.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">{ca.last_login_at ? new Date(ca.last_login_at).toLocaleString('id-ID') : 'Belum pernah'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {candidateAccounts.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada akun kandidat</p>}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════ */}
        {/* MODALS */}
        {/* ═══════════════════════════════ */}

        {/* Create Config Modal */}
        {showModal === 'create-config' && (
          <Modal title="Buat Konfigurasi Scoring" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-config', form, fetchConfigs); }} className="space-y-3">
              <FField label="Nama Konfigurasi *" value={form.config_name || ''} onChange={v => setForm({...form, config_name: v})} required />
              <FSelect label="Kurikulum (opsional)" value={form.curriculum_id || ''} onChange={v => setForm({...form, curriculum_id: v})}
                options={curricula.map(c => [c.id, `${c.code} - ${c.title}`])} placeholder="Default (semua kurikulum)" />
              <FField label="KKM (Passing Score)" type="number" value={form.passing_score || '70'} onChange={v => setForm({...form, passing_score: Number(v)})} />

              <div className="p-4 bg-indigo-50 rounded-xl">
                <h4 className="font-semibold text-sm text-indigo-900 mb-3">Bobot Penilaian (Total harus = 100%)</h4>
                <div className="space-y-2">
                  <WeightInput label="Ujian" value={form.weight_exam} onChange={v => setForm({...form, weight_exam: Number(v)})} color="indigo" />
                  <WeightInput label="Kehadiran" value={form.weight_attendance} onChange={v => setForm({...form, weight_attendance: Number(v)})} color="blue" />
                  <WeightInput label="Praktik" value={form.weight_practical} onChange={v => setForm({...form, weight_practical: Number(v)})} color="purple" />
                  <WeightInput label="Tugas" value={form.weight_assignment} onChange={v => setForm({...form, weight_assignment: Number(v)})} color="teal" />
                  <WeightInput label="Sikap" value={form.weight_attitude} onChange={v => setForm({...form, weight_attitude: Number(v)})} color="orange" />
                </div>
                <div className={`mt-3 text-sm font-semibold flex justify-between ${Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Total</span><span>{totalWeight}%{Math.abs(totalWeight - 100) < 0.01 ? ' ✓' : ' (harus 100%)'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FField label="Min Kehadiran (%)" type="number" value={form.min_attendance_rate || '80'} onChange={v => setForm({...form, min_attendance_rate: Number(v)})} />
                <FField label="Maks Remedial" type="number" value={form.max_remedial_attempts || '2'} onChange={v => setForm({...form, max_remedial_attempts: Number(v)})} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.allow_remedial !== false} onChange={e => setForm({...form, allow_remedial: e.target.checked})} className="rounded" />
                <label className="text-sm">Izinkan remedial</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_default || false} onChange={e => setForm({...form, is_default: e.target.checked})} className="rounded" />
                <label className="text-sm">Jadikan konfigurasi default</label>
              </div>
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Detail Config Modal */}
        {showModal === 'detail-config' && selectedItem && (
          <Modal title="Detail Konfigurasi Scoring" onClose={() => { setShowModal(null); setSelectedItem(null); }}>
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{selectedItem.config_name}</h3>
              <p className="text-sm text-gray-500">{selectedItem.curriculum_title || 'Default'}</p>

              <div className="bg-indigo-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2">Bobot Penilaian</h4>
                <div className="space-y-2">
                  <WeightBar label="Ujian" value={selectedItem.weight_exam} color="bg-indigo-500" />
                  <WeightBar label="Kehadiran" value={selectedItem.weight_attendance} color="bg-blue-500" />
                  <WeightBar label="Praktik" value={selectedItem.weight_practical} color="bg-purple-500" />
                  <WeightBar label="Tugas" value={selectedItem.weight_assignment} color="bg-teal-500" />
                  <WeightBar label="Sikap" value={selectedItem.weight_attitude} color="bg-orange-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <DField label="KKM" value={selectedItem.passing_score} />
                <DField label="Min Kehadiran" value={`${selectedItem.min_attendance_rate}%`} />
                <DField label="Remedial" value={selectedItem.allow_remedial ? `Ya (maks ${selectedItem.max_remedial_attempts}x)` : 'Tidak'} />
                <DField label="KKM Remedial" value={selectedItem.remedial_passing_score} />
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Skala Nilai</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(selectedItem.grade_scale) ? selectedItem.grade_scale : []).map((g: any) => (
                    <div key={g.grade} className={`px-3 py-2 rounded-lg text-center ${GRADE_COLORS[g.grade] || 'bg-gray-100'}`}>
                      <p className="font-bold">{g.grade}</p>
                      <p className="text-xs">{g.label}</p>
                      <p className="text-[10px]">{g.min_score}-{g.max_score}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => handleDelete('delete-config', selectedItem.id, fetchConfigs)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 flex items-center gap-1"><Trash2 className="w-4 h-4" /> Hapus</button>
            </div>
          </Modal>
        )}

        {/* Create Competency Modal */}
        {showModal === 'create-competency' && (
          <Modal title="Tambah Kompetensi" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-competency', form, fetchCompetencies); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FField label="Kode *" value={form.code || ''} onChange={v => setForm({...form, code: v})} placeholder="COMP-001" required />
                <FField label="Nama *" value={form.name || ''} onChange={v => setForm({...form, name: v})} required />
              </div>
              <FTextarea label="Deskripsi" value={form.description || ''} onChange={v => setForm({...form, description: v})} />
              <FSelect label="Kurikulum" value={form.curriculum_id || ''} onChange={v => setForm({...form, curriculum_id: v})}
                options={curricula.map(c => [c.id, c.title])} placeholder="Semua kurikulum" />
              <div className="grid grid-cols-3 gap-3">
                <FSelect label="Kategori" value={form.category || 'technical'} onChange={v => setForm({...form, category: v})}
                  options={Object.entries(COMP_CATEGORIES)} />
                <FField label="Bobot" type="number" value={form.weight || '1'} onChange={v => setForm({...form, weight: Number(v)})} />
                <FField label="Min Level (1-5)" type="number" value={form.passing_level || '3'} onChange={v => setForm({...form, passing_level: Number(v)})} />
              </div>
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

        {/* Create Candidate Account Modal */}
        {showModal === 'create-candidate' && (
          <Modal title="Buat Akun Kandidat" onClose={() => setShowModal(null)}>
            <form onSubmit={e => { e.preventDefault(); handleCreate('create-candidate-account', form, fetchCandidateAccounts); }} className="space-y-3">
              <FField label="Nama Lengkap *" value={form.name || ''} onChange={v => setForm({...form, name: v})} required />
              <FField label="Email *" type="email" value={form.email || ''} onChange={v => setForm({...form, email: v})} required />
              <FField label="Password *" type="password" value={form.password || ''} onChange={v => setForm({...form, password: v})} required />
              <FField label="Telepon" value={form.phone || ''} onChange={v => setForm({...form, phone: v})} />
              <div className="grid grid-cols-2 gap-3">
                <FField label="No. KTP" value={form.id_number || ''} onChange={v => setForm({...form, id_number: v})} />
                <FField label="Pendidikan" value={form.education || ''} onChange={v => setForm({...form, education: v})} />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <p className="font-medium mb-1">ℹ️ Info Login Portal</p>
                <p>Kandidat dapat login di <strong>/candidate/login</strong> menggunakan email dan password yang dibuat.</p>
              </div>
              <ModalActions saving={saving} onCancel={() => setShowModal(null)} />
            </form>
          </Modal>
        )}

      </div>
    </HQLayout>
  );
}

// ═══════════════════════════════════════
// Sub Components
// ═══════════════════════════════════════
function WeightBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold">{value}%</span>
    </div>
  );
}

function WeightInput({ label, value, onChange, color }: { label: string; value: number; onChange: (v: string) => void; color: string }) {
  const colorClasses: Record<string, string> = {
    indigo: 'border-indigo-300', blue: 'border-blue-300', purple: 'border-purple-300',
    teal: 'border-teal-300', orange: 'border-orange-300',
  };
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs font-medium">{label}</span>
      <input type="number" min={0} max={100} value={value || 0} onChange={e => onChange(e.target.value)}
        className={`w-20 px-2 py-1 border-2 ${colorClasses[color] || ''} rounded-lg text-sm text-center`} />
      <span className="text-xs text-gray-400">%</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className={`text-xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
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

function FField({ label, value, onChange, type = 'text', placeholder, required }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
  );
}

function FTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
  );
}

function FSelect({ label, value, onChange, options, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; options: string[][]; placeholder?: string; required?: boolean }) {
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

function DField({ label, value }: { label: string; value: any }) {
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
