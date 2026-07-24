import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  parseClaimReceipts,
  claimDownloadUrl,
  type ClaimReceiptAttachment,
} from '@/lib/hris/claim-receipt';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  ImageOff,
  Link2,
  Loader2,
  Share2,
  X,
  ZoomIn,
} from 'lucide-react';

type Props = {
  receiptUrl?: string | null;
  compact?: boolean;
  maxThumbs?: number;
};

function absoluteUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function ClaimReceiptGallery({ receiptUrl, compact = false, maxThumbs = 4 }: Props) {
  const files = useMemo(() => parseClaimReceipts(receiptUrl), [receiptUrl]);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = previewIdx != null ? files[previewIdx] ?? null : null;
  const canBrowse = files.filter((f) => !f.legacy && f.url).length > 1;

  const revokeBlob = useCallback(() => {
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const openAt = useCallback((idx: number) => {
    const f = files[idx];
    if (!f || f.legacy || !f.url) return;
    setShareHint(null);
    setLoadError(null);
    setPreviewIdx(idx);
  }, [files]);

  const close = useCallback(() => {
    setPreviewIdx(null);
    setShareHint(null);
    setLoadError(null);
    setLoading(false);
    revokeBlob();
  }, [revokeBlob]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (previewIdx == null) return;
      let i = previewIdx;
      for (let n = 0; n < files.length; n++) {
        i = (i + dir + files.length) % files.length;
        if (!files[i].legacy && files[i].url) {
          setLoadError(null);
          setPreviewIdx(i);
          return;
        }
      }
    },
    [files, previewIdx],
  );

  // Load as blob so PDF/image preview works despite X-Frame-Options: DENY on API routes
  useEffect(() => {
    if (previewIdx == null || !preview?.url) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let created: string | null = null;

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(preview.url, { credentials: 'include' });
        if (!res.ok) throw new Error(res.status === 401 ? 'Sesi berakhir — login ulang' : `Gagal memuat (${res.status})`);
        const blob = await res.blob();
        const type =
          blob.type && blob.type !== 'application/octet-stream'
            ? blob.type
            : preview.mimetype || 'application/octet-stream';
        const typed = type !== blob.type ? new Blob([blob], { type }) : blob;
        created = URL.createObjectURL(typed);
        if (cancelled) {
          URL.revokeObjectURL(created);
          return;
        }
        setBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return created;
        });
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Gagal memuat bukti');
          setBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [previewIdx, preview?.url, preview?.mimetype]);

  useEffect(() => {
    if (previewIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewIdx, close, go]);

  const shareFile = useCallback(async (file: ClaimReceiptAttachment) => {
    setShareHint(null);
    const viewUrl = absoluteUrl(file.url);
    const downloadUrl = absoluteUrl(claimDownloadUrl(file.url));

    try {
      const res = await fetch(file.url, { credentials: 'include' });
      if (res.ok) {
        const blob = await res.blob();
        const shareFileObj = new File([blob], file.filename, {
          type: file.mimetype || blob.type || 'application/octet-stream',
        });
        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [shareFileObj] })) {
          await navigator.share({
            title: file.filename,
            text: `Bukti reimbursement: ${file.filename}`,
            files: [shareFileObj],
          });
          setShareHint('Dibagikan');
          return;
        }
      }
    } catch {
      /* fall through */
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: file.filename,
          text: `Bukti reimbursement: ${file.filename}`,
          url: viewUrl,
        });
        setShareHint('Link dibagikan');
        return;
      } catch {
        /* cancel */
      }
    }

    try {
      await navigator.clipboard.writeText(downloadUrl);
      setShareHint('Link unduh disalin');
    } catch {
      setShareHint('Salin manual dari Tab baru / Unduh');
    }
  }, []);

  const copyLink = useCallback(async (file: ClaimReceiptAttachment) => {
    const url = absoluteUrl(file.url);
    try {
      await navigator.clipboard.writeText(url);
      setShareHint('Link preview disalin (perlu login Humanify)');
    } catch {
      setShareHint('Gagal salin link');
    }
  }, []);

  if (!files.length) {
    return compact ? (
      <span className="text-xs text-gray-400">—</span>
    ) : (
      <p className="text-sm text-gray-400">Tidak ada bukti lampiran.</p>
    );
  }

  const isPdf = preview
    ? Boolean(preview.isPdf || (!preview.isImage && /\.pdf$/i.test(preview.filename)))
    : false;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-1'}`}>
        {files.slice(0, maxThumbs).map((f, i) => (
          <button
            key={`${f.filename}-${i}`}
            type="button"
            onClick={() => openAt(i)}
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
                {!compact && (
                  <span className="mt-0.5 text-[9px] text-red-600">
                    {f.isPdf || /\.pdf$/i.test(f.filename) ? 'PDF' : 'File'}
                  </span>
                )}
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
          <button
            type="button"
            onClick={() => openAt(maxThumbs)}
            className="self-center text-xs font-medium text-emerald-700 hover:underline"
          >
            +{files.length - maxThumbs} lihat semua
          </button>
        )}
      </div>

      {files.some((f) => f.legacy) && !compact && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Ada bukti format lama (hanya nama file). Minta karyawan upload ulang lewat ESS agar bisa di-preview.
        </p>
      )}

      {preview && previewIdx != null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${preview.filename}`}
        >
          <div
            className={`relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
              isPdf ? 'max-w-5xl' : 'max-w-3xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{preview.filename}</p>
                <p className="text-xs text-gray-500">
                  {preview.mimetype}
                  {files.length > 1 ? ` · ${previewIdx + 1}/${files.length}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {canBrowse && (
                  <>
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      className="rounded-lg border p-1.5 hover:bg-gray-50"
                      title="Sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      className="rounded-lg border p-1.5 hover:bg-gray-50"
                      title="Berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <a
                  href={claimDownloadUrl(preview.url)}
                  download={preview.filename}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh
                </a>
                <button
                  type="button"
                  onClick={() => shareFile(preview)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                >
                  <Share2 className="h-3.5 w-3.5" /> Bagikan
                </button>
                <button
                  type="button"
                  onClick={() => copyLink(preview)}
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                  title="Salin link preview"
                >
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-gray-50"
                >
                  <Eye className="h-3.5 w-3.5" /> Tab baru
                </a>
                <button type="button" onClick={close} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label="Tutup">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {shareHint && (
              <div className="border-b bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">{shareHint}</div>
            )}

            <div className="relative flex min-h-[40vh] flex-1 items-center justify-center overflow-auto bg-slate-100 p-2 sm:p-4">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              )}

              {loadError ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow">
                  <FileText className="h-10 w-10 text-red-500" />
                  <p className="text-sm text-gray-700">{loadError}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <a
                      href={preview.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Buka di tab baru
                    </a>
                    <a
                      href={claimDownloadUrl(preview.url)}
                      download={preview.filename}
                      className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50"
                    >
                      Unduh file
                    </a>
                  </div>
                </div>
              ) : blobUrl && preview.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blobUrl}
                  alt={preview.filename}
                  className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
                />
              ) : blobUrl && isPdf ? (
                <iframe
                  title={preview.filename}
                  src={blobUrl}
                  className="h-[75vh] w-full rounded-lg border bg-white shadow"
                />
              ) : blobUrl ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-8 text-center shadow">
                  <FileText className="h-10 w-10 text-gray-500" />
                  <p className="text-sm text-gray-700">Tipe file ini tidak bisa di-preview di sini.</p>
                  <a
                    href={claimDownloadUrl(preview.url)}
                    download={preview.filename}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Unduh file
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { parseClaimReceipts };
