/**
 * Humanify HR AI Copilot — AIMAN persona (AI Guide HR) with live data resolver
 */
import { generateAIInsights, generateRuleBasedInsights, type HRModule } from './ai-service';
import { getSumopodConfig, sumopodChat } from './sumopod-config';
import { AIMAN, AIMAN_SYSTEM_PROMPT } from './ai-persona';
import { resolveAimanDataContext, formatAimanDataReply, type AimanDataContext } from './ai-data-resolver';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'rules' | 'llm' | 'hybrid';
}

const INTENT_MAP: { pattern: RegExp; module: HRModule; reply: string }[] = [
  { pattern: /rekrut|kandidat|hiring|recruit/i, module: 'recruitment', reply: 'Berikut tinjauan pipeline rekrutmen:' },
  { pattern: /absen|kehadiran|telat|attendance/i, module: 'attendance', reply: 'Berikut analisis kehadiran:' },
  { pattern: /kpi|kinerja|target|performance|penilaian/i, module: 'kpi', reply: 'Berikut evaluasi KPI & kinerja:' },
  { pattern: /onboard|orientasi|karyawan baru/i, module: 'general', reply: 'Berikut status onboarding:' },
  { pattern: /jumlah (pegawai|karyawan)|berapa (pegawai|karyawan)|headcount/i, module: 'workforce', reply: 'Berikut ringkasan workforce:' },
  { pattern: /gaji|payroll|lembur/i, module: 'payroll', reply: 'Berikut ringkasan payroll:' },
  { pattern: /klaim|reimburse|pengeluaran/i, module: 'reimbursement', reply: 'Berikut analisis klaim:' },
  { pattern: /turnover|resign|keluar|workforce/i, module: 'workforce', reply: 'Berikut analisis workforce:' },
  { pattern: /cuti|leave/i, module: 'leave', reply: 'Berikut tinjauan cuti:' },
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

function hasLiveData(data: AimanDataContext): boolean {
  return !!(
    data.workforce || data.onboarding?.in_progress_count ||
    data.employee || data.kpis?.length || data.performance?.length ||
    data.kpi_search?.length || data.attendance?.period_rate != null ||
    data.recruitment || data.leave
  );
}

function buildInsightContext(data: AimanDataContext, module: HRModule): Record<string, unknown> {
  return {
    period: data.period,
    workforce: data.workforce,
    onboarding_count: data.onboarding?.in_progress_count,
    employee: data.employee,
    kpi_count: data.kpis?.length || 0,
    avg_kpi: data.kpis?.length
      ? Math.round(data.kpis.reduce((s, k) => s + Number(k.achievement_pct || 0), 0) / data.kpis.length)
      : undefined,
    performance_reviews: data.performance?.length,
    attendance: data.attendance,
    recruitment: data.recruitment,
    leave_pending: data.leave?.pending_count,
    module,
  };
}

export async function chatWithCopilot(opts: {
  message: string;
  tenantId: string | null;
  userId?: string | null;
  history?: CopilotMessage[];
}): Promise<{ reply: string; module: HRModule; insights: unknown[]; source: string; persona: string; dataContext?: AimanDataContext }> {
  const module = detectModule(opts.message);
  const dataContext = await resolveAimanDataContext(opts.message, opts.tenantId);
  const insightCtx = buildInsightContext(dataContext, module);

  const aiResult = await generateAIInsights({ module, context: insightCtx });
  const insights = aiResult.insights;

  const dataReply = hasLiveData(dataContext) ? formatAimanDataReply(dataContext) : '';
  const ruleReply = dataReply || buildFallbackReply(module, insightCtx, insights);

  const cfg = getSumopodConfig();
  if (cfg.llmEnabled) {
    const firstTurn = isFirstTurn(opts.history);
    const llm = await sumopodChat({
      system: `${AIMAN_SYSTEM_PROMPT}

AKSES DATA LIVE:
Anda memiliki akses ke data Humanify HRIS real-time di blok DATA LIVE di bawah.
WAJIB gunakan angka/nama dari data tersebut. Jangan mengarang.
Jika karyawan tidak ditemukan, arahkan user memeriksa kode/NIK/nama.`,
      user: [
        `Pertanyaan: ${opts.message}`,
        `Modul: ${module}`,
        `DATA LIVE (Humanify DB):\n${JSON.stringify(dataContext, null, 2)}`,
        insights.length ? `Insight rules: ${insights.map(i => i.summary).join(' | ')}` : '',
        firstTurn ? 'Sapa profesional sebagai AIMAN (singkat).' : 'Lanjutkan tanpa perkenalan panjang.',
        'Format: ringkas, bullet jika perlu, sebut nama/kode karyawan jika relevan.',
      ].filter(Boolean).join('\n\n'),
      maxTokens: 700,
      temperature: 0.3,
      model: cfg.chatModel,
      history: (opts.history || []).slice(-6).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    });
    if (llm) {
      return { reply: llm, module, insights, source: 'hybrid', persona: AIMAN.name, dataContext };
    }
  }

  return { reply: ruleReply, module, insights, source: hasLiveData(dataContext) ? 'live-data' : aiResult.source, persona: AIMAN.name, dataContext };
}

function buildFallbackReply(module: HRModule, context: Record<string, unknown>, insights: ReturnType<typeof generateRuleBasedInsights>): string {
  const items = insights.length ? insights : generateRuleBasedInsights({ module, context });
  let reply = 'Saya AIMAN. Berikut ringkasan berdasarkan data Humanify:\n\n';
  reply += items.map(i => `• ${i.title}: ${i.summary}`).join('\n');
  return reply;
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
