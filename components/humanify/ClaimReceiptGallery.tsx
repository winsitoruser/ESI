import { useMemo, useState } from 'react';
import {
  parseClaimReceipts,
  claimDownloadUrl,
  type ClaimReceiptAttachment,
} from '@/lib/hris/claim-receipt';
import { Download, Eye, FileText, ImageOff, X, ZoomIn } from 'lucide-react';

type Props = {
  receiptUrl?: string | null;
  compact?: boolean;
  maxThumbs?: number;
};

export default function ClaimReceiptGallery({ receiptUrl, compact = false, maxThumbs = 4 }: Props) {
  const files = useMemo(() => parseClaimReceipts(receiptUrl), [receiptUrl]);
  const [preview, setPreview] = useState<ClaimReceiptAttachment | null>(null);

  if (!files.length) {
    return compact ? (
      <span className="text-xs text-gray-400">—</span>
    ) : (
      <p className="text-sm text-gray-400">Tidak ada bukti lampiran.</p>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-1'}`}>
        {files.slice(0, maxThumbs).map((f, i) => (
          <button
            key={`${f.filename}-${i}`}
            type="button"
            onClick={() => !f.legacy && f.url && setPreview(f)}
            disabled={f.legacy || !f.url}
            className={`group relative overflow-hidden rounded-lg border bg-gray-50 text-left transition hover:border-emerald-400 hover:shadow-sm ${
              compact ? 'h-12 w-12' : 'h-20 w-20'
            } ${f.legacy || !f.url ? 'cursor-not-allowed opacity-60' : ''}`}
            title={f.legacy ? 'Bukti format lama (tidak tersimpan)' : f.filename}
          >
            {f.legacy || !f.url ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                <ImageOff className="h-4 w-4 text-gray-400" />
              </div>
            ) : f.isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt={f.filename} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-red-50">
                <FileText className="h-5 w-5 text-red-500" />
                {!compact && <span className="mt-0.5 text-[9px] text-red-600">PDF</span>}
              </div>
            )}
            {!compact && !f.legacy && f.url && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                <ZoomIn className="h-4 w-4 text-white" />
              </span>
            )}
          </button>
        ))}
        {files.length > maxThumbs && (
          <span className="self-center text-xs text-gray-500">+{files.length - maxThumbs}</span>
        )}
      </div>

      {files.some((f) => f.legacy) && !compact && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Ada bukti format lama (hanya nama file). Minta karyawan upload ulang lewat ESS agar bisa di-preview.
        </p>
      )}

      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{preview.filename}</p>
                <p className="text-xs text-gray-500">{preview.mimetype}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={claimDownloadUrl(preview.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh
                </a>
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                >
                  <Eye className="h-3.5 w-3.5" /> Buka tab
                </a>
                <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-1.5 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4">
              {preview.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.filename} className="mx-auto max-h-[70vh] rounded-lg object-contain shadow" />
              ) : (
                <iframe
                  title={preview.filename}
                  src={preview.url}
                  className="h-[70vh] w-full rounded-lg border bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { parseClaimReceipts };
