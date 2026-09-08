import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { OpsBadge, OpsPanel } from '@/components/humanify/ops-ui';
import OpsDataTable from '@/components/humanify/OpsDataTable';

type Ticket = {
  id: string;
  tenantId: string | null;
  tenantSlug: string | null;
  subject: string;
  body: string | null;
  source: string;
  status: string;
  priority: string;
  requesterEmail: string | null;
  assigneeEmail: string | null;
  createdAt: string;
};

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' | 'brand' {
  if (s === 'resolved' || s === 'closed') return 'success';
  if (s === 'critical' || s === 'in_progress') return 'danger';
  if (s === 'waiting' || s === 'assigned') return 'warning';
  if (s === 'new') return 'brand';
  return 'neutral';
}

export default function OpsSupportTickets({ onToast }: { onToast: (msg: string) => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', priority: 'medium', requesterEmail: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform?action=tickets').then((r) => r.json());
      if (res.success) {
        setTickets(res.data?.tickets || []);
        setOpenCount(res.data?.openCount || 0);
      } else onToast(res.error || 'Gagal memuat tiket');
    } catch {
      onToast('Gagal memuat tiket');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/platform?action=ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      if (!res.success) {
        onToast(res.error || 'Gagal membuat tiket');
        return;
      }
      onToast('Tiket dibuat');
      setForm({ subject: '', body: '', priority: 'medium', requesterEmail: '' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patch = async (id: string, body: Record<string, string>) => {
    const res = await fetch('/api/platform?action=ticket', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    }).then((r) => r.json());
    if (!res.success) onToast(res.error || 'Gagal mengubah tiket');
    else await load();
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <OpsDataTable
        rows={tickets}
        loading={loading}
        rowKey={(r) => r.id}
        searchPlaceholder="Cari subjek, status, atau klien…"
        emptyTitle="Belum ada tiket"
        emptyHint="Buat tiket dari formulir kanan atau catat laporan internal."
        hideExport
        filters={[
          {
            id: 'status',
            label: 'Status',
            options: [
              { value: 'new', label: 'Baru' },
              { value: 'in_progress', label: 'Dikerjakan' },
              { value: 'waiting', label: 'Menunggu' },
              { value: 'resolved', label: 'Selesai' },
              { value: 'closed', label: 'Tutup' },
            ],
            getValue: (r) => r.status,
          },
          {
            id: 'priority',
            label: 'Prioritas',
            options: [
              { value: 'critical', label: 'Kritis' },
              { value: 'high', label: 'Tinggi' },
              { value: 'medium', label: 'Sedang' },
              { value: 'low', label: 'Rendah' },
            ],
            getValue: (r) => r.priority,
          },
        ]}
        columns={[
          {
            id: 'subject',
            header: 'Tiket',
            cell: (r) => (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{r.subject}</p>
                <p className="truncate text-[11px] text-slate-400">{r.requesterEmail || r.source} · {openCount} terbuka</p>
              </div>
            ),
          },
          {
            id: 'tenant',
            header: 'Klien',
            cell: (r) => r.tenantId ? (
              <Link href={`/platform/tenants/${r.tenantId}`} className="text-xs hover:underline">/{r.tenantSlug}</Link>
            ) : <span className="text-xs text-slate-400">—</span>,
          },
          {
            id: 'priority',
            header: 'Prioritas',
            cell: (r) => <OpsBadge tone={r.priority === 'critical' || r.priority === 'high' ? 'danger' : 'neutral'}>{r.priority}</OpsBadge>,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (r) => (
              <select
                value={r.status}
                onChange={(e) => patch(r.id, { status: e.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              >
                <option value="new">Baru</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">Dikerjakan</option>
                <option value="waiting">Menunggu</option>
                <option value="resolved">Selesai</option>
                <option value="closed">Tutup</option>
              </select>
            ),
          },
          {
            id: 'badge',
            header: '',
            exportOmit: true,
            cell: (r) => <OpsBadge tone={statusTone(r.status)}>{r.status}</OpsBadge>,
          },
        ]}
      />
      <OpsPanel title="Tiket baru" description={`${openCount} masih terbuka`}>
        <form onSubmit={create} className="space-y-3">
          <label className="block text-xs font-medium text-slate-600">
            Subjek
            <input
              required
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Gagal bayar Midtrans — PT Contoh"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Detail
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Prioritas
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Email pemohon
            <input
              value={form.requesterEmail}
              onChange={(e) => setForm((f) => ({ ...f, requesterEmail: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="cs@klien.com"
            />
          </label>
          <button type="submit" disabled={saving} className="hf-btn-primary w-full text-sm disabled:opacity-50">
            {saving ? 'Menyimpan…' : 'Buat tiket'}
          </button>
        </form>
      </OpsPanel>
    </div>
  );
}
