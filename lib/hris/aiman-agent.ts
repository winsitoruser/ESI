/**
 * AIMAN Assisted Agent — multi-step workflows with human-in-the-loop confirms.
 */
import { sumopodChat, getSumopodConfig } from './sumopod-config';
import { AIMAN_SYSTEM_PROMPT } from './ai-persona';
import {
  AIMAN_AGENT_TOOLS,
  executeAgentTool,
  type AgentToolName,
  type AgentToolResult,
} from './aiman-agent-tools';

export type AgentPendingAction = {
  tool: AgentToolName;
  label: string;
  description: string;
  risk: 'medium' | 'high';
};

export type AgentStep = {
  tool: AgentToolName;
  kind: 'read' | 'write';
  label: string;
  status: 'ok' | 'pending_confirm' | 'error' | 'skipped';
  summary: string;
  data?: Record<string, unknown>;
};

export type AgentWorkflowId =
  | 'payroll_prep'
  | 'recruitment_screen'
  | 'hr_backlog'
  | 'leave_desk'
  | 'contract_watch'
  | 'onboarding_check'
  | 'general_scan';

export type AgentRunResult = {
  workflowId: AgentWorkflowId | null;
  reply: string;
  steps: AgentStep[];
  pendingActions: AgentPendingAction[];
  source: 'agent' | 'agent+llm';
};

const WORKFLOWS: Array<{
  id: AgentWorkflowId;
  pattern: RegExp;
  readTools: AgentToolName[];
  suggestWrites: AgentToolName[];
  title: string;
}> = [
  {
    id: 'payroll_prep',
    pattern: /persiap(kan)?\s+payroll|siap(kan)?\s+gaji|payroll\s+prep|cek\s+payroll|workflow\s+payroll/i,
    readTools: ['payroll_prep_checklist', 'list_hr_backlog'],
    suggestWrites: ['run_automation_scan'],
    title: 'Persiapan Payroll',
  },
  {
    id: 'recruitment_screen',
    pattern: /screen(ing)?\s+kandidat|advance\s+kandidat|workflow\s+rekrut|jalankan\s+screening|pratinjau\s+screening/i,
    readTools: ['recruitment_screen_preview'],
    suggestWrites: ['execute_recruitment_screening'],
    title: 'Screening Kandidat',
  },
  {
    id: 'leave_desk',
    pattern: /meja\s+cuti|desk\s+cuti|detail\s+cuti\s+pending|cuti\s+menunggu|workflow\s+cuti/i,
    readTools: ['leave_pending_detail', 'list_hr_backlog'],
    suggestWrites: ['execute_leave_backlog_alert'],
    title: 'Meja Cuti',
  },
  {
    id: 'contract_watch',
    pattern: /kontrak\s+(hampir\s+)?habis|cek\s+kontrak|contract\s+expir|reminder\s+kontrak|workflow\s+kontrak/i,
    readTools: ['contract_expiry_check'],
    suggestWrites: ['execute_contract_expiry_alert'],
    title: 'Pantau Kontrak',
  },
  {
    id: 'onboarding_check',
    pattern: /cek\s+onboarding|status\s+onboarding|workflow\s+onboarding|karyawan\s+baru\s+onboard/i,
    readTools: ['onboarding_status', 'list_hr_backlog'],
    suggestWrites: [],
    title: 'Cek Onboarding',
  },
  {
    id: 'hr_backlog',
    pattern: /backlog\s+hr|antrian\s+approval|pending\s+(cuti|klaim|lembur)/i,
    readTools: ['list_hr_backlog', 'leave_pending_detail'],
    suggestWrites: ['run_automation_scan'],
    title: 'Backlog HR',
  },
  {
    id: 'general_scan',
    pattern: /jalankan\s+scan\s+otomasi|scan\s+semua\s+aturan|agent\s+scan/i,
    readTools: ['list_hr_backlog'],
    suggestWrites: ['run_automation_scan'],
    title: 'Scan Otomasi',
  },
];

const WRITE_RISK: Partial<Record<AgentToolName, 'medium' | 'high'>> = {
  execute_recruitment_screening: 'high',
  execute_contract_expiry_alert: 'medium',
  execute_leave_backlog_alert: 'medium',
  run_automation_scan: 'medium',
};

export function detectAgentWorkflow(message: string): AgentWorkflowId | null {
  for (const w of WORKFLOWS) {
    if (w.pattern.test(message)) return w.id;
  }
  return null;
}

/** User confirms pending write actions via chat text. */
export function isAgentConfirmMessage(message: string): boolean {
  const m = String(message || '').trim();
  if (!m) return false;
  return /^(ya|ok|oke|y|konfirmasi|confirm|setuju|jalankan)([.!,\s]|$)/i.test(m)
    || /^(ya[, ]+)?(konfirmasi|jalankan|setuju)\b/i.test(m)
    || /^konfirmasi\s+(semua|aksi|ya)/i.test(m);
}

function toolMeta(name: AgentToolName) {
  return AIMAN_AGENT_TOOLS.find((t) => t.name === name)!;
}

function buildReply(title: string, steps: AgentStep[], pending: AgentPendingAction[]): string {
  const lines: string[] = [
    `Saya AIMAN — menjalankan workflow **${title}** (assisted agent).`,
    '',
  ];
  for (const s of steps) {
    const mark = s.status === 'ok' ? '✓' : s.status === 'pending_confirm' ? '⏳' : s.status === 'error' ? '✗' : '·';
    lines.push(`${mark} ${s.label}: ${s.summary}`);
  }
  if (pending.length) {
    lines.push('');
    lines.push('Langkah berikut membutuhkan **konfirmasi Anda** (human-in-the-loop):');
    pending.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.label} — ${p.description}`);
    });
    lines.push('');
    lines.push('Klik tombol konfirmasi, atau ketik **konfirmasi** / **ya jalankan**.');
  } else {
    lines.push('');
    lines.push('Tidak ada aksi write yang menunggu. Anda bisa lanjut ke halaman terkait dari ringkasan di atas.');
  }
  return lines.join('\n');
}

export async function runAimanAgent(opts: {
  message: string;
  tenantId: string | null;
  workflowId?: AgentWorkflowId | null;
}): Promise<AgentRunResult> {
  const workflowId = opts.workflowId ?? detectAgentWorkflow(opts.message);
  if (!workflowId) {
    return {
      workflowId: null,
      reply: '',
      steps: [],
      pendingActions: [],
      source: 'agent',
    };
  }

  const wf = WORKFLOWS.find((w) => w.id === workflowId)!;
  const steps: AgentStep[] = [];
  const pendingActions: AgentPendingAction[] = [];

  for (const tool of wf.readTools) {
    const meta = toolMeta(tool);
    const result = await executeAgentTool(tool, opts.tenantId);
    steps.push({
      tool,
      kind: 'read',
      label: meta.label,
      status: result.ok ? 'ok' : 'error',
      summary: result.summary,
      data: result.data,
    });
  }

  for (const tool of wf.suggestWrites) {
    const meta = toolMeta(tool);
    if (tool === 'execute_recruitment_screening') {
      const preview = steps.find((s) => s.tool === 'recruitment_screen_preview');
      const count = Number(preview?.data?.wouldAdvanceCount || 0);
      if (count <= 0) {
        steps.push({
          tool,
          kind: 'write',
          label: meta.label,
          status: 'skipped',
          summary: 'Tidak ada kandidat yang lolos ambang — advance dilewati.',
        });
        continue;
      }
    }
    if (tool === 'execute_contract_expiry_alert') {
      const check = steps.find((s) => s.tool === 'contract_expiry_check');
      if (Number(check?.data?.count || 0) <= 0) {
        steps.push({
          tool,
          kind: 'write',
          label: meta.label,
          status: 'skipped',
          summary: 'Tidak ada kontrak hampir habis — alert dilewati.',
        });
        continue;
      }
    }
    if (tool === 'execute_leave_backlog_alert') {
      const detail = steps.find((s) => s.tool === 'leave_pending_detail' || s.tool === 'list_hr_backlog');
      const count = Number(detail?.data?.count ?? detail?.data?.leavePending ?? 0);
      if (count < 5) {
        steps.push({
          tool,
          kind: 'write',
          label: meta.label,
          status: 'skipped',
          summary: `Cuti pending ${count} (<5) — alert backlog tidak diperlukan.`,
        });
        continue;
      }
    }

    pendingActions.push({
      tool,
      label: meta.label,
      description: meta.description,
      risk: WRITE_RISK[tool] || 'medium',
    });
    steps.push({
      tool,
      kind: 'write',
      label: meta.label,
      status: 'pending_confirm',
      summary: 'Menunggu konfirmasi HR.',
    });
  }

  let reply = buildReply(wf.title, steps, pendingActions);

  const cfg = getSumopodConfig();
  if (cfg.llmEnabled) {
    const polished = await sumopodChat({
      system: `${AIMAN_SYSTEM_PROMPT}

Anda merangkum hasil ASSISTED AGENT workflow. Jangan mengarang angka.
Sebutkan blocker dan langkah konfirmasi jika ada. Bahasa Indonesia, padat.`,
      user: `Workflow: ${wf.title}\nHasil tool:\n${JSON.stringify(steps.map((s) => ({ tool: s.tool, status: s.status, summary: s.summary, data: s.data })), null, 2)}\nPending: ${JSON.stringify(pendingActions)}`,
      maxTokens: 500,
      temperature: 0.25,
    });
    if (polished) {
      reply = polished;
      if (pendingActions.length) {
        reply += `\n\n⏳ Menunggu konfirmasi: ${pendingActions.map((p) => p.label).join(', ')}. Ketik "konfirmasi" atau klik tombol.`;
      }
      return { workflowId, reply, steps, pendingActions, source: 'agent+llm' };
    }
  }

  return { workflowId, reply, steps, pendingActions, source: 'agent' };
}

export async function confirmAimanAgentAction(opts: {
  tool: AgentToolName;
  tenantId: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ reply: string; result: AgentToolResult; step: AgentStep }> {
  const meta = toolMeta(opts.tool);
  const result = await executeAgentTool(opts.tool, opts.tenantId, {
    confirm: meta.kind === 'write',
  });
  const step: AgentStep = {
    tool: opts.tool,
    kind: meta.kind,
    label: meta.label,
    status: result.ok ? 'ok' : 'error',
    summary: result.summary,
    data: result.data,
  };
  const reply = result.ok
    ? `✓ Konfirmasi diterima. ${meta.label}: ${result.summary}`
    : `✗ Gagal menjalankan ${meta.label}: ${result.summary}`;

  try {
    const { logAdminAction } = await import('@/lib/saas/admin-audit');
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      action: 'aiman.agent_confirm',
      resourceType: 'aiman_tool',
      resourceId: opts.tool,
      meta: { ok: result.ok, summary: result.summary, kind: meta.kind },
    });
  } catch { /* audit best-effort */ }

  return { reply, result, step };
}

/** Confirm one or many pending tools (chat "konfirmasi"). */
export async function confirmAimanAgentActions(opts: {
  tools: AgentToolName[];
  tenantId: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ reply: string; steps: AgentStep[]; results: AgentToolResult[] }> {
  const steps: AgentStep[] = [];
  const results: AgentToolResult[] = [];
  for (const tool of opts.tools) {
    const one = await confirmAimanAgentAction({
      tool,
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
    });
    steps.push(one.step);
    results.push(one.result);
  }
  const okN = results.filter((r) => r.ok).length;
  const reply = [
    `✓ Konfirmasi batch: ${okN}/${results.length} aksi berhasil.`,
    ...steps.map((s) => `• ${s.label}: ${s.summary}`),
  ].join('\n');
  return { reply, steps, results };
}

export { AIMAN_AGENT_TOOLS };
