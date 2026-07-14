import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2, Users, Calendar, Rocket, ArrowRight, ArrowLeft,
  CheckCircle2, ExternalLink, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { HumanifyLogo } from '@/components/humanify/HumanifyLogo';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

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

export default function SaasSetupWizard() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [tenant, setTenant] = useState<any>(null);
  const [careersUrl, setCareersUrl] = useState<string | null>(null);

  const [company, setCompany] = useState({
    city: '',
    province: '',
    phone: '',
    website: '',
  });
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
    try {
      const res = await fetch('/api/humanify/saas-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await update({ setupCompleted: true });
      toast.success('Workspace siap digunakan!');
      router.push(HUMANIFY_BRAND.appPath);
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyelesaikan setup');
    } finally {
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const progress = Math.round((step / STEP_META.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <HumanifyLogo href={HUMANIFY_BRAND.appPath} size="sm" variant="withText" />
          <span className="text-xs text-slate-500">{session?.user?.email}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600 mb-1">Setup workspace</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {tenant?.name ? `Selamat datang, ${tenant.name}` : 'Konfigurasi Humanify'}
          </h1>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
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
                  active ? 'bg-blue-600 text-white' : done ? 'bg-blue-50 text-blue-700' : 'bg-white border border-slate-200 text-slate-500'
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
                  <label className="text-sm text-slate-600 mb-1 block">Kota</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} placeholder="Jakarta" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Provinsi</label>
                  <input className="w-full px-4 py-2.5 rounded-xl border border-slate-200" value={company.province} onChange={(e) => setCompany({ ...company, province: e.target.value })} placeholder="DKI Jakarta" />
                </div>
              </div>
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
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
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
                          ? 'bg-blue-600 text-white border-blue-600'
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
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                <Rocket className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Workspace siap diluncurkan!</h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Trial 14 hari aktif. Anda bisa mulai menambah karyawan, mengatur absensi, dan membuka portal karir publik.
              </p>
              {careersUrl && (
                <a
                  href={careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
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
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Lanjut'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Memproses...' : 'Masuk ke Humanify'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Butuh bantuan? <Link href={`mailto:${HUMANIFY_BRAND.company}`} className="text-blue-600">Hubungi tim Naincode</Link>
        </p>
      </main>
    </div>
  );
}
