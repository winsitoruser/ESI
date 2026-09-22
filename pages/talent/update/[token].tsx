/**
 * Candidate self-update (Phase 2) — public, token-gated.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function TalentSelfUpdatePage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [name, setName] = useState('');
  const [form, setForm] = useState({
    currentTitle: '',
    currentCompany: '',
    location: '',
    salaryExpectedMin: '',
    noticeDays: '',
    workPreference: 'hybrid',
    intent: 'open',
    consentTalentPool: true,
    consentContact: true,
  });

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/talent-self-update?token=${encodeURIComponent(token)}`);
        const j = await res.json();
        if (!j.success) {
          setError(j.error || 'Link tidak valid');
          return;
        }
        const p = j.data.profile;
        setName(p.fullName || '');
        setForm({
          currentTitle: p.currentTitle || '',
          currentCompany: p.currentCompany || '',
          location: p.location || '',
          salaryExpectedMin: p.salaryExpectedMin != null ? String(p.salaryExpectedMin) : '',
          noticeDays: p.noticeDays != null ? String(p.noticeDays) : '',
          workPreference: p.workPreference || 'hybrid',
          intent: p.intent || 'open',
          consentTalentPool: p.consentTalentPool !== false,
          consentContact: p.consentContact !== false,
        });
      } catch {
        setError('Gagal memuat formulir');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/public/talent-self-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          currentTitle: form.currentTitle || null,
          currentCompany: form.currentCompany || null,
          location: form.location || null,
          salaryExpectedMin: form.salaryExpectedMin ? Number(form.salaryExpectedMin) : null,
          noticeDays: form.noticeDays ? Number(form.noticeDays) : null,
          workPreference: form.workPreference,
          intent: form.intent,
          consentTalentPool: form.consentTalentPool,
          consentContact: form.consentContact,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || 'Gagal menyimpan');
        return;
      }
      setDone(true);
    } catch {
      setError('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--hf-surface-muted,#f8fafc)] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--hf-brand-600,#4c1d95)]">Humanify</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Perbarui profil talent</h1>
          <p className="mt-1 text-sm text-slate-500">Bantu perusahaan memahami ketersediaan Anda tanpa mengirim CV baru.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat…
            </div>
          ) : done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-medium text-slate-900">Terima kasih, {name}</p>
              <p className="mt-1 text-sm text-slate-500">Profil Anda sudah diperbarui. Anda bisa menutup halaman ini.</p>
            </div>
          ) : error && !name ? (
            <p className="py-8 text-center text-sm text-rose-700">{error}</p>
          ) : (
            <div className="space-y-3">
              {name ? <p className="text-sm font-medium text-slate-800">Halo, {name}</p> : null}
              {error ? <p className="text-sm text-rose-700">{error}</p> : null}
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Jabatan saat ini" value={form.currentTitle} onChange={(e) => setForm({ ...form, currentTitle: e.target.value })} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Perusahaan saat ini" value={form.currentCompany} onChange={(e) => setForm({ ...form, currentCompany: e.target.value })} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Lokasi / area (mis. Tangerang)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Ekspektasi gaji (IDR)" value={form.salaryExpectedMin} onChange={(e) => setForm({ ...form, salaryExpectedMin: e.target.value })} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Notice period (hari)" value={form.noticeDays} onChange={(e) => setForm({ ...form, noticeDays: e.target.value })} />
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={form.workPreference} onChange={(e) => setForm({ ...form, workPreference: e.target.value })}>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={form.intent} onChange={(e) => setForm({ ...form, intent: e.target.value })}>
                <option value="actively_looking">Actively Looking</option>
                <option value="open">Open to Opportunity</option>
                <option value="not_looking">Not Looking</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.consentTalentPool} onChange={(e) => setForm({ ...form, consentTalentPool: e.target.checked })} />
                Izinkan data di talent pool
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.consentContact} onChange={(e) => setForm({ ...form, consentContact: e.target.checked })} />
                Izinkan dihubungi recruiter
              </label>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--hf-brand-600,#4c1d95)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Simpan pembaruan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
