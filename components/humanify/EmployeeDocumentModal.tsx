import { useRef, useState } from 'react';
import { X, Upload, FileText, Download, Eye, Edit, Trash2, AlertCircle } from 'lucide-react';
import {
  EMPLOYEE_DOCUMENT_CATEGORIES,
  EMPLOYEE_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE_MB,
  getDocumentTypeLabel,
  getDocumentTypeMeta,
  getAcceptAttribute,
  isAcceptedFile,
  getExpiryState,
  getVerificationLabel,
  getEmployeeDocumentDownloadUrl,
} from '@/lib/hris/employee-document-types';

interface Props {
  open: boolean;
  onClose: () => void;
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  employeeId: string | number;
  onSaved: () => void;
  showToast: (type: string, message: string) => void;
  existingDocuments?: any[];
}

function fmtSize(bytes: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmployeeDocumentModal({
  open,
  onClose,
  form,
  setForm,
  employeeId,
  onSaved,
  showToast,
  existingDocuments = [],
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);

  if (!open) return null;

  const typeMeta = getDocumentTypeMeta(form.document_type || '');
  const isEdit = Boolean(form.id);
  const hasExistingType = !isEdit && form.document_type &&
    (existingDocuments || []).some((d) => d.document_type === form.document_type && d.file_url);

  const handleTypeChange = (value: string) => {
    const meta = getDocumentTypeMeta(value);
    setForm((f) => ({
      ...f,
      document_type: value,
      title: f.title && f.id ? f.title : meta?.label || value,
    }));
  };

  const pickFile = (file: File | null) => {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_SIZE_MB * 1024 * 1024) {
      showToast('error', `Ukuran file maksimal ${MAX_DOCUMENT_SIZE_MB}MB`);
      return;
    }
    if (!isAcceptedFile(file)) {
      showToast('error', 'Format tidak didukung. Gunakan PDF, JPG, PNG, atau DOC/DOCX');
      return;
    }
    setSelectedFile(file);
    if (!form.title && !form.id) {
      const base = getDocumentTypeLabel(form.document_type || '') || 'Dokumen';
      setForm((f) => ({ ...f, title: `${base} — ${file.name}` }));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  };

  const handleSave = async () => {
    if (!form.document_type) {
      showToast('error', 'Pilih tipe dokumen');
      return;
    }
    if (!form.title?.trim()) {
      showToast('error', 'Judul dokumen wajib diisi');
      return;
    }
    if (!isEdit && !selectedFile) {
      showToast('error', 'Pilih file dokumen untuk diunggah');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('employee_id', String(employeeId));
      fd.append('document_type', form.document_type);
      fd.append('title', form.title.trim());
      if (form.document_number) fd.append('document_number', form.document_number);
      if (form.description) fd.append('description', form.description);
      if (form.issue_date) fd.append('issue_date', form.issue_date);
      if (form.expiry_date) fd.append('expiry_date', form.expiry_date);
      if (form.signed_by) fd.append('signed_by', form.signed_by);
      if (form.id) fd.append('id', form.id);
      if (selectedFile) fd.append('file', selectedFile);
      if (hasExistingType && replaceExisting) fd.append('replace_existing', 'true');

      const res = await fetch('/api/humanify/employee-documents', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        showToast('success', json.message || 'Dokumen berhasil disimpan');
        setSelectedFile(null);
        onSaved();
        onClose();
      } else {
        showToast('error', json.error || 'Gagal menyimpan dokumen');
      }
    } catch {
      showToast('error', 'Gagal menyimpan dokumen');
    }
    setSaving(false);
  };

  const existingFileUrl = form.id && form.file_url ? getEmployeeDocumentDownloadUrl(form.id) : undefined;
  const existingFileDownloadUrl = form.id && form.file_url ? getEmployeeDocumentDownloadUrl(form.id, true) : undefined;
  const existingFileName = (form.file_name as string) || 'Lihat dokumen';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-gray-800">
            {isEdit ? 'Edit Dokumen' : 'Upload Dokumen Karyawan'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Tipe Dokumen *</label>
            <select
              value={form.document_type || ''}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            >
              <option value="">— Pilih tipe dokumen —</option>
              {EMPLOYEE_DOCUMENT_CATEGORIES.map((cat) => (
                <optgroup key={cat.key} label={cat.label}>
                  {EMPLOYEE_DOCUMENT_TYPES.filter((t) => t.category === cat.key).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}{t.required ? ' ★' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">★ = dokumen wajib</p>
          </div>

          {typeMeta?.uploadHint && (
            <div className="flex items-start gap-2 p-2.5 bg-violet-50 border border-violet-100 rounded-lg text-xs text-violet-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{typeMeta.uploadHint}</span>
            </div>
          )}

          {hasExistingType && (
            <label className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              Ganti dokumen {getDocumentTypeLabel(form.document_type)} yang sudah ada
            </label>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500">Judul Dokumen *</label>
            <input
              type="text"
              value={form.title || ''}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={typeMeta?.label || 'Nama dokumen'}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">No. Dokumen</label>
            <input
              type="text"
              value={form.document_number || ''}
              onChange={(e) => setForm((f) => ({ ...f, document_number: e.target.value }))}
              placeholder={typeMeta?.hasNumber ? 'Nomor identitas / referensi' : 'Opsional'}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Tanggal Terbit</label>
              <input
                type="date"
                value={form.issue_date || ''}
                onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                Tanggal Kadaluarsa{typeMeta?.hasExpiry ? ' *' : ''}
              </label>
              <input
                type="date"
                value={form.expiry_date || ''}
                onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">
              File Dokumen {!isEdit && '*'}
            </label>
            {existingFileUrl && !selectedFile && (
              <div className="mt-1 mb-2 flex items-center gap-2 p-2 bg-violet-50 border border-violet-100 rounded-lg text-sm">
                <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="flex-1 truncate text-gray-700">{existingFileName}</span>
                <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-violet-600 hover:bg-violet-100 rounded" title="Lihat">
                  <Eye className="w-4 h-4" />
                </a>
                <a href={existingFileDownloadUrl || existingFileUrl} download className="p-1 text-violet-600 hover:bg-violet-100 rounded" title="Unduh">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragActive ? 'border-violet-500 bg-violet-50' : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={getAcceptAttribute()}
                onChange={(e) => pickFile(e.target.files?.[0] || null)}
              />
              <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                dragActive ? 'bg-violet-100' : 'bg-gray-100'
              }`}>
                <Upload className={`w-6 h-6 ${dragActive ? 'text-violet-600' : 'text-gray-400'}`} />
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">{fmtSize(selectedFile.size)}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="text-xs text-red-500 mt-1 hover:underline"
                  >
                    Hapus pilihan
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Drag & drop file di sini</p>
                  <p className="text-xs text-gray-500 mt-1">
                    atau <span className="text-violet-600">klik untuk pilih file</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PDF, JPG, PNG, DOC (maks {MAX_DOCUMENT_SIZE_MB}MB)
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Deskripsi</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              rows={2}
              placeholder="Catatan tambahan (opsional)"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Ditandatangani Oleh</label>
            <input
              type="text"
              value={form.signed_by || ''}
              onChange={(e) => setForm((f) => ({ ...f, signed_by: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              placeholder="Nama penandatangan (opsional)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {isEdit ? 'Simpan Perubahan' : 'Upload Dokumen'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmployeeDocumentCard({
  doc,
  onEdit,
  onDelete,
  fmtDate,
}: {
  doc: any;
  onEdit: () => void;
  onDelete: () => void;
  fmtDate: (d: any) => string;
}) {
  const typeLabel = getDocumentTypeLabel(doc.document_type);
  const fileAccessUrl = doc.id && doc.file_url ? getEmployeeDocumentDownloadUrl(doc.id) : null;
  const fileDownloadUrl = doc.id && doc.file_url ? getEmployeeDocumentDownloadUrl(doc.id, true) : null;
  const isImage = doc.mime_type?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(doc.file_url || '');
  const expiryState = getExpiryState(doc.expiry_date);
  const verLabel = getVerificationLabel(doc.status);

  return (
    <div className={`border rounded-lg p-4 hover:bg-gray-50 ${
      expiryState === 'expired' ? 'border-red-200 bg-red-50/30' :
      expiryState === 'expiring_soon' ? 'border-amber-200 bg-amber-50/30' : ''
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {isImage && fileAccessUrl ? (
            <img src={fileAccessUrl} alt={doc.title} className="w-12 h-12 rounded-lg object-cover border shrink-0" />
          ) : (
            <div className="p-2 bg-violet-50 rounded-lg shrink-0">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">{doc.title}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded">{typeLabel}</span>
              <span className={`inline-block px-2 py-0.5 text-[10px] rounded ${
                doc.status === 'verified' ? 'bg-green-50 text-green-700' :
                doc.status === 'rejected' ? 'bg-red-50 text-red-700' :
                doc.status === 'expired' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-700'
              }`}>{verLabel}</span>
              {expiryState === 'expiring_soon' && (
                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded">Segera kadaluarsa</span>
              )}
            </div>
            {doc.document_number && <p className="text-xs text-gray-400 mt-1">No: {doc.document_number}</p>}
            <p className="text-xs text-gray-400">
              {doc.issue_date && `Terbit: ${fmtDate(doc.issue_date)}`}
              {doc.expiry_date && ` • Kadaluarsa: ${fmtDate(doc.expiry_date)}`}
            </p>
            {doc.file_name && <p className="text-[10px] text-gray-400 truncate mt-0.5">{doc.file_name}</p>}
            {!doc.file_url && (
              <p className="text-[10px] text-red-500 mt-1">⚠ Belum ada file terlampir</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {fileAccessUrl && (
            <>
              <a href={fileAccessUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded" title="Lihat">
                <Eye className="w-3.5 h-3.5" />
              </a>
              <a href={fileDownloadUrl || fileAccessUrl} download className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" title="Unduh">
                <Download className="w-3.5 h-3.5" />
              </a>
            </>
          )}
          <button type="button" onClick={onEdit} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
