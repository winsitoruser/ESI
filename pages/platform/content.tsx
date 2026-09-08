import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import OpsLayout from '@/components/humanify/OpsLayout';
import {
  OpsBadge, OpsPageIntro, OpsPageSkeleton, OpsToast,
} from '@/components/humanify/ops-ui';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';
import { nextFaqStatus } from '@/lib/saas/cms-content';
import { RefreshCw } from 'lucide-react';

type Status = 'draft' | 'review' | 'approved' | 'published';
type Faq = { id: string; question: string; answer: string; category: string; status: Status };
type Article = { id: string; slug: string; title: string; excerpt: string | null; body: string; status: Status };

const TONE: Record<Status, 'neutral' | 'warning' | 'brand' | 'success'> = {
  draft: 'neutral',
  review: 'warning',
  approved: 'brand',
  published: 'success',
};

export default function PlatformContentPage() {
  const { gating } = usePlatformOperator('/platform/content');
  const router = useRouter();
  const tab = String(router.query.tab || 'faq') === 'blog' ? 'blog' : 'faq';
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: 'umum' });
  const [articleForm, setArticleForm] = useState({ title: '', excerpt: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, a] = await Promise.all([
        fetch('/api/platform?action=faqs').then((r) => r.json()),
        fetch('/api/platform?action=articles').then((r) => r.json()),
      ]);
      if (f.success) setFaqs(f.data?.faqs || []);
      if (a.success) setArticles(a.data?.articles || []);
      if (!f.success) setToast(f.error || 'Gagal memuat FAQ');
    } catch {
      setToast('Gagal memuat konten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!gating) load(); }, [gating, load]);

  const saveFaq = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/platform?action=faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      setToast(res.success ? 'FAQ disimpan sebagai draft' : (res.error || 'Gagal simpan'));
      if (res.success) {
        setForm({ question: '', answer: '', category: 'umum' });
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const saveArticle = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/platform?action=article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleForm),
      }).then((r) => r.json());
      setToast(res.success ? 'Artikel disimpan sebagai draft' : (res.error || 'Gagal simpan'));
      if (res.success) {
        setArticleForm({ title: '', excerpt: '', body: '' });
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const advance = async (kind: 'faq' | 'article', id: string) => {
    const action = kind === 'faq' ? 'faq-advance' : 'article-advance';
    const res = await fetch(`/api/platform?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());
    setToast(res.success ? 'Status diperbarui' : (res.error || 'Gagal'));
    if (res.success) await load();
  };

  const unpublish = async (kind: 'faq' | 'article', id: string) => {
    const action = kind === 'faq' ? 'faq-unpublish' : 'article-unpublish';
    const res = await fetch(`/api/platform?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then((r) => r.json());
    if (res.success) await load();
    else setToast(res.error || 'Gagal unpublish');
  };

  return (
    <OpsLayout title="Konten" subtitle="FAQ dan artikel blog">
      <OpsToast message={toast} onDismiss={() => setToast('')} />
      {gating || (loading && faqs.length === 0 && articles.length === 0) ? (
        <OpsPageSkeleton variant="detail" />
      ) : (
        <div className="space-y-5">
          <OpsPageIntro
            eyebrow="CMS"
            title="FAQ & blog"
            description="Draft → review → approve → publish. FAQ di landing, artikel di /humanify/blog."
            actions={
              <>
                <Link href="/platform/banners" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Banner
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                </button>
              </>
            }
          />

          <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
            <Link href="/platform/content" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'faq' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>FAQ</Link>
            <Link href="/platform/content?tab=blog" className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === 'blog' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Blog</Link>
          </div>

          {tab === 'faq' ? (
            <>
              <form onSubmit={saveFaq} className="hf-card space-y-3 p-4">
                <input required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Pertanyaan" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <textarea required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Jawaban" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-2">
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <button type="submit" disabled={saving} className="hf-btn-primary text-xs">Simpan draft</button>
                </div>
              </form>
              <div className="space-y-2">
                {faqs.map((f) => {
                  const next = nextFaqStatus(f.status);
                  return (
                    <article key={f.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{f.question}</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{f.answer}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <OpsBadge tone={TONE[f.status]}>{f.status}</OpsBadge>
                          {next && <button type="button" onClick={() => advance('faq', f.id)} className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">{next === 'review' ? 'Kirim review' : next === 'approved' ? 'Setujui' : 'Terbitkan'}</button>}
                          {f.status === 'published' && <button type="button" onClick={() => unpublish('faq', f.id)} className="text-xs font-medium text-slate-500 hover:underline">Unpublish</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {faqs.length === 0 && <p className="text-sm text-slate-500">Belum ada FAQ.</p>}
              </div>
            </>
          ) : (
            <>
              <form onSubmit={saveArticle} className="hf-card space-y-3 p-4">
                <input required value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} placeholder="Judul artikel" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input value={articleForm.excerpt} onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })} placeholder="Ringkasan" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <textarea required value={articleForm.body} onChange={(e) => setArticleForm({ ...articleForm, body: e.target.value })} placeholder="Isi artikel" rows={6} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button type="submit" disabled={saving} className="hf-btn-primary text-xs">Simpan draft</button>
              </form>
              <div className="space-y-2">
                {articles.map((a) => {
                  const next = nextFaqStatus(a.status);
                  return (
                    <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{a.title}</p>
                          <p className="text-[11px] text-slate-400">/{a.slug}</p>
                          {a.excerpt && <p className="mt-1 text-sm text-slate-600">{a.excerpt}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <OpsBadge tone={TONE[a.status]}>{a.status}</OpsBadge>
                          {next && <button type="button" onClick={() => advance('article', a.id)} className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">{next === 'review' ? 'Kirim review' : next === 'approved' ? 'Setujui' : 'Terbitkan'}</button>}
                          {a.status === 'published' && <button type="button" onClick={() => unpublish('article', a.id)} className="text-xs font-medium text-slate-500 hover:underline">Unpublish</button>}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {articles.length === 0 && <p className="text-sm text-slate-500">Belum ada artikel.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </OpsLayout>
  );
}
