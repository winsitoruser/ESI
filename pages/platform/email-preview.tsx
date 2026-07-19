import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { ArrowLeft, Mail, Loader2, RefreshCw } from 'lucide-react';

const TEMPLATES = [
  { id: 'invite', label: 'Undangan tim' },
  { id: 'verify', label: 'Verifikasi email' },
  { id: 'reset', label: 'Reset password' },
  { id: 'welcome', label: 'Welcome akun' },
  { id: 'onboarding', label: 'Onboarding reminder' },
  { id: 'alert', label: 'Obs alert' },
  { id: 'digest', label: 'Alert digest' },
] as const;

/**
 * Platform — preview branded Humanify emails (logo + layout).
 * Uses srcdoc (not iframe src) because site sends X-Frame-Options: DENY.
 */
export default function PlatformEmailPreviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';
  const [tpl, setTpl] = useState<string>('invite');
  const [html, setHtml] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform/email-preview');
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
    }
  }, [status, allowed, router]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(
        `/api/platform/email-preview?template=${encodeURIComponent(tpl)}&format=json`,
        { credentials: 'same-origin' },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) {
        setError(j.error || `HTTP ${r.status}`);
        setHtml('');
        return;
      }
      setHtml(j.data?.html || '');
      setSubject(j.data?.subject || '');
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat preview');
      setHtml('');
    } finally {
      setLoading(false);
    }
  }, [tpl, allowed]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HumanifyLayout title="Email Preview" subtitle="Template Humanify berlogo — sample HTML" >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/platform/observability" className="inline-flex items-center gap-1 text-sm text-[color:var(--hf-brand-600)] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Observability
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTpl(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                  tpl === t.id
                    ? 'bg-[var(--hf-brand-600)] text-white border-[var(--hf-brand-600)]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {subject ? (
          <p className="text-sm text-slate-600">
            Subject: <span className="font-medium text-slate-900">{subject}</span>
          </p>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
        ) : null}

        <div className="rounded-xl border bg-slate-100 overflow-hidden shadow-sm" style={{ minHeight: 640 }}>
          {loading && !html ? (
            <div className="flex items-center justify-center h-[640px] text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat template…
            </div>
          ) : html ? (
            <iframe
              title="Email preview"
              srcDoc={html}
              className="w-full bg-white"
              style={{ height: 720, border: 0 }}
            />
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Logo: <code className="text-[color:var(--hf-brand)]">https://humanify.id/images/humanify_white.png</code>
          {' '}· Preview via srcdoc (hindari X-Frame-Options: DENY). Sample — tidak mengirim email.
        </p>
      </div>
    </HumanifyLayout>
  );
}
