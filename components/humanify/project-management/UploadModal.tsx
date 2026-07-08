import React from 'react';
import { Upload, X } from 'lucide-react';
import { UploadForm } from './types';
import { DOC_CATEGORIES } from './utils';
import { ProjectItem } from './types';

interface Props {
  showUploadModal: boolean;
  setShowUploadModal: (v: boolean) => void;
  uploadFiles: File[];
  setUploadFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploadForm: UploadForm;
  setUploadForm: React.Dispatch<React.SetStateAction<UploadForm>>;
  handleUpload: () => Promise<void>;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number) => void;
  dragActive: boolean;
  projects: ProjectItem[];
  getFileIcon: (ext: string) => React.ReactNode;
  fmtSize: (bytes: number) => string;
}

export default function UploadModal({
  showUploadModal, setShowUploadModal, uploadFiles, setUploadFiles, uploadForm, setUploadForm,
  handleUpload, uploading, fileInputRef, handleDrag, handleDrop, handleFileSelect,
  removeFile, dragActive, projects, getFileIcon, fmtSize,
}: Props) {
  if (!showUploadModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold">Upload Dokumen</h3>
            <p className="text-sm text-gray-500">Upload file untuk proyek (maks 25MB per file)</p>
          </div>
          <button onClick={() => setShowUploadModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
            onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar" />
            <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${dragActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              <Upload className={`w-7 h-7 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium text-gray-700">Drag & drop file di sini</p>
            <p className="text-sm text-gray-500 mt-1">atau <span className="text-indigo-600 font-medium">klik untuk pilih file</span></p>
            <p className="text-xs text-gray-400 mt-2">PDF, DOC, XLS, PPT, JPG, PNG, ZIP (maks 25MB)</p>
          </div>

          {uploadFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{uploadFiles.length} file dipilih</p>
              {uploadFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getFileIcon(file.name.split('.').pop() || '')}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{fmtSize(file.size)}</p>
                  </div>
                  <button onClick={() => removeFile(idx)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-gray-700">Nama Dokumen</label><input value={uploadForm.name} onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })} placeholder="Opsional (default: nama file)" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Kategori</label>
              <select value={uploadForm.category} onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium text-gray-700">Proyek Terkait</label>
            <select value={uploadForm.projectId} onChange={e => setUploadForm({ ...uploadForm, projectId: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
              <option value="">Tidak spesifik (umum)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-medium text-gray-700">Deskripsi</label><textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Keterangan singkat dokumen..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
          <div><label className="text-sm font-medium text-gray-700">Tags</label><input value={uploadForm.tags} onChange={e => setUploadForm({ ...uploadForm, tags: e.target.value })} placeholder="Pisahkan dengan koma, mis: kontrak, legal" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Batal</button>
          <button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0}
            className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            {uploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengunggah...</> : <><Upload className="w-4 h-4" /> Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
