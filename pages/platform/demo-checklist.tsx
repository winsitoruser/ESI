import Link from 'next/link';
import OpsLayout from '@/components/humanify/OpsLayout';
import { OpsPageIntro, OpsPageSkeleton, OpsPanel } from '@/components/humanify/ops-ui';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { getApexOrigin } from '@/lib/humanify/ops-host';
import { usePlatformOperator } from '@/lib/humanify/use-platform-operator';

/**
 * In-product 15-min sales demo checklist (Wave-55 / MKT-L1-1).
 * Links open the tenant app on humanify.id — not served from ops host.
 */
const APEX = 'https://humanify.id';

const STEPS = [
  { n: 1, title: 'Login DEMO / superadmin', href: `${APEX}/humanify/login`, note: 'Tenant DEMO di humanify.id', external: true },
  { n: 2, title: 'Dashboard Action Inbox', href: `${APEX}/humanify`, note: 'Tunjukkan cuti/kontrak pending', external: true },
  { n: 3, title: 'Karyawan + seats', href: `${APEX}/humanify/employees`, note: 'CRUD singkat + kuota', external: true },
  { n: 4, title: 'Absensi devices', href: `${APEX}/humanify/attendance-devices`, note: 'Sync path', external: true },
  { n: 5, title: 'Cuti approve', href: `${APEX}/humanify/leave`, note: 'Inbox Menunggu saya', external: true },
  { n: 6, title: 'Payroll main + preflight', href: `${APEX}/humanify/payroll/main`, note: 'Jangan hitung prod nyata di demo', external: true },
  { n: 7, title: 'Employee portal', href: `${APEX}/employee`, note: 'ESS leave/payslip/attendance', external: true },
  { n: 8, title: 'Platform control', href: '/platform', note: 'Tenants, MFA, partners (ops)', external: false },
  { n: 9, title: 'ROI calculator', href: `${APEX}/humanify/pricing/roi-calculator`, note: 'Marketing close', external: true },
  { n: 10, title: 'Partner channel', href: `${APEX}/humanify/partners`, note: 'Lead + status portal', external: true },
];

export default function PlatformDemoChecklistPage() {
  const { gating } = usePlatformOperator('/platform/demo-checklist');

  if (gating) {
    return (
      <OpsLayout title="Sales demo checklist" subtitle="15 menit guided walkthrough">
        <OpsPageSkeleton variant="detail" />
      </OpsLayout>
    );
  }

  return (
    <OpsLayout title="Sales demo checklist" subtitle="15 menit guided walkthrough">
      <div className="w-full space-y-4">
        <OpsPageIntro
          eyebrow="Sales"
          title="Demo checklist"
          description="Langkah di bawah membuka humanify.id (portal tenant) di tab baru. Admin Total hanya untuk control plane."
        />
        <OpsPanel title="15 menit walkthrough" description="Ikuti urutan untuk pitch yang konsisten.">
          <ol className="divide-y divide-slate-100 -my-1">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold ring-1 ring-inset ring-emerald-100">
                  {s.n}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.note}</p>
                </div>
                {s.external ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline shrink-0"
                  >
                    Buka <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <Link
                    href={s.href}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline shrink-0"
                  >
                    Buka
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </OpsPanel>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Partner status:{' '}
          <a href={`${getApexOrigin()}/humanify/partners/status`} className="underline" target="_blank" rel="noreferrer">
            humanify.id/humanify/partners/status
          </a>
        </p>
      </div>
    </OpsLayout>
  );
}
