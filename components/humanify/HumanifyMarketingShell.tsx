import type { ReactNode } from 'react';
import Link from 'next/link';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';
import { HUMANIFY_BRAND, NAINCODE } from '@/lib/humanify/branding';

export type MarketingNavLink = { label: string; href: string };

const DEFAULT_LINKS: MarketingNavLink[] = [
  { label: 'ROI', href: HUMANIFY_BRAND.roiCalculatorPath },
  { label: 'Partner', href: HUMANIFY_BRAND.partnersPath },
  { label: 'Karir', href: '/humanify/careers' },
  { label: 'Naincode', href: NAINCODE.website },
];

/**
 * Shared chrome for Humanify marketing surfaces (UX-S2-2).
 * Dark surface — distinct from ops `.humanify-theme` (see DECISIONS D-HF-TWO-SURFACE).
 */
export default function HumanifyMarketingShell({
  children,
  links = DEFAULT_LINKS,
  footerVariant = 'dark',
  showFooter = true,
}: {
  children: ReactNode;
  links?: MarketingNavLink[];
  footerVariant?: 'dark' | 'light';
  showFooter?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#0a0812] text-white">
      <header className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-8 py-5 max-w-7xl mx-auto">
        <HumanifyLogo
          href={HUMANIFY_BRAND.welcomePath}
          size="md"
          variant="full"
          src={HUMANIFY_BRAND.welcomeLogoPath}
          aspect={HUMANIFY_BRAND.welcomeLogoAspect}
        />
        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-2 py-1 text-white/70 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={HUMANIFY_BRAND.signupPath}
            className="hidden sm:inline-flex px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium"
          >
            Daftar
          </Link>
          <Link
            href="/employee"
            className="hidden md:inline-flex px-3 py-1.5 text-white/70 hover:text-white"
          >
            Portal
          </Link>
          <Link
            href={HUMANIFY_BRAND.loginPath}
            className="inline-flex px-3 py-1.5 rounded-lg font-medium"
            style={{ background: 'var(--hf-brand-600, #6d28d9)' }}
          >
            Masuk
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      {showFooter ? <NaincodeFooter variant={footerVariant} /> : null}
    </div>
  );
}
