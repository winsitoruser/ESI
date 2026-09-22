/**
 * SEC-IAM-013 — login / new-device notification (best-effort email).
 */
import { logAdminAction } from '@/lib/saas/admin-audit';

export async function notifyLoginIfRisky(opts: {
  email: string;
  userId: string;
  tenantId?: string | null;
  ip: string;
  ua: string;
  signals: string[];
  score: number;
}): Promise<void> {
  const enabled = String(process.env.HUMANIFY_LOGIN_NOTIFY || 'true').toLowerCase() !== 'false';
  if (!enabled || !opts.email) return;

  const noteworthy =
    opts.signals.includes('new_ip') ||
    opts.signals.includes('new_ua') ||
    opts.signals.includes('automation_ua') ||
    opts.score >= Number(process.env.HUMANIFY_LOGIN_NOTIFY_SCORE || 40);

  if (!noteworthy) return;

  try {
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      actorEmail: opts.email,
      action: 'auth.login_notify',
      resourceType: 'session',
      meta: { ip: opts.ip, ua: opts.ua.slice(0, 120), signals: opts.signals, score: opts.score },
      ip: opts.ip,
    });
  } catch { /* */ }

  try {
    const { isSmtpConfigured, sendEmail } = await import('@/lib/email/sender');
    if (!isSmtpConfigured()) return;
    const when = new Date().toISOString();
    const subject = '[Humanify] Login baru terdeteksi';
    const text = [
      'Ada login ke akun Humanify Anda.',
      '',
      `Waktu: ${when}`,
      `IP: ${opts.ip}`,
      `Perangkat: ${opts.ua.slice(0, 160)}`,
      `Sinyal: ${opts.signals.join(', ') || '—'}`,
      '',
      'Jika ini bukan Anda, segera ganti password dan aktifkan MFA di /humanify/security.',
    ].join('\n');
    const html = `<p>Ada login ke akun Humanify Anda.</p>
<ul>
<li><b>Waktu:</b> ${when}</li>
<li><b>IP:</b> ${opts.ip}</li>
<li><b>Perangkat:</b> ${opts.ua.slice(0, 160)}</li>
<li><b>Sinyal:</b> ${opts.signals.join(', ') || '—'}</li>
</ul>
<p>Jika ini bukan Anda, segera ganti password dan aktifkan MFA di <a href="https://humanify.id/humanify/security">/humanify/security</a>.</p>`;
    await sendEmail({ to: opts.email, subject, html, text });
  } catch (e: any) {
    console.warn('[login-notify]', e?.message || e);
  }
}
