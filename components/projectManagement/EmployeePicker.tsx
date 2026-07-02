import React, { useEffect, useRef, useState } from 'react';
import { Search, User, X, ChevronDown } from 'lucide-react';

export interface EmployeeOption {
  id: string;
  name: string;
  employeeNumber?: string;
  email?: string;
  position?: string;
  department?: string;
  branchId?: string;
}

interface Props {
  value?: string | null;
  nameValue?: string | null;
  onChange: (selected: EmployeeOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  branchId?: string;
  department?: string;
  className?: string;
  required?: boolean;
}

/**
 * Employee picker - searches hris_employees live with debounce.
 * Returns an EmployeeOption with id + name + details for upsert.
 */
export default function EmployeePicker({
  value, nameValue, onChange, placeholder = 'Pilih karyawan…',
  disabled, branchId, department, className = '', required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [selected, setSelected] = useState<EmployeeOption | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from nameValue / value
  useEffect(() => {
    if (value && nameValue && (!selected || selected.id !== value)) {
      setSelected({ id: value, name: nameValue });
    } else if (!value && selected) {
      setSelected(null);
    }
  }, [value, nameValue]); // eslint-disable-line

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Fetch on open / query change
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ action: 'employees' });
        if (query) params.set('search', query);
        if (branchId) params.set('branchId', branchId);
        if (department) params.set('department', department);
        const r = await fetch('/api/hq/project-management?' + params, { signal: ctrl.signal });
        const d = await r.json();
        if (d.success) setOptions(d.data || []);
      } catch (_) { /* abort */ } finally { setLoading(false); }
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, query, branchId, department]);

  const handleSelect = (emp: EmployeeOption) => {
    setSelected(emp);
    onChange(emp);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(null);
    onChange(null);
  };

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
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {selected.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-medium text-gray-800">{selected.name}</span>
              {selected.position && <span className="text-xs text-gray-400 truncate hidden sm:inline">· {selected.position}</span>}
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">{placeholder}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && !disabled && (
            <button type="button" onClick={handleClear} className="p-0.5 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, NIK, email..."
                className="w-full pl-8 pr-2 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && <div className="p-3 text-xs text-gray-400 text-center">Memuat…</div>}
            {!loading && options.length === 0 && (
              <div className="p-4 text-xs text-gray-400 text-center">
                {query ? 'Karyawan tidak ditemukan' : 'Ketik untuk mencari karyawan'}
              </div>
            )}
            {!loading && options.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => handleSelect(emp)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{emp.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {emp.employeeNumber && <span className="font-mono">{emp.employeeNumber}</span>}
                    {emp.position && <span> · {emp.position}</span>}
                    {emp.department && <span> · {emp.department}</span>}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
