import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '../../../../../components/hq/HQLayout';
import {
  ArrowLeft,
  FileText,
  Building2,
  User,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Send,
  Ban
} from 'lucide-react';

interface RequestDetail {
  id: string;
  requestNumber: string;
  providerId: string;
  providerName: string;
  providerCategory: string;
  branchId: string | null;
  branchName: string;
  requestType: string;
  businessInfo?: Record<string, any>;
  ownerInfo?: Record<string, any>;
  bankInfo?: Record<string, any>;
  documents?: Record<string, { filename: string; uploadedAt: string }>;
  requestedServices?: string[];
  status: string;
  providerStatus?: string;
  providerReferenceId?: string;
  priority?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  estimatedCompletionDate?: string;
  requestedByName?: string;
  reviewedByName?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  pending_documents: 'bg-orange-100 text-orange-700',
  approved: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-600'
};

export default function IntegrationRequestDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [req, setReq] = useState<RequestDetail | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    load(id);
  }, [id]);

  async function load(rid: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/hq/integrations/requests/${rid}`);
      if (res.ok) {
        const json = await res.json();
        setReq(json.data || json.request || null);
      } else {
        setReq(null);
      }
    } catch {
      setReq(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string, extra?: Record<string, any>) {
    if (!req) return;
    const confirmMsg =
      newStatus === 'submitted'
        ? 'Kirim pengajuan ini?'
        : newStatus === 'cancelled'
          ? 'Batalkan pengajuan ini?'
          : `Ubah status ke ${newStatus}?`;
    if (!confirm(confirmMsg)) return;
    setUpdating(true);
    try {
      const body: any = { status: newStatus, ...(extra || {}) };
      if (newStatus === 'submitted') body.submittedAt = new Date().toISOString();
      const res = await fetch(`/api/hq/integrations/requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.message || 'Gagal memperbarui');
      }
      await load(req.id);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <HQLayout title="Memuat pengajuan..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </HQLayout>
    );
  }

  if (!req) {
    return (
      <HQLayout title="Pengajuan Tidak Ditemukan" subtitle="">
        <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-200 p-10 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-6">Pengajuan tidak ditemukan.</p>
          <button
            onClick={() => router.push('/hq/settings/integrations')}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg"
          >
            Kembali ke Integrasi
          </button>
        </div>
      </HQLayout>
    );
  }

  return (
    <HQLayout
      title={`Pengajuan ${req.providerName}`}
      subtitle={`${req.requestNumber} · ${req.branchName}`}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => router.push('/hq/settings/integrations?tab=requests')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">{req.providerName}</h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    statusColors[req.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {req.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {req.requestNumber} · dibuat{' '}
                {new Date(req.createdAt).toLocaleDateString('id-ID')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {req.status === 'draft' && (
                <button
                  onClick={() => updateStatus('submitted')}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {updating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Kirim Pengajuan
                </button>
              )}
              {['draft', 'submitted', 'under_review', 'pending_documents'].includes(req.status) && (
                <button
                  onClick={() => updateStatus('cancelled')}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" /> Batalkan
                </button>
              )}
            </div>
          </div>

          {req.reviewNotes && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <strong>Catatan Reviewer:</strong> {req.reviewNotes}
            </div>
          )}
          {req.rejectionReason && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
              <strong>Alasan Penolakan:</strong> {req.rejectionReason}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Section title="Informasi Bisnis" icon={Building2}>
            {req.businessInfo ? (
              <KVList data={req.businessInfo} />
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </Section>
          <Section title="Pemilik / PIC" icon={User}>
            {req.ownerInfo ? (
              <KVList data={req.ownerInfo} />
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </Section>
          <Section title="Rekening Bank" icon={CreditCard}>
            {req.bankInfo ? (
              <KVList data={req.bankInfo} />
            ) : (
              <p className="text-sm text-gray-400">-</p>
            )}
          </Section>
          <Section title="Dokumen" icon={FileText}>
            {req.documents && Object.keys(req.documents).length > 0 ? (
              <ul className="text-sm space-y-2">
                {Object.entries(req.documents).map(([key, doc]) => (
                  <li key={key} className="flex items-center justify-between">
                    <span className="text-gray-600 capitalize">{key}</span>
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle className="w-4 h-4" /> {doc.filename}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Belum ada dokumen</p>
            )}
          </Section>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline
          </h3>
          <Timeline req={req} />
        </div>
      </div>
    </HQLayout>
  );
}

function Section({
  title,
  icon: Icon,
  children
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

function KVList({ data }: { data: Record<string, any> }) {
  return (
    <dl className="space-y-2 text-sm">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-1 last:border-0">
          <dt className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
          <dd className="text-gray-900 text-right break-words">{String(v ?? '-')}</dd>
        </div>
      ))}
    </dl>
  );
}

function Timeline({ req }: { req: RequestDetail }) {
  const events: { label: string; at?: string; ok?: boolean; active?: boolean }[] = [
    { label: 'Draft dibuat', at: req.createdAt, ok: true },
    { label: 'Pengajuan dikirim', at: req.submittedAt, ok: !!req.submittedAt },
    { label: 'Reviewer memproses', at: req.reviewedAt, ok: !!req.reviewedAt },
    {
      label:
        req.status === 'rejected'
          ? 'Pengajuan ditolak'
          : req.status === 'approved'
            ? 'Disetujui'
            : 'Menunggu keputusan',
      at: req.approvedAt || (req.status === 'rejected' ? req.reviewedAt : undefined),
      ok: req.status === 'approved',
      active: req.status !== 'approved' && req.status !== 'rejected'
    }
  ];

  return (
    <ol className="relative border-s border-gray-200 space-y-6 ms-2">
      {events.map((ev, i) => (
        <li key={i} className="ms-4">
          <span
            className={`absolute -start-1.5 flex items-center justify-center w-3 h-3 rounded-full mt-1.5 ${
              ev.ok ? 'bg-emerald-500' : ev.active ? 'bg-indigo-500' : 'bg-gray-300'
            }`}
          />
          <p className="text-sm font-medium text-gray-900">{ev.label}</p>
          <p className="text-xs text-gray-500">
            {ev.at ? new Date(ev.at).toLocaleString('id-ID') : 'Belum tercatat'}
          </p>
        </li>
      ))}
    </ol>
  );
}
