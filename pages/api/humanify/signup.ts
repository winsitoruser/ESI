/**
 * Humanify SaaS Phase 1 — self-serve signup (tenant + owner)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { provisionHumanifyTenant } from '@/lib/saas/humanify-provision';
import { createEmailVerification } from '@/lib/saas/email-verify';
import { attachPartnerToTenant } from '@/lib/saas/partners';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      name,
      email,
      password,
      companyName,
      phone,
      industry,
      employeeRange,
      partnerCode,
      referralCode,
      ref,
    } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password || !companyName?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nama, email, nama perusahaan, dan password wajib diisi',
      });
    }

    if (!EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ success: false, error: 'Password minimal 8 karakter' });
    }

    const result = await provisionHumanifyTenant({
      ownerName: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      companyName: String(companyName).trim(),
      phone: phone ? String(phone).trim() : undefined,
      industry: industry ? String(industry) : undefined,
      employeeRange: employeeRange ? String(employeeRange) : undefined,
    });

    const refCode = String(partnerCode || referralCode || ref || '').trim();
    let partner: { attached: boolean; code?: string } = { attached: false };
    if (refCode) {
      partner = await attachPartnerToTenant(result.tenantId, refCode);
    }

    const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';
    let verification: { verifyUrl?: string; emailed?: boolean } = {};
    try {
      const v = await createEmailVerification({
        userId: result.userId,
        tenantId: result.tenantId,
        email: result.email,
        baseUrl: origin,
      });
      const expose =
        process.env.NODE_ENV !== 'production'
        || process.env.HUMANIFY_EMAIL_VERIFY_RETURN_TOKEN === 'true'
        || !v.emailed;
      verification = {
        emailed: v.emailed,
        verifyUrl: expose ? v.verifyUrl : undefined,
      };
    } catch (e: any) {
      console.warn('[signup] email verify create:', e?.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Akun Humanify berhasil dibuat',
      data: {
        tenantId: result.tenantId,
        slug: result.slug,
        userId: result.userId,
        email: result.email,
        redirectTo: '/humanify/setup',
        careersUrl: `/c/${result.slug}/careers`,
        trialDays: 14,
        verification,
        partner,
      },
    });
  } catch (e: any) {
    const msg = e?.message || 'Registrasi gagal';
    const status = msg.includes('sudah terdaftar') ? 409 : 500;
    console.error('[humanify/signup]', e);
    return res.status(status).json({ success: false, error: msg });
  }
}
