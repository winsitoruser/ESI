import React, { useEffect, useState } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { Bell, Save, RefreshCw, Info, Mail, MessageCircle, Send, Slack, AlertTriangle, CheckCircle, Trash2, Plus } from 'lucide-react';

interface NotifData {
  stock: { lowStockThreshold: number; criticalStockThreshold: number; notifyByEmail: boolean; notifyByWhatsapp: boolean; notifyByTelegram: boolean };
  sales: { salesTargetAlerts: boolean; dailyReportEmail: boolean; dailyReportTime: string; reportRecipients: string[] };
  billing: { invoiceOverdue: boolean; invoiceDueReminderDays: number[]; paymentSuccess: boolean; paymentFailed: boolean };
  channels: {
    email: { enabled: boolean; fromName: string; fromAddress: string };
    whatsapp: { enabled: boolean; provider: string; phoneNumber: string };
    telegram: { enabled: boolean; botToken: string; chatId: string };
    slack: { enabled: boolean; webhookUrl: string };
  };
}

const DEFAULT: NotifData = {
  stock: { lowStockThreshold: 20, criticalStockThreshold: 5, notifyByEmail: true, notifyByWhatsapp: false, notifyByTelegram: false },
  sales: { salesTargetAlerts: true, dailyReportEmail: true, dailyReportTime: '07:00', reportRecipients: [] },
  billing: { invoiceOverdue: true, invoiceDueReminderDays: [3, 1], paymentSuccess: true, paymentFailed: true },
  channels: {
    email: { enabled: true, fromName: 'Bedagang ERP', fromAddress: '' },
    whatsapp: { enabled: false, provider: 'whatsapp_business', phoneNumber: '' },
    telegram: { enabled: false, botToken: '', chatId: '' },
    slack: { enabled: false, webhookUrl: '' }
  }
};

export default function NotificationSettingsPage() {
  const [data, setData] = useState<NotifData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    fetch('/api/hq/settings/notifications')
      .then((r) => r.json())
      .then((j) => { if (j.success && j.data) setData({ ...DEFAULT, ...j.data }); })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/hq/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await res.json();
      if (j.success) setMsg({ type: 'ok', text: 'Pengaturan notifikasi berhasil disimpan' });
      else setMsg({ type: 'err', text: j.error || 'Gagal menyimpan' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    const email = newRecipient.trim();
    if (!email) return;
    if (!data.sales.reportRecipients.includes(email)) {
      setData({ ...data, sales: { ...data.sales, reportRecipients: [...data.sales.reportRecipients, email] } });
    }
    setNewRecipient('');
  };

  const removeRecipient = (email: string) => {
    setData({ ...data, sales: { ...data.sales, reportRecipients: data.sales.reportRecipients.filter((r) => r !== email) } });
  };

  if (loading) {
    return (
      <HQLayout title="Pengaturan Notifikasi">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout title="Pengaturan Notifikasi" subtitle="Atur alert stok, target penjualan, reminder billing, dan channel pengiriman">
      <div className="max-w-6xl space-y-6">
        {msg && (
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 ${msg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span className="text-sm">{msg.text}</span>
          </div>
        )}

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><Bell className="w-5 h-5 text-blue-600" /> Alert Stok</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Threshold Stok Rendah</label>
              <input type="number" value={data.stock.lowStockThreshold} onChange={(e) => setData({ ...data, stock: { ...data.stock, lowStockThreshold: parseInt(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Threshold Stok Kritis</label>
              <input type="number" value={data.stock.criticalStockThreshold} onChange={(e) => setData({ ...data, stock: { ...data.stock, criticalStockThreshold: parseInt(e.target.value) || 0 } })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {(['notifyByEmail', 'notifyByWhatsapp', 'notifyByTelegram'] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={data.stock[k]} onChange={(e) => setData({ ...data, stock: { ...data.stock, [k]: e.target.checked } })} />
                {k === 'notifyByEmail' ? 'Email' : k === 'notifyByWhatsapp' ? 'WhatsApp' : 'Telegram'}
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><Bell className="w-5 h-5 text-green-600" /> Laporan Harian & Target</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.sales.salesTargetAlerts} onChange={(e) => setData({ ...data, sales: { ...data.sales, salesTargetAlerts: e.target.checked } })} />
              Alert bila target penjualan meleset
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.sales.dailyReportEmail} onChange={(e) => setData({ ...data, sales: { ...data.sales, dailyReportEmail: e.target.checked } })} />
              Kirim laporan harian via email
            </label>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Jam Pengiriman Laporan</label>
              <input type="time" value={data.sales.dailyReportTime} onChange={(e) => setData({ ...data, sales: { ...data.sales, dailyReportTime: e.target.value } })} className="border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Daftar Penerima Email</label>
              <div className="flex gap-2 mb-2">
                <input type="email" placeholder="email@perusahaan.com" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} className="flex-1 border rounded-lg px-3 py-2" />
                <button onClick={addRecipient} className="px-4 bg-blue-600 text-white rounded-lg flex items-center gap-1 hover:bg-blue-700">
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.sales.reportRecipients.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-xs">
                    {r}
                    <button onClick={() => removeRecipient(r)} className="hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
                {data.sales.reportRecipients.length === 0 && <span className="text-xs text-gray-400">Belum ada penerima</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><Bell className="w-5 h-5 text-purple-600" /> Notifikasi Billing & Invoice</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.billing.invoiceOverdue} onChange={(e) => setData({ ...data, billing: { ...data.billing, invoiceOverdue: e.target.checked } })} />
              Alert ketika invoice jatuh tempo / lewat bayar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.billing.paymentSuccess} onChange={(e) => setData({ ...data, billing: { ...data.billing, paymentSuccess: e.target.checked } })} />
              Notifikasi pembayaran berhasil
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={data.billing.paymentFailed} onChange={(e) => setData({ ...data, billing: { ...data.billing, paymentFailed: e.target.checked } })} />
              Notifikasi pembayaran gagal
            </label>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Hari Reminder sebelum jatuh tempo (pisahkan koma)</label>
              <input
                type="text"
                value={data.billing.invoiceDueReminderDays.join(',')}
                onChange={(e) => {
                  const days = e.target.value
                    .split(',')
                    .map((d) => parseInt(d.trim(), 10))
                    .filter((d) => !Number.isNaN(d) && d > 0);
                  setData({ ...data, billing: { ...data.billing, invoiceDueReminderDays: days } });
                }}
                placeholder="3,1"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><Bell className="w-5 h-5 text-orange-600" /> Channel Pengiriman</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Mail className="w-4 h-4 text-blue-600" /><b>Email</b></div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={data.channels.email.enabled} onChange={(e) => setData({ ...data, channels: { ...data.channels, email: { ...data.channels.email, enabled: e.target.checked } } })} /> Aktif
              </label>
              <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="From Name" value={data.channels.email.fromName} onChange={(e) => setData({ ...data, channels: { ...data.channels, email: { ...data.channels.email, fromName: e.target.value } } })} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="From Address" value={data.channels.email.fromAddress} onChange={(e) => setData({ ...data, channels: { ...data.channels, email: { ...data.channels.email, fromAddress: e.target.value } } })} />
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><MessageCircle className="w-4 h-4 text-green-600" /><b>WhatsApp</b></div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={data.channels.whatsapp.enabled} onChange={(e) => setData({ ...data, channels: { ...data.channels, whatsapp: { ...data.channels.whatsapp, enabled: e.target.checked } } })} /> Aktif
              </label>
              <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Phone Number" value={data.channels.whatsapp.phoneNumber} onChange={(e) => setData({ ...data, channels: { ...data.channels, whatsapp: { ...data.channels.whatsapp, phoneNumber: e.target.value } } })} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Provider" value={data.channels.whatsapp.provider} onChange={(e) => setData({ ...data, channels: { ...data.channels, whatsapp: { ...data.channels.whatsapp, provider: e.target.value } } })} />
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Send className="w-4 h-4 text-sky-600" /><b>Telegram</b></div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={data.channels.telegram.enabled} onChange={(e) => setData({ ...data, channels: { ...data.channels, telegram: { ...data.channels.telegram, enabled: e.target.checked } } })} /> Aktif
              </label>
              <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Bot Token" value={data.channels.telegram.botToken} onChange={(e) => setData({ ...data, channels: { ...data.channels, telegram: { ...data.channels.telegram, botToken: e.target.value } } })} />
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Chat ID" value={data.channels.telegram.chatId} onChange={(e) => setData({ ...data, channels: { ...data.channels, telegram: { ...data.channels.telegram, chatId: e.target.value } } })} />
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2"><Slack className="w-4 h-4 text-purple-600" /><b>Slack</b></div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <input type="checkbox" checked={data.channels.slack.enabled} onChange={(e) => setData({ ...data, channels: { ...data.channels, slack: { ...data.channels.slack, enabled: e.target.checked } } })} /> Aktif
              </label>
              <input className="w-full border rounded-lg px-3 py-2" placeholder="Webhook URL" value={data.channels.slack.webhookUrl} onChange={(e) => setData({ ...data, channels: { ...data.channels, slack: { ...data.channels.slack, webhookUrl: e.target.value } } })} />
            </div>
          </div>
        </section>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <p className="text-xs text-blue-700">Channel yang belum dikonfigurasi di halaman Integrasi akan menggunakan kredensial default. Untuk keamanan, simpan API keys di menu Integrasi.</p>
        </div>

        <div className="sticky bottom-4 flex justify-end">
          <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-semibold flex items-center gap-2 shadow-md">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </HQLayout>
  );
}
