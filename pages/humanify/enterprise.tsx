import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Copy, Download, FileText, KeyRound, Palette, Plus, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import BrandImageUpload from '@/components/humanify/enterprise/BrandImageUpload';
import DocumentTemplateStudio, {
  type CatalogItem,
  type HrTemplate,
} from '@/components/humanify/enterprise/DocumentTemplateStudio';

type BrandingState = {
  logoUrl: string;
  stampUrl: string;
  primaryColor: string;
  accentColor: string;
  hidePoweredBy: boolean;
  careersHeadline: string;
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  npwp: string;
  logoText: string;
  letterheadLayout: 'centered' | 'left' | 'split';
};

const EMPTY_BRANDING: BrandingState = {
  logoUrl: '',
  stampUrl: '',
  primaryColor: '#1d4ed8',
  accentColor: '#0f172a',
  hidePoweredBy: false,
  careersHeadline: '',
  companyName: '',
  tagline: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  npwp: '',
  logoText: '',
  letterheadLayout: 'split',
};

type TabId = 'branding' | 'templates' | 'api';

export default function HumanifyEnterprisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [tab, setTab] = useState<TabId>('branding');
  const [branding, setBranding] = useState<BrandingState>(EMPTY_BRANDING);
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('Integration');
  const [revealedKey, setRevealedKey] = useState('');
  const [docs, setDocs] = useState<any>(null);
  const [featureBlocked, setFeatureBlocked] = useState(false);
  const [templates, setTemplates] = useState<HrTemplate[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [mergeFields, setMergeFields] = useState<{ key: string; label: string }[]>([]);
  const [sampleContext, setSampleContext] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=overview');
      const j = await res.json();
      if (res.status === 403) {
        setFeatureBlocked(true);
        return;
      }
      if (!j.success) throw new Error(j.error || 'Gagal memuat');
      setBranding({ ...EMPTY_BRANDING, ...j.data.branding });
      setKeys(j.data.apiKeys || []);
      setDocs(j.data.docs);
      setTemplates(j.data.templates || []);
      setCatalog(j.data.catalog || []);
      setMergeFields(j.data.mergeFields || []);
      setSampleContext(j.data.sampleContext || {});
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setBranding({ ...EMPTY_BRANDING, ...j.data });
      toast.success('Branding & kop surat disimpan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal simpan');
    } finally {
      setActing(false);
    }
  }

  async function saveTemplate(tpl: HrTemplate) {
    setActing(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=save-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tpl),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setTemplates((prev) => prev.map((t) => (t.type === tpl.type ? (j.data.template || tpl) : t)));
      toast.success('Template disimpan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal simpan template');
    } finally {
      setActing(false);
    }
  }

  async function resetTemplate(type: string) {
    if (!confirm('Kembalikan template ini ke bawaan sistem?')) return;
    setActing(true);
    try {
      const res = await fetch('/api/humanify/enterprise?action=reset-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error);
      setTemplates((prev) => prev.map((t) => (t.type === type ? j.data : t)));
      toast.success('Template direset');
    } catch (e: any) {
      toast.error(e.message || 'Gagal reset');
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
        <div className="hf-analytics-stage space-y-4">
          <div className="h-32 animate-pulse hf-card" />
          <div className="h-56 animate-pulse hf-card" />
        </div>
      </HumanifyLayout>
    );
  }

  if (featureBlocked) {
    return (
      <HumanifyLayout title="Enterprise">
        <PlatformAccessShell
          current="enterprise"
          title="Enterprise (API & Brand)"
          subtitle="White-label karir, API keys, dan export data."
          icon={KeyRound}
        >
          <div className="hf-card p-8 text-center">
            <KeyRound className="mx-auto mb-3 h-10 w-10 text-[color:var(--hf-ink-faint)]" />
            <h2 className="text-lg font-semibold text-[color:var(--hf-ink)]">Tersedia di paket Enterprise</h2>
            <p className="mt-2 text-sm text-[color:var(--hf-ink-muted)]">Upgrade untuk API keys, branding portal karir, dan export karyawan.</p>
            <a href="/humanify/billing" className="hf-btn-primary mt-4 inline-block text-sm">Lihat paket</a>
          </div>
        </PlatformAccessShell>
      </HumanifyLayout>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Palette }[] = [
    { id: 'branding', label: 'Branding & logo', icon: Palette },
    { id: 'templates', label: 'Template dokumen', icon: FileText },
    { id: 'api', label: 'API & export', icon: KeyRound },
  ];

  return (
    <HumanifyLayout title="Enterprise">
      <Head>
        <title>Enterprise · {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PlatformAccessShell
          current="enterprise"
          title="Enterprise (API & Brand)"
          subtitle="Logo perusahaan, kop surat, draft template dokumen, API keys, dan export data."
          icon={KeyRound}
        >
        <div className="flex flex-wrap gap-1 hf-card p-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-[var(--hf-radius)] px-3 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'bg-[var(--hf-brand-600)] text-white'
                  : 'text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'branding' && (
          <section className="hf-card space-y-5 p-5">
            <div>
              <h2 className="text-base font-semibold text-[color:var(--hf-ink)]">Identitas perusahaan</h2>
              <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                Logo dan kop ini dipakai di portal karir, slip gaji, kontrak, paklaring, surat peringatan, KPI, dan laporan HR.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <BrandImageUpload
                label="Logo perusahaan"
                value={branding.logoUrl}
                onChange={(logoUrl) => setBranding({ ...branding, logoUrl })}
              />
              <BrandImageUpload
                label="Stempel / cap (opsional)"
                hint="PNG transparan disarankan. Tampil di area tanda tangan bila template memakainya."
                kind="stamp"
                value={branding.stampUrl}
                onChange={(stampUrl) => setBranding({ ...branding, stampUrl })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Nama perusahaan (kop surat)</span>
                <input className="hf-input mt-1 w-full" value={branding.companyName} onChange={(e) => setBranding({ ...branding, companyName: e.target.value })} placeholder="PT Contoh Sejahtera" />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Tagline</span>
                <input className="hf-input mt-1 w-full" value={branding.tagline} onChange={(e) => setBranding({ ...branding, tagline: e.target.value })} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[color:var(--hf-ink-secondary)]">Alamat</span>
                <textarea className="hf-input mt-1 w-full" rows={2} value={branding.address} onChange={(e) => setBranding({ ...branding, address: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Telepon</span>
                <input className="hf-input mt-1 w-full" value={branding.phone} onChange={(e) => setBranding({ ...branding, phone: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Email</span>
                <input className="hf-input mt-1 w-full" type="email" value={branding.email} onChange={(e) => setBranding({ ...branding, email: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Website</span>
                <input className="hf-input mt-1 w-full" value={branding.website} onChange={(e) => setBranding({ ...branding, website: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">NPWP</span>
                <input className="hf-input mt-1 w-full" value={branding.npwp} onChange={(e) => setBranding({ ...branding, npwp: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Inisial logo (jika tanpa gambar)</span>
                <input className="hf-input mt-1 w-full" value={branding.logoText} onChange={(e) => setBranding({ ...branding, logoText: e.target.value })} placeholder="PS" />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Layout kop</span>
                <select className="hf-input mt-1 w-full" value={branding.letterheadLayout} onChange={(e) => setBranding({ ...branding, letterheadLayout: e.target.value as BrandingState['letterheadLayout'] })}>
                  <option value="split">Split (logo + info)</option>
                  <option value="centered">Tengah (formal)</option>
                  <option value="left">Kiri</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Headline karir</span>
                <input className="hf-input mt-1 w-full" value={branding.careersHeadline} onChange={(e) => setBranding({ ...branding, careersHeadline: e.target.value })} placeholder="Bergabung dengan tim kami" />
              </label>
              <label className="block text-sm">
                <span className="text-[color:var(--hf-ink-secondary)]">Warna utama</span>
                <input type="color" className="mt-1 h-10 w-full rounded-lg border border-[var(--hf-border)]" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input type="checkbox" checked={branding.hidePoweredBy} onChange={(e) => setBranding({ ...branding, hidePoweredBy: e.target.checked })} />
                Sembunyikan “Powered by Humanify”
              </label>
            </div>
            <button type="button" disabled={acting} onClick={saveBranding} className="hf-btn-primary text-sm disabled:opacity-50">
              Simpan branding
            </button>
          </section>
        )}

        {tab === 'templates' && (
          <section className="space-y-3">
            <p className="text-sm text-[color:var(--hf-ink-muted)]">
              Edit draft kontrak, paklaring, surat peringatan, laporan KPI, dan dokumen HR lain. Sisipkan field seperti{' '}
              <code className="rounded bg-[var(--hf-surface-muted)] px-1">{'{{employee_name}}'}</code>. Logo mengikuti pengaturan Branding.
            </p>
            <DocumentTemplateStudio
              catalog={catalog}
              templates={templates}
              mergeFields={mergeFields}
              sampleContext={{
                ...sampleContext,
                company_name: branding.companyName || sampleContext.company_name,
                company_address: branding.address || sampleContext.company_address,
              }}
              brandingLogo={branding.logoUrl}
              acting={acting}
              onSave={saveTemplate}
              onReset={resetTemplate}
            />
          </section>
        )}

        {tab === 'api' && (
          <>
        <section className="hf-card space-y-4 p-5">
          <div className="flex items-center gap-2 text-[color:var(--hf-ink)] font-medium">
            <KeyRound className="w-5 h-5 text-[color:var(--hf-brand-600)]" /> API keys
          </div>
          {docs && (
            <p className="text-xs text-[color:var(--hf-ink-muted)] font-mono">
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
              className="hf-input flex-1 min-w-[160px] text-sm"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Nama key"
            />
            <button
              type="button"
              disabled={acting}
              onClick={createKey}
              className="hf-btn-primary inline-flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" /> Buat key
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {keys.map((k) => (
              <li key={k.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-[color:var(--hf-ink)]">{k.name}</p>
                  <p className="text-[color:var(--hf-ink-muted)] font-mono text-xs">
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
          </ul>
          {!keys.length && (
            <HrisEmptyState
              source="empty"
              title="Belum ada API key"
              description="Buat key untuk integrasi HRIS eksternal. Simpan secret hanya sekali saat dibuat."
            />
          )}
        </section>

        <section className="hf-card space-y-3 p-5">
          <div className="flex items-center gap-2 text-[color:var(--hf-ink)] font-medium">
            <Download className="w-5 h-5 text-[color:var(--hf-brand-600)]" /> Export data
          </div>
          <p className="text-sm text-[color:var(--hf-ink-secondary)]">Unduh CSV karyawan (hingga 5.000 baris) untuk portability.</p>
          <button
            type="button"
            disabled={acting}
            onClick={exportCsv}
            className="hf-btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> Export employees CSV
          </button>
        </section>
          </>
        )}
        </PlatformAccessShell>
    </HumanifyLayout>
  );
}
