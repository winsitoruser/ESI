/**
 * Humanify HR AI Copilot — conversational assistant over HR context
 */
import { generateAIInsights, generateRuleBasedInsights, type HRModule } from './ai-service';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'rules' | 'llm' | 'hybrid';
}

const INTENT_MAP: { pattern: RegExp; module: HRModule; reply: string }[] = [
  { pattern: /rekrut|kandidat|hiring|recruit/i, module: 'recruitment', reply: 'Saya analisis pipeline rekrutmen Anda.' },
  { pattern: /absen|kehadiran|telat|attendance/i, module: 'attendance', reply: 'Saya cek pola kehadiran tim.' },
  { pattern: /kpi|kinerja|target|performance/i, module: 'kpi', reply: 'Saya evaluasi pencapaian KPI.' },
  { pattern: /gaji|payroll|lembur/i, module: 'payroll', reply: 'Saya review data payroll.' },
  { pattern: /klaim|reimburse|pengeluaran/i, module: 'reimbursement', reply: 'Saya analisis klaim reimbursement.' },
  { pattern: /turnover|resign|keluar|workforce/i, module: 'workforce', reply: 'Saya analisis stabilitas workforce.' },
  { pattern: /cuti|leave/i, module: 'leave', reply: 'Saya cek pola dan backlog cuti.' },
];

function detectModule(message: string): HRModule {
  for (const item of INTENT_MAP) {
    if (item.pattern.test(message)) return item.module;
  }
  return 'general';
}

async function gatherQuickContext(module: HRModule, tenantId: string | null): Promise<Record<string, unknown>> {
  if (!sequelize) return {};
  const period = new Date().toISOString().substring(0, 7);
  try {
    if (module === 'recruitment') {
      const [rows] = await sequelize.query(`
        SELECT (SELECT COUNT(*)::int FROM hris_candidates) AS total_candidates,
          (SELECT COUNT(*)::int FROM hris_job_openings WHERE status = 'open') AS open_positions
      `);
      return rows[0] || {};
    }
    if (module === 'attendance') {
      const [rows] = await sequelize.query(`
        SELECT ROUND(COUNT(*) FILTER (WHERE status IN ('present','late'))::numeric / NULLIF(COUNT(*),0) * 100, 1) AS attendance_rate
        FROM employee_attendance WHERE TO_CHAR(date, 'YYYY-MM') = :period
      `, { replacements: { period } });
      return rows[0] || {};
    }
    if (module === 'kpi') {
      const [rows] = await sequelize.query(`
        SELECT ROUND(AVG(CASE WHEN target > 0 THEN actual/target*100 ELSE 0 END)::numeric, 1) AS avg_achievement
        FROM employee_kpis WHERE period = :period
      `, { replacements: { period } });
      return rows[0] || {};
    }
    if (module === 'workforce') {
      const [rows] = await sequelize.query(`SELECT COUNT(*)::int AS total FROM employees WHERE is_active = true`);
      return rows[0] || {};
    }
  } catch { /* partial */ }
  return { tenantId };
}

export async function chatWithCopilot(opts: {
  message: string;
  tenantId: string | null;
  userId?: string | null;
  history?: CopilotMessage[];
}): Promise<{ reply: string; module: HRModule; insights: unknown[]; source: string }> {
  const module = detectModule(opts.message);
  const context = await gatherQuickContext(module, opts.tenantId);
  const intent = INTENT_MAP.find(i => i.module === module);

  const aiResult = await generateAIInsights({ module, context });
  const insights = aiResult.insights;

  let reply = intent?.reply || 'Berikut insight HR untuk pertanyaan Anda:';
  if (insights.length) {
    reply += '\n\n' + insights.map(i => `• **${i.title}**: ${i.summary}`).join('\n');
    if (insights[0]?.actions?.length) {
      reply += '\n\nRekomendasi: ' + insights[0].actions.slice(0, 3).join('; ') + '.';
    }
  } else {
    const fallback = generateRuleBasedInsights({ module, context });
    reply += '\n\n' + fallback.map(i => `• ${i.summary}`).join('\n');
  }

  // LLM conversational layer
  const apiKey = process.env.SUMOPOD_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey && process.env.HRIS_AI_LLM === 'true') {
    try {
      const baseUrl = process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1';
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: process.env.HRIS_AI_MODEL || 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: 'Anda adalah HR Copilot Humanify. Jawab singkat dalam bahasa Indonesia, maks 4 kalimat. Gunakan data konteks jika ada.' },
            ...(opts.history || []).slice(-4).map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: `${opts.message}\n\nKonteks: ${JSON.stringify(context)}\nInsight: ${insights.map(i => i.summary).join(' ')}` },
          ],
          max_tokens: 300,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        const llm = json.choices?.[0]?.message?.content?.trim();
        if (llm) {
          return { reply: llm, module, insights, source: 'hybrid' };
        }
      }
    } catch { /* fallback */ }
  }

  return { reply, module, insights, source: aiResult.source };
}

export async function saveConversation(opts: {
  tenantId: string | null; userId: string | null;
  role: string; message: string; module?: string; source?: string;
}) {
  if (!sequelize) return;
  try {
    await sequelize.query(`
      INSERT INTO hris_ai_conversations (tenant_id, user_id, role, message, context_module, source)
      VALUES (:tid, :uid, :role, :msg, :mod, :src)
    `, {
      replacements: {
        tid: opts.tenantId, uid: opts.userId, role: opts.role,
        msg: opts.message, mod: opts.module || null, src: opts.source || 'rules',
      },
    });
  } catch { /* table may not exist */ }
}
