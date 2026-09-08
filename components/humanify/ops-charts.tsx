/**
 * Shared Recharts wrappers for ops.humanify.id dashboards.
 * Bootstrap-admin inspired cards — Tailwind + Humanify chart tokens.
 */
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { HF_CHART_COLORS_SOLID } from '@/lib/humanify/chart-tokens';

const GRID = '#e2e8f0';
const TICK = { fontSize: 11, fill: '#64748b' };

export function OpsChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`hf-card overflow-hidden ${className}`}>
      <div className="border-b border-[var(--hf-border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-[color:var(--hf-ink)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function OpsPieChart({
  data,
  nameKey = 'name',
  valueKey = 'value',
  height = 220,
}: {
  data: Array<Record<string, any>>;
  nameKey?: string;
  valueKey?: string;
  height?: number;
}) {
  if (!data?.length) {
    return <p className="py-10 text-center text-xs text-slate-400">Belum ada data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={48}
          outerRadius={78}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={HF_CHART_COLORS_SOLID[i % HF_CHART_COLORS_SOLID.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function OpsLineChart({
  data,
  xKey = 'x',
  yKey = 'y',
  yLabel,
  height = 220,
  color = HF_CHART_COLORS_SOLID[0],
}: {
  data: Array<Record<string, any>>;
  xKey?: string;
  yKey?: string;
  yLabel?: string;
  height?: number;
  color?: string;
}) {
  if (!data?.length) {
    return <p className="py-10 text-center text-xs text-slate-400">Belum ada data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(v: any) => [v, yLabel || yKey]}
        />
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OpsBarChart({
  data,
  xKey = 'name',
  bars,
  height = 220,
}: {
  data: Array<Record<string, any>>;
  xKey?: string;
  bars: Array<{ key: string; label?: string; color?: string }>;
  height?: number;
}) {
  if (!data?.length || !bars?.length) {
    return <p className="py-10 text-center text-xs text-slate-400">Belum ada data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.label || b.key}
            fill={b.color || HF_CHART_COLORS_SOLID[i % HF_CHART_COLORS_SOLID.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OpsAreaChart({
  data,
  xKey = 'x',
  yKey = 'y',
  yLabel,
  height = 220,
  color = HF_CHART_COLORS_SOLID[2],
}: {
  data: Array<Record<string, any>>;
  xKey?: string;
  yKey?: string;
  yLabel?: string;
  height?: number;
  color?: string;
}) {
  if (!data?.length) {
    return <p className="py-10 text-center text-xs text-slate-400">Belum ada data</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="opsAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(v: any) => [
            typeof v === 'number' ? `Rp ${Number(v).toLocaleString('id-ID')}` : v,
            yLabel || yKey,
          ]}
        />
        <Area type="monotone" dataKey={yKey} stroke={color} fill="url(#opsAreaFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function formatIdrShort(n: number): string {
  if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp${(n / 1_000).toFixed(0)}rb`;
  return `Rp${n}`;
}
