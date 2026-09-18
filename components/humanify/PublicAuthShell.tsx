import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HUMANIFY_BRAND, HUMANIFY_MARKETING, NAINCODE } from '@/lib/humanify/branding';

/**
 * Shared chrome for public Humanify auth (forgot, join, verify, reset).
 * Light marketing theme — matches Figma landing (#592277).
 */
export default function PublicAuthShell({
  children,
}: {
  children: ReactNode;
  variant?: 'light' | 'dark';
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-white text-[#35393f]">
      <header className="flex items-center justify-between gap-3 border-b border-[#eee9f1] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:py-4">
        <Link href={HUMANIFY_BRAND.welcomePath} className="relative h-8 w-28 shrink-0 sm:h-10 sm:w-36">
          <Image
            src={HUMANIFY_BRAND.marketingLogoPath}
            alt={HUMANIFY_BRAND.name}
            fill
            className="object-contain object-left"
            priority
          />
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href={HUMANIFY_BRAND.welcomePath}
            className="hidden min-h-11 items-center text-[#656565] transition hover:text-[#592277] sm:inline-flex"
          >
            Beranda
          </Link>
          <Link
            href={HUMANIFY_BRAND.loginPath}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#592277] px-3 font-medium text-[#592277] transition hover:bg-[#f6e6ff] sm:px-4"
          >
            Masuk
          </Link>
          <Link
            href={HUMANIFY_BRAND.signupPath}
            className="inline-flex min-h-11 items-center justify-center rounded-[10px] px-3 font-medium text-white transition hover:opacity-95 sm:px-4"
            style={{ background: HUMANIFY_MARKETING.brand }}
          >
            Daftar
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start bg-[#faf8fc] px-4 py-8 sm:justify-center sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-[#eee9f1] px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs text-[#656565]">
        <div className="flex flex-col items-center gap-2 sm:block">
          <Link href={HUMANIFY_BRAND.welcomePath} className="font-medium text-[#592277] hover:underline">
            Pelajari {HUMANIFY_BRAND.name}
          </Link>
          <span className="mx-2 hidden sm:inline">·</span>
          <span>© {new Date().getFullYear()} {NAINCODE.legalName}</span>
        </div>
      </footer>
    </div>
  );
}
