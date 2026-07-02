import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Building2, Shield, Upload, MapPin, GitBranch, MessageSquare,
  CheckCircle2, XCircle, Clock, FileText, Users, Phone, Mail, Hash,
  Eye, Loader2, AlertTriangle, Send, RotateCcw, Sparkles, Calendar,
  Globe, Briefcase, DollarSign, Image
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';

const categoryLabels: Record<string, string> = {
  fnb: 'F&B / Restoran', retail: 'Retail / Toko', fashion: 'Fashion',
  beauty: 'Beauty & Salon', grocery: 'Grocery', pharmacy: 'Apotek',
  electronics: 'Elektronik', automotive: 'Otomotif', services: 'Jasa / Layanan', other: 'Lainnya',
};
const legalLabels: Record<string, string> = {
  perorangan: 'Perorangan / Pribadi', ud: 'UD (Usaha Dagang)',
  cv: 'CV (Commanditaire Vennootschap)', pt: 'PT (Perseroan Terbatas)', koperasi: 'Koperasi',
};
const durationLabels: Record<string, string> = {
  less_than_1: '< 1 tahun', '1_to_3': '1-3 tahun', '3_to_5': '3-5 tahun',
  '5_to_10': '5-10 tahun', more_than_10: '> 10 tahun',
};
const employeeLabels: Record<string, string> = {
  '1_5': '1-5 orang', '6_15': '6-15 orang', '16_50': '16-50 orang',
  '51_100': '51-100 orang', '100_plus': '100+ orang',
};
const revenueLabels: Record<string, string> = {
  under_50m: '< Rp 50 juta/bln', '50m_200m': 'Rp 50-200 juta/bln',
  '200m_500m': 'Rp 200-500 juta/bln', '500m_1b': 'Rp 500 juta-1 M/bln', over_1b: '> Rp 1 M/bln',
};
const docTypeLabels: Record<string, string> = {
  ktp: 'KTP Pemilik', npwp: 'NPWP', nib: 'NIB / Surat Izin', siup: 'SIUP',
  akta_pendirian: 'Akta Pendirian', foto_outlet: 'Foto Outlet',
  foto_interior: 'Foto Interior', foto_produk: 'Foto Produk',
  surat_izin_lain: 'Surat Izin Lain', other: 'Lainnya',
};

export default function KybReviewDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [kyb, setKyb] = useState<any>(null);
  const [actionModal, setActionModal] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && id) {
      fetchDetail();
    }
  }, [sessionStatus, id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/kyb/${id}`);
      const json = await res.json();
      if (json.success) {
        setKyb(json.data);
      } else {
        toast.error('Data tidak ditemukan');
        router.push('/admin/kyb-review');
      }
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/kyb/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNotes, rejectionReason }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setKyb(json.data);
        setActionModal(null);
        setReviewNotes('');
        setRejectionReason('');
      } else {
        toast.error(json.message || 'Gagal memproses');
      }
    } catch {
      toast.error('Gagal memproses aksi');
    } finally {
      setProcessing(false);
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) => (
    <div className="flex items-start py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center space-x-2 w-44 flex-shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
    </div>
  );

  if (loading || sessionStatus === 'loading') {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!kyb) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500">Data tidak ditemukan</p>
        </div>
      </AdminLayout>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-amber-100 text-amber-800',
    in_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    revision_needed: 'bg-orange-100 text-orange-800',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Draft', submitted: 'Menunggu Review', in_review: 'Sedang Direview',
    approved: 'Disetujui', rejected: 'Ditolak', revision_needed: 'Perlu Revisi',
  };

  return (
    <>
      <Head>
        <title>Review KYB: {kyb.businessName} | Admin BEDAGANG</title>
      </Head>

      <AdminLayout>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin/kyb-review" className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Kembali</span>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{kyb.businessName}</h1>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[kyb.status] || ''}`}>
                    {statusLabels[kyb.status] || kyb.status}
                  </span>
                  <span className="text-xs text-gray-400">ID: {kyb.id?.substring(0, 8)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {['submitted', 'in_review', 'revision_needed'].includes(kyb.status) && (
                <>
                  {kyb.status === 'submitted' && (
                    <button
                      onClick={() => handleAction('start_review')}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition flex items-center space-x-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Mulai Review</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActionModal('approve')}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui</span>
                  </button>
                  <button
                    onClick={() => setActionModal('request_revision')}
                    className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Minta Revisi</span>
                  </button>
                  <button
                    onClick={() => setActionModal('reject')}
                    className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center space-x-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak</span>
                  </button>
                </>
              )}
              {kyb.status === 'approved' && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Akun telah diaktivasi</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Business Identity */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-sky-500" />
                  <span>Identitas Bisnis</span>
                </h3>
                <InfoRow label="Nama Bisnis" value={kyb.businessName} icon={Building2} />
                <InfoRow label="Kategori" value={categoryLabels[kyb.businessCategory] || kyb.businessCategory} icon={Briefcase} />
                <InfoRow label="Lama Usaha" value={durationLabels[kyb.businessDuration] || kyb.businessDuration} icon={Calendar} />
                <InfoRow label="Jumlah Karyawan" value={employeeLabels[kyb.employeeCount] || kyb.employeeCount} icon={Users} />
                <InfoRow label="Omzet Bulanan" value={revenueLabels[kyb.annualRevenue] || kyb.annualRevenue} icon={DollarSign} />
                {kyb.businessDescription && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Deskripsi:</p>
                    <p className="text-sm text-gray-700">{kyb.businessDescription}</p>
                  </div>
                )}
              </motion.div>

              {/* Legal */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-sky-500" />
                  <span>Status Legalitas</span>
                </h3>
                <InfoRow label="Badan Usaha" value={legalLabels[kyb.legalEntityType] || kyb.legalEntityType} icon={Shield} />
                {kyb.legalEntityName && <InfoRow label="Nama Badan Usaha" value={kyb.legalEntityName} icon={Building2} />}
                <InfoRow label="Nama KTP" value={kyb.ktpName} icon={Users} />
                <InfoRow label="No. KTP (NIK)" value={kyb.ktpNumber} icon={Hash} />
                {kyb.nibNumber && <InfoRow label="No. NIB" value={kyb.nibNumber} icon={Hash} />}
                {kyb.siupNumber && <InfoRow label="No. SIUP" value={kyb.siupNumber} icon={FileText} />}
                {kyb.npwpNumber && <InfoRow label="No. NPWP" value={kyb.npwpNumber} icon={Hash} />}
              </motion.div>

              {/* PIC & Address */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  <span>PIC & Alamat</span>
                </h3>
                <InfoRow label="Nama PIC" value={kyb.picName} icon={Users} />
                <InfoRow label="Jabatan" value={kyb.picPosition} icon={Briefcase} />
                <InfoRow label="Telepon" value={kyb.picPhone} icon={Phone} />
                <InfoRow label="Email" value={kyb.picEmail} icon={Mail} />
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <InfoRow label="Alamat" value={kyb.businessAddress} icon={MapPin} />
                  <InfoRow label="Kecamatan" value={kyb.businessDistrict} />
                  <InfoRow label="Kota" value={kyb.businessCity} icon={Building2} />
                  <InfoRow label="Provinsi" value={kyb.businessProvince} icon={Globe} />
                  <InfoRow label="Kode Pos" value={kyb.businessPostalCode} icon={Hash} />
                </div>
              </motion.div>

              {/* Documents */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-sky-500" />
                  <span>Dokumen ({kyb.documents?.length || 0})</span>
                </h3>
                {kyb.documents?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {kyb.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                          <Image className="w-5 h-5 text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.documentName}</p>
                          <p className="text-xs text-gray-500">{docTypeLabels[doc.documentType] || doc.documentType}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          doc.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                          doc.verificationStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {doc.verificationStatus === 'verified' ? 'Terverifikasi' :
                           doc.verificationStatus === 'rejected' ? 'Ditolak' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada dokumen diupload</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Applicant Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3">Info Pendaftar</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{kyb.user?.name}</p>
                      <p className="text-xs text-gray-500">{kyb.user?.email}</p>
                    </div>
                  </div>
                  {kyb.user?.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{kyb.user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>Terdaftar {new Date(kyb.user?.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Business Structure */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-sky-500" />
                  <span>Struktur Bisnis</span>
                </h3>
                <div className={`p-3 rounded-lg ${kyb.businessStructure === 'multi_branch' ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className="font-medium text-sm">
                    {kyb.businessStructure === 'multi_branch' ? 'Multi-Cabang (Model HQ)' : 'Outlet Tunggal'}
                  </p>
                  {kyb.businessStructure === 'multi_branch' && (
                    <p className="text-xs text-gray-500 mt-1">Rencana: {kyb.plannedBranchCount || 1} cabang</p>
                  )}
                </div>
              </div>

              {/* Additional Notes */}
              {kyb.additionalNotes && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-sky-500" />
                    <span>Catatan Tambahan</span>
                  </h3>
                  <p className="text-sm text-gray-700">{kyb.additionalNotes}</p>
                  {kyb.referralSource && (
                    <p className="text-xs text-gray-400 mt-2">Referral: {kyb.referralSource}</p>
                  )}
                </div>
              )}

              {/* Review History */}
              {(kyb.reviewNotes || kyb.rejectionReason) && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-2">Riwayat Review</h3>
                  {kyb.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                      <p className="text-xs font-medium text-red-700 mb-1">Alasan Penolakan/Revisi:</p>
                      <p className="text-sm text-red-800">{kyb.rejectionReason}</p>
                    </div>
                  )}
                  {kyb.reviewNotes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 mb-1">Catatan Reviewer:</p>
                      <p className="text-sm text-blue-800">{kyb.reviewNotes}</p>
                    </div>
                  )}
                  {kyb.reviewedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      Direview: {new Date(kyb.reviewedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}

              {/* Progress */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-900 mb-2">Progres Pengisian</h3>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${kyb.completionPercentage}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{kyb.completionPercentage}%</span>
                </div>
                <p className="text-xs text-gray-400">Step {kyb.currentStep} dari 6</p>
                {kyb.submittedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Disubmit: {new Date(kyb.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Modal */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {actionModal === 'approve' && 'Setujui KYB'}
                {actionModal === 'reject' && 'Tolak KYB'}
                {actionModal === 'request_revision' && 'Minta Revisi Data'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {actionModal === 'approve' && 'Akun akan diaktivasi dan tenant akan diprovisioning secara otomatis.'}
                {actionModal === 'reject' && 'KYB akan ditolak. Berikan alasan yang jelas.'}
                {actionModal === 'request_revision' && 'Pemohon akan diminta untuk memperbaiki data. Jelaskan bagian mana yang perlu diperbaiki.'}
              </p>

              {(actionModal === 'reject' || actionModal === 'request_revision') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {actionModal === 'reject' ? 'Alasan Penolakan' : 'Yang Perlu Diperbaiki'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                    placeholder={actionModal === 'reject' ? 'Jelaskan alasan penolakan...' : 'Jelaskan data yang perlu diperbaiki...'}
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Internal (opsional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                  placeholder="Catatan untuk tim internal..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => { setActionModal(null); setReviewNotes(''); setRejectionReason(''); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleAction(actionModal)}
                  disabled={processing}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition flex items-center justify-center space-x-1.5 ${
                    actionModal === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    actionModal === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-orange-500 hover:bg-orange-600'
                  } disabled:opacity-50`}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>
                    {actionModal === 'approve' ? 'Setujui & Aktivasi' :
                     actionModal === 'reject' ? 'Tolak' : 'Kirim Revisi'}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
