/**
 * Public Talent Bank self-update (Phase 2) — no auth; token-gated.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applySelfUpdate,
  resolveSelfUpdateToken,
  type TalentIntent,
} from '@/lib/hris/talent-bank';

const INTENTS = new Set(['actively_looking', 'open', 'not_looking', 'do_not_contact']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = String(req.query.token || req.body?.token || '');
    if (!token || token.length < 16) {
      return res.status(400).json({ success: false, error: 'token required' });
    }

    if (req.method === 'GET') {
      const resolved = await resolveSelfUpdateToken(token);
      if (!resolved) {
        return res.status(404).json({ success: false, error: 'Token tidak valid atau kedaluwarsa' });
      }
      const { profile, expiresAt } = resolved;
      return res.json({
        success: true,
        data: {
          expiresAt,
          profile: {
            fullName: profile.fullName,
            currentTitle: profile.currentTitle,
            currentCompany: profile.currentCompany,
            location: profile.location,
            salaryExpectedMin: profile.salaryExpectedMin,
            salaryExpectedMax: profile.salaryExpectedMax,
            noticeDays: profile.noticeDays,
            workPreference: profile.workPreference,
            intent: profile.intent,
            consentTalentPool: profile.consentTalentPool,
            consentContact: profile.consentContact,
          },
        },
      });
    }

    if (req.method === 'POST') {
      const resolved = await resolveSelfUpdateToken(token);
      if (!resolved) {
        return res.status(404).json({ success: false, error: 'Token tidak valid atau kedaluwarsa' });
      }
      const body = req.body || {};
      if (body.intent && !INTENTS.has(String(body.intent))) {
        return res.status(400).json({ success: false, error: 'intent tidak valid' });
      }

      const profile = await applySelfUpdate(token, {
        currentTitle: body.currentTitle != null ? String(body.currentTitle) : undefined,
        currentCompany: body.currentCompany != null ? String(body.currentCompany) : undefined,
        location: body.location != null ? String(body.location) : undefined,
        salaryExpectedMin: body.salaryExpectedMin != null && body.salaryExpectedMin !== ''
          ? Number(body.salaryExpectedMin) : body.salaryExpectedMin === null ? null : undefined,
        salaryExpectedMax: body.salaryExpectedMax != null && body.salaryExpectedMax !== ''
          ? Number(body.salaryExpectedMax) : body.salaryExpectedMax === null ? null : undefined,
        noticeDays: body.noticeDays != null && body.noticeDays !== ''
          ? Number(body.noticeDays) : body.noticeDays === null ? null : undefined,
        workPreference: body.workPreference != null ? String(body.workPreference) : undefined,
        intent: body.intent ? (String(body.intent) as TalentIntent) : undefined,
        consentTalentPool: body.consentTalentPool != null ? Boolean(body.consentTalentPool) : undefined,
        consentContact: body.consentContact != null ? Boolean(body.consentContact) : undefined,
      });
      return res.json({
        success: true,
        data: {
          fullName: profile.fullName,
          intent: profile.intent,
          location: profile.location,
          salaryExpectedMin: profile.salaryExpectedMin,
          updatedAt: profile.profileUpdatedAt,
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[talent-self-update]', e);
    return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
  }
}
