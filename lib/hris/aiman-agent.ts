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
import { AIMAN_TOOL_CTAS, type AgentCta } from './aiman-agent-catalog';

export type { AgentCta };

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
  ctas: AgentCta[];
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

function mergeCtas(...groups: AgentCta[][]): AgentCta[] {
  const map = new Map<string, AgentCta>();
  for (const group of groups) {
    for (const c of group) {
      if (!c?.href || !c?.label) continue;
      if (!map.has(c.href)) map.set(c.href, c);
    }
  }
  return [...map.values()];
}

export function collectAgentCtas(steps: AgentStep[], tools: AgentToolName[] = []): AgentCta[] {
  const fromData: AgentCta[] = [];
  for (const s of steps) {
    const links = (s.data?.nextLinks as AgentCta[] | undefined) || [];
    fromData.push(...links);
  }
  const fromCatalog = tools.flatMap((t) => AIMAN_TOOL_CTAS[t] || []);
  const fromSteps = steps.flatMap((s) => AIMAN_TOOL_CTAS[s.tool] || []);
  return mergeCtas(fromData, fromCatalog, fromSteps);
}

function formatSampleLines(items: any[], mapFn: (item: any, i: number) => string, limit = 5): string[] {
  if (!Array.isArray(items) || !items.length) return [];
  return items.slice(0, limit).map(mapFn);
}

function formatStepDetail(step: AgentStep): string[] {
  const d = (step.data || {}) as Record<string, any>;
  const lines: string[] = [];

  switch (step.tool) {
    case 'payroll_prep_checklist':
      lines.push(`• Periode: ${d.period || '—'}`);
      lines.push(`• Karyawan aktif: ${d.activeEmployees ?? 0}`);
      lines.push(`• Belum punya komponen gaji: ${d.missingSalaryCount ?? 0}`);
      lines.push(`• Payroll run terbuka: ${Array.isArray(d.openRuns) ? d.openRuns.length : 0}`);
      if (d.lateRate != null) lines.push(`• Tingkat keterlambatan: ${d.lateRate}%`);
      if (Array.isArray(d.blockers) && d.blockers.length) {
        lines.push('• Blocker:');
        d.blockers.forEach((b: string) => lines.push(`  – ${b}`));
      }
      if (Array.isArray(d.missingSalarySample) && d.missingSalarySample.length) {
        lines.push('• Contoh karyawan tanpa gaji:');
        formatSampleLines(d.missingSalarySample, (r, i) => `  ${i + 1}. ${r.name || r.code || r.id}`, 5)
          .forEach((l) => lines.push(l));
      }
      break;
    case 'recruitment_screen_preview':
      lines.push(`• Kandidat applied: ${d.appliedCount ?? 0}`);
      lines.push(`• Lolos ambang (≥70, tanpa flag): ${d.wouldAdvanceCount ?? 0}`);
      formatSampleLines(d.top, (r, i) => `  ${i + 1}. ${r.name} — skor ${r.score}${r.wouldAdvance ? ' · siap advance' : ''}`, 5)
        .forEach((l, idx) => {
          if (idx === 0) lines.push('• Top skor:');
          lines.push(l);
        });
      break;
    case 'list_hr_backlog':
      lines.push(`• Cuti pending: ${d.leavePending ?? 0}`);
      lines.push(`• Klaim pending: ${d.claimsPending ?? 0}`);
      lines.push(`• Lembur pending: ${d.overtimePending ?? 0}`);
      break;
    case 'leave_pending_detail':
      lines.push(`• Jumlah antrian: ${d.count ?? 0}`);
      formatSampleLines(d.items, (r, i) => `  ${i + 1}. ${r.employee} (${r.code || '—'}) · ${r.type || 'cuti'} · ${r.start} → ${r.end}`, 6)
        .forEach((l, idx) => {
          if (idx === 0) lines.push('• Detail pengajuan:');
          lines.push(l);
        });
      break;
    case 'contract_expiry_check':
      lines.push(`• Kontrak berakhir ≤30 hari: ${d.count ?? 0}`);
      formatSampleLines(d.items, (r, i) => `  ${i + 1}. ${r.employee} (${r.code || '—'}) · habis ${r.endDate}`, 6)
        .forEach((l, idx) => {
          if (idx === 0) lines.push('• Daftar kontrak:');
          lines.push(l);
        });
      break;
    case 'onboarding_status':
      lines.push(`• Onboarding aktif: ${d.activeCount ?? 0}`);
      formatSampleLines(d.items, (r, i) => {
        const prog = r.progress != null ? ` · progress ${r.progress}%` : '';
        return `  ${i + 1}. ${r.employee} · ${r.department || r.position || '—'}${prog}`;
      }, 6).forEach((l, idx) => {
        if (idx === 0) lines.push('• Proses berjalan:');
        lines.push(l);
      });
      break;
    default:
      break;
  }
  return lines;
}

function buildReply(title: string, steps: AgentStep[], pending: AgentPendingAction[]): string {
  const lines: string[] = [
    `## ${title}`,
    '',
    'Saya **AIMAN** sudah menjalankan assisted workflow ini. Ringkasan terstruktur:',
    '',
  ];

  const reads = steps.filter((s) => s.kind === 'read');
  const writes = steps.filter((s) => s.kind === 'write');

  if (reads.length) {
    lines.push('### Temuan data');
    for (const s of reads) {
      const mark = s.status === 'ok' ? '✓' : s.status === 'error' ? '✗' : '·';
      lines.push('');
      lines.push(`**${mark} ${s.label}**`);
      lines.push(s.summary);
      const detail = formatStepDetail(s);
      if (detail.length) lines.push(...detail);
    }
    lines.push('');
  }

  if (writes.length) {
    lines.push('### Status aksi');
    for (const s of writes) {
      const mark =
        s.status === 'ok' ? '✓'
          : s.status === 'pending_confirm' ? '⏳'
            : s.status === 'skipped' ? '·'
              : '✗';
      lines.push(`${mark} **${s.label}** — ${s.summary}`);
    }
    lines.push('');
  }

  if (pending.length) {
    lines.push('### Perlu konfirmasi Anda');
    lines.push('Aksi write berikut human-in-the-loop (belum dijalankan):');
    pending.forEach((p, i) => {
      lines.push(`${i + 1}. **${p.label}** — ${p.description}`);
    });
    lines.push('');
    lines.push('Klik tombol konfirmasi di bawah, atau ketik **konfirmasi** / **ya jalankan**.');
  } else {
    lines.push('### Langkah lanjut');
    lines.push('Tidak ada aksi write yang menunggu. Gunakan tombol CTA di bawah untuk membuka halaman data terkait.');
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
      ctas: [],
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
  const ctas = collectAgentCtas(steps, [...wf.readTools, ...wf.suggestWrites]);

  const cfg = getSumopodConfig();
  if (cfg.llmEnabled) {
    const polished = await sumopodChat({
      system: `${AIMAN_SYSTEM_PROMPT}

Anda merangkum hasil ASSISTED AGENT workflow menjadi penjelasan TERSTRUKTUR.
Wajib: heading singkat, bullet temuan, angka dari data (jangan mengarang), saran langkah lanjut.
Bahasa Indonesia profesional. Jangan hapus angka/nama dari data tool.`,
      user: `Workflow: ${wf.title}\nHasil tool:\n${JSON.stringify(steps.map((s) => ({ tool: s.tool, status: s.status, summary: s.summary, data: s.data })), null, 2)}\nPending: ${JSON.stringify(pendingActions)}`,
      maxTokens: 700,
      temperature: 0.25,
    });
    if (polished) {
      reply = polished;
      if (pendingActions.length) {
        reply += `\n\n### Perlu konfirmasi Anda\n⏳ ${pendingActions.map((p) => p.label).join(', ')}. Klik tombol konfirmasi atau ketik "konfirmasi".`;
      }
      reply += `\n\n### Langkah lanjut\nGunakan tombol CTA di bawah untuk membuka halaman data terkait.`;
      return { workflowId, reply, steps, pendingActions, ctas, source: 'agent+llm' };
    }
  }

  return { workflowId, reply, steps, pendingActions, ctas, source: 'agent' };
}

export async function confirmAimanAgentAction(opts: {
  tool: AgentToolName;
  tenantId: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ reply: string; result: AgentToolResult; step: AgentStep; ctas: AgentCta[] }> {
  const meta = toolMeta(opts.tool);
  const { logAdminAction } = await import('@/lib/saas/admin-audit');
  const { mustFailClosed } = await import('@/lib/saas/fail-closed');

  try {
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      action: 'aiman.agent_confirm_attempt',
      resourceType: 'aiman_tool',
      resourceId: opts.tool,
      meta: { kind: meta.kind, label: meta.label },
    });
  } catch (err) {
    if (mustFailClosed()) throw err;
  }

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
  const detail = formatStepDetail(step);
  const reply = result.ok
    ? [
        `## ${meta.label}`,
        '',
        `✓ **Berhasil dijalankan** (${meta.kind === 'write' ? 'write · terkonfirmasi' : 'read'}).`,
        '',
        result.summary,
        ...(detail.length ? ['', '### Detail', ...detail] : []),
        '',
        '### Langkah lanjut',
        'Buka halaman terkait lewat tombol CTA di bawah untuk meninjau atau menindaklanjuti data ini.',
      ].join('\n')
    : [
        `## ${meta.label}`,
        '',
        `✗ **Gagal**: ${result.summary}`,
        '',
        'Coba lagi atau buka modul terkait untuk cek data secara manual.',
      ].join('\n');

  const ctas = collectAgentCtas([step], [opts.tool]);

  try {
    await logAdminAction({
      tenantId: opts.tenantId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      action: 'aiman.agent_confirm',
      resourceType: 'aiman_tool',
      resourceId: opts.tool,
      meta: { ok: result.ok, summary: result.summary, kind: meta.kind },
    });
  } catch (err) {
    if (mustFailClosed()) throw err;
  }

  return { reply, result, step, ctas };
}

/** Confirm one or many pending tools (chat "konfirmasi"). */
export async function confirmAimanAgentActions(opts: {
  tools: AgentToolName[];
  tenantId: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
}): Promise<{ reply: string; steps: AgentStep[]; results: AgentToolResult[]; ctas: AgentCta[] }> {
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
    '## Konfirmasi batch AIMAN',
    '',
    `✓ ${okN}/${results.length} aksi berhasil.`,
    '',
    '### Hasil per tool',
    ...steps.map((s) => `• **${s.label}**: ${s.summary}`),
    '',
    '### Langkah lanjut',
    'Gunakan tombol CTA di bawah untuk membuka data terkait.',
  ].join('\n');
  const ctas = collectAgentCtas(steps, opts.tools);
  return { reply, steps, results, ctas };
}

export { AIMAN_AGENT_TOOLS };
