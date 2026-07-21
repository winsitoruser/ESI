import { useCallback, useEffect, useMemo, useState } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import type { HrisDataSource } from '@/lib/hris/data-source';
import {
  LifeBuoy, Plus, Search, MessageSquare, Clock, CheckCircle2, AlertTriangle,
  X, Send, RefreshCw, Filter, ChevronRight,
} from 'lucide-react';

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  requester_name?: string;
  requester_email?: string;
  comment_count?: number;
  created_at?: string;
  updated_at?: string;
  resolution_note?: string;
};

type Comment = {
  id: string;
  author_name?: string;
  author_email?: string;
  body: string;
  is_staff?: boolean;
  created_at?: string;
};

const CATEGORIES: Record<string, string> = {
  bug: 'Bug / Error',
  billing: 'Billing & Langganan',
  payroll: 'Payroll',
  attendance: 'Absensi & Cuti',
  access: 'Akses & Login',
  feature_request: 'Permintaan Fitur',
  other: 'Lainnya',
};

const PRIORITIES: Record<string, string> = {
  low: 'Rendah',
  normal: 'Normal',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

const STATUSES: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand)]' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  waiting_customer: { label: 'Menunggu Anda', color: 'bg-purple-100 text-purple-800' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' },
};

const EMPTY_SUMMARY = { total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 };

export default function SupportTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'normal',
  });

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (q.trim()) params.set('q', q.trim());
      const [listRes, sumRes] = await Promise.all([
        fetch(`/api/humanify/support?${params}`),
        fetch('/api/humanify/support?action=summary'),
      ]);
      const listJson = await listRes.json();
      const sumJson = await sumRes.json();
      setTickets(Array.isArray(listJson.data) ? listJson.data : []);
      setDataSource(listJson.dataSource || (listJson.data?.length ? 'live' : 'empty'));
      setSummary(sumJson.data || EMPTY_SUMMARY);
    } catch {
      setTickets([]);
      setDataSource('empty');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (ticket: Ticket) => {
    setSelected(ticket);
    setReply('');
    try {
      const res = await fetch(`/api/humanify/support?action=detail&id=${ticket.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSelected(json.data);
        setComments(json.data.comments || []);
      }
    } catch {
      setComments([]);
    }
  };

  const createTicket = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      showToast('error', 'Subjek dan deskripsi wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal membuat tiket');
      showToast('success', `Tiket ${json.data?.ticket_number || ''} dibuat`);
      setShowCreate(false);
      setForm({ subject: '', description: '', category: 'other', priority: 'normal' });
      await load();
      if (json.data) openDetail(json.data);
    } catch (e: any) {
      showToast('error', e.message || 'Gagal membuat tiket');
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/support?action=comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selected.id, body: reply }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal mengirim balasan');
      setReply('');
      await openDetail(selected);
      await load();
      showToast('success', 'Balasan terkirim');
    } catch (e: any) {
      showToast('error', e.message || 'Gagal mengirim balasan');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/humanify/support?id=${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal memperbarui status');
      await openDetail(selected);
      await load();
      showToast('success', 'Status diperbarui');
    } catch (e: any) {
      showToast('error', e.message || 'Gagal memperbarui');
    } finally {
      setSaving(false);
    }
  };

  const cards = useMemo(
    () => [
      { label: 'Total Tiket', value: summary.total, icon: LifeBuoy },
      { label: 'Open', value: summary.open, icon: MessageSquare },
      { label: 'In Progress', value: summary.in_progress, icon: Clock },
      { label: 'Resolved', value: summary.resolved, icon: CheckCircle2 },
    ],
    [summary],
  );

  return (
    <HQLayout
      title="Tiket Support"
      subtitle="Pengaduan & permintaan bantuan ke tim Humanify"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[color:var(--hf-brand)]" />
            <h2 className="text-lg font-semibold text-gray-900">Tiket Support</h2>
            <DataSourceBadge source={dataSource} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--hf-brand)] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Buat Tiket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="bg-white border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]">
                  <c.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                  <p className="text-xs text-gray-500">{c.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari subjek / nomor tiket…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm"
            >
              <option value="all">Semua status</option>
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm"
            >
              <option value="all">Semua kategori</option>
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Memuat tiket…</div>
          ) : tickets.length === 0 ? (
            <div className="p-6">
              <HrisEmptyState
                title="Belum ada tiket support"
                description="Buat tiket untuk melaporkan bug, pertanyaan billing, atau permintaan bantuan ke tim Humanify."
                action={
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[var(--hf-brand)] text-white"
                  >
                    <Plus className="w-4 h-4" /> Buat Tiket Pertama
                  </button>
                }
              />
            </div>
          ) : (
            <div className="divide-y">
              {tickets.map((t) => {
                const st = STATUSES[t.status] || STATUSES.open;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => openDetail(t)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">{t.ticket_number}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {t.priority === 'urgent' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Mendesak
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {CATEGORIES[t.category] || t.category}
                        {t.comment_count ? ` · ${t.comment_count} balasan` : ''}
                        {t.created_at ? ` · ${new Date(t.created_at).toLocaleString('id-ID')}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Buat Tiket Support</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Subjek *</label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Ringkas masalah Anda"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Kategori</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Prioritas</label>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITIES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Deskripsi *</label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Jelaskan kendala, langkah reproduksi, atau detail permintaan…"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm border rounded-lg">
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={createTicket}
                className="px-3 py-2 text-sm rounded-lg bg-[var(--hf-brand)] text-white disabled:opacity-60"
              >
                {saving ? 'Mengirim…' : 'Kirim Tiket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-start justify-between px-5 py-4 border-b gap-3">
              <div>
                <p className="text-xs font-mono text-gray-500">{selected.ticket_number}</p>
                <h3 className="font-semibold text-gray-900">{selected.subject}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${(STATUSES[selected.status] || STATUSES.open).color}`}>
                    {(STATUSES[selected.status] || STATUSES.open).label}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {CATEGORIES[selected.category] || selected.category}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {PRIORITIES[selected.priority] || selected.priority}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {selected.description}
              </div>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={saving || selected.status === s}
                    onClick={() => updateStatus(s)}
                    className="text-xs px-2.5 py-1 border rounded-full hover:bg-gray-50 disabled:opacity-40"
                  >
                    {(STATUSES[s] || { label: s }).label}
                  </button>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Percakapan</h4>
                <div className="space-y-2">
                  {comments.length === 0 && (
                    <p className="text-xs text-gray-500">Belum ada balasan.</p>
                  )}
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-3 text-sm ${c.is_staff ? 'bg-[var(--hf-brand-50)] border-[var(--hf-brand-100)]' : 'bg-white'}`}
                    >
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-800">
                          {c.author_name || c.author_email || 'User'}
                          {c.is_staff ? ' · Tim Humanify' : ''}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {c.created_at ? new Date(c.created_at).toLocaleString('id-ID') : ''}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t p-4 flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                placeholder="Tulis balasan…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <button
                type="button"
                disabled={saving || !reply.trim()}
                onClick={sendReply}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--hf-brand)] text-white text-sm disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-[60] px-4 py-2 rounded-lg text-sm shadow-lg ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}
