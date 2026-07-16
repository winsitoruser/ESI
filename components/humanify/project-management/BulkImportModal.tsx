import React from 'react';
import { X, Download, FilePlus, Eye, Check, AlertTriangle, Upload } from 'lucide-react';
import { ProjectItem } from './types';

interface Props {
  showBulkModal: boolean;
  setShowBulkModal: (v: boolean) => void;
  bulkType: 'workers' | 'timesheets' | 'payroll';
  bulkProjectId: string;
  setBulkProjectId: (v: string) => void;
  bulkCsvText: string;
  setBulkCsvText: (v: string) => void;
  bulkParsed: any[];
  bulkErrors: string[];
  bulkUploading: boolean;
  bulkResult: { success: number; failed: number } | null;
  BULK_LABELS: Record<string, { title: string; color: string }>;
  BULK_HEADERS: Record<string, { required: string[]; optional: string[]; example: string }>;
  projects: ProjectItem[];
  csvInputRef: React.RefObject<HTMLInputElement | null>;
  downloadCsvTemplate: (type: 'workers' | 'timesheets' | 'payroll') => void;
  handleCsvFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  parseBulkCsv: (text: string, type: 'workers' | 'timesheets' | 'payroll') => void;
  handleBulkImport: () => Promise<void>;
}

export default function BulkImportModal({
  showBulkModal, setShowBulkModal, bulkType, bulkProjectId, setBulkProjectId,
  bulkCsvText, setBulkCsvText, bulkParsed, bulkErrors, bulkUploading, bulkResult,
  BULK_LABELS, BULK_HEADERS, projects, csvInputRef,
  downloadCsvTemplate, handleCsvFileUpload, parseBulkCsv, handleBulkImport,
}: Props) {
  if (!showBulkModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-lg font-semibold">{BULK_LABELS[bulkType].title}</h3>
            <p className="text-sm text-gray-500">Import data dari file CSV atau paste langsung</p>
          </div>
          <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Proyek <span className="text-red-500">*</span></label>
            <select value={bulkProjectId} onChange={e => setBulkProjectId(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
              <option value="">Pilih Proyek</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => downloadCsvTemplate(bulkType)}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Download Template CSV
            </button>
            <button onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <FilePlus className="w-4 h-4" /> Upload File CSV
            </button>
            <input ref={csvInputRef} type="file" accept=".csv,.txt" onChange={handleCsvFileUpload} className="hidden" />
            <button onClick={() => { setBulkCsvText(BULK_HEADERS[bulkType].example); parseBulkCsv(BULK_HEADERS[bulkType].example, bulkType); }}
              className="flex items-center gap-2 px-3 py-2 border border-indigo-200 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50">
              <Eye className="w-4 h-4" /> Isi Contoh Data
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Data CSV</label>
            <textarea value={bulkCsvText} onChange={e => { setBulkCsvText(e.target.value); if (e.target.value.trim()) parseBulkCsv(e.target.value, bulkType); else { parseBulkCsv('', bulkType); } }}
              placeholder={`Paste CSV di sini...\n\nFormat header:\n${BULK_HEADERS[bulkType].required.join(', ')}${BULK_HEADERS[bulkType].optional.length ? ', ' + BULK_HEADERS[bulkType].optional.join(', ') : ''}`}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono h-32 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
            <div className="flex gap-4 mt-1 text-xs text-gray-400">
              <span>Kolom wajib: <strong className="text-gray-600">{BULK_HEADERS[bulkType].required.join(', ')}</strong></span>
              {BULK_HEADERS[bulkType].optional.length > 0 && <span>Opsional: {BULK_HEADERS[bulkType].optional.join(', ')}</span>}
            </div>
          </div>

          {bulkErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {bulkErrors.length} kesalahan ditemukan</p>
              <ul className="text-xs text-red-700 space-y-0.5 max-h-24 overflow-y-auto">
                {bulkErrors.map((err, i) => <li key={i}>- {err}</li>)}
              </ul>
            </div>
          )}

          {bulkParsed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-600" /> {bulkParsed.length} baris siap diimport
                </p>
                {bulkErrors.length > 0 && <span className="text-xs text-amber-600">{bulkErrors.length} warning (tetap bisa import)</span>}
              </div>
              <div className="overflow-x-auto border rounded-lg max-h-48">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-gray-500">#</th>
                      {Object.keys(bulkParsed[0] || {}).map(h => <th key={h} className="px-2 py-1.5 text-left text-gray-500 whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bulkParsed.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                        {Object.values(row).map((v: any, j) => <td key={j} className="px-2 py-1.5 whitespace-nowrap">{v || <span className="text-gray-300">-</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bulkParsed.length > 20 && <p className="text-xs text-center text-gray-400 py-2">...dan {bulkParsed.length - 20} baris lainnya</p>}
              </div>
            </div>
          )}

          {bulkResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800 flex items-center gap-1"><Check className="w-4 h-4" /> Import selesai!</p>
              <p className="text-xs text-green-700 mt-1">Berhasil: <strong>{bulkResult.success}</strong>{bulkResult.failed > 0 && <> | Gagal: <strong className="text-red-600">{bulkResult.failed}</strong></>}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-5 border-t">
          <p className="text-xs text-gray-400">Gunakan template CSV untuk format yang benar</p>
          <div className="flex gap-2">
            <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Tutup</button>
            <button onClick={handleBulkImport} disabled={bulkUploading || bulkParsed.length === 0 || !bulkProjectId}
              className={`px-5 py-2 text-sm text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                bulkType === 'workers' ? 'bg-green-600 hover:bg-green-700' : bulkType === 'timesheets' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}>
              {bulkUploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengimport...</> : <><Upload className="w-4 h-4" /> Import {bulkParsed.length} Data</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
