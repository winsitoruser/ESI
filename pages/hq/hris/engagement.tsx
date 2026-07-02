import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import { MessageCircle, Award, Bell, Plus, Edit, Trash2, X, Heart, Star, Send, Eye, BarChart3, Users } from 'lucide-react';

interface SurveyItem { id: string; title: string; description: string; survey_type: string; status: string; start_date: string; end_date: string; is_anonymous: boolean; questions: any[]; total_responses: number; }
interface RecognitionItem { id: string; from_employee_id: number; to_employee_id: number; recognition_type: string; title: string; message: string; points: number; badge: string; category: string; likes_count: number; created_at: string; }
interface AnnouncementItem { id: string; title: string; content: string; category: string; priority: string; status: string; publish_date: string; expiry_date: string; is_pinned: boolean; read_count: number; }

type TabKey = 'surveys' | 'recognitions' | 'announcements';

const MOCK_ENG_OVERVIEW = { totalSurveys: 8, activeSurveys: 2, totalRecognitions: 145, publishedAnnouncements: 12, avgEngagementScore: 78, totalResponses: 420 };

const MOCK_SURVEYS: SurveyItem[] = [
  { id: 's1', title: 'Employee Satisfaction Q1 2026', description: 'Survei kepuasan karyawan kuartal pertama', survey_type: 'engagement', status: 'active', start_date: '2026-03-01', end_date: '2026-03-31', is_anonymous: true, questions: [{ text: 'Seberapa puas Anda?', type: 'rating' }], total_responses: 85 },
  { id: 's2', title: 'Pulse Check Maret 2026', description: 'Quick pulse survey bulanan', survey_type: 'pulse', status: 'active', start_date: '2026-03-10', end_date: '2026-03-17', is_anonymous: true, questions: [{ text: 'Mood minggu ini?', type: 'rating' }], total_responses: 42 },
  { id: 's3', title: 'Training Feedback - Leadership', description: 'Feedback pelatihan kepemimpinan', survey_type: 'feedback', status: 'closed', start_date: '2026-02-15', end_date: '2026-02-28', is_anonymous: false, questions: [], total_responses: 28 },
];

const MOCK_RECOGNITIONS: RecognitionItem[] = [
  { id: 'r1', from_employee_id: 1, to_employee_id: 5, recognition_type: 'kudos', title: 'Kerja Tim Luar Biasa!', message: 'Terima kasih sudah membantu launching produk baru', points: 50, badge: 'star', category: 'teamwork', likes_count: 12, created_at: '2026-03-12T10:00:00Z' },
  { id: 'r2', from_employee_id: 3, to_employee_id: 8, recognition_type: 'achievement', title: 'Employee of the Month', message: 'Target penjualan tercapai 120%', points: 100, badge: 'trophy', category: 'achievement', likes_count: 25, created_at: '2026-03-10T09:00:00Z' },
];

const MOCK_ANNOUNCEMENTS: AnnouncementItem[] = [
  { id: 'a1', title: 'Libur Hari Raya Nyepi 2026', content: 'Kantor tutup tanggal 29 Maret 2026', category: 'holiday', priority: 'high', status: 'published', publish_date: '2026-03-10', expiry_date: '2026-03-30', is_pinned: true, read_count: 145 },
  { id: 'a2', title: 'Update Kebijakan WFH', content: 'Kebijakan WFH berlaku 2 hari per minggu', category: 'policy', priority: 'normal', status: 'published', publish_date: '2026-03-05', expiry_date: '2026-06-05', is_pinned: false, read_count: 120 },
  { id: 'a3', title: 'Town Hall Meeting Q1', content: 'Jadwal town hall meeting tanggal 28 Maret', category: 'event', priority: 'normal', status: 'published', publish_date: '2026-03-08', expiry_date: '2026-03-28', is_pinned: false, read_count: 88 },
];

export default function EngagementPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('surveys');
  const [overview, setOverview] = useState<any>(MOCK_ENG_OVERVIEW);
  const [surveys, setSurveys] = useState<SurveyItem[]>(MOCK_SURVEYS);
  const [recognitions, setRecognitions] = useState<RecognitionItem[]>(MOCK_RECOGNITIONS);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(MOCK_ANNOUNCEMENTS);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [surveyDetail, setSurveyDetail] = useState<any>(null);

  const [surveyForm, setSurveyForm] = useState({ title: '', description: '', surveyType: 'engagement', isAnonymous: true, isMandatory: false, questions: [] as any[] });
  const [recForm, setRecForm] = useState({ toEmployeeId: '', recognitionType: 'kudos', title: '', message: '', points: 10, badge: 'star', category: 'general' });
  const [annForm, setAnnForm] = useState({ title: '', content: '', category: 'general', priority: 'normal', isPinned: false });
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'rating' });

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const api = useCallback(async (action: string, method = 'GET', body?: any, extra = '') => {
    const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`/api/hq/hris/engagement?action=${action}${extra}`, opts);
    return r.json();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, sv, rc, an] = await Promise.all([
        api('overview'), api('surveys'), api('recognitions'), api('announcements')
      ]);
      setOverview(ov.data || {});
      setSurveys(sv.data || []);
      setRecognitions(rc.data || []);
      setAnnouncements(an.data || []);
    } catch (e) {
      console.error(e);
      setOverview(MOCK_ENG_OVERVIEW);
      setSurveys(MOCK_SURVEYS);
      setRecognitions(MOCK_RECOGNITIONS);
      setAnnouncements(MOCK_ANNOUNCEMENTS);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = (type: string) => {
    setEditingItem(null); setModalType(type); setShowModal(true);
    if (type === 'survey') setSurveyForm({ title: '', description: '', surveyType: 'engagement', isAnonymous: true, isMandatory: false, questions: [] });
    if (type === 'recognition') setRecForm({ toEmployeeId: '', recognitionType: 'kudos', title: '', message: '', points: 10, badge: 'star', category: 'general' });
    if (type === 'announcement') setAnnForm({ title: '', content: '', category: 'general', priority: 'normal', isPinned: false });
  };

  const handleSave = async () => {
    try {
      if (modalType === 'survey') {
        if (editingItem) await api('survey', 'PUT', surveyForm, `&id=${editingItem.id}`);
        else await api('survey', 'POST', surveyForm);
      } else if (modalType === 'recognition') {
        await api('recognition', 'POST', recForm);
      } else if (modalType === 'announcement') {
        if (editingItem) await api('announcement', 'PUT', annForm, `&id=${editingItem.id}`);
        else await api('announcement', 'POST', annForm);
      }
      showToast(editingItem ? 'Berhasil diperbarui' : 'Berhasil dibuat');
      setShowModal(false); loadData();
    } catch (e) { showToast('Gagal menyimpan', 'error'); }
  };

  const handleDelete = async (action: string, id: string) => {
    if (!confirm('Hapus data ini?')) return;
    await api(action, 'DELETE', null, `&id=${id}`);
    showToast('Dihapus'); loadData();
  };

  const viewSurveyDetail = async (id: string) => {
    const res = await api('survey-detail', 'GET', null, `&id=${id}`);
    setSurveyDetail(res.data);
  };

  const statusColor = (s: string) => {
    const m: any = { draft: 'bg-gray-100 text-gray-800', active: 'bg-green-100 text-green-800', closed: 'bg-red-100 text-red-800', published: 'bg-blue-100 text-blue-800', archived: 'bg-gray-200 text-gray-600' };
    return m[s] || 'bg-gray-100 text-gray-800';
  };

  const priorityColor = (p: string) => {
    const m: any = { low: 'text-gray-500', normal: 'text-blue-600', high: 'text-orange-600', urgent: 'text-red-600' };
    return m[p] || 'text-gray-500';
  };

  const recTypeEmoji: any = { kudos: '👏', achievement: '🏆', milestone: '🎯', teamwork: '🤝', innovation: '💡', leadership: '👑', service: '⭐' };

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'surveys', label: 'Survei & Pulse', icon: BarChart3, count: overview.totalSurveys },
    { key: 'recognitions', label: 'Penghargaan & Reward', icon: Award, count: overview.totalRecognitions },
    { key: 'announcements', label: 'Pengumuman', icon: Bell, count: overview.publishedAnnouncements },
  ];

  return (
    <HQLayout title={t('hris.engagementTitle')}>
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>{toast.msg}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Keterlibatan Karyawan & Budaya</h1>
        <p className="text-gray-500 mt-1">Survei, penghargaan, dan komunikasi internal</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
          <BarChart3 className="w-5 h-5 mb-1 opacity-80" />
          <p className="text-2xl font-bold">{overview.totalSurveys || 0}</p>
          <p className="text-xs opacity-80">Total Survei</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <Users className="w-5 h-5 mb-1 opacity-80" />
          <p className="text-2xl font-bold">{overview.totalResponses || 0}</p>
          <p className="text-xs opacity-80">Total Respons</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white">
          <Award className="w-5 h-5 mb-1 opacity-80" />
          <p className="text-2xl font-bold">{overview.totalRecognitions || 0}</p>
          <p className="text-xs opacity-80">Penghargaan</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
          <Bell className="w-5 h-5 mb-1 opacity-80" />
          <p className="text-2xl font-bold">{overview.publishedAnnouncements || 0}</p>
          <p className="text-xs opacity-80">Pengumuman Aktif</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSurveyDetail(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Memuat...</div>}

      {/* SURVEYS TAB */}
      {!loading && tab === 'surveys' && !surveyDetail && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Survei & Pulse Check</h2>
            <button onClick={() => openAdd('survey')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Buat Survey
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {surveys.map(s => (
              <div key={s.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{s.survey_type}</span>
                      {s.is_anonymous && <span className="text-xs text-gray-400">🔒 Anonim</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">{s.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{s.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{s.questions?.length || 0} pertanyaan</span>
                    <span>{s.total_responses || 0} respons</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => viewSurveyDetail(s.id)} className="text-xs px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1"><Eye className="w-3 h-3" />Detail</button>
                    {s.status === 'draft' && (
                      <button onClick={async () => { await api('publish-survey', 'POST', { id: s.id }); showToast('Survey dipublikasikan'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Publikasikan</button>
                    )}
                    {s.status === 'active' && (
                      <button onClick={async () => { await api('close-survey', 'POST', { id: s.id }); showToast('Survey ditutup'); loadData(); }} className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded">Tutup</button>
                    )}
                    <button onClick={() => handleDelete('survey', s.id)} className="text-xs px-2 py-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            {surveys.length === 0 && <p className="text-center text-gray-400 py-8 col-span-2">Belum ada survey</p>}
          </div>
        </div>
      )}

      {/* SURVEY DETAIL VIEW */}
      {!loading && tab === 'surveys' && surveyDetail && (
        <div>
          <button onClick={() => setSurveyDetail(null)} className="text-sm text-indigo-600 mb-4 hover:underline">← Kembali ke daftar survey</button>
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(surveyDetail.survey?.status)}`}>{surveyDetail.survey?.status}</span>
              <span className="text-sm text-gray-500">{surveyDetail.responses || 0} respons</span>
            </div>
            <h2 className="text-xl font-bold mb-2">{surveyDetail.survey?.title}</h2>
            <p className="text-gray-500 mb-6">{surveyDetail.survey?.description}</p>

            <h3 className="font-semibold mb-4">Hasil Per Pertanyaan</h3>
            <div className="space-y-4">
              {(surveyDetail.survey?.questions || []).map((q: any, i: number) => {
                const result = surveyDetail.results?.[q.id];
                return (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-800 mb-2">Q{i + 1}. {q.text}</p>
                    {(q.type === 'rating' || q.type === 'scale') && result && (
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold text-indigo-600">{result.avg}</div>
                        <div className="text-sm text-gray-500">rata-rata dari {result.count} respons</div>
                        <div className="flex gap-1 ml-auto">
                          {Object.entries(result.distribution || {}).sort().map(([k, v]) => (
                            <div key={k} className="text-center">
                              <div className="text-xs text-gray-400">{k}</div>
                              <div className="text-sm font-medium">{v as number}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {q.type === 'text' && result && (
                      <div className="space-y-1">
                        {(result.answers || []).slice(0, 5).map((a: string, j: number) => (
                          <p key={j} className="text-sm text-gray-600 bg-white p-2 rounded">"{a}"</p>
                        ))}
                      </div>
                    )}
                    {!result && <p className="text-sm text-gray-400">Belum ada respons</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RECOGNITIONS TAB */}
      {!loading && tab === 'recognitions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">e-Penghargaan & Reward</h2>
            <button onClick={() => openAdd('recognition')} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
              <Award className="w-4 h-4" /> Beri Penghargaan
            </button>
          </div>
          <div className="space-y-3">
            {recognitions.map(r => (
              <div key={r.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{recTypeEmoji[r.recognition_type] || '👏'}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded capitalize">{r.recognition_type}</span>
                      {r.points > 0 && <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">⭐ {r.points} poin</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900">{r.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{r.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Dari: #{r.from_employee_id}</span>
                      <span>Untuk: #{r.to_employee_id}</span>
                      <span>{r.created_at && new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {r.likes_count}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete('recognition', r.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {recognitions.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada penghargaan. Mulai apresiasi rekan kerja!</p>}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS TAB */}
      {!loading && tab === 'announcements' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Pengumuman Perusahaan</h2>
            <button onClick={() => openAdd('announcement')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Buat Pengumuman
            </button>
          </div>
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className={`bg-white border rounded-xl p-4 ${a.is_pinned ? 'border-blue-300 bg-blue-50/30' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {a.is_pinned && <span className="text-xs">📌</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>{a.status}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{a.category}</span>
                      <span className={`text-xs font-medium ${priorityColor(a.priority)}`}>{a.priority}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{a.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {a.publish_date && <span>Diterbitkan: {new Date(a.publish_date).toLocaleDateString('id-ID')}</span>}
                      <span>Dibaca: {a.read_count || 0} orang</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {a.status === 'draft' && (
                      <button onClick={async () => { await api('publish-announcement', 'POST', { id: a.id }); showToast('Pengumuman diterbitkan'); loadData(); }} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Publikasikan</button>
                    )}
                    <button onClick={() => { setEditingItem(a); setAnnForm({ title: a.title, content: a.content, category: a.category, priority: a.priority, isPinned: a.is_pinned }); setModalType('announcement'); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete('announcement', a.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-center text-gray-400 py-8">Belum ada pengumuman</p>}
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold">
                {editingItem ? 'Edit' : 'Buat'} {modalType === 'survey' ? 'Survei' : modalType === 'recognition' ? 'Penghargaan' : 'Pengumuman'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {modalType === 'survey' && (<>
                <div><label className="text-sm font-medium text-gray-700">Judul Survey</label><input value={surveyForm.title} onChange={e => setSurveyForm({ ...surveyForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={surveyForm.description} onChange={e => setSurveyForm({ ...surveyForm, description: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Tipe</label>
                    <select value={surveyForm.surveyType} onChange={e => setSurveyForm({ ...surveyForm, surveyType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="engagement">Engagement</option><option value="pulse">Pulse</option><option value="satisfaction">Satisfaction</option><option value="exit">Exit Interview</option><option value="onboarding">Onboarding</option><option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-4 pb-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={surveyForm.isAnonymous} onChange={e => setSurveyForm({ ...surveyForm, isAnonymous: e.target.checked })} /> Anonim</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={surveyForm.isMandatory} onChange={e => setSurveyForm({ ...surveyForm, isMandatory: e.target.checked })} /> Wajib</label>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pertanyaan ({surveyForm.questions.length})</label>
                  <div className="space-y-2 mt-2">
                    {surveyForm.questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded text-sm">
                        <span className="text-gray-400 w-6">{i + 1}.</span>
                        <span className="flex-1">{q.text}</span>
                        <span className="text-xs bg-white px-2 py-0.5 rounded">{q.type}</span>
                        <button onClick={() => { const qs = [...surveyForm.questions]; qs.splice(i, 1); setSurveyForm({ ...surveyForm, questions: qs }); }} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input placeholder="Teks pertanyaan" value={newQuestion.text} onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <select value={newQuestion.type} onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })} className="px-2 py-2 border rounded-lg text-sm">
                      <option value="rating">Rating</option><option value="scale">Scale</option><option value="text">Text</option><option value="choice">Choice</option>
                    </select>
                    <button onClick={() => { if (newQuestion.text) { setSurveyForm({ ...surveyForm, questions: [...surveyForm.questions, { id: `q${Date.now()}`, ...newQuestion, required: true }] }); setNewQuestion({ text: '', type: 'rating' }); } }} className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </>)}
              {modalType === 'recognition' && (<>
                <div><label className="text-sm font-medium text-gray-700">ID Karyawan Penerima</label><input type="number" value={recForm.toEmployeeId} onChange={e => setRecForm({ ...recForm, toEmployeeId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Tipe</label>
                  <select value={recForm.recognitionType} onChange={e => setRecForm({ ...recForm, recognitionType: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                    <option value="kudos">👏 Apresiasi</option><option value="achievement">🏆 Pencapaian</option><option value="milestone">🎯 Pencapaian Target</option><option value="teamwork">🤝 Kerja Tim</option><option value="innovation">💡 Inovasi</option><option value="leadership">👑 Kepemimpinan</option><option value="service">⭐ Pelayanan Prima</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium text-gray-700">Judul</label><input value={recForm.title} onChange={e => setRecForm({ ...recForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Pesan</label><textarea value={recForm.message} onChange={e => setRecForm({ ...recForm, message: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
                <div><label className="text-sm font-medium text-gray-700">Poin</label><input type="number" value={recForm.points} onChange={e => setRecForm({ ...recForm, points: parseInt(e.target.value) || 0 })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              </>)}
              {modalType === 'announcement' && (<>
                <div><label className="text-sm font-medium text-gray-700">Judul</label><input value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Konten</label><textarea value={annForm.content} onChange={e => setAnnForm({ ...annForm, content: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={5} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium text-gray-700">Kategori</label>
                    <select value={annForm.category} onChange={e => setAnnForm({ ...annForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="general">Umum</option><option value="policy">Kebijakan</option><option value="event">Event</option><option value="achievement">Pencapaian</option><option value="urgent">Urgent</option><option value="hr">HR</option>
                    </select>
                  </div>
                  <div><label className="text-sm font-medium text-gray-700">Prioritas</label>
                    <select value={annForm.priority} onChange={e => setAnnForm({ ...annForm, priority: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      <option value="low">Rendah</option><option value="normal">Normal</option><option value="high">Tinggi</option><option value="urgent">Mendesak</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={annForm.isPinned} onChange={e => setAnnForm({ ...annForm, isPinned: e.target.checked })} /> 📌 Pin pengumuman ini</label>
              </>)}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </HQLayout>
  );
}
