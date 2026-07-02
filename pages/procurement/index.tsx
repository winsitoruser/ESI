import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PortalLayout from '../../components/procurement/PortalLayout';
import {
  Search, Filter, Gavel, FileText, Clock, DollarSign, Users,
  ArrowRight, ChevronLeft, ChevronRight, Loader2, Calendar,
  Tag, Eye, TrendingUp, Zap, Shield, Award, Building2
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fD = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  announcement: { label: 'Pengumuman', color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20' },
  registration: { label: 'Pendaftaran', color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20' },
  submission: { label: 'Penawaran', color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20' },
  published: { label: 'Dibuka', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
  evaluation: { label: 'Evaluasi', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' },
};

export default function ProcurementAnnouncementsPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [tenderCount, setTenderCount] = useState(0);
  const [rfqCount, setRfqCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (type !== 'all') params.set('type', type);
      if (search) params.set('search', search);

      const r = await fetch(`/api/procurement/announcements?${params}`);
      const d = await r.json();
      if (d.success) {
        setData(d.data.rows || []);
        setTotal(d.data.total || 0);
        setTenderCount(d.data.tenderCount || 0);
        setRfqCount(d.data.rfqCount || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, type, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  const daysUntil = (d: string | null) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <PortalLayout title="Pengumuman Pengadaan" description="Portal pengumuman tender dan RFQ untuk vendor">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-sm text-white/90 font-medium">Portal Pengadaan Terbuka</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Pengumuman <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-200">Pengadaan</span>
            </h1>
            <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
              Temukan peluang tender dan permintaan penawaran terbaru. Daftar sebagai vendor untuk mengajukan penawaran.
            </p>

            {/* Search Bar */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl text-sm shadow-xl outline-none focus:ring-4 focus:ring-white/20 transition-all placeholder:text-gray-400"
                    placeholder="Cari tender, RFQ, atau proyek..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchData(); } }}
                  />
                </div>
                <button onClick={() => { setPage(1); fetchData(); }}
                  className="px-8 py-4 bg-white text-blue-700 font-bold rounded-2xl shadow-xl hover:bg-blue-50 transition-all text-sm shrink-0">
                  Cari
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{total}</p>
                <p className="text-sm text-white/60">Total Pengumuman</p>
              </div>
              <div className="w-px h-10 bg-white/20 hidden sm:block" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{tenderCount}</p>
                <p className="text-sm text-white/60">Tender Aktif</p>
              </div>
              <div className="w-px h-10 bg-white/20 hidden sm:block" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{rfqCount}</p>
                <p className="text-sm text-white/60">RFQ Terbuka</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg border p-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
          <span className="text-sm font-medium text-gray-500 hidden sm:block">Filter:</span>
          {[
            { v: 'all', l: 'Semua', icon: Eye },
            { v: 'tenders', l: 'Tender', icon: Gavel },
            { v: 'rfqs', l: 'RFQ', icon: FileText },
          ].map(f => (
            <button key={f.v} onClick={() => { setType(f.v); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${type === f.v
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <f.icon className="w-4 h-4" /> {f.l}
            </button>
          ))}
          <div className="ml-auto text-sm text-gray-400">
            {total} hasil ditemukan
          </div>
        </div>
      </section>

      {/* Listing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Loader2 className="w-7 h-7 animate-spin text-white" />
            </div>
            <p className="text-sm text-gray-500">Memuat pengumuman...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600">Belum ada pengumuman</h3>
            <p className="text-sm text-gray-400 mt-1">Pengumuman tender dan RFQ akan muncul di sini</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.map((item: any) => {
                const isTender = item.source_type === 'tender';
                const deadline = item.deadline;
                const daysLeft = daysUntil(deadline);
                const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                const isClosed = daysLeft !== null && daysLeft < 0;
                const statusInfo = STATUS_LABELS[item.status] || { label: item.status, color: 'bg-gray-100 text-gray-600' };

                return (
                  <Link key={`${item.source_type}-${item.id}`}
                    href={`/procurement/${item.id}?type=${item.source_type}`}
                    className="group bg-white rounded-2xl border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                    {/* Top Bar */}
                    <div className={`h-1.5 ${isTender ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} />

                    <div className="p-5 flex-1 flex flex-col">
                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold
                          ${isTender ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20' : 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20'}`}>
                          {isTender ? <Gavel className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                          {isTender ? 'Tender' : 'RFQ'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {isUrgent && !isClosed && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 ring-1 ring-red-600/20 animate-pulse">
                            {daysLeft} hari lagi
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                        {item.title}
                      </h3>

                      {/* Number */}
                      <p className="text-xs font-mono text-gray-400 mb-3">{item.number}</p>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                          {item.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="mt-auto space-y-2 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span className="font-semibold text-gray-700">{fmt(Number(item.estimated_value || 0))}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users className="w-3.5 h-3.5" />
                            <span>{item.bid_count || 0} penawaran</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Batas: <strong className={isClosed ? 'text-red-500' : ''}>{fD(deadline)}</strong></span>
                          </div>
                          {item.category && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Tag className="w-3.5 h-3.5" />
                              <span>{item.category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                      <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600">Lihat Detail</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2.5 rounded-xl border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition-all
                        ${p === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'border bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2.5 rounded-xl border bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Features */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900">Mengapa Bergabung?</h2>
            <p className="text-sm text-gray-500 mt-2">Keuntungan menjadi vendor terdaftar</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Terpercaya & Aman', desc: 'Proses pengadaan transparan dan terjamin keamanannya', color: 'bg-blue-50 text-blue-600' },
              { icon: TrendingUp, title: 'Peluang Bisnis', desc: 'Akses ke berbagai tender dan RFQ dari perusahaan', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Award, title: 'Kompetitif & Adil', desc: 'Evaluasi berdasarkan kualitas, harga, dan pengalaman', color: 'bg-purple-50 text-purple-600' },
              { icon: Building2, title: 'Mudah & Cepat', desc: 'Daftar sekali, ajukan penawaran kapan saja', color: 'bg-amber-50 text-amber-600' },
            ].map(f => (
              <div key={f.title} className="text-center p-6 rounded-2xl border hover:shadow-lg transition-all">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mx-auto mb-4`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}
