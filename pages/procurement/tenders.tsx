import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PortalLayout from '../../components/procurement/PortalLayout';
import {
  Search, Gavel, Clock, DollarSign, Users, ArrowRight,
  ChevronLeft, ChevronRight, Loader2, Calendar, Tag, Filter
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fD = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  announcement: { label: 'Pengumuman', color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20' },
  registration: { label: 'Pendaftaran', color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20' },
  submission: { label: 'Penawaran', color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20' },
  published: { label: 'Dibuka', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
};

export default function TendersListPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: 'tenders', page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const r = await fetch(`/api/procurement/announcements?${params}`);
      const d = await r.json();
      if (d.success) { setData(d.data.rows || []); setTotal(d.data.total || 0); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const totalPages = Math.ceil(total / limit);

  const daysUntil = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 864e5) : null;

  return (
    <PortalLayout title="Daftar Tender" description="Lihat semua tender yang sedang dibuka">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Daftar Tender</h1>
          </div>
          <p className="text-white/70 ml-[52px]">Temukan dan ikuti tender yang sedang dibuka</p>
          <div className="mt-6 max-w-xl ml-[52px]">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input className="w-full pl-11 pr-4 py-3 bg-white rounded-xl text-sm shadow-lg outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="Cari tender..." value={search}
                  onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} />
              </div>
              <button onClick={() => { setPage(1); fetchData(); }}
                className="px-6 py-3 bg-white text-purple-700 font-bold rounded-xl shadow-lg hover:bg-purple-50 transition-all text-sm">
                Cari
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">{total} tender ditemukan</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Loader2 className="w-7 h-7 animate-spin text-white" />
            </div>
            <p className="text-sm text-gray-500">Memuat tender...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><Gavel className="w-8 h-8 text-gray-300" /></div>
            <h3 className="font-semibold text-gray-600">Belum ada tender aktif</h3>
            <p className="text-sm text-gray-400 mt-1">Tender baru akan muncul di sini saat dipublikasikan</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {data.map((item: any) => {
                const dl = daysUntil(item.submission_deadline);
                const isUrgent = dl !== null && dl >= 0 && dl <= 7;
                const isClosed = dl !== null && dl < 0;
                const st = STATUS_LABELS[item.status] || { label: item.status, color: 'bg-gray-100 text-gray-600' };
                return (
                  <Link key={item.id} href={`/procurement/${item.id}?type=tender`}
                    className="block bg-white rounded-2xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden group">
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>
                          {item.tender_type && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{item.tender_type}</span>}
                          {item.category && <span className="text-xs text-gray-400 flex items-center gap-1"><Tag className="w-3 h-3" />{item.category}</span>}
                          {isUrgent && !isClosed && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 animate-pulse">{dl} hari lagi</span>}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors truncate">{item.title}</h3>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">{item.number}</p>
                        {item.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.description}</p>}
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Deadline: <strong className={isClosed ? 'text-red-500' : ''}>{fD(item.submission_deadline)}</strong></span>
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {item.bid_count || 0} penawaran</span>
                        </div>
                      </div>
                      <div className="sm:text-right shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Est. Nilai</p>
                          <p className="text-lg font-extrabold text-gray-900">{fmt(Number(item.estimated_value || 0))}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 group-hover:text-purple-600 transition-colors">
                          Lihat Detail <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2.5 rounded-xl border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = page <= 3 ? i + 1 : page + i - 2; if (p < 1 || p > totalPages) return null; return (<button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${p === page ? 'bg-purple-600 text-white shadow-lg' : 'border bg-white text-gray-600 hover:bg-gray-50'}`}>{p}</button>); })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2.5 rounded-xl border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
