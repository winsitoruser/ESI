import React, { useState, useCallback, useRef, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  currency?: string;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  id?: string;
  name?: string;
}

/**
 * CurrencyInput - Auto-numeric formatting input for financial values.
 * 
 * Features:
 * - Auto-formats as user types: 1000000 → 1.000.000
 * - Uses Indonesian locale (dot as thousands separator)
 * - Prevents negative values by default
 * - Shows Rp prefix
 * - Validates min/max
 * - Returns raw numeric value via onChange
 */
export default function CurrencyInput({
  value,
  onChange,
  label,
  placeholder = '0',
  currency = 'Rp',
  min = 0,
  max,
  allowNegative = false,
  disabled = false,
  required = false,
  error,
  className = '',
  id,
  name,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number to Indonesian locale string
  const formatNumber = useCallback((num: number): string => {
    if (isNaN(num) || num === 0) return '';
    const isNeg = num < 0;
    const abs = Math.abs(num);
    // Handle decimals
    const parts = abs.toString().split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const decPart = parts[1] ? `,${parts[1].slice(0, 4)}` : '';
    return `${isNeg ? '-' : ''}${intPart}${decPart}`;
  }, []);

  // Parse formatted string back to number
  const parseFormatted = useCallback((str: string): number => {
    if (!str) return 0;
    // Remove dots (thousands sep), replace comma with dot (decimal sep)
    const cleaned = str.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }, []);

  // Sync external value → display
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value ? formatNumber(value) : '');
    }
  }, [value, isFocused, formatNumber]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Only allow digits, dots, commas, and optionally minus
    const allowed = allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g;
    let cleaned = raw.replace(allowed, '');

    // Prevent multiple commas
    const commaIdx = cleaned.indexOf(',');
    if (commaIdx !== -1) {
      cleaned = cleaned.slice(0, commaIdx + 1) + cleaned.slice(commaIdx + 1).replace(/,/g, '');
    }

    // Parse and reformat
    const numericValue = parseFormatted(cleaned);

    // Validate bounds
    if (!allowNegative && numericValue < 0) return;
    if (min !== undefined && numericValue < min) {
      setDisplayValue(formatNumber(min));
      onChange(min);
      return;
    }
    if (max !== undefined && numericValue > max) {
      setDisplayValue(formatNumber(max));
      onChange(max);
      return;
    }

    setDisplayValue(cleaned);
    onChange(numericValue);
  }, [allowNegative, min, max, onChange, parseFormatted, formatNumber]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number on focus for easy editing
    if (value) {
      setDisplayValue(formatNumber(value));
    }
  }, [value, formatNumber]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Reformat on blur
    const num = parseFormatted(displayValue);
    setDisplayValue(num ? formatNumber(num) : '');
    onChange(num);
  }, [displayValue, parseFormatted, formatNumber, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent minus if not allowed
    if (!allowNegative && e.key === '-') {
      e.preventDefault();
    }
    // Allow: backspace, delete, tab, escape, enter, arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    // Allow digits, comma, dot
    if (/[0-9,.]/.test(e.key)) return;
    // Allow minus at start if negative allowed
    if (allowNegative && e.key === '-' && (inputRef.current?.selectionStart === 0)) return;
    e.preventDefault();
  }, [allowNegative]);

  const hasError = !!error;
  const borderColor = hasError ? 'border-red-500' : isFocused ? 'border-blue-500' : 'border-gray-300';

  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`relative flex items-center border rounded-lg ${borderColor} ${disabled ? 'bg-gray-100' : 'bg-white'} transition-colors`}>
        <span className="pl-3 pr-1 text-gray-500 text-sm font-medium select-none">{currency}</span>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full py-2 pr-3 pl-1 text-right text-sm bg-transparent outline-none disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>
      {hasError && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
