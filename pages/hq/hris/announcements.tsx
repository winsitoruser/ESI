import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  Megaphone, Plus, Search, Filter, Pin, Eye, Edit, Trash2, X, CheckCircle,
  AlertCircle, Users, Calendar, Send, Clock, ArrowUp, ArrowDown, Bell
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'urgent' | 'hr_policy' | 'company_news' | 'event' | 'training';
  priority: 'low' | 'normal' | 'high';
  targetAudience: 'all' | 'department' | 'branch';
  targetDepartment?: string;
  targetBranch?: string;
  isPinned: boolean;
  status: 'draft' | 'published' | 'archived';
  publishDate?: string;
  expireDate?: string;
  viewCount: number;
  createdBy?: string;
  createdAt?: string;
}

const CATEGORY_CONF: Record<string, { label: string; color: string }> = {
  general: { label: 'Umum', color: 'bg-blue-100 text-blue-700' },
  urgent: { label: 'Mendesak', color: 'bg-red-100 text-red-700' },
  hr_policy: { label: 'Kebijakan HR', color: 'bg-purple-100 text-purple-700' },
  company_news: { label: 'Berita Perusahaan', color: 'bg-green-100 text-green-700' },
  event: { label: 'Event', color: 'bg-orange-100 text-orange-700' },
  training: { label: 'Training', color: 'bg-indigo-100 text-indigo-700' },
};

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'Kebijakan Cuti Lebaran 2026', content: 'Diinformasikan kepada seluruh karyawan bahwa cuti bersama Idul Fitri 2026 adalah tanggal 29 Maret - 2 April 2026. Batas pengajuan cuti tambahan paling lambat 15 Maret 2026.', category: 'hr_policy', priority: 'high', targetAudience: 'all', isPinned: true, status: 'published', publishDate: '2026-03-01', viewCount: 142, createdBy: 'HR Admin', createdAt: '2026-03-01' },
  { id: 'a2', title: 'Pelatihan Food Safety Wajib - Batch 3', content: 'Seluruh karyawan operasional wajib mengikuti pelatihan Food Safety & Hygiene Batch 3 yang akan diselenggarakan tanggal 18-19 Maret 2026.', category: 'training', priority: 'high', targetAudience: 'department', targetDepartment: 'Operations', isPinned: true, status: 'published', publishDate: '2026-03-05', viewCount: 89, createdBy: 'Training Team', createdAt: '2026-03-05' },
  { id: 'a3', title: 'Deadline Input Timesheet Maret', content: 'Batas input timesheet bulan Maret 2026 adalah 28 Maret 2026 pukul 23:59 WIB. Pastikan semua data lembur dan aktivitas sudah terinput.', category: 'general', priority: 'normal', targetAudience: 'all', isPinned: false, status: 'published', publishDate: '2026-03-10', viewCount: 98, createdBy: 'Payroll Team' },
  { id: 'a4', title: 'Gathering Karyawan Q2 2026', content: 'Company gathering akan diselenggarakan 15 April 2026 di Puncak Resort. Detail dan agenda akan diinfokan lebih lanjut.', category: 'event', priority: 'normal', targetAudience: 'all', isPinned: false, status: 'published', publishDate: '2026-03-12', viewCount: 124, createdBy: 'HR Admin' },
];

export default function HRISAnnouncementsPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [viewing, setViewing] = useState<Announcement | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [form, setForm] = useState<Partial<Announcement>>({
    title: '', content: '', category: 'general', priority: 'normal',
    targetAudience: 'all', isPinned: false, status: 'draft'
  });

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setMounted(true);
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res = await fetch('/api/hq/hris/engagement?action=announcements');
      const json = await res.json().catch(() => null);
      const list = json?.data || json?.announcements || [];
      if (Array.isArray(list) && list.length > 0) {
        setItems(list.map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content || a.body || '',
          category: a.category || 'general',
          priority: a.priority || 'normal',
          targetAudience: a.target_audience || a.targetAudience || 'all',
          targetDepartment: a.target_department || a.targetDepartment,
          targetBranch: a.target_branch || a.targetBranch,
          isPinned: Boolean(a.is_pinned || a.isPinned),
          status: a.status || 'published',
          publishDate: a.publish_date || a.publishDate,
          expireDate: a.expire_date || a.expireDate,
          viewCount: Number(a.view_count || a.viewCount || 0),
          createdBy: a.created_by || a.createdBy,
          createdAt: a.created_at || a.createdAt,
        })));
      } else {
        setItems(MOCK_ANNOUNCEMENTS);
      }
    } catch {
      setItems(MOCK_ANNOUNCEMENTS);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.title || !form.content) {
      showToast('error', 'Judul dan konten wajib diisi');
      return;
    }
    try {
      const url = editing
        ? `/api/hq/hris/engagement?action=announcement&id=${editing.id}`
        : '/api/hq/hris/engagement?action=announcement';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        showToast('success', editing ? 'Pengumuman diperbarui' : 'Pengumuman diterbitkan');
        await fetchAnnouncements();
        setShowModal(false);
        setEditing(null);
        setForm({ title: '', content: '', category: 'general', priority: 'normal', targetAudience: 'all', isPinned: false, status: 'draft' });
      } else {
        throw new Error('Gagal simpan');
      }
    } catch {
      // Optimistic fallback
      const newItem: Announcement = {
        id: editing?.id || `local-${Date.now()}`,
        title: form.title || '',
        content: form.content || '',
        category: (form.category as any) || 'general',
        priority: (form.priority as any) || 'normal',
        targetAudience: (form.targetAudience as any) || 'all',
        targetDepartment: form.targetDepartment,
        targetBranch: form.targetBranch,
        isPinned: form.isPinned || false,
        status: (form.status as any) || 'published',
        publishDate: new Date().toISOString().slice(0, 10),
        viewCount: 0,
        createdBy: 'Anda',
      };
      if (editing) {
        setItems((p) => p.map((i) => (i.id === editing.id ? newItem : i)));
      } else {
        setItems((p) => [newItem, ...p]);
      }
      showToast('success', editing ? 'Pengumuman diperbarui (lokal)' : 'Pengumuman diterbitkan (lokal)');
      setShowModal(false);
      setEditing(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return;
    try {
      await fetch(`/api/hq/hris/engagement?action=announcement&id=${id}`, { method: 'DELETE' });
    } catch {}
    setItems((p) => p.filter((i) => i.id !== id));
    showToast('success', 'Pengumuman dihapus');
  }

  async function togglePin(item: Announcement) {
    const updated = { ...item, isPinned: !item.isPinned };
    setItems((p) => p.map((i) => (i.id === item.id ? updated : i)));
    try {
      await fetch(`/api/hq/hris/engagement?action=announcement&id=${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: updated.isPinned, is_pinned: updated.isPinned })
      });
    } catch {}
  }

  const filtered = useMemo(() => {
    return items.filter((a) => {
      const matchSearch = !searchQuery ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.publishDate || '').localeCompare(a.publishDate || '');
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  if (!mounted) return null;

  return (
    <HQLayout title="Pengumuman" subtitle="Broadcast pengumuman & kebijakan HR ke seluruh karyawan">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Aktif', value: items.filter(i => i.status === 'published').length, icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'Dipin', value: items.filter(i => i.isPinned).length, icon: Pin, color: 'text-orange-600', bg: 'bg-orange-100' },
            { label: 'Mendesak', value: items.filter(i => i.priority === 'high').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
            { label: 'Draft', value: items.filter(i => i.status === 'draft').length, icon: Edit, color: 'text-gray-600', bg: 'bg-gray-100' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari pengumuman..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Kategori</option>
              {Object.entries(CATEGORY_CONF).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Status</option>
              <option value="published">Diterbitkan</option>
              <option value="draft">Draft</option>
              <option value="archived">Arsip</option>
            </select>
          </div>
          <button onClick={() => { setEditing(null); setForm({ title: '', content: '', category: 'general', priority: 'normal', targetAudience: 'all', isPinned: false, status: 'published' }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Buat Pengumuman
          </button>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-center py-8 text-gray-500 text-sm">Memuat...</div>}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
              <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada pengumuman</p>
            </div>
          )}
          {filtered.map((a) => {
            const catConf = CATEGORY_CONF[a.category] || CATEGORY_CONF.general;
            return (
              <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition ${a.isPinned ? 'ring-2 ring-orange-200' : ''} ${a.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      {a.isPinned && <Pin className="w-4 h-4 text-orange-500" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${catConf.color}`}>{catConf.label}</span>
                      {a.priority === 'high' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Mendesak</span>}
                      {a.status === 'draft' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Draft</span>}
                      <span className="text-xs text-gray-400">{a.publishDate}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{a.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{a.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {a.targetAudience === 'all' ? 'Semua karyawan' : a.targetDepartment || a.targetBranch}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {a.viewCount} dilihat</span>
                      {a.createdBy && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> oleh {a.createdBy}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewing(a)} className="p-2 hover:bg-gray-100 rounded-lg" title="Lihat"><Eye className="w-4 h-4 text-gray-600" /></button>
                    <button onClick={() => togglePin(a)} className={`p-2 hover:bg-gray-100 rounded-lg ${a.isPinned ? 'text-orange-500' : 'text-gray-400'}`} title="Pin">
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditing(a); setForm(a); setShowModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit"><Edit className="w-4 h-4 text-gray-600" /></button>
                    <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${(CATEGORY_CONF[viewing.category] || CATEGORY_CONF.general).color}`}>{(CATEGORY_CONF[viewing.category] || CATEGORY_CONF.general).label}</span>
                  {viewing.priority === 'high' && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Mendesak</span>}
                </div>
                <h3 className="text-xl font-bold">{viewing.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{viewing.publishDate} • {viewing.createdBy}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 text-sm text-gray-700 whitespace-pre-wrap">{viewing.content}</div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">{editing ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul *</label>
                <input type="text" value={form.title || ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Judul pengumuman..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Konten *</label>
                <textarea value={form.content || ''} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={6} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Isi pengumuman..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Kategori</label>
                  <select value={form.category || 'general'} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(CATEGORY_CONF).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioritas</label>
                  <select value={form.priority || 'normal'} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="low">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi / Mendesak</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audiens</label>
                  <select value={form.targetAudience || 'all'} onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="all">Semua Karyawan</option>
                    <option value="department">Per Departemen</option>
                    <option value="branch">Per Cabang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={form.status || 'published'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="draft">Draft</option>
                    <option value="published">Terbitkan</option>
                    <option value="archived">Arsip</option>
                  </select>
                </div>
              </div>
              {form.targetAudience === 'department' && (
                <input type="text" value={form.targetDepartment || ''} onChange={(e) => setForm((f) => ({ ...f, targetDepartment: e.target.value }))}
                  placeholder="Nama departemen..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              )}
              {form.targetAudience === 'branch' && (
                <input type="text" value={form.targetBranch || ''} onChange={(e) => setForm((f) => ({ ...f, targetBranch: e.target.value }))}
                  placeholder="Nama cabang..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isPinned || false} onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))} className="rounded" />
                Sematkan di atas (Pin)
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-white">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2">
                <Send className="w-4 h-4" /> {editing ? 'Simpan Perubahan' : 'Terbitkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}
