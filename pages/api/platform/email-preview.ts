/**
 * Platform ops — preview Humanify branded email HTML (no send).
 * GET ?template=invite|verify|reset|welcome|onboarding|alert|digest
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import {
  humanifyDigestEmail,
  humanifyInviteEmail,
  humanifyObsAlertEmail,
  humanifyOnboardingReminderEmail,
  humanifyResetPasswordEmail,
  humanifyVerifyEmail,
  humanifyWelcomeEmail,
} from '@/lib/email/humanify-mails';

const SAMPLES: Record<string, () => { subject: string; html: string; text: string }> = {
  invite: () => humanifyInviteEmail({ inviteUrl: 'https://humanify.id/humanify/join?token=sample' }),
  verify: () => humanifyVerifyEmail({ verifyUrl: 'https://humanify.id/humanify/verify-email?token=sample' }),
  reset: () => humanifyResetPasswordEmail({ resetUrl: 'https://humanify.id/humanify/reset-password?token=sample' }),
  welcome: () =>
    humanifyWelcomeEmail({
      ownerName: 'Budi Santoso',
      ownerEmail: 'budi@contoh.id',
      tempPassword: 'Tmp-Humanify-2026',
      tenantName: 'PT Contoh Sejahtera',
      businessType: 'Services',
      loginUrl: 'https://humanify.id/humanify/login',
    }),
  onboarding: () =>
    humanifyOnboardingReminderEmail({
      ownerName: 'Budi Santoso',
      tenantName: 'PT Contoh Sejahtera',
      currentStep: 2,
      totalSteps: 5,
      continueUrl: 'https://humanify.id/humanify/setup',
    }),
  alert: () =>
    humanifyObsAlertEmail({
      message: '12 errors in last 15m (threshold 10)',
      uiUrl: 'https://humanify.id/platform/observability',
      errors: 12,
      windowMin: 15,
    }),
  digest: () =>
    humanifyDigestEmail({
      tenantName: 'PT Contoh Sejahtera',
      critical: 1,
      warning: 2,
      itemsHtml:
        '<li><strong>[CRITICAL] Pembayaran gagal</strong> — Perbarui metode pembayaran</li>' +
        '<li><strong>[WARNING] Setup belum selesai</strong> — Lanjutkan wizard</li>',
      billingUrl: 'https://humanify.id/humanify/billing',
      goLiveUrl: 'https://humanify.id/humanify/go-live',
    }),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !isPlatformOperator((session.user as any).role)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const key = String(req.query.template || 'invite').toLowerCase();
  const build = SAMPLES[key];
  if (!build) {
    return res.status(400).json({
      success: false,
      error: `Unknown template. Use: ${Object.keys(SAMPLES).join(', ')}`,
    });
  }

  const mail = build();
  if (req.query.format === 'json') {
    return res.json({ success: true, data: { template: key, subject: mail.subject, html: mail.html } });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(mail.html);
}
