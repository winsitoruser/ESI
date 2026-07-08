import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Upload, FileText, CheckCircle, Clock, AlertCircle, Eye, Download, Trash2, X, Plus,
} from 'lucide-react';
import {
  REQUIRED_DOCUMENT_TYPES,
  EMPLOYEE_DOCUMENT_CATEGORIES,
  EMPLOYEE_DOCUMENT_TYPES,
  computeDocumentCompleteness,
  getDocumentTypeLabel,
  getDocumentTypeMeta,
  getAcceptAttribute,
  getVerificationLabel,
  getExpiryState,
  isAcceptedFile,
  MAX_DOCUMENT_SIZE_MB,
} from '@/lib/hris/employee-document-types';

function fmtSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
}

export default function MyFilesTab() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employee/my-files');
      const json = await res.json();
      if (json.success) setDocuments(json.data?.documents || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const completeness = useMemo(() => computeDocumentCompleteness(documents), [documents]);
  const typeMeta = getDocumentTypeMeta(form.document_type || '');

  const openUpload = (preset?: { document_type?: string; title?: string }) => {
    setForm(preset ? { ...preset } : {});
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.document_type || !form.title?.trim()) return;
    if (!form.id && !selectedFile) return;

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('document_type', form.document_type);
      fd.append('title', form.title.trim());
      if (form.document_number) fd.append('document_number', form.document_number);
      if (form.description) fd.append('description', form.description);
      if (form.issue_date) fd.append('issue_date', form.issue_date);
      if (form.expiry_date) fd.append('expiry_date', form.expiry_date);
      if (form.id) fd.append('id', form.id);
      if (selectedFile) fd.append('file', selectedFile);
      fd.append('replace_existing', 'true');

      const res = await fetch('/api/employee/my-files', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Dokumen berhasil diunggah');
        setShowModal(false);
        setForm({});
        setSelectedFile(null);
        fetchDocs();
      } else {
        toast.error(json.error || 'Gagal mengunggah');
      }
    } catch {
      /* ignore */
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      const res = await fetch(`/api/employee/my-files?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchDocs();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-40 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Kelengkapan */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Kelengkapan Berkas Saya</p>
          <span className="text-lg font-bold">{completeness.percent}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2 mb-2">
          <div className="h-2 bg-white rounded-full transition-all" style={{ width: `${completeness.percent}%` }} />
        </div>
        <p className="text-xs text-blue-100">
          {completeness.uploadedRequired}/{completeness.totalRequired} dokumen wajib terupload
        </p>
      </div>

      {/* Quick upload wajib */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900 mb-3">Dokumen Wajib</p>
        <div className="grid grid-cols-2 gap-2">
          {REQUIRED_DOCUMENT_TYPES.map((req) => {
            const doc = documents.find((d) => d.document_type === req.value && d.file_url);
            const verified = doc?.status === 'verified';
            return (
              <button
                key={req.value}
                type="button"
                onClick={() => openUpload({ document_type: req.value, title: req.label })}
                className={`text-left p-3 rounded-xl border text-xs transition active:scale-[0.98] ${
                  verified ? 'bg-emerald-50 border-emerald-200' :
                  doc ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-dashed border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {verified ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> :
                    doc ? <Clock className="w-3.5 h-3.5 text-amber-600" /> :
                    <Upload className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="font-medium text-slate-800 truncate">{req.label.split('(')[0].trim()}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {verified ? 'Terverifikasi' : doc ? 'Menunggu HR' : 'Belum diupload'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daftar semua */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-900">Semua Dokumen</p>
          <button
            type="button"
            onClick={() => openUpload()}
            className="flex items-center gap-1 text-xs text-blue-600 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada dokumen</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const expiry = getExpiryState(doc.expiry_date);
              return (
                <div key={doc.id} className={`p-3 rounded-xl border ${
                  expiry === 'expired' ? 'border-red-200 bg-red-50/50' :
                  expiry === 'expiring_soon' ? 'border-amber-200 bg-amber-50/50' :
                  'border-slate-100 bg-slate-50/50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-[10px] text-indigo-600 font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{getVerificationLabel(doc.status)}</p>
                      {doc.expiry_date && (
                        <p className="text-[10px] text-slate-400">Kadaluarsa: {fmtDate(doc.expiry_date)}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {doc.file_url && (
                        <>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white">
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                          </a>
                          <a href={doc.file_url} download className="p-1.5 rounded-lg hover:bg-white">
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                          </a>
                        </>
                      )}
                      {doc.status !== 'verified' && (
                        <button type="button" onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg hover:bg-white">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-900">Upload Dokumen</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Tipe Dokumen *</label>
                <select
                  value={form.document_type || ''}
                  onChange={(e) => {
                    const meta = getDocumentTypeMeta(e.target.value);
                    setForm((f) => ({
                      ...f,
                      document_type: e.target.value,
                      title: f.id ? f.title : meta?.label || e.target.value,
                    }));
                  }}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm"
                >
                  <option value="">Pilih tipe</option>
                  {EMPLOYEE_DOCUMENT_CATEGORIES.map((cat) => (
                    <optgroup key={cat.key} label={cat.label}>
                      {EMPLOYEE_DOCUMENT_TYPES.filter((t) => t.category === cat.key).map((t) => (
                        <option key={t.value} value={t.value}>{t.label}{t.required ? ' ★' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {typeMeta?.uploadHint && (
                <div className="flex gap-2 p-2.5 bg-blue-50 rounded-xl text-xs text-blue-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{typeMeta.uploadHint}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500">Judul *</label>
                <input
                  type="text"
                  value={form.title || ''}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">No. Dokumen</label>
                <input
                  type="text"
                  value={form.document_number || ''}
                  onChange={(e) => setForm((f) => ({ ...f, document_number: e.target.value }))}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl text-sm"
                  placeholder="Opsional"
                />
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={getAcceptAttribute()}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!isAcceptedFile(file)) { toast.error('Format file tidak didukung'); return; }
                    if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
                      toast.error(`Maksimal ${MAX_DOCUMENT_SIZE_MB}MB`);
                      return;
                    }
                    setSelectedFile(file);
                  }}
                />
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-slate-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{fmtSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Ketuk untuk pilih file</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG (maks {MAX_DOCUMENT_SIZE_MB}MB)</p>
              </div>

              <p className="text-[10px] text-slate-400 text-center">
                Dokumen akan ditinjau oleh tim HR sebelum diverifikasi
              </p>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border rounded-xl text-sm">
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.document_type || !form.title || (!form.id && !selectedFile)}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Mengunggah...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
