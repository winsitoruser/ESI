import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  CreditCard,
  QrCode,
  Wallet,
  Building,
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
  Percent,
  DollarSign,
  TestTube,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Building2,
  Store,
  Globe,
  ArrowLeft,
  Search,
  Filter,
  MoreVertical,
  Link2,
  Unlink,
  FileText,
  Download,
  Upload,
  History,
  TrendingUp,
  Zap
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: 'qris' | 'va' | 'ewallet' | 'card' | 'retail';
  icon: string;
  enabled: boolean;
  fee: { type: 'percentage' | 'fixed'; value: number };
}

interface PaymentConfig {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo?: string;
  branchId: string | null;
  branchName: string;
  name: string;
  environment: 'sandbox' | 'production';
  merchantId?: string;
  merchantName?: string;
  status: 'active' | 'pending' | 'suspended';
  isDefault: boolean;
  paymentMethods: PaymentMethod[];
  totalTransactions?: number;
  totalVolume?: number;
  lastTestedAt?: string;
  lastTestResult?: { success: boolean; message?: string };
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  hasPaymentConfig: boolean;
}

const paymentTypeIcons: Record<string, any> = {
  qris: QrCode,
  ewallet: Wallet,
  va: Building,
  card: CreditCard,
  retail: Store
};

const formatCurrency = (value: number) => {
  if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}M`;
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(0)}Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

export default function PaymentGatewaySettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<PaymentConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'configs' | 'branches' | 'history'>('configs');
  const [filterEnvironment, setFilterEnvironment] = useState<'all' | 'production' | 'sandbox'>('all');

  const fetchData = async () => {
    try {
      const response = await fetch('/api/hq/integrations/configs?category=payment_gateway');
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

  const filteredConfigs = configs.filter(c => {
    if (filterEnvironment !== 'all' && c.environment !== filterEnvironment) return false;
    return true;
  });

  const productionConfigs = configs.filter(c => c.environment === 'production' && c.status === 'active');
  const totalVolume = productionConfigs.reduce((sum, c) => sum + (c.totalVolume || 0), 0);
  const totalTransactions = productionConfigs.reduce((sum, c) => sum + (c.totalTransactions || 0), 0);

  const handleTestConnection = async (configId: string) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setConfigs(prev => prev.map(c => 
      c.id === configId 
        ? { ...c, lastTestedAt: new Date().toISOString(), lastTestResult: { success: true } }
        : c
    ));
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <HQLayout title="Payment Gateway" subtitle="Kelola integrasi payment gateway dan metode pembayaran">
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
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Gateway Aktif</p>
                <p className="text-3xl font-bold mt-1">{productionConfigs.length}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-3 text-sm text-white/80">Production environment</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalVolume)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Bulan ini</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Transaksi</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalTransactions.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Bulan ini</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Cabang dengan Config</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {branches.filter(b => b.hasPaymentConfig).length}/{branches.length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Building2 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Custom per cabang</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex items-center gap-6">
              {[
                { id: 'configs', label: 'Konfigurasi', icon: Settings },
                { id: 'branches', label: 'Per Cabang', icon: Building2 },
                { id: 'history', label: 'Riwayat', icon: History }
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
            {/* Configs Tab */}
            {activeTab === 'configs' && (
              <div className="space-y-6">
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <select
                      value={filterEnvironment}
                      onChange={(e) => setFilterEnvironment(e.target.value as any)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Semua Environment</option>
                      <option value="production">Production</option>
                      <option value="sandbox">Sandbox</option>
                    </select>
                  </div>
                  <button
                    onClick={() => window.location.href = '/hq/settings/integrations?tab=providers&category=payment_gateway'}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Gateway
                  </button>
                </div>

                {/* Config Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredConfigs.map(config => (
                    <div
                      key={config.id}
                      className="border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-md transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-gray-100 rounded-xl">
                            <CreditCard className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{config.providerName}</h4>
                              {config.isDefault && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{config.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.environment === 'production' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {config.environment}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            config.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {config.status}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Merchant ID</p>
                          <p className="text-sm font-medium text-gray-900">{config.merchantId || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Cabang</p>
                          <p className="text-sm font-medium text-gray-900">{config.branchName}</p>
                        </div>
                      </div>

                      {/* Payment Methods */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-2">Metode Pembayaran Aktif</p>
                        <div className="flex flex-wrap gap-1.5">
                          {config.paymentMethods.filter(pm => pm.enabled).slice(0, 5).map(pm => {
                            const Icon = paymentTypeIcons[pm.type] || CreditCard;
                            return (
                              <span
                                key={pm.id}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg"
                              >
                                <Icon className="w-3 h-3" />
                                {pm.name}
                              </span>
                            );
                          })}
                          {config.paymentMethods.filter(pm => pm.enabled).length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-lg">
                              +{config.paymentMethods.filter(pm => pm.enabled).length - 5}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      {config.environment === 'production' && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Volume</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(config.totalVolume || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Transaksi</p>
                            <p className="text-sm font-semibold text-gray-900">{(config.totalTransactions || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      )}

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
                          onClick={() => handleTestConnection(config.id)}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          <TestTube className="w-4 h-4" />
                          Test
                        </button>
                        <button
                          onClick={() => setSelectedConfig(config)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                          <Settings className="w-4 h-4" />
                          Kelola
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Branches Tab */}
            {activeTab === 'branches' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Konfigurasi Per Cabang</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Secara default, semua cabang menggunakan konfigurasi HQ. Anda dapat membuat konfigurasi khusus per cabang jika diperlukan (misalnya untuk merchant ID yang berbeda).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cabang</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Konfigurasi</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {branches.map(branch => {
                        const branchConfig = configs.find(c => c.branchId === branch.id && c.environment === 'production');
                        const defaultConfig = configs.find(c => c.branchId === null && c.isDefault && c.environment === 'production');
                        const activeConfig = branchConfig || defaultConfig;

                        return (
                          <tr key={branch.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <Store className="w-4 h-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{branch.name}</p>
                                  <p className="text-xs text-gray-500">{branch.code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {branchConfig ? (
                                <div>
                                  <p className="font-medium text-gray-900">{branchConfig.providerName}</p>
                                  <p className="text-xs text-gray-500">Custom: {branchConfig.name}</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-gray-600">{defaultConfig?.providerName || '-'}</p>
                                  <p className="text-xs text-gray-400">Menggunakan default HQ</p>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {branchConfig ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                  Custom
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                  Default
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {branchConfig ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                    <Unlink className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button className="flex items-center gap-1 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm">
                                  <Link2 className="w-4 h-4" />
                                  Buat Custom
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Riwayat transaksi payment gateway akan ditampilkan di sini</p>
                  <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
                    Lihat Laporan Lengkap
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
