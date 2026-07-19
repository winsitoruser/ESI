/**
 * Public partner lead form.
 * POST /api/humanify/partners/lead
 * Body: { companyName, contactName, email, phone?, partnerType?, region?, message?, website? }
 * Honeypot: website (must be empty)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPartnerLead, PARTNER_TYPES } from '@/lib/hris/partner-leads';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.json({ success: true, data: { partnerTypes: PARTNER_TYPES } });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Honeypot
    if (String(req.body?.website || '').trim()) {
      return res.json({ success: true, data: { id: 'ok' }, message: 'Terima kasih' });
    }

    const result = await createPartnerLead({
      body: req.body || {},
      source: 'partners-web',
      meta: {
        ua: String(req.headers['user-agent'] || '').slice(0, 200),
        ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').slice(0, 80),
      },
    });

    // Optional Discord notify
    const webhook = process.env.OBS_ALERT_WEBHOOK_URL;
    if (webhook) {
      try {
        const name = String(req.body?.companyName || req.body?.company_name || 'Partner');
        const email = String(req.body?.email || '');
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🤝 Partner lead: **${name}** · ${email} · type=${req.body?.partnerType || 'other'}`,
          }),
        });
      } catch { /* optional */ }
    }

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Terima kasih — tim partnership akan menghubungi Anda.',
    });
  } catch (e: any) {
    const msg = e?.message || 'Gagal mengirim';
    const status = /wajib|valid/i.test(msg) ? 400 : 500;
    return res.status(status).json({ success: false, error: msg });
  }
}
