import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { mapApiJsonError, humanifyErrorMessage } from '@/lib/humanify/api-error';
import {
  HUMANIFY_FEATURE_LABELS,
  type HumanifyFeature,
  type HumanifyPlanId,
} from '@/lib/saas/plan-entitlements';

function formatIdr(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

const STEPS = [
  { id: 1, label: 'Pilih paket' },
  { id: 2, label: 'Jumlah user' },
  { id: 3, label: 'Bayar' },
] as const;

const SEAT_PRESETS = [10, 25, 50, 100, 250, 1000];

type Interval = 'monthly' | 'yearly';

type Quote = {
  plan: HumanifyPlanId;
  planName: string;
  interval: Interval;
  listPriceIdr: number;
  discountIdr: number;
  payableIdr: number;
  voucherCode: string | null;
  voucherLabel: string | null;
  money: { subtotal: number; tax: number; total: number; taxRate: number };
  change: null | {
    currentPlan: string;
    direction: 'upgrade' | 'downgrade' | 'same';
    seats: { users: number; employees: number };
    targetMaxUsers: number;
    targetMaxEmployees: number;
    fits: boolean;
    blockers: string[];
  };
  errors: string[];
  warnings: string[];
  canCheckout: boolean;
  canDowngrade: boolean;
  isRenewal: boolean;
  minSeats?: number;
  activeEmployees?: number;
  seat?: {
    seats: number;
    rateIdr: number;
    tier: string;
    tierLabel: string;
    addons: { lms: boolean; ai: boolean; ats: boolean; talentBank: boolean };
    coreIdr: number;
    lmsIdr: number;
    aiIdr: number;
    atsIdr: number;
    talentBankIdr: number;
    monthlyIdr: number;
    periodIdr: number;
  };
};

type PlanCard = {
  id: string;
  name: string;
  description: string;
  features: string[];
  maxEmployees: number;
  priceMonthlyIdr: number;
  priceYearlyIdr: number;
  pricingModel?: string;
  seatPricing?: {
    pricePerUserIdr: number;
    pricePerUserOver250Idr: number;
    pricePerUserOver1000Idr: number;
    lmsPerUserIdr: number;
    aiMonthlyIdr: number;
    atsPerUserIdr: number;
    talentBankPerUserIdr: number;
    yearlyDiscountPct: number;
  };
};

const BILLABLE_PLAN_ORDER = ['starter', 'growth', 'enterprise'] as const;

const CARD_FEATURES: HumanifyFeature[] = [
  'core',
  'attendance',
  'payroll',
  'analytics',
  'api',
  'sso',
];

const PLAN_CARD_VISUAL: Record<string, {
  gradient: string;
  accent: string;
  tagline: string;
  featured: boolean;
}> = {
  starter: {
    gradient: 'linear-gradient(165deg, #fb7185 0%, #f43f5e 45%, #ec4899 100%)',
    accent: '#db2777',
    tagline: 'HRIS Inti',
    featured: false,
  },
  growth: {
    gradient: 'linear-gradient(165deg, #e879f9 0%, #d946ef 42%, #a21caf 100%)',
    accent: '#c026d3',
    tagline: 'Payroll & Analytics',
    featured: true,
  },
  enterprise: {
    gradient: 'linear-gradient(165deg, #a78bfa 0%, #8b5cf6 40%, #6d28d9 100%)',
    accent: '#6d28d9',
    tagline: 'Full Platform',
    featured: false,
  },
};

function formatIdrCompact(n: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);
}

export default function BillingCheckoutWizard({
  plans,
  currentPlan,
  midtransConfigured,
  midtrans,
  customerEmail,
  initialPlan,
  initialSeats,
  initialAddons,
  acting,
  setActing,
  onPaid,
  onDowngrade,
  openSnap,
}: {
  plans: PlanCard[];
  currentPlan?: string;
  midtransConfigured: boolean;
  midtrans: any;
  customerEmail?: string | null;
  initialPlan?: string;
  initialSeats?: number;
  initialAddons?: { lms?: boolean; ai?: boolean; ats?: boolean; talentBank?: boolean };
  acting: string | null;
  setActing: (v: string | null) => void;
  onPaid: () => void;
  onDowngrade: (planId: string) => Promise<void>;
  openSnap: (token: string, orderCode: string, redirectUrl?: string | null) => boolean;
}) {
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string>(initialPlan || '');
  const [interval, setInterval] = useState<Interval>('monthly');
  const [voucherCode, setVoucherCode] = useState('');
  const [seats, setSeats] = useState<number>(initialSeats || 0);
  const [addonLms, setAddonLms] = useState(Boolean(initialAddons?.lms));
  const [addonAi, setAddonAi] = useState(Boolean(initialAddons?.ai));
  const [addonAts, setAddonAts] = useState(Boolean(initialAddons?.ats));
  const [addonTalentBank, setAddonTalentBank] = useState(Boolean(initialAddons?.talentBank));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [agree, setAgree] = useState(false);
  const emailOk = Boolean(String(customerEmail || '').includes('@'));
  const voucherRef = useRef(voucherCode);
  voucherRef.current = voucherCode;

  useEffect(() => {
    if (initialPlan && plans.some((p) => p.id === initialPlan)) {
      setSelected(initialPlan);
      setStep(2);
    }
  }, [initialPlan, plans]);

  const selectedPlan = plans.find((p) => p.id === selected);

  const loadQuote = useCallback(async () => {
    if (!selected) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    try {
      const q = new URLSearchParams({
        action: 'checkout-quote',
        plan: selected,
        interval,
      });
      if (voucherCode.trim()) q.set('voucherCode', voucherCode.trim());
      if (seats > 0) q.set('seats', String(seats));
      if (addonLms) q.set('lms', '1');
      if (addonAi) q.set('ai', '1');
      if (addonAts) q.set('ats', '1');
      if (addonTalentBank) q.set('talentBank', '1');
      const res = await fetch(`/api/humanify/billing?${q.toString()}`);
      const j = await res.json();
      if (j.success) setQuote(j.data);
      else {
        setQuote(j.data || null);
        if (j.error) toast.error(j.error);
      }
    } catch {
      toast.error('Gagal menghitung tagihan');
    } finally {
      setQuoting(false);
    }
  }, [selected, interval, voucherCode, seats, addonLms, addonAi, addonAts, addonTalentBank]);

  useEffect(() => {
    if (!selected) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setQuoting(true);
      try {
        const q = new URLSearchParams({
          action: 'checkout-quote',
          plan: selected,
          interval,
        });
        const code = voucherRef.current.trim();
        if (code) q.set('voucherCode', code);
        if (seats > 0) q.set('seats', String(seats));
        if (addonLms) q.set('lms', '1');
        if (addonAi) q.set('ai', '1');
        if (addonAts) q.set('ats', '1');
        if (addonTalentBank) q.set('talentBank', '1');
        const res = await fetch(`/api/humanify/billing?${q.toString()}`);
        const j = await res.json();
        if (cancelled) return;
        if (j.success) setQuote(j.data);
        else setQuote(j.data || null);
      } catch {
        if (!cancelled) toast.error('Gagal menghitung tagihan');
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, interval, seats, addonLms, addonAi, addonAts, addonTalentBank]);

  useEffect(() => {
    if (seats === 0 && quote?.seat?.seats) setSeats(quote.seat.seats);
  }, [quote, seats]);

  const stepErrors = useMemo(() => {
    if (step === 1) {
      if (!selected) return ['Pilih salah satu paket untuk melanjutkan.'];
      return quote?.errors || [];
    }
    if (step === 2) {
      const errs = [...(quote?.errors || [])];
      const min = quote?.minSeats || 1;
      if (!seats || seats < min) {
        errs.push(`Masukkan jumlah user yang dibeli (minimal ${min.toLocaleString('id-ID')}).`);
      }
      if (voucherCode.trim() && quote && !quote.voucherCode && !quoting) {
        errs.push('Voucher belum valid. Hapus kode atau perbaiki.');
      }
      return errs;
    }
    if (step === 3) {
      const errs = [...(quote?.errors || [])];
      if (!emailOk) errs.push('Email akun diperlukan untuk kwitansi Midtrans.');
      if (!agree) errs.push('Centang persetujuan paket dan pembayaran.');
      if (quote && !quote.canCheckout && !quote.canDowngrade) {
        errs.push(quote.errors[0] || 'Paket tidak dapat dilanjutkan.');
      }
      return errs;
    }
    return quote?.errors || [];
  }, [step, selected, quote, voucherCode, quoting, emailOk, agree, seats]);

  const canNext = stepErrors.length === 0 && !quoting;

  function goNext() {
    if (!canNext) {
      toast.error(stepErrors[0] || 'Lengkapi langkah ini dulu');
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function setSeatCount(next: number) {
    const min = quote?.minSeats || 1;
    setSeats(Math.min(100_000, Math.max(min, Math.round(Number(next) || min))));
  }

  async function pay() {
    if (!selected || !quote) return;
    if (quote.canDowngrade) {
      await onDowngrade(selected);
      return;
    }
    if (!quote.canCheckout) {
      toast.error(quote.errors[0] || 'Checkout ditolak');
      return;
    }
    if (!agree) {
      toast.error('Centang persetujuan terlebih dahulu');
      return;
    }
    setActing(selected);
    try {
      const res = await fetch('/api/humanify/billing?action=checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selected,
          interval,
          voucherCode: voucherCode.trim() || undefined,
          seats: seats || quote.seat?.seats,
          addons: { lms: addonLms, ai: addonAi, ats: addonAts, talentBank: addonTalentBank },
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(mapApiJsonError(j, 'Checkout gagal'));
      const data = j.data;
      if (data.activated) {
        toast.success(`Paket ${quote.planName} aktif`);
        onPaid();
        return;
      }
      if (data.provider === 'midtrans' && (data.snapToken || data.redirectUrl)) {
        const opened = openSnap(data.snapToken, data.orderCode, data.redirectUrl);
        if (!opened) throw new Error('Snap Midtrans belum siap. Muat ulang halaman, lalu coba lagi.');
        return;
      }
      if (midtransConfigured) {
        toast('Order dibuat. Selesaikan pembayaran di Midtrans.', { icon: '💳' });
        onPaid();
        return;
      }
      toast.error('Midtrans belum dikonfigurasi. Hubungi admin Humanify.');
    } catch (e: any) {
      toast.error(humanifyErrorMessage(e, 'Checkout gagal'));
    } finally {
      setActing(null);
    }
  }

  const priceOf = (plan: PlanCard) =>
    plan.seatPricing?.pricePerUserIdr || plan.priceMonthlyIdr;

  const visiblePlans = (() => {
    const ordered = BILLABLE_PLAN_ORDER
      .map((id) => plans.find((p) => p.id === id))
      .filter((p): p is PlanCard => Boolean(p));
    return ordered.length ? ordered : plans.filter((p) => p.id !== 'trial').slice(0, 3);
  })();

  return (
    <section id="checkout" className="space-y-5">
      <ol className="grid grid-cols-3 gap-2" aria-label="Langkah checkout">
        {STEPS.map((s) => {
          const done = step > s.id;
          const current = step === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                className={`flex w-full items-center gap-2 rounded-[var(--hf-radius-lg)] border px-3 py-2.5 text-left text-xs font-semibold transition ${
                  current
                    ? 'border-[color:var(--hf-brand-500)]/40 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]'
                    : done
                      ? 'border-[var(--hf-border)] bg-white text-[color:var(--hf-ink)]'
                      : 'border-[var(--hf-border)] bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
                }`}
              >
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : current
                        ? 'bg-[color:var(--hf-brand-600)] text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                </span>
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="hf-section-label">Paket</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--hf-ink)]">
              Pilih paket, lalu tentukan jumlah user
            </h2>
            <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
              Setelah paket dipilih, Anda akan memasukkan berapa user yang dibeli. Harga per user, LMS dan AIMAN add-on.
            </p>
          </div>
          <div className="grid items-stretch gap-6 md:grid-cols-[1fr_1.12fr_1fr] md:gap-4 lg:gap-5">
            {visiblePlans.map((plan) => {
              const isCurrent = currentPlan === plan.id;
              const visual = PLAN_CARD_VISUAL[plan.id] || PLAN_CARD_VISUAL.starter;
              const featured = visual.featured;
              const active = selected === plan.id;
              const included = new Set(plan.features || []);
              return (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`Pilih paket ${plan.name}`}
                  onClick={() => {
                    setSelected(plan.id);
                    setStep(2);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(plan.id);
                      setStep(2);
                    }
                  }}
                  className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_12px_40px_rgb(15_23_42/0.10)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgb(15_23_42/0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--hf-brand-500)]/25 ${
                    featured ? 'md:shadow-[0_20px_50px_rgb(15_23_42/0.16)]' : ''
                  } ${active ? 'ring-2 ring-[color:var(--hf-brand-500)]/45' : ''}`}
                >
                  <div
                    className={`relative px-6 text-center text-white ${featured ? 'pb-16 pt-10' : 'pb-14 pt-8'}`}
                    style={{
                      background: visual.gradient,
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 22px), 50% 100%, 0 calc(100% - 22px))',
                    }}
                  >
                    {isCurrent && (
                      <span className="absolute left-4 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                        Aktif
                      </span>
                    )}
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                      {plan.name}
                    </p>
                    <p className="mt-2 flex items-start justify-center gap-1 text-white">
                      <span className="mt-2 text-sm font-semibold opacity-90">Rp</span>
                      <span className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums">
                        {formatIdrCompact(priceOf(plan))}
                      </span>
                    </p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-white/80">
                      per user / bulan
                    </p>
                  </div>

                  <div className={`flex flex-1 flex-col px-6 pb-6 ${featured ? 'pt-8' : 'pt-7'}`}>
                    <p
                      className="text-center text-sm font-bold uppercase tracking-[0.14em]"
                      style={{ color: visual.accent }}
                    >
                      {visual.tagline}
                    </p>
                    <p className="mt-1 mb-4 text-center text-[11px] leading-snug text-slate-400">
                      {plan.description}
                    </p>
                    <ul className="flex-1 divide-y divide-slate-100 border-t border-slate-100">
                      {CARD_FEATURES.map((feat) => {
                        const on = included.has(feat);
                        return (
                          <li
                            key={feat}
                            className="flex items-center gap-2.5 py-2.5 text-[13px] text-slate-500"
                          >
                            {on ? (
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                                <X className="h-3.5 w-3.5" strokeWidth={3} />
                              </span>
                            )}
                            {HUMANIFY_FEATURE_LABELS[feat]}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-auto pt-3">
                      <p className="text-center text-[11px] text-slate-400">
                        Volume 251+ {formatIdr(plan.seatPricing?.pricePerUserOver250Idr || 9500)}
                        {' · '}1.001+ {formatIdr(plan.seatPricing?.pricePerUserOver1000Idr || 9000)}
                      </p>
                      <span
                        className="mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-sm transition group-hover:brightness-110"
                        style={{ background: visual.gradient }}
                      >
                        {isCurrent ? 'Kelola paket' : 'Pilih paket'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && selectedPlan && (
        <div className="space-y-5">
          <div>
            <p className="hf-section-label">Jumlah user</p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--hf-ink)]">
              Berapa user yang ingin dibeli?
            </h2>
            <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
              Paket {selectedPlan.name} · 1 user = 1 karyawan aktif di Humanify.
              {quote?.activeEmployees
                ? ` Saat ini ada ${quote.activeEmployees.toLocaleString('id-ID')} karyawan.`
                : ''}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="hf-card space-y-5 p-5 sm:p-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--hf-ink-muted)]" htmlFor="hf-seats">
                  Jumlah user dibeli
                </label>
                <div className="mt-3 flex items-stretch gap-2">
                  <button
                    type="button"
                    aria-label="Kurangi 1 user"
                    disabled={(seats || 1) <= (quote?.minSeats || 1)}
                    onClick={() => setSeatCount((seats || quote?.minSeats || 1) - 1)}
                    className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white text-[color:var(--hf-ink)] hover:bg-[var(--hf-surface-muted)] disabled:opacity-40"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    id="hf-seats"
                    type="number"
                    inputMode="numeric"
                    min={quote?.minSeats || 1}
                    max={100000}
                    value={seats || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setSeats(0);
                        return;
                      }
                      setSeats(Math.max(0, Math.round(Number(raw) || 0)));
                    }}
                    onBlur={() => {
                      if (!seats || seats < (quote?.minSeats || 1)) setSeatCount(quote?.minSeats || 1);
                    }}
                    className="hf-input min-w-0 flex-1 text-center text-3xl font-semibold tabular-nums tracking-tight"
                  />
                  <button
                    type="button"
                    aria-label="Tambah 1 user"
                    onClick={() => setSeatCount((seats || quote?.minSeats || 1) + 1)}
                    className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white text-[color:var(--hf-ink)] hover:bg-[var(--hf-surface-muted)]"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-[color:var(--hf-ink-faint)]">
                  Minimal {((quote?.minSeats || 1)).toLocaleString('id-ID')} user
                  {quote?.activeEmployees ? ' (tidak boleh kurang dari karyawan aktif)' : ''}.
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-[color:var(--hf-ink-muted)]">Pilih cepat</p>
                <div className="flex flex-wrap gap-2">
                  {quote?.activeEmployees ? (
                    <button
                      type="button"
                      onClick={() => setSeatCount(quote.activeEmployees || 1)}
                      className="rounded-full border border-[var(--hf-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[color:var(--hf-ink)] hover:border-[color:var(--hf-brand-500)]/40 hover:bg-[var(--hf-brand-50)]"
                    >
                      Karyawan aktif ({quote.activeEmployees.toLocaleString('id-ID')})
                    </button>
                  ) : null}
                  {SEAT_PRESETS.filter((n) => n >= (quote?.minSeats || 1)).map((n) => (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setSeatCount(n)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        seats === n
                          ? 'border-[color:var(--hf-brand-500)]/40 bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]'
                          : 'border-[var(--hf-border)] bg-white text-[color:var(--hf-ink)] hover:bg-[var(--hf-surface-muted)]'
                      }`}
                    >
                      {n.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="inline-flex rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] p-1"
                role="group"
                aria-label="Periode tagihan"
              >
                <button
                  type="button"
                  onClick={() => setInterval('monthly')}
                  className={`rounded-[calc(var(--hf-radius-lg)-2px)] px-4 py-2 text-sm font-medium ${
                    interval === 'monthly'
                      ? 'bg-white text-[color:var(--hf-ink)] shadow-[var(--hf-shadow)]'
                      : 'text-[color:var(--hf-ink-muted)]'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setInterval('yearly')}
                  className={`inline-flex items-center gap-1.5 rounded-[calc(var(--hf-radius-lg)-2px)] px-4 py-2 text-sm font-medium ${
                    interval === 'yearly'
                      ? 'bg-white text-[color:var(--hf-ink)] shadow-[var(--hf-shadow)]'
                      : 'text-[color:var(--hf-ink-muted)]'
                  }`}
                >
                  Tahunan
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    −20%
                  </span>
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[color:var(--hf-ink-muted)]">Add-on (opsional)</p>
                <label className="flex items-start gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white px-3 py-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={addonAts} onChange={(e) => setAddonAts(e.target.checked)} />
                  <span>
                    <span className="font-medium text-[color:var(--hf-ink)]">ATS / Rekrutmen</span>
                    <span className="block text-xs text-[color:var(--hf-ink-muted)]">
                      Pipeline lowongan, kandidat, portal karir · +{formatIdr(selectedPlan.seatPricing?.atsPerUserIdr || 2000)} per user / bulan
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white px-3 py-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={addonTalentBank} onChange={(e) => setAddonTalentBank(e.target.checked)} />
                  <span>
                    <span className="font-medium text-[color:var(--hf-ink)]">Bank Data Talent</span>
                    <span className="block text-xs text-[color:var(--hf-ink-muted)]">
                      Talent graph, NL search, match berbasis bukti · +{formatIdr(selectedPlan.seatPricing?.talentBankPerUserIdr || 1500)} per user / bulan
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white px-3 py-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={addonLms} onChange={(e) => setAddonLms(e.target.checked)} />
                  <span>
                    <span className="font-medium text-[color:var(--hf-ink)]">LMS / Training</span>
                    <span className="block text-xs text-[color:var(--hf-ink-muted)]">
                      +{formatIdr(selectedPlan.seatPricing?.lmsPerUserIdr || 1500)} per user / bulan
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-[var(--hf-radius-lg)] border border-[var(--hf-border)] bg-white px-3 py-3 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={addonAi} onChange={(e) => setAddonAi(e.target.checked)} />
                  <span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-[color:var(--hf-ink)]">
                      <Sparkles className="h-3.5 w-3.5" /> AIMAN Copilot
                    </span>
                    <span className="block text-xs text-[color:var(--hf-ink-muted)]">
                      +{formatIdr(selectedPlan.seatPricing?.aiMonthlyIdr || 65000)} / bulan · termasuk 10.000 token AIMAN
                    </span>
                  </span>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[color:var(--hf-ink-muted)]" htmlFor="hf-voucher">
                  Kode voucher (opsional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="hf-voucher"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    onBlur={loadQuote}
                    placeholder="CONTOH: HFPROMO"
                    className="hf-input min-w-0 flex-1 font-mono text-sm uppercase"
                  />
                  <button type="button" onClick={loadQuote} className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm">
                    <Ticket className="h-3.5 w-3.5" />
                    Cek
                  </button>
                </div>
                {quote?.voucherCode ? (
                  <p className="text-xs text-emerald-700">
                    {quote.voucherLabel || quote.voucherCode} · hemat {formatIdr(quote.discountIdr)}
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="hf-card h-fit space-y-3 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
                <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Perkiraan tagihan</p>
              </div>
              {quoting && !quote?.seat ? (
                <p className="text-sm text-[color:var(--hf-ink-muted)]">Menghitung…</p>
              ) : (
                <>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-[color:var(--hf-ink)]">
                    {formatIdr(quote?.payableIdr || 0)}
                  </p>
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">
                    {(seats || quote?.seat?.seats || 0).toLocaleString('id-ID')} user
                    {' × '}
                    {formatIdr(quote?.seat?.rateIdr || selectedPlan.seatPricing?.pricePerUserIdr || 10000)}
                    {' / user'}
                    {interval === 'yearly' ? ' · tahunan −20%' : ' / bulan'}
                    {' · PPN termasuk'}
                  </p>
                  {quote?.seat?.tierLabel ? (
                    <p className="rounded-lg bg-[var(--hf-brand-50)] px-3 py-2 text-xs font-medium text-[color:var(--hf-brand-600)]">
                      {quote.seat.tierLabel}
                    </p>
                  ) : null}
                  {addonLms || addonAi || addonAts || addonTalentBank ? (
                    <ul className="space-y-1 text-xs text-[color:var(--hf-ink-secondary)]">
                      {addonAts ? <li>ATS {formatIdr(quote?.seat?.atsIdr || 0)}/bln</li> : null}
                      {addonTalentBank ? <li>Bank Data {formatIdr(quote?.seat?.talentBankIdr || 0)}/bln</li> : null}
                      {addonLms ? <li>LMS {formatIdr(quote?.seat?.lmsIdr || 0)}/bln</li> : null}
                      {addonAi ? <li>AIMAN {formatIdr(quote?.seat?.aiIdr || 0)}/bln</li> : null}
                    </ul>
                  ) : null}
                </>
              )}
            </aside>
          </div>
        </div>
      )}

      {step >= 3 && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="hf-card space-y-4 p-5">
            <p className="hf-section-label">Ringkasan</p>
            {quoting && !quote ? (
              <p className="text-sm text-[color:var(--hf-ink-muted)]">Menghitung…</p>
            ) : quote ? (
              <>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">Paket</dt>
                    <dd className="font-medium text-[color:var(--hf-ink)]">{quote.planName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">User dibeli</dt>
                    <dd className="tabular-nums">{(quote.seat?.seats || seats).toLocaleString('id-ID')} user · {formatIdr(quote.seat?.rateIdr || 0)}/orang</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">HRIS inti</dt>
                    <dd className="tabular-nums">{formatIdr(quote.seat?.coreIdr || 0)}/bln</dd>
                  </div>
                  {quote.seat?.addons.ats ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[color:var(--hf-ink-muted)]">ATS</dt>
                      <dd className="tabular-nums">{formatIdr(quote.seat.atsIdr)}/bln</dd>
                    </div>
                  ) : null}
                  {quote.seat?.addons.talentBank ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[color:var(--hf-ink-muted)]">Bank Data</dt>
                      <dd className="tabular-nums">{formatIdr(quote.seat.talentBankIdr)}/bln</dd>
                    </div>
                  ) : null}
                  {quote.seat?.addons.lms ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[color:var(--hf-ink-muted)]">LMS</dt>
                      <dd className="tabular-nums">{formatIdr(quote.seat.lmsIdr)}/bln</dd>
                    </div>
                  ) : null}
                  {quote.seat?.addons.ai ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-[color:var(--hf-ink-muted)]">AIMAN Copilot</dt>
                      <dd className="tabular-nums">{formatIdr(quote.seat.aiIdr)}/bln</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">Periode</dt>
                    <dd>{interval === 'yearly' ? 'Tahunan' : 'Bulanan'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">Harga</dt>
                    <dd className="tabular-nums">{formatIdr(quote.listPriceIdr)}</dd>
                  </div>
                  {quote.discountIdr > 0 && (
                    <div className="flex justify-between gap-4 text-emerald-700">
                      <dt>Voucher {quote.voucherCode}</dt>
                      <dd className="tabular-nums">−{formatIdr(quote.discountIdr)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">DPP</dt>
                    <dd className="tabular-nums">{formatIdr(quote.money.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[color:var(--hf-ink-muted)]">PPN {quote.money.taxRate}%</dt>
                    <dd className="tabular-nums">{formatIdr(quote.money.tax)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[var(--hf-border)] pt-2 text-base font-semibold">
                    <dt>Total bayar</dt>
                    <dd className="tabular-nums">{formatIdr(quote.payableIdr)}</dd>
                  </div>
                </dl>
                {quote.change && (
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">
                    Kuota saat ini: {quote.change.seats.employees} karyawan / {quote.change.seats.users} user
                    {' · '}batas paket {quote.change.targetMaxEmployees.toLocaleString('id-ID')} karyawan
                  </p>
                )}
                {quote.warnings.map((w) => (
                  <p key={w} className="text-xs text-amber-800">{w}</p>
                ))}
                <label className="flex items-start gap-2 text-sm text-[color:var(--hf-ink-secondary)]">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-1"
                  />
                  Saya membeli {quote.planName} untuk {(quote.seat?.seats || seats).toLocaleString('id-ID')} user
                  {quote.seat?.addons.ats ? ' + ATS' : ''}
                  {quote.seat?.addons.talentBank ? ' + Bank Data' : ''}
                  {quote.seat?.addons.lms ? ' + LMS' : ''}
                  {quote.seat?.addons.ai ? ' + AIMAN' : ''}
                  {' '}({interval === 'yearly' ? 'tahunan' : 'bulanan'}) dan setuju membayar {formatIdr(quote.payableIdr)} via Midtrans.
                </label>
              </>
            ) : null}
          </div>
          <div className="hf-card space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
              <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Pembayaran</p>
            </div>
            <p className="text-sm text-[color:var(--hf-ink-muted)]">
              {midtransConfigured
                ? `Midtrans Snap ${midtrans?.isProduction ? 'Live' : 'Sandbox'} — QRIS, VA, e-wallet, kartu.`
                : 'Gateway belum aktif. Hubungi admin untuk aktivasi Midtrans.'}
            </p>
            {Array.isArray(midtrans?.methods) && (
              <p className="flex flex-wrap gap-1">
                {midtrans.methods.map((m: any) => (
                  <span key={m.id} className="rounded-md border border-[var(--hf-border)] px-1.5 py-0.5 text-[11px] text-[color:var(--hf-ink-muted)]">
                    {m.label}
                  </span>
                ))}
              </p>
            )}
            {customerEmail ? (
              <p className="text-xs text-[color:var(--hf-ink-faint)]">Kwitansi ke {customerEmail}</p>
            ) : (
              <p className="text-xs text-rose-700">Email akun tidak ada — lengkapi profil sebelum bayar.</p>
            )}
          </div>
        </div>
      )}

      {stepErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-[var(--hf-radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="space-y-1">
            {stepErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        {step < 3 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={goNext}
            className="hf-btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            {step === 1 ? 'Lanjut isi jumlah user' : 'Lanjut ke pembayaran'}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!!acting || quoting || !agree || (!quote?.canCheckout && !quote?.canDowngrade)}
            onClick={async () => {
              await pay();
            }}
            className="hf-btn-primary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
          >
            {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {quote?.canDowngrade
              ? 'Turunkan paket'
              : quote?.isRenewal
                ? 'Perpanjang & bayar'
                : 'Bayar sekarang'}
          </button>
        )}
      </div>
    </section>
  );
}
