import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  Package, ShoppingCart, Store, Settings, CheckCircle, Circle,
  ArrowRight, RefreshCw, BarChart3, AlertCircle, Link2, Truck,
  Clock, Activity, Layers, Loader2, DollarSign, AlertTriangle,
  CheckCircle2, XCircle, Wifi, WifiOff, Zap, Shield, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rowsOr, MOCK_HQ_MARKETPLACE_HOME, MOCK_HQ_MARKETPLACE_CONFLICTS } from '@/lib/hq/mock-data';

// ═══════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════
const api = async (action: string, method = 'GET', body?: any, params?: Record<string, string>) => {
  const url = new URL('/api/hq/marketplace', window.location.origin);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json;
};

function timeAgo(date: string | null): string {
  if (!date) return 'Belum pernah';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return `${Math.floor(diff / 86400000)} hari lalu`;
}

function formatRp(n: number): string { return `Rp ${(n || 0).toLocaleString('id-ID')}`; }

// ═══════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════
function MarketplaceDashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>(MOCK_HQ_MARKETPLACE_HOME.channels);
  const [stats, setStats] = useState<any>(MOCK_HQ_MARKETPLACE_HOME.stats);
  const [setupSteps, setSetupSteps] = useState<any[]>(MOCK_HQ_MARKETPLACE_HOME.setupSteps);
  const [syncHistory, setSyncHistory] = useState<any[]>(MOCK_HQ_MARKETPLACE_HOME.syncHistory);
  const [activeJobs, setActiveJobs] = useState<any[]>(MOCK_HQ_MARKETPLACE_HOME.activeJobs);
  const [conflicts, setConflicts] = useState<any>(MOCK_HQ_MARKETPLACE_CONFLICTS);

  const fetchDashboard = useCallback(async () => {
    const M = MOCK_HQ_MARKETPLACE_HOME;
    try {
      setLoading(true);
      const [dashJson, conflictJson] = await Promise.all([
        api('dashboard'),
        api('conflicts'),
      ]);
      const d = dashJson.data || {};
      setChannels(rowsOr(d.channels, M.channels));
      setStats({ ...M.stats, ...(d.stats && typeof d.stats === 'object' ? d.stats : {}) });
      setSetupSteps(rowsOr(d.setupSteps, M.setupSteps));
      setSyncHistory(rowsOr(d.syncHistory, M.syncHistory));
      setActiveJobs(rowsOr(d.activeJobs, M.activeJobs));
      setConflicts(
        conflictJson && typeof conflictJson === 'object' && conflictJson.summary
          ? conflictJson
          : MOCK_HQ_MARKETPLACE_CONFLICTS
      );
    } catch (e: any) {
      console.error('Dashboard fetch error:', e.message);
      setChannels(M.channels);
      setStats(M.stats);
      setSetupSteps(M.setupSteps);
      setSyncHistory(M.syncHistory);
      setActiveJobs(M.activeJobs);
      setConflicts(MOCK_HQ_MARKETPLACE_CONFLICTS);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { setMounted(true); fetchDashboard(); }, [fetchDashboard]);

  // Handle OAuth callback redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get('connected');
      if (connected) {
        toast.success(`${connected} berhasil terhubung via OAuth!`);
        window.history.replaceState({}, '', '/hq/marketplace');
        fetchDashboard();
      }
    }
  }, []);

  if (!mounted) return null;

  const connectedChannels = channels.filter(c => c.status === 'connected');
  const totalConflicts = (conflicts.summary?.price || 0) + (conflicts.summary?.stock || 0) + (conflicts.summary?.sync || 0);

  // Quick navigation cards
  const navCards = [
    { href: '/hq/marketplace/channels', icon: Store, label: 'Channel Toko', desc: 'Kelola koneksi marketplace & OAuth', color: 'bg-blue-500', stat: `${stats.connectedChannels}/${stats.totalChannels} terhubung` },
    { href: '/hq/marketplace/products', icon: Layers, label: 'Sync Produk', desc: 'Mapping, harga, kategori, validasi', color: 'bg-green-500', stat: `${stats.totalProductsSynced} produk ter-sync` },
    { href: '/hq/marketplace/orders', icon: ShoppingCart, label: 'Order Marketplace', desc: 'Pesanan, resi, pembatalan', color: 'bg-purple-500', stat: `${stats.totalOrdersToday} order hari ini` },
    { href: '/hq/marketplace/logistics', icon: Truck, label: 'Logistik', desc: 'Atur kirim, cetak resi, lacak paket', color: 'bg-orange-500', stat: 'Pengiriman' },
    { href: '/hq/marketplace/settings', icon: Settings, label: 'Pengaturan', desc: 'Buffer stock, rate limit, validasi', color: 'bg-gray-500', stat: 'Konfigurasi' },
  ];

  return (
    <HQLayout title="Marketplace Integration" subtitle="Hubungkan & kelola toko online di berbagai marketplace — terintegrasi penuh dengan ERP">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-500">Memuat data marketplace...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Channel Terhubung', value: `${stats.connectedChannels}/${stats.totalChannels}`, icon: Link2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
              { label: 'Produk Tersync', value: stats.totalProductsSynced, icon: Package, color: 'text-green-600 bg-green-50 border-green-200' },
              { label: 'Order Hari Ini', value: stats.totalOrdersToday, icon: ShoppingCart, color: 'text-purple-600 bg-purple-50 border-purple-200' },
              { label: 'Revenue Hari Ini', value: formatRp(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { label: 'Pending Order', value: stats.pendingOrders, icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
            ].map((s, i) => (
              <div key={i} className={`bg-white rounded-xl p-4 border shadow-sm ${s.color.split(' ').pop()}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${s.color.split(' ').slice(0, 2).join(' ')}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Conflict Banner */}
          {totalConflicts > 0 && (
            <Link href="/hq/marketplace/products" className="block bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">{totalConflicts} konflik terdeteksi</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {conflicts.summary.price > 0 && `${conflicts.summary.price} harga di bawah modal · `}
                    {conflicts.summary.stock > 0 && `${conflicts.summary.stock} stok kosong · `}
                    {conflicts.summary.sync > 0 && `${conflicts.summary.sync} sync error`}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-600" />
              </div>
            </Link>
          )}

          {/* Active Sync Jobs */}
          {activeJobs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Proses Sinkronisasi Berjalan
              </h3>
              {activeJobs.map((job: any) => (
                <div key={job.id} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-800 font-medium">{job.job_type?.replace(/_/g, ' ')} — {job.platform}</span>
                    <span className="text-blue-600">{job.processed_items}/{job.total_items} ({job.progress_percent}%)</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${job.progress_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Module Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {navCards.map(card => (
              <Link key={card.href} href={card.href} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{card.label}</h4>
                <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-medium text-gray-600">{card.stat}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Channels Grid */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Store className="w-5 h-5 text-gray-500" /> Channel Marketplace</h3>
              <div className="flex items-center gap-2">
                <button onClick={fetchDashboard} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Refresh</button>
                <Link href="/hq/marketplace/channels" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Kelola <ArrowRight className="w-3 h-3" /></Link>
              </div>
            </div>
            <div className="divide-y">
              {channels.map((ch: any) => (
                <div key={ch.platform} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: ch.color }}>{ch.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{ch.name}</h4>
                      {ch.shopName && <span className="text-xs text-gray-400">({ch.shopName})</span>}
                    </div>
                    {ch.status === 'connected' ? (
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {ch.productsSynced} produk</span>
                        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> {ch.ordersToday} order</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Sync: {timeAgo(ch.lastSyncStock)}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Belum terhubung</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${ch.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {ch.status === 'connected' ? <><Wifi className="w-3 h-3 inline mr-1" />Terhubung</> : <><WifiOff className="w-3 h-3 inline mr-1" />Tidak Aktif</>}
                  </span>
                  <Link href="/hq/marketplace/channels"
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      ch.status === 'connected' ? 'border border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}>
                    {ch.status === 'connected' ? 'Kelola' : 'Hubungkan'}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Setup Steps */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" /> Langkah Setup
              </h3>
              <div className="space-y-2">
                {setupSteps.map((step: any) => (
                  <div key={step.step} className={`flex items-center gap-3 p-3 rounded-lg ${step.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                    {step.completed ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                    <span className={`text-sm ${step.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>{step.step}. {step.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sync Logs */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-gray-500" /> Riwayat Sinkronisasi
                </h3>
                <Link href="/hq/marketplace/settings" className="text-xs text-blue-600 hover:underline flex items-center gap-1">Audit Trail <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {syncHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Belum ada riwayat sinkronisasi</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {syncHistory.slice(0, 8).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-xs">
                      {log.is_success ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-700">{log.sync_type?.replace(/_/g, ' ')}</span>
                        {log.platform && <span className="text-gray-400 ml-1">({log.platform})</span>}
                        {log.error_message && <p className="text-red-500 truncate">{log.error_message}</p>}
                      </div>
                      <span className="text-gray-400 whitespace-nowrap">{timeAgo(log.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cross-Module Integration Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-5">
            <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5" /> Integrasi Lintas Modul
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Inventory', desc: 'Stok otomatis sync saat berubah', icon: Package, active: connectedChannels.length > 0 },
                { label: 'Finance', desc: 'Biaya admin & fee otomatis dipisah', icon: DollarSign, active: connectedChannels.length > 0 },
                { label: 'Validasi', desc: 'Cek nama, deskripsi, gambar produk', icon: Shield, active: true },
                { label: 'Audit Trail', desc: 'Log semua aktivitas marketplace', icon: FileText, active: true },
              ].map((m, i) => (
                <div key={i} className={`bg-white/80 rounded-lg p-3 ${m.active ? '' : 'opacity-50'}`}>
                  <m.icon className={`w-5 h-5 mb-1 ${m.active ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <p className="text-xs font-semibold text-gray-800">{m.label}</p>
                  <p className="text-[10px] text-gray-500">{m.desc}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block ${m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.active ? 'Aktif' : 'Perlu Channel'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}

export default function MarketplaceDashboard() {
  return (
    <ModuleGuard moduleCode="marketplace_integration">
      <MarketplaceDashboardContent />
    </ModuleGuard>
  );
}
