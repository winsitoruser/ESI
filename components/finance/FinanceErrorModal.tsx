import React from 'react';

interface FinanceErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  details?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * FinanceErrorModal - Modal dialog for critical finance errors.
 * 
 * Use this instead of toast notifications for:
 * - "Saldo tidak cukup" (insufficient balance)
 * - "Invoice sudah lunas" (already paid)
 * - "Budget terlampaui" (budget exceeded)
 * - Payment failures
 * - Validation errors on financial amounts
 */
export default function FinanceErrorModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'error',
  details,
  actionLabel,
  onAction,
}: FinanceErrorModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    error: (
      <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100">
        <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
    ),
    warning: (
      <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100">
        <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
    ),
    info: (
      <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-100">
        <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </div>
    ),
  };

  const titleMap = {
    error: title || 'Terjadi Kesalahan',
    warning: title || 'Peringatan',
    info: title || 'Informasi',
  };

  const buttonColorMap = {
    error: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Icon */}
          {iconMap[type]}

          {/* Title */}
          <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">
            {titleMap[type]}
          </h3>

          {/* Message */}
          <p className="mt-2 text-center text-sm text-gray-600">
            {message}
          </p>

          {/* Details (collapsible) */}
          {details && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-mono break-all">{details}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {onAction && actionLabel && (
              <button
                onClick={() => { onAction(); onClose(); }}
                className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColorMap[type]}`}
              >
                {actionLabel}
              </button>
            )}
            <button
              onClick={onClose}
              className={`${onAction ? 'flex-1' : 'w-full'} px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
            >
              {onAction ? 'Batal' : 'Tutup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
