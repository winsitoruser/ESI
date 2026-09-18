import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import { OpsPageHero, OpsStage } from '@/components/humanify/OpsPageChrome';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import KbMarkdown from '@/components/humanify/KbMarkdown';
import {
  BookOpen, Search, Plus, X, Eye, ArrowLeft, Tag, LifeBuoy, RefreshCw,
  Camera, ListOrdered, GitBranch, Lightbulb,
} from 'lucide-react';

type Article = {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content?: string;
  category: string;
  status?: string;
  is_platform?: boolean;
  view_count?: number;
  tenant_id?: string | null;
  tags?: string[] | string;
};

function articleTags(a: Article): string[] {
  if (Array.isArray(a.tags)) return a.tags.map(String);
  if (typeof a.tags === 'string') {
    try {
      const parsed = JSON.parse(a.tags);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return a.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function articleHints(a: Article) {
  const fromContent = contentHints(a.content);
  const tags = articleTags(a).map((t) => t.toLowerCase());
  return {
    mockup: fromContent.mockup || tags.some((t) => /mockup|screenshot|ui/.test(t)),
    steps: fromContent.steps || tags.some((t) => /langkah|steps|tata.?cara|panduan/.test(t)),
    workflow: fromContent.workflow || tags.some((t) => /workflow|alur|flowchart/.test(t)),
    example: fromContent.example || tags.some((t) => /contoh|example/.test(t)),
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  getting_started: 'Mulai Cepat',
  support: 'Support',
  karyawan: 'Karyawan',
  payroll: 'Payroll',
  kehadiran: 'Kehadiran & Cuti',
  kinerja: 'Kinerja (KPI/OKR)',
  talent: 'Talent & LMS',
  ess: 'ESS / MSS',
  keamanan: 'Keamanan & Billing',
  umum: 'Umum',
};

function contentHints(content?: string) {
  const c = content || '';
  return {
    mockup: /```\s*(mockup|screenshot|ui)\b/i.test(c),
    steps: /```\s*(steps|langkah|tata-cara)\b/i.test(c),
    workflow: /```\s*(workflow|alur|flowchart)\b/i.test(c),
    example: /```\s*(example|contoh)\b/i.test(c),
  };
}

export default function KnowledgeBasePage() {
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState<Article | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'umum',
    slug: '',
  });

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/humanify/knowledge-base?${params}`);
      const json = await res.json();
      setArticles(Array.isArray(json.data) ? json.data : []);
      setDataSource(json.dataSource || (json.data?.length ? 'live' : 'empty'));
    } catch {
      setArticles([]);
      setDataSource('empty');
    } finally {
      setLoading(false);
    }
  }, [category, q]);

  useEffect(() => {
    load();
  }, [load]);

  const openArticle = async (a: Article) => {
    try {
      const res = await fetch(`/api/humanify/knowledge-base?action=detail&slug=${encodeURIComponent(a.slug || a.id)}`);
      const json = await res.json();
      if (json.success && json.data) setSelected(json.data);
      else setSelected(a);
    } catch {
      setSelected(a);
    }
  };

  const createArticle = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('error', 'Judul dan konten wajib');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal menyimpan');
      showToast('success', 'Artikel Knowledge Center tersimpan');
      setShowCreate(false);
      setForm({ title: '', summary: '', content: '', category: 'umum', slug: '' });
      await load();
    } catch (e: any) {
      showToast('error', e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(articles.map((a) => a.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [articles]);

  const selectedHints = useMemo(() => contentHints(selected?.content), [selected?.content]);

  if (selected) {
    return (
      <HQLayout title="Pusat Pengetahuan" subtitle={selected.title}>
        <div className="max-w-3xl mx-auto space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
          </button>
          <article className="bg-white border rounded-xl p-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]">
                {CATEGORY_LABEL[selected.category] || selected.category}
              </span>
              {selected.is_platform && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Humanify Official</span>
              )}
              <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                <Eye className="w-3 h-3" /> {selected.view_count || 0} views
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{selected.title}</h1>
            {selected.summary && <p className="text-sm text-gray-500 mb-4">{selected.summary}</p>}

            {(selectedHints.mockup || selectedHints.steps || selectedHints.workflow || selectedHints.example) && (
              <div className="mb-5 flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                {selectedHints.mockup && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <Camera className="h-3 w-3 text-[color:var(--hf-brand)]" /> Screenshot mockup
                  </span>
                )}
                {selectedHints.steps && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <ListOrdered className="h-3 w-3 text-[color:var(--hf-brand)]" /> Tata cara
                  </span>
                )}
                {selectedHints.workflow && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <GitBranch className="h-3 w-3 text-[color:var(--hf-brand)]" /> Workflow
                  </span>
                )}
                {selectedHints.example && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                    <Lightbulb className="h-3 w-3 text-amber-600" /> Contoh penggunaan
                  </span>
                )}
              </div>
            )}

            <KbMarkdown content={selected.content || ''} />
          </article>
          <div className="bg-[var(--hf-brand-50)] border border-[var(--hf-brand-100)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Tidak menemukan jawaban?</p>
              <p className="text-xs text-gray-600">Buat tiket support untuk tim Humanify.</p>
            </div>
            <Link
              href="/humanify/support"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--hf-brand)] text-white text-sm"
            >
              <LifeBuoy className="w-4 h-4" /> Buka Tiket Support
            </Link>
          </div>
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout
      title="Pusat Pengetahuan"
      subtitle="Panduan penggunaan dengan contoh, screenshot mockup, dan workflow"
    >
      <OpsStage>
        <OpsPageHero
          title="Pusat Pengetahuan"
          subtitle="Panduan penggunaan Humanify: contoh nyata, screenshot mockup halaman, tata cara, dan workflow"
          badge="Knowledge Center"
          liveLabel="Docs"
          icon={BookOpen}
          chips={[
            { icon: Tag, label: `${articles.length} artikel`, tone: 'text-[color:var(--hf-brand-600)]' },
            { icon: Camera, label: 'Screenshot mockup', tone: 'text-slate-600' },
            { icon: LifeBuoy, label: 'Support siap membantu', tone: 'text-emerald-700' },
          ]}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              <button type="button" onClick={() => load()} className="hf-btn-secondary inline-flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button type="button" onClick={() => setShowCreate(true)} className="hf-btn-primary inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Tambah artikel
              </button>
            </div>
          )}
        />

        <div className="hf-card p-4 md:p-5">
          <p className="mb-2 text-sm font-medium text-[color:var(--hf-ink)]">Bagaimana kami bisa membantu?</p>
          <p className="mb-3 text-xs text-[color:var(--hf-ink-muted)]">
            Cari panduan mulai penggunaan, contoh langkah, screenshot mockup halaman, serta workflow modul.
          </p>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari artikel… mis. cuti, payroll, karyawan"
              className="hf-input w-full pl-9"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
              <Camera className="h-3 w-3" /> Mockup UI
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
              <ListOrdered className="h-3 w-3" /> Tata cara
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 border border-slate-100">
              <GitBranch className="h-3 w-3" /> Workflow
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 border border-amber-100 text-amber-800">
              <Lightbulb className="h-3 w-3" /> Contoh penggunaan
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                category === c
                  ? 'border-[var(--hf-brand-600)] bg-[var(--hf-brand-600)] text-white'
                  : 'border-[var(--hf-border)] bg-white text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
              }`}
            >
              {c === 'all' ? 'Semua' : CATEGORY_LABEL[c] || c}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {loading && (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-[var(--hf-radius-xl)] bg-[var(--hf-surface-muted)]" />
              ))}
            </>
          )}
          {!loading && articles.length === 0 && (
            <div className="col-span-full">
              <HrisEmptyState
                title="Belum ada artikel"
                description="Tambahkan artikel internal perusahaan atau hubungi support."
                source={dataSource}
              />
            </div>
          )}
          {!loading &&
            articles.map((a) => {
              const hints = articleHints(a);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openArticle(a)}
                  className="text-left bg-white border rounded-xl p-4 hover:border-[var(--hf-brand)] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-3.5 h-3.5 text-[color:var(--hf-brand)]" />
                    <span className="text-[11px] text-gray-500">
                      {CATEGORY_LABEL[a.category] || a.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{a.summary || 'Buka untuk membaca panduan.'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {hints.mockup && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                        <Camera className="h-2.5 w-2.5" /> Mockup
                      </span>
                    )}
                    {hints.steps && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                        <ListOrdered className="h-2.5 w-2.5" /> Langkah
                      </span>
                    )}
                    {hints.workflow && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                        <GitBranch className="h-2.5 w-2.5" /> Alur
                      </span>
                    )}
                    {hints.example && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">
                        <Lightbulb className="h-2.5 w-2.5" /> Contoh
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {a.view_count || 0}
                    {a.is_platform ? ' · Official' : ' · Internal'}
                  </p>
                </button>
              );
            })}
        </div>

        <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[color:var(--hf-brand)]" />
            <div>
              <p className="text-sm font-medium text-gray-900">Masih butuh bantuan?</p>
              <p className="text-xs text-gray-500">Kirim pengaduan langsung ke tim Humanify.</p>
            </div>
          </div>
          <Link
            href="/humanify/support"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            Ke Tiket Support
          </Link>
        </div>
      </OpsStage>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="hf-card max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold">Tambah Artikel Internal</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Judul *</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Ringkasan</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Kategori</label>
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Konten * (Markdown + blok khusus)</label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[160px] font-mono"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={'## Judul\n\n```steps\n1. Langkah pertama\n   Detail…\n```\n\n```mockup employees\n```\n\n```example\nContoh: …\n```\n\n```workflow\nA → B → C\n```'}
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Blok: mockup, steps, example, workflow, flowchart
                </p>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm border rounded-lg">
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={createArticle}
                className="px-3 py-2 text-sm rounded-lg bg-[var(--hf-brand)] text-white disabled:opacity-60"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[60] px-4 py-2 rounded-lg text-sm shadow-lg ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}
