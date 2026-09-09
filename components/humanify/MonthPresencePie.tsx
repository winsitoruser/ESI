import Link from 'next/link';
import { CalendarDays, PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { MonthPresenceMix } from '@/lib/hris/month-presence';

export default function MonthPresencePie({ mix }: { mix: MonthPresenceMix }) {
  const slices = mix.buckets.filter((b) => b.people > 0 || b.days > 0);
  const pieData = slices.map((b) => ({
    name: b.label,
    value: b.people > 0 ? b.people : b.days,
    color: b.color,
    people: b.people,
    days: b.days,
    peoplePct: b.peoplePct,
    daysPct: b.daysPct,
  }));
  const empty = mix.totalDays <= 0 && mix.totalPeople <= 0;

  return (
    <div className="hf-card relative overflow-hidden">
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
      <div className="border-b border-[color:var(--hf-border-subtle)] px-5 py-4 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[color:var(--hf-ink)]">Kehadiran bulan ini</h3>
            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">
              {mix.periodLabel} · masuk, izin, dan cuti
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--hf-brand-100)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--hf-brand-600)]">
            <CalendarDays className="h-3 w-3" />
            Berjalan
          </span>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center px-5 py-8 pl-6 text-center">
          <PieIcon className="h-8 w-8 text-slate-300" aria-hidden />
          <p className="mt-3 text-sm font-medium text-[color:var(--hf-ink)]">Belum ada data bulan ini</p>
          <p className="mt-1 max-w-[240px] text-xs text-[color:var(--hf-ink-muted)]">
            Absensi dan pengajuan izin/cuti yang disetujui akan muncul di sini.
          </p>
          <Link
            href="/humanify/attendance"
            className="mt-4 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
          >
            Buka absensi →
          </Link>
        </div>
      ) : (
        <div className="px-5 py-4 pl-6">
          <div className="relative mx-auto h-[200px] w-full max-w-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(value: any, _name: any, item: any) => {
                    const p = item?.payload;
                    return [
                      `${p.people} karyawan (${p.peoplePct}%) · ${p.days} hari (${p.daysPct}%)`,
                      p.name,
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-semibold tabular-nums text-[color:var(--hf-ink)]">
                {mix.uniqueEmployees || mix.totalPeople}
              </span>
              <span className="text-[10px] text-[color:var(--hf-ink-muted)]">karyawan</span>
            </div>
          </div>

          <ul className="mt-2 space-y-2">
            {mix.buckets.map((b) => (
              <li key={b.key} className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: b.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[color:var(--hf-ink)]">{b.label}</p>
                  <p className="text-[11px] text-[color:var(--hf-ink-muted)]">
                    {b.people} karyawan · {b.days} hari
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--hf-ink)]">
                  {b.peoplePct}%
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-[color:var(--hf-border-subtle)] pt-3">
            <Link
              href="/humanify/attendance"
              className="text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline"
            >
              Lihat rekap absensi →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
