import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

/**
 * In-product 15-min sales demo checklist (Wave-55 / MKT-L1-1).
 * Mirrors docs/humanify-sales-demo-15min.md.
 */
const STEPS = [
  { n: 1, title: 'Login DEMO / superadmin', href: '/humanify/login', note: 'Gunakan tenant DEMO' },
  { n: 2, title: 'Dashboard Action Inbox', href: '/humanify', note: 'Tunjukkan cuti/kontrak pending' },
  { n: 3, title: 'Karyawan + seats', href: '/humanify/employees', note: 'CRUD singkat + kuota' },
  { n: 4, title: 'Absensi devices', href: '/humanify/attendance-devices', note: 'Sync path' },
  { n: 5, title: 'Cuti approve', href: '/humanify/leave', note: 'Inbox Menunggu saya' },
  { n: 6, title: 'Payroll main + preflight', href: '/humanify/payroll/main', note: 'Jangan hitung prod nyata di demo' },
  { n: 7, title: 'Employee portal', href: '/employee', note: 'ESS leave/payslip/attendance' },
  { n: 8, title: 'Platform control', href: '/platform', note: 'Tenants, MFA, partners' },
  { n: 9, title: 'ROI calculator', href: HUMANIFY_BRAND.roiCalculatorPath, note: 'Marketing close' },
  { n: 10, title: 'Partner channel', href: '/humanify/partners', note: 'Lead + status portal' },
];

export default function PlatformDemoChecklistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = ((session?.user as any)?.role || '').toLowerCase();
  const allowed = ['super_admin', 'superadmin', 'platform_admin', 'owner'].includes(role);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/humanify/login?callbackUrl=/platform/demo-checklist');
    } else if (status === 'authenticated' && !allowed) {
      router.replace('/humanify');
    }
  }, [status, allowed, router]);

  if (status === 'loading' || (status === 'authenticated' && !allowed)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat...
      </div>
    );
  }

  return (
    <HumanifyLayout title="Sales demo checklist" subtitle="15 menit guided walkthrough">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-slate-600">
          Ikuti urutan klik di bawah. Detail narasi:{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">docs/humanify-sales-demo-15min.md</code>
        </p>
        <ol className="bg-white border rounded-xl divide-y">
          {STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--hf-brand-100)] text-[color:var(--hf-brand-700)] text-xs font-bold">
                {s.n}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">{s.note}</p>
              </div>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline shrink-0"
              >
                Buka <ExternalLink className="w-3 h-3" />
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Partner status portal: /humanify/partners/status
        </p>
      </div>
    </HumanifyLayout>
  );
}
