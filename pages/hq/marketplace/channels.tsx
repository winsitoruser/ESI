import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  Store, Settings, CheckCircle, RefreshCw, AlertCircle, Link2, Unlink,
  X, Clock, Activity, Shield, Plug, Key, Lock, Wifi, WifiOff,
  ExternalLink, Globe, Loader2, Eye, EyeOff, ArrowRight, FileText,
  ChevronDown, ChevronRight, AlertTriangle, RotateCcw, Zap, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

const PLATFORMS: Record<string, { name: string; icon: string; color: string }> = {
  tokopedia:   { name: 'Tokopedia',   icon: '🟢', color: '#42b549' },
  shopee:      { name: 'Shopee',      icon: '🟠', color: '#ee4d2d' },
  lazada:      { name: 'Lazada',      icon: '🔵', color: '#0f146d' },
  bukalapak:   { name: 'Bukalapak',   icon: '🔴', color: '#e31e52' },
  tiktok_shop: { name: 'TikTok Shop', icon: '⚫', color: '#000000' },
  blibli:      { name: 'Blibli',      icon: '🔷', color: '#0095da' },
};

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
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
  return `${Math.floor(diff / 86400000)}h lalu`;
}

function ChannelsContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [showCredForm, setShowCredForm] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [credForm, setCredForm] = useState({ shopName: '', shopId: '', appKey: '', appSecret: '' });
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'webhooks'>('channels');

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const json = await api('dashboard');
      setChannels(json.data?.channels || []);
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const json = await api('webhook-logs');
      setWebhookLogs(json.webhooks || []);
    } catch { }
  }, []);

  useEffect(() => { setMounted(true); fetchChannels(); fetchWebhooks(); }, []);

  const handleConnect = async (platform: string) => {
    if (!credForm.shopName.trim()) { toast.error('Nama toko wajib diisi'); return; }
    setConnecting(platform);
    try {
      await api('channels', 'POST', {
        platform, shopName: credForm.shopName, shopId: credForm.shopId || null,
        appKey: credForm.appKey || null, appSecret: credForm.appSecret || null
      });
      toast.success(`${PLATFORMS[platform]?.name || platform} berhasil terhubung!`);
      setShowCredForm(null);
      setCredForm({ shopName: '', shopId: '', appKey: '', appSecret: '' });
      fetchChannels();
    } catch (e: any) { toast.error(e.message); } finally { setConnecting(null); }
  };

  const handleDisconnect = async (channelId: number) => {
    if (!confirm('Yakin ingin memutuskan koneksi? Semua mapping dan sync akan terhenti.')) return;
    try {
      await api('disconnect', 'POST', { channelId });
      toast.success('Channel disconnected');
      fetchChannels();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleOAuth = async (platform: string) => {
    try {
      const json = await api('oauth-url', 'POST', { platform });
      if (json.oauthUrl) window.location.href = json.oauthUrl;
      else toast.error('OAuth URL tidak tersedia untuk platform ini');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRefreshToken = async (channelId: number) => {
    try {
      const json = await api('refresh-token', 'POST', { channelId });
      toast.success(`Token refreshed! Expires: ${json.expiresAt || 'N/A'}`);
      fetchChannels();
    } catch (e: any) { toast.error(e.message); }
  };

  if (!mounted) return null;

  const connectedChannels = channels.filter(c => c.status === 'connected');
  const availablePlatforms = Object.entries(PLATFORMS).filter(([code]) => !connectedChannels.some(c => c.platform === code));

  return (
    <HQLayout title="Channel Toko" subtitle="Kelola koneksi marketplace dan kredensial OAuth">
      {/* Tab Nav */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {[
          { id: 'channels' as const, label: 'Manajemen Channel', icon: Store },
          { id: 'webhooks' as const, label: 'Webhook Monitor', icon: Bell },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === 'webhooks') fetchWebhooks(); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* Connected Channels */}
          {connectedChannels.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Channel Terhubung ({connectedChannels.length})</h3>
              <div className="space-y-3">
                {connectedChannels.map(ch => {
                  const p = PLATFORMS[ch.platform] || { name: ch.platform, icon: '📦', color: '#666' };
                  const isExpanded = expandedChannel === ch.platform;
                  return (
                    <div key={ch.platform} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50" onClick={() => setExpandedChannel(isExpanded ? null : ch.platform)}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl" style={{ backgroundColor: p.color }}>{p.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900">{p.name}</h4>
                            {ch.shopName && <span className="text-sm text-gray-400">— {ch.shopName}</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-green-500" /> Terhubung</span>
                            <span>{ch.productsSynced} produk</span>
                            <span>{ch.ordersToday} order hari ini</span>
                            <span>Sync: {timeAgo(ch.lastSyncStock)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700">Aktif</span>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-5 space-y-4">
                          {/* Connection Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase">Shop ID</p>
                              <p className="text-sm font-mono text-gray-900 mt-1">{ch.shopId || '-'}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase">Terhubung Sejak</p>
                              <p className="text-sm text-gray-900 mt-1">{ch.connectedAt ? new Date(ch.connectedAt).toLocaleDateString('id-ID') : '-'}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase">Buffer Stock</p>
                              <p className="text-sm text-gray-900 mt-1">{ch.bufferStock} unit</p>
                            </div>
                          </div>

                          {/* Sync Status */}
                          <div className="bg-white rounded-lg p-4 border">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-3">Status Sinkronisasi</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { label: 'Sync Stok', time: ch.lastSyncStock, auto: ch.autoSyncStock },
                                { label: 'Sync Harga', time: ch.lastSyncProducts, auto: ch.autoSyncPrice },
                                { label: 'Sync Order', time: ch.lastSyncOrders, auto: ch.autoSyncOrder },
                              ].map((s, i) => (
                                <div key={i} className="text-xs">
                                  <p className="font-medium text-gray-700">{s.label}</p>
                                  <p className="text-gray-500 mt-0.5">{timeAgo(s.time)}</p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block ${s.auto ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {s.auto ? 'Auto' : 'Manual'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => handleRefreshToken(ch.id)} className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> Refresh Token
                            </button>
                            <button onClick={() => handleOAuth(ch.platform)} className="text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Re-authorize OAuth
                            </button>
                            <button onClick={() => handleDisconnect(ch.id)} className="text-xs px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 ml-auto">
                              <Unlink className="w-3 h-3" /> Putuskan Koneksi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Platforms */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {connectedChannels.length > 0 ? 'Tambah Channel Baru' : 'Hubungkan Marketplace Pertama Anda'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(PLATFORMS).map(([code, p]) => {
                const isConnected = connectedChannels.some(c => c.platform === code);
                const isFormOpen = showCredForm === code;

                return (
                  <div key={code} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isConnected ? 'opacity-60' : ''}`}>
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl" style={{ backgroundColor: p.color }}>{p.icon}</div>
                        <div>
                          <h4 className="font-bold text-gray-900">{p.name}</h4>
                          <p className="text-xs text-gray-400">{isConnected ? 'Sudah terhubung' : 'Belum terhubung'}</p>
                        </div>
                      </div>

                      {isFormOpen && !isConnected && (
                        <div className="space-y-2 mb-3">
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium">Nama Toko *</label>
                            <input placeholder="Toko Saya" value={credForm.shopName} onChange={e => setCredForm(p => ({ ...p, shopName: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium">Shop ID (opsional)</label>
                            <input placeholder="12345678" value={credForm.shopId} onChange={e => setCredForm(p => ({ ...p, shopId: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium">App Key / Client ID</label>
                            <input placeholder="Dari Developer Console" value={credForm.appKey} onChange={e => setCredForm(p => ({ ...p, appKey: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 mt-0.5" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                              App Secret <button onClick={() => setShowSecrets(!showSecrets)} className="text-blue-500">{showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                            </label>
                            <input type={showSecrets ? 'text' : 'password'} placeholder="Secret key" value={credForm.appSecret} onChange={e => setCredForm(p => ({ ...p, appSecret: e.target.value }))} className="w-full text-sm border rounded-lg px-3 py-2 mt-0.5" />
                          </div>
                          <p className="text-[10px] text-gray-400">
                            <Shield className="w-3 h-3 inline mr-1" />
                            Kredensial dienkripsi dan disimpan aman di server
                          </p>
                        </div>
                      )}
                    </div>

                    {!isConnected && (
                      <div className="px-5 py-3 bg-gray-50 border-t flex gap-2">
                        {isFormOpen ? (
                          <>
                            <button onClick={() => setShowCredForm(null)} className="flex-1 text-xs py-2 border rounded-lg hover:bg-gray-100">Batal</button>
                            <button onClick={() => handleConnect(code)} disabled={connecting === code}
                              className="flex-1 text-xs py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
                              {connecting === code ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />} Hubungkan
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setShowCredForm(code)} className="flex-1 text-xs py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1">
                              <Key className="w-3 h-3" /> Manual (API Key)
                            </button>
                            <button onClick={() => handleOAuth(code)} className="flex-1 text-xs py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-1">
                              <Globe className="w-3 h-3" /> OAuth
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Webhook Event Log</h3>
            <button onClick={fetchWebhooks} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          </div>
          <p className="text-xs text-gray-500">Monitor semua pesan masuk dari marketplace (order baru, status update, pembatalan, dll.)</p>

          {webhookLogs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Bell className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Belum ada webhook yang diterima</p>
              <p className="text-xs text-gray-400 mt-1">Webhook akan masuk saat ada aktivitas di marketplace (pesanan baru, perubahan status, dll.)</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Error</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Retry</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {webhookLogs.map((w: any) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">{new Date(w.created_at).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2 font-medium">{PLATFORMS[w.platform]?.name || w.platform}</td>
                      <td className="px-4 py-2">{w.event_type}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          w.processing_status === 'processed' ? 'bg-green-100 text-green-700' :
                          w.processing_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{w.processing_status}</span>
                      </td>
                      <td className="px-4 py-2 text-red-500 max-w-[200px] truncate">{w.error_message || '-'}</td>
                      <td className="px-4 py-2 text-center">{w.retry_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </HQLayout>
  );
}

export default function ChannelsPage() {
  return (
    <ModuleGuard moduleCode="marketplace_integration">
      <ChannelsContent />
    </ModuleGuard>
  );
}
