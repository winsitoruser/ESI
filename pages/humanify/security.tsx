import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Loader2, Lock, ShieldCheck, ShieldOff, Copy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { HUMANIFY_BRAND } from '@/lib/humanify/branding';

function groupSecret(s: string) {
  return (s.match(/.{1,4}/g) || []).join(' ');
}

export default function HumanifySecurityPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [audit, setAudit] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, a] = await Promise.all([
        fetch('/api/humanify/mfa?action=status').then((r) => r.json()),
        fetch('/api/humanify/admin-audit?limit=30').then((r) => r.json()).catch(() => null),
      ]);
      if (j.success) {
        setEnabled(Boolean(j.data.enabled));
        setEnrolledAt(j.data.enrolledAt || null);
      }
      if (a?.success) setAudit(a.data || []);
    } catch {
      toast.error('Gagal memuat status 2FA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`${HUMANIFY_BRAND.loginPath}?callbackUrl=/humanify/security`);
      return;
    }
    if (status === 'authenticated') load();
  }, [status, load, router]);

  async function startEnroll() {
    setBusy(true);
    try {
      const j = await (await fetch('/api/humanify/mfa?action=enroll', { method: 'POST' })).json();
      if (!j.success) throw new Error(j.error);
      setEnroll(j.data);
      setCode('');
    } catch (e: any) {
      toast.error(e.message || 'Gagal memulai enrol');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    setBusy(true);
    try {
      const j = await (await fetch('/api/humanify/mfa?action=confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })).json();
      if (!j.success) throw new Error(j.error);
      toast.success('2FA aktif — akun Anda lebih aman');
      setEnroll(null);
      setCode('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Kode salah');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const j = await (await fetch('/api/humanify/mfa?action=disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      })).json();
      if (!j.success) throw new Error(j.error);
      toast.success('2FA dinonaktifkan');
      setDisableCode('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Kode salah');
    } finally {
      setBusy(false);
    }
  }

  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success('Disalin'); };

  if (status === 'loading' || loading) {
    return (
      <HumanifyLayout title="Keamanan">
        <div className="flex justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Memuat…
        </div>
      </HumanifyLayout>
    );
  }

  return (
    <>
      <Head><title>Keamanan (2FA) — {HUMANIFY_BRAND.name}</title></Head>
      <HumanifyLayout title="Keamanan Akun" subtitle="Autentikasi dua faktor (2FA / TOTP)">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-600" /> Autentikasi dua faktor
              </h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {enabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Tambahkan lapisan keamanan dengan kode dari aplikasi authenticator (Google Authenticator, Authy, 1Password).
              {enrolledAt ? ` Diaktifkan ${new Date(enrolledAt).toLocaleDateString('id-ID')}.` : ''}
            </p>
          </div>

          {!enabled && !enroll && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <button
                type="button"
                onClick={startEnroll}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Aktifkan 2FA
              </button>
            </div>
          )}

          {!enabled && enroll && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Tambahkan secret di bawah ke aplikasi authenticator Anda (mode manual / entry key), lalu masukkan kode 6 digit untuk konfirmasi.</span>
              </div>

              <div>
                <span className="text-sm text-slate-600">Secret (Base32)</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 rounded px-2 py-2 text-sm font-mono tracking-wider">{groupSecret(enroll.secret)}</code>
                  <button type="button" onClick={() => copy(enroll.secret)} className="text-slate-500 hover:text-slate-800">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-sm text-slate-600">Atau salin URL otpauth</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 rounded px-2 py-1 text-xs truncate">{enroll.otpauthUrl}</code>
                  <button type="button" onClick={() => copy(enroll.otpauthUrl)} className="text-xs text-violet-600 hover:underline whitespace-nowrap">Salin</button>
                </div>
              </div>

              <label className="block">
                <span className="text-sm text-slate-600">Kode 6 digit dari authenticator</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="mt-1 w-40 border border-slate-300 rounded-xl px-3 py-2 text-lg tracking-[0.3em] font-mono"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={confirmEnroll}
                  disabled={busy || code.length !== 6}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Konfirmasi & aktifkan
                </button>
                <button
                  type="button"
                  onClick={() => setEnroll(null)}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {enabled && (
            <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShieldOff className="w-4 h-4 text-red-600" /> Nonaktifkan 2FA
              </h3>
              <p className="text-sm text-slate-500">Masukkan kode 6 digit saat ini untuk mematikan 2FA.</p>
              <div className="flex items-end gap-3">
                <label className="block">
                  <span className="text-sm text-slate-600">Kode saat ini</span>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="mt-1 w-40 border border-slate-300 rounded-xl px-3 py-2 text-lg tracking-[0.3em] font-mono"
                  />
                </label>
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy || disableCode.length !== 6}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  Nonaktifkan
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Audit log admin</h3>
            <p className="text-sm text-slate-500 mb-4">
              Jejak aksi sensitif: ekspor data, ubah paket, nonaktifkan karyawan, penutupan akun.
            </p>
            {audit.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada entri audit.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500 border-b">
                    <tr>
                      <th className="py-2 pr-3">Waktu</th>
                      <th className="py-2 pr-3">Aksi</th>
                      <th className="py-2 pr-3">Aktor</th>
                      <th className="py-2">Resource</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {audit.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 pr-3 text-xs text-slate-500 whitespace-nowrap">
                          {row.createdAt ? new Date(row.createdAt).toLocaleString('id-ID') : '—'}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{row.action}</td>
                        <td className="py-2 pr-3 text-xs">{row.actorEmail || '—'}</td>
                        <td className="py-2 text-xs text-slate-600">
                          {[row.resourceType, row.resourceId].filter(Boolean).join(' · ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </HumanifyLayout>
    </>
  );
}
