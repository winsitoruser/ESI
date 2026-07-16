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
  ROI_DEFAULTS,
  ROI_FIELD_RANGES,
  RoiInput,
  RoiResult,
  buildRoiQueryString,
  calculateRoi,
  formatCurrency,
  formatNumber,
  getMonthlyProjection,
  parseRoiQueryParams,
} from '@/lib/humanify/roi-calculator';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

type FieldKey = keyof RoiInput;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  icon: React.ElementType;
  suffix: string;
  format: (v: number) => string;
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
  gradient: string;
  format: (v: number) => string;
}> = [
  {
    key: 'netSaving',
    label: 'Estimasi Penghematan Bersih',
    sublabel: 'per bulan',
    icon: TrendingUp,
    gradient: 'from-emerald-500/30 to-green-600/20',
    format: formatCurrency,
  },
  {
    key: 'roiPersen',
    label: 'Return on Investment',
    sublabel: '',
    icon: Calculator,
    gradient: 'from-violet-500/30 to-fuchsia-600/20',
    format: (v) => `${Math.round(v)}%`,
  },
  {
    key: 'penghematanJamPerBulan',
    label: 'Waktu yang Dihemat',
    sublabel: 'jam per bulan',
    icon: Clock,
    gradient: 'from-violet-500/30 to-indigo-600/20',
    format: (v) => formatNumber(Math.round(v)),
  },
  {
    key: 'penghematanTahunan',
    label: 'Proyeksi Penghematan',
    sublabel: 'per tahun',
    icon: CalendarCheck,
    gradient: 'from-amber-500/30 to-orange-600/20',
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

function SliderPanel({
  values,
  onChange,
}: {
  values: RoiInput;
  onChange: (next: RoiInput) => void;
}) {
  const handleChange = useCallback(
    (key: FieldKey, raw: number) => {
      onChange({ ...values, [key]: raw });
    },
    [values, onChange],
  );

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h3 className="text-lg font-bold text-white mb-1">Data Perusahaan Anda</h3>
        <p className="text-sm text-violet-300/50">
          Sesuaikan parameter di bawah untuk menghitung estimasi penghematan
        </p>
      </div>

      {FIELDS.map((field) => {
        const range = ROI_FIELD_RANGES[field.key];
        const current = values[field.key];
        const pct = ((current - range.min) / (range.max - range.min)) * 100;
        const Icon = field.icon;

        return (
          <div key={field.key} className="group">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-violet-100/80">
                <Icon className="w-4 h-4 text-violet-400" />
                {field.label}
              </label>
              <span className="text-sm font-bold text-violet-200 bg-violet-500/15 px-3 py-1 rounded-full border border-violet-400/20">
                {field.format(current)} {field.suffix}
              </span>
            </div>

            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={current}
              onChange={(e) => handleChange(field.key, Number(e.target.value))}
              aria-label={field.label}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-violet-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-violet-400 [&::-webkit-slider-thumb]:to-fuchsia-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(139 92 246) 0%, rgb(192 132 252) ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />

            <div className="flex justify-between mt-1">
              <span className="text-xs text-violet-400/40">{field.format(range.min)}</span>
              <span className="text-xs text-violet-400/40">{field.format(range.max)}</span>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange({ ...ROI_DEFAULTS })}
        className="w-full mt-2 text-sm text-violet-300/60 hover:text-violet-200 transition-colors py-2.5 border border-dashed border-white/10 hover:border-violet-400/30 rounded-xl"
      >
        Reset ke Nilai Default
      </button>
    </div>
  );
}

function ResultCards({ result }: { result: RoiResult }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white mb-1">Hasil Kalkulasi</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {RESULT_CARDS.map((card) => {
          const Icon = card.icon;
          const value = result[card.key] as number;
          return (
            <div
              key={card.key}
              className={`relative overflow-hidden rounded-2xl p-5 border border-white/[0.08] bg-gradient-to-br ${card.gradient}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-violet-300/60 mb-1">{card.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-white truncate">
                    <AnimatedValue value={value} format={card.format} />
                  </p>
                  {card.sublabel && (
                    <p className="text-xs text-violet-400/50 mt-0.5">{card.sublabel}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownPanel({ result }: { result: RoiResult }) {
  const rows = [
    { label: 'Penghematan waktu admin HR', value: result.penghematanBiayaHRStaff, positive: true },
    { label: 'Pengurangan error payroll', value: result.penguranganErrorPayroll, positive: true },
    { label: 'Total penghematan', value: result.totalPenghematan, positive: true, bold: true },
    { label: `Biaya langganan (${result.namaTier})`, value: result.biayaLangganan, positive: false },
    { label: 'Penghematan bersih', value: result.netSaving, positive: true, bold: true, highlight: true },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <h4 className="font-semibold text-white mb-4">Rincian Perhitungan</h4>
      <div className="space-y-2.5 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex justify-between gap-4 ${
              row.bold ? 'border-t border-white/[0.06] pt-2.5' : ''
            }`}
          >
            <span className="text-violet-300/60">{row.label}</span>
            <span
              className={`font-semibold shrink-0 ${
                row.highlight
                  ? 'text-violet-300'
                  : row.positive
                    ? 'text-emerald-400'
                    : 'text-red-400'
              }`}
            >
              {!row.positive && row.value > 0 ? '-' : ''}
              {formatCurrency(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>

      {result.paybackPeriodHari > 0 && (
        <p className="text-xs text-violet-400/50 text-center mt-4">
          Periode balik modal estimasi:{' '}
          <span className="font-semibold text-violet-300">
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
    { name: 'Setelah Humanify', biaya: Math.max(result.biayaSesudah, 0) },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <h4 className="font-semibold text-white mb-4">Perbandingan Biaya Bulanan</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.15)" />
            <XAxis dataKey="name" tick={{ fill: 'rgba(196,181,253,0.6)', fontSize: 12 }} />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`}
              tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Biaya']}
              contentStyle={{
                background: '#0f0a1a',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 12,
                color: '#fff',
              }}
            />
            <Bar dataKey="biaya" fill="url(#hfBarGrad)" radius={[8, 8, 0, 0]} />
            <defs>
              <linearGradient id="hfBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#c026d3" />
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
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
      <h4 className="font-semibold text-white mb-4">Proyeksi 12 Bulan</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.15)" />
            <XAxis dataKey="bulanShort" tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`}
              tick={{ fill: 'rgba(196,181,253,0.5)', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'penghematan' ? 'Penghematan' : 'Net Saving',
              ]}
              contentStyle={{
                background: '#0f0a1a',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 12,
                color: '#fff',
              }}
            />
            <Legend
              formatter={(value) =>
                value === 'penghematan' ? 'Total Penghematan' : 'Penghematan Bersih'
              }
              wrapperStyle={{ color: 'rgba(196,181,253,0.7)', fontSize: 12 }}
            />
            <Bar dataKey="penghematan" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="netSaving" fill="#a78bfa" radius={[4, 4, 0, 0]} />
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
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/15 to-violet-900/30 p-8 md:p-10 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15),_transparent_70%)]" />
      <div className="relative z-10">
        <h3 className="text-2xl md:text-3xl font-bold mb-3">Siap Mulai Menghemat?</h3>
        <p className="text-violet-200/70 mb-8 max-w-lg mx-auto">
          Buktikan langsung penghematan di perusahaan Anda. Mulai gunakan Humanify dan transformasi
          operasional HR Anda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={HUMANIFY_BRAND.loginPath}
            className="group inline-flex items-center justify-center gap-2 bg-white text-violet-900 px-6 py-3.5 rounded-xl hover:bg-violet-50 transition-all font-bold shadow-xl"
          >
            Masuk ke Humanify
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button
            type="button"
            onClick={handleCopy}
            className="group inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3.5 rounded-xl hover:bg-white/15 transition-all font-bold border border-white/15"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                Link Berhasil Disalin!
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Bagikan Hasil
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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = parseRoiQueryParams(router.query as Record<string, string | string[] | undefined>);
    const hasQueryParams = Object.keys(router.query).some((k) =>
      ['jumlahKaryawan', 'rataGajiKaryawan', 'jumlahStaffHR', 'rataGajiStaffHR', 'jamAdminPerMinggu'].includes(k),
    );
    if (hasQueryParams) {
      setValues(fromQuery);
      setDebouncedValues(fromQuery);
      return;
    }
    fetch('/api/humanify/roi-stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.dataSource === 'live' && json.data) {
          setValues(json.data);
          setDebouncedValues(json.data);
          setHrisPrefilled(true);
        } else {
          setValues(ROI_DEFAULTS);
          setDebouncedValues(ROI_DEFAULTS);
        }
      })
      .catch(() => {
        setValues(ROI_DEFAULTS);
        setDebouncedValues(ROI_DEFAULTS);
      });
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedValues(values), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [values]);

  useEffect(() => {
    if (!router.isReady) return;
    const qs = buildRoiQueryString(debouncedValues);
    router.replace(`${pathname}?${qs}`, undefined, { shallow: true, scroll: false });
  }, [debouncedValues, router]);

  const result = useMemo(() => calculateRoi(debouncedValues), [debouncedValues]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${pathname}?${buildRoiQueryString(debouncedValues)}`;
  }, [debouncedValues]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <div className="sticky top-28 rounded-2xl p-6 border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm shadow-xl shadow-violet-950/20">
            <SliderPanel values={values} onChange={setValues} />
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {hrisPrefilled && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              Data karyawan dimuat dari HRIS Anda — sesuaikan angka jika diperlukan.
            </div>
          )}
          <ResultCards result={result} />

          <div className="grid md:grid-cols-2 gap-6">
            <BreakdownPanel result={result} />
            <ComparisonChart result={result} />
          </div>

          <ProjectionChart result={result} />

          <CtaPanel shareUrl={shareUrl} />

          <div className="flex items-start gap-2 rounded-xl p-4 border border-white/[0.06] bg-white/[0.02]">
            <Info className="w-4 h-4 text-violet-400/60 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-300/45 leading-relaxed">
              Hasil kalkulasi ini merupakan estimasi berdasarkan data yang Anda masukkan dan
              rata-rata industri. Hasil aktual dapat bervariasi tergantung kondisi perusahaan Anda.
              Asumsi: {Math.round(ROI_ASSUMPTIONS.efisiensiWaktu * 100)}% pengurangan waktu admin,{' '}
              {ROI_ASSUMPTIONS.errorRatePayroll * 100}% error rate payroll manual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
