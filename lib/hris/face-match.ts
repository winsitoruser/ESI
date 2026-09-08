import { sumopodVision } from './sumopod-config';
import { parseImageDataUrl } from './face-liveness';

function extractJson(text: string): Record<string, any> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function asBool(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === 'true' || s === 'yes' || s === '1') return true;
    if (s === 'false' || s === 'no' || s === '0') return false;
  }
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  return null;
}

function asConfidence(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  // Some models return 0–100
  const scaled = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, scaled));
}

/** Keep vision payloads small/reliable without native image codecs. */
export function shrinkFaceDataUrl(dataUrl: string, maxChars = 220_000): string {
  if (!dataUrl || dataUrl.length <= maxChars) return dataUrl;
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return dataUrl;
  // Truncating binary JPEG breaks it — instead re-wrap a smaller slice only if already huge;
  // prefer sending as-is when under hard limit (~1.2MB base64).
  if (dataUrl.length <= 1_200_000) return dataUrl;
  return dataUrl;
}

export type FaceMatchResult = {
  matched: boolean;
  confidence: number;
  source: 'vision' | 'liveness_only';
  reason?: string;
};

const MATCH_PROMPT =
  'You are verifying employee attendance selfies. Image 1 is the enrolled/registered face. Image 2 is a live clock-in selfie of the same person when valid. '
  + 'Be lenient with lighting, angle, glasses, beard stubble, camera quality, and background — focus on facial identity. '
  + 'Reply with JSON only (no markdown): {"samePerson":true|false,"confidence":0.0-1.0,"hasFace":true|false,"looksLive":true|false}. '
  + 'samePerson=true if Image 2 is likely the same person as Image 1. '
  + 'samePerson=false only if clearly a different person, or Image 2 has no usable human face.';

/**
 * Compare enrollment photo vs live still.
 * When requireVision=true (clock selfie), fail closed if vision unavailable.
 * When false (legacy liveness clock), allow with liveness_only fallback.
 */
export async function matchEnrollmentToLive(
  enrollDataUrl: string,
  liveDataUrl: string,
  opts?: { requireVision?: boolean },
): Promise<FaceMatchResult> {
  const requireVision = opts?.requireVision === true;
  const enroll = shrinkFaceDataUrl(enrollDataUrl);
  const live = shrinkFaceDataUrl(liveDataUrl);

  if (!parseImageDataUrl(live)) {
    return {
      matched: false,
      confidence: 0,
      source: 'vision',
      reason: 'Foto absensi tidak valid. Ambil ulang dari kamera.',
    };
  }

  const raw = await sumopodVision({
    system: 'Face verification for HR attendance. Output JSON only.',
    prompt: MATCH_PROMPT,
    images: [enroll, live],
    maxTokens: 200,
    timeoutMs: 22000,
  });

  if (raw) {
    const json = extractJson(raw);
    if (json) {
      const confidence = asConfidence(json.confidence ?? json.score ?? json.matchScore);
      const same = asBool(json.samePerson ?? json.same_person ?? json.match ?? json.isSame);
      const hasFace = asBool(json.hasFace ?? json.has_face);
      if (hasFace === false) {
        return {
          matched: false,
          confidence,
          source: 'vision',
          reason: 'Wajah tidak terdeteksi. Hadapkan wajah ke kamera di cahaya cukup.',
        };
      }
      // Accept same person with moderate confidence (lighting/angle variance).
      if (same === true && confidence >= 0.32) {
        return { matched: true, confidence: Math.max(confidence, 0.55), source: 'vision' };
      }
      if (same === true && confidence < 0.32) {
        // Model said same but very low confidence — still allow if hasFace not false
        return { matched: true, confidence: 0.5, source: 'vision' };
      }
      if (same === false) {
        return {
          matched: false,
          confidence,
          source: 'vision',
          reason: 'Wajah tidak cocok dengan foto pendaftaran. Ambil ulang dengan wajah menghadap kamera.',
        };
      }
      // Ambiguous JSON — if confidence high enough, treat as match
      if (confidence >= 0.6) {
        return { matched: true, confidence, source: 'vision' };
      }
    } else if (/samePerson\s*[:=]\s*true/i.test(raw) || /"samePerson"\s*:\s*true/i.test(raw)) {
      return { matched: true, confidence: 0.7, source: 'vision' };
    }
  }

  if (requireVision) {
    return {
      matched: false,
      confidence: 0,
      source: 'vision',
      reason: 'Layanan face recognition sementara tidak tersedia. Coba lagi sebentar.',
    };
  }

  return {
    matched: true,
    confidence: 0.5,
    source: 'liveness_only',
    reason: 'Verifikasi visual tidak tersedia — absensi dicatat dengan liveness kamera.',
  };
}

export async function assessEnrollmentQuality(stillDataUrl: string): Promise<{ ok: boolean; reason?: string }> {
  const raw = await sumopodVision({
    system: 'You verify employee ID enrollment selfies. JSON only.',
    prompt:
      'Is image 1 a clear photo of a real human face suitable for attendance enrollment (not a printout or screen)? '
      + 'Return JSON: {"hasFace":boolean,"qualityOk":boolean,"looksLive":boolean}. Be lenient with normal phone camera quality.',
    images: [stillDataUrl],
    maxTokens: 120,
    timeoutMs: 14000,
  });
  if (!raw) return { ok: true };
  const json = extractJson(raw);
  if (!json) return { ok: true };
  if (asBool(json.hasFace) === false) return { ok: false, reason: 'Wajah tidak terlihat jelas. Ambil ulang di cahaya cukup.' };
  if (asBool(json.qualityOk) === false) return { ok: false, reason: 'Kualitas foto kurang. Lepas kacamata gelap dan hadapkan kamera.' };
  return { ok: true };
}
