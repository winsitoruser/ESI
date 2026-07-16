import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import type { HrisDataSource } from '@/lib/hris/data-source';
import EmployeePicker, { type PickedEmployee } from '@/components/humanify/EmployeePicker';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import HRStatCard from '@/components/humanify/HRStatCard';
import {
  Wallet, Receipt, Plus, Search, Check, X, Clock, ArrowLeft,
  Plane, Stethoscope, Car, Utensils, Upload, RefreshCw, DollarSign,
  AlertCircle, CheckCircle2, Ban,
} from 'lucide-react';

const CATEGORIES = [
  { key: 'medical', label: 'Medis & Kesehatan', icon: Stethoscope, limit: 2000000 },
  { key: 'transport', label: 'Transportasi', icon: Car, limit: 500000 },
  { key: 'meal', label: 'Makan & Representasi', icon: Utensils, limit: 500000 },
  { key: 'travel', label: 'Perjalanan Dinas', icon: Plane, limit: 5000000 },
  { key: 'other', label: 'Lainnya', icon: Receipt, limit: 1000000 },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Disetujui', color: 'bg-violet-100 text-violet-800' },
  paid: { label: 'Dibayar', color: 'bg-emerald-100 text-emerald-800' },
  reimbursed: { label: 'Direimburse', color: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Ditolak', color: 'bg-rose-100 text-rose-800' },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-600' },
};

interface ClaimRow {
  id: string;
  claim_number?: string;
  employee_name?: string;
  employee_id: string;
  claim_type: string;
  description?: string;
  amount: number;
  approved_amount?: number;
  status: string;
  claim_date: string;
  receipt_url?: string;
  department?: string;
}

export default function ReimbursementPage() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [dataSource, setDataSource] = useState<HrisDataSource>('empty');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [pickedEmployee, setPickedEmployee] = useState<PickedEmployee | null>(null);
  const [form, setForm] = useState({ claim_type: 'transport', amount: '', description: '', claim_date: new Date().toISOString().slice(0, 10) });
  const [ocrLoading, setOcrLoading] = useState(false);

  const showToast = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
  const catLimit = (key: string) => CATEGORIES.find(c => c.key === key)?.limit || 1000000;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `&status=${statusFilter}` : '';
      const res = await fetch(`/api/humanify/workflow?action=claims${q}`);
      const json = await res.json();
      if (json.success) {
        const rows = (json.data || []).map((c: any) => ({
          id: c.id,
          claim_number: c.claim_number,
          employee_name: c.employee_name || `Karyawan`,
          employee_id: c.employee_id,
          claim_type: c.claim_type,
          description: c.description,
          amount: parseFloat(c.amount) || 0,
          approved_amount: c.approved_amount ? parseFloat(c.approved_amount) : undefined,
          status: c.status,
          claim_date: c.claim_date,
          receipt_url: c.receipt_url,
          department: c.department,
        }));
        setClaims(rows);
        setDataSource(rows.length ? 'live' : 'empty');
      }
    } catch {
      showToast('Gagal memuat klaim', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string, amount: number) => {
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/workflow?action=approve-claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approved_amount: amount }),
      });
      const json = await res.json();
      if (json.success) { showToast('Klaim disetujui'); load(); }
      else showToast(json.error || 'Gagal menyetujui', 'error');
    } catch { showToast('Gagal menyetujui', 'error'); }
    finally { setSaving(false); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Alasan penolakan:');
    if (!reason) return;
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/workflow?action=reject-claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rejection_reason: reason }),
      });
      const json = await res.json();
      if (json.success) { showToast('Klaim ditolak'); load(); }
      else showToast(json.error || 'Gagal menolak', 'error');
    } catch { showToast('Gagal menolak', 'error'); }
    finally { setSaving(false); }
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/humanify/receipt-ocr', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, filename: file.name, mimeType: file.type }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setForm(f => ({
          ...f,
          amount: d.amount ? String(d.amount) : f.amount,
          claim_date: d.date || f.claim_date,
          description: d.description || f.description,
          claim_type: d.category && d.category !== 'other' ? d.category : f.claim_type,
        }));
        showToast(`Struk terbaca (${d.confidence}% confidence)`);
      }
    } catch { showToast('Gagal membaca struk', 'error'); }
    finally { setOcrLoading(false); e.target.value = ''; }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickedEmployee) { showToast('Pilih karyawan', 'error'); return; }
    if (!form.amount) { showToast('Jumlah wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/workflow?action=claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: pickedEmployee.id,
          claim_type: form.claim_type,
          amount: parseFloat(form.amount),
          description: form.description,
          claim_date: form.claim_date,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Klaim berhasil diajukan');
        setShowModal(false);
        setForm({ claim_type: 'transport', amount: '', description: '', claim_date: new Date().toISOString().slice(0, 10) });
        setPickedEmployee(null);
        load();
      } else showToast(json.error || 'Gagal mengajukan', 'error');
    } catch { showToast('Gagal mengajukan', 'error'); }
    finally { setSaving(false); }
  };

  const filtered = claims.filter(c => {
    if (filter && c.claim_type !== filter) return false;
    if (search && !c.employee_name?.toLowerCase().includes(search.toLowerCase()) && !c.description?.toLowerCase().includes(search.toLowerCase()) && !c.claim_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pending = claims.filter(c => c.status === 'pending');
  const totalPending = pending.reduce((s, c) => s + c.amount, 0);
  const approved = claims.filter(c => c.status === 'approved' || c.status === 'paid');

  return (
    <PageGuard anyPermission={['travel.view', 'travel.*', 'employees.*']} title="Reimbursement" description="Klaim reimbursement karyawan">
      <HQLayout title="Reimbursement" subtitle="Klaim anti-ribet, approval real-time, terintegrasi payroll">
        {toast && <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-white shadow-lg ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>{toast.msg}</div>}

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/humanify/ess" className="rounded-xl border p-2 hover:bg-gray-50"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="flex-1">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Wallet className="h-5 w-5 text-emerald-600" /> Reimbursement Karyawan</h2>
              <p className="text-sm text-gray-500">Ajukan klaim, pantau approval, otomatis masuk payroll</p>
            </div>
            <button onClick={load} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Ajukan Klaim
            </button>
            <DataSourceBadge source={dataSource} />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <HRStatCard label="Menunggu Approval" value={pending.length} sub={fmt(totalPending)} icon={Clock} gradient="from-amber-500 to-orange-600" />
            <HRStatCard label="Total Klaim" value={claims.length} sub={fmt(claims.reduce((s, c) => s + c.amount, 0))} icon={Receipt} gradient="from-violet-500 to-indigo-600" />
            <HRStatCard label="Disetujui" value={approved.length} icon={CheckCircle2} gradient="from-emerald-500 to-teal-600" />
            <HRStatCard label="Integrasi Payroll" value="Auto" sub="Klaim approved → komponen gaji" icon={DollarSign} gradient="from-violet-500 to-purple-700" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('')} className={`rounded-xl px-3 py-1.5 text-sm ${!filter ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Semua</button>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setFilter(c.key)} className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm ${filter === c.key ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>
                <c.icon className="h-3 w-3" />{c.label}
              </button>
            ))}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="ml-auto rounded-xl border px-3 py-1.5 text-sm">
              <option value="">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan, no. klaim, atau deskripsi..." className="w-full rounded-xl border py-2 pl-9 pr-4 text-sm" />
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="p-3 text-left font-medium">No. Klaim</th>
                  <th className="p-3 text-left font-medium">Karyawan</th>
                  <th className="p-3 text-left font-medium">Kategori</th>
                  <th className="p-3 text-left font-medium">Deskripsi</th>
                  <th className="p-3 text-right font-medium">Jumlah</th>
                  <th className="p-3 text-right font-medium">Limit</th>
                  <th className="p-3 text-center font-medium">Status</th>
                  <th className="p-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada klaim reimbursement</td></tr>
                ) : filtered.map(c => {
                  const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
                  const overLimit = c.amount > catLimit(c.claim_type);
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50/80">
                      <td className="p-3 font-mono text-xs text-gray-500">{c.claim_number || c.id.slice(0, 8)}</td>
                      <td className="p-3">
                        <p className="font-medium">{c.employee_name}</p>
                        {c.department && <p className="text-xs text-gray-400">{c.department}</p>}
                      </td>
                      <td className="p-3 capitalize">{c.claim_type}</td>
                      <td className="p-3 text-gray-600">{c.description || '-'}</td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${overLimit ? 'text-rose-600' : ''}`}>{fmt(c.amount)}</span>
                        {overLimit && <AlertCircle className="ml-1 inline h-3 w-3 text-rose-500" />}
                      </td>
                      <td className="p-3 text-right text-gray-400">{fmt(catLimit(c.claim_type))}</td>
                      <td className="p-3 text-center"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span></td>
                      <td className="p-3 text-center">
                        {c.status === 'pending' && (
                          <div className="flex justify-center gap-1">
                            <button disabled={saving} onClick={() => handleApprove(c.id, c.amount)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50" title="Setujui"><Check className="h-4 w-4" /></button>
                            <button disabled={saving} onClick={() => handleReject(c.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" title="Tolak"><X className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 text-sm text-violet-900">
            <strong>Integrasi Payroll:</strong> Klaim yang disetujui otomatis masuk ke komponen payroll periode berjalan. Notifikasi real-time ke karyawan & HR saat status berubah.
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">Ajukan Klaim Baru</h3>
                <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <EmployeePicker value={pickedEmployee?.id} onChange={setPickedEmployee} required />
                <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="rounded-lg bg-violet-100 p-2"><Upload className="h-4 w-4 text-violet-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-violet-900">Scan Struk dengan AI OCR</p>
                      <p className="text-xs text-violet-600">{ocrLoading ? 'Membaca struk...' : 'Upload foto kwitansi — amount & kategori terisi otomatis'}</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleReceiptScan} disabled={ocrLoading} />
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Kategori</label>
                  <select value={form.claim_type} onChange={e => setForm(f => ({ ...f, claim_type: e.target.value }))} className="w-full rounded-xl border px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label} (limit {fmt(c.limit)})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Jumlah (Rp)</label>
                    <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full rounded-xl border px-3 py-2 text-sm" required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Tanggal</label>
                    <input type="date" value={form.claim_date} onChange={e => setForm(f => ({ ...f, claim_date: e.target.value }))} className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Deskripsi</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Contoh: Taksi ke klien Bandung" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border px-4 py-2 text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    <Upload className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Ajukan Klaim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </HQLayout>
    </PageGuard>
  );
}
