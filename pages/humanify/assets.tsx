import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import { Package, Laptop, Smartphone, CreditCard, Key, ArrowLeftRight, Search, ArrowLeft } from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  laptop: Laptop, phone: Smartphone, id_card: CreditCard, access_card: Key, other: Package,
};
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700', assigned: 'bg-blue-100 text-blue-700',
  returned: 'bg-gray-100 text-gray-700', maintenance: 'bg-amber-100 text-amber-700',
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        fetch('/api/humanify/assets').then(r => r.json()),
        fetch('/api/humanify/assets?action=summary').then(r => r.json()),
      ]);
      setAssets(a.data || []);
      setSummary(s.data || {});
    } catch { setAssets([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter ? assets.filter(a => a.status === filter) : assets;
  const fmt = (n: number) => n ? `Rp ${n.toLocaleString('id-ID')}` : '-';

  return (
    <PageGuard anyPermission={['employees.view', 'employees.*']} title="Asset Management" description="Manajemen aset karyawan">
      <HQLayout title="Manajemen Aset" subtitle="Onboarding issue, offboarding return — terintegrasi lifecycle">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/onboarding" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5 text-indigo-600" /> Manajemen Aset Karyawan</h2>
              <p className="text-sm text-gray-500">Laptop, HP, ID card, access card — issue saat onboarding, return saat offboarding</p>
            </div>
            <Link href="/humanify/offboarding" className="px-3 py-2 text-sm border rounded-lg">Offboarding →</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Aset', value: summary.total || assets.length },
              { label: 'Assigned', value: summary.assigned || assets.filter(a => a.status === 'assigned').length },
              { label: 'Available', value: summary.available || assets.filter(a => a.status === 'available').length },
              { label: 'Total Nilai', value: fmt(summary.totalValue || assets.reduce((s: number, a: any) => s + (a.purchaseValue || 0), 0)) },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {['', 'assigned', 'available', 'returned'].map(s => (
              <button key={s || 'all'} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
                {s || 'Semua'}{s === 'assigned' ? ' (Perlu Return)' : ''}
              </button>
            ))}
          </div>

          {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(a => {
                const Icon = CATEGORY_ICONS[a.category] || Package;
                return (
                  <div key={a.id} className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg"><Icon className="w-5 h-5 text-indigo-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{a.assetCode}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                        </div>
                        <h3 className="font-semibold text-sm mt-0.5">{a.name}</h3>
                        {a.brand && <p className="text-xs text-gray-500">{a.brand} · {a.serialNumber}</p>}
                        {a.assignedToName && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" />{a.assignedToName}</p>
                        )}
                        {a.purchaseValue && <p className="text-xs text-gray-400 mt-1">{fmt(a.purchaseValue)}</p>}
                      </div>
                    </div>
                    {a.status === 'assigned' && (
                      <button className="mt-3 w-full py-1.5 text-xs border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50">
                        Tandai Dikembalikan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </HQLayout>
    </PageGuard>
  );
}
