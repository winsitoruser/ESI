import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PortalLayout from '../../components/procurement/PortalLayout';
import {
  Loader2, Gavel, FileText, DollarSign, Clock, CheckCircle,
  AlertTriangle, Send, Award, TrendingUp, Building2, Calendar,
  ArrowUpRight, Eye, XCircle, BarChart3
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fD = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const BID_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: 'Diajukan', color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20', icon: Send },
  evaluated: { label: 'Dievaluasi', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20', icon: BarChart3 },
  accepted: { label: 'Diterima', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'bg-red-50 text-red-700 ring-1 ring-red-600/20', icon: XCircle },
  shortlisted: { label: 'Shortlist', color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20', icon: Award },
};

export default function VendorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidsData, setBidsData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'tenders' | 'rfqs'>('all');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('vendor_user') : null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('vendor_token') : null;

    if (!stored || !token) {
      router.push('/procurement/login?redirect=/procurement/dashboard');
      return;
    }

    try { setUser(JSON.parse(stored)); } catch { router.push('/procurement/login'); return; }

    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/procurement/bids', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        if (d.success) {
          setBidsData(d.data);
        } else if (d.error?.code === 'UNAUTHORIZED') {
          localStorage.removeItem('vendor_token');
          localStorage.removeItem('vendor_user');
          router.push('/procurement/login');
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [router]);

  if (loading || !user) {
    return (
      <PortalLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 animate-spin text-white" />
          </div>
          <p className="text-sm text-gray-500">Memuat dashboard...</p>
        </div>
      </PortalLayout>
    );
  }

  const tenderBids = bidsData?.tenderBids || [];
  const rfqResponses = bidsData?.rfqResponses || [];
  const allBids = [...tenderBids, ...rfqResponses].sort((a, b) =>
    new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
  );

  const displayBids = activeTab === 'tenders' ? tenderBids : activeTab === 'rfqs' ? rfqResponses : allBids;

  const submittedCount = allBids.filter(b => b.status === 'submitted').length;
  const acceptedCount = allBids.filter(b => b.status === 'accepted').length;
  const totalValue = allBids.reduce((s, b) => s + Number(b.bid_amount || 0), 0);

  return (
    <PortalLayout title="Dashboard Vendor">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/[0.03] rounded-full" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
                {(user.company_name || 'V').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">{user.company_name}</h1>
                <p className="text-sm text-white/70 mt-0.5">{user.contact_person} • {user.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                    ${user.status === 'approved' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                    {user.status === 'approved' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {user.status === 'approved' ? 'Terverifikasi' : 'Menunggu Verifikasi'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            {[
              { label: 'Total Penawaran', value: allBids.length, icon: Send, color: 'text-blue-600' },
              { label: 'Diajukan', value: submittedCount, icon: Clock, color: 'text-amber-600' },
              { label: 'Diterima', value: acceptedCount, icon: CheckCircle, color: 'text-emerald-600' },
              { label: 'Total Nilai', value: fmt(totalValue), icon: DollarSign, color: 'text-indigo-600', isText: true },
            ].map(s => (
              <div key={s.label} className="p-5 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
                <p className={`text-xl font-extrabold text-gray-900 ${s.isText ? 'text-sm' : ''}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Verification Alert */}
        {user.status !== 'approved' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-800">Akun Menunggu Verifikasi</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Akun Anda sedang dalam proses verifikasi. Anda tetap bisa mengajukan penawaran, namun beberapa fitur mungkin terbatas sampai akun disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Tabs + Content */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Penawaran Saya</h2>
            <div className="flex items-center gap-2 bg-white rounded-xl border p-1">
              {[
                { v: 'all' as const, l: `Semua (${allBids.length})` },
                { v: 'tenders' as const, l: `Tender (${tenderBids.length})` },
                { v: 'rfqs' as const, l: `RFQ (${rfqResponses.length})` },
              ].map(t => (
                <button key={t.v} onClick={() => setActiveTab(t.v)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activeTab === t.v ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Bids List */}
          {displayBids.length === 0 ? (
            <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600">Belum ada penawaran</h3>
              <p className="text-sm text-gray-400 mt-1 mb-6">Mulai ajukan penawaran untuk tender dan RFQ yang tersedia</p>
              <Link href="/procurement"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all text-sm">
                <Eye className="w-4 h-4" /> Lihat Pengumuman
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {displayBids.map((bid: any, i: number) => {
                const isTender = bid.source_type === 'tender';
                const statusInfo = BID_STATUS[bid.status] || { label: bid.status, color: 'bg-gray-100 text-gray-600', icon: Clock };
                const StatusIcon = statusInfo.icon;

                return (
                  <div key={bid.id || i} className="bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all group">
                    <div className={`h-1 ${isTender ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} />
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                              ${isTender ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                              {isTender ? <Gavel className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                              {isTender ? 'Tender' : 'RFQ'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-gray-900 truncate">{bid.title}</h3>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">{bid.tender_number || bid.bid_number}</p>

                          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Deadline: {fD(bid.submission_deadline)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              Diajukan: {fD(bid.submitted_at)}
                            </span>
                            {bid.ranking && (
                              <span className="flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                Peringkat #{bid.ranking}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Amount */}
                        <div className="sm:text-right shrink-0">
                          <p className="text-xs text-gray-400 font-medium">Nilai Penawaran</p>
                          <p className="text-xl font-extrabold text-gray-900">{fmt(Number(bid.bid_amount || 0))}</p>
                          {bid.overall_score && (
                            <p className="text-xs text-blue-600 font-bold mt-1">Skor: {Number(bid.overall_score).toFixed(1)}</p>
                          )}
                        </div>
                      </div>

                      {/* Scores if available */}
                      {(bid.technical_score || bid.price_score) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
                          {bid.technical_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Teknis:</span>
                              <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(Number(bid.technical_score), 100)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-700">{Number(bid.technical_score).toFixed(1)}</span>
                            </div>
                          )}
                          {bid.price_score && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Harga:</span>
                              <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(Number(bid.price_score), 100)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-700">{Number(bid.price_score).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Cari Peluang Baru</h3>
          <p className="text-sm text-gray-500 mb-6">Lihat pengumuman tender dan RFQ terbaru untuk mengajukan penawaran</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/procurement"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all text-sm">
              <Eye className="w-4 h-4" /> Lihat Pengumuman
            </Link>
            <Link href="/procurement/tenders"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm">
              <Gavel className="w-4 h-4" /> Tender Aktif
            </Link>
            <Link href="/procurement/rfqs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm">
              <FileText className="w-4 h-4" /> RFQ Terbuka
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
