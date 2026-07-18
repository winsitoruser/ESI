import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HQLayout from '@/components/hq/HQLayout';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

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
 */
export default function PlatformEmailPreviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = role === 'super_admin' || role === 'superadmin' || role === 'platform_admin';
  const [tpl, setTpl] = useState<string>('invite');
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform/email-preview');
      return;
    }
    if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
    }
  }, [status, allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    setSrc(`/api/platform/email-preview?template=${encodeURIComponent(tpl)}&t=${Date.now()}`);
  }, [tpl, allowed]);

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HQLayout title="Email Preview" subtitle="Template Humanify berlogo — sample HTML" platform="humanify">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/platform/observability" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Observability
          </Link>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTpl(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                  tpl === t.id
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-slate-100 overflow-hidden shadow-sm" style={{ minHeight: 640 }}>
          {src ? (
            <iframe title="Email preview" src={src} className="w-full bg-white" style={{ height: 720, border: 0 }} />
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Logo dimuat dari <code className="text-violet-700">https://humanify.id/images/humanify_white.png</code> (header gelap).
          Sample saja — tidak mengirim email.
        </p>
      </div>
    </HQLayout>
  );
}
