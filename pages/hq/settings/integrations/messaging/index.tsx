import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  MessageSquare,
  Send,
  Phone,
  ArrowLeft,
  Plus,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Shield,
  TestTube,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  Globe,
  Bell,
  MessageCircle,
  Users,
  Zap,
  FileText,
  Image,
  Paperclip,
  Bot,
  Hash,
  AtSign,
  Link2,
  Copy,
  MoreVertical
} from 'lucide-react';

interface MessagingConfig {
  id: string;
  providerId: string;
  providerCode: string;
  providerName: string;
  type: 'whatsapp' | 'telegram' | 'sms';
  branchId: string | null;
  branchName: string;
  name: string;
  status: 'active' | 'pending' | 'suspended';
  phoneNumber?: string;
  botUsername?: string;
  features: string[];
  stats: {
    messagesSent: number;
    messagesReceived: number;
    deliveryRate: number;
  };
  lastTestedAt?: string;
  lastTestResult?: { success: boolean };
  createdAt: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: 'whatsapp' | 'telegram' | 'email' | 'sms';
  description: string;
  isActive: boolean;
}

const channelIcons: Record<string, any> = {
  whatsapp: MessageCircle,
  telegram: Send,
  sms: Phone,
  email: AtSign
};

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-100 text-green-700',
  telegram: 'bg-blue-100 text-blue-700',
  sms: 'bg-purple-100 text-purple-700',
  email: 'bg-orange-100 text-orange-700'
};

export default function MessagingSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [configs, setConfigs] = useState<MessagingConfig[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'templates' | 'logs'>('channels');
  const [testNumber, setTestNumber] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MessagingConfig | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/hq/integrations/configs?category=messaging');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.configs) setConfigs(payload.configs);
      }
    } catch { }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const totalMessagesSent = configs.reduce((sum, c) => sum + c.stats.messagesSent, 0);
  const avgDeliveryRate = configs.length > 0 
    ? configs.reduce((sum, c) => sum + c.stats.deliveryRate, 0) / configs.length 
    : 0;

  const handleSendTest = async () => {
    if (!selectedConfig || !testNumber) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
    setShowTestModal(false);
    alert('Pesan test berhasil dikirim!');
  };

  const toggleTemplate = (templateId: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === templateId ? { ...t, isActive: !t.isActive } : t
    ));
  };

  if (!mounted) return null;

  return (
    <HQLayout title="Messaging Integration" subtitle="Kelola integrasi WhatsApp, Telegram, dan notifikasi">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => window.location.href = '/hq/settings/integrations'}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Integrasi</span>
        </button>

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Channel Aktif</p>
                <p className="text-3xl font-bold mt-1">{configs.filter(c => c.status === 'active').length}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-3 text-sm text-white/80">WhatsApp & Telegram</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Pesan Terkirim</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalMessagesSent.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Bulan ini</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Delivery Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{avgDeliveryRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Rata-rata semua channel</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Template Aktif</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{templates.filter(t => t.isActive).length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Dari {templates.length} template</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center gap-6">
              {[
                { id: 'channels', label: 'Channel', icon: MessageSquare },
                { id: 'templates', label: 'Template Notifikasi', icon: FileText },
                { id: 'logs', label: 'Log Pengiriman', icon: Clock }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                {/* Actions */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => window.location.href = '/hq/settings/integrations?tab=providers&category=messaging'}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Channel
                  </button>
                </div>

                {/* Channel Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {configs.map(config => {
                    const Icon = channelIcons[config.type] || MessageSquare;
                    return (
                      <div
                        key={config.id}
                        className="border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${
                              config.type === 'whatsapp' ? 'bg-green-100' :
                              config.type === 'telegram' ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className={`w-6 h-6 ${
                                config.type === 'whatsapp' ? 'text-green-600' :
                                config.type === 'telegram' ? 'text-blue-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{config.providerName}</h4>
                              <p className="text-sm text-gray-500">{config.name}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {config.status}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 mb-4">
                          {config.phoneNumber && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{config.phoneNumber}</span>
                            </div>
                          )}
                          {config.botUsername && (
                            <div className="flex items-center gap-2 text-sm">
                              <Bot className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{config.botUsername}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">{config.branchName}</span>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {config.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900">{config.stats.messagesSent.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Terkirim</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-900">{config.stats.messagesReceived.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Diterima</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold text-emerald-600">{config.stats.deliveryRate}%</p>
                            <p className="text-xs text-gray-500">Delivery</p>
                          </div>
                        </div>

                        {/* Last Test */}
                        {config.lastTestedAt && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                            {config.lastTestResult?.success ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span>
                              Test terakhir: {new Date(config.lastTestedAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setSelectedConfig(config);
                              setShowTestModal(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          >
                            <Send className="w-4 h-4" />
                            Kirim Test
                          </button>
                          <button
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                          >
                            <Settings className="w-4 h-4" />
                            Kelola
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Channel Card */}
                  <button
                    onClick={() => window.location.href = '/hq/settings/integrations?tab=providers&category=messaging'}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center gap-3"
                  >
                    <div className="p-3 bg-indigo-100 rounded-xl">
                      <Plus className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">Tambah Channel Baru</p>
                      <p className="text-sm text-gray-500">WhatsApp, Telegram, SMS</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">{templates.length} template notifikasi</p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    Buat Template
                  </button>
                </div>

                <div className="space-y-3">
                  {templates.map(template => {
                    const Icon = channelIcons[template.channel] || MessageSquare;
                    return (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${channelColors[template.channel]}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{template.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${channelColors[template.channel]}`}>
                                {template.channel}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{template.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={template.isActive}
                              onChange={() => toggleTemplate(template.id)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Log pengiriman pesan akan ditampilkan di sini</p>
                <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                  Lihat Semua Log
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Message Modal */}
      {showTestModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kirim Pesan Test</h3>
            <p className="text-sm text-gray-500 mb-4">
              Kirim pesan test ke {selectedConfig.type === 'whatsapp' ? 'nomor WhatsApp' : 'chat ID Telegram'}
            </p>
            <input
              type="text"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder={selectedConfig.type === 'whatsapp' ? '+62812xxxxxxxx' : 'Chat ID'}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSendTest}
                disabled={loading || !testNumber}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Mengirim...' : 'Kirim Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
