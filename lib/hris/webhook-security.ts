/**
 * Humanify inbound webhook security helpers.
 * Production defaults to fail-closed when secrets are unset.
 * Lab/staging may set HUMANIFY_WEBHOOK_ALLOW_OPEN=true to keep open mode.
 */
export function isHumanifyWebhookFailClosed(): boolean {
  if (String(process.env.HUMANIFY_WEBHOOK_ALLOW_OPEN || '').toLowerCase() === 'true') {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}
