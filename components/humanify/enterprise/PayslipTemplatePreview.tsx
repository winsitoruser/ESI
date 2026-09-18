/**
 * Live payslip paper preview + thumbnail gallery for Enterprise template studio.
 */
import {
  getPayslipLayout,
  PAYSLIP_LAYOUT_VARIANTS,
  SAMPLE_PAYSLIP_DATA,
  type PayslipLayoutId,
  type PayslipRenderData,
} from '@/lib/hris/payslip-templates';

function fmtRp(n: number) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
}

interface PreviewProps {
  layoutId?: string | null;
  data?: Partial<PayslipRenderData>;
  intro?: string;
  closing?: string;
  brandingLogo?: string;
  companyName?: string;
  companyAddress?: string;
}

export function PayslipPaperPreview({
  layoutId,
  data,
  intro,
  closing,
  brandingLogo,
  companyName,
  companyAddress,
}: PreviewProps) {
  const layout = getPayslipLayout(layoutId);
  const d: PayslipRenderData = {
    ...SAMPLE_PAYSLIP_DATA,
    ...data,
    companyName: companyName || data?.companyName || SAMPLE_PAYSLIP_DATA.companyName,
    companyAddress: companyAddress || data?.companyAddress || SAMPLE_PAYSLIP_DATA.companyAddress,
    logoUrl: brandingLogo || data?.logoUrl,
    intro: intro ?? data?.intro ?? SAMPLE_PAYSLIP_DATA.intro,
    closing: closing ?? data?.closing ?? SAMPLE_PAYSLIP_DATA.closing,
  };

  const logo = d.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={d.logoUrl} alt="" className="h-12 w-12 rounded-md object-contain" />
  ) : (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
      style={{ background: layout.accent }}
    >
      {(d.companyName || 'H').slice(0, 2).toUpperCase()}
    </div>
  );

  const meta = (
    <div
      className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg p-3 text-[11px]"
      style={{ background: layout.surface, color: layout.ink }}
    >
      {[
        ['Nama', d.employeeName],
        ['NIK / NIP', d.employeeCode],
        ['Jabatan', d.position],
        ['Departemen', d.department],
        ['Periode', d.period],
        ['Tgl bayar', d.payDate || '—'],
      ].map(([lbl, val]) => (
        <div key={lbl}>
          <span className="block text-[9px] uppercase tracking-wide" style={{ color: layout.muted }}>{lbl}</span>
          <strong>{val}</strong>
        </div>
      ))}
    </div>
  );

  const table = (title: string, items: { name: string; amount: number }[], total: number, head: string, neg = false) => (
    <table className="mb-2 w-full border-collapse text-[11px]">
      <thead>
        <tr style={{ background: head, color: '#fff' }}>
          <th className="px-2 py-1.5 text-left font-semibold">{title}</th>
          <th className="px-2 py-1.5 text-right font-semibold">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i.name} className="border-b border-slate-100">
            <td className="px-2 py-1.5">{i.name}</td>
            <td className="px-2 py-1.5 text-right tabular-nums">{neg ? '−' : ''}{fmtRp(i.amount)}</td>
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="px-2 py-1.5">Total</td>
          <td className="px-2 py-1.5 text-right tabular-nums">{neg ? '−' : ''}{fmtRp(total)}</td>
        </tr>
      </tbody>
    </table>
  );

  const thp = (
    <div
      className="mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-white"
      style={{ background: layout.accentDark }}
    >
      <span className="text-xs font-medium">Gaji bersih (Take Home Pay)</span>
      <strong className="text-lg tabular-nums">{fmtRp(d.netPay)}</strong>
    </div>
  );

  const header = (band = false, soft = false) => (
    <header
      className={`mb-3 flex items-start justify-between gap-3 ${
        band ? '-mx-5 -mt-5 mb-3 px-5 py-4 text-white' : soft ? '-mx-5 -mt-5 mb-3 px-5 py-3' : 'border-b-2 pb-3'
      }`}
      style={
        band
          ? { background: layout.accent }
          : soft
            ? { background: layout.surface, borderBottom: `2px solid ${layout.accent}` }
            : { borderColor: layout.accent }
      }
    >
      <div className="flex items-center gap-3">
        {logo}
        <div>
          <h1 className="m-0 text-[15px] font-bold" style={{ color: band ? '#fff' : layout.accent }}>{d.companyName}</h1>
          <p className="m-0 text-[10px]" style={{ color: band ? 'rgba(255,255,255,.85)' : layout.muted }}>{d.companyAddress}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="block text-xs font-bold uppercase tracking-wide" style={{ color: band ? '#fff' : layout.ink }}>Slip Gaji</span>
        <small style={{ color: band ? 'rgba(255,255,255,.8)' : layout.muted }}>{d.documentNumber || d.period}</small>
      </div>
    </header>
  );

  if (layout.structure === 'sidebar') {
    return (
      <div className="mx-auto max-w-[640px] overflow-hidden rounded bg-white shadow-md" style={{ color: layout.ink }}>
        <div className="grid min-h-[420px] grid-cols-[160px_1fr]">
          <aside className="p-4 text-white" style={{ background: layout.accent }}>
            {logo}
            <h1 className="mt-3 text-sm font-bold text-white">{d.companyName}</h1>
            <p className="mt-1 text-[10px] leading-snug opacity-90">{d.companyAddress}</p>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-wider opacity-90">Slip Gaji</p>
            <p className="text-[10px] opacity-80">{d.documentNumber}</p>
          </aside>
          <main className="p-5">
            <h2 className="mb-2 text-sm font-bold" style={{ color: layout.accent }}>Slip Gaji Karyawan</h2>
            {d.intro && <p className="mb-2 text-[11px] italic" style={{ color: layout.muted }}>{d.intro}</p>}
            {meta}
            <div className="grid grid-cols-2 gap-2">
              {table('Pendapatan', d.earnings, d.totalEarnings, layout.earnHead)}
              {table('Potongan', d.deductions, d.totalDeductions, layout.deductHead, true)}
            </div>
            {thp}
            {d.closing && <p className="mt-3 text-[11px] italic" style={{ color: layout.muted }}>{d.closing}</p>}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] rounded bg-white p-5 shadow-md" style={{ color: layout.ink }}>
      {layout.structure === 'thp-first' ? (
        <>
          {header(true)}
          {thp}
          {d.intro && <p className="mb-2 mt-3 text-[11px] italic" style={{ color: layout.muted }}>{d.intro}</p>}
          {meta}
          <div className="grid grid-cols-2 gap-2">
            {table('Pendapatan', d.earnings, d.totalEarnings, layout.earnHead)}
            {table('Potongan', d.deductions, d.totalDeductions, layout.deductHead, true)}
          </div>
        </>
      ) : layout.structure === 'stacked' ? (
        <>
          {header(false, false)}
          {d.intro && <p className="mb-2 text-[11px] italic" style={{ color: layout.muted }}>{d.intro}</p>}
          {meta}
          {table('Pendapatan', d.earnings, d.totalEarnings, layout.earnHead)}
          {table('Potongan', d.deductions, d.totalDeductions, layout.deductHead, true)}
          {thp}
        </>
      ) : (
        <>
          {header(layout.id === 'modern-blue', layout.id === 'emerald-clean')}
          {d.intro && <p className="mb-2 text-[11px] italic" style={{ color: layout.muted }}>{d.intro}</p>}
          {meta}
          <div className="grid grid-cols-2 gap-2">
            {table('Pendapatan', d.earnings, d.totalEarnings, layout.earnHead)}
            {table('Potongan', d.deductions, d.totalDeductions, layout.deductHead, true)}
          </div>
          {thp}
        </>
      )}
      {d.closing && <p className="mt-3 text-[11px] italic" style={{ color: layout.muted }}>{d.closing}</p>}
      <p className="mt-4 text-center text-[9px]" style={{ color: layout.muted }}>
        Dokumen rahasia · Dicetak elektronik · Sah tanpa tanda tangan basah
      </p>
    </div>
  );
}

interface PickerProps {
  value?: PayslipLayoutId | string;
  onChange: (id: PayslipLayoutId) => void;
}

/** Canva-like thumbnail gallery for layout selection */
export function PayslipLayoutPicker({ value, onChange }: PickerProps) {
  const selected = getPayslipLayout(value).id;
  return (
    <div>
      <p className="text-xs font-medium text-[color:var(--hf-ink)]">Pilih desain slip gaji</p>
      <p className="mt-0.5 text-[11px] text-[color:var(--hf-ink-muted)]">
        Varian layout seperti gallery template Canva — warna & struktur berbeda, data payroll tetap sama.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PAYSLIP_LAYOUT_VARIANTS.map((v) => {
          const active = selected === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              className={`group overflow-hidden rounded-[var(--hf-radius)] border text-left transition ${
                active
                  ? 'border-[var(--hf-brand-600)] ring-2 ring-[var(--hf-brand-600)]/30'
                  : 'border-[var(--hf-border)] hover:border-[var(--hf-brand-500)]'
              }`}
            >
              <PayslipThumb variantId={v.id} />
              <div className="border-t border-[var(--hf-border)] bg-white px-2 py-1.5">
                <p className="text-[11px] font-semibold text-[color:var(--hf-ink)]">{v.name}</p>
                <p className="truncate text-[10px] text-[color:var(--hf-ink-muted)]">{v.tag}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PayslipThumb({ variantId }: { variantId: PayslipLayoutId }) {
  const v = getPayslipLayout(variantId);
  if (v.structure === 'sidebar') {
    return (
      <div className="flex h-24 bg-white">
        <div className="w-7 shrink-0" style={{ background: v.accent }} />
        <div className="flex flex-1 flex-col gap-1 p-2">
          <div className="h-2 w-10 rounded" style={{ background: v.accent }} />
          <div className="h-6 rounded" style={{ background: v.surface }} />
          <div className="mt-auto flex gap-1">
            <div className="h-3 flex-1 rounded-sm" style={{ background: v.earnHead }} />
            <div className="h-3 flex-1 rounded-sm" style={{ background: v.deductHead }} />
          </div>
          <div className="h-2.5 rounded-sm" style={{ background: v.accentDark }} />
        </div>
      </div>
    );
  }
  if (v.structure === 'thp-first') {
    return (
      <div className="flex h-24 flex-col bg-white p-1.5">
        <div className="mb-1 h-5 rounded-sm" style={{ background: v.accent }} />
        <div className="mb-1 h-4 rounded-sm" style={{ background: v.accentDark }} />
        <div className="flex flex-1 gap-1">
          <div className="flex-1 rounded-sm" style={{ background: v.surface }} />
          <div className="flex-1 rounded-sm" style={{ background: v.surface }} />
        </div>
      </div>
    );
  }
  if (v.structure === 'stacked') {
    return (
      <div className="flex h-24 flex-col gap-1 bg-white p-2">
        <div className="h-2 w-full border-b border-slate-800" />
        <div className="h-5 border border-slate-300" />
        <div className="h-2.5 bg-slate-800" />
        <div className="h-2.5 bg-slate-800" />
        <div className="mt-auto h-3 bg-slate-900" />
      </div>
    );
  }
  // two-col
  return (
    <div className="flex h-24 flex-col bg-white p-1.5">
      <div
        className="mb-1 flex h-6 items-center rounded-sm px-1"
        style={{ background: variantId === 'modern-blue' ? v.accent : v.surface }}
      >
        <div
          className="h-2 w-8 rounded-sm"
          style={{ background: variantId === 'modern-blue' ? 'rgba(255,255,255,.7)' : v.accent }}
        />
      </div>
      <div className="mb-1 h-4 rounded-sm" style={{ background: v.surface }} />
      <div className="flex flex-1 gap-1">
        <div className="flex-1 overflow-hidden rounded-sm">
          <div className="h-2" style={{ background: v.earnHead }} />
          <div className="h-full" style={{ background: `${v.earnHead}22` }} />
        </div>
        <div className="flex-1 overflow-hidden rounded-sm">
          <div className="h-2" style={{ background: v.deductHead }} />
          <div className="h-full" style={{ background: `${v.deductHead}22` }} />
        </div>
      </div>
      <div className="mt-1 h-2.5 rounded-sm" style={{ background: v.accentDark }} />
    </div>
  );
}

export default PayslipPaperPreview;
