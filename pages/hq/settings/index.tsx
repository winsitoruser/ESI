import React, { useState, useEffect } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import {
  Settings,
  Save,
  RefreshCw,
  Building2,
  Percent,
  DollarSign,
  FileText,
  Shield,
  Bell,
  Globe,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Info
} from 'lucide-react';

interface TaxSettings {
  ppn: {
    enabled: boolean;
    rate: number;
    includeInPrice: boolean;
    applyToAllBranches: boolean;
  };
  serviceCharge: {
    enabled: boolean;
    rate: number;
    applyToAllBranches: boolean;
    excludedBranchTypes: string[];
  };
  pb1: {
    enabled: boolean;
    rate: number;
    applyToAllBranches: boolean;
  };
  rounding: {
    enabled: boolean;
    method: 'nearest' | 'up' | 'down';
    precision: number;
  };
}

interface GlobalSettings {
  taxes: TaxSettings;
  currency: {
    code: string;
    symbol: string;
    decimalPlaces: number;
    thousandSeparator: string;
    decimalSeparator: string;
  };
  business: {
    name: string;
    legalName: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
  };
  operations: {
    defaultOpeningHour: string;
    defaultClosingHour: string;
    requireShiftClose: boolean;
    autoCloseShiftAt: string;
    allowNegativeStock: boolean;
    requireStockOpnameApproval: boolean;
  };
  notifications: {
    lowStockThreshold: number;
    criticalStockThreshold: number;
    salesTargetAlerts: boolean;
    dailyReportEmail: boolean;
    reportRecipients: string[];
  };
}

export default function HQGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>({
    taxes: {
      ppn: { enabled: true, rate: 12, includeInPrice: false, applyToAllBranches: true },
      serviceCharge: { enabled: true, rate: 10, applyToAllBranches: true, excludedBranchTypes: ['kiosk'] },
      pb1: { enabled: true, rate: 10, applyToAllBranches: true },
      rounding: { enabled: true, method: 'nearest', precision: 100 }
    },
    currency: {
      code: 'IDR',
      symbol: 'Rp',
      decimalPlaces: 0,
      thousandSeparator: '.',
      decimalSeparator: ','
    },
    business: {
      name: 'Bedagang Restaurant Group',
      legalName: 'PT Bedagang Indonesia',
      taxId: '01.234.567.8-901.000',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      phone: '021-1234567',
      email: 'admin@bedagang.com'
    },
    operations: {
      defaultOpeningHour: '08:00',
      defaultClosingHour: '22:00',
      requireShiftClose: true,
      autoCloseShiftAt: '23:59',
      allowNegativeStock: false,
      requireStockOpnameApproval: true
    },
    notifications: {
      lowStockThreshold: 20,
      criticalStockThreshold: 5,
      salesTargetAlerts: true,
      dailyReportEmail: true,
      reportRecipients: ['manager@bedagang.com', 'finance@bedagang.com']
    }
  });

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'taxes' | 'business' | 'operations' | 'notifications'>('taxes');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hq/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  if (!mounted) {
    return null;
  }

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const response = await fetch('/api/hq/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSaveStatus('success');
        setHasChanges(false);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const updateTaxSetting = (
    taxType: keyof TaxSettings,
    field: string,
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      taxes: {
        ...prev.taxes,
        [taxType]: {
          ...(prev.taxes[taxType] as any),
          [field]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const tabs = [
    { id: 'taxes', label: 'Pajak & Biaya', icon: Percent },
    { id: 'business', label: 'Info Bisnis', icon: Building2 },
    { id: 'operations', label: 'Operasional', icon: Settings },
    { id: 'notifications', label: 'Notifikasi', icon: Bell }
  ];

  return (
    <HQLayout>
      <div className="space-y-6">
        {/* Quick-link Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a href="/hq/settings/taxes" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100"><Percent className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Pajak & Biaya</p>
              <p className="text-xs text-gray-500">PPN, Service, PB1</p>
            </div>
          </a>
          <a href="/hq/settings/notifications" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100"><Bell className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
              <p className="text-xs text-gray-500">Alert, Email, WA</p>
            </div>
          </a>
          <a href="/hq/settings/integrations" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100"><Shield className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Integrasi</p>
              <p className="text-xs text-gray-500">Payment GW, WA, Email</p>
            </div>
          </a>
          <a href="/hq/billing-info" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100"><FileText className="w-5 h-5" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Billing & Langganan</p>
              <p className="text-xs text-gray-500">Invoice & Plan</p>
            </div>
          </a>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
              <p className="text-sm text-gray-500">Konfigurasi yang berlaku untuk seluruh cabang</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                <AlertTriangle className="w-4 h-4" />
                Ada perubahan belum disimpan
              </span>
            )}
            {saveStatus === 'success' && (
              <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                Tersimpan
              </span>
            )}
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={saveSettings}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${
                    activeTab === tab.id ? 'rotate-90' : ''
                  }`} />
                </button>
              ))}
            </nav>

            {/* Info Panel */}
            <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Pengaturan Global</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Perubahan di sini akan otomatis diterapkan ke semua cabang kecuali ada pengaturan khusus di level cabang.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'taxes' && (
              <div className="space-y-6">
                {/* PPN Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Percent className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">PPN (Pajak Pertambahan Nilai)</h3>
                        <p className="text-sm text-gray-500">Pajak yang dikenakan pada setiap transaksi penjualan</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.taxes.ppn.enabled}
                        onChange={(e) => updateTaxSetting('ppn', 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {settings.taxes.ppn.enabled && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tarif PPN (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.taxes.ppn.rate}
                            onChange={(e) => updateTaxSetting('ppn', 'rate', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.taxes.ppn.includeInPrice}
                            onChange={(e) => updateTaxSetting('ppn', 'includeInPrice', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">PPN sudah termasuk dalam harga</span>
                        </label>
                      </div>

                      <div className="col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.taxes.ppn.applyToAllBranches}
                            onChange={(e) => updateTaxSetting('ppn', 'applyToAllBranches', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            {settings.taxes.ppn.applyToAllBranches ? (
                              <Lock className="w-4 h-4 text-orange-500" />
                            ) : (
                              <Unlock className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm text-gray-700">
                              Kunci pengaturan ini untuk semua cabang (cabang tidak bisa mengubah)
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Service Charge Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Service Charge</h3>
                        <p className="text-sm text-gray-500">Biaya layanan untuk dine-in</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.taxes.serviceCharge.enabled}
                        onChange={(e) => updateTaxSetting('serviceCharge', 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {settings.taxes.serviceCharge.enabled && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tarif Service Charge (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.taxes.serviceCharge.rate}
                            onChange={(e) => updateTaxSetting('serviceCharge', 'rate', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kecualikan Tipe Cabang
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['kiosk', 'warehouse'].map((type) => (
                            <label key={type} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.taxes.serviceCharge.excludedBranchTypes.includes(type)}
                                onChange={(e) => {
                                  const excluded = settings.taxes.serviceCharge.excludedBranchTypes;
                                  if (e.target.checked) {
                                    updateTaxSetting('serviceCharge', 'excludedBranchTypes', [...excluded, type]);
                                  } else {
                                    updateTaxSetting('serviceCharge', 'excludedBranchTypes', excluded.filter(t => t !== type));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                              />
                              <span className="text-sm capitalize">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PB1 Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">PB1 (Pajak Restoran)</h3>
                        <p className="text-sm text-gray-500">Pajak daerah untuk usaha restoran</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.taxes.pb1.enabled}
                        onChange={(e) => updateTaxSetting('pb1', 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {settings.taxes.pb1.enabled && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tarif PB1 (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.taxes.pb1.rate}
                            onChange={(e) => updateTaxSetting('pb1', 'rate', parseFloat(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Catatan:</strong> Tarif PB1 dapat berbeda per daerah. Pastikan sesuai dengan peraturan daerah masing-masing cabang.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rounding Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Settings className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Pembulatan Harga</h3>
                        <p className="text-sm text-gray-500">Pengaturan pembulatan total transaksi</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.taxes.rounding.enabled}
                        onChange={(e) => updateTaxSetting('rounding', 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {settings.taxes.rounding.enabled && (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Metode Pembulatan
                        </label>
                        <select
                          value={settings.taxes.rounding.method}
                          onChange={(e) => updateTaxSetting('rounding', 'method', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="nearest">Ke Terdekat</option>
                          <option value="up">Ke Atas</option>
                          <option value="down">Ke Bawah</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Presisi (kelipatan)
                        </label>
                        <select
                          value={settings.taxes.rounding.precision}
                          onChange={(e) => updateTaxSetting('rounding', 'precision', parseInt(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="1">Rp 1</option>
                          <option value="10">Rp 10</option>
                          <option value="50">Rp 50</option>
                          <option value="100">Rp 100</option>
                          <option value="500">Rp 500</option>
                          <option value="1000">Rp 1.000</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tax Summary Preview */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4">Preview Perhitungan Pajak</h3>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>Rp 100.000</span>
                      </div>
                      {settings.taxes.serviceCharge.enabled && (
                        <div className="flex justify-between text-gray-300">
                          <span>Service Charge ({settings.taxes.serviceCharge.rate}%)</span>
                          <span>Rp {(100000 * settings.taxes.serviceCharge.rate / 100).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {settings.taxes.pb1.enabled && (
                        <div className="flex justify-between text-gray-300">
                          <span>PB1 ({settings.taxes.pb1.rate}%)</span>
                          <span>Rp {(100000 * settings.taxes.pb1.rate / 100).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {settings.taxes.ppn.enabled && !settings.taxes.ppn.includeInPrice && (
                        <div className="flex justify-between text-gray-300">
                          <span>PPN ({settings.taxes.ppn.rate}%)</span>
                          <span>Rp {(100000 * settings.taxes.ppn.rate / 100).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="border-t border-white/20 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Informasi Bisnis</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Bisnis</label>
                    <input
                      type="text"
                      value={settings.business.name}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, business: { ...prev.business, name: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Legal</label>
                    <input
                      type="text"
                      value={settings.business.legalName}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, business: { ...prev.business, legalName: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">NPWP</label>
                    <input
                      type="text"
                      value={settings.business.taxId}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, business: { ...prev.business, taxId: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
                    <input
                      type="text"
                      value={settings.business.phone}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, business: { ...prev.business, phone: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                    <textarea
                      value={settings.business.address}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, business: { ...prev.business, address: e.target.value } }));
                        setHasChanges(true);
                      }}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={settings.business.email}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, business: { ...prev.business, email: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Pengaturan Operasional</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jam Buka Default</label>
                    <input
                      type="time"
                      value={settings.operations.defaultOpeningHour}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, operations: { ...prev.operations, defaultOpeningHour: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jam Tutup Default</label>
                    <input
                      type="time"
                      value={settings.operations.defaultClosingHour}
                      onChange={(e) => {
                        setSettings(prev => ({ ...prev, operations: { ...prev.operations, defaultClosingHour: e.target.value } }));
                        setHasChanges(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.operations.requireShiftClose}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, operations: { ...prev.operations, requireShiftClose: e.target.checked } }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Wajibkan penutupan shift sebelum tutup toko</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.operations.allowNegativeStock}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, operations: { ...prev.operations, allowNegativeStock: e.target.checked } }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Izinkan stok negatif (penjualan melebihi stok)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.operations.requireStockOpnameApproval}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, operations: { ...prev.operations, requireStockOpnameApproval: e.target.checked } }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Stock opname memerlukan approval dari Pusat</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Pengaturan Notifikasi</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Threshold Stok Rendah</label>
                      <input
                        type="number"
                        value={settings.notifications.lowStockThreshold}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, lowStockThreshold: parseInt(e.target.value) } }));
                          setHasChanges(true);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Threshold Stok Kritis</label>
                      <input
                        type="number"
                        value={settings.notifications.criticalStockThreshold}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, criticalStockThreshold: parseInt(e.target.value) } }));
                          setHasChanges(true);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.salesTargetAlerts}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, salesTargetAlerts: e.target.checked } }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Aktifkan alert target penjualan</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.dailyReportEmail}
                        onChange={(e) => {
                          setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, dailyReportEmail: e.target.checked } }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Kirim laporan harian via email</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );

  function calculateTotal(): number {
    let total = 100000;
    if (settings.taxes.serviceCharge.enabled) {
      total += 100000 * settings.taxes.serviceCharge.rate / 100;
    }
    if (settings.taxes.pb1.enabled) {
      total += 100000 * settings.taxes.pb1.rate / 100;
    }
    if (settings.taxes.ppn.enabled && !settings.taxes.ppn.includeInPrice) {
      total += 100000 * settings.taxes.ppn.rate / 100;
    }
    return total;
  }
}
