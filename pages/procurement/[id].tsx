import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import PortalLayout from '../../components/procurement/PortalLayout';
import {
  ArrowLeft, Gavel, FileText, Clock, DollarSign, Users, Calendar,
  Tag, CheckCircle, AlertTriangle, Loader2, Send, Building2,
  ChevronDown, ChevronUp, Shield, Award, MapPin, CreditCard, Package
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fD = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
const fDT = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  announcement: { label: 'Pengumuman', color: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20' },
  registration: { label: 'Pendaftaran', color: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20' },
  submission: { label: 'Penawaran Dibuka', color: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20' },
  published: { label: 'Dibuka', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
  evaluation: { label: 'Evaluasi', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20' },
  awarded: { label: 'Pemenang Ditentukan', color: 'bg-green-50 text-green-700 ring-1 ring-green-600/20' },
  closed: { label: 'Ditutup', color: 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20' },
};

export default function AnnouncementDetailPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bidForm, setBidForm] = useState<any>({});
  const [user, setUser] = useState<any>(null);
  const [expandSections, setExpandSections] = useState<Record<string, boolean>>({ requirements: true, criteria: true });

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('vendor_user') : null;
    if (stored) try { setUser(JSON.parse(stored)); } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!id || !type) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/procurement/${id}?type=${type}`);
        const d = await r.json();
        if (d.success) setData(d.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, type]);

  const handleSubmitBid = async () => {
    const token = localStorage.getItem('vendor_token');
    if (!token) {
      router.push(`/procurement/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    if (!bidForm.bidAmount || parseFloat(bidForm.bidAmount) <= 0) {
      alert('Masukkan nilai penawaran');
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch('/api/procurement/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sourceType: type,
          sourceId: id,
          bidAmount: bidForm.bidAmount,
          deliveryTimeDays: bidForm.deliveryTimeDays,
          warrantyMonths: bidForm.warrantyMonths,
          paymentTerms: bidForm.paymentTerms,
          deliverySchedule: bidForm.deliverySchedule,
          warrantyTerms: bidForm.warrantyTerms,
          notes: bidForm.notes,
        }),
      });
      const d = await r.json();
      if (d.success) {
        alert('Penawaran berhasil diajukan!');
        setShowBidForm(false);
        setBidForm({});
        // Refresh data
        const r2 = await fetch(`/api/procurement/${id}?type=${type}`);
        const d2 = await r2.json();
        if (d2.success) setData(d2.data);
      } else {
        alert(d.error?.message || 'Gagal mengajukan penawaran');
      }
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const isTender = type === 'tender';
  const canBid = data && (
    isTender
      ? ['announcement', 'registration', 'submission', 'published'].includes(data.status)
      : data.status === 'published'
  );

  const daysLeft = data?.deadline || data?.submission_deadline || data?.closing_date
    ? Math.ceil((new Date(data.submission_deadline || data.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const toggle = (key: string) => setExpandSections(s => ({ ...s, [key]: !s[key] }));

  if (loading) {
    return (
      <PortalLayout title="Memuat...">
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 animate-spin text-white" />
          </div>
          <p className="text-sm text-gray-500">Memuat detail pengumuman...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!data) {
    return (
      <PortalLayout title="Tidak Ditemukan">
        <div className="text-center py-32">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-700">Pengumuman Tidak Ditemukan</h2>
          <p className="text-sm text-gray-400 mt-2">Pengumuman mungkin telah dihapus atau belum dipublikasikan</p>
          <Link href="/procurement" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const statusInfo = STATUS_LABELS[data.status] || { label: data.status, color: 'bg-gray-100 text-gray-600' };
  const requirements = isTender ? (data.requirements || []) : [];
  const criteria = data.evaluation_criteria || [];
  const items = data.items || [];
  const bidsOrResponses = isTender ? (data.bids || []) : (data.responses || []);

  return (
    <PortalLayout title={data.title} description={data.description}>
      {/* Top Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/procurement" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Pengumuman
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className={`h-2 ${isTender ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} />
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                    ${isTender ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20' : 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20'}`}>
                    {isTender ? <Gavel className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    {isTender ? 'Tender' : 'RFQ'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  {data.category && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {data.category}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-3">
                  {data.title}
                </h1>

                <p className="text-sm font-mono text-gray-400 mb-4">
                  {isTender ? data.tender_number : data.rfq_number}
                </p>

                {data.description && (
                  <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                    <p className="whitespace-pre-wrap">{data.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline / Jadwal */}
            {isTender && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> Jadwal Tender
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Pengumuman', date: data.announcement_date, icon: '📢' },
                    { label: 'Batas Registrasi', date: data.registration_deadline, icon: '📋' },
                    { label: 'Batas Penawaran', date: data.submission_deadline, icon: '📨' },
                    { label: 'Evaluasi', date: data.evaluation_date, icon: '📊' },
                    { label: 'Pengumuman Pemenang', date: data.award_date, icon: '🏆' },
                  ].filter(t => t.date).map((t, i) => {
                    const isPast = new Date(t.date) < new Date();
                    return (
                      <div key={i} className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isPast ? 'bg-gray-100' : 'bg-blue-50'}`}>
                          {t.icon}
                        </div>
                        <div className="flex-1 pb-4 border-b border-gray-100 last:border-0">
                          <p className={`text-sm font-semibold ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>{t.label}</p>
                          <p className={`text-sm ${isPast ? 'text-gray-300' : 'text-gray-600'}`}>{fDT(t.date)}</p>
                        </div>
                        {isPast && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-2" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Requirements (Tender) */}
            {requirements.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <button onClick={() => toggle('requirements')} className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" /> Persyaratan
                  </h3>
                  {expandSections.requirements ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                {expandSections.requirements && (
                  <div className="px-6 pb-6">
                    <ul className="space-y-3">
                      {requirements.map((r: any, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <span className="text-sm text-gray-700">{typeof r === 'string' ? r : r.description || r.name || JSON.stringify(r)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Evaluation Criteria */}
            {criteria.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <button onClick={() => toggle('criteria')} className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" /> Kriteria Evaluasi
                  </h3>
                  {expandSections.criteria ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                {expandSections.criteria && (
                  <div className="px-6 pb-6">
                    <div className="space-y-3">
                      {criteria.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{typeof c === 'string' ? c : c.name || c.criteria || JSON.stringify(c)}</span>
                          {c.weight && <span className="text-sm font-bold text-blue-600">{c.weight}%</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RFQ Items */}
            {items.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" /> Item yang Diminta
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">UOM</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Target Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="px-6 py-3 text-right font-medium">{item.quantity}</td>
                          <td className="px-6 py-3">{item.uom}</td>
                          <td className="px-6 py-3 text-right font-semibold">{fmt(Number(item.target_price || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {data.terms_conditions && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Syarat & Ketentuan</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{data.terms_conditions}</p>
              </div>
            )}

            {/* Existing Bids (count only for public) */}
            {bidsOrResponses.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-6 sm:p-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  {isTender ? 'Penawaran Masuk' : 'Respon Vendor'} ({bidsOrResponses.length})
                </h3>
                <div className="space-y-3">
                  {bidsOrResponses.map((b: any, i: number) => (
                    <div key={b.id || i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {(b.vendor_name || 'V').substring(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{b.vendor_name || 'Vendor'}</p>
                          <p className="text-xs text-gray-400">{b.vendor_code || ''} • {fD(b.submitted_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmt(Number(b.bid_amount || b.total_amount || 0))}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                          b.status === 'evaluated' ? 'bg-amber-50 text-amber-700' :
                          b.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden sticky top-24">
              <div className={`p-6 text-white ${isTender ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-gradient-to-br from-emerald-600 to-teal-600'}`}>
                <p className="text-sm font-medium text-white/70">Estimasi Nilai</p>
                <p className="text-2xl font-extrabold mt-1">{fmt(Number(data.estimated_value || data.estimated_budget || 0))}</p>
                {daysLeft !== null && (
                  <div className={`mt-3 flex items-center gap-2 text-sm ${daysLeft > 0 ? 'text-white/80' : 'text-red-200'}`}>
                    <Clock className="w-4 h-4" />
                    {daysLeft > 0 ? `${daysLeft} hari tersisa` : 'Batas waktu telah lewat'}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Key Info */}
                <div className="space-y-3">
                  {data.currency && (
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Mata Uang:</span>
                      <span className="font-semibold text-gray-900 ml-auto">{data.currency}</span>
                    </div>
                  )}
                  {isTender && data.tender_type && (
                    <div className="flex items-center gap-3 text-sm">
                      <Gavel className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Tipe:</span>
                      <span className="font-semibold text-gray-900 ml-auto capitalize">{data.tender_type}</span>
                    </div>
                  )}
                  {data.payment_terms && (
                    <div className="flex items-center gap-3 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Pembayaran:</span>
                      <span className="font-semibold text-gray-900 ml-auto">{data.payment_terms}</span>
                    </div>
                  )}
                  {data.delivery_terms && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Pengiriman:</span>
                      <span className="font-semibold text-gray-900 ml-auto">{data.delivery_terms}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Penawaran:</span>
                    <span className="font-semibold text-gray-900 ml-auto">{data.bid_count || data.response_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Deadline:</span>
                    <span className="font-semibold text-gray-900 ml-auto text-right">{fD(data.submission_deadline || data.closing_date)}</span>
                  </div>
                </div>

                {/* Bid Button */}
                {canBid && (
                  <>
                    <hr />
                    {!showBidForm ? (
                      <button onClick={() => {
                        if (!user) {
                          router.push(`/procurement/login?redirect=${encodeURIComponent(router.asPath)}`);
                          return;
                        }
                        setShowBidForm(true);
                      }}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> Ajukan Penawaran
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="font-bold text-gray-900">Form Penawaran</h4>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Nilai Penawaran (IDR) *</label>
                          <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            placeholder="0" value={bidForm.bidAmount || ''} onChange={e => setBidForm({ ...bidForm, bidAmount: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Waktu Pengiriman (hari)</label>
                          <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            placeholder="30" value={bidForm.deliveryTimeDays || ''} onChange={e => setBidForm({ ...bidForm, deliveryTimeDays: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Garansi (bulan)</label>
                          <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            placeholder="12" value={bidForm.warrantyMonths || ''} onChange={e => setBidForm({ ...bidForm, warrantyMonths: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan</label>
                          <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                            rows={3} placeholder="Catatan tambahan..." value={bidForm.notes || ''} onChange={e => setBidForm({ ...bidForm, notes: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowBidForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                          <button onClick={handleSubmitBid} disabled={submitting}
                            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Kirim
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!canBid && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">Penawaran untuk pengumuman ini sedang tidak dibuka.</p>
                  </div>
                )}

                {!user && canBid && (
                  <p className="text-xs text-gray-400 text-center">
                    Anda harus <Link href="/procurement/login" className="text-blue-600 hover:underline">masuk</Link> atau <Link href="/procurement/register" className="text-blue-600 hover:underline">daftar</Link> terlebih dahulu.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
