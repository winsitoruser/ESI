import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ChevronUp, Loader2, ScanFace, SwitchCamera, X } from 'lucide-react';

export type FaceChallengeId = 'nod' | 'left' | 'right' | 'front';

export type FaceLivenessResult = {
  still: string;
  motion: string;
  motionScore: number;
  challenges: Record<FaceChallengeId, string>;
  scores: Record<FaceChallengeId, number>;
};

type Props = {
  title: string;
  subtitle?: string;
  confirmLabel: string;
  allowCancel?: boolean;
  onCancel?: () => void;
  onComplete: (result: FaceLivenessResult) => void;
  busy?: boolean;
};

type Phase = 'ready' | 'challenge' | 'submit';

const CHALLENGES: Array<{
  id: FaceChallengeId;
  label: string;
  hint: string;
  seconds: number;
}> = [
  { id: 'nod', label: 'Angguk ke atas', hint: 'Angguk pelan ke atas', seconds: 4 },
  { id: 'left', label: 'Geser ke kiri', hint: 'Putar wajah pelan ke kiri', seconds: 4 },
  { id: 'right', label: 'Geser ke kanan', hint: 'Putar wajah pelan ke kanan', seconds: 4 },
  { id: 'front', label: 'Tatap ke depan', hint: 'Lihat kamera, tahan sebentar', seconds: 3 },
];

type Sample = { luma: Uint8Array; cx: number; cy: number };

function sampleFace(video: HTMLVideoElement): Sample | null {
  if (!video.videoWidth) return null;
  const w = 32;
  const h = 32;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const luma = new Uint8Array(w * h);
  let sum = 0;
  let wx = 0;
  let wy = 0;
  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    const v = Math.round(data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114);
    luma[i] = v;
    const x = i % w;
    const y = Math.floor(i / w);
    sum += v;
    wx += x * v;
    wy += y * v;
  }
  if (!sum) return { luma, cx: 0.5, cy: 0.5 };
  return { luma, cx: 1 - wx / sum / (w - 1), cy: wy / sum / (h - 1) };
}

function lumaDelta(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let d = 0;
  for (let i = 0; i < n; i++) d += Math.abs(a[i] - b[i]);
  return d / (n * 255);
}

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
  return canvas.toDataURL('image/jpeg', 0.8);
}

function OvalProgress({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(100, progress));
  return (
    <svg viewBox="0 0 200 268" className="w-full h-full" aria-hidden>
      <path
        d="M100 10 A90 124 0 1 1 99.99 10"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="7"
        pathLength="100"
      />
      <path
        d="M100 10 A90 124 0 1 1 99.99 10"
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="7"
        pathLength="100"
        strokeDasharray={`${p} ${100 - p}`}
        strokeLinecap="round"
        className="transition-[stroke-dasharray] duration-200 ease-out"
        style={{ filter: 'drop-shadow(0 0 6px rgba(45,212,191,0.55))' }}
      />
    </svg>
  );
}

function DirectionCue({ id }: { id: FaceChallengeId }) {
  const cls = 'w-10 h-10 text-teal-300';
  if (id === 'nod') return <ChevronUp className={`${cls} animate-bounce`} />;
  if (id === 'left') return <ChevronLeft className={`${cls} animate-pulse`} />;
  if (id === 'right') return <ChevronRight className={`${cls} animate-pulse`} />;
  return <ScanFace className={cls} />;
}

export default function FaceLivenessCapture({
  title,
  subtitle,
  confirmLabel,
  allowCancel = true,
  onCancel,
  onComplete,
  busy = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevSample = useRef<Sample | null>(null);
  const accum = useRef({ dxPos: 0, dxNeg: 0, dyUp: 0, mag: 0, n: 0 });
  const startedAt = useRef(0);
  const frames = useRef<Record<FaceChallengeId, string>>({ nod: '', left: '', right: '', front: '' });
  const scores = useRef<Record<FaceChallengeId, number>>({ nod: 0, left: 0, right: 0, front: 0 });
  const idxRef = useRef(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const [phase, setPhase] = useState<Phase>('ready');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [showRetry, setShowRetry] = useState(false);

  const challenge = CHALLENGES[challengeIdx];

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
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e: any) {
      const denied = e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError';
      setError(denied
        ? 'Akses kamera ditolak. Izinkan kamera di pengaturan browser.'
        : 'Tidak dapat membuka kamera depan.');
    }
  }, [stop]);

  useEffect(() => {
    start('user');
    return () => stop();
  }, [start, stop]);

  const resetAccum = () => {
    prevSample.current = null;
    accum.current = { dxPos: 0, dxNeg: 0, dyUp: 0, mag: 0, n: 0 };
    startedAt.current = Date.now();
  };

  const finish = useCallback(() => {
    const front = frames.current.front;
    const motion = frames.current.nod || frames.current.left || frames.current.right;
    if (!front || !motion) {
      setError('Rekaman liveness tidak lengkap. Ulangi.');
      setPhase('ready');
      setProgress(0);
      return;
    }
    const motionScore = (scores.current.nod + scores.current.left + scores.current.right) / 3;
    stop();
    setPhase('submit');
    setProgress(100);
    completeRef.current({
      still: front,
      motion,
      motionScore,
      challenges: { ...frames.current },
      scores: { ...scores.current },
    });
  }, [stop]);

  const passChallenge = useCallback((id: FaceChallengeId, score: number) => {
    if (CHALLENGES[idxRef.current]?.id !== id) return;
    const video = videoRef.current;
    const frame = video ? captureFrame(video) : null;
    if (!frame) {
      setError('Gagal mengambil frame. Ulangi.');
      setPhase('ready');
      return;
    }
    frames.current[id] = frame;
    scores.current[id] = score;
    const next = idxRef.current + 1;
    if (next >= CHALLENGES.length) {
      idxRef.current = next;
      setChallengeIdx(next);
      finish();
      return;
    }
    idxRef.current = next;
    setChallengeIdx(next);
    setCountdown(CHALLENGES[next].seconds);
    setProgress((next / CHALLENGES.length) * 100);
    resetAccum();
  }, [finish]);

  useEffect(() => {
    if (phase !== 'challenge') return;
    const id = CHALLENGES[idxRef.current]?.id;
    if (!id) return;
    const tick = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const sample = sampleFace(video);
      if (!sample) return;
      const prev = prevSample.current;
      if (prev) {
        const dx = sample.cx - prev.cx;
        const dy = sample.cy - prev.cy;
        accum.current.dxPos += Math.max(0, dx);
        accum.current.dxNeg += Math.max(0, -dx);
        accum.current.dyUp += Math.max(0, -dy);
        accum.current.mag += lumaDelta(prev.luma, sample.luma);
        accum.current.n += 1;
      }
      prevSample.current = sample;

      const elapsed = Date.now() - startedAt.current;
      const cur = CHALLENGES[idxRef.current];
      if (!cur) return;
      const frac = Math.min(1, elapsed / (cur.seconds * 1000));
      setProgress(((idxRef.current + frac) / CHALLENGES.length) * 100);
      setCountdown(Math.max(1, Math.ceil(cur.seconds - elapsed / 1000)));

      if (elapsed < 400) return;
      const a = accum.current;
      const magAvg = a.n ? a.mag / a.n : 0;
      let passed = false;
      let score = Math.max(magAvg, 0.04);
      if (id === 'nod' && (a.dyUp > 0.025 || magAvg > 0.018)) {
        passed = true;
        score = Math.max(a.dyUp, magAvg, 0.04);
      } else if (id === 'left' && (a.dxNeg > 0.025 || magAvg > 0.018)) {
        passed = true;
        score = Math.max(a.dxNeg, magAvg, 0.04);
      } else if (id === 'right' && (a.dxPos > 0.025 || magAvg > 0.018)) {
        passed = true;
        score = Math.max(a.dxPos, magAvg, 0.04);
      } else if (id === 'front' && elapsed >= 800) {
        passed = true;
        score = magAvg;
      }

      if (passed) {
        window.clearInterval(tick);
        passChallenge(id, score);
        return;
      }

      if (elapsed >= cur.seconds * 1000) {
        window.clearInterval(tick);
        passChallenge(id, Math.max(magAvg, 0.04));
      }
    }, 110);
    return () => window.clearInterval(tick);
  }, [phase, challengeIdx, passChallenge]);

  useEffect(() => {
    if (phase !== 'submit' || busy) {
      setShowRetry(false);
      return;
    }
    const t = window.setTimeout(() => setShowRetry(true), 700);
    return () => window.clearTimeout(t);
  }, [phase, busy]);

  const begin = () => {
    setError(null);
    setShowRetry(false);
    idxRef.current = 0;
    setChallengeIdx(0);
    setCountdown(CHALLENGES[0].seconds);
    setProgress(0);
    frames.current = { nod: '', left: '', right: '', front: '' };
    scores.current = { nod: 0, left: 0, right: 0, front: 0 };
    resetAccum();
    setPhase('challenge');
  };

  const retry = () => {
    setShowRetry(false);
    setPhase('ready');
    setProgress(0);
    setChallengeIdx(0);
    idxRef.current = 0;
    start(facing);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
        </div>
        {allowCancel && phase !== 'submit' && (
          <button type="button" onClick={onCancel} className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full bg-white/10" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="flex-1 relative overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative w-[72vw] max-w-[300px] aspect-[3/4]">
            <div className="absolute inset-[6%] rounded-[50%] overflow-hidden shadow-[0_0_0_9999px_rgba(2,6,23,0.62)]" />
            <div className="absolute inset-0">
              <OvalProgress progress={progress} />
            </div>
            {phase === 'challenge' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <DirectionCue id={challenge.id} />
                <p className="mt-2 text-[11px] font-semibold tracking-wide text-teal-200 uppercase">{countdown}</p>
              </div>
            )}
            {phase === 'submit' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-teal-500/90 flex items-center justify-center">
                  {busy ? <Loader2 className="w-7 h-7 animate-spin" /> : <Check className="w-7 h-7" />}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-[max(0.5rem,env(safe-area-inset-top))] inset-x-4 flex justify-center">
          <div className="rounded-full bg-black/45 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium text-slate-200">
            {phase === 'challenge' ? `${Math.min(challengeIdx + 1, CHALLENGES.length)} / ${CHALLENGES.length}` : 'Verifikasi wajah'}
          </div>
        </div>

        <p className="absolute bottom-5 inset-x-4 text-center text-[15px] font-semibold text-white drop-shadow-md" aria-live="polite">
          {phase === 'ready' && 'Posisikan wajah di dalam oval'}
          {phase === 'challenge' && challenge.hint}
          {phase === 'submit' && (busy ? confirmLabel : 'Verifikasi selesai')}
        </p>
      </div>

      {error && (
        <p className="mx-4 mb-2 text-xs text-rose-200 bg-rose-950/60 border border-rose-800 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 flex items-center gap-3">
        {phase === 'ready' && (
          <>
            <button type="button" onClick={() => start(facing === 'user' ? 'environment' : 'user')} className="min-h-11 min-w-11 rounded-full bg-white/10 inline-flex items-center justify-center" aria-label="Ganti kamera">
              <SwitchCamera className="w-5 h-5" />
            </button>
            <button type="button" onClick={begin} className="flex-1 min-h-11 rounded-xl bg-teal-600 font-semibold text-sm inline-flex items-center justify-center gap-2">
              <ScanFace className="w-4 h-4" /> Mulai verifikasi
            </button>
          </>
        )}
        {phase === 'challenge' && (
          <button
            type="button"
            onClick={() => {
              const id = CHALLENGES[idxRef.current]?.id;
              if (id) passChallenge(id, 0.05);
            }}
            className="flex-1 min-h-11 rounded-xl bg-white/10 font-semibold text-sm"
          >
            Lanjut
          </button>
        )}
        {phase === 'submit' && showRetry && !busy && (
          <button type="button" onClick={retry} className="flex-1 min-h-11 rounded-xl bg-white/10 font-semibold text-sm">
            Ulangi
          </button>
        )}
      </div>
    </div>
  );
}
