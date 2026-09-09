import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, Users, Calendar, UserPlus, Rocket, ArrowRight, ArrowLeft,
  CheckCircle2, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import HumanifyBrandLoader from '@/components/humanify/HumanifyBrandLoader';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import type { WilayahItem } from '@/lib/humanify/wilayah-id';
import { WILAYAH_SOURCE } from '@/lib/humanify/wilayah-id';
import { resolveDepartmentOption } from '@/lib/hris/master-data';
import {
  NEW_COMPANY_DASHBOARD_HREF,
  SETUP_LAUNCH_DASHBOARD_HREF,
  POST_LAUNCH_ACTIONS,
  industryLabel,
  humanifyLoginHref,
} from '@/lib/saas/company-onboarding-flow';

const WIZARD_DEPARTMENTS = [
  { code: 'HR', label: 'SDM' },
  { code: 'FINANCE', label: 'Keuangan' },
  { code: 'OPERATIONS', label: 'Operasional' },
  { code: 'IT', label: 'IT' },
  { code: 'SALES', label: 'Penjualan' },
  { code: 'MARKETING', label: 'Pemasaran' },
];
const WORK_DAYS = [
  { value: 1, label: 'Sen' },
  { value: 2, label: 'Sel' },
  { value: 3, label: 'Rab' },
  { value: 4, label: 'Kam' },
  { value: 5, label: 'Jum' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Min' },
];

const STEP_META = [
  { key: 'company', icon: Building2, title: 'Profil Perusahaan' },
  { key: 'organization', icon: Users, title: 'Struktur Organisasi' },
  { key: 'policies', icon: Calendar, title: 'Kebijakan Dasar' },
  { key: 'employee', icon: UserPlus, title: 'Karyawan Pertama' },
  { key: 'launch', icon: Rocket, title: 'Go Live' },
];

const selectClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400';

export default function SaasSetupWizard() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<any>(null);
  const [careersUrl, setCareersUrl] = useState<string | null>(null);

  const [company, setCompany] = useState({
    city: '',
    province: '',
    provinceCode: '',
    cityCode: '',
    phone: '',
    website: '',
    industry: '',
    employeeRange: '',
  });
  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [wilayahLoading, setWilayahLoading] = useState(false);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>(['HR', 'FINANCE', 'OPERATIONS', 'IT']);
  const [policies, setPolicies] = useState({
    workDays: [1, 2, 3, 4, 5] as number[],
    defaultShift: '09:00-18:00',
    leaveTypes: ['annual', 'sick'] as string[],
  });
  const [firstEmployee, setFirstEmployee] = useState({
    name: '',
    email: '',
    position: 'Staff',
    department: 'HR',
  });
  const [isAdditionalCompany, setIsAdditionalCompany] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const fromNewCompany = router.query.from === 'new-company';
  const pendingCompanyId = typeof router.query.companyId === 'string' ? router.query.companyId : '';
  const additionalFlow = isAdditionalCompany || fromNewCompany;
  const loadGen = useRef(0);

  const onboardingUrl = pendingCompanyId
    ? `/api/humanify/saas-onboarding?companyId=${encodeURIComponent(pendingCompanyId)}`
    : '/api/humanify/saas-onboarding';

  useEffect(() => {
    if (!router.isReady) return;

    const gen = ++loadGen.current;
    const ac = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => ac.abort(), 10000);

    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const fetchOnboarding = () => fetch(onboardingUrl, { credentials: 'include', signal: ac.signal });
        let res = await fetchOnboarding();
        if (res.status === 401) {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
          if (cancelled || gen !== loadGen.current) return;
          res = await fetchOnboarding();
        }
        if (res.status === 401) {
          const dest = `${window.location.pathname}${window.location.search}`;
          window.location.replace(humanifyLoginHref(dest));
          return;
        }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Gagal memuat setup');
        const d = json.data;
        const loadedId = String(d?.tenant?.id || '');
        if (cancelled || gen !== loadGen.current) return;

        if (pendingCompanyId && loadedId && pendingCompanyId !== loadedId) {
          setLoadError('Setup membuka perusahaan yang berbeda. Muat ulang halaman ini.');
          return;
        }

        if (d.completed && !fromNewCompany) {
          window.location.replace(HUMANIFY_BRAND.appPath);
          return;
        }

        setStep(d.step || 1);
        setTenant(d.tenant);
        setCareersUrl(d.tenant?.careersUrl || null);
        try {
          const listRes = await fetch('/api/humanify/companies', { credentials: 'include', signal: ac.signal });
          const listJson = await listRes.json();
          const count = Array.isArray(listJson?.data?.companies) ? listJson.data.companies.length : 0;
          setIsAdditionalCompany(count > 1);
        } catch {
          setIsAdditionalCompany(Boolean(pendingCompanyId));
        }
        if (d.saasOnboarding?.company) setCompany((c) => ({ ...c, ...d.saasOnboarding.company }));
        if (d.saasOnboarding?.organization?.departments) {
          setDepartments(
            (d.saasOnboarding.organization.departments as string[]).map((x) => resolveDepartmentOption(x).code),
          );
        }
        if (d.saasOnboarding?.policies) {
          setPolicies((p) => ({ ...p, ...d.saasOnboarding.policies }));
        }
        if (d.saasOnboarding?.employee) {
          const emp = d.saasOnboarding.employee;
          setFirstEmployee((e) => ({
            ...e,
            ...emp,
            department: resolveDepartmentOption(String(emp.department || e.department)).code,
          }));
        }
      } catch (e: any) {
        if (cancelled || gen !== loadGen.current) return;
        if (e?.name === 'AbortError') {
          setLoadError('Memuat setup terlalu lama. Periksa koneksi, lalu coba lagi.');
        } else {
          const message = e.message || 'Gagal memuat setup';
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        window.clearTimeout(timer);
        if (!cancelled && gen === loadGen.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [router.isReady, pendingCompanyId, fromNewCompany, retryNonce, onboardingUrl]);

  useEffect(() => {
    if (loading || step !== 1) return;
    let cancelled = false;
    (async () => {
      setWilayahLoading(true);
      try {
        const res = await fetch('/api/humanify/wilayah?level=provinces', { credentials: 'include' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        if (!cancelled) setProvinces(json.data || []);
      } catch (e: any) {
        if (!cancelled) toast.error(e.message || 'Gagal memuat daftar provinsi');
      } finally {
        if (!cancelled) setWilayahLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, step]);

  useEffect(() => {
    const code = company.provinceCode;
    if (!code) {
      setRegencies([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRegenciesLoading(true);
      try {
        const res = await fetch(`/api/humanify/wilayah?level=regencies&provinceCode=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        if (!cancelled) setRegencies(json.data || []);
      } catch (e: any) {
        if (!cancelled) {
          setRegencies([]);
          toast.error(e.message || 'Gagal memuat daftar kota/kabupaten');
        }
      } finally {
        if (!cancelled) setRegenciesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [company.provinceCode]);

  // Resolve province/city codes from saved names (legacy free-text) once lists load
  useEffect(() => {
    if (!provinces.length || !company.province || company.provinceCode) return;
    const match = provinces.find(
      (p) => p.name.toLowerCase() === company.province.toLowerCase(),
    );
    if (match) setCompany((c) => ({ ...c, provinceCode: match.code, province: match.name }));
  }, [provinces, company.province, company.provinceCode]);

  useEffect(() => {
    if (!regencies.length || !company.city || company.cityCode) return;
    const match = regencies.find(
      (r) => r.name.toLowerCase() === company.city.toLowerCase(),
    );
    if (match) setCompany((c) => ({ ...c, cityCode: match.code, city: match.name }));
  }, [regencies, company.city, company.cityCode]);

  function onProvinceChange(code: string) {
    const selected = provinces.find((p) => p.code === code);
    setCompany((c) => ({
      ...c,
      provinceCode: code,
      province: selected?.name || '',
      city: '',
      cityCode: '',
    }));
  }

  function onCityChange(code: string) {
    const selected = regencies.find((r) => r.code === code);
    setCompany((c) => ({
      ...c,
      cityCode: code,
      city: selected?.name || '',
    }));
  }

  async function saveStep(stepKey: string, data: Record<string, unknown>, next?: number) {
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/saas-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          step: stepKey,
          data,
          ...(pendingCompanyId ? { companyId: pendingCompanyId } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (next) setStep(next);
      if (json.data?.tenant) {
        setTenant(json.data.tenant);
        setCareersUrl(json.data.tenant.careersUrl);
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    setLaunching(true);
    try {
      const res = await fetch('/api/humanify/saas-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          ...(pendingCompanyId ? { companyId: pendingCompanyId } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const patch: Record<string, unknown> = { setupCompleted: true };
      if (pendingCompanyId) patch.switchCompanyId = pendingCompanyId;
      try { await update(patch); } catch { /* session refresh optional */ }
      // Soft delay so brand loader finishes a beat before hard navigation
      await new Promise((r) => setTimeout(r, 900));
      window.location.href = additionalFlow ? NEW_COMPANY_DASHBOARD_HREF : SETUP_LAUNCH_DASHBOARD_HREF;
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyelesaikan setup');
      setLaunching(false);
      setSaving(false);
    }
  }

  function toggleDept(name: string) {
    setDepartments((d) => (d.includes(name) ? d.filter((x) => x !== name) : [...d, name]));
  }

  function toggleWorkDay(day: number) {
    setPolicies((p) => ({
      ...p,
      workDays: p.workDays.includes(day)
        ? p.workDays.filter((d) => d !== day)
        : [...p.workDays, day].sort(),
    }));
  }

  if (loading && !loadError) {
    return <HumanifyBrandLoader variant="boot" />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
            <HumanifyLogo size="sm" variant="withText" />
            <span className="text-xs text-slate-500 truncate max-w-[50%]">{session?.user?.email}</span>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 sm:px-6 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Setup belum bisa dibuka</h1>
            <p className="mt-2 text-sm text-slate-600">{loadError}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoadError(null);
                  setLoading(true);
                  setRetryNonce((n) => n + 1);
                }}
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
              >
                Coba lagi
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                Muat ulang halaman
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (launching) {
    return <HumanifyBrandLoader variant="launch" />;
  }

  const progress = Math.round((step / STEP_META.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-w-0">
          <HumanifyLogo size="sm" variant="withText" />
          <span className="text-xs text-slate-500 truncate max-w-[50%]">{session?.user?.email}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-violet-600 mb-1">
            {additionalFlow ? 'Siapkan perusahaan baru' : 'Setup workspace'}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {tenant?.name
              ? additionalFlow
                ? `Lengkapi ${tenant.name}`
                : `Selamat datang, ${tenant.name}`
              : 'Konfigurasi Humanify'}
          </h1>
          <p className="text-sm text-slate-600 mb-4 max-w-2xl">
            {additionalFlow
              ? 'Perusahaan ini punya data karyawan, absensi, dan payroll sendiri. Isi lokasi dan kebijakan dulu, lalu buka dashboard untuk operasional sehari-hari.'
              : 'Empat langkah singkat agar workspace siap dipakai: lokasi, organisasi, jam kerja, lalu karyawan pertama.'}
          </p>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-violet-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">Langkah {step} dari {STEP_META.length}</p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {STEP_META.map((s, i) => {
            const Icon = s.icon;
            const active = step === i + 1;
            const done = step > i + 1;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${
                  active ? 'bg-violet-600 text-white' : done ? 'bg-violet-50 text-violet-700' : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                {s.title}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Lokasi & kontak perusahaan</h2>
              {(tenant?.name || company.industry || company.employeeRange) && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  {tenant?.name && (
                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {tenant.name}
                    </span>
                  )}
                  {company.industry && (
                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                      {industryLabel(String(company.industry))}
                    </span>
                  )}
                  {company.employeeRange && (
                    <span className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                      {String(company.employeeRange)} karyawan
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm text-slate-500">Nama sudah tersimpan. Lengkapi alamat operasional agar slip gaji dan dokumen resmi memakai data yang benar.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Provinsi</label>
                  <select
                    className={selectClass}
                    value={company.provinceCode}
                    disabled={wilayahLoading}
                    onChange={(e) => onProvinceChange(e.target.value)}
                  >
                    <option value="">
                      {wilayahLoading ? 'Memuat provinsi…' : 'Pilih provinsi'}
                    </option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Kota / Kabupaten</label>
                  <select
                    className={selectClass}
                    value={company.cityCode}
                    disabled={!company.provinceCode || regenciesLoading}
                    onChange={(e) => onCityChange(e.target.value)}
                  >
                    <option value="">
                      {!company.provinceCode
                        ? 'Pilih provinsi dulu'
                        : regenciesLoading
                          ? 'Memuat kota/kabupaten…'
                          : 'Pilih kota/kabupaten'}
                    </option>
                    {regencies.map((r) => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Data daerah dari{' '}
                <a
                  href={WILAYAH_SOURCE.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-600"
                >
                  {WILAYAH_SOURCE.name}
                </a>
                {' '}· {WILAYAH_SOURCE.updatedHint}
              </p>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Telepon HR</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} placeholder="021-xxxx" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Departemen awal</h2>
              <p className="text-sm text-slate-500">Pilih departemen yang akan digunakan di org chart. Unit ini langsung tersimpan ke struktur organisasi.</p>
              <div className="flex flex-wrap gap-2">
                {WIZARD_DEPARTMENTS.map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => toggleDept(d.code)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                      departments.includes(d.code)
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Jam kerja & cuti</h2>
              <div>
                <label className="text-sm text-slate-600 mb-2 block">Hari kerja</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWorkDay(d.value)}
                      className={`w-12 py-2 rounded-lg text-sm font-medium border ${
                        policies.workDays.includes(d.value)
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Shift default</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
                  value={policies.defaultShift}
                  onChange={(e) => setPolicies({ ...policies, defaultShift: e.target.value })}
                >
                  <option value="09:00-18:00">09:00 – 18:00 (kantor)</option>
                  <option value="08:00-17:00">08:00 – 17:00</option>
                  <option value="22:00-06:00">22:00 – 06:00 (shift malam)</option>
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Tambah karyawan pertama</h2>
              <p className="text-sm text-slate-600">
                Satu catatan karyawan cukup untuk membuka go-live. Boleh dilewati — Anda bisa impor di dashboard setelah workspace aktif.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block" htmlFor="setup-emp-name">Nama lengkap</label>
                  <input
                    id="setup-emp-name"
                    className={selectClass}
                    value={firstEmployee.name}
                    onChange={(e) => setFirstEmployee((emp) => ({ ...emp, name: e.target.value }))}
                    placeholder="Nama karyawan"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block" htmlFor="setup-emp-email">Email kerja</label>
                  <input
                    id="setup-emp-email"
                    type="email"
                    className={selectClass}
                    value={firstEmployee.email}
                    onChange={(e) => setFirstEmployee((emp) => ({ ...emp, email: e.target.value }))}
                    placeholder="nama@perusahaan.com"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block" htmlFor="setup-emp-position">Jabatan</label>
                  <input
                    id="setup-emp-position"
                    className={selectClass}
                    value={firstEmployee.position}
                    onChange={(e) => setFirstEmployee((emp) => ({ ...emp, position: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block" htmlFor="setup-emp-dept">Departemen</label>
                  <select
                    id="setup-emp-dept"
                    className={selectClass}
                    value={firstEmployee.department}
                    onChange={(e) => setFirstEmployee((emp) => ({ ...emp, department: e.target.value }))}
                  >
                    {departments.map((code) => {
                      const opt = resolveDepartmentOption(code);
                      return <option key={opt.code} value={opt.code}>{opt.label}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 ring-1 ring-violet-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HUMANIFY_BRAND.logoPath}
                    alt={HUMANIFY_BRAND.name}
                    className="h-full w-full scale-[2.35] object-cover object-[22%_center]"
                  />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">
                  {additionalFlow ? `${tenant?.name || 'Perusahaan'} siap diluncurkan` : 'Workspace siap diluncurkan'}
                </h2>
                <p className="mt-2 text-slate-600 text-sm max-w-md mx-auto">
                  Setelah Go Live Anda masuk ke dashboard perusahaan ini. Langkah berikutnya:
                </p>
              </div>
              <ul className="text-left text-sm text-slate-600 space-y-2.5 max-w-md mx-auto">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {departments.length} departemen dikonfigurasi</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> Shift {policies.defaultShift}</li>
                {POST_LAUNCH_ACTIONS.map((action) => (
                  <li key={action.href} className="flex gap-2">
                    <ArrowRight className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium text-slate-800">{action.title}</span>
                      <span className="block text-xs text-slate-500">{action.hint}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {careersUrl && (
                <p className="text-center">
                  <a
                    href={careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium"
                  >
                    Portal karir: {careersUrl}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              disabled={step <= 1 || saving}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>

            {step < 5 ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {step === 4 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      try {
                        await saveStep('employee', { skipped: true }, 5);
                      } catch (e: any) {
                        toast.error(e?.message || 'Gagal melewati langkah ini');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Lewati dulu
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    try {
                      if (step === 1) await saveStep('company', company, 2);
                      else if (step === 2) await saveStep('organization', { departments }, 3);
                      else if (step === 3) await saveStep('policies', policies, 4);
                      else if (step === 4) {
                        if (!firstEmployee.name.trim() || !firstEmployee.email.trim()) {
                          toast.error('Nama dan email karyawan wajib diisi, atau pilih Lewati dulu');
                          return;
                        }
                        const create = await fetch('/api/humanify/employees', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(firstEmployee),
                        });
                        const created = await create.json();
                        if (create.status === 409) {
                          await saveStep('employee', { ...firstEmployee, created: true, duplicate: true }, 5);
                          return;
                        }
                        if (!create.ok || created.success === false) {
                          throw new Error(
                            (typeof created.error === 'string' ? created.error : created.error?.message)
                            || created.message
                            || 'Gagal membuat karyawan',
                          );
                        }
                        await saveStep('employee', { ...firstEmployee, created: true }, 5);
                      }
                    } catch (e: any) {
                      toast.error(e?.message || 'Gagal menyimpan langkah ini');
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Lanjut'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Meluncurkan…' : additionalFlow ? 'Buka dashboard perusahaan' : 'Go Live — Masuk ke Humanify'}
                <Rocket className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Butuh bantuan? <Link href={`mailto:${HUMANIFY_BRAND.company}`} className="text-violet-600">Hubungi tim Naincode</Link>
        </p>
      </main>
    </div>
  );
}
