import Link from 'next/link';
import { Bot, Sparkles, Wrench, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import {
  AIMAN_AGENT_TOOLS,
  AIMAN_AGENT_WORKFLOWS,
} from '@/lib/hris/aiman-agent-catalog';
import { isHumanifyAiUiEnabled } from '@/lib/hris/ai-enabled';

function copilotHref(prompt: string) {
  return `/humanify/ai?tab=copilot&prompt=${encodeURIComponent(prompt)}`;
}

export default function AimanToolsFunctionsCard() {
  if (!isHumanifyAiUiEnabled()) return null;

  const readTools = AIMAN_AGENT_TOOLS.filter((t) => t.kind === 'read');
  const writeTools = AIMAN_AGENT_TOOLS.filter((t) => t.kind === 'write');

  return (
    <div className="hf-card relative overflow-hidden">
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
      <div className="border-b border-[color:var(--hf-border-subtle)] px-5 py-4 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
              <h3 className="font-semibold text-[color:var(--hf-ink)]">AIMAN · Tools & Functions</h3>
            </div>
            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">
              Baca langsung · aksi write butuh konfirmasi Anda
            </p>
          </div>
          <Link
            href="/humanify/ai?tab=copilot"
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--hf-brand-100)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--hf-brand-600)] hover:bg-[color:var(--hf-brand-50)]"
          >
            <Sparkles className="h-3 w-3" />
            Buka Copilot
          </Link>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 pl-6">
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-[color:var(--hf-brand-600)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
              Functions · workflow
            </p>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-1">
            {AIMAN_AGENT_WORKFLOWS.map((wf) => (
              <Link
                key={wf.id}
                href={copilotHref(wf.prompt)}
                className="group flex items-start gap-2 rounded-lg border border-[var(--hf-border-subtle)] bg-white px-2.5 py-2 transition hover:border-[var(--hf-brand-200)] hover:bg-[var(--hf-brand-50)]/50"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                  <Zap className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-[color:var(--hf-ink)]">{wf.title}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-[color:var(--hf-ink-faint)] opacity-0 transition group-hover:opacity-100" />
                  </span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-[color:var(--hf-ink-muted)]">{wf.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--hf-border-subtle)] pt-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-[color:var(--hf-brand-600)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
              Tools · read
            </p>
          </div>
          <ul className="space-y-1">
            {readTools.map((tool) => (
              <li key={tool.name}>
                <Link
                  href={copilotHref(tool.label)}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition hover:bg-[var(--hf-surface-muted)]"
                >
                  <span className="mt-0.5 shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                    Read
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-[color:var(--hf-ink)]">{tool.label}</span>
                    <span className="block text-[10px] leading-snug text-[color:var(--hf-ink-muted)]">{tool.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[var(--hf-border-subtle)] pt-3">
          <div className="mb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
              Tools · write (confirm)
            </p>
          </div>
          <ul className="space-y-1">
            {writeTools.map((tool) => (
              <li key={tool.name}>
                <Link
                  href={copilotHref(tool.label)}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition hover:bg-[var(--hf-surface-muted)]"
                >
                  <span className="mt-0.5 shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
                    Write
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-[color:var(--hf-ink)]">{tool.label}</span>
                    <span className="block text-[10px] leading-snug text-[color:var(--hf-ink-muted)]">{tool.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
