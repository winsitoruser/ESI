import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import { Wallet, Receipt, Plus, Search, Check, X, Clock, ArrowLeft, Plane, Stethoscope, Car, Utensils } from 'lucide-react';

const CATEGORIES = [
  { key: 'medical', label: 'Medis & Kesehatan', icon: Stethoscope },
  { key: 'transport', label: 'Transportasi', icon: Car },
  { key: 'meal', label: 'Makan & Representasi', icon: Utensils },
  { key: 'travel', label: 'Perjalanan Dinas', icon: Plane },
  { key: 'other', label: 'Lainnya', icon: Receipt },
];

const MOCK_CLAIMS = [
  { id: 'r1', employeeName: 'Andi Saputra', category: 'transport', description: 'Ongkos taksi ke klien', amount: 350000, status: 'pending', date: '2026-07-05', policyLimit: 500000 },
  { id: 'r2', employeeName: 'Maya Putri', category: 'medical', description: 'Check-up tahunan', amount: 850000, status: 'approved', date: '2026-07-03', policyLimit: 2000000 },
  { id: 'r3', employeeName: 'Budi Santoso', category: 'meal', description: 'Makan meeting vendor', amount: 420000, status: 'pending', date: '2026-07-06', policyLimit: 500000 },
  { id: 'r4', employeeName: 'Siti Rahayu', category: 'other', description: 'ATK kantor cabang', amount: 275000, status: 'reimbursed', date: '2026-06-28', policyLimit: 1000000 },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700',
  reimbursed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
};

export default function ReimbursementPage() {
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/humanify/travel-expense?action=expenses');
      const j = await r.json();
      if (j.data?.length) {
        setClaims(j.data.map((e: any) => ({
          id: e.id, employeeName: `Karyawan #${e.employee_id}`, category: e.category || 'other',
          description: e.description, amount: parseFloat(e.amount), status: e.status, date: e.expense_date,
          policyLimit: 1000000,
        })));
      }
    } catch { /* keep mock */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = claims.filter(c => {
    if (filter && c.category !== filter) return false;
    if (search && !c.employeeName.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const pending = claims.filter(c => c.status === 'pending').length;
  const totalPending = claims.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);

  return (
    <PageGuard anyPermission={['travel.view', 'travel.*', 'employees.*']} title="Reimbursement" description="Klaim reimbursement karyawan">
      <HQLayout title="Reimbursement" subtitle="Expense policy, self-service request, budget tracking per karyawan">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/ess" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-green-600" /> Reimbursement & Klaim Biaya</h2>
              <p className="text-sm text-gray-500">Kebijakan expense, pengajuan self-service, tracking budget per karyawan → feed ke Payroll</p>
            </div>
            <Link href="/humanify/travel-expense" className="px-3 py-2 text-sm border rounded-lg">Perjalanan Dinas →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Menunggu Approval', value: pending, sub: fmt(totalPending) },
              { label: 'Total Klaim Bulan Ini', value: claims.length, sub: fmt(claims.reduce((s, c) => s + c.amount, 0)) },
              { label: 'Disetujui', value: claims.filter(c => c.status === 'approved').length, sub: '' },
              { label: 'Direimburse', value: claims.filter(c => c.status === 'reimbursed').length, sub: '→ Payroll' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-sm ${!filter ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>Semua</button>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setFilter(c.key)} className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${filter === c.key ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>
                <c.icon className="w-3 h-3" />{c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan atau deskripsi..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Karyawan</th>
                  <th className="text-left p-3 font-medium">Kategori</th>
                  <th className="text-left p-3 font-medium">Deskripsi</th>
                  <th className="text-right p-3 font-medium">Jumlah</th>
                  <th className="text-right p-3 font-medium">Limit</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{c.employeeName}</td>
                    <td className="p-3 capitalize">{c.category}</td>
                    <td className="p-3 text-gray-600">{c.description}</td>
                    <td className="p-3 text-right font-semibold">{fmt(c.amount)}</td>
                    <td className="p-3 text-right text-gray-400">{fmt(c.policyLimit)}</td>
                    <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span></td>
                    <td className="p-3 text-center">
                      {c.status === 'pending' && (
                        <div className="flex justify-center gap-1">
                          <button className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                          <button className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-800">
            <strong>Integrasi Payroll:</strong> Klaim yang disetujui otomatis masuk ke komponen payroll periode berjalan sebagai tunjangan reimbursement.
          </div>
        </div>
      </HQLayout>
    </PageGuard>
  );
}
