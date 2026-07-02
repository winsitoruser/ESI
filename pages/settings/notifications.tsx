import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaBell, FaEnvelope, FaSms, FaMobileAlt, FaSave, FaSpinner,
  FaCheck, FaTimes, FaArrowLeft
} from 'react-icons/fa';

const NotificationsSettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emailSettings, setEmailSettings] = useState({
    newOrder: true,
    lowStock: true,
    dailyReport: false,
    weeklyReport: true,
    customerRegistration: true,
    paymentReceived: true
  });

  const [smsSettings, setSmsSettings] = useState({
    newOrder: false,
    lowStock: true,
    orderReady: false,
    paymentReminder: false
  });

  const [pushSettings, setPushSettings] = useState({
    newOrder: true,
    lowStock: true,
    systemAlert: true,
    updates: false
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: ''
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/notifications');
      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.email) setEmailSettings(data.data.email);
        if (data.data.sms) setSmsSettings(data.data.sms);
        if (data.data.push) setPushSettings(data.data.push);
        if (data.data.emailConfig) setEmailConfig(data.data.emailConfig);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailSettings,
          sms: smsSettings,
          push: pushSettings,
          emailConfig: emailConfig
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Pengaturan notifikasi berhasil disimpan!');
      } else {
        alert('Gagal menyimpan pengaturan: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-yellow-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengaturan Notifikasi...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Pengaturan Notifikasi | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Pengaturan Notifikasi</h1>
              <p className="text-yellow-100">
                Kelola notifikasi email, SMS, dan push
              </p>
            </div>
            <FaBell className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaEnvelope className="text-2xl text-yellow-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Email Notifications</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(emailSettings).filter(v => v).length} Aktif
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaSms className="text-2xl text-yellow-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">SMS Notifications</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(smsSettings).filter(v => v).length} Aktif
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaMobileAlt className="text-2xl text-yellow-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Push Notifications</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(pushSettings).filter(v => v).length} Aktif
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FaEnvelope className="mr-2 text-yellow-600" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Pilih event yang akan mengirim notifikasi email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'newOrder', label: 'Pesanan Baru', desc: 'Notifikasi saat ada pesanan baru' },
              { key: 'lowStock', label: 'Stok Menipis', desc: 'Notifikasi saat stok produk menipis' },
              { key: 'dailyReport', label: 'Laporan Harian', desc: 'Ringkasan penjualan harian' },
              { key: 'weeklyReport', label: 'Laporan Mingguan', desc: 'Ringkasan penjualan mingguan' },
              { key: 'customerRegistration', label: 'Registrasi Customer', desc: 'Notifikasi saat customer baru mendaftar' },
              { key: 'paymentReceived', label: 'Pembayaran Diterima', desc: 'Notifikasi saat pembayaran diterima' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailSettings[item.key as keyof typeof emailSettings]}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SMS Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FaSms className="mr-2 text-yellow-600" />
              SMS Notifications
            </CardTitle>
            <CardDescription>
              Pilih event yang akan mengirim notifikasi SMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'newOrder', label: 'Pesanan Baru', desc: 'SMS saat ada pesanan baru' },
              { key: 'lowStock', label: 'Stok Menipis', desc: 'SMS saat stok produk menipis' },
              { key: 'orderReady', label: 'Pesanan Siap', desc: 'SMS ke customer saat pesanan siap' },
              { key: 'paymentReminder', label: 'Reminder Pembayaran', desc: 'SMS reminder pembayaran' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsSettings[item.key as keyof typeof smsSettings]}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FaMobileAlt className="mr-2 text-yellow-600" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Pilih event yang akan mengirim push notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'newOrder', label: 'Pesanan Baru', desc: 'Push notification saat ada pesanan baru' },
              { key: 'lowStock', label: 'Stok Menipis', desc: 'Push notification saat stok menipis' },
              { key: 'systemAlert', label: 'System Alert', desc: 'Push notification untuk alert sistem' },
              { key: 'updates', label: 'Updates', desc: 'Push notification untuk update aplikasi' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushSettings[item.key as keyof typeof pushSettings]}
                    onChange={(e) => setPushSettings(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Konfigurasi Email (SMTP)</CardTitle>
            <CardDescription>
              Pengaturan server email untuk mengirim notifikasi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={emailConfig.smtpHost}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="text"
                  value={emailConfig.smtpPort}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPort: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={emailConfig.smtpUser}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={emailConfig.smtpPassword}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={emailConfig.fromEmail}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="noreply@yourdomain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={emailConfig.fromName}
                  onChange={(e) => setEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="BEDAGANG POS"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Catatan:</strong> Untuk Gmail, Anda perlu mengaktifkan "Less secure app access" 
                atau menggunakan App Password jika menggunakan 2FA.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/settings')}
          >
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                Simpan Pengaturan
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsSettingsPage;
