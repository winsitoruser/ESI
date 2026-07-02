/**
 * Universal Document Export Button
 * Drop-in component for any HQ module to add export/print/download capabilities
 * 
 * Usage:
 *   <DocumentExportButton
 *     documentType="invoice"
 *     data={{ items: [...], total: 1000000, customerName: 'PT ABC' }}
 *     meta={{ documentNumber: 'INV-001', documentDate: '2026-03-04' }}
 *     label="Export Invoice"
 *   />
 */

import React, { useState, useRef } from 'react';
import { Download, FileText, FileSpreadsheet, Printer, ChevronDown, File, Loader2, X, Check } from 'lucide-react';
import { DocumentType, DocumentFormat, DocumentMeta, DocumentConfig, getDocumentConfig } from '@/lib/documents/types';

interface DocumentExportButtonProps {
  documentType: DocumentType;
  data: any;
  meta?: Partial<DocumentMeta>;
  options?: any;
  label?: string;
  variant?: 'button' | 'icon' | 'dropdown' | 'menu-item';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: (filename: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  showFormats?: DocumentFormat[];
}

const FORMAT_CONFIG: Record<DocumentFormat, { icon: any; label: string; color: string }> = {
  pdf: { icon: FileText, label: 'PDF', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
  excel: { icon: FileSpreadsheet, label: 'Excel', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
  csv: { icon: File, label: 'CSV', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
  html: { icon: Printer, label: 'Print', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
  docx: { icon: FileText, label: 'Word', color: 'text-blue-700 bg-blue-50 hover:bg-blue-100' },
};

export default function DocumentExportButton({
  documentType,
  data,
  meta = {},
  options = {},
  label,
  variant = 'dropdown',
  size = 'md',
  className = '',
  onSuccess,
  onError,
  disabled = false,
  showFormats,
}: DocumentExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<DocumentFormat | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const config = getDocumentConfig(documentType);
  const formats = showFormats || config?.formats || ['pdf'];

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = async (format: DocumentFormat) => {
    setLoading(format);
    setIsOpen(false);

    try {
      if (format === 'html') {
        // For HTML/Print: open in new window
        const response = await fetch('/api/hq/documents?action=preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: documentType, data, meta, options }),
        });

        if (!response.ok) throw new Error('Gagal generate preview');
        const html = await response.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
        showToast('Print preview dibuka', 'success');
        onSuccess?.('print-preview');
      } else {
        // For PDF/Excel/CSV: download file
        const response = await fetch('/api/hq/documents?action=generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: documentType, format, data, meta, options }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error?.message || 'Gagal generate dokumen');
        }

        const blob = await response.blob();
        const filename = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] 
          || `${documentType}_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`${FORMAT_CONFIG[format].label} berhasil diunduh`, 'success');
        onSuccess?.(filename);
      }
    } catch (error: any) {
      const msg = error.message || 'Gagal export dokumen';
      showToast(msg, 'error');
      onError?.(msg);
    }

    setLoading(null);
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2',
  };

  const isLoading = loading !== null;

  // ── VARIANT: Single icon button ──
  if (variant === 'icon') {
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => formats.length === 1 ? handleExport(formats[0]) : setIsOpen(!isOpen)}
          disabled={disabled || isLoading}
          className={`p-1.5 hover:bg-gray-100 rounded transition-colors ${isLoading ? 'opacity-50' : ''} ${className}`}
          title={label || config?.titleId || 'Export'}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-gray-500" />}
        </button>
        {isOpen && formats.length > 1 && renderDropdown(formats)}
        {toast && renderToast()}
      </div>
    );
  }

  // ── VARIANT: Menu item (for within dropdown menus) ──
  if (variant === 'menu-item') {
    return (
      <>
        {formats.map(format => {
          const fConfig = FORMAT_CONFIG[format];
          const Icon = fConfig.icon;
          return (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={disabled || isLoading}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${isLoading && loading === format ? 'opacity-50' : ''}`}
            >
              {loading === format ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              {label ? `${label} (${fConfig.label})` : `Export ${fConfig.label}`}
            </button>
          );
        })}
        {toast && renderToast()}
      </>
    );
  }

  // ── VARIANT: Full button ──
  if (variant === 'button') {
    return (
      <div className="flex gap-2">
        {formats.map(format => {
          const fConfig = FORMAT_CONFIG[format];
          const Icon = fConfig.icon;
          return (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={disabled || isLoading}
              className={`flex items-center ${sizeClasses[size]} rounded-lg border transition-all ${fConfig.color} ${isLoading && loading === format ? 'opacity-50' : ''} ${className}`}
            >
              {loading === format ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              {fConfig.label}
            </button>
          );
        })}
        {toast && renderToast()}
      </div>
    );
  }

  // ── VARIANT: Dropdown (default) ──
  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`flex items-center ${sizeClasses[size]} rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-all ${isLoading ? 'opacity-50' : ''} ${className}`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span>{label || 'Export'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && renderDropdown(formats)}
      {toast && renderToast()}
    </div>
  );

  function renderDropdown(fmts: DocumentFormat[]) {
    return (
      <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b mb-1">
          {config?.titleId || documentType}
        </div>
        {fmts.map(format => {
          const fConfig = FORMAT_CONFIG[format];
          const Icon = fConfig.icon;
          return (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4" />
              <span>{format === 'html' ? 'Cetak / Print' : `Download ${fConfig.label}`}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderToast() {
    if (!toast) return null;
    return (
      <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
        {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
        {toast.msg}
      </div>
    );
  }
}

/**
 * Batch Export Button - Export multiple document types at once
 */
export function BatchExportButton({ 
  documents, 
  className = '' 
}: { 
  documents: { type: DocumentType; data: any; meta?: Partial<DocumentMeta> }[]; 
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleBatchExport = async () => {
    setLoading(true);
    for (const doc of documents) {
      try {
        const response = await fetch('/api/hq/documents?action=generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: doc.type, format: 'pdf', data: doc.data, meta: doc.meta }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const filename = response.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || `${doc.type}.pdf`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } catch (e) { console.error(`Failed to export ${doc.type}:`, e); }
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleBatchExport}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Export Semua ({documents.length} dokumen)
    </button>
  );
}
