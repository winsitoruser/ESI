import '../styles/global.scss';
import '../styles/marquee.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { BusinessTypeProvider } from '@/contexts/BusinessTypeContext';
import { FinancePeriodProvider } from '@/contexts/FinancePeriodContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { TranslationProvider } from '@/components/providers/TranslationProvider';
import { appTranslations } from '@/lib/translations/app';
import { websiteBuilderTranslations } from '@/lib/translations/website-builder';
import { hqTranslations } from '@/lib/translations/hq';
import { modulePageTranslations } from '@/lib/translations/hq-module-pages';
import { moduleDetailTranslations } from '@/lib/translations/hq-module-detail';
import { moduleArticleTranslations } from '@/lib/translations/hq-module-articles';
import { extendedTranslations } from '@/lib/translations/hq-extended';
import { pjmTranslations } from '@/lib/translations/hq-pjm';
import { fleetHubTranslations } from '@/lib/translations/hq-fleet-hub';
import { sfaSalesMgmtHqTranslations } from '@/lib/translations/hq-sfa-sales-mgmt';
import { Language } from '@/lib/i18n';

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Merge order matters: later sources override earlier ones for colliding keys.
// We keep app + website-builder as the base, then layer HQ dictionaries on top,
// so `useTranslation()` anywhere in the tree sees every namespace
// (app.*, wb.*, sidebar.*, layout.*, home.*, md.*, mp.*, finance.*, etc.).
const ALL_SOURCES: Array<Record<Language, Record<string, any>> | Record<string, Record<string, any>>> = [
  appTranslations,
  websiteBuilderTranslations,
  hqTranslations,
  modulePageTranslations,
  moduleDetailTranslations,
  moduleArticleTranslations,
  extendedTranslations,
  pjmTranslations,
  fleetHubTranslations,
  sfaSalesMgmtHqTranslations,
];

function mergeAll(lang: Language): Record<string, any> {
  return ALL_SOURCES.reduce<Record<string, any>>((acc, src) => {
    const dict = (src as any)[lang] || {};
    return deepMerge(acc, dict);
  }, {});
}

const mergedTranslations: Record<Language, Record<string, any>> = {
  id: mergeAll('id'),
  en: mergeAll('en'),
  ja: mergeAll('ja'),
  zh: mergeAll('zh'),
};

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <PermissionProvider>
        <TranslationProvider translations={mergedTranslations}>
          <BusinessTypeProvider>
            <FinancePeriodProvider>
              <Component {...pageProps} />
              <Toaster />
            </FinancePeriodProvider>
          </BusinessTypeProvider>
        </TranslationProvider>
      </PermissionProvider>
    </SessionProvider>
  );
}

export default MyApp;
