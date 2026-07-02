import React, { useState, useEffect, useCallback, useMemo } from 'react';
import HQLayout from '../../../components/hq/HQLayout';
import { PageGuard } from '../../../components/permissions';
import Link from 'next/link';
import {
  Search, User, Shield, Key, Users, ArrowLeft, Loader2, Filter,
  CheckCircle2, AlertCircle, ChevronRight, Eye, Copy, Download,
  Sparkles, Activity, Lock, Zap, Info
} from 'lucide-react';
import { PERMISSION_CATALOG } from '../../../lib/permissions/permissions-catalog';

type Mode = 'byPermission' | 'byUser' | 'byRole';

interface RoleOption {
  id: string;
  code: string;
  name: string;
  level: number | null;
  isActive: boolean;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  role_code?: string | null;
  role_name?: string | null;
  role_level?: number | null;
  legacy_role?: string;
}

interface ByPermissionResult {
  key: string;
  roles: RoleOption[];
  users: any[];
  totalRoles: number;
  totalUsers: number;
}

interface ByUserResult {
  user: {
    id: string; name: string; email: string; isActive: boolean;
    branchId: string | null; lastLoginAt: string | null; legacyRole: string;
  };
  role: {
    id: string; code: string; name: string; level: number | null; dataScope: string | null;
  } | null;
  permissions: string[];
  permissionCount: number;
  hasWildcard: boolean;
}

interface ByRoleResult {
  role: {
    id: string; code: string; name: string; level: number | null;
    dataScope: string | null; isActive: boolean;
  };
  permissions: string[];
  permissionCount: number;
  hasWildcard: boolean;
  users: any[];
  userCount: number;
}

// ---------------------------------------------------------------------------
// Permissions flat list utk autocomplete
// ---------------------------------------------------------------------------
const ALL_PERMISSIONS: Array<{ key: string; label: string; module: string; category: string }> = [];
PERMISSION_CATALOG.forEach(cat => {
  cat.modules.forEach(mod => {
    mod.operations.forEach(op => {
      ALL_PERMISSIONS.push({
        key: op.key,
        label: op.label,
        module: mod.name,
        category: cat.name
      });
    });
  });
});
ALL_PERMISSIONS.push({ key: '*', label: 'Semua Permission (Wildcard)', module: 'System', category: 'Wildcard' });

// ---------------------------------------------------------------------------

export default function PermissionsExplorerPage() {
  const [mode, setMode] = useState<Mode>('byPermission');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inputs
  const [permQuery, setPermQuery] = useState('');
  const [selectedPerm, setSelectedPerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // Options
  const [users, setUsers] = useState<UserOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  // Results
  const [byPermData, setByPermData] = useState<ByPermissionResult | null>(null);
  const [byUserData, setByUserData] = useState<ByUserResult | null>(null);
  const [byRoleData, setByRoleData] = useState<ByRoleResult | null>(null);

  // ---- Load options
  useEffect(() => {
    fetch('/api/hq/users/by-role')
      .then(r => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
    fetch('/api/hq/roles')
      .then(r => r.json())
      .then((d) => {
        const list = (d.roles || d || []) as any[];
        setRoles(list.map(r => ({
          id: r.id, code: r.code, name: r.name,
          level: r.level ?? null,
          isActive: r.isActive !== false && r.is_active !== false
        })));
      })
      .catch(() => {});
  }, []);

  const permSuggestions = useMemo(() => {
    if (!permQuery) return ALL_PERMISSIONS.slice(0, 20);
    const q = permQuery.toLowerCase();
    return ALL_PERMISSIONS.filter(p =>
      p.key.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q) ||
      p.module.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [permQuery]);

  // ---- Submit
  const runQuery = useCallback(async () => {
    setError(null);
    setByPermData(null);
    setByUserData(null);
    setByRoleData(null);

    let url = '';
    if (mode === 'byPermission') {
      if (!selectedPerm) { setError('Pilih/ketik permission dulu'); return; }
      url = `/api/hq/permissions/explorer?mode=byPermission&key=${encodeURIComponent(selectedPerm)}`;
    } else if (mode === 'byUser') {
      if (!selectedUserId) { setError('Pilih user dulu'); return; }
      url = `/api/hq/permissions/explorer?mode=byUser&userId=${encodeURIComponent(selectedUserId)}`;
    } else {
      if (!selectedRoleId) { setError('Pilih role dulu'); return; }
      url = `/api/hq/permissions/explorer?mode=byRole&roleId=${encodeURIComponent(selectedRoleId)}`;
    }

    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (mode === 'byPermission') setByPermData(json);
      if (mode === 'byUser') setByUserData(json);
      if (mode === 'byRole') setByRoleData(json);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedPerm, selectedUserId, selectedRoleId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <PageGuard
      anyPermission={['users.view_permissions', 'roles.view', 'users.view']}
      title="Permission Explorer"
      description="Audit hak akses lintas user, role, dan permission."
    >
    <HQLayout
      title="Permission Explorer"
      subtitle="Alat admin untuk audit hak akses lintas user & role"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/hq/users/roles" className="p-2 border rounded-lg hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Permission Explorer
            </h2>
            <p className="text-sm text-gray-500">
              Jawab pertanyaan "siapa punya akses X?", "apa yang bisa dilakukan user Y?", dan "role Z isinya apa?"
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-3">
            <ModeCard
              active={mode === 'byPermission'}
              onClick={() => setMode('byPermission')}
              icon={<Key className="w-5 h-5" />}
              title="Cari berdasar Permission"
              desc="Role & user mana yang punya permission tertentu"
              color="purple"
            />
            <ModeCard
              active={mode === 'byUser'}
              onClick={() => setMode('byUser')}
              icon={<User className="w-5 h-5" />}
              title="Cari berdasar User"
              desc="Daftar semua permission efektif user"
              color="blue"
            />
            <ModeCard
              active={mode === 'byRole'}
              onClick={() => setMode('byRole')}
              icon={<Shield className="w-5 h-5" />}
              title="Cari berdasar Role"
              desc="Isi permission & user di role tersebut"
              color="emerald"
            />
          </div>
        </div>

        {/* Query input */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          {mode === 'byPermission' && (
            <PermissionInput
              query={permQuery}
              setQuery={setPermQuery}
              selected={selectedPerm}
              setSelected={setSelectedPerm}
              suggestions={permSuggestions}
            />
          )}
          {mode === 'byUser' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Pilih user —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} • {u.email} • {u.role_name || u.legacy_role || 'No role'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {users.length} user tersedia
              </p>
            </div>
          )}
          {mode === 'byRole' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Pilih role —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    [L{r.level ?? '?'}] {r.name} ({r.code}) {r.isActive ? '' : '– NONAKTIF'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {roles.length} role terdaftar
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={runQuery}
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Jalankan Query
            </button>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {byPermData && <ByPermissionResultCard data={byPermData} onCopy={copyToClipboard} />}
        {byUserData && <ByUserResultCard data={byUserData} onCopy={copyToClipboard} />}
        {byRoleData && <ByRoleResultCard data={byRoleData} onCopy={copyToClipboard} />}

        {/* Tip */}
        {!byPermData && !byUserData && !byRoleData && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Tips Pemakaian</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Gunakan <strong>byPermission</strong> untuk audit: siapa saja yang bisa refund POS (`pos.refund`)?</li>
                  <li>Gunakan <strong>byUser</strong> untuk troubleshooting: kenapa user X tidak bisa buka menu?</li>
                  <li>Gunakan <strong>byRole</strong> untuk review: isi role "Kasir" ada apa saja?</li>
                  <li>Wildcard (`*`, `finance.*`) akan otomatis match.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </HQLayout>
    </PageGuard>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModeCard({
  active, onClick, icon, title, desc, color
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: 'purple' | 'blue' | 'emerald';
}) {
  const colors = {
    purple: active ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-200 hover:border-purple-300',
    blue: active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 hover:border-blue-300',
    emerald: active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 hover:border-emerald-300'
  };
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 border-2 rounded-xl transition-all ${colors[color]}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${active ? 'bg-white' : 'bg-gray-100'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function PermissionInput({
  query, setQuery, selected, setSelected, suggestions
}: {
  query: string;
  setQuery: (v: string) => void;
  selected: string;
  setSelected: (v: string) => void;
  suggestions: Array<{ key: string; label: string; module: string; category: string }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">Permission Key</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={selected || query}
          onChange={e => { setQuery(e.target.value); setSelected(''); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ketik: pos.refund, finance.view_pnl, employees.*, *"
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          {suggestions.map(s => (
            <button
              key={s.key}
              onMouseDown={() => { setSelected(s.key); setQuery(s.key); setOpen(false); }}
              className="w-full text-left px-4 py-2 hover:bg-purple-50 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono text-purple-700">{s.key}</code>
                <span className="text-xs text-gray-400">{s.module}</span>
              </div>
              <p className="text-xs text-gray-500">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-2 text-xs text-gray-600">
          Terpilih: <code className="bg-purple-50 px-2 py-0.5 rounded text-purple-700 font-mono">{selected}</code>
        </div>
      )}
    </div>
  );
}

function ByPermissionResultCard({
  data, onCopy
}: { data: ByPermissionResult; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Permission</p>
            <code className="text-xl font-mono font-bold">{data.key}</code>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{data.totalRoles}</p>
              <p className="text-xs text-purple-100 uppercase">Roles</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{data.totalUsers}</p>
              <p className="text-xs text-purple-100 uppercase">Users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold">Role yang Memiliki</h3>
            <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {data.roles.length}
            </span>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {data.roles.length === 0 && (
              <p className="p-4 text-sm text-gray-500 text-center">Tidak ada role</p>
            )}
            {data.roles.map(r => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{r.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.level != null && (
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">L{r.level}</span>
                  )}
                  {!r.isActive && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Nonaktif</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold">User dengan Akses</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {data.users.length}
            </span>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {data.users.length === 0 && (
              <p className="p-4 text-sm text-gray-500 text-center">Tidak ada user</p>
            )}
            {data.users.map((u: any) => (
              <div key={u.id} className="px-4 py-3 hover:bg-gray-50">
                <p className="font-medium text-sm">{u.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500">{u.email}</p>
                  {u.role_code && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                      {u.role_code}
                    </span>
                  )}
                  {!u.is_active && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Nonaktif</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ByUserResultCard({
  data, onCopy
}: { data: ByUserResult; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">User</p>
            <p className="text-xl font-bold">{data.user.name}</p>
            <p className="text-blue-100 text-sm">{data.user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{data.permissionCount}</p>
            <p className="text-xs text-blue-100 uppercase">Permissions</p>
            {data.hasWildcard && (
              <span className="inline-block mt-1 text-xs bg-yellow-300 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">
                Wildcard `*`
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-emerald-600" />
            Role Aktif
          </h3>
          {data.role ? (
            <div className="space-y-2">
              <InfoRow label="Nama" value={data.role.name} />
              <InfoRow label="Kode" value={<code className="text-purple-700 font-mono">{data.role.code}</code>} />
              <InfoRow label="Level" value={data.role.level?.toString() ?? '-'} />
              <InfoRow label="Data Scope" value={data.role.dataScope || '-'} />
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              Belum assign role (fallback ke legacy role: <code>{data.user.legacyRole}</code>)
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-600" />
            Info User
          </h3>
          <div className="space-y-2">
            <InfoRow
              label="Status"
              value={data.user.isActive
                ? <span className="text-emerald-600 font-semibold">Aktif</span>
                : <span className="text-red-600 font-semibold">Nonaktif</span>
              }
            />
            <InfoRow label="Cabang" value={data.user.branchId || '—'} />
            <InfoRow label="Login terakhir" value={data.user.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleString('id-ID') : '—'} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold">Permission Efektif</h3>
          <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            {data.permissionCount}
          </span>
          <button
            onClick={() => onCopy(data.permissions.join('\n'))}
            className="p-1.5 hover:bg-gray-100 rounded"
            title="Salin semua"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {data.permissions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Tidak ada permission</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
              {data.permissions.map(p => (
                <code
                  key={p}
                  className={`text-xs px-2 py-1 rounded font-mono border ${
                    p === '*' || p.endsWith('.*')
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                      : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}
                >
                  {p}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ByRoleResultCard({
  data, onCopy
}: { data: ByRoleResult; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm">Role</p>
            <p className="text-xl font-bold">{data.role.name}</p>
            <code className="text-emerald-100 text-sm font-mono">{data.role.code}</code>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{data.permissionCount}</p>
              <p className="text-xs text-emerald-100 uppercase">Perms</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{data.userCount}</p>
              <p className="text-xs text-emerald-100 uppercase">Users</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold">Permission</h3>
            <button
              onClick={() => onCopy(data.permissions.join('\n'))}
              className="ml-auto p-1.5 hover:bg-gray-100 rounded"
              title="Salin"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-1">
            {data.permissions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">Tidak ada permission</p>
            ) : (
              data.permissions.map(p => (
                <code
                  key={p}
                  className={`block text-xs px-2 py-1 rounded font-mono border ${
                    p === '*' || p.endsWith('.*')
                      ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                      : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}
                >
                  {p}
                </code>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold">User di Role Ini</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {data.users.length}
            </span>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {data.users.length === 0 && (
              <p className="p-4 text-sm text-gray-500 text-center">Belum ada user</p>
            )}
            {data.users.map((u: any) => (
              <div key={u.id} className="px-4 py-3 hover:bg-gray-50">
                <p className="font-medium text-sm">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
                {!u.is_active && (
                  <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Nonaktif</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
