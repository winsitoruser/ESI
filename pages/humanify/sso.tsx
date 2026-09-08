import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { KeyRound, Loader2, ShieldCheck, Info, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
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
      const { formatApiErrorToast } = await import('@/lib/humanify/api-error');
      toast.error(formatApiErrorToast({ error: e.message }).message || 'Gagal menyimpan');
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
      const { formatApiErrorToast } = await import('@/lib/humanify/api-error');
      toast.error(formatApiErrorToast({ error: e.message }).message || 'Gagal');
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
        <div className="hf-analytics-stage space-y-4">
          <div className="h-32 animate-pulse hf-card" />
          <div className="h-56 animate-pulse hf-card" />
        </div>
      </HumanifyLayout>
    );
  }

  if (featureBlocked) {
    return (
      <HumanifyLayout title="SSO (Enterprise)" subtitle="Single Sign-On SAML">
        <PlatformAccessShell
            current="sso"
            title="SSO (SAML)"
            subtitle="Single Sign-On tersedia di paket Enterprise."
            icon={KeyRound}
          >
          <div className="hf-card rounded-2xl border border-[var(--hf-border)] bg-white p-8 text-center">
            <KeyRound className="w-10 h-10 mx-auto text-[color:var(--hf-ink-faint)] mb-3" />
            <h2 className="text-lg font-bold text-[color:var(--hf-ink)]">Upgrade untuk mengaktifkan SSO</h2>
            <p className="text-sm text-[color:var(--hf-ink-muted)] mt-2">Sambungkan Okta, Azure AD, atau Google Workspace tanpa hard-redirect dari halaman ini.</p>
            <a href="/humanify/billing" className="hf-btn-primary mt-4 inline-block text-sm">Lihat paket</a>
          </div>
        </PlatformAccessShell>
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
        <PlatformAccessShell
          current="sso"
          title="SSO (SAML)"
          subtitle="Daftarkan Service Provider Humanify di IdP, lalu simpan metadata IdP di sini."
          icon={KeyRound}
        >
          <div className="flex items-start gap-2 rounded-xl border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm text-[color:var(--hf-brand-600)]">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Simpan konfigurasi IdP di sini dan daftarkan detail Service Provider di bawah pada IdP Anda.
              Aktivasi login SSO end-to-end (ACS) sudah aktif. Bagikan Login Init URL ke pengguna, atau uji dari halaman login Humanify (kolom slug + tombol SSO). Login kredensial tetap berjalan normal.
            </span>
          </div>

          <div className="rounded-xl border border-[var(--hf-border)] bg-white px-4 py-3 text-sm text-[color:var(--hf-ink-secondary)]">
            <p className="font-semibold text-[color:var(--hf-ink)] mb-1">Cara pasang di IdP</p>
            <ol className="list-decimal pl-5 text-xs text-[color:var(--hf-ink-secondary)] space-y-1">
              <li>Salin Entity ID, ACS URL, dan metadata SP di bawah.</li>
              <li>Buat aplikasi SAML di Okta / Azure AD / Google Workspace memakai nilai tersebut.</li>
              <li>Tempel SSO URL, Entity ID, dan sertifikat X.509 IdP, lalu aktifkan SSO.</li>
              <li>Uji dari halaman login Humanify (slug tenant + tombol SSO). Login password tetap berjalan.</li>
            </ol>
          </div>

          <div className="hf-card p-5">
            <h3 className="font-semibold text-[color:var(--hf-ink)] mb-3 flex items-center gap-2">
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
                  <span className="w-32 text-[color:var(--hf-ink-muted)] flex-shrink-0">{label}</span>
                  <code className="flex-1 bg-[var(--hf-surface-muted)] rounded px-2 py-1 text-xs truncate">{val || '—'}</code>
                  {val && (
                    <button type="button" onClick={() => copy(String(val))} className="text-xs text-[color:var(--hf-brand-600)] hover:underline">Salin</button>
                  )}
                </div>
              ))}
            </div>
            {sp?.metadataUrl && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={sp.metadataUrl}
                  download="humanify-sp-metadata.xml"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--hf-brand-600)] text-white text-sm font-medium hover:bg-[var(--hf-brand)]"
                >
                  <Download className="w-4 h-4" /> Unduh SP metadata (XML)
                </a>
                <button
                  type="button"
                  onClick={() => copy(String(sp.metadataUrl))}
                  className="hf-btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  Salin URL metadata
                </button>
              </div>
            )}
          </div>

          <div className="hf-card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[color:var(--hf-ink)]">Konfigurasi Identity Provider (IdP)</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>
                {config?.enabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <label className="block">
              <span className="text-sm text-[color:var(--hf-ink-secondary)]">IdP SSO URL (entryPoint)</span>
              <input
                type="url"
                value={form.entryPoint}
                onChange={(e) => setForm({ ...form, entryPoint: e.target.value })}
                placeholder="https://idp.example.com/sso/saml"
                className="hf-input mt-1 w-full"
              />
            </label>

            <label className="block">
              <span className="text-sm text-[color:var(--hf-ink-secondary)]">IdP Entity ID / Issuer</span>
              <input
                type="text"
                value={form.idpEntityId}
                onChange={(e) => setForm({ ...form, idpEntityId: e.target.value })}
                placeholder="https://idp.example.com/entity"
                className="hf-input mt-1 w-full"
              />
            </label>

            <label className="block">
              <span className="text-sm text-[color:var(--hf-ink-secondary)]">Domain email (opsional, untuk auto-route)</span>
              <input
                type="text"
                value={form.emailDomain}
                onChange={(e) => setForm({ ...form, emailDomain: e.target.value })}
                placeholder="example.com"
                className="hf-input mt-1 w-full"
              />
            </label>

            <label className="block">
              <span className="text-sm text-[color:var(--hf-ink-secondary)]">
                Sertifikat X.509 IdP {config?.certPresent ? '(tersimpan — isi untuk mengganti)' : ''}
              </span>
              <textarea
                value={form.cert}
                onChange={(e) => setForm({ ...form, cert: e.target.value })}
                placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
                rows={5}
                className="hf-input mt-1 w-full font-mono text-xs"
              />
              {config?.certFingerprint && (
                <span className="text-xs text-[color:var(--hf-ink-faint)]">SHA-256: {config.certFingerprint}</span>
              )}
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              <span className="text-sm text-[color:var(--hf-ink-secondary)]">Aktifkan SSO untuk tenant ini</span>
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="hf-btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Simpan konfigurasi
              </button>
              {config?.enabled && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={disable}
                  className="hf-btn-secondary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  Nonaktifkan
                </button>
              )}
            </div>
          </div>
        </PlatformAccessShell>
      </HumanifyLayout>
    </>
  );
}