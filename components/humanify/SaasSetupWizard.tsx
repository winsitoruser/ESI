import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, Users, Calendar, Rocket, ArrowRight, ArrowLeft,
  CheckCircle2, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import HumanifyBrandLoader from '@/components/humanify/HumanifyBrandLoader';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import type { WilayahItem } from '@/lib/humanify/wilayah-id';
import { WILAYAH_SOURCE } from '@/lib/humanify/wilayah-id';

const DEFAULT_DEPARTMENTS = ['HR', 'Finance', 'Operations', 'IT', 'Sales', 'Marketing'];
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
  { key: 'launch', icon: Rocket, title: 'Go Live' },
];

const selectClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400';

export default function SaasSetupWizard() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
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
  });
  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [wilayahLoading, setWilayahLoading] = useState(false);
  const [regenciesLoading, setRegenciesLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>(['HR', 'Finance', 'Operations', 'IT']);
  const [policies, setPolicies] = useState({
    workDays: [1, 2, 3, 4, 5] as number[],
    defaultShift: '09:00-18:00',
    leaveTypes: ['annual', 'sick'] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/saas-onboarding');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const d = json.data;
      if (d.completed) {
        try { await update({ setupCompleted: true }); } catch { /* */ }
        router.replace(HUMANIFY_BRAND.appPath);
        return;
      }
      setStep(d.step || 1);
      setTenant(d.tenant);
      setCareersUrl(d.tenant?.careersUrl || null);
      if (d.saasOnboarding?.company) setCompany((c) => ({ ...c, ...d.saasOnboarding.company }));
      if (d.saasOnboarding?.organization?.departments) {
        setDepartments(d.saasOnboarding.organization.departments);
      }
      if (d.saasOnboarding?.policies) {
        setPolicies((p) => ({ ...p, ...d.saasOnboarding.policies }));
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat setup');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/setup`);
      return;
    }
    if (status === 'authenticated') load();
  }, [status, load, router]);

  useEffect(() => {
    if (status !== 'authenticated' || step !== 1) return;
    let cancelled = false;
    (async () => {
      setWilayahLoading(true);
      try {
        const res = await fetch('/api/humanify/wilayah?level=provinces');
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
  }, [status, step]);

  useEffect(() => {
    const code = company.provinceCode;
    if (!code || status !== 'authenticated') {
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
  }, [company.provinceCode, status]);

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
        body: JSON.stringify({ action: 'save', step: stepKey, data }),
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
        body: JSON.stringify({ action: 'complete' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      try { await update({ setupCompleted: true }); } catch { /* session refresh optional */ }
      // Soft delay so brand loader finishes a beat before hard navigation
      await new Promise((r) => setTimeout(r, 900));
      window.location.href = HUMANIFY_BRAND.appPath;
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

  if (status === 'loading' || loading) {
    return <HumanifyBrandLoader variant="boot" />;
  }

  if (launching) {
    return <HumanifyBrandLoader variant="launch" />;
  }

  const progress = Math.round((step / STEP_META.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <HumanifyLogo href={HUMANIFY_BRAND.appPath} size="sm" variant="withText" />
          <span className="text-xs text-slate-500">{session?.user?.email}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-violet-600 mb-1">Setup workspace</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {tenant?.name ? `Selamat datang, ${tenant.name}` : 'Konfigurasi Humanify'}
          </h1>
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
              <p className="text-sm text-slate-500">Pilih departemen yang akan digunakan di org chart (bisa diubah nanti).</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_DEPARTMENTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDept(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                      departments.includes(d)
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                    }`}
                  >
                    {d}
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
            <div className="space-y-4 text-center">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-400/20" />
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 ring-1 ring-violet-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HUMANIFY_BRAND.logoPath}
                    alt={HUMANIFY_BRAND.name}
                    className="h-full w-full scale-[2.35] object-cover object-[22%_center]"
                  />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Workspace siap diluncurkan!</h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Trial 14 hari aktif. Klik Go Live untuk membuka dashboard Humanify dengan animasi peluncuran.
              </p>
              {careersUrl && (
                <a
                  href={careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium"
                >
                  Portal karir: {careersUrl}
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <ul className="text-left text-sm text-slate-600 space-y-2 max-w-sm mx-auto">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {departments.length} departemen dikonfigurasi</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> Shift {policies.defaultShift}</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> Trial HRIS penuh</li>
              </ul>
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

            {step < 4 ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    if (step === 1) await saveStep('company', company, 2);
                    else if (step === 2) await saveStep('organization', { departments }, 3);
                    else if (step === 3) await saveStep('policies', policies, 4);
                  } catch { /* toast shown */ }
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Lanjut'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Meluncurkan…' : 'Go Live — Masuk ke Humanify'}
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
