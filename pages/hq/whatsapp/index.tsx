import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  MessageCircle, Send, Users, Bell, FileText, Settings,
  CheckCircle, Circle, ArrowRight, Smartphone, Shield, Zap,
  BarChart3, Clock, RefreshCw
} from 'lucide-react';

interface WAData {
  isConnected: boolean;
  phoneNumber: string | null;
  businessName: string | null;
  stats: { messagesSent: number; messagesReceived: number; broadcastsSent: number; autoReplies: number; activeTemplates: number };
  templates: { id: string; name: string; type: string; status: string; language: string }[];
  setupSteps: { step: number; title: string; completed: boolean }[];
}

function WhatsAppDashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WAData | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/whatsapp');
      if (!res.ok) { console.error('WhatsApp fetch failed:', res.status); setLoading(false); return; }
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch { /* fallback */ } finally { setLoading(false); }
  };

  if (!mounted) return null;

  return (
    <HQLayout title="WhatsApp Business" subtitle="Kelola komunikasi bisnis melalui WhatsApp">
      <div className="space-y-6">
        {/* Connection Status */}
        <div className={`rounded-xl p-6 border-2 ${data?.isConnected ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${data?.isConnected ? 'bg-green-500' : 'bg-amber-500'}`}>
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">
                {data?.isConnected ? 'WhatsApp Business Terhubung' : 'WhatsApp Business Belum Terhubung'}
              </h2>
              <p className="text-sm text-gray-600">
                {data?.isConnected
                  ? `${data.phoneNumber} — ${data.businessName}`
                  : 'Hubungkan akun WhatsApp Business API untuk mulai mengirim notifikasi otomatis'
                }
              </p>
            </div>
            <button className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white ${data?.isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
              {data?.isConnected ? 'Pengaturan' : 'Hubungkan Sekarang'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Pesan Terkirim', value: data?.stats.messagesSent || 0, icon: Send, color: 'text-blue-600 bg-blue-100' },
            { label: 'Pesan Masuk', value: data?.stats.messagesReceived || 0, icon: MessageCircle, color: 'text-green-600 bg-green-100' },
            { label: 'Broadcast', value: data?.stats.broadcastsSent || 0, icon: Users, color: 'text-purple-600 bg-purple-100' },
            { label: 'Auto Reply', value: data?.stats.autoReplies || 0, icon: Zap, color: 'text-amber-600 bg-amber-100' },
            { label: 'Template Aktif', value: data?.stats.activeTemplates || 0, icon: FileText, color: 'text-indigo-600 bg-indigo-100' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Setup Steps */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" /> Langkah Setup
            </h3>
            <div className="space-y-3">
              {data?.setupSteps.map((step) => (
                <div key={step.step} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  {step.completed
                    ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  }
                  <span className={`text-sm ${step.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                    {step.step}. {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Template Pesan
            </h3>
            <div className="space-y-3">
              {data?.templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                    <p className="text-xs text-gray-500">{tpl.type}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tpl.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tpl.status === 'approved' ? 'Aktif' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-4">Fitur WhatsApp Business Integration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Bell, title: 'Notifikasi Order', desc: 'Kirim konfirmasi pesanan otomatis' },
              { icon: Users, title: 'Broadcast Promo', desc: 'Kirim promo ke semua pelanggan' },
              { icon: Zap, title: 'Auto-Reply', desc: 'Balas pesan pelanggan otomatis' },
              { icon: Smartphone, title: 'Katalog WA', desc: 'Tampilkan produk di WhatsApp' },
            ].map((f, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-4">
                <f.icon className="w-6 h-6 mb-2" />
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-green-100">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}

export default function WhatsAppDashboard() {
  return (
    <ModuleGuard moduleCode="whatsapp_business">
      <WhatsAppDashboardContent />
    </ModuleGuard>
  );
}
