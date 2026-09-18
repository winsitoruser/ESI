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
import { DEFAULT_SEAT_PRICING } from '@/lib/saas/seat-pricing-core';

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
  accent: string;
  format: (v: number) => string;
}> = [
  {
    key: 'netSaving',
    label: 'Estimasi Penghematan Bersih',
    sublabel: 'per bulan',
    icon: TrendingUp,
    accent: 'bg-emerald-50 text-emerald-700',
    format: formatCurrency,
  },
  {
    key: 'roiPersen',
    label: 'Return on Investment',
    sublabel: '',
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
        <h3 className="mb-1 text-lg font-bold text-[#35393f]">Data Perusahaan Anda</h3>
        <p className="text-sm text-[#656565]">
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
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#35393f]">
                <Icon className="h-4 w-4 shrink-0 text-[#592277]" />
                {field.label}
              </label>
              <span className="w-fit rounded-full border border-[#eee9f1] bg-[#f6e6ff] px-3 py-1 text-sm font-bold text-[#592277]">
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
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-[#eee9f1] text-sm text-[#656565] transition-colors hover:border-[#592277]/40 hover:text-[#592277]"
      >
        Reset ke Nilai Default
      </button>
    </div>
  );
}

function ResultCards({ result }: { result: RoiResult }) {
  return (
    <div className="space-y-4">
      <h3 className="mb-1 text-lg font-bold text-[#35393f]">Hasil Kalkulasi</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <p className="truncate text-xl font-bold text-[#35393f] sm:text-2xl">
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
              {!row.positive && row.value > 0 ? '-' : ''}
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
    { name: 'Setelah Humanify', biaya: Math.max(result.biayaSesudah, 0) },
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
    <div className="relative overflow-hidden rounded-2xl border border-[#eee9f1] bg-[#f6e6ff] p-8 text-center md:p-10">
      <div className="relative z-10">
        <h3 className="mb-3 text-2xl font-bold text-[#35393f] md:text-3xl">Siap Mulai Menghemat?</h3>
        <p className="mx-auto mb-8 max-w-lg text-[#656565]">
          Buktikan langsung penghematan di perusahaan Anda. Mulai gunakan Humanify dan transformasi
          operasional HR Anda.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={HUMANIFY_BRAND.loginPath}
            className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#592277] px-6 py-3.5 font-bold text-white shadow-md transition-all hover:bg-[#501f6b]"
          >
            Masuk ke Humanify
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={handleCopy}
            className="group inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#592277] bg-white px-6 py-3.5 font-bold text-[#592277] transition-all hover:bg-[#f6e6ff]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                Link Berhasil Disalin!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
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
          <ResultCards result={result} />

          <div className="grid gap-6 md:grid-cols-2">
            <BreakdownPanel result={result} />
            <ComparisonChart result={result} />
          </div>

          <ProjectionChart result={result} />

          <CtaPanel shareUrl={shareUrl} />

          <div className="flex items-start gap-2 rounded-xl border border-[#eee9f1] bg-[#f6e6ff]/40 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#592277]/70" />
            <p className="text-xs leading-relaxed text-[#656565]">
              Hasil kalkulasi ini merupakan estimasi. Biaya langganan memakai harga per karyawan
              (Rp{DEFAULT_SEAT_PRICING.pricePerUserIdr.toLocaleString('id-ID')}/orang, volume 251+ → Rp{DEFAULT_SEAT_PRICING.pricePerUserOver250Idr.toLocaleString('id-ID')},
              1.001+ → Rp{DEFAULT_SEAT_PRICING.pricePerUserOver1000Idr.toLocaleString('id-ID')}).
              LMS dan AIMAN belum termasuk. Hasil aktual dapat bervariasi.
              Asumsi: {Math.round(ROI_ASSUMPTIONS.efisiensiWaktu * 100)}% pengurangan waktu admin,{' '}
              {ROI_ASSUMPTIONS.errorRatePayroll * 100}% error rate payroll manual.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
