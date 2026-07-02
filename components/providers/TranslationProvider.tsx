import React, { useState, useEffect, useCallback } from 'react';
import {
  TranslationContext, Language, Currency, translateText,
  detectLanguage, saveLanguage, detectCurrency, saveCurrency,
  defaultCurrencyForLang, formatCurrencyValue, formatDateValue
} from '@/lib/i18n';

interface TranslationProviderProps {
  children: React.ReactNode;
  translations: Record<Language, Record<string, any>>;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children, translations }) => {
  const [language, setLanguageState] = useState<Language>('id');
  const [currency, setCurrencyState] = useState<Currency>('IDR');

  useEffect(() => {
    const detectedLang = detectLanguage();
    setLanguageState(detectedLang);
    const detectedCurrency = detectCurrency();
    setCurrencyState(detectedCurrency);

    // Listen for language changes from other TranslationProvider instances
    const handleLangSync = (e: Event) => {
      const lang = (e as CustomEvent).detail as Language;
      setLanguageState(lang);
      const newCurrency = defaultCurrencyForLang[lang];
      setCurrencyState(newCurrency);
    };
    window.addEventListener('bedagang-language-change', handleLangSync);
    return () => window.removeEventListener('bedagang-language-change', handleLangSync);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
    // Auto-switch currency when language changes
    const newCurrency = defaultCurrencyForLang[lang];
    setCurrencyState(newCurrency);
    saveCurrency(newCurrency);
    // Broadcast to all TranslationProvider instances (for nested providers)
    window.dispatchEvent(new CustomEvent('bedagang-language-change', { detail: lang }));
  }, []);

  const setCurrency = useCallback((cur: Currency) => {
    setCurrencyState(cur);
    saveCurrency(cur);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const current = translations[language] || translations['id'];
    const fallback = translations['id'];
    return translateText(current, key, params, fallback);
  }, [language, translations]);

  const formatCurrency = useCallback((amount: number) => {
    return formatCurrencyValue(amount, currency);
  }, [currency]);

  const formatDate = useCallback((date: string | Date, style?: 'short' | 'long' | 'datetime') => {
    return formatDateValue(date, language, style);
  }, [language]);

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, currency, setCurrency, formatCurrency, formatDate }}>
      {children}
    </TranslationContext.Provider>
  );
};

export default TranslationProvider;
