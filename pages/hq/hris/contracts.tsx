import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  FileText, Plus, Search, Filter, Calendar, AlertTriangle, CheckCircle,
  X, Edit, Trash2, RefreshCw, XCircle, Clock, DollarSign, User, Building2, Download, Bell
} from 'lucide-react';

interface Contract {
  id: string;
  employeeId: number | string;
  employeeName?: string;
  contractType: string;
  contractNumber: string;
  startDate: string;
  endDate?: string | null;
  probationEnd?: string | null;
  status: string;
  salary?: number | null;
  position?: string;
  department?: string;
  renewalCount?: number;
  notes?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PKWT: { label: 'PKWT (Kontrak)', color: 'bg-blue-100 text-blue-700' },
  PKWTT: { label: 'PKWTT (Tetap)', color: 'bg-green-100 text-green-700' },
  MAGANG: { label: 'Magang', color: 'bg-purple-100 text-purple-700' },
  FREELANCE: { label: 'Freelance', color: 'bg-orange-100 text-orange-700' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Kedaluwarsa', color: 'bg-red-100 text-red-700' },
  terminated: { label: 'Diterminasi', color: 'bg-gray-200 text-gray-700' },
  renewed: { label: 'Diperpanjang', color: 'bg-blue-100 text-blue-700' },
};

function fmtIDR(n?: number | null) {
  if (!n) return '-';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export default function ContractsPage() {
  const [mounted, setMounted] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [overview, setOverview] = useState<any>({ total: 0, active: 0, expiring: 0, expired: 0, byType: {} });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [form, setForm] = useState<Partial<Contract>>({
    contractType: 'PKWT', status: 'active',
  });

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { setMounted(true); fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [cRes, oRes] = await Promise.all([
        fetch('/api/hq/hris/lifecycle?action=contracts'),
        fetch('/api/hq/hris/lifecycle?action=contracts-overview'),
      ]);
      const cJson = await cRes.json();
      const oJson = await oRes.json();
      const list = (cJson?.data || []).map((c: any) => ({
        id: c.id,
        employeeId: c.employeeId || c.employee_id,
        employeeName: c.employeeName || c.employee_name || '',
        contractType: c.contractType || c.contract_type,
        contractNumber: c.contractNumber || c.contract_number || '',
        startDate: c.startDate || c.start_date,
        endDate: c.endDate || c.end_date,
        probationEnd: c.probationEnd || c.probation_end,
        status: c.status,
        salary: c.salary,
        position: c.position,
        department: c.department,
        renewalCount: c.renewalCount || c.renewal_count || 0,
        notes: c.notes,
      }));
      setContracts(list);
      if (oJson?.data) setOverview(oJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.employeeId || !form.contractType || !form.startDate) {
      showToast('error', 'Employee ID, tipe, dan tanggal mulai wajib');
      return;
    }
    try {
      const url = editing
        ? `/api/hq/hris/lifecycle?action=contract&id=${editing.id}`
        : '/api/hq/hris/lifecycle?action=contract';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('success', editing ? 'Kontrak diperbarui' : 'Kontrak dibuat');
      setShowModal(false);
      setEditing(null);
      setForm({ contractType: 'PKWT', status: 'active' });
      await fetchAll();
    } catch {
      showToast('error', 'Gagal menyimpan kontrak');
    }
  }

  async function handleRenew() {
    if (!selected) return;
    try {
      const res = await fetch(`/api/hq/hris/lifecycle?action=contract-renew&id=${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('success', 'Kontrak diperpanjang');
      setShowRenewModal(false);
      setSelected(null);
      await fetchAll();
    } catch {
      showToast('error', 'Gagal memperpanjang kontrak');
    }
  }

  async function handleTerminate(c: Contract) {
    const reason = prompt('Alasan terminasi:');
    if (!reason) return;
    try {
      const res = await fetch(`/api/hq/hris/lifecycle?action=contract-terminate&id=${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminationReason: reason }),
      });
      if (!res.ok) throw new Error();
      showToast('success', 'Kontrak diterminasi');
      await fetchAll();
    } catch {
      showToast('error', 'Gagal terminasi kontrak');
    }
  }

  async function handleDelete(c: Contract) {
    if (!confirm(`Hapus kontrak ${c.contractNumber}?`)) return;
    try {
      await fetch(`/api/hq/hris/lifecycle?action=contract&id=${c.id}`, { method: 'DELETE' });
      showToast('success', 'Kontrak dihapus');
      await fetchAll();
    } catch {
      showToast('error', 'Gagal hapus kontrak');
    }
  }

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        (c.contractNumber || '').toLowerCase().includes(q) ||
        (c.employeeName || '').toLowerCase().includes(q) ||
        String(c.employeeId).includes(q);
      const matchType = typeFilter === 'all' || c.contractType === typeFilter;
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [contracts, searchQuery, typeFilter, statusFilter]);

  const expiring = useMemo(() => {
    return contracts
      .filter((c) => c.status === 'active' && c.endDate)
      .map((c) => ({ ...c, daysLeft: daysUntil(c.endDate) || 999 }))
      .filter((c) => (c.daysLeft as number) >= 0 && (c.daysLeft as number) <= 60)
      .sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number));
  }, [contracts]);

  if (!mounted) return null;

  return (
    <HQLayout title="Kontrak Karyawan" subtitle="Kelola kontrak kerja, perpanjangan, dan reminder kedaluwarsa">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={FileText} label="Total Kontrak" value={overview.total || contracts.length} color="text-blue-600" bg="bg-blue-100" />
          <StatCard icon={CheckCircle} label="Aktif" value={overview.active || contracts.filter(c => c.status === 'active').length} color="text-green-600" bg="bg-green-100" />
          <StatCard icon={AlertTriangle} label="Expired < 30 Hari" value={overview.expiring || expiring.filter(e => (e.daysLeft as number) <= 30).length} color="text-orange-600" bg="bg-orange-100" />
          <StatCard icon={XCircle} label="Kedaluwarsa" value={overview.expired || contracts.filter(c => c.status === 'expired').length} color="text-red-600" bg="bg-red-100" />
          <StatCard icon={Bell} label="Reminder" value={expiring.length} color="text-fuchsia-600" bg="bg-fuchsia-100" />
        </div>

        {expiring.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
            <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Kontrak Segera Berakhir (&lt; 60 hari)</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {expiring.slice(0, 6).map((c) => (
                <div key={c.id} className="bg-white rounded-lg px-3 py-2 text-sm border border-orange-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.contractNumber || 'Tanpa No.'} • {c.employeeName || `EMP-${c.employeeId}`}</div>
                    <div className="text-xs text-gray-500">{TYPE_LABELS[c.contractType]?.label} • Berakhir {c.endDate}</div>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${(c.daysLeft as number) <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                    {c.daysLeft} hari
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari nomor kontrak atau karyawan..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Tipe</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => { setEditing(null); setForm({ contractType: 'PKWT', status: 'active' }); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90">
              <Plus className="w-4 h-4" /> Buat Kontrak
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">No. Kontrak</th>
                <th className="px-4 py-3 text-left">Karyawan</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-left">Periode</th>
                <th className="px-4 py-3 text-right">Gaji Pokok</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-500">Memuat...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-500">Belum ada kontrak</td></tr>}
              {filtered.map((c) => {
                const tConf = TYPE_LABELS[c.contractType] || { label: c.contractType, color: 'bg-gray-100 text-gray-600' };
                const sConf = STATUS_LABELS[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-600' };
                const dLeft = daysUntil(c.endDate);
                return (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.contractNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{c.employeeName || `EMP-${c.employeeId}`}</div>
                      <div className="text-xs text-gray-500">{c.position || ''} {c.department ? `• ${c.department}` : ''}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${tConf.color}`}>{tConf.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{c.startDate}</div>
                      <div className="text-xs text-gray-500">→ {c.endDate || 'Tanpa batas'}{dLeft !== null && dLeft >= 0 && dLeft <= 60 && <span className="ml-1 text-orange-600 font-semibold">({dLeft}h lagi)</span>}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{fmtIDR(c.salary)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${sConf.color}`}>{sConf.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditing(c); setForm(c); setShowModal(true); }} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Edit className="w-4 h-4 text-gray-600" /></button>
                        {c.status === 'active' && (
                          <button onClick={() => { setSelected(c); setForm({ contractType: c.contractType, startDate: new Date().toISOString().slice(0, 10) }); setShowRenewModal(true); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Perpanjang">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {c.status === 'active' && (
                          <button onClick={() => handleTerminate(c)} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Terminasi"><XCircle className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleDelete(c)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">{editing ? 'Edit Kontrak' : 'Buat Kontrak Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Employee ID *" value={form.employeeId || ''} onChange={(v) => setForm(f => ({ ...f, employeeId: v }))} />
                <Input label="Nama Karyawan" value={form.employeeName || ''} onChange={(v) => setForm(f => ({ ...f, employeeName: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="No. Kontrak" value={form.contractNumber || ''} onChange={(v) => setForm(f => ({ ...f, contractNumber: v }))} />
                <div>
                  <label className="block text-xs font-medium mb-1">Tipe Kontrak *</label>
                  <select value={form.contractType || 'PKWT'} onChange={(e) => setForm(f => ({ ...f, contractType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Posisi" value={form.position || ''} onChange={(v) => setForm(f => ({ ...f, position: v }))} />
                <Input label="Departemen" value={form.department || ''} onChange={(v) => setForm(f => ({ ...f, department: v }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Tanggal Mulai *" type="date" value={form.startDate || ''} onChange={(v) => setForm(f => ({ ...f, startDate: v }))} />
                <Input label="Tanggal Berakhir" type="date" value={form.endDate || ''} onChange={(v) => setForm(f => ({ ...f, endDate: v }))} />
                <Input label="Akhir Probasi" type="date" value={form.probationEnd || ''} onChange={(v) => setForm(f => ({ ...f, probationEnd: v }))} />
              </div>
              <Input label="Gaji Pokok (Rp)" type="number" value={form.salary || ''} onChange={(v) => setForm(f => ({ ...f, salary: Number(v) }))} />
              <div>
                <label className="block text-xs font-medium mb-1">Catatan</label>
                <textarea value={form.notes || ''} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-white">Batal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                {editing ? 'Simpan Perubahan' : 'Buat Kontrak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew modal */}
      {showRenewModal && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRenewModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">Perpanjang Kontrak</h3>
              <button onClick={() => setShowRenewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm bg-gray-50 rounded-lg p-3">
                <p><b>{selected.contractNumber}</b> ({selected.employeeName || `EMP-${selected.employeeId}`})</p>
                <p className="text-xs text-gray-500">Renewal #{(selected.renewalCount || 0) + 1}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Tipe Baru</label>
                  <select value={form.contractType || selected.contractType} onChange={(e) => setForm(f => ({ ...f, contractType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <Input label="Gaji Baru (Rp)" type="number" value={form.salary || selected.salary || ''} onChange={(v) => setForm(f => ({ ...f, salary: Number(v) }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Mulai Kontrak Baru *" type="date" value={form.startDate || ''} onChange={(v) => setForm(f => ({ ...f, startDate: v }))} />
                <Input label="Berakhir" type="date" value={form.endDate || ''} onChange={(v) => setForm(f => ({ ...f, endDate: v }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t bg-gray-50">
              <button onClick={() => setShowRenewModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-white">Batal</button>
              <button onClick={handleRenew} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> Perpanjang
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </HQLayout>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
    </div>
  );
}
