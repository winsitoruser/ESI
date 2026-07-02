import { useState, useEffect, useMemo } from 'react';
import HQLayout from '@/components/hq/HQLayout';
import {
  Clock, Users, DollarSign, CheckCircle, AlertCircle, Search, ArrowLeft,
  Plus, X, Save, Calendar, Eye, TrendingUp, FileText, Filter
} from 'lucide-react';
import Link from 'next/link';

const fmtCurrency = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

interface OvertimeRecord {
  id: string; employee_id: string; employee_name: string; position: string;
  department: string; date: string; start_time: string; end_time: string;
  hours: number; type: 'workday' | 'weekend' | 'holiday';
  multiplier: number; base_hourly: number; amount: number;
  reason: string; status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: string;
}

const OT_TYPES: Record<string, { label: string; color: string }> = {
  workday: { label: 'Hari Kerja', color: 'bg-blue-100 text-blue-700' },
  weekend: { label: 'Akhir Pekan', color: 'bg-orange-100 text-orange-700' },
  holiday: { label: 'Hari Libur', color: 'bg-red-100 text-red-700' },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  paid: { label: 'Dibayar', color: 'bg-emerald-100 text-emerald-700' },
};

// PP 35/2021: Hari kerja jam 1 = 1.5x, jam 2+ = 2x. Weekend/holiday = 2x semua
function calcOTMultiplier(type: string, hour: number): number {
  if (type === 'workday') return hour === 1 ? 1.5 : 2;
  return 2; // weekend/holiday
}

function calcOTAmount(baseSalary: number, hours: number, type: string): number {
  const hourlyRate = baseSalary / 173;
  let total = 0;
  for (let h = 1; h <= hours; h++) {
    total += hourlyRate * calcOTMultiplier(type, h);
  }
  return Math.round(total);
}

const MOCK_OT: OvertimeRecord[] = [
  { id: 'ot1', employee_id: '5', employee_name: 'Eko Prasetyo', position: 'Warehouse Supervisor', department: 'WAREHOUSE', date: '2026-03-10', start_time: '17:00', end_time: '20:00', hours: 3, type: 'workday', multiplier: 1.83, base_hourly: 69364, amount: calcOTAmount(12000000, 3, 'workday'), reason: 'Stok opname akhir bulan', status: 'approved', approved_by: 'Ahmad Wijaya' },
  { id: 'ot2', employee_id: '12', employee_name: 'Hendra Gunawan', position: 'Warehouse Staff', department: 'WAREHOUSE', date: '2026-03-10', start_time: '17:00', end_time: '21:00', hours: 4, type: 'workday', multiplier: 1.88, base_hourly: 19075, amount: calcOTAmount(3300000, 4, 'workday'), reason: 'Stok opname akhir bulan', status: 'approved', approved_by: 'Eko Prasetyo' },
  { id: 'ot3', employee_id: '2', employee_name: 'Siti Rahayu', position: 'Branch Manager', department: 'OPERATIONS', date: '2026-03-08', start_time: '09:00', end_time: '14:00', hours: 5, type: 'weekend', multiplier: 2, base_hourly: 104046, amount: calcOTAmount(18000000, 5, 'weekend'), reason: 'Event promo cabang', status: 'paid' },
  { id: 'ot4', employee_id: '3', employee_name: 'Budi Santoso', position: 'Branch Manager', department: 'OPERATIONS', date: '2026-03-15', start_time: '17:00', end_time: '19:00', hours: 2, type: 'workday', multiplier: 1.75, base_hourly: 104046, amount: calcOTAmount(18000000, 2, 'workday'), reason: 'Closing bulanan', status: 'pending' },
  { id: 'ot5', employee_id: '5', employee_name: 'Eko Prasetyo', position: 'Warehouse Supervisor', department: 'WAREHOUSE', date: '2026-03-29', start_time: '08:00', end_time: '15:00', hours: 7, type: 'holiday', multiplier: 2, base_hourly: 69364, amount: calcOTAmount(12000000, 7, 'holiday'), reason: 'Pengiriman urgent hari libur', status: 'pending' },
  { id: 'ot6', employee_id: '6', employee_name: 'Lisa Permata', position: 'Finance Manager', department: 'FINANCE', date: '2026-03-14', start_time: '18:00', end_time: '21:00', hours: 3, type: 'workday', multiplier: 1.83, base_hourly: 115607, amount: calcOTAmount(20000000, 3, 'workday'), reason: 'Rekonsiliasi laporan keuangan', status: 'approved' },
];

export default function LemburPage() {
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [form, setForm] = useState({ employee_name: '', department: '', date: '', start_time: '', end_time: '', hours: '', type: 'workday', reason: '', base_salary: '' });
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const showToast = (type: string, message: string) => { setToast({ type, message }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const res = await fetch(`/api/hq/hris/payroll?action=lembur&period=${period}`);
        const json = await res.json().catch(() => null);
        if (res.ok && Array.isArray(json?.data) && json.data.length > 0) {
          const mapped: OvertimeRecord[] = json.data.map((r: any) => ({
            id: String(r.id),
            employee_id: String(r.employee_id || r.id),
            employee_name: r.employee_name,
            position: r.position || '-',
            department: r.department || '-',
            date: `${r.period}-01`,
            start_time: '17:00',
            end_time: '-',
            hours: Number(r.hours || 0),
            type: 'workday',
            multiplier: 1.5,
            base_hourly: Number(r.hourly_rate || 0),
            amount: Number(r.amount || 0),
            reason: 'Rekap lembur dari absensi',
            status: (r.status || 'approved') as OvertimeRecord['status'],
          }));
          setRecords(mapped);
        } else {
          setRecords(MOCK_OT);
        }
      } catch {
        setRecords(MOCK_OT);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let data = records;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(r => r.employee_name.toLowerCase().includes(q) || r.department.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') data = data.filter(r => r.status === filterStatus);
    return data;
  }, [records, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    totalHours: filtered.reduce((s, r) => s + r.hours, 0),
    totalAmount: filtered.reduce((s, r) => s + r.amount, 0),
    pending: records.filter(r => r.status === 'pending').length,
    approved: records.filter(r => r.status === 'approved').length,
  }), [filtered, records]);

  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const, approved_by: 'Current User' } : r));
    showToast('success', 'Lembur disetujui');
  };

  const handleReject = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
    showToast('success', 'Lembur ditolak');
  };

  const handleSubmit = () => {
    if (!form.employee_name || !form.date || !form.hours) { showToast('error', 'Lengkapi data'); return; }
    const hours = parseInt(form.hours) || 0;
    const baseSalary = parseFloat(form.base_salary) || 5000000;
    const amount = calcOTAmount(baseSalary, hours, form.type);
    const newRecord: OvertimeRecord = {
      id: `ot-${Date.now()}`, employee_id: '', employee_name: form.employee_name,
      position: '', department: form.department, date: form.date, start_time: form.start_time,
      end_time: form.end_time, hours, type: form.type as any,
      multiplier: form.type === 'workday' ? 1.5 : 2, base_hourly: Math.round(baseSalary / 173),
      amount, reason: form.reason, status: 'pending'
    };
    setRecords(prev => [newRecord, ...prev]);
    setShowModal(false);
    showToast('success', 'Pengajuan lembur berhasil ditambahkan');
    setForm({ employee_name: '', department: '', date: '', start_time: '', end_time: '', hours: '', type: 'workday', reason: '', base_salary: '' });
  };

  if (!mounted) return null;

  return (
    <HQLayout title="Manajemen Lembur" subtitle="Pengajuan, persetujuan, dan perhitungan lembur karyawan">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/hq/hris/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
          <div className="flex-1"><h2 className="text-lg font-bold">Manajemen Lembur</h2><p className="text-sm text-gray-500">Sesuai PP No. 35/2021 tentang PKWT & Lembur</p></div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Plus className="w-4 h-4" /> Ajukan Lembur</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Jam', value: `${stats.totalHours} jam`, icon: Clock, bg: 'bg-blue-100', color: 'text-blue-600' },
            { label: 'Total Biaya', value: fmtCurrency(stats.totalAmount), icon: DollarSign, bg: 'bg-green-100', color: 'text-green-600' },
            { label: 'Menunggu Approval', value: stats.pending, icon: AlertCircle, bg: 'bg-yellow-100', color: 'text-yellow-600' },
            { label: 'Disetujui', value: stats.approved, icon: CheckCircle, bg: 'bg-emerald-100', color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center gap-3"><div className={`p-2 ${s.bg} rounded-lg`}><s.icon className={`w-5 h-5 ${s.color}`} /></div><div><p className="text-xs text-gray-500">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>{s.value}</p></div></div>
            </div>
          ))}
        </div>

        {/* Aturan Lembur */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-800 text-sm mb-2">Ketentuan Perhitungan Lembur (PP 35/2021)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-blue-700">
            <div><p className="font-medium">Hari Kerja</p><p>Jam ke-1: 1.5× upah/jam</p><p>Jam ke-2 dst: 2× upah/jam</p></div>
            <div><p className="font-medium">Akhir Pekan / Hari Libur</p><p>Semua jam: 2× upah/jam</p></div>
            <div><p className="font-medium">Upah per Jam</p><p>= 1/173 × gaji bulanan</p><p>Maks 4 jam/hari, 18 jam/minggu</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 flex flex-wrap gap-3 border-b">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Cari karyawan..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" /></div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="all">Semua Status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Jam</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipe</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Biaya</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr></thead>
              <tbody className="divide-y">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-medium text-sm">{r.employee_name}</p><p className="text-xs text-gray-500">{r.position} · {r.department}</p></td>
                    <td className="px-4 py-3 text-center text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 text-center text-xs">{r.start_time} - {r.end_time}</td>
                    <td className="px-4 py-3 text-center font-bold text-sm">{r.hours}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${OT_TYPES[r.type]?.color}`}>{OT_TYPES[r.type]?.label}</span></td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">{fmtCurrency(r.amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_MAP[r.status]?.color}`}>{STATUS_MAP[r.status]?.label}</span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.status === 'pending' && (<><button onClick={() => handleApprove(r.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Setujui"><CheckCircle className="w-4 h-4" /></button><button onClick={() => handleReject(r.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Tolak"><X className="w-4 h-4" /></button></>)}
                        <button onClick={() => setSelectedRecord(r)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Detail"><Eye className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold"><tr>
                <td className="px-4 py-3 text-sm" colSpan={3}>Total ({filtered.length} record)</td>
                <td className="px-4 py-3 text-center text-sm">{stats.totalHours}</td>
                <td></td>
                <td className="px-4 py-3 text-right text-sm text-green-600">{fmtCurrency(stats.totalAmount)}</td>
                <td colSpan={3}></td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Add OT Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center"><h3 className="font-semibold">Ajukan Lembur</h3><button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Nama Karyawan *</label><input type="text" value={form.employee_name} onChange={e => setForm(f => ({ ...f, employee_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Nama karyawan" /></div>
                <div><label className="block text-sm font-medium mb-1">Departemen</label><input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Tanggal *</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Mulai</label><input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Selesai</label><input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Total Jam *</label><input type="number" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" min={1} max={12} /></div>
                <div><label className="block text-sm font-medium mb-1">Tipe Lembur</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">{Object.entries(OT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Gaji Pokok</label><input type="number" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="5000000" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Alasan Lembur</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
              {form.hours && form.base_salary && (
                <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Estimasi Biaya Lembur</p><p className="text-xl font-bold text-green-600">{fmtCurrency(calcOTAmount(parseFloat(form.base_salary) || 0, parseInt(form.hours) || 0, form.type))}</p></div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Batal</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"><Save className="w-4 h-4" /> Ajukan</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center"><h3 className="font-semibold">Detail Lembur</h3><button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500">Karyawan</p><p className="font-semibold">{selectedRecord.employee_name}</p></div>
                <div><p className="text-xs text-gray-500">Departemen</p><p className="font-medium">{selectedRecord.department}</p></div>
                <div><p className="text-xs text-gray-500">Tanggal</p><p className="font-medium">{fmtDate(selectedRecord.date)}</p></div>
                <div><p className="text-xs text-gray-500">Waktu</p><p className="font-medium">{selectedRecord.start_time} - {selectedRecord.end_time}</p></div>
                <div><p className="text-xs text-gray-500">Total Jam</p><p className="font-bold text-lg">{selectedRecord.hours} jam</p></div>
                <div><p className="text-xs text-gray-500">Tipe</p><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${OT_TYPES[selectedRecord.type]?.color}`}>{OT_TYPES[selectedRecord.type]?.label}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Upah per Jam</span><span className="font-medium">{fmtCurrency(selectedRecord.base_hourly)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Multiplier Rata-rata</span><span className="font-medium">{selectedRecord.multiplier}×</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Alasan</span><span className="font-medium text-right max-w-[200px]">{selectedRecord.reason}</span></div>
                {selectedRecord.approved_by && <div className="flex justify-between"><span className="text-gray-600">Disetujui oleh</span><span className="font-medium">{selectedRecord.approved_by}</span></div>}
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Total Biaya Lembur</p><p className="text-2xl font-bold text-green-600">{fmtCurrency(selectedRecord.amount)}</p></div>
            </div>
          </div>
        </div>
      )}

      {toast && (<div className={`fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.message}</div>)}
    </HQLayout>
  );
}
