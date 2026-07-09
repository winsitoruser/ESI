import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, Loader2, SwitchCamera } from 'lucide-react';

type Props = {
  label?: string;
  hint?: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  capture?: 'user' | 'environment';
  disabled?: boolean;
  /** Wajib ambil foto langsung dari kamera perangkat (tanpa galeri) */
  cameraOnly?: boolean;
};

async function compressImage(file: File, maxWidth = 960, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / (img.width || maxWidth));
      const w = Math.max(1, Math.round((img.width || maxWidth) * scale));
      const h = Math.max(1, Math.round((img.height || maxWidth) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    img.src = url;
  });
}

async function compressDataUrl(dataUrl: string, maxWidth = 960, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / (img.width || maxWidth));
      const w = Math.max(1, Math.round((img.width || maxWidth) * scale));
      const h = Math.max(1, Math.round((img.height || maxWidth) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function PhotoCaptureField({
  label = 'Foto Bukti',
  hint,
  value,
  onChange,
  capture = 'environment',
  disabled = false,
  cameraOnly = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(capture);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera. Gunakan perangkat mobile dengan kamera.');
      return;
    }
    setCameraError(null);
    setLoading(true);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(facing);
      setShowCamera(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e: any) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError';
      setCameraError(denied
        ? 'Akses kamera ditolak. Izinkan kamera di pengaturan browser/perangkat.'
        : 'Tidak dapat mengakses kamera perangkat.');
    } finally {
      setLoading(false);
    }
  }, [stopCamera]);

  const handleOpen = () => {
    if (disabled || loading) return;
    if (cameraOnly) {
      startCamera(capture);
      return;
    }
    inputRef.current?.click();
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const raw = canvas.toDataURL('image/jpeg', 0.85);
      const dataUrl = await compressDataUrl(raw);
      onChange(dataUrl);
      stopCamera();
      setShowCamera(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file || disabled) return;
    setLoading(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } finally {
      setLoading(false);
    }
  };

  const closeCamera = () => {
    stopCamera();
    setShowCamera(false);
    setCameraError(null);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold text-slate-700">{label}</p>}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={value} alt="Bukti foto" className="w-full max-h-48 object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={handleOpen}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-600 disabled:opacity-50"
        >
          {loading && !showCamera ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {loading && !showCamera ? 'Membuka kamera...' : cameraOnly ? 'Buka Kamera' : 'Ambil / Pilih Foto'}
        </button>
      )}

      {!cameraOnly && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture={capture}
          className="hidden"
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
      )}

      {cameraError && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{cameraError}</p>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white safe-area-pt">
            <p className="text-sm font-semibold">Ambil Foto</p>
            <button type="button" onClick={closeCamera} className="p-2 rounded-full bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="px-4 py-5 bg-black/90 flex items-center justify-center gap-8 safe-area-pb">
            <button
              type="button"
              onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
              className="p-3 rounded-full bg-white/15 text-white"
              aria-label="Ganti kamera"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleCapture}
              disabled={loading}
              className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center disabled:opacity-50"
              aria-label="Ambil foto"
            >
              {loading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <span className="w-12 h-12 rounded-full bg-white" />}
            </button>
            <div className="w-12" />
          </div>
        </div>
      )}

      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

export { compressImage };
