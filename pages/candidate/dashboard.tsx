import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  GraduationCap, BookOpen, Calendar, Clock, Users, MapPin, Award, Target,
  CheckCircle2, BarChart3, PenTool, LogOut, User, Loader2, ChevronRight,
  FileText, Star, AlertCircle, Layers, ArrowRight, Bell, Home, ClipboardList,
  TrendingUp, Shield, Eye
} from 'lucide-react';

// ═══════════════════════════════════════
// Types & Helpers
// ═══════════════════════════════════════
type TabKey = 'overview' | 'training' | 'modules' | 'schedules' | 'exams' | 'results' | 'graduation' | 'profile';

const API = '/api/candidate/portal';
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-yellow-100 text-yellow-700', passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700', active: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
  open: 'bg-green-100 text-green-700', submitted: 'bg-indigo-100 text-indigo-700',
  graded: 'bg-teal-100 text-teal-700', pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700', cancelled: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Berlangsung', passed: 'Lulus', failed: 'Tidak Lulus', active: 'Aktif',
  scheduled: 'Terjadwal', completed: 'Selesai', open: 'Dibuka', submitted: 'Dikumpulkan',
  graded: 'Dinilai', pending: 'Menunggu', confirmed: 'Dikonfirmasi', cancelled: 'Dibatalkan',
};
const statusBadge = (s: string) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-600'}`}>
    {STATUS_LABELS[s] || s}
  </span>
);

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('candidate_token');
}
function getUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('candidate_user') || 'null'); } catch { return null; }
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════
export default function CandidateDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Data
  const [dashboard, setDashboard] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [graduations, setGraduations] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);

  // Auth check
  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (!token || !u) { router.replace('/candidate/login'); return; }
    setUser(u);
  }, [router]);

  const apiFetch = useCallback(async (action: string) => {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${API}?action=${action}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) { localStorage.removeItem('candidate_token'); localStorage.removeItem('candidate_user'); router.replace('/candidate/login'); return null; }
    const data = await res.json();
    return data.success ? data.data : null;
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const loads: Promise<void>[] = [];

    if (tab === 'overview') {
      loads.push(apiFetch('dashboard').then(d => d && setDashboard(d)));
      loads.push(apiFetch('my-scores').then(d => d && setScores(d)));
    }
    if (tab === 'training') loads.push(apiFetch('my-batches').then(d => d && setBatches(d)));
    if (tab === 'modules') loads.push(apiFetch('my-modules').then(d => d && setModules(d)));
    if (tab === 'schedules') loads.push(apiFetch('my-schedules').then(d => d && setSchedules(d)));
    if (tab === 'exams') loads.push(apiFetch('my-exams').then(d => d && setExams(d)));
    if (tab === 'results') loads.push(apiFetch('my-results').then(d => d && setResults(d)));
    if (tab === 'graduation') {
      loads.push(apiFetch('my-graduation').then(d => d && setGraduations(d)));
      loads.push(apiFetch('my-scores').then(d => d && setScores(d)));
    }
    if (tab === 'profile') loads.push(
      fetch('/api/candidate/auth?action=profile', { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json()).then(d => d.success && setProfile(d.data))
    );

    Promise.all(loads).finally(() => setLoading(false));
  }, [tab, user, apiFetch]);

  const handleLogout = () => {
    localStorage.removeItem('candidate_token');
    localStorage.removeItem('candidate_user');
    router.push('/candidate/login');
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'overview', label: 'Beranda', icon: Home },
    { key: 'training', label: 'Pelatihan', icon: BookOpen },
    { key: 'modules', label: 'Modul', icon: Layers },
    { key: 'schedules', label: 'Jadwal', icon: Calendar },
    { key: 'exams', label: 'Ujian', icon: PenTool },
    { key: 'results', label: 'Hasil', icon: ClipboardList },
    { key: 'graduation', label: 'Kelulusan', icon: GraduationCap },
    { key: 'profile', label: 'Profil', icon: User },
  ];

  if (!user) return null;

  return (
    <>
      <Head><title>Dashboard Kandidat - Training Portal</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Portal Kandidat</h1>
                  <p className="text-xs text-indigo-200">Training & Development</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-indigo-200">{user.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Tab Nav */}
          <div className="flex gap-1 overflow-x-auto border-b mb-6 pb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                  tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {loading && <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /><span className="ml-2 text-gray-500">Memuat...</span></div>}

          {/* ════════════════════════════════════ */}
          {/* OVERVIEW TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'overview' && dashboard && (
            <div className="space-y-6">
              {/* Welcome */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                <h2 className="text-xl font-bold">Selamat datang, {dashboard.candidate_name}! 👋</h2>
                <p className="text-indigo-100 mt-1 text-sm">Berikut ringkasan perkembangan pelatihan Anda.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={BookOpen} color="indigo" value={dashboard.batches?.active || 0} label="Pelatihan Aktif" />
                <StatCard icon={PenTool} color="teal" value={dashboard.exams?.total || 0} label="Ujian Diikuti" />
                <StatCard icon={GraduationCap} color="green" value={dashboard.batches?.passed || 0} label="Lulus" />
                <StatCard icon={Calendar} color="blue" value={dashboard.upcoming_schedules || 0} label="Jadwal Mendatang" />
              </div>

              {/* Score Overview */}
              {dashboard.latest_score && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /> Skor Terakhir</h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <ScoreCard label="Skor Akhir" value={dashboard.latest_score.weighted_score} grade={dashboard.latest_score.grade} isPrimary />
                    <ScoreCard label="Ujian" value={dashboard.latest_score.exam_score} />
                    <ScoreCard label="Kehadiran" value={dashboard.latest_score.attendance_score} />
                    <ScoreCard label="Praktik" value={dashboard.latest_score.practical_score} />
                    <ScoreCard label="Tugas" value={dashboard.latest_score.assignment_score} />
                    <ScoreCard label="Sikap" value={dashboard.latest_score.attitude_score} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-sm font-bold ${dashboard.latest_score.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                      {dashboard.latest_score.is_passed ? '✅ LULUS' : '❌ BELUM LULUS'}
                    </span>
                    <span className="text-xs text-gray-400">Grade: {dashboard.latest_score.grade} ({dashboard.latest_score.grade_label})</span>
                  </div>
                </div>
              )}

              {/* Exam Average */}
              <div className="bg-white border rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-teal-600" /> Statistik Ujian</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-teal-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-teal-600">{dashboard.exams?.total || 0}</p>
                    <p className="text-xs text-gray-500">Total Ujian</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{dashboard.exams?.passed || 0}</p>
                    <p className="text-xs text-gray-500">Lulus</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{Number(dashboard.exams?.avg_score || 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Rata-rata Skor</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <button onClick={() => setTab('exams')} className="bg-white border rounded-xl p-5 text-left hover:shadow-lg transition group">
                  <PenTool className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition" />
                  <h4 className="font-semibold">Ikuti Ujian</h4>
                  <p className="text-xs text-gray-500 mt-1">Lihat dan ikuti ujian yang tersedia</p>
                </button>
                <button onClick={() => setTab('modules')} className="bg-white border rounded-xl p-5 text-left hover:shadow-lg transition group">
                  <Layers className="w-8 h-8 text-purple-500 mb-2 group-hover:scale-110 transition" />
                  <h4 className="font-semibold">Modul Pembelajaran</h4>
                  <p className="text-xs text-gray-500 mt-1">Akses materi pelatihan Anda</p>
                </button>
                <button onClick={() => setTab('graduation')} className="bg-white border rounded-xl p-5 text-left hover:shadow-lg transition group">
                  <GraduationCap className="w-8 h-8 text-green-500 mb-2 group-hover:scale-110 transition" />
                  <h4 className="font-semibold">Status Kelulusan</h4>
                  <p className="text-xs text-gray-500 mt-1">Cek status kelulusan & skor akhir</p>
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* TRAINING (MY BATCHES) TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'training' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Pelatihan Saya</h2>
              {batches.map(b => (
                <div key={b.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-purple-500 bg-purple-50 px-2 py-0.5 rounded">{b.batch_code}</span>
                        {statusBadge(b.graduation_status)}
                        {b.batch_type && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{b.batch_type}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-1">{b.batch_name}</h3>
                      <p className="text-sm text-gray-500">{b.curriculum_title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(b.batch_start)} - {fmtDate(b.batch_end)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.total_hours || 0} jam</span>
                    <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{b.total_modules || 0} modul</span>
                    {b.instructor && <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.instructor}</span>}
                  </div>
                  {b.final_score != null && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-3">
                      <span className="text-sm font-semibold">Skor Akhir: {Number(b.final_score).toFixed(1)}</span>
                      {b.graduation_status === 'passed' && <span className="text-xs text-green-600 font-medium">✅ Lulus</span>}
                      {b.graduation_status === 'failed' && <span className="text-xs text-red-600 font-medium">❌ Tidak Lulus</span>}
                    </div>
                  )}
                </div>
              ))}
              {batches.length === 0 && <EmptyState msg="Anda belum terdaftar di pelatihan manapun" />}
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* MODULES TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'modules' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Modul Pembelajaran</h2>
              <div className="space-y-3">
                {modules.map((m, i) => (
                  <div key={m.id} className="bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                      {m.order_index ?? i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{m.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.description || m.curriculum_title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="bg-gray-100 px-2 py-0.5 rounded capitalize">{m.module_type}</span>
                        <span>{m.delivery_method}</span>
                        <span><Clock className="w-3 h-3 inline" /> {m.duration_hours} jam</span>
                        {m.is_mandatory && <span className="text-orange-500">Wajib</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {m.has_exam && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Ada Ujian</span>}
                      {m.materials && Array.isArray(m.materials) && m.materials.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">{m.materials.length} materi</p>
                      )}
                    </div>
                  </div>
                ))}
                {modules.length === 0 && <EmptyState msg="Belum ada modul pembelajaran" />}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* SCHEDULES TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'schedules' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Jadwal Pelatihan</h2>
              {schedules.map(s => (
                <div key={s.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
                  <div className="text-center min-w-[55px]">
                    <p className="text-2xl font-bold text-indigo-600">{s.session_date ? new Date(s.session_date).getDate() : '-'}</p>
                    <p className="text-xs text-gray-500">{s.session_date ? new Date(s.session_date).toLocaleDateString('id-ID', { month: 'short' }) : '-'}</p>
                  </div>
                  <div className="w-px h-12 bg-gray-200" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{s.session_title}</h3>
                      {statusBadge(s.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span><Clock className="w-3 h-3 inline" /> {s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)}</span>
                      {s.location && <span><MapPin className="w-3 h-3 inline" /> {s.location}</span>}
                      {s.batch_name && <span>{s.batch_name}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && <EmptyState msg="Belum ada jadwal" />}
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* EXAMS TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'exams' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Ujian Tersedia</h2>
              {exams.map(e => (
                <div key={e.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{e.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {statusBadge(e.status)}
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{e.exam_type}</span>
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded capitalize">{e.exam_scope}</span>
                      </div>
                    </div>
                    {e.my_passed === true && <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✅ Lulus</span>}
                    {e.my_passed === false && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">Belum Lulus</span>}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span><strong>{e.total_questions}</strong> soal</span>
                    <span>KKM: <strong>{e.passing_score}</strong></span>
                    <span><Clock className="w-3 h-3 inline" /> {e.duration_minutes} menit</span>
                    {e.exam_date && <span><Calendar className="w-3 h-3 inline" /> {fmtDate(e.exam_date)}</span>}
                    <span>Percobaan: {e.my_attempts || 0}/{e.max_attempts}</span>
                  </div>

                  {e.my_last_score != null && (
                    <p className="text-sm mt-2 text-gray-600">Skor terakhir: <strong>{Number(e.my_last_score).toFixed(1)}</strong></p>
                  )}

                  <div className="mt-3 pt-3 border-t">
                    {(e.my_attempts || 0) < e.max_attempts && e.my_passed !== true ? (
                      <Link href={`/candidate/exam/${e.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
                        <PenTool className="w-4 h-4" /> {e.my_attempts > 0 ? 'Coba Lagi' : 'Mulai Ujian'}
                      </Link>
                    ) : e.my_passed ? (
                      <span className="text-sm text-green-600 font-medium">Ujian sudah lulus</span>
                    ) : (
                      <span className="text-sm text-red-600">Batas percobaan habis</span>
                    )}
                  </div>
                </div>
              ))}
              {exams.length === 0 && <EmptyState msg="Belum ada ujian yang tersedia" />}
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* RESULTS TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'results' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Hasil Ujian</h2>
              <div className="bg-white border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-4 py-3 text-left">Ujian</th>
                    <th className="px-4 py-3 text-center">Skor</th>
                    <th className="px-4 py-3 text-center">KKM</th>
                    <th className="px-4 py-3 text-center">Benar</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Tanggal</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {results.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.exam_title || '-'}</p>
                          <p className="text-xs text-gray-400">Percobaan ke-{r.attempt_number} • {r.exam_type}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-lg font-bold ${r.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                            {r.score != null ? Number(r.score).toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{r.exam_passing_score || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-500">{r.total_correct}/{r.total_answered}</td>
                        <td className="px-4 py-3 text-center">
                          {r.is_passed ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Lulus</span>
                          ) : r.status === 'submitted' ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Menunggu Penilaian</span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Tidak Lulus</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{fmtDate(r.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length === 0 && <EmptyState msg="Belum ada hasil ujian" />}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* GRADUATION TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'graduation' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">Status Kelulusan</h2>

              {graduations.map(g => (
                <div key={g.id} className="bg-white border rounded-xl p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{g.batch_name}</h3>
                      <p className="text-sm text-gray-500">{g.curriculum_title} • {g.batch_code}</p>
                    </div>
                    {statusBadge(g.graduation_status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{g.final_score ? Number(g.final_score).toFixed(1) : '-'}</p>
                      <p className="text-xs text-gray-500">Skor Akhir</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{g.exam_score_avg ? Number(g.exam_score_avg).toFixed(1) : '-'}</p>
                      <p className="text-xs text-gray-500">Rata-rata Ujian</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">{g.attendance_rate ? `${Number(g.attendance_rate).toFixed(0)}%` : '-'}</p>
                      <p className="text-xs text-gray-500">Kehadiran</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600">{g.rank || '-'}</p>
                      <p className="text-xs text-gray-500">Ranking</p>
                    </div>
                  </div>

                  {g.certificate_number && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                      <Award className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Sertifikat: {g.certificate_number}</p>
                        <p className="text-xs text-green-600">Tanggal Lulus: {fmtDate(g.graduation_date)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Detailed Score Breakdown */}
              {scores.length > 0 && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" /> Rincian Penilaian</h3>
                  {scores.map(s => (
                    <div key={s.id} className="mb-4 last:mb-0">
                      <p className="text-sm font-medium text-gray-700 mb-3">{s.batch_name} ({s.config_name || 'Default'})</p>
                      <div className="space-y-2">
                        <ScoreBar label="Ujian" value={s.exam_score} weight={s.weight_exam} />
                        <ScoreBar label="Kehadiran" value={s.attendance_score} weight={s.weight_attendance} />
                        <ScoreBar label="Praktik" value={s.practical_score} weight={s.weight_practical} />
                        <ScoreBar label="Tugas" value={s.assignment_score} weight={s.weight_assignment} />
                        <ScoreBar label="Sikap" value={s.attitude_score} weight={s.weight_attitude} />
                      </div>
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold">{s.weighted_score ? Number(s.weighted_score).toFixed(1) : '-'}</span>
                          <span className="text-sm text-gray-500 ml-2">Grade: <strong>{s.grade}</strong> ({s.grade_label})</span>
                        </div>
                        <span className={`text-sm font-bold ${s.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                          {s.is_passed ? '✅ LULUS' : '❌ BELUM LULUS'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {graduations.length === 0 && <EmptyState msg="Belum ada data kelulusan" />}
            </div>
          )}

          {/* ════════════════════════════════════ */}
          {/* PROFILE TAB */}
          {/* ════════════════════════════════════ */}
          {!loading && tab === 'profile' && profile && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                    {profile.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{profile.name}</h2>
                    <p className="text-sm text-gray-500">{profile.email}</p>
                    {statusBadge(profile.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <ProfileField label="Telepon" value={profile.phone} />
                  <ProfileField label="No. KTP" value={profile.id_number} />
                  <ProfileField label="Tanggal Lahir" value={fmtDate(profile.date_of_birth)} />
                  <ProfileField label="Jenis Kelamin" value={profile.gender === 'male' ? 'Laki-laki' : profile.gender === 'female' ? 'Perempuan' : '-'} />
                  <ProfileField label="Pendidikan" value={profile.education} />
                  <ProfileField label="Bergabung" value={fmtDate(profile.created_at)} />
                </div>

                {profile.address && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-1">Alamat</p>
                    <p className="text-sm">{profile.address}</p>
                  </div>
                )}

                {profile.last_login_at && (
                  <p className="text-xs text-gray-400 mt-4">Login terakhir: {new Date(profile.last_login_at).toLocaleString('id-ID')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════
// Sub Components
// ═══════════════════════════════════════
function StatCard({ icon: Icon, color, value, label }: { icon: any; color: string; value: any; label: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600', teal: 'bg-teal-100 text-teal-600',
    green: 'bg-green-100 text-green-600', blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600', purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color] || colors.indigo}`}><Icon className="w-5 h-5" /></div>
        <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, grade, isPrimary }: { label: string; value: any; grade?: string; isPrimary?: boolean }) {
  const v = value != null ? Number(value).toFixed(1) : '-';
  return (
    <div className={`rounded-lg p-3 text-center ${isPrimary ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'}`}>
      <p className={`text-xl font-bold ${isPrimary ? 'text-indigo-600' : 'text-gray-900'}`}>{v}</p>
      {grade && <p className="text-xs text-indigo-500 font-medium">Grade {grade}</p>}
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function ScoreBar({ label, value, weight }: { label: string; value: any; weight: any }) {
  const v = Number(value || 0);
  const w = Number(weight || 0);
  const barColor = v >= 80 ? 'bg-green-500' : v >= 70 ? 'bg-blue-500' : v >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-gray-600">{label} ({w}%)</div>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(v, 100)}%` }} />
      </div>
      <div className="w-12 text-right text-sm font-medium">{v.toFixed(0)}</div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <p className="text-center text-gray-400 py-12">{msg}</p>;
}
