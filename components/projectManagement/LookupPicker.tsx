import React, { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronDown, Circle } from 'lucide-react';

export interface LookupOption {
  id: string;
  name: string;
  code?: string;
  subtitle?: string;
}

interface Props {
  value?: string | null;
  nameValue?: string | null;
  onChange: (selected: LookupOption | null) => void;
  placeholder?: string;
  action: 'customers' | 'branches' | 'fleet-vehicles' | 'inventory-items' | 'purchase-orders';
  mapOption?: (raw: any) => LookupOption;
  icon?: React.ElementType;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  emptyHint?: string;
}

const DEFAULT_MAPPERS: Record<string, (r: any) => LookupOption> = {
  customers: (r) => ({ id: r.id, name: r.name, code: r.code, subtitle: r.company_name || r.email }),
  branches: (r) => ({ id: r.id, name: r.name, code: r.code }),
  'fleet-vehicles': (r) => ({ id: r.id, name: r.license_plate, subtitle: r.vehicle_type }),
  'inventory-items': (r) => ({ id: r.id, name: r.name, code: r.sku, subtitle: r.category }),
  'purchase-orders': (r) => ({ id: r.id, name: r.po_number, subtitle: `${r.supplier_name} · ${r.status}` }),
};

export default function LookupPicker({
  value, nameValue, onChange, placeholder = 'Pilih…',
  action, mapOption, icon: Icon = Circle, disabled,
  className = '', required, emptyHint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [selected, setSelected] = useState<LookupOption | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mapper = mapOption || DEFAULT_MAPPERS[action] || ((r: any) => ({ id: r.id, name: r.name || r.id }));

  useEffect(() => {
    if (value && nameValue && (!selected || selected.id !== value)) setSelected({ id: value, name: nameValue });
    else if (!value && selected) setSelected(null);
  }, [value, nameValue]); // eslint-disable-line

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ action });
        if (query) params.set('search', query);
        const r = await fetch('/api/hq/project-management?' + params, { signal: ctrl.signal });
        const d = await r.json();
        if (d.success) setOptions((d.data || []).map(mapper));
      } catch (_) {} finally { setLoading(false); }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, query, action]); // eslint-disable-line

  const handleSelect = (opt: LookupOption) => { setSelected(opt); onChange(opt); setOpen(false); setQuery(''); };
  const handleClear = (e: React.MouseEvent) => { e.stopPropagation(); setSelected(null); onChange(null); };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        className={`w-full flex items-center justify-between gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selected ? (
            <>
              <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="truncate font-medium text-gray-800">{selected.name}</span>
              {selected.code && <span className="text-xs text-gray-400 hidden sm:inline">· {selected.code}</span>}
            </>
          ) : (
            <>
              <Icon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">{placeholder}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selected && !disabled && <button type="button" onClick={handleClear} className="p-0.5 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari..." className="w-full pl-8 pr-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && <div className="p-3 text-xs text-gray-400 text-center">Memuat…</div>}
            {!loading && options.length === 0 && <div className="p-4 text-xs text-gray-400 text-center">{emptyHint || 'Tidak ada data'}</div>}
            {!loading && options.map((opt) => (
              <button key={opt.id} type="button" onClick={() => handleSelect(opt)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0">
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{opt.name}</p>
                  {(opt.code || opt.subtitle) && (
                    <p className="text-xs text-gray-500 truncate">
                      {opt.code && <span className="font-mono">{opt.code}</span>}
                      {opt.code && opt.subtitle && <span> · </span>}
                      {opt.subtitle}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
