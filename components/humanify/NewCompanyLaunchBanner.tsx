import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowRight, Building2, X } from 'lucide-react';
import { POST_LAUNCH_ACTIONS } from '@/lib/saas/company-onboarding-flow';

type Props = {
  companyName?: string | null;
};

/**
 * One-shot banner after Go Live / new company — tells the user what to do next.
 */
export default function NewCompanyLaunchBanner({ companyName }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const isNewCompany = router.query.onboard === 'new-company';

  useEffect(() => {
    if (!router.isReady) return;
    const flag = router.query.onboard;
    if (flag === 'new-company' || flag === '1') {
      setVisible(true);
    }
  }, [router.isReady, router.query.onboard]);

  const dismiss = () => {
    setVisible(false);
    const rest = { ...router.query };
    delete rest.onboard;
    void router.replace({ pathname: '/humanify', query: rest }, undefined, { shallow: true });
  };

  if (!visible) return null;

  const name = companyName?.trim();

  return (
    <div className="hf-card relative overflow-hidden">
      <span className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-[var(--hf-brand-500)]" aria-hidden />
      <div className="flex items-start gap-3 px-5 py-4 pl-6">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] ring-1 ring-[var(--hf-brand-100)]">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[color:var(--hf-ink)]">
            {isNewCompany && name
              ? `${name} sudah aktif`
              : name
                ? `Workspace ${name} siap dipakai`
                : 'Workspace siap dipakai'}
          </p>
          <p className="mt-1 text-sm leading-5 text-[color:var(--hf-ink-muted)]">
            {isNewCompany
              ? 'Payroll, karyawan, dan absensi perusahaan ini terisolasi dari perusahaan lain di akun Anda. Lanjutkan operasional di bawah — checklist di samping kanan mengikuti progres ini.'
              : 'Lanjutkan operasional HR. Checklist hari pertama di samping kanan menandai apa yang sudah selesai.'}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {POST_LAUNCH_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2.5 transition-colors hover:border-[var(--hf-brand-100)] hover:bg-[var(--hf-brand-50)]"
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-[color:var(--hf-ink)]">
                  {action.title}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--hf-ink-faint)] group-hover:text-[color:var(--hf-brand-600)]" />
                </span>
                <span className="mt-0.5 block text-xs text-[color:var(--hf-ink-muted)]">{action.hint}</span>
              </Link>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="-mr-1 -mt-1 rounded-lg p-2 text-[color:var(--hf-ink-faint)] hover:bg-[var(--hf-surface-muted)] hover:text-[color:var(--hf-ink)]"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
