import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Users,
  Banknote,
  UserCog,
  Clock,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  Link2,
  Check,
  Info,
  Calculator,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ROI_ASSUMPTIONS,
  ROI_COMPANY_PRESETS,
  ROI_DEFAULTS,
  ROI_FIELD_RANGES,
  ROI_VALUE_DRIVERS,
  RoiInput,
  RoiResult,
  buildRoiQueryString,
  calculateRoi,
  clampRoiInput,
  formatCurrency,
  formatNumber,
  getMonthlyProjection,
  hasRoiQueryParams,
  matchCompanyPreset,
  parseRoiQueryParams,
} from '@/lib/humanify/roi-calculator';
import { HUMANIFY_BRAND, HUMANIFY_MARKETING } from '@/lib/humanify/branding';
import { DEFAULT_SEAT_PRICING } from '@/lib/saas/seat-pricing-core';

type FieldKey = keyof RoiInput;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  icon: React.ElementType;
  suffix: string;
  format: (v: number) => string;
  inputMode?: 'numeric' | 'decimal';
}> = [
  {
    key: 'jumlahKaryawan',
    label: 'Jumlah Karyawan',
    icon: Users,
    suffix: 'orang',
    format: formatNumber,
  },
  {
    key: 'rataGajiKaryawan',
    label: 'Rata-rata Gaji Karyawan',
    icon: Banknote,
    suffix: '/bulan',
    format: (v) => `Rp ${formatNumber(v)}`,
  },
  {
    key: 'jumlahStaffHR',
    label: 'Jumlah Staff HR',
    icon: UserCog,
    suffix: 'orang',
    format: formatNumber,
  },
  {
    key: 'rataGajiStaffHR',
    label: 'Rata-rata Gaji Staff HR',
    icon: Banknote,
    suffix: '/bulan',
    format: (v) => `Rp ${formatNumber(v)}`,
  },
  {
    key: 'jamAdminPerMinggu',
    label: 'Jam Admin HR per Minggu',
    icon: Clock,
    suffix: 'jam',
    format: formatNumber,
  },
];

const RESULT_CARDS: Array<{
  key: keyof RoiResult;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  accent: string;
  format: (v: number) => string;
}> = [
  {
    key: 'roiPersen',
    label: 'Return on Investment',
    sublabel: 'vs biaya langganan',
    icon: Calculator,
    accent: 'bg-[#f6e6ff] text-[#592277]',
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: 'penghematanJamPerBulan',
    label: 'Waktu yang Dihemat',
    sublabel: 'jam per bulan',
    icon: Clock,
    accent: 'bg-[#f6e6ff] text-[#592277]',
    format: (v) => formatNumber(Math.round(v)),
  },
  {
    key: 'penghematanTahunan',
    label: 'Proyeksi Penghematan',
    sublabel: 'per tahun',
    icon: CalendarCheck,
    accent: 'bg-amber-50 text-amber-700',
    format: formatCurrency,
  },
];

function AnimatedValue({
  value,
  format,
  duration = 800,
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}

function PresetChips({
  activeId,
  onSelect,
}: {
  activeId: string | null;
  onSelect: (values: RoiInput) => void;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#656565]">
        Skala perusahaan
      </p>
      <div className="flex flex-wrap gap-2">
        {ROI_COMPANY_PRESETS.map((preset) => {
          const active = activeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.values)}
              className={`inline-flex min-h-11 flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                active
                  ? 'border-[#592277] bg-[#f6e6ff] text-[#592277] shadow-sm'
                  : 'border-[#eee9f1] bg-white text-[#35393f] hover:border-[#592277]/40'
              }`}
            >
              <span className="text-sm font-semibold">{preset.label}</span>
              <span className={`text-xs ${active ? 'text-[#592277]/80' : 'text-[#656565]'}`}>
                {preset.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SliderPanel({
  values,
  onChange,
}: {
  values: RoiInput;
  onChange: (next: RoiInput) => void;
}) {
  const activePreset = matchCompanyPreset(values);

  const handleChange = useCallback(
    (key: FieldKey, raw: number) => {
      onChange(clampRoiInput({ ...values, [key]: raw }));
    },
    [values, onChange],
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 text-lg font-bold text-[#35393f]">Data Perusahaan Anda</h3>
        <p className="text-sm text-[#656565]">
          Pilih skala atau sesuaikan slider — hasil diperbarui otomatis
        </p>
      </div>

      <PresetChips activeId={activePreset} onSelect={onChange} />

      {FIELDS.map((field) => {
        const range = ROI_FIELD_RANGES[field.key];
        const current = values[field.key];
        const pct = ((current - range.min) / (range.max - range.min)) * 100;
        const Icon = field.icon;

        return (
          <div key={field.key} className="group">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label
                htmlFor={`roi-${field.key}`}
                className="flex items-center gap-2 text-sm font-semibold text-[#35393f]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#592277]" />
                {field.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`roi-${field.key}-num`}
                  type="number"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={current}
                  onChange={(e) => handleChange(field.key, Number(e.target.value))}
                  aria-label={`${field.label} (angka)`}
                  className="w-28 rounded-lg border border-[#eee9f1] bg-white px-2 py-1.5 text-right text-sm font-semibold text-[#592277] outline-none focus:border-[#592277] focus:ring-2 focus:ring-[rgba(89,34,119,0.15)]"
                />
                <span className="text-xs text-[#656565]">{field.suffix}</span>
              </div>
            </div>

            <input
              id={`roi-${field.key}`}
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={current}
              onChange={(e) => handleChange(field.key, Number(e.target.value))}
              aria-label={field.label}
              className="h-3 w-full cursor-pointer appearance-none rounded-full accent-[#592277] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#592277] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#592277]"
              style={{
                background: `linear-gradient(to right, #592277 0%, #592277 ${pct}%, #eee9f1 ${pct}%, #eee9f1 100%)`,
              }}
            />

            <div className="mt-1 flex justify-between">
              <span className="text-xs text-[#656565]/70">{field.format(range.min)}</span>
              <span className="text-xs text-[#656565]/70">{field.format(range.max)}</span>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange({ ...ROI_DEFAULTS })}
        className="mt-1 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-[#eee9f1] text-sm text-[#656565] transition-colors hover:border-[#592277]/40 hover:text-[#592277]"
      >
        Reset ke Nilai Default
      </button>
    </div>
  );
}

function HeroSaving({ result }: { result: RoiResult }) {
  const positive = result.netSaving >= 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#eee9f1] p-6 text-white shadow-md sm:p-8"
      style={{
        background: `linear-gradient(135deg, ${HUMANIFY_MARKETING.brand} 0%, ${HUMANIFY_MARKETING.gradientTo} 55%, ${HUMANIFY_MARKETING.footerBg} 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
        style={{ background: HUMANIFY_MARKETING.gradientFrom }}
        aria-hidden
      />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
          <TrendingUp className="h-3.5 w-3.5" />
          Estimasi penghematan bersih
        </div>
        <p className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          <AnimatedValue
            value={result.netSaving}
            format={(v) => (positive ? formatCurrency(v) : `−${formatCurrency(Math.abs(v))}`)}
          />
        </p>
        <p className="mt-2 text-sm text-white/80">per bulan · setelah biaya langganan Humanify</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-white/70">Langganan</p>
            <p className="text-sm font-semibold">{formatCurrency(result.biayaLangganan)}/bln</p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
            <p className="text-[11px] text-white/70">Harga / karyawan</p>
            <p className="text-sm font-semibold">Rp {formatNumber(result.hargaPerUser)}</p>
          </div>
          <div className="col-span-2 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm sm:col-span-1">
            <p className="text-[11px] text-white/70">Balik modal</p>
            <p className="text-sm font-semibold">
              {result.paybackPeriodHari > 0
                ? `±${Math.round(result.paybackPeriodHari)} hari`
                : '—'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/65">{result.namaTier}</p>
      </div>
    </div>
  );
}

function ResultCards({ result }: { result: RoiResult }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {RESULT_CARDS.map((card) => {
        const Icon = card.icon;
        const value = result[card.key] as number;
        return (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-2xl border border-[#eee9f1] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${card.accent}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs text-[#656565]">{card.label}</p>
                <p className="truncate text-xl font-bold text-[#35393f]">
                  <AnimatedValue value={value} format={card.format} />
                </p>
                {card.sublabel && (
                  <p className="mt-0.5 text-xs text-[#656565]/80">{card.sublabel}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ValueDrivers({ result }: { result: RoiResult }) {
  return (
    <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6e6ff] text-[#592277]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-semibold text-[#35393f]">Dari mana penghematannya?</h4>
          <p className="text-sm text-[#656565]">
            Estimasi setara ±{result.fteDihémat.toFixed(1)} FTE admin HR per bulan — didukung modul
            inti Humanify
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ROI_VALUE_DRIVERS.map((driver) => (
          <div key={driver.id} className="rounded-xl border border-[#eee9f1] bg-[#faf8fb] p-4">
            <p className="mb-1 text-sm font-semibold text-[#35393f]">{driver.title}</p>
            <p className="mb-3 text-xs leading-relaxed text-[#656565]">{driver.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {driver.modules.map((m) => (
                <span
                  key={m}
                  className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-[#592277] ring-1 ring-[#eee9f1]"
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownPanel({ result }: { result: RoiResult }) {
  const rows = [
    { label: 'Penghematan waktu admin HR', value: result.penghematanBiayaHRStaff, positive: true },
    { label: 'Pengurangan koreksi payroll', value: result.penguranganErrorPayroll, positive: true },
    { label: 'Total penghematan', value: result.totalPenghematan, positive: true, bold: true },
    { label: `Biaya langganan (${result.namaTier})`, value: result.biayaLangganan, positive: false },
    {
      label: 'Penghematan bersih',
      value: result.netSaving,
      positive: true,
      bold: true,
      highlight: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 shadow-sm">
      <h4 className="mb-4 font-semibold text-[#35393f]">Rincian Perhitungan</h4>
      <div className="space-y-2.5 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex justify-between gap-4 ${
              row.bold ? 'border-t border-[#eee9f1] pt-2.5' : ''
            }`}
          >
            <span className="text-[#656565]">{row.label}</span>
            <span
              className={`shrink-0 font-semibold ${
                row.highlight
                  ? 'text-[#592277]'
                  : row.positive
                    ? 'text-emerald-600'
                    : 'text-red-500'
              }`}
            >
              {!row.positive && row.value > 0 ? '−' : ''}
              {formatCurrency(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>

      {result.paybackPeriodHari > 0 && (
        <p className="mt-4 text-center text-xs text-[#656565]">
          Periode balik modal estimasi:{' '}
          <span className="font-semibold text-[#592277]">
            {Math.round(result.paybackPeriodHari)} hari
          </span>
        </p>
      )}
    </div>
  );
}

function ComparisonChart({ result }: { result: RoiResult }) {
  const data = [
    { name: 'Sebelum HRIS', biaya: result.biayaSebelum },
    { name: 'Dengan Humanify', biaya: Math.max(result.biayaSesudah, 0) },
  ];

  return (
    <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 shadow-sm">
      <h4 className="mb-4 font-semibold text-[#35393f]">Perbandingan Biaya Bulanan</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee9f1" />
            <XAxis dataKey="name" tick={{ fill: '#656565', fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`}
              tick={{ fill: '#656565', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Biaya']}
              contentStyle={{
                background: '#fff',
                border: '1px solid #eee9f1',
                borderRadius: 12,
                color: '#35393f',
                boxShadow: '0 4px 16px rgba(53,57,63,0.08)',
              }}
            />
            <Bar dataKey="biaya" fill="url(#hfBarGrad)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="hfBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#592277" />
                <stop offset="100%" stopColor="#cc7bf9" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProjectionChart({ result }: { result: RoiResult }) {
  const data = getMonthlyProjection(result).map((row) => ({
    ...row,
    bulanShort: row.bulan.replace('Bulan ', 'B'),
  }));

  return (
    <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 shadow-sm">
      <h4 className="mb-4 font-semibold text-[#35393f]">Proyeksi 12 Bulan</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee9f1" />
            <XAxis dataKey="bulanShort" tick={{ fill: '#656565', fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`}
              tick={{ fill: '#656565', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'penghematan' ? 'Penghematan' : 'Net Saving',
              ]}
              contentStyle={{
                background: '#fff',
                border: '1px solid #eee9f1',
                borderRadius: 12,
                color: '#35393f',
                boxShadow: '0 4px 16px rgba(53,57,63,0.08)',
              }}
            />
            <Legend
              formatter={(value) =>
                value === 'penghematan' ? 'Total Penghematan' : 'Penghematan Bersih'
              }
              wrapperStyle={{ color: '#656565', fontSize: 12 }}
            />
            <Bar dataKey="penghematan" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="netSaving" fill="#592277" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CtaPanel({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#eee9f1] bg-[#f6e6ff] p-8 md:p-10">
      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h3 className="mb-3 text-2xl font-bold text-[#35393f] md:text-3xl">
            Siap mengubah estimasi jadi hasil nyata?
          </h3>
          <p className="mb-6 max-w-lg text-[#656565]">
            Mulai dengan payroll, absensi, dan portal karyawan di satu HRIS. Trial 14 hari — tanpa
            kartu kredit.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-[#35393f]">
            {[
              'Setup tenant multi-user dalam hitungan menit',
              'Payroll Indonesia: BPJS, PPh 21, THR',
              'ESS karyawan + approval manajer',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#592277]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={HUMANIFY_BRAND.signupPath}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[#592277] px-6 py-3.5 font-bold text-white shadow-md transition-all hover:bg-[#501f6b]"
            >
              Coba Humanify Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={HUMANIFY_BRAND.loginPath}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#592277] bg-white px-6 py-3.5 font-bold text-[#592277] transition-all hover:bg-[#f6e6ff]"
            >
              Masuk ke Humanify
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 text-center shadow-sm">
          <p className="mb-2 text-sm font-semibold text-[#35393f]">Bagikan hasil ini</p>
          <p className="mb-4 text-xs text-[#656565]">
            Link menyimpan parameter kalkulator Anda — cocok untuk diskusi dengan tim finance.
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#592277] bg-white px-6 py-3 font-bold text-[#592277] transition-all hover:bg-[#f6e6ff]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Link Berhasil Disalin!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Salin Link Hasil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HumanifyRoiCalculator() {
  const router = useRouter();
  const pathname = '/humanify/pricing/roi-calculator';

  const [values, setValues] = useState<RoiInput>(ROI_DEFAULTS);
  const [debouncedValues, setDebouncedValues] = useState<RoiInput>(ROI_DEFAULTS);
  const [hrisPrefilled, setHrisPrefilled] = useState(false);
  const [ready, setReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const initRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || initRef.current) return;
    initRef.current = true;

    if (hasRoiQueryParams(router.query as Record<string, string | string[] | undefined>)) {
      const fromQuery = parseRoiQueryParams(
        router.query as Record<string, string | string[] | undefined>,
      );
      setValues(fromQuery);
      setDebouncedValues(fromQuery);
      setReady(true);
      return;
    }

    fetch('/api/humanify/roi-stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.dataSource === 'live' && json.data) {
          const merged = clampRoiInput({
            ...ROI_DEFAULTS,
            ...json.data,
          });
          setValues(merged);
          setDebouncedValues(merged);
          setHrisPrefilled(true);
        } else {
          setValues(ROI_DEFAULTS);
          setDebouncedValues(ROI_DEFAULTS);
        }
      })
      .catch(() => {
        setValues(ROI_DEFAULTS);
        setDebouncedValues(ROI_DEFAULTS);
      })
      .finally(() => setReady(true));
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedValues(clampRoiInput(values)), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values]);

  useEffect(() => {
    if (!router.isReady || !ready) return;
    const qs = buildRoiQueryString(debouncedValues);
    const currentQs = [
      router.query.jk,
      router.query.rg,
      router.query.jh,
      router.query.rh,
      router.query.ja,
    ]
      .map((v) => (Array.isArray(v) ? v[0] : v) ?? '')
      .join('|');
    const nextQs = [
      debouncedValues.jumlahKaryawan,
      debouncedValues.rataGajiKaryawan,
      debouncedValues.jumlahStaffHR,
      debouncedValues.rataGajiStaffHR,
      debouncedValues.jamAdminPerMinggu,
    ].join('|');
    if (currentQs === nextQs) return;
    void router.replace(`${pathname}?${qs}`, undefined, { shallow: true, scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync URL when values change
  }, [debouncedValues, ready, router.isReady]);

  const result = useMemo(() => calculateRoi(debouncedValues), [debouncedValues]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${pathname}?${buildRoiQueryString(debouncedValues)}`;
  }, [debouncedValues]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[#eee9f1] bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-28">
            <SliderPanel values={values} onChange={setValues} />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          {hrisPrefilled && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              Data karyawan dimuat dari HRIS Anda — sesuaikan angka jika diperlukan.
            </div>
          )}

          <HeroSaving result={result} />
          <ResultCards result={result} />
          <ValueDrivers result={result} />

          <div className="grid gap-6 md:grid-cols-2">
            <BreakdownPanel result={result} />
            <ComparisonChart result={result} />
          </div>

          <ProjectionChart result={result} />

          <CtaPanel shareUrl={shareUrl} />

          <div className="flex items-start gap-2 rounded-xl border border-[#eee9f1] bg-[#f6e6ff]/40 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#592277]/70" />
            <p className="text-xs leading-relaxed text-[#656565]">
              Hasil adalah estimasi untuk diskusi bisnis, bukan penawaran resmi. Biaya langganan
              memakai harga per karyawan (Rp
              {DEFAULT_SEAT_PRICING.pricePerUserIdr.toLocaleString('id-ID')}/orang; volume 251+ → Rp
              {DEFAULT_SEAT_PRICING.pricePerUserOver250Idr.toLocaleString('id-ID')}; 1.001+ → Rp
              {DEFAULT_SEAT_PRICING.pricePerUserOver1000Idr.toLocaleString('id-ID')}). LMS dan AIMAN
              belum termasuk. Asumsi: {Math.round(ROI_ASSUMPTIONS.efisiensiWaktu * 100)}% otomasi
              waktu admin HR, dan{' '}
              {(ROI_ASSUMPTIONS.errorRatePayroll * 100).toFixed(1)}% koreksi/overpayment payroll
              bulanan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
