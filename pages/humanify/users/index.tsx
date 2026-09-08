import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import HumanifyLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import { OpsKpiShell } from '@/components/humanify/OpsPageChrome';
import { PlatformAccessShell } from '@/components/humanify/PlatformAccessNav';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import {
  UserPlus, Users, Mail, RefreshCw, Send, Copy, Check, X, Clock,
  ShieldCheck, AlertTriangle, Loader2, Trash2, UserMinus, UserCheck,
} from 'lucide-react';

interface Member {
  id: string | number;
  name: string;
  email: string;
  role: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string | null;
}
interface Invitation {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  expired: boolean;
}
interface Seats {
  planId: string;
  users: number;
  maxUsers: number;
  usersPct: number;
}
interface RoleOption { code: string; label: string }

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', hq_admin: 'Admin', admin: 'Admin', manager: 'Manajer',
  staff: 'Staf', viewer: 'Viewer',
};
const INVITE_FALLBACK_ROLES: RoleOption[] = [
  { code: 'hq_admin', label: 'Admin' },
  { code: 'manager', label: 'Manajer' },
  { code: 'staff', label: 'Staf' },
];
const roleLabel = (r?: string | null) => (r ? (ROLE_LABELS[r] || r) : '—');

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

export default function TeamUsersPage() {
  const { data: session } = useSession();
  const selfId = String((session?.user as any)?.id || '');
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [seats, setSeats] = useState<Seats | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/invitations');
      const json = await res.json();
      if (json.success) {
        const d = json.data || {};
        setMembers(d.members || []);
        setInvitations(d.invitations || []);
        setSeats(d.seats || null);
        setRoles(d.roles || []);
        setCanManage(Boolean(d.canManage));
      } else {
        setMsg({ type: 'error', text: json.error || 'Gagal memuat data tim' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pending = useMemo(() => invitations.filter(i => i.status === 'pending' && !i.expired), [invitations]);
  const history = useMemo(() => invitations.filter(i => i.status !== 'pending' || i.expired), [invitations]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* */ }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setMsg(null);
    setLastLink(null);
    try {
      const res = await fetch('/api/humanify/invitations?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const json = await res.json();
      if (json.success) {
        const emailed = json.data?.emailed;
        setMsg({
          type: 'success',
          text: emailed ? `Undangan terkirim ke ${email.trim()}.` : `Undangan dibuat untuk ${email.trim()}.`,
        });
        if (json.data?.inviteUrl) setLastLink(json.data.inviteUrl);
        setEmail(''); setName('');
        fetchData();
      } else {
        setMsg({ type: 'error', text: json.error || 'Gagal membuat undangan' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setSubmitting(false);
    }
  };

  const action = async (id: string, act: 'revoke' | 'resend') => {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/humanify/invitations?action=${act}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        if (act === 'resend' && json.data?.inviteUrl) setLastLink(json.data.inviteUrl);
        setMsg({ type: 'success', text: act === 'revoke' ? 'Undangan dibatalkan.' : 'Undangan dikirim ulang.' });
        fetchData();
      } else {
        setMsg({ type: 'error', text: json.error || 'Aksi gagal' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setBusyId(null);
    }
  };

  const memberAction = async (
    id: string | number,
    act: 'update-role' | 'deactivate' | 'reactivate',
    extra?: { role?: string },
  ) => {
    const key = `${act}-${id}`;
    setBusyId(key);
    setMsg(null);
    try {
      if (act === 'deactivate' && !window.confirm('Nonaktifkan anggota ini? Slot user akan dibebaskan.')) {
        setBusyId(null);
        return;
      }
      const res = await fetch(`/api/humanify/invitations?action=${act}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...(extra || {}) }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({
          type: 'success',
          text: act === 'update-role' ? 'Role diperbarui.'
            : act === 'deactivate' ? 'Anggota dinonaktifkan.'
              : 'Anggota diaktifkan kembali.',
        });
        fetchData();
      } else {
        setMsg({ type: 'error', text: json.error || 'Aksi gagal' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setBusyId(null);
    }
  };

  const seatFull = seats ? seats.users + pending.length >= seats.maxUsers : false;
  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const manageRoles = useMemo(
    () => (roles.length ? roles : INVITE_FALLBACK_ROLES).filter((r) => r.code !== 'viewer'),
    [roles],
  );

  return (
    <HumanifyLayout title="Tim & Undangan" subtitle="Kelola anggota tim dan undang rekan kerja ke tenant Anda">
      <PlatformAccessShell
        current="users"
        title="Tim & Undangan"
        subtitle="Undang rekan HR, atur role, dan pantau kuota user paket."
        icon={UserPlus}
        actions={
          <button type="button" onClick={fetchData} className="hf-btn-secondary inline-flex items-center gap-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Segarkan
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <OpsKpiShell><HRStatCard icon={Users} accent="violet" value={activeMembers.length} label="Anggota aktif" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={Clock} accent="amber" value={pending.length} label="Undangan tertunda" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={ShieldCheck} accent="emerald" value={seats ? seats.maxUsers : '—'} label="Kuota user paket" /></OpsKpiShell>
          <OpsKpiShell><HRStatCard icon={UserPlus} accent="blue" value={seats ? Math.max(0, seats.maxUsers - seats.users - pending.length) : '—'} label="Sisa slot" /></OpsKpiShell>
        </div>

        {msg && (
          <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {msg.type === 'success' ? <Check className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
            <span>{msg.text}</span>
          </div>
        )}

        {lastLink && (
          <div className="rounded-xl border border-[var(--hf-brand-100)] bg-[var(--hf-brand-50)] px-4 py-3 text-sm">
            <p className="font-medium text-[color:var(--hf-brand-600)] mb-1">Tautan undangan</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={lastLink}
                className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--hf-brand-100)] bg-white text-xs font-mono text-[color:var(--hf-ink-secondary)]"
              />
              <button
                onClick={() => copy(lastLink, 'last')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--hf-brand-600)] text-white text-xs hover:bg-[var(--hf-brand)]"
              >
                {copied === 'last' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Salin
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[color:var(--hf-brand)]">Bagikan tautan ini jika email tidak terkirim otomatis.</p>
          </div>
        )}

        {/* Invite form */}
        {canManage && (
          <div className="hf-card p-5">
            <h3 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-[color:var(--hf-brand-600)]" /> Undang Anggota Baru
            </h3>
            {seatFull && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Kuota user paket tercapai. <a href="/humanify/billing" className="underline font-medium">Upgrade paket</a> untuk menambah anggota.
              </div>
            )}
            <form onSubmit={invite} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-[color:var(--hf-ink-muted)] mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--hf-ink-faint)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rekan@perusahaan.com"
                    required
                    className="hf-input w-full pl-10"
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-[color:var(--hf-ink-muted)] mb-1">Nama (opsional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama rekan"
                  className="hf-input w-full"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[color:var(--hf-ink-muted)] mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="hf-input w-full"
                >
                  {(roles.length ? roles : [{ code: 'staff', label: 'Staf' }]).map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={submitting || seatFull}
                  className="hf-btn-primary w-full justify-center text-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Undang
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pending invitations */}
        <div className="hf-card">
          <div className="p-4 border-b border-[var(--hf-border)] flex items-center justify-between">
            <h3 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Undangan Tertunda ({pending.length})
            </h3>
            <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-[var(--hf-surface-muted)] rounded-lg" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-[color:var(--hf-ink-muted)] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10"><RefreshCw className="w-6 h-6 animate-spin text-[color:var(--hf-brand-600)]" /></div>
          ) : pending.length === 0 ? (
            <div className="p-2">
              <HrisEmptyState source="empty" title="Belum ada undangan tertunda" description="Undang rekan HR lewat formulir di atas. Tautan undangan bisa disalin jika email tidak terkirim." />
            </div>
          ) : (
            <div className="hf-table-wrap overflow-x-auto">
              <table>
                <thead className="bg-[var(--hf-surface-muted)]">
                  <tr className="border-b border-[var(--hf-border)] text-left text-[color:var(--hf-ink-muted)]">
                    <th className="py-2.5 px-4 font-medium">Email</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Dibuat</th>
                    <th className="py-2.5 px-4 font-medium">Kedaluwarsa</th>
                    {canManage && <th className="py-2.5 px-4 font-medium text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hf-border-subtle)]">
                  {pending.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--hf-surface-muted)]">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[color:var(--hf-ink)]">{inv.email}</div>
                        {inv.name && <div className="text-xs text-[color:var(--hf-ink-muted)]">{inv.name}</div>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[var(--hf-brand-50)] text-[color:var(--hf-brand)] border border-[var(--hf-brand-100)]">
                          {roleLabel(inv.role)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[color:var(--hf-ink-muted)]">{fmtDate(inv.createdAt)}</td>
                      <td className="py-2.5 px-4 text-[color:var(--hf-ink-muted)]">{fmtDate(inv.expiresAt)}</td>
                      {canManage && (
                        <td className="py-2.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => action(inv.id, 'resend')}
                              disabled={busyId === inv.id}
                              className="hf-btn-secondary inline-flex items-center gap-1 text-xs disabled:opacity-50"
                              title="Kirim ulang"
                            >
                              {busyId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Kirim ulang
                            </button>
                            <button
                              onClick={() => action(inv.id, 'revoke')}
                              disabled={busyId === inv.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                              title="Batalkan"
                            >
                              <X className="w-3.5 h-3.5" /> Batal
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="hf-card">
          <div className="p-4 border-b border-[var(--hf-border)]">
            <h3 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[color:var(--hf-brand-600)]" /> Anggota Tim ({members.length})
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10"><RefreshCw className="w-6 h-6 animate-spin text-[color:var(--hf-brand-600)]" /></div>
          ) : members.length === 0 ? (
            <div className="p-2">
              <HrisEmptyState source="empty" title="Belum ada anggota" description="Undang rekan kerja agar mereka bisa masuk ke tenant ini." />
            </div>
          ) : (
            <div className="hf-table-wrap overflow-x-auto">
              <table>
                <thead className="bg-[var(--hf-surface-muted)]">
                  <tr className="border-b border-[var(--hf-border)] text-left text-[color:var(--hf-ink-muted)]">
                    <th className="py-2.5 px-4 font-medium">Nama</th>
                    <th className="py-2.5 px-4 font-medium">Email</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Login Terakhir</th>
                    <th className="py-2.5 px-4 font-medium text-center">Status</th>
                    {canManage && <th className="py-2.5 px-4 font-medium text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hf-border-subtle)]">
                  {members.map((m) => {
                    const isOwner = String(m.role || '').toLowerCase() === 'owner';
                    const isSelf = selfId && String(m.id) === selfId;
                    const canEdit = canManage && !isOwner && !isSelf;
                    return (
                      <tr key={m.id} className="hover:bg-[var(--hf-surface-muted)]">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--hf-brand-600)] to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                              {m.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-[color:var(--hf-ink)]">{m.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-[color:var(--hf-ink-muted)]">{m.email}</td>
                        <td className="py-2.5 px-4">
                          {canEdit && m.isActive ? (
                            <select
                              value={['hq_admin', 'manager', 'staff'].includes(String(m.role)) ? m.role! : 'staff'}
                              disabled={busyId === `update-role-${m.id}`}
                              onChange={(e) => memberAction(m.id, 'update-role', { role: e.target.value })}
                              className="border border-[var(--hf-border)] rounded-lg px-2 py-1 text-xs bg-white"
                            >
                              {manageRoles.map((r) => (
                                <option key={r.code} value={r.code}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-secondary)]">
                              {roleLabel(m.role)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-[color:var(--hf-ink-muted)]">{m.lastLogin ? fmtDate(m.lastLogin) : 'Belum pernah'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            m.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
                          }`}>
                            {m.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="py-2.5 px-4 text-right">
                            {canEdit ? (
                              m.isActive ? (
                                <button
                                  type="button"
                                  disabled={busyId === `deactivate-${m.id}`}
                                  onClick={() => memberAction(m.id, 'deactivate')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                                >
                                  {busyId === `deactivate-${m.id}`
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <UserMinus className="w-3.5 h-3.5" />}
                                  Nonaktifkan
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busyId === `reactivate-${m.id}`}
                                  onClick={() => memberAction(m.id, 'reactivate')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                                >
                                  {busyId === `reactivate-${m.id}`
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <UserCheck className="w-3.5 h-3.5" />}
                                  Aktifkan
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invitation history */}
        {history.length > 0 && (
          <div className="hf-card">
            <div className="p-4 border-b border-[var(--hf-border)]">
              <h3 className="font-semibold text-[color:var(--hf-ink)] flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[color:var(--hf-ink-faint)]" /> Riwayat Undangan
              </h3>
            </div>
            <div className="hf-table-wrap overflow-x-auto">
              <table>
                <thead className="bg-[var(--hf-surface-muted)]">
                  <tr className="border-b border-[var(--hf-border)] text-left text-[color:var(--hf-ink-muted)]">
                    <th className="py-2.5 px-4 font-medium">Email</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hf-border-subtle)]">
                  {history.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--hf-surface-muted)]">
                      <td className="py-2.5 px-4 text-[color:var(--hf-ink-secondary)]">{inv.email}</td>
                      <td className="py-2.5 px-4 text-[color:var(--hf-ink-muted)]">{roleLabel(inv.role)}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          inv.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : inv.expired
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-[var(--hf-surface-muted)] text-[color:var(--hf-ink-muted)]'
                        }`}>
                          {inv.status === 'accepted' ? 'Diterima' : inv.expired ? 'Kedaluwarsa' : 'Dibatalkan'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[color:var(--hf-ink-muted)]">{fmtDate(inv.acceptedAt || inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PlatformAccessShell>
    </HumanifyLayout>
  );
}
