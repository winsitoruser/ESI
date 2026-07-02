import { formatCurrencyValue, formatDateValue, localeMap, Currency, Language } from '@/lib/i18n';

export const makeFmtCur = (currency: Currency) => (n: number) => formatCurrencyValue(n || 0, currency);
export const makeFmtDate = (language: Language) => (d: string) => d ? formatDateValue(d, language, 'short') : '-';
export const makeFmt = (language: Language) => (n: number) => new Intl.NumberFormat(localeMap[language]).format(n || 0);
