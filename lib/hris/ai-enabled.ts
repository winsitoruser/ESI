/**
 * Kill-switch for Humanify AIMAN.
 *
 * Server APIs (`isHumanifyAiEnabled`): off only when HUMANIFY_AI_ENABLED is
 * explicitly false/0/off. Default is enabled so tenants keep AIMAN until ops
 * flips the flag.
 *
 * UI (`isHumanifyAiUiEnabled`): NEXT_PUBLIC_HUMANIFY_AI_ENABLED=false hides the
 * sidebar item at build time. That public flag must not 503 /api/humanify/ai-*.
 */
function envOff(raw: string | undefined): boolean {
  const v = String(raw ?? '').toLowerCase();
  return v === 'false' || v === '0' || v === 'off';
}

export function isHumanifyAiEnabled(): boolean {
  // Bracket access so Next.js does not inline this at build time.
  return !envOff(process.env['HUMANIFY_AI_ENABLED']);
}

export function isHumanifyAiUiEnabled(): boolean {
  if (envOff(process.env.NEXT_PUBLIC_HUMANIFY_AI_ENABLED)) return false;
  return isHumanifyAiEnabled();
}

export function humanifyAiDisabledPayload() {
  return {
    success: false,
    error: 'AI_DISABLED',
    message: 'Fitur AIMAN / AI Humanify sedang dinonaktifkan sementara.',
  };
}
