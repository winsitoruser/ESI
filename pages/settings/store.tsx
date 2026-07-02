import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AuditHistory from '@/components/settings/AuditHistory';
import { 
  FaStore, FaSave, FaMapMarkerAlt, FaPhone, FaEnvelope,
  FaGlobe, FaClock, FaImage, FaBuilding, FaIdCard, FaArrowLeft,
  FaReceipt, FaPrint, FaFont, FaAlignLeft, FaAlignCenter, FaAlignRight
} from 'react-icons/fa';

const StoreSettingsPage: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [branches, setBranches] = useState([]);

  const MOCK_STORE = { name: 'Bedagang Store', address: 'Jl. Raya No. 123', city: 'Jakarta', province: 'DKI Jakarta', postalCode: '12345', phone: '021-1234567', email: 'store@bedagang.com', website: 'www.bedagang.com', taxId: '12.345.678.9-012.000', logoUrl: '', description: 'Toko retail dan F&B' };
  const [storeData, setStoreData] = useState(MOCK_STORE);

  const [receiptSettings, setReceiptSettings] = useState({
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showCashier: true,
    showTimestamp: true,
    showVAT: true,
    showThankyouMessage: true,
    showFooter: true,
    thankyouMessage: 'Terima kasih telah berbelanja di toko kami!',
    footerText: 'Barang yang sudah dibeli tidak dapat dikembalikan',
    fontSize: 12,
    headerAlignment: 'center',
    itemsAlignment: 'left',
    footerAlignment: 'center',
    paperWidth: 80,
    logoUrl: ''
  });

  const [operatingHours, setOperatingHours] = useState([
    { day: 'Senin', open: '09:00', close: '21:00', isOpen: true },
    { day: 'Selasa', open: '09:00', close: '21:00', isOpen: true },
    { day: 'Rabu', open: '09:00', close: '21:00', isOpen: true },
    { day: 'Kamis', open: '09:00', close: '21:00', isOpen: true },
    { day: 'Jumat', open: '09:00', close: '21:00', isOpen: true },
    { day: 'Sabtu', open: '09:00', close: '22:00', isOpen: true },
    { day: 'Minggu', open: '10:00', close: '20:00', isOpen: true }
  ]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session) {
      fetchStoreSettings();
      fetchBranches();
    }
  }, [session]);

  const fetchStoreSettings = async () => {
    setLoading(true);
    try {
      // Fetch store settings
      const storeResponse = await fetch('/api/settings/store');
      const storeResponseData = await storeResponse.json();

      if (storeResponseData.success && storeResponseData.data) {
        setStoreData(storeResponseData.data.store || storeData);
        if (storeResponseData.data.operatingHours) {
          setOperatingHours(storeResponseData.data.operatingHours);
        }
      }

      // Fetch receipt design settings
      const receiptResponse = await fetch('/api/settings/store/receipt-design');
      const receiptResponseData = await receiptResponse.json();

      if (receiptResponseData.success && receiptResponseData.data) {
        setReceiptSettings(receiptResponseData.data);
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
      setStoreData(MOCK_STORE);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/settings/store/branches');
      const data = await response.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreData(prev => ({ ...prev, [name]: value }));
  };

  const handleOperatingHoursChange = (index: number, field: string, value: any) => {
    const updated = [...operatingHours];
    updated[index] = { ...updated[index], [field]: value };
    setOperatingHours(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save store settings
      const storeResponse = await fetch('/api/settings/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: storeData,
          operatingHours
        })
      });

      const storeResponseData = await storeResponse.json();

      if (!storeResponseData.success) {
        alert('Gagal menyimpan pengaturan toko: ' + storeResponseData.error);
        return;
      }

      // Save receipt design settings
      const receiptResponse = await fetch('/api/settings/store/receipt-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptSettings)
      });

      const receiptResponseData = await receiptResponse.json();

      if (!receiptResponseData.success) {
        alert('Gagal menyimpan desain struk: ' + receiptResponseData.error);
        return;
      }

      alert('Pengaturan toko dan desain struk berhasil disimpan!');
    } catch (error) {
      console.error('Error saving settings:', error);
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
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-gray-700">Memuat Pengaturan Toko...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Pengaturan Toko | BEDAGANG Cloud POS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Kembali ke Settings"
            >
              <FaArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Pengaturan Toko</h1>
              <p className="text-blue-100">
                Kelola informasi toko, cabang, dan jam operasional
              </p>
            </div>
            <FaStore className="w-16 h-16 text-white/30" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaBuilding className="inline mr-2" />
                Informasi Toko
              </button>
              <button
                onClick={() => setActiveTab('hours')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'hours'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaClock className="inline mr-2" />
                Jam Operasional
              </button>
              <button
                onClick={() => setActiveTab('receipt')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'receipt'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaReceipt className="inline mr-2" />
                Desain Struk
              </button>
              <button
                onClick={() => router.push('/settings/store/branches')}
                className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
              >
                <FaStore className="inline mr-2" />
                Cabang ({branches.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informasi Dasar</CardTitle>
                    <CardDescription>Informasi umum tentang toko Anda</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nama Toko *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={storeData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nama Toko"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaPhone className="inline mr-1" /> Telepon *
                        </label>
                        <input
                          type="text"
                          name="phone"
                          value={storeData.phone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="(021) 1234-5678"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaEnvelope className="inline mr-1" /> Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={storeData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="info@toko.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaGlobe className="inline mr-1" /> Website
                        </label>
                        <input
                          type="text"
                          name="website"
                          value={storeData.website}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="www.toko.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deskripsi
                      </label>
                      <textarea
                        name="description"
                        value={storeData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Deskripsi singkat tentang toko Anda"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Address */}
                <Card>
                  <CardHeader>
                    <CardTitle><FaMapMarkerAlt className="inline mr-2" />Alamat</CardTitle>
                    <CardDescription>Lokasi fisik toko Anda</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alamat Lengkap *
                      </label>
                      <textarea
                        name="address"
                        value={storeData.address}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jl. Contoh No. 123"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kota *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={storeData.city}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Jakarta"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Provinsi *
                        </label>
                        <input
                          type="text"
                          name="province"
                          value={storeData.province}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="DKI Jakarta"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kode Pos
                        </label>
                        <input
                          type="text"
                          name="postalCode"
                          value={storeData.postalCode}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Info */}
                <Card>
                  <CardHeader>
                    <CardTitle><FaIdCard className="inline mr-2" />Informasi Pajak</CardTitle>
                    <CardDescription>NPWP dan informasi perpajakan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NPWP / Tax ID
                      </label>
                      <input
                        type="text"
                        name="taxId"
                        value={storeData.taxId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="01.234.567.8-901.000"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Format: XX.XXX.XXX.X-XXX.XXX
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'hours' && (
              <Card>
                <CardHeader>
                  <CardTitle>Jam Operasional</CardTitle>
                  <CardDescription>Atur jam buka dan tutup toko untuk setiap hari</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {operatingHours.map((day, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-24">
                          <span className="font-medium text-gray-900">{day.day}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={day.isOpen}
                            onChange={(e) => handleOperatingHoursChange(index, 'isOpen', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Buka</span>
                        </div>
                        {day.isOpen && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={day.open}
                                onChange={(e) => handleOperatingHoursChange(index, 'open', e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <span className="text-gray-600">-</span>
                              <input
                                type="time"
                                value={day.close}
                                onChange={(e) => handleOperatingHoursChange(index, 'close', e.target.value)}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </>
                        )}
                        {!day.isOpen && (
                          <span className="text-sm text-gray-500 italic">Tutup</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'receipt' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FaReceipt className="mr-2 text-blue-600" />
                      Desain Struk
                    </CardTitle>
                    <CardDescription>
                      Kustomisasi tampilan struk pembelian
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Settings Panel */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Pengaturan Umum</h4>
                        
                        <div className="space-y-3">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showLogo}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showLogo: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan Logo</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showAddress}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showAddress: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan Alamat</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showPhone}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showPhone: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan Telepon</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showEmail}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showEmail: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan Email</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showCashier}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showCashier: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan Kasir</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showTimestamp}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showTimestamp: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan Waktu</span>
                          </label>
                          
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={receiptSettings.showVAT}
                              onChange={(e) => setReceiptSettings(prev => ({ ...prev, showVAT: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm">Tampilkan PPN</span>
                          </label>
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="font-medium text-gray-900 mb-3">Alignment</h4>
                          <div className="space-y-2">
                            <div>
                              <label className="text-sm text-gray-600">Header Alignment</label>
                              <div className="flex gap-2 mt-1">
                                <Button
                                  variant={receiptSettings.headerAlignment === 'left' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setReceiptSettings(prev => ({ ...prev, headerAlignment: 'left' }))}
                                >
                                  <FaAlignLeft />
                                </Button>
                                <Button
                                  variant={receiptSettings.headerAlignment === 'center' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setReceiptSettings(prev => ({ ...prev, headerAlignment: 'center' }))}
                                >
                                  <FaAlignCenter />
                                </Button>
                                <Button
                                  variant={receiptSettings.headerAlignment === 'right' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setReceiptSettings(prev => ({ ...prev, headerAlignment: 'right' }))}
                                >
                                  <FaAlignRight />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="font-medium text-gray-900 mb-3">Ukuran Kertas</h4>
                          <select
                            value={receiptSettings.paperWidth}
                            onChange={(e) => setReceiptSettings(prev => ({ ...prev, paperWidth: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value={58}>58mm (Mini)</option>
                            <option value={80}>80mm (Standard)</option>
                          </select>
                        </div>
                      </div>

                      {/* Preview Panel */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
                        <div className="bg-gray-100 p-4 rounded-lg">
                          <div 
                            className="bg-white mx-auto shadow-sm"
                            style={{ 
                              width: receiptSettings.paperWidth === 58 ? '220px' : '300px',
                              padding: '16px',
                              fontSize: '12px',
                              fontFamily: 'monospace'
                            }}
                          >
                            {/* Logo */}
                            {receiptSettings.showLogo && (
                              <div className="text-center mb-2">
                                <div className="w-12 h-12 bg-gray-300 mx-auto rounded"></div>
                              </div>
                            )}
                            
                            {/* Store Name */}
                            <div className={`${receiptSettings.headerAlignment === 'center' ? 'text-center' : receiptSettings.headerAlignment === 'right' ? 'text-right' : 'text-left'} font-bold mb-2`}>
                              {storeData.name || 'NAMA TOKO'}
                            </div>
                            
                            {/* Store Info */}
                            {receiptSettings.showAddress && (
                              <div className={`${receiptSettings.headerAlignment === 'center' ? 'text-center' : receiptSettings.headerAlignment === 'right' ? 'text-right' : 'text-left'} text-xs mb-1`}>
                                {storeData.address || 'Alamat Toko'}
                              </div>
                            )}
                            {receiptSettings.showPhone && (
                              <div className={`${receiptSettings.headerAlignment === 'center' ? 'text-center' : receiptSettings.headerAlignment === 'right' ? 'text-right' : 'text-left'} text-xs mb-1`}>
                                Telp: {storeData.phone || '123-456-789'}
                              </div>
                            )}
                            {receiptSettings.showEmail && (
                              <div className={`${receiptSettings.headerAlignment === 'center' ? 'text-center' : receiptSettings.headerAlignment === 'right' ? 'text-right' : 'text-left'} text-xs mb-2`}>
                                {storeData.email || 'email@toko.com'}
                              </div>
                            )}
                            
                            <div className="border-t border-b border-gray-300 py-1 my-2">
                              <div className="text-xs">
                                <div className="flex justify-between">
                                  <span>No: INV-001</span>
                                  <span>01/01/2024</span>
                                </div>
                                {receiptSettings.showTimestamp && (
                                  <div className="flex justify-between">
                                    <span>Waktu:</span>
                                    <span>12:00</span>
                                  </div>
                                )}
                                {receiptSettings.showCashier && (
                                  <div className="flex justify-between">
                                    <span>Kasir:</span>
                                    <span>Admin</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Sample Items */}
                            <div className="text-xs space-y-1 mb-2">
                              <div>Produk A x1 10.000</div>
                              <div>Produk B x2 20.000</div>
                            </div>
                            
                            <div className="border-t border-gray-300 pt-1">
                              <div className="text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>30.000</span>
                                </div>
                                {receiptSettings.showVAT && (
                                  <div className="flex justify-between">
                                    <span>PPN 11%:</span>
                                    <span>3.300</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold">
                                  <span>Total:</span>
                                  <span>33.300</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Footer */}
                            {receiptSettings.showThankyouMessage && (
                              <div className={`${receiptSettings.headerAlignment === 'center' ? 'text-center' : receiptSettings.headerAlignment === 'right' ? 'text-right' : 'text-left'} text-xs mt-2`}>
                                {receiptSettings.thankyouMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button className="w-full">
                        <FaPrint className="mr-2" />
                        Test Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Audit History - Show on all tabs */}
            <AuditHistory entityType="Store" />
          </div>
        </div>

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
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
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

export default StoreSettingsPage;
