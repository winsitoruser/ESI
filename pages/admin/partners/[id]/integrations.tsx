import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  MessageSquare,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  Save,
  X
} from 'lucide-react';

interface Integration {
  id: string;
  integrationType: string;
  provider: string;
  isActive: boolean;
  testMode: boolean;
  configuration: any;
  lastTestedAt: string;
  lastTestStatus: string;
  lastTestMessage: string;
  createdAt: string;
}

interface Partner {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
}

export default function PartnerIntegrations() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id: partnerId } = router.query;
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [showSecrets, setShowSecrets] = useState<{[key: string]: boolean}>({});

  const [formData, setFormData] = useState({
    integrationType: 'payment_gateway',
    provider: 'midtrans',
    isActive: true,
    testMode: true,
    configuration: {}
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login');
      return;
    }

    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      router.push('/admin/login');
      return;
    }

    if (status === 'authenticated' && partnerId) {
      fetchPartner();
      fetchIntegrations();
    }
  }, [status, session, router, partnerId]);

  const fetchPartner = async () => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setPartner(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch partner:', err);
    }
  };

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/partners/${partnerId}/integrations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }

      const data = await response.json();
      setIntegrations(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingIntegration
        ? `/api/admin/integrations/${editingIntegration.id}`
        : `/api/admin/partners/${partnerId}/integrations`;
      
      const method = editingIntegration ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save integration');
      }

      setShowModal(false);
      setEditingIntegration(null);
      fetchIntegrations();
      resetForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      const response = await fetch(`/api/admin/integrations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete integration');
      }

      fetchIntegrations();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      integrationType: integration.integrationType,
      provider: integration.provider,
      isActive: integration.isActive,
      testMode: integration.testMode,
      configuration: integration.configuration
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      integrationType: 'payment_gateway',
      provider: 'midtrans',
      isActive: true,
      testMode: true,
      configuration: {}
    });
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'payment_gateway': return CreditCard;
      case 'whatsapp': return MessageSquare;
      case 'email_smtp': return Mail;
      default: return AlertCircle;
    }
  };

  const getProviderConfig = () => {
    const { integrationType, provider } = formData;
    
    if (integrationType === 'payment_gateway') {
      if (provider === 'midtrans') {
        return [
          { key: 'serverKey', label: 'Server Key', type: 'password', required: true },
          { key: 'clientKey', label: 'Client Key', type: 'text', required: true },
          { key: 'merchantId', label: 'Merchant ID', type: 'text', required: false }
        ];
      } else if (provider === 'xendit') {
        return [
          { key: 'apiKey', label: 'API Key', type: 'password', required: true },
          { key: 'webhookToken', label: 'Webhook Token', type: 'password', required: false }
        ];
      }
    } else if (integrationType === 'whatsapp') {
      if (provider === 'twilio') {
        return [
          { key: 'accountSid', label: 'Account SID', type: 'text', required: true },
          { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
          { key: 'phoneNumber', label: 'Phone Number', type: 'text', required: true }
        ];
      } else if (provider === 'wablas') {
        return [
          { key: 'token', label: 'API Token', type: 'password', required: true },
          { key: 'domain', label: 'Domain', type: 'text', required: true }
        ];
      }
    } else if (integrationType === 'email_smtp') {
      return [
        { key: 'host', label: 'SMTP Host', type: 'text', required: true },
        { key: 'port', label: 'SMTP Port', type: 'number', required: true },
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'fromEmail', label: 'From Email', type: 'email', required: true },
        { key: 'fromName', label: 'From Name', type: 'text', required: false }
      ];
    }
    
    return [];
  };

  if (loading && integrations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Partner Integrations - {partner?.businessName}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link
                  href={`/admin/partners/${partnerId}`}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">API Integrations</h1>
                  <p className="text-sm text-gray-500 mt-1">{partner?.businessName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingIntegration(null);
                  resetForm();
                  setShowModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Integration</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payment Gateways</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {integrations.filter(i => i.integrationType === 'payment_gateway').length}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">WhatsApp</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {integrations.filter(i => i.integrationType === 'whatsapp').length}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Email SMTP</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {integrations.filter(i => i.integrationType === 'email_smtp').length}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Integrations List */}
          <div className="space-y-4">
            {integrations.map((integration) => {
              const Icon = getIntegrationIcon(integration.integrationType);
              
              return (
                <div key={integration.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-3 rounded-lg ${
                        integration.integrationType === 'payment_gateway' ? 'bg-blue-50' :
                        integration.integrationType === 'whatsapp' ? 'bg-green-50' : 'bg-purple-50'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          integration.integrationType === 'payment_gateway' ? 'text-blue-600' :
                          integration.integrationType === 'whatsapp' ? 'text-green-600' : 'text-purple-600'
                        }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 capitalize">
                            {integration.provider}
                          </h3>
                          {integration.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                              Inactive
                            </span>
                          )}
                          {integration.testMode && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                              Test Mode
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 capitalize mb-3">
                          {integration.integrationType.replace('_', ' ')}
                        </p>

                        {integration.lastTestedAt && (
                          <div className="flex items-center space-x-2 text-sm">
                            {integration.lastTestStatus === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-gray-600">
                              Last tested: {new Date(integration.lastTestedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(integration)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(integration.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {integrations.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations configured</h3>
                <p className="text-gray-500 mb-6">Get started by adding your first API integration</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Integration</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingIntegration ? 'Ubah Integrasi' : 'Tambah Integrasi'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingIntegration(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Integration Type *
                  </label>
                  <select
                    value={formData.integrationType}
                    onChange={(e) => setFormData({ ...formData, integrationType: e.target.value, provider: '', configuration: {} })}
                    disabled={!!editingIntegration}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="payment_gateway">Payment Gateway</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email_smtp">Email SMTP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider *
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value, configuration: {} })}
                    disabled={!!editingIntegration}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Select provider</option>
                    {formData.integrationType === 'payment_gateway' && (
                      <>
                        <option value="midtrans">Midtrans</option>
                        <option value="xendit">Xendit</option>
                        <option value="stripe">Stripe</option>
                      </>
                    )}
                    {formData.integrationType === 'whatsapp' && (
                      <>
                        <option value="twilio">Twilio</option>
                        <option value="wablas">Wablas</option>
                        <option value="fonnte">Fonnte</option>
                      </>
                    )}
                    {formData.integrationType === 'email_smtp' && (
                      <>
                        <option value="smtp">Custom SMTP</option>
                        <option value="mailgun">Mailgun</option>
                        <option value="sendgrid">SendGrid</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Dynamic Configuration Fields */}
              {formData.provider && getProviderConfig().map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label} {field.required && '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={field.type === 'password' && showSecrets[field.key] ? 'text' : field.type}
                      value={formData.configuration[field.key] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        configuration: { ...formData.configuration, [field.key]: e.target.value }
                      })}
                      required={field.required}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Test Mode</p>
                    <p className="text-sm text-gray-500">Use sandbox/test environment</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.testMode}
                      onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Active</p>
                    <p className="text-sm text-gray-500">Enable this integration</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingIntegration(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingIntegration ? 'Perbarui' : 'Buat'} Integrasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
