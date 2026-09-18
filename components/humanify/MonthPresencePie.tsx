import Link from 'next/link';
import { CalendarDays, Radar as RadarIcon } from 'lucide-react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { HF_CHART_COLORS_SOLID } from '@/lib/humanify/chart-tokens';
import {
  PRESENCE_BUCKET_META,
  type MonthPresenceMix,
  type PresenceBucketKey,
} from '@/lib/hris/month-presence';

const AXIS_ORDER: PresenceBucketKey[] = ['masuk', 'izin', 'cuti'];

function ColoredAngleTick(props: {
  payload?: { value?: string };
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  textAnchor?: string;
}) {
  const { payload, x = 0, y = 0, textAnchor } = props;
  const label = String(payload?.value || '');
  const meta = Object.values(PRESENCE_BUCKET_META).find((m) => m.label === label);
  const color = meta?.color || 'var(--hf-ink)';
  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={color}
      fontSize={11}
      fontWeight={600}
    >
      {label}
    </text>
  );
}

export default function MonthPresencePie({ mix }: { mix: MonthPresenceMix }) {
  const byKey = Object.fromEntries(mix.buckets.map((b) => [b.key, b])) as Partial<
    Record<PresenceBucketKey, (typeof mix.buckets)[number]>
  >;

  const radarData = AXIS_ORDER.map((key) => {
    const b = byKey[key];
    const meta = PRESENCE_BUCKET_META[key];
    return {
      subject: meta.label,
      key,
      color: meta.color,
      peoplePct: Number(b?.peoplePct) || 0,
      daysPct: Number(b?.daysPct) || 0,
      people: Number(b?.people) || 0,
      days: Number(b?.days) || 0,
    };
  });

  const empty = mix.totalDays <= 0 && mix.totalPeople <= 0;
  const peopleColor = HF_CHART_COLORS_SOLID[0];
  const daysColor = HF_CHART_COLORS_SOLID[1];

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
          <RadarIcon className="h-8 w-8 text-slate-300" aria-hidden />
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
          <div className="mx-auto h-[240px] w-full max-w-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={<ColoredAngleTick />} />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  tickCount={5}
                  axisLine={false}
                />
                <Radar
                  name="Karyawan %"
                  dataKey="peoplePct"
                  stroke={peopleColor}
                  fill={peopleColor}
                  fillOpacity={0.28}
                  strokeWidth={2}
                  dot={{ r: 3, fill: peopleColor, strokeWidth: 0 }}
                />
                <Radar
                  name="Hari %"
                  dataKey="daysPct"
                  stroke={daysColor}
                  fill={daysColor}
                  fillOpacity={0.18}
                  strokeWidth={2}
                  dot={{ r: 3, fill: daysColor, strokeWidth: 0 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(value: any, name: any, item: any) => {
                    const p = item?.payload;
                    if (name === 'Karyawan %') {
                      return [`${p.people} karyawan (${Number(value).toFixed(0)}%)`, name];
                    }
                    return [`${p.days} hari (${Number(value).toFixed(0)}%)`, name];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-[color:var(--hf-ink-muted)]">
            <span className="font-semibold tabular-nums text-[color:var(--hf-ink)]">
              {mix.uniqueEmployees || mix.totalPeople}
            </span>
            <span>karyawan terpantau</span>
          </div>

          <ul className="mt-3 space-y-2">
            {AXIS_ORDER.map((key) => {
              const b = byKey[key];
              const meta = PRESENCE_BUCKET_META[key];
              return (
                <li key={key} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: meta.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[color:var(--hf-ink)]">{meta.label}</p>
                    <p className="text-[11px] text-[color:var(--hf-ink-muted)]">
                      {b?.people || 0} karyawan · {b?.days || 0} hari
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--hf-ink)]">
                    {b?.peoplePct || 0}%
                  </span>
                </li>
              );
            })}
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
