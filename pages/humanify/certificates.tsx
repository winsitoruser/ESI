import { useState, useEffect, useCallback } from 'react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import { PageGuard } from '@/components/permissions';
import Link from 'next/link';
import { Award, AlertTriangle, CheckCircle2, XCircle, Search, ArrowLeft, BarChart3 } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  valid: { label: 'Valid', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  expiring_soon: { label: 'Segera Expired', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function CertificatesPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        fetch('/api/humanify/certificates').then(r => r.json()),
        fetch('/api/humanify/certificates?action=analytics').then(r => r.json()),
      ]);
      setCerts(c.data || []);
      setAnalytics(a.data || {});
    } catch { setCerts([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = certs.filter(c => {
    if (filter && c.status !== filter) return false;
    if (search && !c.employeeName.toLowerCase().includes(search.toLowerCase()) && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <PageGuard anyPermission={['training.view', 'training.*', 'employees.*']} title="Sertifikat" description="Registry sertifikat karyawan">
      <HQLayout title="Certificate Registry" subtitle="Tracker sertifikat, lisensi, compliance — alert expiry otomatis">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/humanify/training" className="p-2 border rounded-lg hover:bg-gray-50"><ArrowLeft className="w-4 h-4" /></Link>
            <div className="flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2"><Award className="w-5 h-5 text-amber-600" /> Certificate & Credential Registry</h2>
              <p className="text-sm text-gray-500">Central registry — training, lisensi, compliance, sertifikasi eksternal</p>
            </div>
            <Link href="/humanify/workforce-analytics" className="px-3 py-2 text-sm border rounded-lg flex items-center gap-1"><BarChart3 className="w-4 h-4" /> Analytics</Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Sertifikat', value: analytics.total || certs.length, color: 'text-gray-900' },
              { label: 'Valid', value: analytics.valid || certs.filter(c => c.status === 'valid').length, color: 'text-green-600' },
              { label: 'Segera Expired', value: analytics.expiringSoon || certs.filter(c => c.status === 'expiring_soon').length, color: 'text-amber-600' },
              { label: 'Expired', value: analytics.expired || certs.filter(c => c.status === 'expired').length, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan atau sertifikat..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Semua Status</option>
              <option value="valid">Valid</option>
              <option value="expiring_soon">Segera Expired</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Karyawan</th>
                  <th className="text-left p-3">Sertifikat</th>
                  <th className="text-left p-3">Penerbit</th>
                  <th className="text-left p-3">Sumber</th>
                  <th className="text-left p-3">Expired</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.valid;
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{c.employeeName}</td>
                      <td className="p-3">{c.title}</td>
                      <td className="p-3 text-gray-500">{c.issuer}</td>
                      <td className="p-3 capitalize text-xs">{c.source}</td>
                      <td className="p-3 text-gray-500">{c.expiryDate || '—'}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </HQLayout>
    </PageGuard>
  );
}
