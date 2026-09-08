import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, SwitchCamera, X } from 'lucide-react';

export type FaceSelfieResult = {
  still: string;
};

type Props = {
  title: string;
  subtitle?: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel?: () => void;
  onComplete: (result: FaceSelfieResult) => void;
};

function captureFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth) return null;
  const maxW = 720;
  const scale = Math.min(1, maxW / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Clock-in/out selfie only — no nod/left/right liveness.
 * Match against enrolled face happens on the server.
 */
export default function FaceSelfieCapture({
  title,
  subtitle = 'Hadapkan wajah ke kamera, lalu ambil foto.',
  confirmLabel,
  busy = false,
  onCancel,
  onComplete,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async (mode: 'user' | 'environment') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Browser tidak mendukung kamera. Gunakan Chrome/Safari di HP.');
      return;
    }
    setError(null);
    setReady(false);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacing(mode);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setReady(true)).catch(() => setReady(true));
        }
      });
    } catch (e: any) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError';
      setError(denied
        ? 'Akses kamera ditolak. Izinkan kamera di pengaturan browser.'
        : 'Tidak dapat membuka kamera.');
    }
  }, [stop]);

  useEffect(() => {
    if (preview) return;
    start('user');
    return () => stop();
  }, [start, stop, preview]);

  const snap = () => {
    const video = videoRef.current;
    if (!video) return;
    const still = captureFrame(video);
    if (!still) {
      setError('Gagal mengambil foto. Coba lagi.');
      return;
    }
    stop();
    setPreview(still);
  };

  const retake = () => {
    setPreview(null);
    setError(null);
  };

  const submit = () => {
    if (!preview || busy) return;
    onComplete({ still: preview });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
        </div>
        {onCancel && !busy ? (
          <button
            type="button"
            onClick={() => { stop(); onCancel(); }}
            className="h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 relative mx-4 mb-3 overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview selfie" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
          />
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[62%] w-[58%] max-w-[280px] rounded-[46%] border-2 border-teal-400/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
        </div>
        {!preview && (
          <button
            type="button"
            onClick={() => start(facing === 'user' ? 'environment' : 'user')}
            className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-black/45 text-white flex items-center justify-center"
            aria-label="Ganti kamera"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>
        )}
      </div>

      {error ? (
        <p className="px-5 pb-2 text-center text-xs text-rose-300">{error}</p>
      ) : (
        <p className="px-5 pb-2 text-center text-xs text-slate-400">
          {preview
            ? 'Pastikan wajah jelas di dalam oval, lalu kirim.'
            : 'Posisikan wajah di dalam oval · cahaya cukup'}
        </p>
      )}

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-2">
        {preview ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={retake}
              className="flex-1 min-h-11 rounded-xl bg-white/10 text-white text-sm font-semibold disabled:opacity-50"
            >
              Ambil ulang
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="flex-[1.4] min-h-11 rounded-xl bg-teal-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? 'Memverifikasi…' : confirmLabel}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!ready}
            onClick={snap}
            className="w-full min-h-12 rounded-xl bg-teal-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            Ambil foto
          </button>
        )}
      </div>
    </div>
  );
}
