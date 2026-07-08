import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Banknote, Download, ArrowLeft, Building2, FileText,
} from 'lucide-react';

const BANKS = [
  { id: 'bca', label: 'BCA (Auto Credit)', color: 'bg-blue-600' },
  { id: 'mandiri', label: 'Mandiri (MCM)', color: 'bg-yellow-500' },
  { id: 'generic', label: 'CSV Generic', color: 'bg-gray-600' },
];

export default function DisbursementPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/humanify/disbursement?action=preview');
      const j = await r.json();
      setRows(j.data?.rows || []);
      setTotal(j.data?.total || 0);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const download = (format: string) => {
    window.open(`/api/humanify/disbursement?action=download&format=${format}`, '_blank');
  };

  return (
    <PageGuard anyPermission={['payroll.view', 'payroll.*']} title="Disbursement" description="Transfer gaji ke bank">
      <HQLayout title="Disbursement / Transfer Bank" subtitle="Generate file transfer BCA, Mandiri, atau CSV">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-600" /> Instant Disbursement</h2>
              <p className="text-sm text-gray-500">Export file transfer bank setelah payroll approved</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border shadow-sm col-span-1">
              <p className="text-xs text-gray-500">Total Transfer</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(total)}</p>
              <p className="text-xs text-gray-400 mt-1">{rows.length} karyawan</p>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-3">
              {BANKS.map(b => (
                <button key={b.id} onClick={() => download(b.id)}
                  className={`${b.color} text-white rounded-xl p-4 hover:opacity-90 transition-opacity flex flex-col items-center gap-2`}>
                  <Download className="w-5 h-5" />
                  <span className="text-xs font-medium text-center">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {!loading && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Karyawan</th>
                    <th className="text-left p-3">Bank</th>
                    <th className="text-left p-3">No Rekening</th>
                    <th className="text-right p-3">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.employeeId} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{r.employeeName}</td>
                      <td className="p-3">{r.bankName}</td>
                      <td className="p-3 font-mono text-xs">{r.accountNumber}</td>
                      <td className="p-3 text-right font-semibold">{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </HQLayout>
    </PageGuard>
  );
}
