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
  const { status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [recoveryRemaining, setRecoveryRemaining] = useState(0);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [enroll, setEnroll] = useState<{ secret: string; otpauthUrl: string; qrDataUrl?: string | null } | null>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [tenantRequireMfa, setTenantRequireMfa] = useState(false);
  const [canManagePolicy, setCanManagePolicy] = useState(false);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);

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
        setRecoveryRemaining(Number(j.data.recoveryRemaining || 0));
        setTenantRequireMfa(Boolean(j.data.tenantRequireMfa));
        setCanManagePolicy(Boolean(j.data.canManagePolicy));
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

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => setMfaSetupRequired(Boolean(s?.user?.mfaSetupRequired)))
      .catch(() => {});
  }, [status, enabled]);

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
      toast.success('2FA aktif — simpan kode pemulihan');
      setEnroll(null);
      setRecoveryCodes(j.data?.recoveryCodes || null);
      setEnabled(true);
      try {
        await update({ mfaSetupRequired: false });
        setMfaSetupRequired(false);
      } catch { /* */ }
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Kode salah');
    } finally {
      setBusy(false);
    }
  }

  async function regenerateRecovery() {
    setBusy(true);
    try {
      const codePrompt = window.prompt('Masukkan kode 2FA untuk menerbitkan ulang kode pemulihan:');
      if (!codePrompt) return;
      const j = await (await fetch('/api/humanify/mfa?action=regenerate-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codePrompt }),
      })).json();
      if (!j.success) throw new Error(j.error);
      setRecoveryCodes(j.data.recoveryCodes || []);
      toast.success('Kode pemulihan baru diterbitkan');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
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

  async function togglePolicy(next: boolean) {
    setBusy(true);
    try {
      const j = await (await fetch('/api/humanify/mfa?action=policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireMfa: next }),
      })).json();
      if (!j.success) throw new Error(j.error);
      setTenantRequireMfa(Boolean(j.data.requireMfa));
      toast.success(next ? '2FA wajib untuk semua anggota' : 'Kewajiban 2FA dinonaktifkan');
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengubah kebijakan');
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
          {mfaSetupRequired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Organisasi Anda mewajibkan 2FA. Aktifkan authenticator di bawah sebelum mengakses modul lain.
            </div>
          )}

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

          {canManagePolicy && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">Kebijakan organisasi</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Wajibkan semua anggota mengaktifkan 2FA sebelum memakai Humanify.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => togglePolicy(!tenantRequireMfa)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                  tenantRequireMfa
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tenantRequireMfa ? 'Wajib aktif' : 'Opsional'}
              </button>
            </div>
          )}

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
                <span>Scan QR di bawah dengan aplikasi authenticator, atau masukkan secret secara manual. Lalu konfirmasi dengan kode 6 digit.</span>
              </div>

              {enroll.qrDataUrl && (
                <div className="flex flex-col items-center gap-2 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={enroll.qrDataUrl}
                    alt="QR code 2FA"
                    width={220}
                    height={220}
                    className="rounded-xl border border-slate-200 bg-white"
                  />
                  <p className="text-xs text-slate-500">Scan dengan Google Authenticator / Authy / 1Password</p>
                </div>
              )}

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
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <h3 className="font-semibold text-slate-900">Kode pemulihan 2FA</h3>
              <p className="text-sm text-slate-500">
                Sisa kode: <span className="font-semibold text-slate-800">{recoveryRemaining}</span>.
                Satu kode = satu kali pakai jika authenticator hilang.
              </p>
              <button
                type="button"
                onClick={regenerateRecovery}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Terbitkan ulang kode pemulihan
              </button>
              {recoveryCodes && recoveryCodes.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {recoveryCodes.map((c) => (
                    <code key={c} className="bg-slate-100 rounded px-2 py-1 text-sm font-mono text-center">{c}</code>
                  ))}
                </div>
              )}

              {!tenantRequireMfa && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-rose-500" /> Nonaktifkan 2FA
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Kode 2FA"
                      className="w-36 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={disable}
                      disabled={busy || disableCode.length !== 6}
                      className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-sm hover:bg-rose-50 disabled:opacity-50"
                    >
                      Nonaktifkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {audit.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Audit keamanan terbaru</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {audit.slice(0, 10).map((ev) => (
                  <li key={ev.id} className="flex justify-between gap-3 border-b border-slate-50 pb-1">
                    <span className="font-mono text-xs text-slate-500">{ev.action}</span>
                    <span className="text-xs">{ev.createdAt ? new Date(ev.createdAt).toLocaleString('id-ID') : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </HumanifyLayout>
    </>
  );
}
