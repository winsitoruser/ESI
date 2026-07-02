import { createContext, useContext } from 'react';

export type Language = 'id' | 'en' | 'ja';

export interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const TranslationContext = createContext<TranslationContextType | null>(null);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Translation function with parameter substitution
export const translateText = (
  translations: Record<string, any>,
  key: string,
  params?: Record<string, string | number>
): string => {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace parameters in the translation
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return value;
};

// Language detection
export const detectLanguage = (): Language => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('farmanesia-language');
    if (stored && ['id', 'en', 'ja'].includes(stored)) {
      return stored as Language;
    }
    
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) return 'en';
    if (browserLang.startsWith('ja')) return 'ja';
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
  ja: '日本語'
};

// Language flags/icons
export const languageFlags: Record<Language, string> = {
  id: '🇮🇩',
  en: '🇺🇸',
  ja: '🇯🇵'
};
