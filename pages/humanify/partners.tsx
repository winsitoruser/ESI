import { useState } from 'react';
import Link from 'next/link';
import { Users, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';
import HumanifyMarketingShell from '@/components/humanify/HumanifyMarketingShell';
import HumanifySeoHead from '@/components/humanify/HumanifySeoHead';
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from '@/lib/humanify/seo';

const TYPES = [
  { value: 'payroll_consultant', label: 'Konsultan gaji / PPh 21' },
  { value: 'bpjs', label: 'Konsultan BPJS' },
  { value: 'accountant', label: 'Kantor akuntan' },
  { value: 'attendance_vendor', label: 'Vendor mesin absensi' },
  { value: 'other', label: 'Lainnya' },
];

export default function HumanifyPartnersPage() {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    partnerType: 'payroll_consultant',
    region: '',
    message: '',
    website: '',
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/humanify/partners/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Gagal mengirim');
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <HumanifySeoHead
        title={`Partner Channel — ${HUMANIFY_BRAND.name}`}
        description="Bergabung sebagai mitra implementasi Humanify — konsultan payroll, BPJS, akuntan, dan vendor absensi. Program channel partner untuk Indonesia."
        path="/humanify/partners"
        keywords={['partner HRIS', 'reseller payroll', 'mitra Humanify', 'konsultan BPJS', 'partner channel']}
        jsonLd={[
          buildWebPageJsonLd({
            name: `Partner Channel ${HUMANIFY_BRAND.name}`,
            description: 'Daftar sebagai mitra implementasi Humanify HRIS.',
            path: '/humanify/partners',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: 'Partner', path: '/humanify/partners' },
          ]),
        ]}
      />
      <HumanifyMarketingShell
        links={[
          { label: 'Status lead', href: '/humanify/partners/status' },
          { label: 'ROI', href: HUMANIFY_BRAND.roiCalculatorPath },
          { label: 'Beranda', href: HUMANIFY_BRAND.welcomePath },
        ]}
        footerVariant="brand"
      >
        <div className="max-w-3xl mx-auto px-4 pb-16">
          <Link href={HUMANIFY_BRAND.welcomePath} className="inline-flex items-center gap-1 text-sm text-[#656565] hover:text-[#592277] mb-6">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>

          <div className="rounded-2xl border border-[#eee9f1] bg-white p-6 text-slate-900 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-[#f6e6ff] p-2.5 text-[#592277]">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold">Partner Channel</h1>
            </div>
            <p className="text-slate-600 mb-8 max-w-xl">
              Untuk konsultan gaji, BPJS, akuntan, dan vendor absensi yang ingin mengimplementasikan Humanify
              bersama klien Anda. Tim kami akan menghubungi dalam 1–2 hari kerja.
            </p>

            {done ? (
              <div className="rounded-2xl border border-[#eee9f1] bg-[#f6e6ff] p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#592277]" />
                <h2 className="text-lg font-semibold text-[#35393f]">Pendaftaran terkirim</h2>
                <p className="mt-2 text-sm text-[#656565]">Terima kasih — tim partnership akan menghubungi Anda.</p>
                <Link href={HUMANIFY_BRAND.welcomePath} className="mt-4 inline-block text-sm font-medium text-[#592277] hover:underline">
                  Ke beranda Humanify
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="text-slate-600">Nama perusahaan *</span>
                    <input
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">Nama kontak *</span>
                    <input
                      required
                      value={form.contactName}
                      onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="text-slate-600">Email *</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">Telepon</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                    />
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="text-slate-600">Tipe mitra *</span>
                    <select
                      value={form.partnerType}
                      onChange={(e) => setForm({ ...form, partnerType: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                    >
                      {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-600">Wilayah</span>
                    <input
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                      placeholder="Jakarta / Jawa Barat / …"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="text-slate-600">Pesan</span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base sm:text-sm"
                    placeholder="Ceritakan singkat klien / volume implementasi yang Anda layani"
                  />
                </label>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#592277] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#501f6b] disabled:opacity-60 sm:w-auto"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Kirim pendaftaran
                </button>
              </form>
            )}

            <p className="mt-6 text-xs text-slate-400">
              Detail program: docs/humanify-partner-channel.md · ROI:{' '}
              <Link href="/humanify/pricing/roi-calculator" className="font-medium text-[#592277] hover:underline">
                kalkulator
              </Link>
            </p>
          </div>
        </div>
      </HumanifyMarketingShell>
    </>
  );
}
