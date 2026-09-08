/**
 * Face liveness + anti-spoof heuristics for ESS clock-in.
 * Does not require native image codecs — compares payloads and client motion.
 */
export const FACE_KEY_PREFIX = 'face:';

export function parseImageDataUrl(dataUrl: string | null | undefined): {
  mime: string;
  buffer: Buffer;
} | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.trim().match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!m) return null;
  try {
    const buffer = Buffer.from(m[2].replace(/\s/g, ''), 'base64');
    if (buffer.length < 8_000 || buffer.length > 3_500_000) return null;
    return { mime: m[1].toLowerCase().replace('image/jpg', 'image/jpeg'), buffer };
  } catch {
    return null;
  }
}

/** Byte-level distance 0–1. Identical buffers → 0. */
export function bufferDistance(a: Buffer, b: Buffer): number {
  if (!a.length || !b.length) return 1;
  const n = Math.min(a.length, b.length, 4096);
  const step = Math.max(1, Math.floor(Math.min(a.length, b.length) / n));
  let diff = 0;
  let samples = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += step) {
    diff += Math.abs(a[i] - b[i]);
    samples += 1;
  }
  if (!samples) return 1;
  const sizePenalty = Math.abs(a.length - b.length) / Math.max(a.length, b.length);
  return Math.min(1, diff / (samples * 255) * 0.85 + sizePenalty * 0.15);
}

export function sha256Hex(buffer: Buffer): string {
  const { createHash } = require('crypto') as typeof import('crypto');
  return createHash('sha256').update(buffer).digest('hex');
}

export type LivenessCheck = {
  ok: boolean;
  reason?: string;
  motionScore: number;
  frameDistance: number;
  mode: 'video' | 'pair';
};

export type ChallengeFrames = {
  nod?: string;
  left?: string;
  right?: string;
  front?: string;
  scores?: Partial<Record<'nod' | 'left' | 'right' | 'front', number>>;
};

function pairCheck(stillDataUrl: string, motionDataUrl: string, motionScore: number): LivenessCheck {
  const still = parseImageDataUrl(stillDataUrl);
  const motion = parseImageDataUrl(motionDataUrl);
  if (!still || !motion) {
    return { ok: false, reason: 'Foto tidak valid. Ambil ulang dari kamera langsung.', motionScore, frameDistance: 0, mode: 'pair' };
  }
  if (still.buffer.equals(motion.buffer)) {
    return { ok: false, reason: 'Liveness gagal — kedua frame identik. Gerakkan kepala lalu ulangi.', motionScore, frameDistance: 0, mode: 'pair' };
  }
  const frameDistance = bufferDistance(still.buffer, motion.buffer);
  const score = Number(motionScore);
  if (!Number.isFinite(score) || score < 0.012) {
    return { ok: false, reason: 'Gerakan wajah terlalu kecil. Angguk atau geser kepala pelan.', motionScore: score || 0, frameDistance, mode: 'pair' };
  }
  if (score > 0.97) {
    return { ok: false, reason: 'Gerakan terlalu besar / kamera goyang. Tahan HP dan ulangi.', motionScore: score, frameDistance, mode: 'pair' };
  }
  if (frameDistance < 0.002) {
    return { ok: false, reason: 'Liveness gagal — tidak terdeteksi gerakan nyata.', motionScore: score, frameDistance, mode: 'pair' };
  }
  if (frameDistance > 0.75) {
    return { ok: false, reason: 'Frame terlalu berbeda. Pastikan wajah tetap di oval.', motionScore: score, frameDistance, mode: 'pair' };
  }
  return { ok: true, motionScore: score, frameDistance, mode: 'pair' };
}

function evaluateVideoChallenges(ch: ChallengeFrames): LivenessCheck | null {
  const nod = parseImageDataUrl(ch.nod);
  const left = parseImageDataUrl(ch.left);
  const right = parseImageDataUrl(ch.right);
  const front = parseImageDataUrl(ch.front);
  if (!nod || !left || !right || !front) return null;

  const frames = [nod, left, right, front];
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      if (frames[i].buffer.equals(frames[j].buffer)) {
        return {
          ok: false,
          reason: 'Liveness gagal — frame tantangan identik. Ikuti angguk, kiri, kanan, lalu tatap depan.',
          motionScore: 0,
          frameDistance: 0,
          mode: 'video',
        };
      }
    }
  }

  const dNod = bufferDistance(front.buffer, nod.buffer);
  const dLeft = bufferDistance(front.buffer, left.buffer);
  const dRight = bufferDistance(front.buffer, right.buffer);
  const dTurn = bufferDistance(left.buffer, right.buffer);
  const frameDistance = Math.max(dNod, dLeft, dRight, dTurn);

  const nodS = Number(ch.scores?.nod);
  const leftS = Number(ch.scores?.left);
  const rightS = Number(ch.scores?.right);
  const motionScore = [nodS, leftS, rightS].filter(Number.isFinite).reduce((a, b) => a + b, 0) / 3;

  if (!Number.isFinite(motionScore) || motionScore < 0.008) {
    return { ok: false, reason: 'Gerakan terlalu kecil. Ulangi verifikasi wajah.', motionScore: motionScore || 0, frameDistance, mode: 'video' };
  }
  if (frameDistance > 0.78) {
    return { ok: false, reason: 'Frame terlalu berbeda. Pastikan wajah tetap di oval.', motionScore, frameDistance, mode: 'video' };
  }
  return { ok: true, motionScore, frameDistance, mode: 'video' };
}

/**
 * Video challenge (nod / left / right / front) when frames are present;
 * otherwise two related live stills (anti frozen-screen).
 */
export function evaluateLiveness(opts: {
  stillDataUrl: string;
  motionDataUrl: string;
  motionScore: number;
  challenges?: ChallengeFrames | null;
}): LivenessCheck {
  const video = opts.challenges ? evaluateVideoChallenges(opts.challenges) : null;
  if (video) return video;
  return pairCheck(opts.stillDataUrl, opts.motionDataUrl, opts.motionScore);
}

export function hashesLikelySameFace(enrollHash: string | null | undefined, liveHash: string | null | undefined): boolean | null {
  if (!enrollHash || !liveHash) return null;
  return enrollHash === liveHash;
}
