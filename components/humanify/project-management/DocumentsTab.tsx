import React from 'react';
import { Search, Upload, Tag, Download, Trash2, FolderOpen, X } from 'lucide-react';
import { ProjectDocument, DocFilter, UploadForm } from './types';
import { fmtSize, getFileIcon, DOC_CATEGORIES } from './utils';

interface Props {
  documents: ProjectDocument[];
  docFilter: DocFilter;
  setDocFilter: React.Dispatch<React.SetStateAction<DocFilter>>;
  setShowUploadModal: (v: boolean) => void;
  setUploadFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setUploadForm: React.Dispatch<React.SetStateAction<UploadForm>>;
  handleDeleteDoc: (id: string) => void;
}

export default function DocumentsTab({ documents, docFilter, setDocFilter, setShowUploadModal, setUploadFiles, setUploadForm, handleDeleteDoc }: Props) {
  const filteredDocs = documents.filter(d => {
    if (docFilter.category && d.category !== docFilter.category) return false;
    if (docFilter.search && !d.name.toLowerCase().includes(docFilter.search.toLowerCase()) && !d.originalFilename?.toLowerCase().includes(docFilter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold">Dokumen Proyek</h2>
          <p className="text-sm text-gray-500">{filteredDocs.length} dokumen</p>
        </div>
        <button onClick={() => { setShowUploadModal(true); setUploadFiles([]); setUploadForm({ name: '', description: '', category: 'Umum', projectId: '', tags: '' }); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200 transition-all">
          <Upload className="w-4 h-4" /> Upload Dokumen
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={docFilter.search} onChange={e => setDocFilter({ ...docFilter, search: e.target.value })} placeholder="Cari dokumen..." className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
        <select value={docFilter.category} onChange={e => setDocFilter({ ...docFilter, category: e.target.value })} className="px-3 py-2.5 border rounded-xl text-sm bg-white min-w-[150px]">
          <option value="">Semua Kategori</option>
          {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filteredDocs.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white border rounded-xl p-4 hover:shadow-lg hover:border-indigo-200 transition-all group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors">
                  {getFileIcon(doc.fileExtension)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{doc.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{doc.originalFilename}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.filePath} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Download className="w-3.5 h-3.5" /></a>
                  <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {doc.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{doc.description}</p>}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full"><Tag className="w-3 h-3" />{doc.category}</span>
                <span className="text-xs text-gray-400 uppercase font-mono">{doc.fileExtension?.replace('.', '')}</span>
                <span className="text-xs text-gray-400">{fmtSize(doc.fileSize)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t">
                <span>{doc.uploadedBy}</span>
                <span>{new Date(doc.uploadedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border-2 border-dashed rounded-2xl">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada dokumen</p>
          <p className="text-sm text-gray-400 mt-1">Upload dokumen pertama Anda untuk mulai mengelola</p>
          <button onClick={() => { setShowUploadModal(true); setUploadFiles([]); }} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            <Upload className="w-4 h-4 inline mr-1.5" />Upload Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
