import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FaCreditCard, FaWhatsapp, FaEnvelope, FaLink, FaPlug, FaCheckCircle, 
  FaTimesCircle, FaExclamationTriangle, FaKey, FaExternalLinkAlt, FaCog
} from 'react-icons/fa';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'payment' | 'communication' | 'analytics' | 'other';
  status: 'connected' | 'disconnected' | 'error';
  config?: any;
  docsUrl?: string;
}

const Integrations: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const MOCK_INTEGRATIONS: Integration[] = [
    { id: 'int1', name: 'Midtrans', description: 'Payment Gateway', icon: '💳', category: 'payment', status: 'connected', config: { serverKey: '***', clientKey: '***' } },
    { id: 'int2', name: 'WhatsApp Business', description: 'Notifikasi WhatsApp', icon: '📱', category: 'communication', status: 'disconnected' },
    { id: 'int3', name: 'SMTP Email', description: 'Email notifikasi', icon: '📧', category: 'communication', status: 'connected', config: { host: 'smtp.gmail.com', port: 587 } },
  ];
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [configData, setConfigData] = useState<any>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchIntegrations();
    }
  }, [session]);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/integrations');
      const data = await response.json();
      
      if (data.success) {
        // Transform API data to match our interface
        const transformedIntegrations = data.data.integrations.map((integration: any) => ({
          id: integration.id,
          name: integration.name || integration.provider,
          description: `${integration.provider} - ${integration.integrationType}`,
          icon: integration.integrationType === 'payment_gateway' ? '💳' : 
                 integration.integrationType === 'whatsapp' ? '📱' : 
                 integration.integrationType === 'email_smtp' ? '📧' : '🔌',
          category: integration.integrationType === 'payment_gateway' ? 'payment' : 
                    integration.integrationType === 'whatsapp' || integration.integrationType === 'email_smtp' ? 'communication' : 'other',
          status: integration.status === 'active' ? 'connected' : 
                  integration.status === 'pending' ? 'error' : 'disconnected',
          config: integration.configuration
        }));
        
        setIntegrations(transformedIntegrations);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations(MOCK_INTEGRATIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/settings/integrations/${integrationId}/toggle`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        fetchIntegrations();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling integration:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleSaveConfig = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/settings/integrations/${integrationId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Konfigurasi berhasil disimpan!');
        setShowConfig(null);
        fetchIntegrations();
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Terjadi kesalahan');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <FaCheckCircle className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <FaTimesCircle className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <FaExclamationTriangle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const integrationsByCategory = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as { [key: string]: Integration[] });

  const categoryTitles = {
    payment: 'Payment Gateway',
    communication: 'Communication',
    analytics: 'Analytics & Tracking',
    other: 'Other Integrations'
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Integrations | BEDAGANG Cloud POS</title>
      </Head>

      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FaPlug className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Integrations</h1>
                <p className="text-indigo-100">Hubungkan sistem Anda dengan layanan pihak ketiga</p>
              </div>
            </div>
          </div>

          {/* Integration Categories */}
          {Object.entries(integrationsByCategory).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {categoryTitles[category as keyof typeof categoryTitles]}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((integration) => (
                  <Card key={integration.id} className="relative">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            {integration.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                            <p className="text-sm text-gray-500">{integration.description}</p>
                          </div>
                        </div>
                        {getStatusIcon(integration.status)}
                      </div>

                      {integration.status === 'connected' && integration.config && (
                        <div className="mb-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-700">
                            Terhubung dengan {integration.config.account || 'akun'}
                          </p>
                        </div>
                      )}

                      {integration.status === 'error' && (
                        <div className="mb-4 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-700">
                            Konfigurasi diperlukan
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={integration.status === 'connected'}
                            onCheckedChange={() => handleToggle(integration.id)}
                          />
                          <span className="text-sm text-gray-600">
                            {integration.status === 'connected' ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {integration.docsUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(integration.docsUrl, '_blank')}
                              title="Documentation"
                            >
                              <FaExternalLinkAlt />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowConfig(integration.id);
                              setConfigData(integration.config || {});
                            }}
                            title="Configuration"
                          >
                            <FaCog />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {/* Webhooks Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
              <Button
                onClick={() => router.push('/settings/integrations/webhooks')}
                className="text-sm"
              >
                Manage Webhooks
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FaLink className="w-8 h-8 text-gray-400" />
                  <div>
                    <h3 className="font-medium">Webhook Management</h3>
                    <p className="text-sm text-gray-500">Kelola webhook untuk real-time notifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Modal */}
          {showConfig && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div 
                  className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                  onClick={() => setShowConfig(null)}
                />

                <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Konfigurasi {integrations.find(i => i.id === showConfig)?.name}
                  </h3>

                  <div className="space-y-4">
                    {showConfig === 'midtrans' && (
                      <>
                        <div>
                          <Label>Merchant ID</Label>
                          <Input
                            value={configData.merchantId || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, merchantId: e.target.value }))}
                            placeholder="Your Midtrans Merchant ID"
                          />
                        </div>
                        <div>
                          <Label>Client Key</Label>
                          <Input
                            value={configData.clientKey || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, clientKey: e.target.value }))}
                            placeholder="Your Midtrans Client Key"
                          />
                        </div>
                        <div>
                          <Label>Server Key</Label>
                          <Input
                            type="password"
                            value={configData.serverKey || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, serverKey: e.target.value }))}
                            placeholder="Your Midtrans Server Key"
                          />
                        </div>
                      </>
                    )}

                    {showConfig === 'whatsapp' && (
                      <>
                        <div>
                          <Label>Provider</Label>
                          <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            value={configData.provider || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, provider: e.target.value }))}
                          >
                            <option value="">Select Provider</option>
                            <option value="twilio">Twilio</option>
                            <option value="wablas">Wablas</option>
                            <option value="fonnte">Fonnte</option>
                          </select>
                        </div>
                        <div>
                          <Label>API Key</Label>
                          <Input
                            type="password"
                            value={configData.apiKey || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Your API Key"
                          />
                        </div>
                        <div>
                          <Label>Sender Number</Label>
                          <Input
                            value={configData.senderNumber || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, senderNumber: e.target.value }))}
                            placeholder="+628123456789"
                          />
                        </div>
                      </>
                    )}

                    {showConfig === 'smtp' && (
                      <>
                        <div>
                          <Label>SMTP Host</Label>
                          <Input
                            value={configData.host || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, host: e.target.value }))}
                            placeholder="smtp.gmail.com"
                          />
                        </div>
                        <div>
                          <Label>Port</Label>
                          <Input
                            type="number"
                            value={configData.port || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, port: e.target.value }))}
                            placeholder="587"
                          />
                        </div>
                        <div>
                          <Label>Username</Label>
                          <Input
                            value={configData.username || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="your-email@gmail.com"
                          />
                        </div>
                        <div>
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={configData.password || ''}
                            onChange={(e) => setConfigData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Your password or app password"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfig(null)}
                    >
                      Batal
                    </Button>
                    <Button onClick={() => handleSaveConfig(showConfig)}>
                      Simpan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default Integrations;
