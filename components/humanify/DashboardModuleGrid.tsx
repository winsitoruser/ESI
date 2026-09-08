import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DashboardModule {
  key: string;
  label: string;
  desc: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

export interface DashboardModuleCategory {
  category: string;
  color: string;
  modules: DashboardModule[];
}

interface Props {
  categories: DashboardModuleCategory[];
  title: string;
  subtitle: string;
}

export default function DashboardModuleGrid({ categories, title, subtitle }: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalModules = categories.reduce((n, c) => n + c.modules.length, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        modules: cat.modules.filter(
          (m) => m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q) || m.key.includes(q),
        ),
      }))
      .filter((cat) => cat.modules.length > 0);
  }, [categories, query]);

  return (
    <div className="hf-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[var(--hf-border-subtle)] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--hf-ink)]">{title}</h3>
          <p className="mt-0.5 text-sm text-[color:var(--hf-ink-muted)]">{subtitle}</p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari modul HRIS..."
            className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] py-2.5 pl-10 pr-3 text-sm text-[color:var(--hf-ink)] placeholder:text-[color:var(--hf-ink-faint)] focus:border-[var(--hf-brand-500)] focus:bg-white focus:outline-none focus:shadow-[var(--hf-focus-ring)]"
          />
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((cat) => {
          const isOpen = expanded === null || expanded === cat.category || query.length > 0;
          const collapsed = expanded !== null && expanded !== cat.category && !query;
          if (collapsed) return null;
          return (
            <div key={cat.category} className="hf-tile-nested overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(expanded === cat.category ? null : cat.category)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/80"
              >
                <span className="text-sm font-semibold text-[color:var(--hf-ink)]">{cat.category}</span>
                <span className="rounded-md bg-white px-2 py-0.5 text-xs tabular-nums text-[color:var(--hf-ink-muted)] border border-[var(--hf-border-subtle)]">{cat.modules.length}</span>
              </button>
              {isOpen && (
                <div className="space-y-0.5 border-t border-[var(--hf-border-subtle)] bg-white p-1.5">
                  {cat.modules.map((m) => (
                    <Link
                      key={m.key}
                      href={m.href}
                      className="group flex items-center gap-3 rounded-[var(--hf-radius)] p-2.5 transition-colors hover:bg-[var(--hf-surface-muted)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                        <m.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[color:var(--hf-ink)] group-hover:text-[color:var(--hf-brand)]">{m.label}</p>
                        <p className="truncate text-[11px] text-[color:var(--hf-ink-muted)]">{m.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--hf-ink-faint)] group-hover:text-[color:var(--hf-brand-500)]" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="p-8 text-center text-sm text-[color:var(--hf-ink-faint)]">Tidak ada modul cocok dengan &ldquo;{query}&rdquo;</p>
      )}

      <div className="border-t border-[var(--hf-border-subtle)] px-5 py-3 text-xs text-[color:var(--hf-ink-faint)]">
        {totalModules} modul terintegrasi · {filtered.reduce((n, c) => n + c.modules.length, 0)} ditampilkan
      </div>
    </div>
  );
}
