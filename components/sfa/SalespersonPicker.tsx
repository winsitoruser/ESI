import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User, Search, Building2, Briefcase, Hash, CheckCircle2, AlertTriangle, Phone, Mail } from 'lucide-react';

export type SalespersonOption = {
  hris_employee_id: string;
  employee_number?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  position?: string | null;
  employment_type?: string | null;
  status?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  user_id?: number | null;
  user_role?: string | null;
  sfa_team_id?: number | null;
  sfa_team_name?: string | null;
  territory_id?: number | null;
  revenue_30d?: number;
  trx_30d?: number;
};

type Props = {
  value?: SalespersonOption | null;
  onSelect: (sp: SalespersonOption | null) => void;
  onManualMode?: () => void;
  allowManual?: boolean;
  department?: string;
  placeholder?: string;
  className?: string;
};

export default function SalespersonPicker({
  value, onSelect, onManualMode, allowManual = false, department, placeholder = 'Pilih salesperson (HRIS)…', className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [list, setList] = useState<SalespersonOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState(department || '');
  const [depts, setDepts] = useState<{ department: string; employee_count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  const fetchList = useCallback(async (kw: string, dept: string) => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ action: 'salespersons', limit: '50' });
      if (kw) qs.set('search', kw);
      if (dept) qs.set('department', dept);
      const r = await fetch(`/api/hq/sfa/sales-management?${qs.toString()}`);
      const j = await r.json();
      if (j.success) setList(j.data || []);
      else setError(j.error || 'Gagal memuat data karyawan');
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat data karyawan');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const r = await fetch('/api/hq/sfa/hris-sync?action=departments');
      const j = await r.json();
      if (j.success) setDepts(j.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (depts.length === 0) fetchDepartments();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList(search, deptFilter), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [open, search, deptFilter, fetchList, fetchDepartments, depts.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const fmt = (n?: number) => typeof n === 'number' ? n.toLocaleString() : '-';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-sm border rounded-lg bg-white hover:border-indigo-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-left transition ${value ? 'border-indigo-200' : 'border-gray-200'}`}
      >
        {value ? (
          <>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {value.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-gray-900 truncate">{value.name}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> HRIS
                </span>
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {value.employee_number && <span className="font-mono mr-2">#{value.employee_number}</span>}
                {value.position && <span>{value.position}</span>}
                {value.department && <span> · {value.department}</span>}
              </div>
            </div>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-gray-400" />
            <span className="flex-1 text-gray-400 truncate">{placeholder}</span>
          </>
        )}
        <span className="text-xs text-indigo-600">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[380px]">
          {/* Search + Department filter */}
          <div className="p-2 border-b border-gray-100 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / NIP / posisi…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {allowManual && onManualMode && (
                <button
                  type="button"
                  onClick={() => { onManualMode(); setOpen(false); }}
                  className="text-[11px] font-semibold px-2 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 shrink-0"
                  title="Input manual (tanpa link HRIS)"
                >
                  Input Manual
                </button>
              )}
            </div>
            {depts.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Semua Departemen ({depts.reduce((s, d) => s + d.employee_count, 0)})</option>
                {depts.map(d => (
                  <option key={d.department} value={d.department}>{d.department} ({d.employee_count})</option>
                ))}
              </select>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && <div className="p-4 text-center text-xs text-gray-500">Memuat…</div>}
            {!loading && error && (
              <div className="p-4 text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}
            {!loading && !error && list.length === 0 && (
              <div className="p-6 text-center text-xs text-gray-400">
                Tidak ada karyawan yang cocok.
                {allowManual && onManualMode && (
                  <div className="mt-2">
                    <button onClick={() => { onManualMode(); setOpen(false); }} className="text-amber-600 underline hover:text-amber-700">Input manual</button>
                  </div>
                )}
              </div>
            )}
            {!loading && list.map(sp => {
              const isSel = value?.hris_employee_id === sp.hris_employee_id;
              return (
                <button
                  key={sp.hris_employee_id}
                  type="button"
                  onClick={() => { onSelect(sp); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 transition ${isSel ? 'bg-indigo-50/80' : 'hover:bg-indigo-50/40'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${sp.status === 'active' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-400'}`}>
                      {sp.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 truncate">{sp.name}</span>
                        {sp.status === 'active' ? (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-bold">AKTIF</span>
                        ) : (
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-bold uppercase">{sp.status || 'inactive'}</span>
                        )}
                        {sp.sfa_team_name && (
                          <span className="text-[9px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded">Tim: {sp.sfa_team_name}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        {sp.employee_number && (
                          <span className="font-mono flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{sp.employee_number}</span>
                        )}
                        {sp.position && (
                          <span className="flex items-center gap-0.5"><Briefcase className="w-2.5 h-2.5" />{sp.position}</span>
                        )}
                        {sp.department && (
                          <span className="flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{sp.department}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        {sp.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{sp.email}</span>}
                        {sp.phone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{sp.phone}</span>}
                        {sp.branch_name && <span>· {sp.branch_name}</span>}
                      </div>
                    </div>
                    {(sp.revenue_30d || 0) > 0 && (
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-gray-400">30 hr</div>
                        <div className="text-xs font-bold text-emerald-700">Rp {fmt(sp.revenue_30d)}</div>
                        <div className="text-[10px] text-gray-500">{sp.trx_30d || 0} trx</div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {value && (
            <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Terpilih: <b>{value.name}</b></span>
              <button
                type="button"
                onClick={() => { onSelect(null); }}
                className="text-[11px] font-semibold text-red-600 hover:underline"
              >Hapus pilihan</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
