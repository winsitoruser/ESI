'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { NaincodeFooter } from '@/components/humanify/NaincodeFooter';
import { HUMANIFY_BRAND, HUMANIFY_MARKETING, NAINCODE } from '@/lib/humanify/branding';

export type MarketingNavLink = { label: string; href: string };

const DEFAULT_LINKS: MarketingNavLink[] = [
  { label: 'Kalkulator ROI', href: HUMANIFY_BRAND.roiCalculatorPath },
  { label: 'Blog', href: '/humanify/blog' },
  { label: 'Partner', href: HUMANIFY_BRAND.partnersPath },
  { label: 'Karir', href: '/careers' },
  { label: 'Naincode', href: NAINCODE.website },
];

/**
 * Shared chrome for Humanify marketing surfaces.
 * Light landing theme — matches Figma humanify.id welcome.
 */
export default function HumanifyMarketingShell({
  children,
  links = DEFAULT_LINKS,
  footerVariant = 'brand',
  showFooter = true,
}: {
  children: ReactNode;
  links?: MarketingNavLink[];
  /** @deprecated use brand; light = white footer, brand = #501f6b landing footer */
  footerVariant?: 'dark' | 'light' | 'brand';
  showFooter?: boolean;
}) {
  const footer = footerVariant === 'light' ? 'light' : 'brand';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#35393f]">
      <header className="sticky top-0 z-30 border-b border-[#eee9f1] bg-white/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-16 sm:px-8 lg:h-[72px] lg:px-12">
          <Link href={HUMANIFY_BRAND.welcomePath} className="relative h-8 w-28 shrink-0 sm:h-10 sm:w-36">
            <Image
              src={HUMANIFY_BRAND.marketingLogoPath}
              alt={HUMANIFY_BRAND.name}
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-1 text-sm lg:flex lg:gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center px-2 text-[#35393f] transition hover:text-[#592277]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={HUMANIFY_BRAND.loginPath}
              className="ml-1 inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#592277] px-4 font-medium text-[#592277] transition hover:bg-[#f6e6ff]"
            >
              Masuk
            </Link>
            <Link
              href={HUMANIFY_BRAND.signupPath}
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 font-medium text-white transition hover:opacity-95"
              style={{ background: HUMANIFY_MARKETING.brand }}
            >
              Daftar
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href={HUMANIFY_BRAND.signupPath}
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-3 text-sm font-medium text-white"
              style={{ background: HUMANIFY_MARKETING.brand }}
            >
              Daftar
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-[#eee9f1] text-[#35393f]"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#eee9f1] bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[#35393f] hover:bg-[#f6e6ff]"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href={HUMANIFY_BRAND.loginPath}
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#592277] px-4 text-sm font-medium text-[#592277]"
              >
                Masuk
              </Link>
              <Link
                href={HUMANIFY_BRAND.welcomePath}
                onClick={() => setMobileOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 text-sm text-[#656565] hover:text-[#592277]"
              >
                Beranda
              </Link>
            </nav>
          </div>
        )}
      </header>
      <main>{children}</main>
      {showFooter ? <NaincodeFooter variant={footer} /> : null}
    </div>
  );
}
