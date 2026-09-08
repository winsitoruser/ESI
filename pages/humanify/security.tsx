import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Loader2, Lock, ShieldCheck, ShieldOff, Copy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
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
  const [regenCode, setRegenCode] = useState('');
  const [audit, setAudit] = useState<any[]>([]);
  const [tenantRequireMfa, setTenantRequireMfa] = useState(false);
  const [canManagePolicy, setCanManagePolicy] = useState(false);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [roster, setRoster] = useState<{ userId: string; name: string; email: string; role: string | null; enabled: boolean; enrolledAt: string | null }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, a, rosterRes] = await Promise.all([
        fetch('/api/humanify/mfa?action=status').then((r) => r.json()),
        fetch('/api/humanify/admin-audit?limit=30').then((r) => r.json()).catch(() => null),
        fetch('/api/humanify/mfa?action=roster').then((r) => r.json()).catch(() => null),
      ]);
      if (j.success) {
        setEnabled(Boolean(j.data.enabled));
        setEnrolledAt(j.data.enrolledAt || null);
        setRecoveryRemaining(Number(j.data.recoveryRemaining || 0));
        setTenantRequireMfa(Boolean(j.data.tenantRequireMfa));
        setCanManagePolicy(Boolean(j.data.canManagePolicy));
      }
      if (a?.success) setAudit(a.data || []);
      if (rosterRes?.success) setRoster(rosterRes.data?.roster || []);
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
    if (!regenCode.trim()) {
      toast.error('Masukkan kode 2FA');
      return;
    }
    setBusy(true);
    try {
      const j = await (await fetch('/api/humanify/mfa?action=regenerate-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: regenCode.trim() }),
      })).json();
      if (!j.success) throw new Error(j.error);
      setRecoveryCodes(j.data.recoveryCodes || []);
      setRegenCode('');
      toast.success('Kode pemulihan baru diterbitkan');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Gagal');
    } finally {
      setBusy(false);
    }
  }

  function copyAllRecovery() {
    if (!recoveryCodes?.length) return;
    copy(recoveryCodes.join('\n'));
  }

  function downloadRecovery() {
    if (!recoveryCodes?.length) return;
    const blob = new Blob(
      [`Humanify 2FA recovery codes\n${new Date().toISOString()}\n\n${recoveryCodes.join('\n')}\n`],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'humanify-2fa-recovery.txt';
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="hf-analytics-stage space-y-4">
          <div className="h-32 animate-pulse hf-card" />
          <div className="h-56 animate-pulse hf-card" />
        </div>
      </HumanifyLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Keamanan (2FA) — {HUMANIFY_BRAND.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <HumanifyLayout title="Keamanan Akun" subtitle="Autentikasi dua faktor (2FA / TOTP)">
        <PlatformAccessShell
          current="security"
          title="Keamanan (2FA)"
          subtitle="Authenticator TOTP untuk akun Anda, plus kebijakan wajib 2FA untuk seluruh tim."
          icon={Lock}
        >
          {mfaSetupRequired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Organisasi Anda mewajibkan 2FA. Aktifkan authenticator di bawah sebelum mengakses modul lain.
            </div>
          )}

          <div className="hf-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[color:var(--hf-brand-600)]" /> Autentikasi dua faktor
              </h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'}`}>
                {enabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="text-sm text-[color:var(--hf-ink-muted)]">
              Tambahkan lapisan keamanan dengan kode dari aplikasi authenticator (Google Authenticator, Authy, 1Password).
              {enrolledAt ? ` Diaktifkan ${new Date(enrolledAt).toLocaleDateString('id-ID')}.` : ''}
            </p>
          </div>

          {canManagePolicy && (
            <div className="hf-card flex items-start justify-between gap-4 p-5">
              <div>
                <h3 className="font-semibold text-[color:var(--hf-ink)]">Kebijakan organisasi</h3>
                <p className="text-sm text-[color:var(--hf-ink-muted)] mt-1">
                  Wajibkan semua anggota mengaktifkan 2FA sebelum memakai Humanify.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => togglePolicy(!tenantRequireMfa)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                  tenantRequireMfa
                    ? 'bg-[var(--hf-brand-600)] text-white border-[var(--hf-brand-600)]'
                    : 'bg-white text-[color:var(--hf-ink-secondary)] border-[var(--hf-border)] hover:bg-[var(--hf-surface-muted)]'
                }`}
              >
                {tenantRequireMfa ? 'Wajib aktif' : 'Opsional'}
              </button>
            </div>
          )}

          {canManagePolicy && roster.length > 0 && (
            <div className="hf-card p-5">
              <h3 className="font-semibold text-[color:var(--hf-ink)] mb-1">Status 2FA anggota</h3>
              <p className="text-sm text-[color:var(--hf-ink-muted)] mb-3">{roster.filter((r) => r.enabled).length}/{roster.length} sudah mengaktifkan authenticator.</p>
              <div className="hf-table-wrap overflow-x-auto">
                <table>
                  <thead>
                    <tr className="text-left text-xs text-[color:var(--hf-ink-muted)] border-b">
                      <th className="py-2 font-medium">Nama</th>
                      <th className="py-2 font-medium">Role</th>
                      <th className="py-2 font-medium">2FA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((row) => (
                      <tr key={row.userId} className="border-b border-[var(--hf-border-subtle)] last:border-0">
                        <td className="py-2">
                          <p className="font-medium text-[color:var(--hf-ink)]">{row.name}</p>
                          <p className="text-xs text-[color:var(--hf-ink-muted)]">{row.email}</p>
                        </td>
                        <td className="py-2 text-[color:var(--hf-ink-secondary)]">{row.role || '—'}</td>
                        <td className="py-2">
                          <span className={`text-xs font-semibold ${row.enabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {row.enabled ? 'Aktif' : 'Belum'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!enabled && !enroll && (
            <div className="hf-card p-5">
              <button
                type="button"
                onClick={startEnroll}
                disabled={busy}
                className="hf-btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Aktifkan 2FA
              </button>
            </div>
          )}

          {!enabled && enroll && (
            <div className="hf-card space-y-4 p-5">
              <div className="flex items-start gap-2 rounded-xl border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm text-[color:var(--hf-brand-600)]">
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
                    className="rounded-xl border border-[var(--hf-border)] bg-white"
                  />
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">Scan dengan Google Authenticator / Authy / 1Password</p>
                </div>
              )}

              <div>
                <span className="text-sm text-[color:var(--hf-ink-secondary)]">Secret (Base32)</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-[var(--hf-surface-muted)] rounded px-2 py-2 text-sm font-mono tracking-wider">{groupSecret(enroll.secret)}</code>
                  <button type="button" onClick={() => copy(enroll.secret)} className="text-[color:var(--hf-ink-muted)] hover:text-[color:var(--hf-ink)]">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <span className="text-sm text-[color:var(--hf-ink-secondary)]">Atau salin URL otpauth</span>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-[var(--hf-surface-muted)] rounded px-2 py-1 text-xs truncate">{enroll.otpauthUrl}</code>
                  <button type="button" onClick={() => copy(enroll.otpauthUrl)} className="text-xs text-[color:var(--hf-brand-600)] hover:underline whitespace-nowrap">Salin</button>
                </div>
              </div>

              <label className="block">
                <span className="text-sm text-[color:var(--hf-ink-secondary)]">Kode 6 digit dari authenticator</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="hf-input mt-1 w-40 font-mono text-lg tracking-[0.3em]"
                />
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={confirmEnroll}
                  disabled={busy || code.length !== 6}
                  className="hf-btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Konfirmasi & aktifkan
                </button>
                <button
                  type="button"
                  onClick={() => setEnroll(null)}
                  disabled={busy}
                  className="hf-btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {enabled && (
            <div className="hf-card space-y-3 p-5">
              <h3 className="font-semibold text-[color:var(--hf-ink)]">Kode pemulihan 2FA</h3>
              <p className="text-sm text-[color:var(--hf-ink-muted)]">
                Sisa kode: <span className="font-semibold text-[color:var(--hf-ink)]">{recoveryRemaining}</span>.
                Satu kode = satu kali pakai jika authenticator hilang.
              </p>
              {recoveryRemaining === 0 && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Kode pemulihan habis — terbitkan ulang segera agar akun tidak terkunci.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={regenCode}
                  onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Kode 2FA"
                  className="hf-input w-36 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={regenerateRecovery}
                  disabled={busy || regenCode.length < 6}
                  className="hf-btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Terbitkan ulang kode pemulihan
                </button>
              </div>
              {recoveryCodes && recoveryCodes.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={copyAllRecovery} className="text-xs px-2 py-1 border rounded-lg text-[color:var(--hf-brand)] hover:bg-[var(--hf-brand-50)]">
                      Salin semua
                    </button>
                    <button type="button" onClick={downloadRecovery} className="text-xs px-2 py-1 border rounded-lg text-[color:var(--hf-ink-secondary)] hover:bg-[var(--hf-surface-muted)]">
                      Unduh .txt
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((c) => (
                      <code key={c} className="bg-[var(--hf-surface-muted)] rounded px-2 py-1 text-sm font-mono text-center">{c}</code>
                    ))}
                  </div>
                </div>
              )}

              {!tenantRequireMfa && (
                <div className="pt-4 border-t border-[var(--hf-border-subtle)] space-y-2">
                  <h4 className="text-sm font-semibold text-[color:var(--hf-ink)] flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-rose-500" /> Nonaktifkan 2FA
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Kode 2FA"
                      className="hf-input w-36 font-mono text-sm"
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
            <div className="hf-card p-5">
              <h3 className="font-semibold text-[color:var(--hf-ink)] mb-3">Audit keamanan terbaru</h3>
              <ul className="space-y-2 text-sm text-[color:var(--hf-ink-secondary)]">
                {audit.slice(0, 10).map((ev) => (
                  <li key={ev.id} className="flex justify-between gap-3 border-b border-[var(--hf-border-subtle)] pb-1">
                    <span className="font-mono text-xs text-[color:var(--hf-ink-muted)]">{ev.action}</span>
                    <span className="text-xs">{ev.createdAt ? new Date(ev.createdAt).toLocaleString('id-ID') : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PlatformAccessShell>
      </HumanifyLayout>
    </>
  );
}