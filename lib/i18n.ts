import { createContext, useContext } from 'react';

export type Language = 'id' | 'en' | 'ja' | 'zh';
export type Currency = 'IDR' | 'USD' | 'JPY' | 'CNY';

export interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date, style?: 'short' | 'long' | 'datetime') => string;
}

export const TranslationContext = createContext<TranslationContextType | null>(null);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Translation function with parameter substitution and optional fallback locale
export const translateText = (
  translations: Record<string, any>,
  key: string,
  params?: Record<string, string | number>,
  fallbackTranslations?: Record<string, any>
): string => {
  const lookup = (dict: Record<string, any> | undefined): string | null => {
    if (!dict) return null;
    const keys = key.split('.');
    let value: any = dict;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    return typeof value === 'string' ? value : null;
  };

  let resolved = lookup(translations);
  if (resolved === null && fallbackTranslations) {
    resolved = lookup(fallbackTranslations);
  }
  if (resolved === null) {
    return key;
  }

  if (params) {
    return resolved.replace(/\{\{(\w+)\}\}/g, (_match: string, paramKey: string) => {
      return params[paramKey]?.toString() || _match;
    });
  }

  return resolved;
};

// Language detection
export const detectLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('farmanesia-language');
    if (stored && ['id', 'en', 'ja', 'zh'].includes(stored)) {
      return stored as Language;
    }
    
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('zh')) return 'zh';
  }
  
  return 'id'; // Default to Indonesian
};

// Language storage
export const saveLanguage = (language: Language) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('farmanesia-language', language);
  }
};

// Language names for display
export const languageNames: Record<Language, string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
  ja: '日本語',
  zh: '中文'
};

// Language flags/icons
export const languageFlags: Record<Language, string> = {
  id: '🇮🇩',
  en: '🇺🇸',
  ja: '🇯🇵',
  zh: '🇨🇳'
};

// Currency config
export const currencySymbols: Record<Currency, string> = {
  IDR: 'Rp',
  USD: '$',
  JPY: '¥',
  CNY: '¥',
};

export const currencyNames: Record<Currency, string> = {
  IDR: 'Indonesian Rupiah',
  USD: 'US Dollar',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
};

export const currencyFlags: Record<Currency, string> = {
  IDR: '🇮🇩',
  USD: '🇺🇸',
  JPY: '🇯🇵',
  CNY: '🇨🇳',
};

export const defaultCurrencyForLang: Record<Language, Currency> = {
  id: 'IDR',
  en: 'USD',
  ja: 'JPY',
  zh: 'CNY',
};

// Approximate exchange rates from IDR
export const exchangeRatesFromIDR: Record<Currency, number> = {
  IDR: 1,
  USD: 0.0000625,   // 1 IDR ≈ 0.0000625 USD (1 USD ≈ 16,000 IDR)
  JPY: 0.009375,    // 1 IDR ≈ 0.009375 JPY (1 JPY ≈ 106.67 IDR → 1 USD ≈ 150 JPY)
  CNY: 0.000455,    // 1 IDR ≈ 0.000455 CNY (1 CNY ≈ 2,200 IDR)
};

export const detectCurrency = (): Currency => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('farmanesia-currency');
    if (stored && ['IDR', 'USD', 'JPY', 'CNY'].includes(stored)) {
      return stored as Currency;
    }
  }
  return 'IDR';
};

export const saveCurrency = (currency: Currency) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('farmanesia-currency', currency);
  }
};

// Locale mapping for date/number formatting
export const localeMap: Record<Language, string> = {
  id: 'id-ID',
  en: 'en-US',
  ja: 'ja-JP',
  zh: 'zh-CN',
};

export const formatDateValue = (
  date: string | Date,
  language: Language,
  style: 'short' | 'long' | 'datetime' = 'short'
): string => {
  const locale = localeMap[language];
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  switch (style) {
    case 'long':
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    case 'datetime':
      return d.toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    case 'short':
    default:
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }
};

export const formatCurrencyValue = (amount: number, currency: Currency): string => {
  const converted = amount * exchangeRatesFromIDR[currency];
  const symbol = currencySymbols[currency];

  switch (currency) {
    case 'IDR': {
      if (converted >= 1e9) return `${symbol} ${(converted / 1e9).toFixed(1)}M`;
      if (converted >= 1e6) return `${symbol} ${(converted / 1e6).toFixed(1)}Jt`;
      return `${symbol} ${converted.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
    }
    case 'USD': {
      if (converted >= 1e6) return `${symbol}${(converted / 1e6).toFixed(2)}M`;
      if (converted >= 1e3) return `${symbol}${(converted / 1e3).toFixed(1)}K`;
      return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case 'JPY': {
      if (converted >= 1e8) return `${symbol}${(converted / 1e8).toFixed(1)}億`;
      if (converted >= 1e4) return `${symbol}${(converted / 1e4).toFixed(1)}万`;
      return `${symbol}${converted.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
    }
    case 'CNY': {
      if (converted >= 1e8) return `${symbol}${(converted / 1e8).toFixed(1)}亿`;
      if (converted >= 1e4) return `${symbol}${(converted / 1e4).toFixed(1)}万`;
      return `${symbol}${converted.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    default:
      return `${symbol}${converted.toLocaleString()}`;
  }
};
