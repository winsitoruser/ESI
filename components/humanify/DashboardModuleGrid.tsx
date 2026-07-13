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
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari modul HRIS..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((cat) => {
          const isOpen = expanded === null || expanded === cat.category || query.length > 0;
          const collapsed = expanded !== null && expanded !== cat.category && !query;
          if (collapsed) return null;
          return (
            <div key={cat.category} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setExpanded(expanded === cat.category ? null : cat.category)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/80"
              >
                <span className="text-sm font-semibold text-slate-800">{cat.category}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm">{cat.modules.length}</span>
              </button>
              {isOpen && (
                <div className="space-y-1 border-t border-slate-100 bg-white p-2">
                  {cat.modules.map((m) => (
                    <Link
                      key={m.key}
                      href={m.href}
                      className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-blue-50/50"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${m.color} text-white shadow-sm transition-transform group-hover:scale-105`}>
                        <m.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-blue-700">{m.label}</p>
                        <p className="truncate text-[11px] text-slate-500">{m.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-400">Tidak ada modul cocok dengan &ldquo;{query}&rdquo;</p>
      )}

      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
        {totalModules} modul terintegrasi · {filtered.reduce((n, c) => n + c.modules.length, 0)} ditampilkan
      </div>
    </div>
  );
}
