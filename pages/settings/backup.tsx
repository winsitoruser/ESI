import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FaDatabase, FaDownload, FaUpload, FaClock, FaCheck,
  FaSpinner, FaTrash, FaExclamationTriangle, FaFileArchive, FaArrowLeft
} from 'react-icons/fa';

const BackupSettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const MOCK_BACKUPS = [
    { id: 'bk1', filename: 'backup-20260315-full.sql.gz', type: 'full', size: '125 MB', createdAt: '2026-03-15T02:00:00', description: 'Auto backup harian', status: 'completed' },
    { id: 'bk2', filename: 'backup-20260314-full.sql.gz', type: 'full', size: '124 MB', createdAt: '2026-03-14T02:00:00', description: 'Auto backup harian', status: 'completed' },
    { id: 'bk3', filename: 'backup-20260313-manual.sql.gz', type: 'full', size: '123 MB', createdAt: '2026-03-13T10:30:00', description: 'Manual backup', status: 'completed' },
  ];
  const [backups, setBackups] = useState<any[]>(MOCK_BACKUPS);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchBackups();
    }
  }, [session]);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/backup/list');
      const data = await response.json();

      if (data.success) {
        setBackups(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      setBackups(MOCK_BACKUPS);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!confirm('Apakah Anda yakin ingin membuat backup? Proses ini mungkin memakan waktu beberapa menit.')) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/settings/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'full',
          description: 'Manual backup'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Backup berhasil dibuat!');
        fetchBackups();
      } else {
        alert('Gagal membuat backup: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Terjadi kesalahan saat membuat backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId: string, filename: string) => {
    try {
      window.open(`/api/settings/backup/download/${backupId}`, '_blank');
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Terjadi kesalahan saat mendownload backup');
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('PERINGATAN: Restore akan menimpa semua data yang ada. Apakah Anda yakin ingin melanjutkan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/backup/restore/${backupId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        alert('Backup berhasil di-restore! Halaman akan di-refresh.');
        window.location.reload();
      } else {
        alert('Gagal restore backup: ' + data.error);
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Terjadi kesalahan saat restore backup');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus backup ini?')) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/backup/${backupId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Backup berhasil dihapus!');
        fetchBackups();
      } else {
        alert('Gagal menghapus backup: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Terjadi kesalahan saat menghapus backup');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-teal-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Backup...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Backup & Restore | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Backup & Restore</h1>
              <p className="text-purple-100">
                Kelola backup data dan restore sistem
              </p>
            </div>
            <FaDatabase className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaFileArchive className="text-2xl text-teal-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Backup</p>
              <p className="text-2xl font-bold text-gray-900">{backups.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaClock className="text-2xl text-teal-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Backup Terakhir</p>
              <p className="text-sm font-semibold text-gray-900">
                {backups.length > 0 
                  ? new Date(backups[0].createdAt).toLocaleDateString('id-ID')
                  : 'Belum ada'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaDatabase className="text-2xl text-teal-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Size</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatFileSize(backups.reduce((sum, b) => sum + (b.fileSize || 0), 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FaCheck className="text-2xl text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="text-sm font-semibold text-green-600">Aktif</p>
            </CardContent>
          </Card>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex">
            <FaExclamationTriangle className="text-yellow-600 text-xl mt-0.5 mr-4 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Penting!</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Backup mencakup semua data: produk, transaksi, pelanggan, dan pengaturan</li>
                <li>• Proses backup mungkin memakan waktu beberapa menit tergantung ukuran data</li>
                <li>• Restore akan menimpa semua data yang ada dengan data dari backup</li>
                <li>• Simpan file backup di tempat yang aman dan terpisah dari server</li>
                <li>• Lakukan backup secara berkala untuk melindungi data Anda</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Buat Backup Baru</CardTitle>
            <CardDescription>
              Backup semua data sistem ke file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Backup akan mencakup semua tabel database dan file penting
                </p>
                <p className="text-xs text-gray-500">
                  Estimasi waktu: 2-5 menit
                </p>
              </div>
              <Button
                onClick={handleCreateBackup}
                disabled={creating}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {creating ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Membuat Backup...
                  </>
                ) : (
                  <>
                    <FaDatabase className="mr-2" />
                    Buat Backup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backup List */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Backup</CardTitle>
            <CardDescription>
              Riwayat backup yang tersedia
            </CardDescription>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-12">
                <FaDatabase className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">Belum ada backup</p>
                <p className="text-sm text-gray-400">
                  Klik "Buat Backup" untuk membuat backup pertama Anda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center">
                        <FaFileArchive className="text-teal-600 text-xl" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{backup.filename}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>{formatFileSize(backup.fileSize || 0)}</span>
                          <span>•</span>
                          <span>{new Date(backup.createdAt).toLocaleString('id-ID')}</span>
                          <span>•</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            backup.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : backup.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {backup.status === 'completed' ? 'Selesai' : 
                             backup.status === 'failed' ? 'Gagal' : 'Proses'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                        title="Download"
                      >
                        <FaDownload />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreBackup(backup.id)}
                        title="Restore"
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <FaUpload />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBackup(backup.id)}
                        title="Hapus"
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Backup */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Otomatis</CardTitle>
            <CardDescription>
              Jadwalkan backup otomatis secara berkala
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Backup Harian</p>
                  <p className="text-sm text-gray-600">Setiap hari pukul 02:00 WIB</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Backup Mingguan</p>
                  <p className="text-sm text-gray-600">Setiap Minggu pukul 03:00 WIB</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Backup otomatis akan disimpan selama 30 hari, setelah itu akan dihapus otomatis.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BackupSettingsPage;
