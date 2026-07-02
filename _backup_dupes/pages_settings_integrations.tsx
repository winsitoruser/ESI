import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Settings, CreditCard, MessageSquare, Mail, Plus, Check, X, 
  RefreshCw, Trash2, Edit2, Eye, EyeOff, ChevronLeft, AlertCircle,
  Zap, Shield, Clock, ArrowRight
} from 'lucide-react';

interface Integration {
  id: string;
  integrationType: string;
  provider: string;
  name: string;
  configuration: any;
  status: string;
  isActive: boolean;
  lastTestedAt?: string;
  source?: string;
}

export default function IntegrationsSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payment_gateway');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'payment_gateway' | 'whatsapp' | 'email_smtp'>('payment_gateway');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchIntegrations();
    }
  }, [status]);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/settings/integrations');
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.data.integrations || []);
      }
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setError('');
    try {
      const res = await fetch(`/api/settings/integrations/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Koneksi berhasil!');
        fetchIntegrations();
      } else {
        setError(data.message || 'Test gagal');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(null);
      setTimeout(() => { setSuccess(''); setError(''); }, 3000);
    }
  };

  const handleSave = async () => {
    setError('');
    try {
      const url = editingId 
        ? `/api/settings/integrations/${editingId}`
        : '/api/settings/integrations';
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType: modalType,
          provider: formData.provider,
          name: formData.name,
          configuration: formData.configuration
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(editingId ? 'Integrasi diperbarui!' : 'Integrasi ditambahkan!');
        setShowModal(false);
        setFormData({});
        setEditingId(null);
        fetchIntegrations();
      } else {
        setError(data.error || 'Gagal menyimpan');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menonaktifkan integrasi ini?')) return;
    
    try {
      const res = await fetch(`/api/settings/integrations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Integrasi dinonaktifkan');
        fetchIntegrations();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAddModal = (type: 'payment_gateway' | 'whatsapp' | 'email_smtp') => {
    setModalType(type);
    setEditingId(null);
    setFormData({ provider: '', name: '', configuration: {} });
    setShowModal(true);
  };

  const openEditModal = (integration: Integration) => {
    setModalType(integration.integrationType as any);
    setEditingId(integration.id);
    setFormData({
      provider: integration.provider,
      name: integration.name,
      configuration: integration.configuration || {}
    });
    setShowModal(true);
  };

  const getFilteredIntegrations = () => {
    return integrations.filter(i => i.integrationType === activeTab);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1"><Check size={12} /> Aktif</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1"><X size={12} /> Gagal</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><Clock size={12} /> Pending</span>;
    }
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      midtrans: '💳',
      xendit: '💰',
      twilio: '📱',
      wablas: '💬',
      fonnte: '📲',
      smtp: '📧',
      mailgun: '✉️',
      sendgrid: '📨'
    };
    return icons[provider] || '🔌';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pengaturan Integrasi - Bedagang POS</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft size={20} />
              </Link>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Pengaturan Integrasi</h1>
                <p className="text-sm text-gray-500">Kelola koneksi Payment Gateway, WhatsApp & Email</p>
              </div>
            </div>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Check size={18} />
              {success}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('payment_gateway')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'payment_gateway' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              <CreditCard size={18} />
              Payment Gateway
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'whatsapp' 
                  ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              <MessageSquare size={18} />
              WhatsApp
            </button>
            <button
              onClick={() => setActiveTab('email_smtp')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === 'email_smtp' 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              <Mail size={18} />
              Email SMTP
            </button>
          </div>

          {/* Content Based on Tab */}
          <div className="space-y-4">
            {/* Add Button */}
            <button
              onClick={() => openAddModal(activeTab as any)}
              className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
            >
              <Plus size={20} />
              Tambah {activeTab === 'payment_gateway' ? 'Payment Gateway' : activeTab === 'whatsapp' ? 'WhatsApp' : 'Email SMTP'}
            </button>

            {/* Integration Cards */}
            {getFilteredIntegrations().map((integration) => (
              <div key={integration.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{getProviderIcon(integration.provider)}</div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{integration.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{integration.provider}</p>
                      {integration.source === 'partner' && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                          Dari Partner
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(integration.status)}
                  </div>
                </div>

                {/* Config Preview */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(integration.configuration || {}).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="text-gray-700 font-medium">
                          {key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password')
                            ? '••••••••'
                            : String(value).substring(0, 20)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {integration.lastTestedAt && (
                      <>Terakhir ditest: {new Date(integration.lastTestedAt).toLocaleString('id-ID')}</>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={testing === integration.id}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                    >
                      {testing === integration.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Zap size={14} />
                      )}
                      Test
                    </button>
                    <button
                      onClick={() => openEditModal(integration)}
                      className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {getFilteredIntegrations().length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <div className="text-5xl mb-4">
                  {activeTab === 'payment_gateway' ? '💳' : activeTab === 'whatsapp' ? '💬' : '📧'}
                </div>
                <h3 className="text-lg font-semibold text-gray-700">Belum ada integrasi</h3>
                <p className="text-gray-500 mt-1">Tambahkan integrasi baru untuk memulai</p>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
              <Shield className="w-8 h-8 mb-3 opacity-80" />
              <h3 className="font-semibold">Keamanan Data</h3>
              <p className="text-sm opacity-80 mt-1">Semua kredensial dienkripsi dan disimpan dengan aman</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
              <Zap className="w-8 h-8 mb-3 opacity-80" />
              <h3 className="font-semibold">Integrasi Real-time</h3>
              <p className="text-sm opacity-80 mt-1">Notifikasi dan pembayaran diproses secara real-time</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
              <Settings className="w-8 h-8 mb-3 opacity-80" />
              <h3 className="font-semibold">Multi-Provider</h3>
              <p className="text-sm opacity-80 mt-1">Dukung berbagai provider sesuai kebutuhan bisnis Anda</p>
            </div>
          </div>
        </main>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white">
                <h2 className="text-xl font-bold">
                  {editingId ? 'Edit' : 'Tambah'} {
                    modalType === 'payment_gateway' ? 'Payment Gateway' :
                    modalType === 'whatsapp' ? 'WhatsApp' : 'Email SMTP'
                  }
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                  <select
                    value={formData.provider || ''}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value, configuration: {} })}
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Provider</option>
                    {modalType === 'payment_gateway' && (
                      <>
                        <option value="midtrans">Midtrans</option>
                        <option value="xendit">Xendit</option>
                      </>
                    )}
                    {modalType === 'whatsapp' && (
                      <>
                        <option value="twilio">Twilio</option>
                        <option value="wablas">Wablas</option>
                        <option value="fonnte">Fonnte</option>
                      </>
                    )}
                    {modalType === 'email_smtp' && (
                      <>
                        <option value="smtp">SMTP Custom</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="sendgrid">SendGrid</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Integrasi</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Payment Utama"
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Dynamic Config Fields */}
                {formData.provider && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-gray-700">Konfigurasi {formData.provider}</h3>
                    
                    {/* Midtrans */}
                    {formData.provider === 'midtrans' && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Server Key</label>
                          <div className="relative">
                            <input
                              type={showPassword['serverKey'] ? 'text' : 'password'}
                              value={formData.configuration?.serverKey || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, serverKey: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg pr-10"
                              placeholder="SB-Mid-server-xxx"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword({ ...showPassword, serverKey: !showPassword['serverKey'] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword['serverKey'] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Client Key</label>
                          <input
                            type="text"
                            value={formData.configuration?.clientKey || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, clientKey: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg"
                            placeholder="SB-Mid-client-xxx"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isProduction"
                            checked={formData.configuration?.isProduction || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, isProduction: e.target.checked }
                            })}
                            className="w-4 h-4 rounded"
                          />
                          <label htmlFor="isProduction" className="text-sm text-gray-600">Mode Production</label>
                        </div>
                      </>
                    )}

                    {/* Xendit */}
                    {formData.provider === 'xendit' && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Secret Key</label>
                          <div className="relative">
                            <input
                              type={showPassword['secretKey'] ? 'text' : 'password'}
                              value={formData.configuration?.secretKey || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, secretKey: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg pr-10"
                              placeholder="xnd_development_xxx"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword({ ...showPassword, secretKey: !showPassword['secretKey'] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword['secretKey'] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Webhook Token</label>
                          <input
                            type="text"
                            value={formData.configuration?.webhookToken || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, webhookToken: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg"
                            placeholder="Token untuk verifikasi webhook"
                          />
                        </div>
                      </>
                    )}

                    {/* Twilio */}
                    {formData.provider === 'twilio' && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Account SID</label>
                          <input
                            type="text"
                            value={formData.configuration?.accountSid || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, accountSid: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg"
                            placeholder="ACxxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Auth Token</label>
                          <div className="relative">
                            <input
                              type={showPassword['authToken'] ? 'text' : 'password'}
                              value={formData.configuration?.authToken || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, authToken: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword({ ...showPassword, authToken: !showPassword['authToken'] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword['authToken'] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">WhatsApp Phone Number</label>
                          <input
                            type="text"
                            value={formData.configuration?.phoneNumber || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, phoneNumber: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg"
                            placeholder="+14155238886"
                          />
                        </div>
                      </>
                    )}

                    {/* Wablas */}
                    {formData.provider === 'wablas' && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Domain</label>
                          <input
                            type="text"
                            value={formData.configuration?.domain || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, domain: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg"
                            placeholder="https://solo.wablas.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Token</label>
                          <div className="relative">
                            <input
                              type={showPassword['token'] ? 'text' : 'password'}
                              value={formData.configuration?.token || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, token: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword({ ...showPassword, token: !showPassword['token'] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword['token'] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Fonnte */}
                    {formData.provider === 'fonnte' && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">API Token</label>
                        <div className="relative">
                          <input
                            type={showPassword['token'] ? 'text' : 'password'}
                            value={formData.configuration?.token || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, token: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword({ ...showPassword, token: !showPassword['token'] })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword['token'] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SMTP */}
                    {formData.provider === 'smtp' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Host</label>
                            <input
                              type="text"
                              value={formData.configuration?.host || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, host: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Port</label>
                            <input
                              type="text"
                              value={formData.configuration?.port || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, port: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                              placeholder="587"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Username / Email</label>
                          <input
                            type="text"
                            value={formData.configuration?.username || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              configuration: { ...formData.configuration, username: e.target.value }
                            })}
                            className="w-full px-4 py-2.5 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Password / App Password</label>
                          <div className="relative">
                            <input
                              type={showPassword['password'] ? 'text' : 'password'}
                              value={formData.configuration?.password || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, password: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword({ ...showPassword, password: !showPassword['password'] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword['password'] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">From Email</label>
                            <input
                              type="email"
                              value={formData.configuration?.fromEmail || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, fromEmail: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">From Name</label>
                            <input
                              type="text"
                              value={formData.configuration?.fromName || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, fromName: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                              placeholder="Toko Saya"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Mailgun / SendGrid */}
                    {(formData.provider === 'mailgun' || formData.provider === 'sendgrid') && (
                      <>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">API Key</label>
                          <div className="relative">
                            <input
                              type={showPassword['apiKey'] ? 'text' : 'password'}
                              value={formData.configuration?.apiKey || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, apiKey: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword({ ...showPassword, apiKey: !showPassword['apiKey'] })}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword['apiKey'] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                        {formData.provider === 'mailgun' && (
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Domain</label>
                            <input
                              type="text"
                              value={formData.configuration?.domain || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, domain: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                              placeholder="mg.yourdomain.com"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">From Email</label>
                            <input
                              type="email"
                              value={formData.configuration?.fromEmail || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, fromEmail: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">From Name</label>
                            <input
                              type="text"
                              value={formData.configuration?.fromName || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                configuration: { ...formData.configuration, fromName: e.target.value }
                              })}
                              className="w-full px-4 py-2.5 border rounded-lg"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowModal(false); setFormData({}); setEditingId(null); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.provider}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Check size={18} />
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
