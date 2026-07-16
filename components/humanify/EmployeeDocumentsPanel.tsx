import { useMemo, useState } from 'react';
import {
  Plus, FileText, Search, CheckCircle, AlertCircle, Clock,
  Upload, ShieldCheck, XCircle,
} from 'lucide-react';
import EmployeeDocumentModal, { EmployeeDocumentCard } from '@/components/humanify/EmployeeDocumentModal';
import {
  EMPLOYEE_DOCUMENT_CATEGORIES,
  EMPLOYEE_DOCUMENT_TYPES,
  REQUIRED_DOCUMENT_TYPES,
  computeDocumentCompleteness,
  getDocumentTypeLabel,
} from '@/lib/hris/employee-document-types';

interface Props {
  employeeId: string | number;
  documents: any[];
  onRefresh: () => void;
  showToast: (type: string, message: string) => void;
  fmtDate: (d: any) => string;
}

export default function EmployeeDocumentsPanel({
  employeeId,
  documents,
  onRefresh,
  showToast,
  fmtDate,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const completeness = useMemo(() => computeDocumentCompleteness(documents), [documents]);

  const filtered = useMemo(() => {
    let list = [...(documents || [])];
    if (filterCategory) {
      const catTypes = new Set(
        EMPLOYEE_DOCUMENT_TYPES.filter((t) => t.category === filterCategory).map((t) => t.value)
      );
      list = list.filter((d) => catTypes.has(d.document_type));
    }
    if (filterStatus) {
      list = list.filter((d) => (d.status || 'pending') === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d) =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.file_name || '').toLowerCase().includes(q) ||
        getDocumentTypeLabel(d.document_type).toLowerCase().includes(q) ||
        (d.document_number || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [documents, filterCategory, filterStatus, search]);

  const openUpload = (preset?: { document_type?: string; title?: string }) => {
    setForm(preset ? { ...preset } : {});
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      const res = await fetch(`/api/humanify/employee-documents?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Dokumen dihapus');
        onRefresh();
      } else showToast('error', json.error || 'Gagal menghapus');
    } catch {
      showToast('error', 'Gagal menghapus');
    }
  };

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const res = await fetch('/api/humanify/employee-documents?action=verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message);
        onRefresh();
      } else showToast('error', json.error || 'Gagal');
    } catch {
      showToast('error', 'Gagal memverifikasi');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-800">Dokumen Digital Karyawan</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Kelola KTP, KK, NPWP, ijazah, kontrak — standar Employee Files HRIS
          </p>
        </div>
        <button
          type="button"
          onClick={() => openUpload()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <Plus className="w-3.5 h-3.5" /> Upload Dokumen
        </button>
      </div>

      {/* Kelengkapan berkas wajib */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-800">Kelengkapan Berkas Wajib</span>
          </div>
          <span className={`text-sm font-bold ${completeness.percent === 100 ? 'text-green-600' : 'text-amber-600'}`}>
            {completeness.percent}%
          </span>
        </div>
        <div className="w-full bg-white/70 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all ${completeness.percent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mb-3">
          {completeness.uploadedRequired}/{completeness.totalRequired} dokumen wajib terupload
          {completeness.verifiedRequired > 0 && ` • ${completeness.verifiedRequired} terverifikasi`}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {REQUIRED_DOCUMENT_TYPES.map((req) => {
            const uploaded = (documents || []).find((d) => d.document_type === req.value && d.file_url);
            const verified = uploaded?.status === 'verified';
            return (
              <button
                key={req.value}
                type="button"
                onClick={() => openUpload({ document_type: req.value, title: req.label })}
                className={`text-left p-2 rounded-lg border text-xs transition ${
                  verified
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : uploaded
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-white border-dashed border-gray-300 text-gray-500 hover:border-violet-400'
                }`}
              >
                <div className="flex items-center gap-1">
                  {verified ? (
                    <CheckCircle className="w-3 h-3 shrink-0" />
                  ) : uploaded ? (
                    <Clock className="w-3 h-3 shrink-0" />
                  ) : (
                    <Upload className="w-3 h-3 shrink-0" />
                  )}
                  <span className="truncate font-medium">{req.label.split('(')[0].trim()}</span>
                </div>
              </button>
            );
          })}
        </div>
        {completeness.missing.length > 0 && (
          <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Belum ada: {completeness.missing.map((m) => m.label.split('(')[0].trim()).join(', ')}
          </p>
        )}
      </div>

      {/* Alert kadaluarsa */}
      {(completeness.expired.length > 0 || completeness.expiringSoon.length > 0) && (
        <div className="space-y-2">
          {completeness.expired.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{completeness.expired.length} dokumen sudah kadaluarsa — perlu perbarui segera</span>
            </div>
          )}
          {completeness.expiringSoon.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{completeness.expiringSoon.length} dokumen akan kadaluarsa dalam 30 hari</span>
            </div>
          )}
        </div>
      )}

      {/* Filter & search */}
      {(documents || []).length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari dokumen..."
              className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">Semua Kategori</option>
            {EMPLOYEE_DOCUMENT_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="verified">Terverifikasi</option>
            <option value="rejected">Ditolak</option>
            <option value="expired">Kedaluwarsa</option>
          </select>
        </div>
      )}

      {/* Daftar dokumen */}
      {(documents || []).length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-xl">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Belum ada dokumen diunggah</p>
          <button type="button" onClick={() => openUpload()} className="mt-3 text-sm text-violet-600 hover:underline">
            + Upload dokumen pertama
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">Tidak ada dokumen sesuai filter</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((d) => (
            <div key={d.id} className="relative">
              <EmployeeDocumentCard
                doc={d}
                fmtDate={fmtDate}
                onEdit={() => { setForm({ ...d }); setShowModal(true); }}
                onDelete={() => handleDelete(d.id)}
              />
              {d.file_url && d.status === 'pending' && (
                <div className="flex gap-1 mt-1 px-1">
                  <button
                    type="button"
                    onClick={() => handleVerify(d.id, 'verified')}
                    className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    ✓ Verifikasi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify(d.id, 'rejected')}
                    className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    ✕ Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <EmployeeDocumentModal
        open={showModal}
        form={form}
        setForm={setForm}
        employeeId={employeeId}
        showToast={showToast}
        onClose={() => { setShowModal(false); setForm({}); }}
        onSaved={onRefresh}
        existingDocuments={documents}
      />
    </div>
  );
}
