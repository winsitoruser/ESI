import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2, Plus, Send, BookOpen } from 'lucide-react';
import { Card, SectionHeader } from '@/components/employee/portal-ui';

const API = '/api/employee/lms';
const REQ_API = '/api/employee/training-request';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-800' },
  rejected: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-800' },
  enrolled: { label: 'Terdaftar LMS', cls: 'bg-indigo-50 text-indigo-800' },
};

function fmtPreferredDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortId(id: string | null | undefined) {
  if (!id) return null;
  const s = String(id);
  return s.length > 12 ? `${s.slice(0, 8)}…` : s;
}

export default function TrainingTab() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ program_id: '', topic: '', justification: '', preferred_date: '' });
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, c, p, req] = await Promise.all([
        fetch(`${API}?action=dashboard`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API}?action=my-courses`).then((r) => r.json()).catch(() => ({})),
        fetch(`${REQ_API}?action=programs`).then((r) => r.json()).catch(() => ({})),
        fetch(REQ_API).then((r) => r.json()).catch(() => ({})),
      ]);
      setExams(d.data?.exams || []);
      setResults(d.data?.results || []);
      setCourses(c.data || []);
      setPrograms(p.data || []);
      setMyRequests((req.data || []).slice(0, 10));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitRequest = async () => {
    if (!form.topic.trim() && !form.program_id) {
      setToast('Pilih program atau isi topik pelatihan');
      return;
    }
    setSubmitting(true);
    try {
      const prog = programs.find((x) => String(x.id) === String(form.program_id));
      const res = await fetch(REQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_id: form.program_id || null,
          program_title: prog?.title,
          topic: form.topic || prog?.title,
          justification: form.justification,
          preferred_date: form.preferred_date || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal mengajukan');
      setToast('Permintaan pelatihan terkirim');
      setShowRequest(false);
      setForm({ program_id: '', topic: '', justification: '', preferred_date: '' });
      load();
    } catch (e: any) {
      setToast(e.message || 'Gagal mengajukan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  const openExams = exams.filter((e) => e.status === 'open');

  return (
    <div className="space-y-4">
      {toast && (
        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800" role="status">{toast}</div>
      )}
      <div className="flex items-center justify-between">
        <SectionHeader title="Training & LMS" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRequest((v) => !v)}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Ajukan Pelatihan
          </button>
          <Link href="/employee/training" className="text-sm text-indigo-600 flex items-center gap-1">Lihat semua <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>

      {showRequest && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Permintaan pelatihan</p>
          <select
            value={form.program_id}
            onChange={(e) => setForm({ ...form, program_id: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            aria-label="Program pelatihan"
          >
            <option value="">— Pilih program (opsional) —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Topik / judul pelatihan"
            className="w-full px-3 py-2 border rounded-lg text-sm"
            aria-label="Topik pelatihan"
          />
          <textarea
            value={form.justification}
            onChange={(e) => setForm({ ...form, justification: e.target.value })}
            placeholder="Alasan / kebutuhan pengembangan"
            rows={2}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            aria-label="Justifikasi"
          />
          <label className="block text-xs text-gray-500">
            Tanggal preferensi
            <input
              type="date"
              value={form.preferred_date}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
              aria-label="Tanggal preferensi"
            />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={submitRequest}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Kirim permintaan
          </button>
        </Card>
      )}

      <SectionHeader title="Permintaan saya" />
      {myRequests.length === 0 ? (
        <Card className="p-6 text-center" data-testid="training-requests-empty">
          <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-700">Belum ada permintaan pelatihan</p>
          <p className="mt-1 text-xs text-gray-500">Ajukan program dari katalog atau topik bebas — setelah disetujui, enrollment LMS akan muncul di sini.</p>
        </Card>
      ) : (
        myRequests.map((r) => {
          const badge = STATUS_BADGE[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-600' };
          const enrollId = r.enrollmentId || r.enrollment_id || r.lmsEnrollmentId;
          const preferred = fmtPreferredDate(r.preferredDate || r.preferred_date);
          return (
            <Card key={r.id} className="p-3 space-y-1.5">
              <div className="flex justify-between text-sm items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.topic || r.programTitle || r.program_title}</p>
                  {(r.programTitle || r.program_title) && r.topic && r.topic !== (r.programTitle || r.program_title) && (
                    <p className="text-xs text-gray-500 truncate">Program: {r.programTitle || r.program_title}</p>
                  )}
                </div>
                <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                {preferred && <span>Preferensi: {preferred}</span>}
                {r.status === 'approved' && enrollId && (
                  <span className="font-medium text-indigo-700" title={String(enrollId)}>
                    Enrollment / LMS ID: {shortId(enrollId)}
                  </span>
                )}
                {r.status === 'approved' && !enrollId && (
                  <span className="text-amber-700">Disetujui — enrollment LMS sedang disiapkan</span>
                )}
                {r.reviewerNote || r.reviewer_note ? (
                  <span className="w-full text-gray-600">Catatan: {r.reviewerNote || r.reviewer_note}</span>
                ) : null}
              </div>
              {r.status === 'approved' && enrollId && (
                <Link href="/employee/training" className="inline-flex text-xs text-indigo-600 font-medium items-center gap-0.5">
                  Buka LMS <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </Card>
          );
        })
      )}

      {courses.slice(0, 2).map((c) => (
        <Card key={c.id} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{c.title}</p>
              <p className="text-xs text-gray-500">{c.progress_pct || 0}% selesai</p>
            </div>
            <Link href={`/employee/training/course/${c.curriculum_id}`} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">Belajar</Link>
          </div>
        </Card>
      ))}

      <SectionHeader title="Ujian Aktif" />
      {openExams.slice(0, 3).map((ex) => (
        <Card key={ex.id} className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{ex.title}</p>
              <p className="text-xs text-gray-500">{ex.duration_minutes} menit</p>
            </div>
            <Link href={`/employee/training/exam/${ex.id}`} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs">Mulai</Link>
          </div>
        </Card>
      ))}
      {!openExams.length && <p className="text-sm text-gray-400 text-center py-4">Tidak ada ujian aktif</p>}

      {results.length > 0 && (
        <>
          <SectionHeader title="Riwayat Terbaru" />
          {results.slice(0, 3).map((r) => (
            <Card key={r.id} className="p-3 flex justify-between text-sm">
              <span>{r.exam_title}</span>
              <span className={r.is_passed ? 'text-green-600' : 'text-gray-600'}>{r.percentage ?? r.score}%</span>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
