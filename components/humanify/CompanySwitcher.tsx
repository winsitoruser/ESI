import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Building2, Check, ChevronDown, Loader2, Plus, Search, X } from 'lucide-react';

type CompanyItem = {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  plan: string | null;
  role: string;
  isDefault: boolean;
  isActive: boolean;
};

const INDUSTRIES = [
  { value: 'professional_services', label: 'Jasa Profesional' },
  { value: 'software_house', label: 'Teknologi / IT' },
  { value: 'manufacturing', label: 'Manufaktur' },
  { value: 'retail_general', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'health', label: 'Kesehatan' },
  { value: 'other', label: 'Lainnya' },
];

const EMPLOYEE_RANGES = [
  { value: '1-50', label: '1 – 50 karyawan' },
  { value: '51-200', label: '51 – 200 karyawan' },
  { value: '201-500', label: '201 – 500 karyawan' },
  { value: '500+', label: '500+ karyawan' },
];

function isCompanyManagerRole(role?: string | null): boolean {
  return ['owner', 'admin', 'hq_admin', 'hr_admin', 'super_admin', 'superadmin', 'platform_admin']
    .includes(String(role || '').toLowerCase());
}

/**
 * Header company switcher — privilege users switch among companies they own,
 * or add a new company when none is registered yet.
 */
export default function CompanySwitcher() {
  const { data: session, update: updateSession } = useSession();
  const privileged = isCompanyManagerRole((session?.user as any)?.role);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(privileged);
  const [activeName, setActiveName] = useState<string | null>(
    (session?.user as any)?.tenantName || (session?.user as any)?.businessName || null,
  );
  const [form, setForm] = useState({
    companyName: '',
    industry: 'professional_services',
    employeeRange: '1-50',
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/companies');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Gagal memuat perusahaan');
      const list: CompanyItem[] = json.data?.companies || [];
      setCompanies(list);
      setCanCreate(Boolean(json.data?.canCreate));
      setShowSwitcher(Boolean(json.data?.showSwitcher));
      if (json.data?.activeName) setActiveName(json.data.activeName);
    } catch {
      setShowSwitcher(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    load();
  }, [session?.user, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, createOpen]);

  useEffect(() => {
    if (open && companies.length > 6) {
      searchRef.current?.focus();
    }
  }, [open, companies.length]);

  if (!showSwitcher && !privileged) return null;

  const filtered = query.trim()
    ? companies.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : companies;

  const applySessionAndReload = async (patch: { switchCompanyId: string }, href: string) => {
    await updateSession(patch);
    window.location.href = href;
  };

  const handleSwitch = async (company: CompanyItem) => {
    if (company.isActive || switching) return;
    setSwitching(company.id);
    setError(null);
    try {
      const res = await fetch('/api/humanify/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch', tenantId: company.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal beralih perusahaan');
      await applySessionAndReload(
        json.data.sessionPatch,
        json.data.redirectTo || '/humanify',
      );
    } catch (e: any) {
      setError(e.message || 'Gagal beralih perusahaan');
      setSwitching(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/humanify/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          companyName: form.companyName.trim(),
          industry: form.industry,
          employeeRange: form.employeeRange,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal membuat perusahaan');
      await applySessionAndReload(
        json.data.sessionPatch,
        json.data.redirectTo || '/humanify/setup',
      );
    } catch (err: any) {
      setError(err.message || 'Gagal membuat perusahaan');
      setCreating(false);
    }
  };

  const label = activeName || (companies.length ? 'Pilih perusahaan' : 'Tambah perusahaan');

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setCreateOpen(false); setError(null); }}
        className="flex max-w-[11rem] items-center gap-1.5 rounded-[var(--hf-radius)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--hf-surface-muted)] sm:max-w-[14rem]"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Ganti perusahaan"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)] ring-1 ring-[var(--hf-brand-100)]">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-medium text-[color:var(--hf-ink)]">{label}</span>
          <span className="block truncate text-[11px] text-[color:var(--hf-ink-faint)]">
            {companies.length > 1 ? `${companies.length} perusahaan` : 'Perusahaan aktif'}
          </span>
        </span>
        <ChevronDown className={`hidden h-3.5 w-3.5 shrink-0 text-[color:var(--hf-ink-faint)] sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[var(--hf-border)] bg-white shadow-xl"
          role="listbox"
        >
          <div className="border-b border-[var(--hf-border-subtle)] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Perusahaan</p>
          </div>

          {companies.length > 6 && (
            <div className="relative border-b border-[var(--hf-border-subtle)] px-3 py-2">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--hf-ink-faint)]" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari perusahaan…"
                className="w-full rounded-lg border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] py-1.5 pl-8 pr-3 text-sm text-[color:var(--hf-ink)] outline-none placeholder:text-[color:var(--hf-ink-faint)] focus:border-[var(--hf-brand-500)] focus:bg-white"
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto py-1">
            {loading && companies.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-[color:var(--hf-ink-faint)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
              </div>
            )}
            {!loading && companies.length === 0 && (
              <div className="px-4 py-6 text-center">
                <Building2 className="mx-auto mb-2 h-8 w-8 text-[color:var(--hf-ink-faint)]" />
                <p className="text-sm font-medium text-[color:var(--hf-ink)]">Belum ada perusahaan</p>
                <p className="mt-1 text-xs text-[color:var(--hf-ink-muted)]">Daftarkan perusahaan pertama untuk mulai memakai Humanify.</p>
              </div>
            )}
            {!loading && query && filtered.length === 0 && companies.length > 0 && (
              <p className="px-4 py-4 text-sm text-[color:var(--hf-ink-faint)]">Tidak ada perusahaan cocok</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={c.isActive}
                disabled={Boolean(switching)}
                onClick={() => handleSwitch(c)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  c.isActive
                    ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)]'
                    : 'text-[color:var(--hf-ink)] hover:bg-[var(--hf-surface-muted)]'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[color:var(--hf-brand-600)] ring-1 ring-[var(--hf-border)]">
                  {switching === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block truncate text-[11px] text-[color:var(--hf-ink-faint)]">
                    {[c.plan, c.role === 'owner' ? 'Pemilik' : c.role === 'admin' ? 'Admin' : 'Anggota'].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {c.isActive && <Check className="h-4 w-4 shrink-0 text-[color:var(--hf-brand-500)]" />}
              </button>
            ))}
          </div>

          {error && (
            <p className="border-t border-[var(--hf-border-subtle)] px-3 py-2 text-xs text-[color:var(--hf-danger)]">{error}</p>
          )}

          {canCreate && (
            <div className="border-t border-[var(--hf-border-subtle)] p-1.5">
              <button
                type="button"
                onClick={() => { setCreateOpen(true); setOpen(false); setError(null); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)]"
              >
                <Plus className="h-4 w-4" />
                Tambah perusahaan
              </button>
            </div>
          )}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => !creating && setCreateOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--hf-border)] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="hf-new-company-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="hf-new-company-title" className="text-base font-semibold text-[color:var(--hf-ink)]">Tambah perusahaan</h2>
                <p className="mt-1 text-sm text-[color:var(--hf-ink-muted)]">
                  Perusahaan baru terisolasi (payroll, karyawan, absensi sendiri) dan terdaftar di bawah akun Anda.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-[color:var(--hf-ink-faint)] hover:bg-[var(--hf-surface-muted)]"
                onClick={() => !creating && setCreateOpen(false)}
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--hf-ink-muted)]">Nama perusahaan</span>
                <input
                  required
                  minLength={2}
                  autoFocus
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="PT Contoh Indonesia"
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2.5 text-sm text-[color:var(--hf-ink)] outline-none placeholder:text-[color:var(--hf-ink-faint)] focus:border-[var(--hf-brand-500)] focus:shadow-[var(--hf-focus-ring)]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--hf-ink-muted)]">Industri</span>
                <select
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2.5 text-sm text-[color:var(--hf-ink)] outline-none focus:border-[var(--hf-brand-500)]"
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[color:var(--hf-ink-muted)]">Kisaran karyawan</span>
                <select
                  value={form.employeeRange}
                  onChange={(e) => setForm((f) => ({ ...f, employeeRange: e.target.value }))}
                  className="w-full rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2.5 text-sm text-[color:var(--hf-ink)] outline-none focus:border-[var(--hf-brand-500)]"
                >
                  {EMPLOYEE_RANGES.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </label>
              {error && <p className="text-xs text-[color:var(--hf-danger)]">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setCreateOpen(false)}
                  className="hf-btn-secondary px-4 py-2 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating || form.companyName.trim().length < 2}
                  className="hf-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Buat perusahaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
