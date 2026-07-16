import React, { useRef, useState } from 'react';
import { X, Download, FilePlus, Eye, Check, AlertTriangle, Upload, FileSpreadsheet } from 'lucide-react';
import {
  downloadAttendanceTemplate,
  parseAttendanceCsv,
  parseAttendanceXlsx,
  ParsedAttendanceRow,
  ATTENDANCE_IMPORT_HEADERS,
} from '@/lib/hq/attendance-export-import';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: string, message: string) => void;
}

export default function AttendanceBulkImportModal({ open, onClose, onSuccess, showToast }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParsedAttendanceRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const reset = () => {
    setCsvText('');
    setParsed([]);
    setErrors([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const applyParse = (rows: ParsedAttendanceRow[], errs: string[]) => {
    setParsed(rows);
    setErrors(errs);
    setResult(null);
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (!text.trim()) { applyParse([], []); return; }
    const { rows, errors: errs } = parseAttendanceCsv(text);
    applyParse(rows, errs);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'xlsx' || ext === 'xls') {
        const buf = await file.arrayBuffer();
        const { rows, errors: errs } = parseAttendanceXlsx(buf);
        applyParse(rows, errs);
        setCsvText(`[File: ${file.name}] — ${rows.length} baris terbaca`);
      } else {
        const text = await file.text();
        setCsvText(text);
        const { rows, errors: errs } = parseAttendanceCsv(text);
        applyParse(rows, errs);
      }
    } catch {
      showToast('error', 'Gagal membaca file');
    }
    e.target.value = '';
  };

  const fillExample = () => {
    const example = [
      ATTENDANCE_IMPORT_HEADERS.join(','),
      'EMP-001,2026-03-12,08:00,17:00,present,fingerprint,Kantor Pusat Jakarta,',
      'EMP-002,2026-03-12,08:22,17:30,late,face_recognition,Cabang Bandung,Terlambat',
    ].join('\n');
    handleTextChange(example);
  };

  const handleImport = async () => {
    if (!parsed.length) { showToast('error', 'Tidak ada data valid untuk diimport'); return; }
    if (errors.length) { showToast('error', 'Perbaiki error validasi terlebih dahulu'); return; }
    setUploading(true);
    try {
      const res = await fetch('/api/humanify/attendance-bulk?action=import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: parsed.map(r => ({
            employeeCode: r.employeeCode,
            date: r.date,
            clockIn: r.clockIn,
            clockOut: r.clockOut,
            status: r.status,
            source: r.source,
            branchName: r.branchName,
            notes: r.notes,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult({ success: json.imported, failed: json.failed });
        showToast('success', json.message || 'Import berhasil');
        if (json.imported > 0) onSuccess();
      } else {
        showToast('error', json.error || 'Import gagal');
      }
    } catch {
      showToast('error', 'Gagal menghubungi server');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-semibold">Import Absensi Massal</h3>
            <p className="text-sm text-gray-500">Upload file CSV/Excel atau paste data langsung</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => downloadAttendanceTemplate('csv')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Template CSV
            </button>
            <button onClick={() => downloadAttendanceTemplate('xlsx')}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <FileSpreadsheet className="w-4 h-4" /> Template Excel
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              <FilePlus className="w-4 h-4" /> Upload File
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <button onClick={fillExample}
              className="flex items-center gap-2 px-3 py-2 border border-violet-200 rounded-lg text-sm text-violet-700 hover:bg-violet-50">
              <Eye className="w-4 h-4" /> Isi Contoh
            </button>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-lg p-3 text-xs text-violet-800">
            <strong>Kolom wajib:</strong> kode_karyawan, tanggal (YYYY-MM-DD), status (present/late/absent/leave/sick/work_from_home/holiday).
            <br />
            <strong>Opsional:</strong> jam_masuk, jam_keluar (HH:MM), sumber (fingerprint/face_recognition/gps_mobile/manual), cabang, keterangan.
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Data Import</label>
            <textarea
              value={csvText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={`Paste CSV di sini...\n\n${ATTENDANCE_IMPORT_HEADERS.join(', ')}`}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono h-32 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
            />
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                <AlertTriangle className="w-4 h-4" /> {errors.length} error validasi
              </div>
              <ul className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                {errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}

          {parsed.length > 0 && errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                <Check className="w-4 h-4" /> {parsed.length} baris siap diimport
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500">
                    <th className="pr-3 py-1">Kode</th><th className="pr-3 py-1">Tanggal</th>
                    <th className="pr-3 py-1">Masuk</th><th className="pr-3 py-1">Keluar</th><th className="pr-3 py-1">Status</th>
                  </tr></thead>
                  <tbody>
                    {parsed.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-green-100">
                        <td className="pr-3 py-1">{r.employeeCode}</td>
                        <td className="pr-3 py-1">{r.date}</td>
                        <td className="pr-3 py-1">{r.clockIn || '-'}</td>
                        <td className="pr-3 py-1">{r.clockOut || '-'}</td>
                        <td className="pr-3 py-1">{r.status}</td>
                      </tr>
                    ))}
                    {parsed.length > 5 && <tr><td colSpan={5} className="py-1 text-gray-400">...dan {parsed.length - 5} baris lainnya</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.failed > 0 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              Import selesai: <strong>{result.success}</strong> berhasil, <strong>{result.failed}</strong> gagal
            </div>
          )}
        </div>

        <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={handleClose} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Tutup</button>
          <button
            onClick={handleImport}
            disabled={uploading || !parsed.length || errors.length > 0}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Mengimport...' : `Import ${parsed.length || ''} Data`}
          </button>
        </div>
      </div>
    </div>
  );
}
