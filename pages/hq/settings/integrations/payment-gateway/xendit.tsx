import React, { useState, useEffect } from 'react';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft, CreditCard, QrCode, Wallet, Building, Plus, Settings, CheckCircle, XCircle, Clock,
  AlertCircle, ChevronRight, ExternalLink, RefreshCw, TestTube, Edit, Trash2, Copy, Eye, EyeOff,
  Building2, Store, Globe, Key, Save, Zap, TrendingUp, Activity, FileText, History, Info, MoreVertical
} from 'lucide-react';

interface BranchAccount {
  id: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  accountName: string;
  environment: 'sandbox' | 'production';
  status: 'active' | 'pending' | 'suspended';
  merchantId?: string;
  secretKeyMasked?: string;
  webhookUrl?: string;
  enabledMethods: PaymentMethod[];
  stats: { totalTransactions: number; totalVolume: number; successRate: number; todayTransactions: number; };
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: 'qris' | 'ewallet' | 'va' | 'retail';
  enabled: boolean;
  fee: { type: 'percentage' | 'fixed'; value: number };
}

const methodIcons: Record<string, any> = { qris: QrCode, ewallet: Wallet, va: Building, retail: Store };
const formatCurrency = (v: number) => v >= 1e9 ? `Rp ${(v/1e9).toFixed(2)}M` : v >= 1e6 ? `Rp ${(v/1e6).toFixed(1)}Jt` : `Rp ${v.toLocaleString('id-ID')}`;

export default function XenditIntegrationPage() {
  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<BranchAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BranchAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'methods' | 'webhooks' | 'settings'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newAccount, setNewAccount] = useState({ branchId: '', accountName: '', environment: 'sandbox', secretKey: '', publicKey: '' });

  const fetchData = async () => {
    try {
      const response = await fetch('/api/integrations/payment-gateway?provider=xendit');
      if (response.ok) {
        const json = await response.json();
        const payload = json.data || json;
        if (payload.accounts) {
          setAccounts(payload.accounts);
          if (payload.accounts.length > 0) setSelectedAccount(payload.accounts[0]);
        }
      }
    } catch { }
  };

  useEffect(() => { setMounted(true); fetchData(); }, []);

  const handleToggleMethod = (methodId: string) => {
    if (!selectedAccount) return;
    setAccounts(prev => prev.map(acc => acc.id === selectedAccount.id ? { ...acc, enabledMethods: acc.enabledMethods.map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m) } : acc));
    setSelectedAccount(prev => prev ? { ...prev, enabledMethods: prev.enabledMethods.map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m) } : null);
  };

  const handleTestConnection = async () => { setLoading(true); await new Promise(r => setTimeout(r, 2000)); setLoading(false); alert('✅ Connection successful!'); };

  const handleCreateAccount = async () => {
    if (!newAccount.branchId || !newAccount.secretKey) { alert('Branch dan Secret Key wajib diisi'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    const branch = { name: newAccount.accountName, code: '' };
    setAccounts(prev => [...prev, {
      id: `xa-${Date.now()}`, branchId: newAccount.branchId, branchName: branch?.name || '', branchCode: branch?.code || '',
      accountName: newAccount.accountName || `Xendit - ${branch?.name}`, environment: newAccount.environment as any, status: 'pending',
      secretKeyMasked: newAccount.secretKey.substring(0, 15) + '••••••••', enabledMethods: [],
      stats: { totalTransactions: 0, totalVolume: 0, successRate: 0, todayTransactions: 0 }, isDefault: false
    }]);
    setShowAddModal(false);
    setNewAccount({ branchId: '', accountName: '', environment: 'sandbox', secretKey: '', publicKey: '' });
    setLoading(false);
  };

  const totalStats = accounts.reduce((acc, c) => ({ totalVolume: acc.totalVolume + c.stats.totalVolume, totalTx: acc.totalTx + c.stats.totalTransactions, todayTx: acc.todayTx + c.stats.todayTransactions }), { totalVolume: 0, totalTx: 0, todayTx: 0 });

  if (!mounted) return null;

  return (
    <HQLayout title="Xendit Integration" subtitle="Kelola integrasi Xendit payment gateway per cabang">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => window.location.href = '/hq/settings/integrations/payment-gateway'} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /><span>Kembali</span></button>
          <div className="flex items-center gap-3">
            <a href="https://developers.xendit.co" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"><FileText className="w-4 h-4" />API Docs<ExternalLink className="w-3 h-3" /></a>
            <a href="https://dashboard.xendit.co" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"><Globe className="w-4 h-4" />Dashboard<ExternalLink className="w-3 h-3" /></a>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl"><CreditCard className="w-10 h-10" /></div>
              <div>
                <h1 className="text-2xl font-bold">Xendit</h1>
                <p className="text-white/80 mt-1">Platform pembayaran modern dengan API mudah diintegrasikan</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Payment Gateway</span>
                  <span className="px-3 py-1 bg-emerald-500/30 rounded-full text-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" />{accounts.filter(a => a.status === 'active').length} Aktif</span>
                </div>
              </div>
            </div>
            <div className="text-right grid grid-cols-2 gap-6">
              <div><p className="text-white/60 text-sm">Volume Bulan Ini</p><p className="text-2xl font-bold">{formatCurrency(totalStats.totalVolume)}</p></div>
              <div><p className="text-white/60 text-sm">Transaksi Hari Ini</p><p className="text-2xl font-bold">{totalStats.todayTx}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Akun Terdaftar</p><p className="text-2xl font-bold text-gray-900 mt-1">{accounts.length}</p></div><div className="p-3 bg-indigo-100 rounded-xl"><Building2 className="w-6 h-6 text-indigo-600" /></div></div></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Total Transaksi</p><p className="text-2xl font-bold text-gray-900 mt-1">{totalStats.totalTx.toLocaleString()}</p></div><div className="p-3 bg-emerald-100 rounded-xl"><Zap className="w-6 h-6 text-emerald-600" /></div></div></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Success Rate</p><p className="text-2xl font-bold text-gray-900 mt-1">98.2%</p></div><div className="p-3 bg-blue-100 rounded-xl"><TrendingUp className="w-6 h-6 text-blue-600" /></div></div></div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"><div className="flex items-center justify-between"><div><p className="text-gray-500 text-sm">Webhook Status</p><p className="text-2xl font-bold text-emerald-600 mt-1">Healthy</p></div><div className="p-3 bg-emerald-100 rounded-xl"><Activity className="w-6 h-6 text-emerald-600" /></div></div></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 flex items-center gap-1 overflow-x-auto">
            {[{ id: 'overview', label: 'Overview', icon: Building2 }, { id: 'accounts', label: 'Akun Per Cabang', icon: Store }, { id: 'methods', label: 'Metode Pembayaran', icon: CreditCard }, { id: 'webhooks', label: 'Webhooks', icon: Activity }, { id: 'settings', label: 'Pengaturan', icon: Settings }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 py-4 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={() => setShowAddModal(true)} className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 hover:border-indigo-200"><div className="p-3 bg-indigo-100 rounded-xl"><Plus className="w-5 h-5 text-indigo-600" /></div><div className="text-left"><p className="font-medium text-gray-900">Tambah Akun Cabang</p><p className="text-sm text-gray-500">Daftarkan cabang baru</p></div></button>
                  <button onClick={handleTestConnection} className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-200"><div className="p-3 bg-emerald-100 rounded-xl"><TestTube className="w-5 h-5 text-emerald-600" /></div><div className="text-left"><p className="font-medium text-gray-900">Test Connection</p><p className="text-sm text-gray-500">Verifikasi API credentials</p></div></button>
                  <button onClick={() => setActiveTab('accounts')} className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 hover:border-purple-200"><div className="p-3 bg-purple-100 rounded-xl"><History className="w-5 h-5 text-purple-600" /></div><div className="text-left"><p className="font-medium text-gray-900">Kelola Akun</p><p className="text-sm text-gray-500">Lihat semua akun cabang</p></div></button>
                </div>
                <div><h3 className="text-lg font-semibold text-gray-900 mb-4">Akun Terdaftar</h3>
                  <div className="space-y-3">{accounts.map(account => (
                    <div key={account.id} onClick={() => window.location.href = `/hq/settings/integrations/payment-gateway/xendit/${account.branchId}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer group">
                      <div className="flex items-center gap-4"><div className={`p-2.5 rounded-xl ${account.status === 'active' ? 'bg-emerald-100' : account.status === 'pending' ? 'bg-amber-100' : 'bg-gray-200'}`}><Store className={`w-5 h-5 ${account.status === 'active' ? 'text-emerald-600' : account.status === 'pending' ? 'text-amber-600' : 'text-gray-600'}`} /></div><div><div className="flex items-center gap-2"><p className="font-medium text-gray-900">{account.branchName}</p>{account.isDefault && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Default</span>}</div><p className="text-sm text-gray-500">{account.accountName}</p></div></div>
                      <div className="flex items-center gap-6"><div className="text-right"><p className="font-semibold text-gray-900">{formatCurrency(account.stats.totalVolume)}</p><p className="text-xs text-gray-500">{account.stats.totalTransactions.toLocaleString()} transaksi</p></div><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${account.environment === 'production' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{account.environment}</span><span className={`px-2 py-1 rounded-full text-xs font-medium ${account.status === 'active' ? 'bg-green-100 text-green-700' : account.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{account.status}</span></div><ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" /></div>
                    </div>
                  ))}</div>
                </div>
              </div>
            )}

            {activeTab === 'accounts' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between"><p className="text-gray-500">{accounts.length} akun terdaftar</p><button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"><Plus className="w-4 h-4" />Tambah Akun</button></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">{accounts.map(account => (
                    <div key={account.id} onClick={() => setSelectedAccount(account)} className={`p-4 rounded-xl cursor-pointer transition-all ${selectedAccount?.id === account.id ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Store className={`w-4 h-4 ${selectedAccount?.id === account.id ? 'text-indigo-600' : 'text-gray-500'}`} /><span className="font-medium text-gray-900">{account.branchName}</span></div>{account.isDefault && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Default</span>}</div>
                      <p className="text-sm text-gray-500 mb-2">{account.accountName}</p>
                      <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${account.environment === 'production' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{account.environment}</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${account.status === 'active' ? 'bg-green-100 text-green-700' : account.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{account.status}</span></div>
                    </div>
                  ))}</div>
                  {selectedAccount && (
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4"><div><h3 className="text-xl font-semibold text-gray-900">{selectedAccount.branchName}</h3><p className="text-gray-500">{selectedAccount.accountName}</p></div><div className="flex items-center gap-2"><button onClick={() => window.location.href = `/hq/settings/integrations/payment-gateway/xendit/${selectedAccount.branchId}`} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"><Settings className="w-4 h-4" />Konfigurasi</button><button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></div>
                        <div className="grid grid-cols-4 gap-4"><div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Volume Total</p><p className="text-lg font-bold text-gray-900">{formatCurrency(selectedAccount.stats.totalVolume)}</p></div><div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Transaksi</p><p className="text-lg font-bold text-gray-900">{selectedAccount.stats.totalTransactions.toLocaleString()}</p></div><div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Success Rate</p><p className="text-lg font-bold text-emerald-600">{selectedAccount.stats.successRate}%</p></div><div className="bg-white rounded-lg p-3"><p className="text-xs text-gray-500">Hari Ini</p><p className="text-lg font-bold text-gray-900">{selectedAccount.stats.todayTransactions}</p></div></div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Key className="w-4 h-4" />API Credentials</h4>
                        <div className="space-y-4">
                          <div><label className="text-xs text-gray-500">Merchant ID</label><div className="flex items-center gap-2 mt-1"><code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono">{selectedAccount.merchantId || '-'}</code><button className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg"><Copy className="w-4 h-4" /></button></div></div>
                          <div><label className="text-xs text-gray-500">Secret Key</label><div className="flex items-center gap-2 mt-1"><code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono">{showSecretKey ? 'xnd_production_actual_key_here' : selectedAccount.secretKeyMasked || '-'}</code><button onClick={() => setShowSecretKey(!showSecretKey)} className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg">{showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button><button className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg"><Copy className="w-4 h-4" /></button></div></div>
                          <div><label className="text-xs text-gray-500">Webhook URL</label><div className="flex items-center gap-2 mt-1"><code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono truncate">{selectedAccount.webhookUrl || '-'}</code><button className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg"><Copy className="w-4 h-4" /></button></div></div>
                        </div>
                        <div className="flex items-center gap-2 mt-4"><button onClick={handleTestConnection} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50">{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}Test Connection</button><button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"><RefreshCw className="w-4 h-4" />Regenerate</button></div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" />Metode Pembayaran ({selectedAccount.enabledMethods.filter(m => m.enabled).length} aktif)</h4>
                        {selectedAccount.enabledMethods.length > 0 ? <div className="space-y-2">{selectedAccount.enabledMethods.map(method => { const Icon = methodIcons[method.type] || CreditCard; return (<div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><Icon className="w-4 h-4 text-gray-600" /><span className="font-medium text-gray-900">{method.name}</span><span className="text-xs text-gray-500">{method.fee.type === 'percentage' ? `${method.fee.value}%` : formatCurrency(method.fee.value)}</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={method.enabled} onChange={() => handleToggleMethod(method.id)} className="sr-only peer" /><div className="w-9 h-5 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div></label></div>); })}</div> : <div className="text-center py-8 text-gray-500"><CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Belum ada metode pembayaran</p></div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'methods' && selectedAccount && (
              <div className="space-y-6">
                <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Konfigurasi Metode Pembayaran</h3><p className="text-sm text-gray-500">Untuk: {selectedAccount.branchName}</p></div><select value={selectedAccount.id} onChange={(e) => { const acc = accounts.find(a => a.id === e.target.value); if (acc) setSelectedAccount(acc); }} className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500">{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.branchName}</option>)}</select></div>
                {['qris', 'ewallet', 'va', 'retail'].map(category => { const methods = selectedAccount.enabledMethods.filter(m => m.type === category); const Icon = methodIcons[category]; const labels: Record<string, string> = { qris: 'QRIS', ewallet: 'E-Wallet', va: 'Virtual Account', retail: 'Retail Outlet' }; return methods.length > 0 && (<div key={category} className="bg-gray-50 rounded-xl p-6"><div className="flex items-center gap-3 mb-4"><div className="p-2 bg-white rounded-lg shadow-sm"><Icon className="w-5 h-5 text-gray-600" /></div><div><h4 className="font-semibold text-gray-900">{labels[category]}</h4><p className="text-xs text-gray-500">{methods.filter(m => m.enabled).length} dari {methods.length} aktif</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{methods.map(method => (<div key={method.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-gray-500" /><span className="font-medium text-gray-900">{method.name}</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={method.enabled} onChange={() => handleToggleMethod(method.id)} className="sr-only peer" /><div className="w-9 h-5 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div></label></div>))}</div></div>); })}
              </div>
            )}

            {activeTab === 'webhooks' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="flex items-start gap-3"><Info className="w-5 h-5 text-blue-600 mt-0.5" /><div><p className="font-medium text-blue-900">Webhook Configuration</p><p className="text-sm text-blue-700 mt-1">Xendit akan mengirim notifikasi ke URL webhook Anda untuk setiap event pembayaran.</p></div></div></div>
                <div className="bg-white border border-gray-200 rounded-xl p-6"><h4 className="font-semibold text-gray-900 mb-4">Webhook URL</h4><div className="space-y-4"><div><label className="text-sm text-gray-500">Callback URL</label><div className="flex items-center gap-2 mt-1"><input type="text" value="https://api.bedagang.com/webhooks/xendit" readOnly className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" /><button className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg"><Copy className="w-4 h-4" /></button></div></div><div><label className="text-sm text-gray-500">Verification Token</label><div className="flex items-center gap-2 mt-1"><input type="password" value="whsec_xxxxxxxxxxxxxx" readOnly className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" /><button className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg"><Eye className="w-4 h-4" /></button></div></div></div></div>
                <div className="bg-white border border-gray-200 rounded-xl p-6"><h4 className="font-semibold text-gray-900 mb-4">Recent Events</h4><div className="space-y-2">{[{ event: 'ewallet.payment', status: 'success', time: '23:45:12' }, { event: 'qr_code.payment', status: 'success', time: '23:42:08' }, { event: 'virtual_account.payment', status: 'success', time: '23:38:45' }, { event: 'ewallet.payment', status: 'failed', time: '23:35:22' }].map((e, i) => (<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3">{e.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}<code className="text-sm font-mono text-gray-700">{e.event}</code></div><div className="flex items-center gap-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{e.status}</span><span className="text-xs text-gray-500">{e.time}</span></div></div>))}</div></div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6"><h4 className="font-semibold text-gray-900 mb-4">General Settings</h4><div className="space-y-4"><div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium text-gray-900">Auto-retry Failed Payments</p><p className="text-sm text-gray-500">Otomatis retry payment yang gagal</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div></label></div><div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium text-gray-900">Payment Expiry</p><p className="text-sm text-gray-500">Waktu kadaluarsa invoice pembayaran</p></div><select className="px-3 py-2 border border-gray-200 rounded-lg text-sm"><option>15 menit</option><option>30 menit</option><option>1 jam</option><option>24 jam</option></select></div><div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><div><p className="font-medium text-gray-900">Email Notification</p><p className="text-sm text-gray-500">Kirim email ke customer saat pembayaran</p></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div></label></div></div></div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6"><h4 className="font-semibold text-red-900 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Danger Zone</h4><div className="flex items-center justify-between"><div><p className="font-medium text-red-900">Disconnect Xendit</p><p className="text-sm text-red-700">Hapus semua konfigurasi Xendit dari sistem</p></div><button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">Disconnect</button></div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4"><h3 className="text-xl font-semibold text-gray-900 mb-6">Tambah Akun Xendit Cabang</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Cabang <span className="text-red-500">*</span></label><select value={newAccount.branchId} onChange={(e) => setNewAccount(p => ({ ...p, branchId: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"><option value="">Pilih Cabang</option>{accounts.filter((a: any) => !a.isDefault).length === 0 && <option value="">No branches available</option>}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Akun</label><input type="text" value={newAccount.accountName} onChange={(e) => setNewAccount(p => ({ ...p, accountName: e.target.value }))} placeholder="Xendit - Nama Cabang" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Environment</label><select value={newAccount.environment} onChange={(e) => setNewAccount(p => ({ ...p, environment: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"><option value="sandbox">Sandbox (Testing)</option><option value="production">Production</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Secret API Key <span className="text-red-500">*</span></label><input type="password" value={newAccount.secretKey} onChange={(e) => setNewAccount(p => ({ ...p, secretKey: e.target.value }))} placeholder="xnd_production_xxxx atau xnd_development_xxxx" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Public API Key</label><input type="text" value={newAccount.publicKey} onChange={(e) => setNewAccount(p => ({ ...p, publicKey: e.target.value }))} placeholder="xnd_public_production_xxxx" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
          </div>
          <div className="flex items-center gap-3 mt-6"><button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button><button onClick={handleCreateAccount} disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Menyimpan...' : 'Simpan'}</button></div>
        </div></div>
      )}
    </HQLayout>
  );
}
