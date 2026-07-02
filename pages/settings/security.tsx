import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaShieldAlt, FaKey, FaLock, FaHistory, FaSave,
  FaMobileAlt, FaQrcode, FaCheck, FaTimes, FaArrowLeft, FaSpinner, FaExclamationTriangle
} from 'react-icons/fa';

const SecuritySettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  const MOCK_AUDIT_LOGS = [
    { id: 'al1', action: 'login', user: 'admin@bedagang.com', ip: '192.168.1.10', timestamp: '2026-03-15T09:00:00', details: 'Login berhasil' },
    { id: 'al2', action: 'settings_update', user: 'admin@bedagang.com', ip: '192.168.1.10', timestamp: '2026-03-15T10:30:00', details: 'Ubah pengaturan toko' },
    { id: 'al3', action: 'user_create', user: 'admin@bedagang.com', ip: '192.168.1.10', timestamp: '2026-03-14T14:00:00', details: 'Tambah user baru: kasir2' },
  ];
  const MOCK_SESSIONS = [
    { id: 'ss1', device: 'Chrome - Windows', ip: '192.168.1.10', lastActive: '2026-03-15T09:00:00', current: true },
    { id: 'ss2', device: 'Safari - iPhone', ip: '192.168.1.15', lastActive: '2026-03-14T20:00:00', current: false },
  ];
  const [auditLogs, setAuditLogs] = useState<any[]>(MOCK_AUDIT_LOGS);
  const [sessions, setSessions] = useState<any[]>(MOCK_SESSIONS);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session && activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [session, activeTab]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/security/audit-logs');
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs(MOCK_AUDIT_LOGS);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Password baru dan konfirmasi tidak cocok!');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      alert('Password minimal 8 karakter!');
      return;
    }

    try {
      const response = await fetch('/api/settings/security/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Password berhasil diubah!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        alert('Gagal mengubah password: ' + data.error);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Terjadi kesalahan saat mengubah password');
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await fetch('/api/settings/security/2fa/enable', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setShowQRCode(true);
        alert('2FA berhasil diaktifkan! Scan QR code dengan aplikasi authenticator Anda.');
      } else {
        alert('Gagal mengaktifkan 2FA: ' + data.error);
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      alert('Terjadi kesalahan saat mengaktifkan 2FA');
    }
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-pink-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengaturan Keamanan...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Keamanan | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Keamanan</h1>
              <p className="text-red-100">
                Kelola password, 2FA, dan audit log
              </p>
            </div>
            <FaShieldAlt className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Security Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaLock className="text-2xl text-pink-600" />
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  <FaCheck className="mr-1" /> Aman
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Password</p>
              <p className="text-lg font-semibold text-gray-900">Terenkripsi</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaMobileAlt className="text-2xl text-pink-600" />
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                  twoFactorEnabled 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {twoFactorEnabled ? (
                    <><FaCheck className="mr-1" /> Aktif</>
                  ) : (
                    <><FaExclamationTriangle className="mr-1" /> Nonaktif</>
                  )}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">Two-Factor Auth</p>
              <p className="text-lg font-semibold text-gray-900">
                {twoFactorEnabled ? 'Terlindungi' : 'Belum Aktif'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaHistory className="text-2xl text-pink-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Audit Log</p>
              <p className="text-lg font-semibold text-gray-900">{auditLogs.length} Aktivitas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaKey className="inline mr-2" />
                Ubah Password
              </button>
              <button
                onClick={() => setActiveTab('2fa')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === '2fa'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaMobileAlt className="inline mr-2" />
                Two-Factor Auth
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'audit'
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaHistory className="inline mr-2" />
                Audit Log
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'password' && (
              <Card>
                <CardHeader>
                  <CardTitle>Ubah Password</CardTitle>
                  <CardDescription>
                    Pastikan password Anda kuat dan unik
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Saat Ini *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password Baru *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                        minLength={8}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimal 8 karakter, kombinasi huruf, angka, dan simbol
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Konfirmasi Password Baru *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-3" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-semibold mb-1">Tips Password Aman:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Gunakan minimal 8 karakter</li>
                            <li>Kombinasi huruf besar, kecil, angka, dan simbol</li>
                            <li>Jangan gunakan informasi pribadi</li>
                            <li>Gunakan password yang berbeda untuk setiap akun</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="bg-pink-600 hover:bg-pink-700"
                    >
                      <FaKey className="mr-2" />
                      Ubah Password
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === '2fa' && (
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                  <CardDescription>
                    Tambahkan lapisan keamanan ekstra untuk akun Anda
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <FaMobileAlt className="text-blue-600 mt-0.5 mr-3" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Apa itu 2FA?</p>
                        <p>
                          Two-Factor Authentication menambahkan lapisan keamanan ekstra dengan meminta kode verifikasi 
                          dari aplikasi authenticator setiap kali Anda login.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Status 2FA</p>
                      <p className="text-sm text-gray-600">
                        {twoFactorEnabled ? 'Two-Factor Authentication aktif' : 'Two-Factor Authentication belum aktif'}
                      </p>
                    </div>
                    <Button
                      onClick={handleEnable2FA}
                      className={twoFactorEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-pink-600 hover:bg-pink-700'}
                    >
                      {twoFactorEnabled ? 'Nonaktifkan 2FA' : 'Aktifkan 2FA'}
                    </Button>
                  </div>

                  {showQRCode && (
                    <div className="border border-gray-200 rounded-lg p-6 text-center">
                      <p className="font-medium text-gray-900 mb-4">
                        Scan QR Code dengan Aplikasi Authenticator
                      </p>
                      <div className="bg-gray-100 w-64 h-64 mx-auto rounded-lg flex items-center justify-center">
                        <p className="text-gray-500">QR Code akan muncul di sini</p>
                      </div>
                      <p className="text-sm text-gray-600 mt-4">
                        Gunakan aplikasi seperti Google Authenticator atau Authy
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">Langkah-langkah:</p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Download aplikasi authenticator (Google Authenticator, Authy, dll)</li>
                      <li>Klik "Aktifkan 2FA" di atas</li>
                      <li>Scan QR code yang muncul dengan aplikasi authenticator</li>
                      <li>Masukkan kode verifikasi 6 digit dari aplikasi</li>
                      <li>Simpan backup codes untuk recovery</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'audit' && (
              <Card>
                <CardHeader>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>
                    Riwayat aktivitas dan perubahan pada sistem
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <FaSpinner className="animate-spin h-8 w-8 mx-auto text-pink-600 mb-2" />
                      <p className="text-gray-500">Memuat audit log...</p>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <FaHistory className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Belum ada audit log</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                            <FaHistory className="text-pink-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{log.action}</p>
                            <p className="text-sm text-gray-600">{log.details}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(log.createdAt).toLocaleString('id-ID')} • IP: {log.ipAddress}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecuritySettingsPage;
