import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  CheckCircle,
  XCircle,
  TestTube,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Plus,
  Building2,
  Globe,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Info,
  Zap,
  Link2,
  Clock,
  CreditCard,
  MessageSquare,
  Mail,
  Truck,
  Calculator,
  ShoppingBag,
  Plug
} from 'lucide-react';

interface CredentialField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  encrypted?: boolean;
  options?: string[];
  helpText?: string;
}

interface Provider {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  logo?: string;
  website?: string;
  documentationUrl?: string;
  apiBaseUrl?: string;
  sandboxApiUrl?: string;
  requiredCredentials?: CredentialField[];
  webhookSupported?: boolean;
  webhookEvents?: string[];
  features?: string[];
  pricing?: Record<string, string>;
  requiresApproval: boolean;
}

interface Config {
  id: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  branchId: string | null;
  branchName: string;
  name: string;
  environment: 'production' | 'sandbox';
  merchantId?: string;
  merchantName?: string;
  status: string;
  isDefault: boolean;
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
  lastTestedAt?: string;
  lastTestResult?: { success: boolean; message?: string; latency?: number };
  activatedAt?: string;
  createdAt: string;
}

const categoryIcons: Record<string, any> = {
  payment_gateway: CreditCard,
  messaging: MessageSquare,
  email: Mail,
  delivery: Truck,
  accounting: Calculator,
  marketplace: ShoppingBag
};

const categoryLabels: Record<string, string> = {
  payment_gateway: 'Payment Gateway',
  messaging: 'Messaging',
  email: 'Email',
  delivery: 'Delivery',
  accounting: 'Accounting',
  marketplace: 'Marketplace'
};

export default function IntegrationManagePage() {
  const router = useRouter();
  const { code, configId } = router.query;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<Config | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'webhooks' | 'branches'>(
    'overview'
  );

  const [formName, setFormName] = useState('');
  const [formEnv, setFormEnv] = useState<'production' | 'sandbox'>('sandbox');
  const [formBranchId, setFormBranchId] = useState<string>('hq');
  const [formBranchName, setFormBranchName] = useState<string>('HQ (Semua Cabang)');
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!code || typeof code !== 'string') return;
    loadData(code);
  }, [code]);

  useEffect(() => {
    if (configId && typeof configId === 'string' && configs.length) {
      const found = configs.find(c => c.id === configId);
      if (found) {
        setSelectedConfig(found);
        hydrateFormFromConfig(found);
        setActiveTab('credentials');
      }
    }
  }, [configId, configs]);

  async function loadData(providerCode: string) {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/hq/integrations/providers/${providerCode}`),
        fetch('/api/hq/integrations/configs')
      ]);

      if (pRes.ok) {
        const json = await pRes.json();
        const p: Provider = json.data || json.provider || json;
        setProvider(p);
        if (p && !configId) {
          setFormName(`${p.name} Production`);
        }

        if (cRes.ok) {
          const cjson = await cRes.json();
          const all: Config[] = cjson.data?.configs || cjson.configs || [];
          const forThis = all.filter(c => c.providerId === p.id);
          setConfigs(forThis);
          if (forThis.length && !configId) {
            const def = forThis.find(c => c.isDefault) || forThis[0];
            setSelectedConfig(def);
            hydrateFormFromConfig(def);
          } else if (!forThis.length) {
            setShowAddForm(true);
          }
        }
      } else if (pRes.status === 404) {
        setProvider(null);
      }
    } catch (err) {
      console.error('Failed to load provider/configs:', err);
    } finally {
      setLoading(false);
    }
  }

  function hydrateFormFromConfig(c: Config) {
    setFormName(c.name);
    setFormEnv(c.environment);
    setFormBranchId(c.branchId || 'hq');
    setFormBranchName(c.branchName);
    setFormCredentials({ ...(c.credentials || {}) });
  }

  function resetFormForCreate() {
    setSelectedConfig(null);
    setFormName(provider ? `${provider.name} Production` : '');
    setFormEnv('sandbox');
    setFormBranchId('hq');
    setFormBranchName('HQ (Semua Cabang)');
    setFormCredentials({});
    setShowAddForm(true);
    setActiveTab('credentials');
  }

  async function handleSave() {
    if (!provider) return;
    if (!formName.trim()) {
      alert('Nama konfigurasi wajib diisi');
      return;
    }

    // Validasi credentials required
    const missing = (provider.requiredCredentials || [])
      .filter(f => f.required && !formCredentials[f.key])
      .map(f => f.label);
    if (missing.length) {
      alert(`Field wajib: ${missing.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      if (selectedConfig) {
        const res = await fetch(`/api/hq/integrations/configs/${selectedConfig.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            environment: formEnv,
            branchId: formBranchId === 'hq' ? null : formBranchId,
            branchName: formBranchName,
            credentials: formCredentials
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Gagal menyimpan');
        alert('Konfigurasi diperbarui');
      } else {
        const res = await fetch('/api/hq/integrations/configs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: provider.id,
            name: formName,
            environment: formEnv,
            branchId: formBranchId === 'hq' ? null : formBranchId,
            branchName: formBranchName,
            credentials: formCredentials
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Gagal menyimpan');
        alert('Konfigurasi berhasil dibuat');
      }
      setShowAddForm(false);
      await loadData(provider.code);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(id?: string) {
    const targetId = id || selectedConfig?.id;
    if (!targetId) {
      alert('Simpan konfigurasi dulu sebelum melakukan test');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/hq/integrations/configs/${targetId}/test`, {
        method: 'POST'
      });
      const json = await res.json();
      setTestResult({
        success: !!json.data?.success,
        message: json.message || (json.data?.success ? 'Koneksi berhasil' : 'Koneksi gagal')
      });
      if (provider) await loadData(provider.code);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Gagal melakukan test' });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus konfigurasi ini?')) return;
    try {
      const res = await fetch(`/api/hq/integrations/configs/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message || 'Gagal menghapus');
      }
      if (provider) await loadData(provider.code);
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
        resetFormForCreate();
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    }
  }

  if (!mounted) return null;

  if (loading) {
    return (
      <HQLayout title="Memuat integrasi..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </HQLayout>
    );
  }

  if (!provider) {
    return (
      <HQLayout title="Provider Tidak Ditemukan" subtitle="">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-10 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Provider tidak ditemukan</h2>
          <p className="text-gray-600 mb-6">
            Kode provider "{String(code)}" tidak dikenali. Silakan kembali ke daftar integrasi.
          </p>
          <button
            onClick={() => router.push('/hq/settings/integrations')}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Kembali
          </button>
        </div>
      </HQLayout>
    );
  }

  const Icon = categoryIcons[provider.category] || Plug;

  return (
    <HQLayout
      title={`Kelola ${provider.name}`}
      subtitle={`${categoryLabels[provider.category] || provider.category} · ${provider.code}`}
    >
      <div className="space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push('/hq/settings/integrations')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Integrasi</span>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{provider.name}</h2>
                  <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs uppercase tracking-wide">
                    {provider.category.replace('_', ' ')}
                  </span>
                </div>
                {provider.description && (
                  <p className="text-white/80 mt-2 max-w-3xl">{provider.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {provider.features?.slice(0, 5).map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-white/20 rounded-full text-xs">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {provider.website && (
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Website
              </a>
            )}
          </div>
        </div>

        {/* Summary / existing configs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Konfigurasi Aktif</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {configs.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Production & Sandbox</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Webhook</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {provider.webhookSupported ? 'Didukung' : 'Tidak'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {provider.webhookEvents?.length || 0} event tersedia
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pendekatan Aktivasi</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {provider.requiresApproval ? 'Pengajuan' : 'Langsung'}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {provider.requiresApproval
                ? 'Butuh persetujuan provider'
                : 'Aktif setelah kredensial valid'}
            </p>
          </div>
        </div>

        {/* Configs list */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Konfigurasi</h3>
              <p className="text-sm text-gray-500">
                Pilih konfigurasi yang ingin dikelola, atau buat baru untuk cabang lain
              </p>
            </div>
            <button
              onClick={resetFormForCreate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              <Plus className="w-4 h-4" /> Konfigurasi Baru
            </button>
          </div>

          {configs.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <Link2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p>Belum ada konfigurasi untuk {provider.name}.</p>
              <p className="text-sm mt-1">Isi form di bawah untuk menambahkan kredensial.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {configs.map(c => (
                <div
                  key={c.id}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 ${
                    selectedConfig?.id === c.id ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedConfig(c);
                      hydrateFormFromConfig(c);
                      setShowAddForm(false);
                      setActiveTab('credentials');
                    }}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Settings className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        <Building2 className="inline w-3 h-3 mr-1" />
                        {c.branchName} · {c.environment}
                        {c.merchantId && <> · ID: {c.merchantId}</>}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.status}
                    </span>
                    <button
                      onClick={() => handleTest(c.id)}
                      disabled={testing}
                      title="Test koneksi"
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      {testing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      title="Hapus"
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center gap-6">
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'credentials', label: 'Kredensial', icon: ShieldCheck },
                { id: 'webhooks', label: 'Webhook', icon: Zap },
                { id: 'branches', label: 'Per Cabang', icon: Building2 }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 text-sm ${
                    activeTab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informasi Provider</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-100 py-2">
                      <dt className="text-gray-500">Kode</dt>
                      <dd className="text-gray-900 font-mono">{provider.code}</dd>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-2">
                      <dt className="text-gray-500">Kategori</dt>
                      <dd className="text-gray-900">{categoryLabels[provider.category]}</dd>
                    </div>
                    {provider.apiBaseUrl && (
                      <div className="flex justify-between border-b border-gray-100 py-2 gap-4">
                        <dt className="text-gray-500 whitespace-nowrap">API Base</dt>
                        <dd className="text-gray-900 font-mono text-xs truncate">
                          {provider.apiBaseUrl}
                        </dd>
                      </div>
                    )}
                    {provider.sandboxApiUrl && (
                      <div className="flex justify-between border-b border-gray-100 py-2 gap-4">
                        <dt className="text-gray-500 whitespace-nowrap">Sandbox</dt>
                        <dd className="text-gray-900 font-mono text-xs truncate">
                          {provider.sandboxApiUrl}
                        </dd>
                      </div>
                    )}
                    {provider.documentationUrl && (
                      <div className="flex justify-between py-2">
                        <dt className="text-gray-500">Dokumentasi</dt>
                        <dd>
                          <a
                            href={provider.documentationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" /> Buka
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Fitur & Pricing</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {provider.features?.map((f, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  {provider.pricing && (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                      {Object.entries(provider.pricing).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-gray-900 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedConfig
                        ? `Edit: ${selectedConfig.name}`
                        : showAddForm
                          ? 'Konfigurasi Baru'
                          : 'Pilih konfigurasi'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Isi kredensial akses yang diberikan oleh {provider.name}.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSecrets(s => !s)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                  >
                    {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showSecrets ? 'Sembunyikan' : 'Tampilkan'} secret
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Konfigurasi <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Misal: Midtrans Production"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Environment
                    </label>
                    <select
                      value={formEnv}
                      onChange={e => setFormEnv(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="sandbox">Sandbox / Testing</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cakupan
                    </label>
                    <select
                      value={formBranchId}
                      onChange={e => {
                        const v = e.target.value;
                        setFormBranchId(v);
                        setFormBranchName(v === 'hq' ? 'HQ (Semua Cabang)' : 'Cabang');
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="hq">HQ (Default Semua Cabang)</option>
                      <option value="branch-001">Cabang Pusat Jakarta</option>
                      <option value="branch-002">Cabang Bandung</option>
                      <option value="branch-003">Cabang Surabaya</option>
                      <option value="branch-004">Cabang Medan</option>
                    </select>
                  </div>
                </div>

                {!provider.requiredCredentials || provider.requiredCredentials.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Provider ini tidak memerlukan kredensial khusus di sisi HQ.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {provider.requiredCredentials.map(field => (
                      <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={formCredentials[field.key] || ''}
                            onChange={e =>
                              setFormCredentials(v => ({ ...v, [field.key]: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Pilih...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={
                              field.type === 'password' && !showSecrets ? 'password' : 'text'
                            }
                            value={formCredentials[field.key] || ''}
                            onChange={e =>
                              setFormCredentials(v => ({ ...v, [field.key]: e.target.value }))
                            }
                            placeholder={field.label}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                          />
                        )}
                        {field.helpText && (
                          <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                        )}
                        {field.encrypted && (
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Disimpan terenkripsi
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {testResult && (
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {testResult.message}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleTest()}
                    disabled={testing || !selectedConfig}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                  >
                    {testing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    Test Koneksi
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {selectedConfig ? 'Simpan Perubahan' : 'Buat Konfigurasi'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'webhooks' && (
              <div className="space-y-5">
                {!provider.webhookSupported ? (
                  <div className="p-6 bg-gray-50 rounded-xl text-gray-600 text-sm">
                    Provider ini belum mendukung webhook.
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
                      <Info className="w-4 h-4 mt-0.5" />
                      <div>
                        Konfigurasikan URL berikut di dashboard {provider.name} untuk menerima
                        notifikasi event secara realtime.
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={`${
                            typeof window !== 'undefined' ? window.location.origin : ''
                          }/api/webhooks/${provider.code}`}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 font-mono text-sm"
                        />
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/api/webhooks/${provider.code}`;
                            navigator.clipboard.writeText(url);
                            alert('URL disalin');
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Event yang Didengarkan</h5>
                      <div className="flex flex-wrap gap-2">
                        {provider.webhookEvents?.map(ev => (
                          <span
                            key={ev}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-mono"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'branches' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    Anda dapat membuat konfigurasi khusus per cabang bila diperlukan (mis. Merchant
                    ID berbeda). Jika tidak, cabang akan memakai konfigurasi HQ default.
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-2 text-gray-500">Cabang</th>
                        <th className="px-4 py-2 text-gray-500">Konfigurasi</th>
                        <th className="px-4 py-2 text-gray-500">Environment</th>
                        <th className="px-4 py-2 text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {configs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                            Belum ada konfigurasi
                          </td>
                        </tr>
                      ) : (
                        configs.map(c => (
                          <tr key={c.id}>
                            <td className="px-4 py-3">{c.branchName}</td>
                            <td className="px-4 py-3">{c.name}</td>
                            <td className="px-4 py-3 capitalize">{c.environment}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  c.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedConfig?.lastTestedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            Test terakhir: {new Date(selectedConfig.lastTestedAt).toLocaleString('id-ID')}
            {selectedConfig.lastTestResult?.latency
              ? ` (${selectedConfig.lastTestResult.latency}ms)`
              : ''}
          </div>
        )}
      </div>
    </HQLayout>
  );
}
