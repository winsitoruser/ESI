import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronRight, Users, GitBranch, Network, User,
  ArrowUp, ArrowDown, Save, RefreshCw, Eye, Building2,
} from 'lucide-react';
import {
  WORK_ROLE_COLORS,
  WORK_ROLE_LABELS,
  type GenealogyNode,
  type GenealogyEmployee,
  type GenealogyChain,
  type GenealogyStats,
  type WorkRole,
} from '@/lib/hris/employee-genealogy';
import { getDepartmentLabel } from '@/lib/hris/master-data';

interface Props {
  mode: 'tree' | 'chain';
  employeeId?: string;
  onSelectEmployee?: (id: string) => void;
  showToast?: (type: string, message: string) => void;
  canEdit?: boolean;
}

const ROLE_OPTIONS: WorkRole[] = ['EXECUTIVE', 'MANAGER', 'SUPERVISOR', 'STAFF'];

function RoleBadge({ role }: { role: string }) {
  const cls = WORK_ROLE_COLORS[role as WorkRole] || WORK_ROLE_COLORS.STAFF;
  const label = WORK_ROLE_LABELS[role as WorkRole] || role;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function EmployeeCard({
  emp,
  highlight,
  onClick,
  compact,
}: {
  emp: GenealogyEmployee | GenealogyNode;
  highlight?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full rounded-xl border p-3 transition-all ${
        highlight
          ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
          : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-start gap-3">
        <div className={`${compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
          {(emp.name || '?')[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-gray-800 ${compact ? 'text-xs' : 'text-sm'}`}>{emp.name}</span>
            <RoleBadge role={emp.workRole} />
          </div>
          <p className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'} mt-0.5`}>
            {emp.employeeId} • {emp.position}
          </p>
          {!compact && (
            <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-gray-400">
              <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{emp.branchName || '-'}</span>
              <span>{getDepartmentLabel(emp.department)}</span>
              {emp.directReportCount > 0 && (
                <span className="flex items-center gap-0.5 text-green-600">
                  <Users className="w-3 h-3" /> {emp.directReportCount} bawahan
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  toggleExpand,
  onSelect,
  selectedId,
}: {
  node: GenealogyNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const levelColors = ['border-l-purple-400', 'border-l-blue-400', 'border-l-amber-400', 'border-l-gray-300'];

  return (
    <div className="relative">
      <div
        className={`flex items-start gap-2 ${depth > 0 ? `ml-6 pl-4 border-l-2 ${levelColors[Math.min(depth - 1, levelColors.length - 1)]}` : ''}`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleExpand(node.id)}
            className="mt-3 p-0.5 hover:bg-gray-100 rounded flex-shrink-0"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
        ) : (
          <span className="w-5 mt-3 flex-shrink-0" />
        )}
        <div className="flex-1 py-1">
          <EmployeeCard
            emp={node}
            highlight={selectedId === node.id}
            onClick={onSelect ? () => onSelect(node.id) : undefined}
            compact={depth > 1}
          />
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeeGenealogyPanel({
  mode,
  employeeId,
  onSelectEmployee,
  showToast,
  canEdit = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<GenealogyNode[]>([]);
  const [stats, setStats] = useState<GenealogyStats | null>(null);
  const [flat, setFlat] = useState<GenealogyEmployee[]>([]);
  const [chain, setChain] = useState<GenealogyChain | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | undefined>(employeeId);

  const [editSupervisor, setEditSupervisor] = useState('');
  const [editRole, setEditRole] = useState<WorkRole>('STAFF');
  const [saving, setSaving] = useState(false);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/humanify/employee-profile?action=genealogy');
      const json = await res.json();
      if (json.success) {
        setTree(json.data.tree || []);
        setStats(json.data.stats || null);
        setFlat((json.data.flat || []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          employeeId: String(r.employee_id || ''),
          name: String(r.name || ''),
          position: String(r.position || ''),
          department: String(r.department || ''),
          departmentLabel: getDepartmentLabel(r.department as string),
          branchName: String(r.branch_name || ''),
          branchId: r.branch_id ? String(r.branch_id) : null,
          workRole: (r.work_role as WorkRole) || 'STAFF',
          workRoleLabel: WORK_ROLE_LABELS[(r.work_role as WorkRole) || 'STAFF'],
          status: String(r.status || 'ACTIVE'),
          supervisorId: r.supervisor_id ? String(r.supervisor_id) : null,
          supervisorName: r.supervisor_name ? String(r.supervisor_name) : null,
          directReportCount: parseInt(String(r.direct_report_count || 0), 10),
        })));
        const allIds = new Set<string>();
        const collect = (nodes: GenealogyNode[]) => {
          nodes.forEach((n) => { allIds.add(n.id); if (n.children) collect(n.children); });
        };
        collect(json.data.tree || []);
        setExpanded(allIds);
      }
    } catch {
      showToast?.('error', 'Gagal memuat pohon organisasi');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadChain = useCallback(async (empId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/humanify/employee-profile?action=genealogy-chain&employeeId=${empId}`);
      const json = await res.json();
      if (json.success) {
        setChain(json.data);
        setEditSupervisor(json.data.employee.supervisorId || '');
        setEditRole(json.data.employee.workRole || 'STAFF');
      }
    } catch {
      showToast?.('error', 'Gagal memuat rantai komando');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (mode === 'tree') loadTree();
    else if (employeeId) {
      loadChain(employeeId);
      // Load flat list for supervisor dropdown in chain mode
      fetch('/api/humanify/employee-profile?action=genealogy')
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setFlat((json.data.flat || []).map((r: Record<string, unknown>) => ({
              id: String(r.id),
              employeeId: String(r.employee_id || ''),
              name: String(r.name || ''),
              position: String(r.position || ''),
              department: String(r.department || ''),
              departmentLabel: getDepartmentLabel(r.department as string),
              branchName: String(r.branch_name || ''),
              branchId: r.branch_id ? String(r.branch_id) : null,
              workRole: (r.work_role as WorkRole) || 'STAFF',
              workRoleLabel: WORK_ROLE_LABELS[(r.work_role as WorkRole) || 'STAFF'],
              status: String(r.status || 'ACTIVE'),
              supervisorId: r.supervisor_id ? String(r.supervisor_id) : null,
              supervisorName: r.supervisor_name ? String(r.supervisor_name) : null,
              directReportCount: parseInt(String(r.direct_report_count || 0), 10),
            })));
          }
        })
        .catch(() => {});
    }
  }, [mode, employeeId, loadTree, loadChain]);

  useEffect(() => {
    setSelectedId(employeeId);
  }, [employeeId]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectEmployee?.(id);
  };

  const saveSupervisor = async () => {
    if (!employeeId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/humanify/employee-profile?action=update-supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          supervisorId: editSupervisor || null,
          workRole: editRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast?.('success', 'Rantai komando berhasil diperbarui');
        loadChain(employeeId);
      } else {
        showToast?.('error', json.error || 'Gagal memperbarui');
      }
    } catch {
      showToast?.('error', 'Gagal memperbarui atasan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Memuat genealogi karyawan...
      </div>
    );
  }

  if (mode === 'chain' && chain) {
    return (
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Level Atasan', value: chain.managers.length, icon: ArrowUp, color: 'text-purple-600 bg-purple-50' },
            { label: 'Bawahan Langsung', value: chain.directReports.length, icon: ArrowDown, color: 'text-violet-600 bg-violet-50' },
            { label: 'Total Bawahan', value: chain.totalReportsCount, icon: Users, color: 'text-green-600 bg-green-50' },
            { label: 'Peran', value: chain.employee.workRoleLabel, icon: User, color: 'text-amber-600 bg-amber-50' },
          ].map((card, i) => (
            <div key={i} className="bg-gray-50 rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${card.color}`}><card.icon className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] text-gray-500">{card.label}</p>
                  <p className="text-sm font-bold text-gray-800">{card.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chain visualization */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <ArrowUp className="w-3.5 h-3.5" /> Rantai Atasan
          </h4>
          {chain.managers.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">Tidak ada atasan — posisi puncak organisasi</p>
          ) : (
            <div className="space-y-2">
              {[...chain.managers].reverse().map((mgr, idx) => (
                <div key={mgr.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-16 text-right">L{chain.managers.length - idx}</span>
                  <div className="flex-1 opacity-90" style={{ marginLeft: idx * 8 }}>
                    <EmployeeCard emp={mgr} onClick={() => handleSelect(mgr.id)} compact />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current employee */}
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-violet-200" />
          <h4 className="text-xs font-semibold text-violet-600 uppercase tracking-wide flex items-center gap-1 mb-2">
            <User className="w-3.5 h-3.5" /> Karyawan Saat Ini
          </h4>
          <EmployeeCard emp={chain.employee} highlight />
        </div>

        {/* Direct reports */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
            <ArrowDown className="w-3.5 h-3.5" /> Bawahan Langsung ({chain.directReports.length})
          </h4>
          {chain.directReports.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">Tidak memiliki bawahan langsung</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {chain.directReports.map((rep) => (
                <EmployeeCard key={rep.id} emp={rep} onClick={() => handleSelect(rep.id)} compact />
              ))}
            </div>
          )}
        </div>

        {/* Edit supervisor */}
        {canEdit && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4" /> Ubah Atasan & Peran
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Atasan Langsung</label>
                <select
                  value={editSupervisor}
                  onChange={(e) => setEditSupervisor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">— Tidak ada (Puncak) —</option>
                  {flat
                    .filter((e) => e.id !== employeeId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.position})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Peran dalam Hierarki</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as WorkRole)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{WORK_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={saveSupervisor}
              disabled={saving}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Tree mode
  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Karyawan', value: stats.totalEmployees, icon: Users },
            { label: 'Puncak Org', value: stats.roots, icon: Network },
            { label: 'Eksekutif', value: stats.byRole.EXECUTIVE, icon: User },
            { label: 'Manajer', value: stats.byRole.MANAGER, icon: Building2 },
            { label: 'Supervisor+Staf', value: stats.byRole.SUPERVISOR + stats.byRole.STAFF, icon: GitBranch },
          ].map((card, i) => (
            <div key={i} className="bg-gray-50 rounded-xl border p-3 text-center">
              <card.icon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-800">{card.value}</p>
              <p className="text-[10px] text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-600" /> Pohon Rantai Komando
        </h3>
        <button
          type="button"
          onClick={loadTree}
          className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {tree.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Belum ada data hierarki karyawan</p>
      ) : (
        <div className="space-y-2">
          {tree.map((root) => (
            <TreeNode
              key={root.id}
              node={root}
              depth={0}
              expanded={expanded}
              toggleExpand={toggleExpand}
              onSelect={handleSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}

      {selectedId && onSelectEmployee && (
        <div className="border-t pt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onSelectEmployee(selectedId)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-violet-300 text-violet-600 rounded-lg hover:bg-violet-50"
          >
            <Eye className="w-4 h-4" /> Lihat Detail Karyawan
          </button>
        </div>
      )}
    </div>
  );
}
