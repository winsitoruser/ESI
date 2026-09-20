import { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, SectionHeader } from '@/components/employee/portal-ui';

const API = '/api/employee/mutation-request';

export default function MutationRequestCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    mutation_type: 'transfer',
    effective_date: '',
    to_department: '',
    to_position: '',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      const json = await res.json();
      if (json.success) setRows(json.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.effective_date) { toast.error('Tanggal efektif wajib'); return; }
    if (!form.to_department && !form.to_position) {
      toast.error('Isi departemen atau posisi tujuan');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Pengajuan mutasi terkirim');
        setOpen(false);
        setForm({ mutation_type: 'transfer', effective_date: '', to_department: '', to_position: '', reason: '' });
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
          className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg inline-flex items-center gap-1"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" /> Ajukan
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t pt-3">
          <select
            value={form.mutation_type}
            onChange={(e) => setForm({ ...form, mutation_type: e.target.value })}
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
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Departemen tujuan"
            value={form.to_department}
            onChange={(e) => setForm({ ...form, to_department: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Posisi / jabatan tujuan"
            value={form.to_position}
            onChange={(e) => setForm({ ...form, to_position: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Alasan pengajuan"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={2}
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
        <p className="text-xs text-slate-400">Belum ada pengajuan mutasi</p>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r) => (
            <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex justify-between gap-2">
              <div>
                <p className="font-medium text-slate-800">{r.mutation_number || r.mutation_type}</p>
                <p className="text-slate-500">{r.to_department || '-'} / {r.to_position || '-'}</p>
              </div>
              <span className="shrink-0 text-slate-600">{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
