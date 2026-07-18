import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { KeyRound, Loader2, ShieldCheck, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

export default function HumanifySsoPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [sp, setSp] = useState<any>(null);
  const [form, setForm] = useState({ enabled: false, entryPoint: '', idpEntityId: '', cert: '', emailDomain: '' });
  const [featureBlocked, setFeatureBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/sso?action=config');
      if (res.status === 403) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === 'FEATURE_NOT_IN_PLAN') setFeatureBlocked(true);
        return;
      }
      const j = await res.json();
      if (j.success) {
        setConfig(j.data.config);
        setSp(j.data.sp);
        setForm((f) => ({
          ...f,
          enabled: Boolean(j.data.config?.enabled),
          entryPoint: j.data.config?.entryPoint || '',
          idpEntityId: j.data.config?.idpEntityId || '',
          emailDomain: j.data.config?.emailDomain || '',
        }));
      }
    } catch {
      toast.error('Gagal memuat konfigurasi SSO');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/sso`);
      return;
    }
    if (status === 'authenticated') load();
  }, [status, load, router]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/sso?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal menyimpan');
      setConfig(j.data.config);
      setSp(j.data.sp);
      setForm((f) => ({ ...f, cert: '' }));
      toast.success(j.message || 'Konfigurasi tersimpan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function disable() {
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/sso?action=disable', { method: 'POST' });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Gagal');
      setConfig(j.data.config);
      setForm((f) => ({ ...f, enabled: false }));
      toast.success(j.message || 'SSO dinonaktifkan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setSaving(false);
    }
  }

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    toast.success('Disalin');
  };

  if (status === 'loading' || loading) {
    return (
      <HumanifyLayout title="SSO">
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat…
        </div>
      </HumanifyLayout>
    );
  }

  if (featureBlocked) {
    return (
      <HumanifyLayout title="SSO (Enterprise)" subtitle="Single Sign-On SAML">
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <KeyRound className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h2 className="text-lg font-bold text-slate-900">SSO tersedia di paket Enterprise</h2>
          <p className="text-sm text-slate-500 mt-2">Upgrade paket untuk mengaktifkan Single Sign-On SAML bagi tim Anda.</p>
          <a href="/humanify/billing" className="inline-block mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
            Lihat paket
          </a>
        </div>
      </HumanifyLayout>
    );
  }

  return (
    <>
      <Head>
        <title>SSO — {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <HumanifyLayout title="Single Sign-On (SAML)" subtitle="Konfigurasi Identity Provider enterprise Anda">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Simpan konfigurasi IdP di sini dan daftarkan detail Service Provider di bawah pada IdP Anda.
              Aktivasi login SSO end-to-end (ACS) sudah aktif. Bagikan Login Init URL ke pengguna, atau uji dari halaman login Humanify (kolom slug + tombol SSO). Login kredensial tetap berjalan normal.
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900 mb-1">QC IdP (internal)</p>
            <p className="text-slate-500 mb-2">
              Gate rilis pakai synthetic ACS — tidak butuh kredensial customer.
              QC Okta / Azure / Google Workspace: satu tenant staging per keluarga IdP (lihat runbook).
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
              <li>Synthetic: <code className="bg-slate-100 px-1 rounded">npm run smoke:sso-acs</code> + <code className="bg-slate-100 px-1 rounded">smoke:sso-idp-checklist</code></li>
              <li>Runbook: <a className="text-violet-600 hover:underline" href="/docs/humanify-sso-idp-runbook.md" target="_blank" rel="noreferrer">humanify-sso-idp-runbook.md</a></li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Detail Service Provider (SP)
            </h3>
            <div className="space-y-2 text-sm">
              {[
                ['Entity ID', sp?.entityId],
                ['ACS URL', sp?.acsUrl],
                ['Login init URL', sp?.loginInitUrl],
                ['SP metadata', sp?.metadataUrl],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-32 text-slate-500 flex-shrink-0">{label}</span>
                  <code className="flex-1 bg-slate-100 rounded px-2 py-1 text-xs truncate">{val || '—'}</code>
                  {val && (
                    <button type="button" onClick={() => copy(String(val))} className="text-xs text-violet-600 hover:underline">Salin</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Konfigurasi Identity Provider (IdP)</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {config?.enabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <label className="block">
              <span className="text-sm text-slate-600">IdP SSO URL (entryPoint)</span>
              <input
                type="url"
                value={form.entryPoint}
                onChange={(e) => setForm({ ...form, entryPoint: e.target.value })}
                placeholder="https://idp.example.com/sso/saml"
                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">IdP Entity ID / Issuer</span>
              <input
                type="text"
                value={form.idpEntityId}
                onChange={(e) => setForm({ ...form, idpEntityId: e.target.value })}
                placeholder="https://idp.example.com/entity"
                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">Domain email (opsional, untuk auto-route)</span>
              <input
                type="text"
                value={form.emailDomain}
                onChange={(e) => setForm({ ...form, emailDomain: e.target.value })}
                placeholder="example.com"
                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-600">
                Sertifikat X.509 IdP {config?.certPresent ? '(tersimpan — isi untuk mengganti)' : ''}
              </span>
              <textarea
                value={form.cert}
                onChange={(e) => setForm({ ...form, cert: e.target.value })}
                placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
                rows={5}
                className="mt-1 w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono"
              />
              {config?.certFingerprint && (
                <span className="text-xs text-slate-400">SHA-256: {config.certFingerprint}</span>
              )}
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              <span className="text-sm text-slate-700">Aktifkan SSO untuk tenant ini</span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Simpan konfigurasi
              </button>
              {config?.enabled && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={disable}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Nonaktifkan
                </button>
              )}
            </div>
          </div>
        </div>
      </HumanifyLayout>
    </>
  );
}
