import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { HRIS_DEPARTMENTS, resolveDepartmentOption, slugDepartmentCode } from '@/lib/hris/master-data';
import {
  filterOrgUnitSuggestions,
  mergeOrgUnitSuggestionPool,
  unusedCatalogSuggestions,
  type OrgUnitSuggestion,
} from '@/lib/hris/org-unit-suggestions';

type Props = {
  name: string;
  code: string;
  existingUnits: { code?: string | null; name?: string | null }[];
  isEdit?: boolean;
  onChange: (next: { name: string; code: string }) => void;
};

export default function OrgUnitSuggestField({
  name, code, existingUnits, isEdit, onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = 'org-unit-suggest-list';

  const pool = useMemo(
    () => mergeOrgUnitSuggestionPool(existingUnits, HRIS_DEPARTMENTS),
    [existingUnits],
  );
  const unused = useMemo(() => unusedCatalogSuggestions(pool), [pool]);
  const matches = useMemo(() => filterOrgUnitSuggestions(name, pool), [name, pool]);

  useEffect(() => { setHighlight(0); }, [name, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const applySuggestion = (s: OrgUnitSuggestion) => {
    onChange({ name: s.label, code: s.code });
    setOpen(false);
  };

  const onNameChange = (value: string) => {
    if (!value.trim()) {
      onChange({ name: value, code });
      return;
    }
    const known = HRIS_DEPARTMENTS.find(
      (d) => d.label.toLowerCase() === value.trim().toLowerCase() || d.code === value.trim().toUpperCase(),
    );
    if (known) {
      onChange({ name: known.label, code: known.code });
      return;
    }
    const resolved = resolveDepartmentOption(value);
    const catalogHit = HRIS_DEPARTMENTS.some((d) => d.code === resolved.code && (
      d.label.toLowerCase() === value.trim().toLowerCase() || d.code === slugDepartmentCode(value)
    ));
    onChange({
      name: value,
      code: catalogHit ? resolved.code : (code || slugDepartmentCode(value)),
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && matches[highlight]) {
      e.preventDefault();
      applySuggestion(matches[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showChips = !isEdit && unused.length > 0;

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="relative">
        <label className="text-xs font-medium text-gray-500" htmlFor="org-unit-name">Nama Unit *</label>
        <input
          id="org-unit-name"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[highlight] ? `${listId}-${highlight}` : undefined}
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
          placeholder="Ketik atau pilih dari saran — Divisi / Departemen / Bagian"
          autoComplete="off"
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-[min(14rem,50dvh)] overflow-y-auto rounded-lg border bg-white shadow-lg py-1"
          >
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400">Tidak ada saran. Lanjutkan ketik nama kustom.</li>
            ) : matches.map((s, i) => (
              <li
                key={`${s.source}-${s.code}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between gap-2 ${
                  i === highlight ? 'bg-[var(--hf-brand-50)]' : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s);
                }}
              >
                <span className="min-w-0">
                  <span className="font-medium text-gray-800">{s.label}</span>
                  <span className="text-xs text-gray-400 ml-1.5">{s.code}</span>
                </span>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                  s.source === 'catalog'
                    ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {s.alreadyInOrg ? 'Sudah di struktur' : s.source === 'catalog' ? 'Katalog' : 'Unit ada'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showChips && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">Saran departemen dasar</p>
          <div className="flex flex-wrap gap-1.5">
            {unused.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => applySuggestion(s)}
                className={`px-2.5 py-1 rounded-full text-xs border transition ${
                  code === s.code
                    ? 'bg-[var(--hf-brand-600)] text-white border-[var(--hf-brand-600)]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--hf-brand-300)] hover:text-[color:var(--hf-brand)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
