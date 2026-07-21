/**
 * Humanify HR AI Copilot — AIMAN persona with flexible live-data exploration
 */
import { generateAIInsights, generateRuleBasedInsights, type HRModule } from './ai-service';
import { getSumopodConfig, sumopodChat } from './sumopod-config';
import { AIMAN, AIMAN_SYSTEM_PROMPT } from './ai-persona';
import {
  resolveAimanDataContext,
  formatAimanDataReply,
  hasAimanLiveData,
  type AimanDataContext,
} from './ai-data-resolver';
import {
  detectAgentWorkflow,
  runAimanAgent,
  isAgentConfirmMessage,
  confirmAimanAgentActions,
  type AgentPendingAction,
  type AgentStep,
  type AgentWorkflowId,
} from './aiman-agent';
import type { AgentToolName } from './aiman-agent-tools';

let sequelize: any;
try { sequelize = require('../../lib/sequelize'); } catch {}

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  source?: 'rules' | 'llm' | 'hybrid' | 'live-data' | 'agent' | 'agent+llm' | 'agent-confirm';
}

export type CopilotChatResult = {
  reply: string;
  module: HRModule;
  insights: unknown[];
  source: string;
  persona: string;
  dataContext?: AimanDataContext;
  agent?: {
    workflowId: AgentWorkflowId | null;
    steps: AgentStep[];
    pendingActions: AgentPendingAction[];
  };
};

const INTENT_MAP: { pattern: RegExp; module: HRModule }[] = [
  { pattern: /rekrut|kandidat|hiring|recruit|lowongan|pelamar/i, module: 'recruitment' },
  { pattern: /absen|kehadiran|telat|attendance/i, module: 'attendance' },
  { pattern: /kpi|kinerja|target|performance|penilaian/i, module: 'kpi' },
  { pattern: /gaji|payroll|lembur|payslip/i, module: 'payroll' },
  { pattern: /klaim|reimburse|pengeluaran/i, module: 'reimbursement' },
  { pattern: /turnover|resign|keluar|workforce|jumlah (pegawai|karyawan)|headcount|onboard|offboard/i, module: 'workforce' },
  { pattern: /cuti|leave/i, module: 'leave' },
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

function buildInsightContext(data: AimanDataContext, module: HRModule): Record<string, unknown> {
  return {
    period: data.period,
    intents: data.intents,
    workforce: data.workforce,
    onboarding_count: data.onboarding?.in_progress_count,
    offboarding_count: data.offboarding?.in_progress_count,
    employee: data.employee,
    kpi_count: data.kpis?.length || 0,
    avg_kpi: data.kpis?.length
      ? Math.round(data.kpis.reduce((s, k) => s + Number(k.achievement_pct || 0), 0) / data.kpis.length)
      : data.kpi_team?.avg_achievement,
    kpi_team: data.kpi_team,
    performance_reviews: data.performance?.length || data.performance_team?.review_count,
    attendance: data.attendance || data.attendance_team,
    recruitment: data.recruitment,
    leave_pending: data.leave?.pending_count,
    claims_pending: data.claims?.pending_count,
    overtime_pending: data.overtime?.pending_count,
    contracts_expiring: data.contracts?.expiring_soon,
    training_active: data.training?.active_enrollments,
    disciplinary_active: data.disciplinary?.active_warnings,
    payroll: data.payroll?.latest_run,
    module,
  };
}

function compactDataForLlm(data: AimanDataContext): Record<string, unknown> {
  const out: Record<string, unknown> = {
    period: data.period,
    intents: data.intents,
    identifiers: data.identifiers,
  };
  const keys: (keyof AimanDataContext)[] = [
    'workforce', 'onboarding', 'offboarding', 'employee', 'employee_matches',
    'kpis', 'kpi_team', 'kpi_search', 'performance', 'performance_team',
    'attendance', 'attendance_team', 'leave', 'recruitment', 'claims',
    'overtime', 'payroll', 'contracts', 'training', 'disciplinary', 'errors',
  ];
  for (const k of keys) {
    const v = data[k];
    if (v == null) continue;
    if (Array.isArray(v) && !v.length) continue;
    out[k] = v;
  }
  return out;
}

export async function chatWithCopilot(opts: {
  message: string;
  tenantId: string | null;
  userId?: string | null;
  userEmail?: string | null;
  history?: CopilotMessage[];
  pendingTools?: AgentToolName[];
}): Promise<CopilotChatResult> {
  // Text confirm for previously pending write tools
  const pending = (opts.pendingTools || []).filter(Boolean) as AgentToolName[];
  if (pending.length && isAgentConfirmMessage(opts.message)) {
    const confirmed = await confirmAimanAgentActions({
      tools: pending,
      tenantId: opts.tenantId,
      actorUserId: opts.userId,
      actorEmail: opts.userEmail,
    });
    return {
      reply: confirmed.reply,
      module: 'general',
      insights: [],
      source: 'agent-confirm',
      persona: AIMAN.name,
      agent: {
        workflowId: null,
        steps: confirmed.steps,
        pendingActions: [],
      },
    };
  }

  // Assisted agent workflows
  const workflowId = detectAgentWorkflow(opts.message);
  if (workflowId) {
    const agent = await runAimanAgent({
      message: opts.message,
      tenantId: opts.tenantId,
      workflowId,
    });
    const moduleMap: Record<string, HRModule> = {
      payroll_prep: 'payroll',
      recruitment_screen: 'recruitment',
      hr_backlog: 'leave',
      leave_desk: 'leave',
      contract_watch: 'workforce',
      onboarding_check: 'workforce',
      general_scan: 'general',
    };
    return {
      reply: agent.reply,
      module: moduleMap[workflowId] || 'general',
      insights: [],
      source: agent.source,
      persona: AIMAN.name,
      agent: {
        workflowId: agent.workflowId,
        steps: agent.steps,
        pendingActions: agent.pendingActions,
      },
    };
  }

  const module = detectModule(opts.message);
  const dataContext = await resolveAimanDataContext(opts.message, opts.tenantId);
  const insightCtx = buildInsightContext(dataContext, module);

  const aiResult = await generateAIInsights({ module, context: insightCtx });
  const insights = aiResult.insights;

  const live = hasAimanLiveData(dataContext);
  const dataReply = live ? formatAimanDataReply(dataContext) : '';
  const ruleReply = dataReply || buildFallbackReply(module, insightCtx, insights);

  const cfg = getSumopodConfig();
  if (cfg.llmEnabled) {
    const firstTurn = isFirstTurn(opts.history);
    const llm = await sumopodChat({
      system: `${AIMAN_SYSTEM_PROMPT}

INSTRUKSI EKSEKUSI:
- Jawablah pertanyaan user secara langsung menggunakan DATA LIVE.
- Boleh menggabungkan beberapa modul jika relevan (mis. ringkasan = workforce + backlog + risiko).
- Jika user eksplorasi bebas, prioritaskan insight actionable.
- Jangan ulangi JSON mentah; sampaikan dalam bahasa yang mengalir.`,
      user: [
        `Pertanyaan: ${opts.message}`,
        `Modul terdeteksi: ${module}`,
        `Intent: ${dataContext.intents.join(', ')}`,
        `DATA LIVE (Humanify):\n${JSON.stringify(compactDataForLlm(dataContext), null, 2)}`,
        insights.length ? `Insight rules: ${insights.map((i: any) => i.summary).join(' | ')}` : '',
        firstTurn ? 'Sapa singkat sebagai AIMAN.' : 'Lanjutkan tanpa perkenalan ulang.',
        'Jika data cocok parsial, jawab apa yang ada lalu tawarkan pertanyaan lanjutan yang relevan.',
      ].filter(Boolean).join('\n\n'),
      maxTokens: 900,
      temperature: 0.35,
      model: cfg.chatModel,
      history: (opts.history || []).slice(-8).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    });
    if (llm) {
      return { reply: llm, module, insights, source: 'hybrid', persona: AIMAN.name, dataContext };
    }
  }

  return {
    reply: ruleReply,
    module,
    insights,
    source: live ? 'live-data' : aiResult.source,
    persona: AIMAN.name,
    dataContext,
  };
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
