import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import {
  BookOpen, Search, Plus, X, Eye, ArrowLeft, Tag, LifeBuoy, RefreshCw,
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
};

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

function inlineHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-[12px] font-mono">$1</code>');
}

function renderSimpleMarkdown(md: string) {
  const lines = String(md || '').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let listItems: { ordered: boolean; text: string }[] = [];
  let ordered = false;
  let fence: { lang: string; body: string[] } | null = null;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = ordered ? 'ol' : 'ul';
    const cls = ordered
      ? 'list-decimal pl-5 space-y-1.5 text-sm text-gray-700 mb-3'
      : 'list-disc pl-5 space-y-1.5 text-sm text-gray-700 mb-3';
    nodes.push(
      <Tag key={`list-${i++}`} className={cls}>
        {listItems.map((li, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: inlineHtml(li.text) }} />
        ))}
      </Tag>,
    );
    listItems = [];
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const [header, ...body] = tableRows;
    const dataRows = body.filter((r) => !r.every((c) => /^:?-+:?$/.test(c.trim())));
    nodes.push(
      <div key={`tbl-${i++}`} className="overflow-x-auto mb-4 border rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              {header.map((c, idx) => (
                <th key={idx} className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                  {c.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b last:border-0">
                {row.map((c, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-3 py-2 text-gray-700 align-top"
                    dangerouslySetInnerHTML={{ __html: inlineHtml(c.trim()) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  const flushFence = () => {
    if (!fence) return;
    const body = fence.body.join('\n');
    const isFlow = /^(flowchart|mermaid|diagram)$/i.test(fence.lang);
    if (isFlow) {
      nodes.push(
        <div
          key={`flow-${i++}`}
          className="mb-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border-b border-slate-200">
            Flowchart
          </div>
          <pre className="p-4 text-[12px] leading-relaxed font-mono text-slate-800 whitespace-pre overflow-x-auto">
            {body}
          </pre>
        </div>,
      );
    } else {
      nodes.push(
        <pre
          key={`code-${i++}`}
          className="mb-4 p-3 rounded-lg bg-gray-900 text-gray-100 text-[12px] font-mono overflow-x-auto"
        >
          {body}
        </pre>,
      );
    }
    fence = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (fence) {
      if (/^```/.test(line.trim())) {
        flushFence();
      } else {
        fence.body.push(raw);
      }
      continue;
    }

    const fenceOpen = line.trim().match(/^```(\w+)?\s*$/);
    if (fenceOpen) {
      flushList();
      flushTable();
      fence = { lang: fenceOpen[1] || 'text', body: [] };
      continue;
    }

    if (/^\|/.test(line) && line.includes('|')) {
      flushList();
      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }
    if (tableRows.length) flushTable();

    if (/^###\s+/.test(line)) {
      flushList();
      nodes.push(
        <h3 key={`h3-${i++}`} className="text-base font-semibold text-gray-900 mt-4 mb-1.5">
          {line.replace(/^###\s+/, '')}
        </h3>,
      );
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      nodes.push(
        <h2 key={`h2-${i++}`} className="text-lg font-semibold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">
          {line.replace(/^##\s+/, '')}
        </h2>,
      );
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      nodes.push(
        <h1 key={`h1-${i++}`} className="text-xl font-bold text-gray-900 mt-2 mb-2">
          {line.replace(/^#\s+/, '')}
        </h1>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (listItems.length && ordered) flushList();
      ordered = false;
      listItems.push({ ordered: false, text: line.replace(/^[-*]\s+/, '') });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (listItems.length && !ordered) flushList();
      ordered = true;
      listItems.push({ ordered: true, text: line.replace(/^\d+\.\s+/, '') });
      continue;
    }
    flushList();
    if (!line.trim()) {
      nodes.push(<div key={`sp-${i++}`} className="h-2" />);
      continue;
    }
    nodes.push(
      <p
        key={`p-${i++}`}
        className="text-sm text-gray-700 leading-relaxed mb-2"
        dangerouslySetInnerHTML={{ __html: inlineHtml(line) }}
      />,
    );
  }
  flushList();
  flushTable();
  flushFence();
  return nodes;
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
            <div className="prose-sm">{renderSimpleMarkdown(selected.content || '')}</div>
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
      subtitle="Panduan produk, fitur, flowchart, dan penjelasan modul Humanify"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[color:var(--hf-brand)]" />
            <h2 className="text-lg font-semibold text-gray-900">Pusat Pengetahuan</h2>
            <DataSourceBadge source={dataSource} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--hf-brand)] text-white"
            >
              <Plus className="w-4 h-4" /> Tambah Artikel
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[var(--hf-brand)] to-[color:var(--hf-brand-600)] rounded-2xl p-6 text-white">
          <h3 className="text-xl font-semibold mb-1">Bagaimana kami bisa membantu?</h3>
          <p className="text-sm text-white/80 mb-4">
            Panduan lengkap: mulai penggunaan, detail fitur &amp; komponen, flowchart, serta penjelasan modul.
          </p>
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari artikel…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-gray-900"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                category === c
                  ? 'bg-[var(--hf-brand)] text-white border-[var(--hf-brand)]'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c === 'all' ? 'Semua' : CATEGORY_LABEL[c] || c}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && (
            <div className="col-span-full p-10 text-center text-sm text-gray-500">Memuat artikel…</div>
          )}
          {!loading && articles.length === 0 && (
            <div className="col-span-full bg-white border rounded-xl p-8 text-center text-sm text-gray-500">
              Belum ada artikel. Tambahkan artikel internal perusahaan atau hubungi support.
            </div>
          )}
          {!loading &&
            articles.map((a) => (
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
                <p className="text-[11px] text-gray-400 mt-3 inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {a.view_count || 0}
                  {a.is_platform ? ' · Official' : ' · Internal'}
                </p>
              </button>
            ))}
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
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
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
                <label className="text-xs font-medium text-gray-600">Konten * (Markdown sederhana)</label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[160px] font-mono"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={'## Judul\n\nIsi panduan...\n- poin 1\n- poin 2'}
                />
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
