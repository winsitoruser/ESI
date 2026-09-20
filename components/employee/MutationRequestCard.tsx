import { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, SectionHeader } from '@/components/employee/portal-ui';
import { MUTATION_STATUS_LABELS, MUTATION_TYPE_LABELS, type MutationStatus, type MutationType } from '@/lib/hris/mutation-workflow';
import { isMutationDeferredPending } from '@/lib/hris/mutation-apply-due';

const API = '/api/employee/mutation-request';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  executed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-slate-100 text-slate-600',
};

function statusLabelId(status: string): string {
  if (isMutationDeferredPending(status, null)) return 'Menunggu efektif';
  return MUTATION_STATUS_LABELS[status as MutationStatus] || status;
}

export default function MutationRequestCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [form, setForm] = useState({
    mutation_type: 'transfer',
    effective_date: '',
    to_department: '',
    to_position: '',
    to_branch_id: '',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const json = await res.json();
      if (json.success) {
        setRows(json.data || []);
        setBranches(Array.isArray(json.branches) ? json.branches : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.effective_date) { toast.error('Tanggal efektif wajib'); return; }
    if (!form.to_department && !form.to_position && !form.to_branch_id) {
      toast.error('Isi departemen, posisi, atau cabang tujuan');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          to_branch_id: form.to_branch_id || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Pengajuan mutasi terkirim');
        setOpen(false);
        setForm({
          mutation_type: 'transfer',
          effective_date: '',
          to_department: '',
          to_position: '',
          to_branch_id: '',
          reason: '',
        });
        load();
      } else toast.error(json.error || 'Gagal mengajukan');
    } catch {
      toast.error('Gagal mengajukan mutasi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="Mutasi & Penempatan" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Ajukan mutasi"
          className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-1"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden /> Ajukan
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t pt-3">
          <select
            value={form.mutation_type}
            onChange={(e) => setForm({ ...form, mutation_type: e.target.value })}
            aria-label="Jenis mutasi"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="transfer">Mutasi / Pindah</option>
            <option value="promotion">Promosi</option>
            <option value="rotation">Rotasi</option>
            <option value="assignment">Penugasan</option>
          </select>
          <input
            type="date"
            value={form.effective_date}
            onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
            aria-label="Tanggal efektif mutasi"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          {branches.length > 0 && (
            <select
              value={form.to_branch_id}
              onChange={(e) => setForm({ ...form, to_branch_id: e.target.value })}
              aria-label="Cabang tujuan"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Cabang tujuan (opsional)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</option>
              ))}
            </select>
          )}
          <input
            placeholder="Departemen tujuan"
            value={form.to_department}
            onChange={(e) => setForm({ ...form, to_department: e.target.value })}
            aria-label="Departemen tujuan"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Posisi / jabatan tujuan"
            value={form.to_position}
            onChange={(e) => setForm({ ...form, to_position: e.target.value })}
            aria-label="Posisi tujuan"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Alasan pengajuan"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={2}
            aria-label="Alasan pengajuan mutasi"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Kirim pengajuan
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400">Memuat riwayat…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-400" role="status">Belum ada pengajuan mutasi</p>
      ) : (
        <div className="space-y-2" aria-label="Riwayat pengajuan mutasi">
          {rows.slice(0, 5).map((r) => {
            const deferred = isMutationDeferredPending(r.status, r.effective_date);
            const label = deferred
              ? 'Menunggu efektif'
              : (MUTATION_STATUS_LABELS[r.status as MutationStatus] || statusLabelId(r.status));
            const badgeClass = deferred
              ? 'bg-sky-100 text-sky-800'
              : (STATUS_BADGE[r.status] || 'bg-slate-100 text-slate-600');
            return (
              <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {r.mutation_number || MUTATION_TYPE_LABELS[r.mutation_type as MutationType] || r.mutation_type}
                  </p>
                  <p className="text-slate-500">{r.to_department || '-'} / {r.to_position || '-'}</p>
                  {deferred && (
                    <p className="text-sky-700 mt-0.5">
                      Disetujui — penempatan menunggu {r.effective_date
                        ? new Date(r.effective_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'tanggal efektif'}
                    </p>
                  )}
                  {r.status === 'executed' && (
                    <p className="text-emerald-700 mt-0.5">Penempatan sudah diterapkan</p>
                  )}
                </div>
                <span className={`shrink-0 self-start px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeClass}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
