import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import {
  Gift, Wallet, CreditCard, Plus, Check, X, ArrowLeft, Clock,
} from 'lucide-react';

const ICONS: Record<string, any> = { gift: Gift, wallet: Wallet, credit: CreditCard };
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700',
  active: 'bg-blue-100 text-blue-700', paid: 'bg-gray-100 text-gray-700',
  rejected: 'bg-red-100 text-red-700', completed: 'bg-purple-100 text-purple-700',
};

interface Props {
  type: 'bonus' | 'cash_advance' | 'loan';
  title: string;
  subtitle: string;
  icon: string;
  categories: string[];
  showInstallment?: boolean;
}

export default function PayrollInputPage({ type, title, subtitle, icon, categories, showInstallment }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const Icon = ICONS[icon] || Gift;
  const fmt = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/humanify/payroll-inputs?type=${type}`);
      const j = await r.json();
      setItems(j.data || []);
    } catch { setItems([]); }
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    await fetch(`/api/humanify/payroll-inputs?id=${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: type === 'loan' ? 'active' : 'approved' }),
    });
    load();
  };

  const pending = items.filter(i => i.status === 'pending');
  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  return (
    <PageGuard anyPermission={['payroll.view', 'payroll.*']} title={title} description={subtitle}>
      <HQLayout title={title} subtitle={subtitle}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/payroll" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Icon className="w-5 h-5 text-emerald-600" /> {title}</h2>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500">Total Record</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500">Menunggu Approval</p>
              <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <p className="text-xs text-gray-500">Total Nominal</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totalAmount)}</p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800 flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            Data {title.toLowerCase()} otomatis tersinkron ke <Link href="/humanify/payroll/main" className="underline font-medium">Proses Gaji</Link> periode berjalan.
          </div>

          {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3">Karyawan</th>
                    <th className="text-left p-3">Departemen</th>
                    <th className="text-left p-3">Alasan</th>
                    {showInstallment && <th className="text-right p-3">Cicilan</th>}
                    <th className="text-right p-3">Jumlah</th>
                    {showInstallment && <th className="text-right p-3">Sisa</th>}
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.employeeName}</td>
                      <td className="p-3 text-gray-500">{item.department}</td>
                      <td className="p-3 text-gray-600">{item.reason}</td>
                      {showInstallment && <td className="p-3 text-right">{fmt(item.installmentAmount)}/bln × {item.installmentMonths}</td>}
                      <td className="p-3 text-right font-semibold">{fmt(item.amount)}</td>
                      {showInstallment && <td className="p-3 text-right text-amber-600">{fmt(item.remainingAmount)}</td>}
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status]}`}>{item.status}</span></td>
                      <td className="p-3 text-center">
                        {item.status === 'pending' && (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => handleApprove(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                            <button className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
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
