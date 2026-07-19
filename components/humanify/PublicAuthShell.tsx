import type { ReactNode } from 'react';
import Link from 'next/link';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';

/**
 * Shared chrome for public Humanify auth surfaces (UX-S1-2).
 * Light: forgot / join / reset / verify. Dark: wraps login/signup page roots.
 */
export default function PublicAuthShell({
  children,
  variant = 'light',
}: {
  children: ReactNode;
  variant?: 'light' | 'dark';
}) {
  if (variant === 'dark') {
    return <div className="humanify-theme min-h-screen">{children}</div>;
  }

  return (
    <div
      className="humanify-theme flex min-h-screen flex-col"
      style={{ background: 'var(--hf-surface-muted)', color: 'var(--hf-ink)' }}
    >
      <header className="flex justify-center px-4 pt-10 pb-2">
        <HumanifyLogo className="h-10 w-auto" href={HUMANIFY_BRAND.welcomePath} />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10">{children}</main>
      <footer
        className="px-4 py-6 text-center text-xs"
        style={{ color: 'var(--hf-ink-muted)' }}
      >
        <Link href={HUMANIFY_BRAND.welcomePath} className="hover:underline" style={{ color: 'var(--hf-brand-600)' }}>
          Pelajari {HUMANIFY_BRAND.name}
        </Link>
        <span className="mx-2">·</span>
        © {new Date().getFullYear()} {NAINCODE.legalName}
      </footer>
    </div>
  );
}
