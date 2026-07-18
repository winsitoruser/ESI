/**
 * Candidate portal JWT — require real secret (no hardcoded fallback).
 */
export function resolveCandidateJwtSecretBytes(): Uint8Array {
  const secret = String(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET_OR_JWT_SECRET_REQUIRED');
  }
  return new TextEncoder().encode(secret);
}

export function candidateJwtConfigured(): boolean {
  return Boolean(String(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '').trim());
}
