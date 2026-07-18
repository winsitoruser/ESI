/**
 * Public AIMAN chat for Humanify marketing landing (no auth).
 * POST { message, history? }
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSumopodConfig, sumopodChat } from '@/lib/hris/sumopod-config';
import { AIMAN_PUBLIC_SYSTEM_PROMPT } from '@/lib/hris/ai-persona';
import { checkLimit } from '@/lib/middleware/rateLimit';

function clientKey(req: NextApiRequest): string {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.socket.remoteAddress || 'unknown';
}

const FALLBACK_REPLIES: { pattern: RegExp; reply: string }[] = [
  {
    pattern: /aiman|apa itu|siapa/i,
    reply:
      'Saya AIMAN (Artificial Intelligence Management Advisor for HR) — asisten AI resmi Humanify. Saya membantu menjelaskan fitur HRIS, absensi, payroll, rekrutmen, hingga prediktif. Untuk data live karyawan Anda, silakan masuk atau daftar trial.',
  },
  {
    pattern: /modul|fitur|apa saja/i,
    reply:
      'Humanify mencakup siklus SDM end-to-end: rekrutmen & onboarding, database karyawan, absensi GPS/geofence, cuti & lembur, OKR/KPI & 360°, payroll (PPh 21, BPJS, THR), reimbursement OCR, portal karyawan, hingga offboarding. AIMAN menambah insight AI di atas data tersebut.',
  },
  {
    pattern: /absen|gps|geofence/i,
    reply:
      'Absensi Humanify mendukung clock-in/out berbasis GPS dengan geofence, shift, cuti, dan lembur — semuanya bisa mengalir ke payroll. Karyawan memakai Portal Karyawan; HR memantau dari dashboard.',
  },
  {
    pattern: /trial|daftar|mulai|harga/i,
    reply:
      'Anda bisa mulai trial Humanify tanpa kartu kredit lewat Daftar trial. Setelah masuk, AIMAN di dalam aplikasi dapat membaca data live tenant Anda. Buka /humanify/signup untuk memulai.',
  },
  {
    pattern: /payroll|gaji|bpjs|pph/i,
    reply:
      'Modul payroll Humanify menghitung gaji terintegrasi dengan absensi/lembur, plus PPh 21, BPJS, THR, bonus, kasbon, dan pinjaman — termasuk slip gaji di Portal Karyawan.',
  },
];

function fallbackReply(message: string): string {
  for (const item of FALLBACK_REPLIES) {
    if (item.pattern.test(message)) return item.reply;
  }
  return (
    'Terima kasih atas pertanyaannya. Humanify adalah HRIS people-first dengan AIMAN sebagai AI Guide HR. ' +
    'Anda bisa bertanya tentang modul (absensi, payroll, rekrutmen, KPI), atau mulai trial di /humanify/signup. ' +
    'Untuk insight berbasis data live, silakan masuk ke akun Humanify Anda.'
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!(await checkLimit(req, res, {
    windowMs: 60_000,
    maxRequests: 20,
    keyGenerator: (r) => `aiman-public:${clientKey(r)}`,
    message: 'Terlalu banyak permintaan. Coba lagi sebentar.',
  }))) {
    return;
  }

  const { message, history } = req.body || {};
  const text = String(message || '').trim().slice(0, 1000);
  if (!text) {
    return res.status(400).json({ success: false, error: 'message required' });
  }

  const hist = Array.isArray(history)
    ? history
        .filter((h: any) => h?.role && h?.content)
        .slice(-8)
        .map((h: any) => ({
          role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: String(h.content).slice(0, 800),
        }))
    : [];

  const cfg = getSumopodConfig();
  let reply: string | null = null;
  let source: 'llm' | 'rules' = 'rules';

  if (cfg.llmEnabled) {
    reply = await sumopodChat({
      system: AIMAN_PUBLIC_SYSTEM_PROMPT,
      user: text,
      history: hist,
      maxTokens: 350,
      temperature: 0.4,
      model: cfg.chatModel,
      timeoutMs: 12000,
    });
    if (reply) source = 'llm';
  }

  if (!reply) reply = fallbackReply(text);

  return res.json({
    success: true,
    data: {
      reply,
      source,
      persona: 'AIMAN',
      llmEnabled: cfg.llmEnabled,
      llmModel: cfg.chatModel,
    },
  });
}
