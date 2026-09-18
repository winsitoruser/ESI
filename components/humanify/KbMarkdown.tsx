/**
 * Lightweight markdown renderer for Humanify Knowledge Center.
 * Supports: headings, lists, tables, code, flowchart, workflow, mockup, example, steps.
 */
import { useMemo, type ReactNode } from 'react';
import { Lightbulb, ListOrdered, GitBranch } from 'lucide-react';
import KbPageMockup from '@/components/humanify/KbPageMockup';

function inlineHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-gray-100 rounded text-[12px] font-mono">$1</code>');
}

function WorkflowVisual({ body }: { body: string }) {
  const nodes = body
    .split(/\n/)
    .flatMap((line) => line.split(/→|->|=>|\|/))
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^[-─═]+$/.test(s));

  if (nodes.length < 2) {
    return (
      <pre className="p-4 text-[12px] leading-relaxed font-mono text-slate-800 whitespace-pre overflow-x-auto">
        {body}
      </pre>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      {nodes.map((node, i) => (
        <div key={`${node}-${i}`} className="flex items-center gap-2">
          <div className="rounded-lg border border-[var(--hf-brand-100,#ede9fe)] bg-[var(--hf-brand-50,#f5f3ff)] px-3 py-2 text-xs font-medium text-[color:var(--hf-brand-700,#5b21b6)] shadow-sm max-w-[200px]">
            {node.replace(/^\[|\]$/g, '')}
          </div>
          {i < nodes.length - 1 && (
            <span className="text-[color:var(--hf-brand-400,#a78bfa)] text-sm font-bold" aria-hidden>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ExampleBlock({ body }: { body: string }) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
      <div className="flex items-center gap-1.5 border-b border-amber-200/80 bg-amber-100/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
        <Lightbulb className="h-3.5 w-3.5" /> Contoh penggunaan
      </div>
      <div className="space-y-1.5 p-3 text-sm text-amber-950/90">
        {body.split('\n').filter(Boolean).map((line, i) => (
          <p
            key={i}
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: inlineHtml(line) }}
          />
        ))}
      </div>
    </div>
  );
}

function StepsBlock({ body }: { body: string }) {
  const steps: { title: string; detail: string; mockups: { id: string; caption?: string }[] }[] = [];
  let current: { title: string; detail: string; mockups: { id: string; caption?: string }[] } | null = null;

  for (const raw of body.split('\n')) {
    const line = raw.trimEnd();
    const m = line.match(/^\d+\.\s+(.+)$/);
    if (m) {
      if (current) steps.push(current);
      current = { title: m[1].trim(), detail: '', mockups: [] };
      continue;
    }
    if (!current) continue;
    const shot = line.trim().match(/^@(?:screenshot|mockup)\s+([a-z0-9-]+)(?:\s+[—\-–]\s+(.+))?$/i);
    if (shot) {
      current.mockups.push({ id: shot[1], caption: shot[2]?.trim() });
      continue;
    }
    if (line.trim()) {
      current.detail = current.detail ? `${current.detail}\n${line.trim()}` : line.trim();
    }
  }
  if (current) steps.push(current);

  if (!steps.length) {
    return <ExampleBlock body={body} />;
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        <ListOrdered className="h-3.5 w-3.5" /> Tata cara + screenshot halaman
      </div>
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => (
          <li key={i} className="p-3 sm:p-4 space-y-3">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--hf-brand-600,#6d28d9)] text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold text-slate-900"
                  dangerouslySetInnerHTML={{ __html: inlineHtml(s.title) }}
                />
                {s.detail && (
                  <p
                    className="mt-1 text-xs leading-relaxed text-slate-600 whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: inlineHtml(s.detail) }}
                  />
                )}
              </div>
            </div>
            {s.mockups.map((m, mi) => (
              <div key={`${m.id}-${mi}`} className="sm:pl-10">
                <KbPageMockup id={m.id} caption={m.caption} className="mb-0" />
              </div>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function renderKbMarkdown(md: string): ReactNode[] {
  const lines = String(md || '').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let listItems: { ordered: boolean; text: string }[] = [];
  let ordered = false;
  let fence: { lang: string; body: string[] } | null = null;
  let tableRows: string[][] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const Tag = ordered ? 'ol' : 'ul';
    const cls = ordered
      ? 'list-decimal pl-5 space-y-1.5 text-sm text-gray-700 mb-3'
      : 'list-disc pl-5 space-y-1.5 text-sm text-gray-700 mb-3';
    nodes.push(
      <Tag key={`list-${i++}`} className={cls}>
        {listItems.map((li, idx) => (
          <li key={idx} dangerouslySetInnerHTML={{ __html: inlineHtml(li.text) }} />
        ))}
      </Tag>,
    );
    listItems = [];
  };

  const flushTable = () => {
    if (!tableRows.length) return;
    const [header, ...body] = tableRows;
    const dataRows = body.filter((r) => !r.every((c) => /^:?-+:?$/.test(c.trim())));
    nodes.push(
      <div key={`tbl-${i++}`} className="overflow-x-auto mb-4 border rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              {header.map((c, idx) => (
                <th key={idx} className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                  {c.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b last:border-0">
                {row.map((c, cIdx) => (
                  <td
                    key={cIdx}
                    className="px-3 py-2 text-gray-700 align-top"
                    dangerouslySetInnerHTML={{ __html: inlineHtml(c.trim()) }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  const flushFence = () => {
    if (!fence) return;
    const body = fence.body.join('\n');
    const langFull = (fence.lang || 'text').trim();
    const lang = langFull.toLowerCase();
    const baseLang = lang.split(/\s+/)[0] || 'text';

    if (baseLang === 'mockup' || baseLang === 'screenshot' || baseLang === 'ui') {
      const first = fence.body[0]?.trim() || '';
      const rest = fence.body.slice(1).join('\n').trim();
      // Prefer fence arg: ```mockup employees
      const idFromLang = langFull.match(/^(?:mockup|screenshot|ui)\s+(.+)$/i)?.[1]?.trim();
      const id = idFromLang || first.split(/\s+/)[0] || 'dashboard';
      const caption = idFromLang
        ? body.trim()
        : rest || (first.includes(' ') ? first.replace(/^\S+\s*/, '') : '');
      nodes.push(<KbPageMockup key={`mock-${i++}`} id={id} caption={caption} />);
    } else if (baseLang === 'example' || baseLang === 'contoh') {
      nodes.push(<ExampleBlock key={`ex-${i++}`} body={body} />);
    } else if (baseLang === 'steps' || baseLang === 'langkah' || baseLang === 'tata-cara') {
      nodes.push(<StepsBlock key={`st-${i++}`} body={body} />);
    } else if (baseLang === 'workflow' || baseLang === 'alur') {
      nodes.push(
        <div key={`wf-${i++}`} className="hf-card mb-4 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border-b border-slate-200">
            <GitBranch className="h-3.5 w-3.5" /> Workflow
          </div>
          <WorkflowVisual body={body} />
        </div>,
      );
    } else if (/^(flowchart|mermaid|diagram)$/i.test(baseLang)) {
      nodes.push(
        <div key={`flow-${i++}`} className="hf-card mb-4 overflow-hidden">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 border-b border-slate-200">
            Flowchart
          </div>
          <pre className="p-4 text-[12px] leading-relaxed font-mono text-slate-800 whitespace-pre overflow-x-auto">
            {body}
          </pre>
        </div>,
      );
    } else {
      nodes.push(
        <pre
          key={`code-${i++}`}
          className="mb-4 p-3 rounded-lg bg-gray-900 text-gray-100 text-[12px] font-mono overflow-x-auto"
        >
          {body}
        </pre>,
      );
    }
    fence = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (fence) {
      if (/^```/.test(line.trim())) {
        flushFence();
      } else {
        fence.body.push(raw);
      }
      continue;
    }

    const fenceOpen = line.trim().match(/^```([\w-]+(?:\s+[^\n]+)?)?\s*$/);
    if (fenceOpen) {
      flushList();
      flushTable();
      fence = { lang: (fenceOpen[1] || 'text').trim(), body: [] };
      continue;
    }

    if (/^\|/.test(line) && line.includes('|')) {
      flushList();
      const cells = line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    }
    if (tableRows.length) flushTable();

    if (/^###\s+/.test(line)) {
      flushList();
      nodes.push(
        <h3 key={`h3-${i++}`} className="text-base font-semibold text-gray-900 mt-4 mb-1.5">
          {line.replace(/^###\s+/, '')}
        </h3>,
      );
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      nodes.push(
        <h2 key={`h2-${i++}`} className="text-lg font-semibold text-gray-900 mt-5 mb-2 border-b border-gray-100 pb-1">
          {line.replace(/^##\s+/, '')}
        </h2>,
      );
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      nodes.push(
        <h1 key={`h1-${i++}`} className="text-xl font-bold text-gray-900 mt-2 mb-2">
          {line.replace(/^#\s+/, '')}
        </h1>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (listItems.length && ordered) flushList();
      ordered = false;
      listItems.push({ ordered: false, text: line.replace(/^[-*]\s+/, '') });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (listItems.length && !ordered) flushList();
      ordered = true;
      listItems.push({ ordered: true, text: line.replace(/^\d+\.\s+/, '') });
      continue;
    }
    flushList();
    if (!line.trim()) {
      nodes.push(<div key={`sp-${i++}`} className="h-2" />);
      continue;
    }
    nodes.push(
      <p
        key={`p-${i++}`}
        className="text-sm text-gray-700 leading-relaxed mb-2"
        dangerouslySetInnerHTML={{ __html: inlineHtml(line) }}
      />,
    );
  }
  flushList();
  flushTable();
  flushFence();
  return nodes;
}

export default function KbMarkdown({ content }: { content: string }) {
  const nodes = useMemo(() => renderKbMarkdown(content), [content]);
  return <div className="kb-prose prose-sm max-w-none">{nodes}</div>;
}
