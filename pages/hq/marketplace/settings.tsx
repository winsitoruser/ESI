import { useState, useEffect } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import { ModuleGuard } from '@/components/guards/ModuleGuard';
import {
  Settings, Save, Loader2, Package, DollarSign, ShoppingCart, RefreshCw,
  Shield, Clock, Image, AlertTriangle, CheckCircle, BarChart3, Bell, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = async (action: string, method = 'GET', body?: any) => {
  const url = new URL('/api/hq/marketplace', window.location.origin);
  url.searchParams.set('action', action);
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(url.toString(), opts);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Request failed');
  return json;
};

function SettingsContent() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'validation' | 'audit'>('general');

  useEffect(() => {
    setMounted(true);
    api('settings').then(json => setSettings(json.settings || {})).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fetchAudit = () => {
    api('audit-trail', 'GET', null).then(json => setAuditLogs(json.logs || [])).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api('settings', 'PUT', settings);
      toast.success('Pengaturan tersimpan');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const updateField = (key: string, value: any) => setSettings((p: any) => ({ ...p, [key]: value }));

  if (!mounted || loading) return (
    <HQLayout title="Pengaturan Marketplace" subtitle="Konfigurasi sinkronisasi, validasi, dan integrasi">
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
    </HQLayout>
  );

  const tabs = [
    { id: 'general' as const, label: 'Umum', icon: Settings },
    { id: 'validation' as const, label: 'Validasi Produk', icon: Shield },
    { id: 'audit' as const, label: 'Audit Trail', icon: BarChart3 },
  ];

  return (
    <HQLayout title="Pengaturan Marketplace" subtitle="Konfigurasi sinkronisasi, validasi, dan integrasi">
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === 'audit') fetchAudit(); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Stock Settings */}
          <Section icon={Package} title="Stok & Inventory" desc="Safety stock, mode sinkronisasi, dan integrasi gudang">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Default Buffer / Safety Stock" desc="Cadangan stok agar marketplace tidak pernah 0 saat gudang masih ada sisa">
                <input type="number" min={0} value={settings.default_buffer_stock || 0} onChange={e => updateField('default_buffer_stock', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Mode Sync Stok" desc="Realtime = setiap ada perubahan, Scheduled = berkala">
                <select value={settings.stock_sync_mode || 'realtime'} onChange={e => updateField('stock_sync_mode', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="realtime">Realtime</option>
                  <option value="scheduled">Scheduled (Terjadwal)</option>
                  <option value="manual">Manual</option>
                </select>
              </Field>
              <Field label="Auto Push Stok" desc="Otomatis kirim perubahan stok ke marketplace">
                <Toggle checked={settings.auto_push_stock ?? true} onChange={v => updateField('auto_push_stock', v)} />
              </Field>
              <Field label="Auto Deduct Stok" desc="Otomatis potong stok saat order masuk dari marketplace">
                <Toggle checked={settings.auto_deduct_stock ?? true} onChange={v => updateField('auto_deduct_stock', v)} />
              </Field>
            </div>
          </Section>

          {/* Price Settings */}
          <Section icon={DollarSign} title="Harga" desc="Mode sinkronisasi harga dan auto-push">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Mode Sync Harga" desc="Manual = hanya saat tombol ditekan">
                <select value={settings.price_sync_mode || 'manual'} onChange={e => updateField('price_sync_mode', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="manual">Manual</option>
                  <option value="on_change">Otomatis saat harga ERP berubah</option>
                  <option value="scheduled">Terjadwal</option>
                </select>
              </Field>
              <Field label="Auto Push Harga" desc="Jika harga ERP berubah, otomatis update ke marketplace">
                <Toggle checked={settings.auto_push_price ?? true} onChange={v => updateField('auto_push_price', v)} />
              </Field>
            </div>
          </Section>

          {/* Order Settings */}
          <Section icon={ShoppingCart} title="Pesanan" desc="Auto-accept, prefix, dan notifikasi">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Auto Accept Orders" desc="Otomatis terima pesanan baru (tidak perlu konfirmasi manual)">
                <Toggle checked={settings.auto_accept_orders ?? false} onChange={v => updateField('auto_accept_orders', v)} />
              </Field>
              <Field label="Prefix Order ERP" desc="Prefix untuk ID order saat di-import ke ERP">
                <input value={settings.order_prefix || 'MP'} onChange={e => updateField('order_prefix', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" maxLength={10} />
              </Field>
              <Field label="Email Notifikasi" desc="Email untuk notifikasi order baru">
                <input type="email" value={settings.notification_email || ''} onChange={e => updateField('notification_email', e.target.value)} placeholder="admin@toko.com" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
            </div>
          </Section>

          {/* Sync Settings */}
          <Section icon={RefreshCw} title="Sinkronisasi & Rate Limit" desc="Interval sync, rate limiting, dan retry">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Auto Sync Global" desc="Aktifkan/nonaktifkan semua auto-sync">
                <Toggle checked={settings.global_auto_sync ?? true} onChange={v => updateField('global_auto_sync', v)} />
              </Field>
              <Field label="Interval Sync (menit)" desc="Jarak waktu antar-sync otomatis (sebagai backup webhook)">
                <input type="number" min={5} max={1440} value={settings.sync_interval_minutes || 15} onChange={e => updateField('sync_interval_minutes', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Rate Limit (req/detik)" desc="Batas jumlah request ke API marketplace per detik">
                <input type="number" min={1} max={50} value={settings.rate_limit_per_second || 5} onChange={e => updateField('rate_limit_per_second', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Max Retry Attempts" desc="Berapa kali coba ulang jika gagal">
                <input type="number" min={0} max={10} value={settings.max_retry_attempts || 3} onChange={e => updateField('max_retry_attempts', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end pt-4">
            <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Pengaturan
            </button>
          </div>
        </div>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-6">
          <Section icon={Shield} title="Validasi Nama & Deskripsi Produk" desc="Batas karakter sesuai aturan masing-masing marketplace">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Maks. Panjang Nama Produk" desc="Shopee: 120, Tokopedia: 255, Lazada: 255">
                <input type="number" min={50} max={500} value={settings.product_name_max_length || 255} onChange={e => updateField('product_name_max_length', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Maks. Panjang Deskripsi" desc="Shopee: 3000, Tokopedia: 5000">
                <input type="number" min={500} max={10000} value={settings.product_desc_max_length || 3000} onChange={e => updateField('product_desc_max_length', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
            </div>
          </Section>

          <Section icon={Image} title="Validasi Gambar Produk" desc="Standar ukuran dan format gambar untuk marketplace">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Maks. Ukuran File (KB)" desc="Umumnya 2048 KB (2 MB)">
                <input type="number" min={100} max={10240} value={settings.image_max_size_kb || 2048} onChange={e => updateField('image_max_size_kb', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Min. Lebar (px)" desc="Minimal 500px untuk kualitas baik">
                <input type="number" min={100} max={2000} value={settings.image_min_width || 500} onChange={e => updateField('image_min_width', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Min. Tinggi (px)" desc="Minimal 500px (rasio 1:1 ideal)">
                <input type="number" min={100} max={2000} value={settings.image_min_height || 500} onChange={e => updateField('image_min_height', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Maks. Lebar (px)">
                <input type="number" min={500} max={10000} value={settings.image_max_width || 4000} onChange={e => updateField('image_max_width', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Maks. Tinggi (px)">
                <input type="number" min={500} max={10000} value={settings.image_max_height || 4000} onChange={e => updateField('image_max_height', parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end pt-4">
            <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan Validasi
            </button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Audit Trail</h3>
              <p className="text-xs text-gray-500">Log semua aktivitas sinkronisasi: stok, harga, order, mapping, dll.</p>
            </div>
            <button onClick={fetchAudit} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          </div>

          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tipe</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Platform</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Arah</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Items</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Durasi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400 text-sm">Belum ada log aktivitas</td></tr>
                ) : auditLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{log.sync_type?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5">{log.platform || '-'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${log.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : log.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {log.direction === 'outbound' ? '→ OUT' : log.direction === 'inbound' ? '← IN' : 'INT'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">{log.items_success || 0}/{log.items_processed || 0}</td>
                    <td className="px-4 py-2.5 text-center">
                      {log.is_success ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{log.duration_ms}ms</td>
                    <td className="px-4 py-2.5 text-red-500 max-w-[200px] truncate">{log.error_message || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </HQLayout>
  );
}

// ── Reusable Components ──
function Section({ icon: Icon, title, desc, children }: { icon: any; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gray-400" />
        <div><h4 className="font-semibold text-gray-900">{title}</h4><p className="text-xs text-gray-500">{desc}</p></div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
      {desc && <p className="text-[10px] text-gray-400 mb-1">{desc}</p>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function SettingsPage() {
  return (
    <ModuleGuard moduleCode="marketplace_integration">
      <SettingsContent />
    </ModuleGuard>
  );
}
