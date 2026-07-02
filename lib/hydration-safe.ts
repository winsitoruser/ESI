/**
 * Safe client-side utilities for Next.js Pages Router
 * Prevents hydration mismatches and FOUC
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Language, Currency } from './i18n';

/**
 * Hook to detect if component is mounted on client
 * Use this instead of raw `mounted` state with `if (!mounted) return null;`
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

/**
 * Hook to safely read/write localStorage with SSR support
 * Returns default value on server, updates from localStorage on client
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsInitialized(true);
  }, [key]);

  // Set value
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Dispatch event for cross-component sync
          window.dispatchEvent(
            new CustomEvent('localStorage-change', { detail: { key, value: valueToStore } })
          );
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * Safe time formatter that avoids hydration mismatches
 * Use this instead of formatTimeAgo that uses Date.now()
 */
export function useSafeTimeAgo(dateStr: string): { text: string; isStale: boolean } {
  const isMounted = useIsMounted();
  const [text, setText] = useState<string>('');
  const formatRef = useRef<(date: Date, now: Date) => string>();

  // Initialize format function
  useEffect(() => {
    formatRef.current = (date: Date, now: Date): string => {
      const diff = now.getTime() - date.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      const weeks = Math.floor(days / 7);
      if (weeks < 4) return `${weeks}w ago`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };
  }, []);

  // Update text on mount and periodically
  useEffect(() => {
    if (!formatRef.current) return;

    const update = () => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        setText('-');
        return;
      }
      setText(formatRef.current(date, new Date()));
    };

    update();

    // Update every minute for freshness
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [dateStr]);

  return {
    text,
    isStale: !isMounted && text === '',
  };
}

/**
 * Hook to safely get language with SSR fallback
 * Returns default on server, updates from localStorage on client
 */
export function useSafeLanguage(defaultLang: Language = 'id'): [Language, (lang: Language) => void] {
  const [language, setLanguage] = useLocalStorage<Language>('farmanesia-language', defaultLang);

  const safeSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    // Also save using existing saveLanguage for compatibility
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('farmanesia-language', lang);
      window.dispatchEvent(
        new CustomEvent('bedagang-language-change', { detail: lang })
      );
    }
  }, [setLanguage]);

  return [language, safeSetLanguage];
}

/**
 * Hook to safely get currency with SSR fallback
 */
export function useSafeCurrency(defaultCur: Currency = 'IDR'): [Currency, (cur: Currency) => void] {
  return useLocalStorage<Currency>('farmanesia-currency', defaultCur);
}

/**
 * Utility to wrap elements that may have hydration mismatches
 * Use as a prop: <div suppressHydrationWarning>...</div>
 */
export const suppressHydration = true;
