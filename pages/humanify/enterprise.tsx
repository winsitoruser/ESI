import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Copy, Download, KeyRound, Loader2, Palette, Trash2, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function HumanifyEnterprisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [branding, setBranding] = useState({
    logoUrl: '',
    primaryColor: '#1d4ed8',
    accentColor: '#0f172a',
    hidePoweredBy: false,
    careersHeadline: '',
  });
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('Integration');
  const [revealedKey, setRevealedKey] = useState('');
  const [docs, setDocs] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=overview');
      const j = await res.json();
      if (res.status === 403) {
        toast.error(j.message || 'Fitur Enterprise — upgrade paket');
        router.replace('/humanify/billing');
        return;
      }
      if (!j.success) throw new Error(j.error || 'Gagal memuat');
      setBranding({ ...branding, ...j.data.branding });
      setKeys(j.data.apiKeys || []);
      setDocs(j.data.docs);
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/enterprise`);
      return;
    }
    if (status === 'authenticated') load();
  }, [status, load, router]);

  async function saveBranding() {
    setActing(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=save-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setBranding(j.data);
      toast.success('Branding disimpan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal simpan');
    } finally {
      setActing(false);
    }
  }

  async function createKey() {
    setActing(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=create-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setRevealedKey(j.data.apiKey);
      toast.success('API key dibuat — salin sekarang');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat key');
    } finally {
      setActing(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Cabut API key ini?')) return;
    setActing(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=revoke-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      toast.success('API key dicabut');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal cabut');
    } finally {
      setActing(false);
    }
  }

  async function exportCsv() {
    setActing(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=export-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Export gagal');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `humanify-employees-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV diunduh');
    } catch (e: any) {
      toast.error(e.message || 'Export gagal');
    } finally {
      setActing(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <HumanifyLayout title="Enterprise">
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat…
        </div>
      </HumanifyLayout>
    );
  }

  return (
    <HumanifyLayout title="Enterprise">
      <Head>
        <title>Enterprise · {HUMANIFY_BRAND.name}</title>
      </Head>
      <div className="max-w-4xl mx-auto space-y-10 py-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Phase 5</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">Enterprise tools</h1>
          <p className="text-slate-600 mt-1 text-sm">
            White-label karir, API keys, dan export data portability.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-medium">
            <Palette className="w-5 h-5 text-indigo-600" /> Branding portal karir
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-slate-600">Logo URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="https://…/logo.png"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Headline karir</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={branding.careersHeadline}
                onChange={(e) => setBranding({ ...branding, careersHeadline: e.target.value })}
                placeholder="Bergabung dengan tim kami"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Warna utama</span>
              <input
                type="color"
                className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                checked={branding.hidePoweredBy}
                onChange={(e) => setBranding({ ...branding, hidePoweredBy: e.target.checked })}
              />
              Sembunyikan “Powered by Humanify”
            </label>
          </div>
          <button
            type="button"
            disabled={acting}
            onClick={saveBranding}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Simpan branding
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-medium">
            <KeyRound className="w-5 h-5 text-indigo-600" /> API keys
          </div>
          {docs && (
            <p className="text-xs text-slate-500 font-mono">
              {docs.authHeader} → GET {docs.employeesEndpoint}
            </p>
          )}
          {revealedKey && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className="font-medium text-amber-900 mb-1">Salin sekarang (hanya sekali):</p>
              <code className="break-all text-amber-950">{revealedKey}</code>
              <button
                type="button"
                className="ml-2 inline-flex items-center gap-1 text-amber-800 underline"
                onClick={() => {
                  navigator.clipboard.writeText(revealedKey);
                  toast.success('Disalin');
                }}
              >
                <Copy className="w-3 h-3" /> Salin
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex-1 min-w-[160px]"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Nama key"
            />
            <button
              type="button"
              disabled={acting}
              onClick={createKey}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-4 py-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Buat key
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {keys.map((k) => (
              <li key={k.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{k.name}</p>
                  <p className="text-slate-500 font-mono text-xs">
                    {k.keyPrefix}… {k.revokedAt ? '(revoked)' : ''}
                  </p>
                </div>
                {!k.revokedAt && (
                  <button
                    type="button"
                    onClick={() => revokeKey(k.id)}
                    className="text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Cabut
                  </button>
                )}
              </li>
            ))}
            {!keys.length && <li className="py-2 text-slate-500 text-sm">Belum ada API key.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-medium">
            <Download className="w-5 h-5 text-indigo-600" /> Export data
          </div>
          <p className="text-sm text-slate-600">Unduh CSV karyawan (hingga 5.000 baris) untuk portability.</p>
          <button
            type="button"
            disabled={acting}
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> Export employees CSV
          </button>
        </section>
      </div>
    </HumanifyLayout>
  );
}
