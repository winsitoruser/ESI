import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { AgentCta } from '@/lib/hris/aiman-agent-catalog';

/** Render AIMAN markdown-ish reply (## / ### / **bold** / bullets). */
export function AimanStructuredReply({ content }: { content: string }) {
  const text = String(content || '');
  const blocks = text.split(/\n{2,}/);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-800">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.length > 0);
        if (!lines.length) return null;

        const first = lines[0].trim();
        if (first.startsWith('## ')) {
          return (
            <div key={bi}>
              <h4 className="text-sm font-bold text-[color:var(--hf-ink)]">{inlineMd(first.slice(3))}</h4>
              {lines.slice(1).map((l, i) => (
                <p key={i} className="mt-1 text-[13px] text-slate-700">{inlineMd(l)}</p>
              ))}
            </div>
          );
        }
        if (first.startsWith('### ')) {
          return (
            <div key={bi}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-brand-600)]">
                {inlineMd(first.slice(4))}
              </p>
              <ul className="mt-1 space-y-0.5">
                {lines.slice(1).map((l, i) => (
                  <li key={i} className="text-[13px] text-slate-700">{inlineMd(l)}</li>
                ))}
              </ul>
            </div>
          );
        }

        return (
          <div key={bi} className="space-y-0.5">
            {lines.map((l, i) => (
              <p key={i} className="text-[13px] text-slate-700 whitespace-pre-wrap">{inlineMd(l)}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function inlineMd(s: string) {
  const parts = String(s).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[color:var(--hf-ink)]">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

export function AimanCtaButtons({
  ctas,
  compact = false,
}: {
  ctas?: AgentCta[] | null;
  compact?: boolean;
}) {
  if (!ctas?.length) return null;
  return (
    <div className={`border-t border-slate-100 ${compact ? 'mt-2 pt-2' : 'mt-3 pt-3'}`}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Buka data terkait
      </p>
      <div className="flex flex-col gap-1.5">
        {ctas.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-start gap-2 rounded-lg border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)]/60 px-2.5 py-2 transition hover:border-[var(--hf-brand-200)] hover:bg-[var(--hf-brand-50)]"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[color:var(--hf-brand-600)] shadow-sm">
              <ExternalLink className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[color:var(--hf-brand-700)]">{c.label}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-[color:var(--hf-brand-600)] opacity-60 transition group-hover:opacity-100" />
              </span>
              {c.description && (
                <span className="mt-0.5 block text-[10px] text-[color:var(--hf-ink-muted)]">{c.description}</span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
