/**
 * Humanify HR AI Copilot — AIMAN persona (AI Guide HR)
 */
import { generateAIInsights, generateRuleBasedInsights, type HRModule } from './ai-service';
import { getSumopodConfig, sumopodChat } from './sumopod-config';
import { AIMAN, AIMAN_SYSTEM_PROMPT } from './ai-persona';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'rules' | 'llm' | 'hybrid';
}

const INTENT_MAP: { pattern: RegExp; module: HRModule; reply: string }[] = [
  { pattern: /rekrut|kandidat|hiring|recruit/i, module: 'recruitment', reply: 'Saya AIMAN. Berikut tinjauan pipeline rekrutmen berdasarkan data terkini:' },
  { pattern: /absen|kehadiran|telat|attendance/i, module: 'attendance', reply: 'Saya AIMAN. Berikut analisis pola kehadiran tim:' },
  { pattern: /kpi|kinerja|target|performance/i, module: 'kpi', reply: 'Saya AIMAN. Berikut evaluasi pencapaian KPI:' },
  { pattern: /gaji|payroll|lembur/i, module: 'payroll', reply: 'Saya AIMAN. Berikut ringkasan terkait payroll:' },
  { pattern: /klaim|reimburse|pengeluaran/i, module: 'reimbursement', reply: 'Saya AIMAN. Berikut analisis klaim reimbursement:' },
  { pattern: /turnover|resign|keluar|workforce/i, module: 'workforce', reply: 'Saya AIMAN. Berikut analisis stabilitas workforce:' },
  { pattern: /cuti|leave/i, module: 'leave', reply: 'Saya AIMAN. Berikut tinjauan pola dan backlog cuti:' },
];

function detectModule(message: string): HRModule {
  for (const item of INTENT_MAP) {
    if (item.pattern.test(message)) return item.module;
  }
  return 'general';
}

function isFirstTurn(history?: CopilotMessage[]): boolean {
  return !history?.some(h => h.role === 'assistant');
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

function buildRuleReply(module: HRModule, context: Record<string, unknown>, insights: ReturnType<typeof generateRuleBasedInsights>, intentReply?: string): string {
  let reply = intentReply || 'Saya AIMAN. Berikut panduan HR berdasarkan data yang tersedia:';
  const items = insights.length ? insights : generateRuleBasedInsights({ module, context });
  if (items.length) {
    reply += '\n\n' + items.map(i => `• ${i.title}: ${i.summary}`).join('\n');
    if (items[0]?.actions?.length) {
      reply += '\n\nLangkah yang disarankan:\n' + items[0].actions.slice(0, 3).map(a => `— ${a}`).join('\n');
    }
  }
  return reply;
}

export async function chatWithCopilot(opts: {
  message: string;
  tenantId: string | null;
  userId?: string | null;
  history?: CopilotMessage[];
}): Promise<{ reply: string; module: HRModule; insights: unknown[]; source: string; persona: string }> {
  const module = detectModule(opts.message);
  const context = await gatherQuickContext(module, opts.tenantId);
  const intent = INTENT_MAP.find(i => i.module === module);

  const aiResult = await generateAIInsights({ module, context });
  const insights = aiResult.insights;
  const ruleReply = buildRuleReply(module, context, insights, intent?.reply);

  const cfg = getSumopodConfig();
  if (cfg.llmEnabled) {
    const firstTurn = isFirstTurn(opts.history);
    const llm = await sumopodChat({
      system: AIMAN_SYSTEM_PROMPT,
      user: [
        `Pertanyaan pengguna: ${opts.message}`,
        `Modul terdeteksi: ${module}`,
        `Konteks data: ${JSON.stringify(context)}`,
        `Insight sistem: ${insights.map(i => `${i.title}: ${i.summary}`).join(' | ')}`,
        firstTurn ? 'Ini pesan pertama dalam sesi — sapa secara profesional sebagai AIMAN.' : 'Lanjutkan percakapan tanpa mengulang perkenalan panjang.',
      ].join('\n'),
      maxTokens: 450,
      temperature: 0.35,
      model: cfg.chatModel,
      history: (opts.history || []).slice(-6).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    });
    if (llm) {
      return { reply: llm, module, insights, source: 'hybrid', persona: AIMAN.name };
    }
  }

  return { reply: ruleReply, module, insights, source: aiResult.source, persona: AIMAN.name };
}

export async function saveConversation(opts: {
  tenantId: string | null; userId: string | null;
  role: string; message: string; module?: string; source?: string;
}) {
  if (!sequelize) return;
  try {
    await sequelize.query(`
      INSERT INTO hris_ai_conversations (id, tenant_id, user_id, role, message, context_module, source)
      VALUES (gen_random_uuid(), :tid, :uid, :role, :msg, :mod, :src)
    `, {
      replacements: {
        tid: opts.tenantId, uid: opts.userId, role: opts.role,
        msg: opts.message, mod: opts.module || null, src: opts.source || 'aiman',
      },
    });
  } catch { /* table may not exist */ }
}

export { AIMAN, AIMAN_GREETING, AIMAN_SUGGESTIONS, AIMAN_THINKING_LABEL } from './ai-persona';
