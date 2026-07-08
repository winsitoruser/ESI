import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, X } from 'lucide-react';
import { getDepartmentLabel, getWorkLocationLabel } from '@/lib/hris/master-data';

export interface PickedEmployee {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  department: string;
  department_label: string;
  branch_name: string;
  work_location: string;
  join_date?: string;
}

interface EmployeePickerProps {
  value?: string;
  onChange: (employee: PickedEmployee | null) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function EmployeePicker({
  value,
  onChange,
  label = 'Karyawan',
  required,
  disabled,
  placeholder = 'Ketik nama, UID, posisi, atau departemen...',
  className = '',
}: EmployeePickerProps) {
  const [employees, setEmployees] = useState<PickedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/humanify/employee-profile?action=list&limit=500');
        const json = await res.json();
        if (!cancelled && json.success) {
          setEmployees((json.data || []).map((e: any) => ({
            id: String(e.id),
            employee_id: e.employee_id || e.employeeId || '',
            name: e.name || '',
            position: e.position || '',
            department: e.department || '',
            department_label: e.department_label || getDepartmentLabel(e.department),
            branch_name: e.branch_name || e.branchName || '',
            work_location: e.work_location || e.workLocation || '',
            join_date: e.join_date || e.joinDate,
          })));
        }
      } catch {
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selected = employees.find((e) => e.id === value) || null;

  useEffect(() => {
    if (selected && !open) {
      setQuery(`${selected.employee_id} — ${selected.name}`);
    } else if (!selected && !open) {
      setQuery('');
    }
  }, [selected, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (selected) setQuery(`${selected.employee_id} — ${selected.name}`);
        else if (!value) setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [selected, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees.slice(0, 12);
    return employees.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) ||
      e.department_label.toLowerCase().includes(q) ||
      e.branch_name.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [employees, query]);

  const pick = (emp: PickedEmployee) => {
    onChange(emp);
    setQuery(`${emp.employee_id} — ${emp.name}`);
    setOpen(false);
    setHighlight(0);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={className} ref={wrapRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (selected && e.target.value !== `${selected.employee_id} — ${selected.name}`) {
              onChange(null);
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={loading ? 'Memuat data karyawan...' : placeholder}
          disabled={disabled || loading}
          className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {(query || selected) && !disabled && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {open && !disabled && !loading && (
          <ul
            className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400">Tidak ada karyawan yang cocok</li>
            ) : filtered.map((e, idx) => (
              <li key={e.id} role="option" aria-selected={value === e.id}>
                <button
                  type="button"
                  onMouseDown={(ev) => { ev.preventDefault(); pick(e); }}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-3 transition-colors ${
                    idx === highlight || value === e.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                    <User className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 truncate">{e.name}</span>
                    <span className="block text-xs text-indigo-600 font-mono">{e.employee_id}</span>
                    <span className="block text-xs text-gray-500 truncate">
                      {e.position} · {e.department_label}
                      {e.branch_name ? ` · ${e.branch_name}` : e.work_location ? ` · ${getWorkLocationLabel(e.work_location)}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected && (
        <p className="text-xs text-gray-500 mt-1.5">
          Terpilih: <strong>{selected.name}</strong> ({selected.employee_id}) — {selected.position}, {selected.department_label}
        </p>
      )}
    </div>
  );
}
