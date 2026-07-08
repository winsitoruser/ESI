import { useState, useEffect, Component, type ReactNode } from 'react';
import {
  Building2, ChevronDown, ChevronRight, Edit, Plus, Trash2, Users, User,
} from 'lucide-react';

export interface OrgNode {
  id: string;
  name: string;
  code?: string;
  level?: number;
  parent_id?: string | null;
  sort_order?: number;
  head_employee_id?: string | null;
  head_name?: string;
  head_position?: string;
  employee_count?: number | string;
  description?: string;
  children?: OrgNode[];
}

interface OrgChartTreeProps {
  nodes: OrgNode[];
  onAddChild: (parentId: string, parentLevel: number) => void;
  onEdit: (node: OrgNode) => void;
  onDelete: (id: string, name: string) => void;
  defaultExpanded?: boolean;
}

const LEVEL_THEMES = [
  { gradient: 'from-indigo-600 to-blue-600', accent: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' },
  { gradient: 'from-violet-600 to-purple-600', accent: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
  { gradient: 'from-blue-600 to-cyan-600', accent: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  { gradient: 'from-emerald-600 to-teal-600', accent: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  { gradient: 'from-amber-500 to-orange-500', accent: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
];

function themeForLevel(level: number) {
  return LEVEL_THEMES[Math.min(Math.max(level, 0), LEVEL_THEMES.length - 1)];
}

function collectIds(list: OrgNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (items: OrgNode[]) => {
    items.forEach((n) => {
      if (n.id) ids.add(String(n.id));
      if (n.children?.length) walk(n.children);
    });
  };
  walk(list);
  return ids;
}

function OrgUnitCard({
  node,
  depth,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: OrgNode;
  depth: number;
  onAddChild: (parentId: string, parentLevel: number) => void;
  onEdit: (node: OrgNode) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const theme = themeForLevel(node.level ?? depth);
  const empCount = parseInt(String(node.employee_count || 0), 10) || 0;
  const label = node.head_name || node.name || '?';
  const initials = label.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all w-[220px] sm:w-[240px] ${theme.accent}`}>
      <div className={`h-1.5 rounded-t-xl bg-gradient-to-r ${theme.gradient}`} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white shrink-0`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{node.name || 'Unit'}</p>
              {node.code && <span className="text-[10px] font-mono text-gray-400">{node.code}</span>}
            </div>
          </div>
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${theme.badge}`}>
            L{node.level ?? depth}
          </span>
        </div>

        {node.head_name ? (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{node.head_name}</p>
              <p className="text-[10px] text-gray-400 truncate">{node.head_position || 'Kepala Unit'}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg mb-2 text-[10px] text-gray-400">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Belum ada kepala unit</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            empCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <Users className="w-3 h-3" />
            {empCount} karyawan
          </span>
          <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddChild(String(node.id), (node.level ?? depth) + 1); }}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="Tambah sub-unit"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(String(node.id), node.name || 'Unit'); }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Hapus"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartBranch({
  node,
  depth,
  expanded,
  toggleExpand,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: OrgNode;
  depth: number;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onAddChild: (parentId: string, parentLevel: number) => void;
  onEdit: (node: OrgNode) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const nodeId = String(node.id);
  const isExpanded = expanded.has(nodeId);

  return (
    <li className="flex flex-col items-center list-none">
      {hasChildren && (
        <button
          type="button"
          onClick={() => toggleExpand(nodeId)}
          className="mb-1 p-0.5 rounded hover:bg-gray-100 text-gray-400"
          aria-label={isExpanded ? 'Tutup' : 'Buka'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      )}
      <OrgUnitCard
        node={node}
        depth={depth}
        onAddChild={onAddChild}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center w-full mt-0">
          <div className="w-px h-5 bg-gray-300" />
          <ul className="flex flex-wrap justify-center items-start gap-x-4 gap-y-6 pt-1 list-none p-0 m-0">
            {children.map((child) => (
              <ChartBranch
                key={String(child.id)}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                toggleExpand={toggleExpand}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

class OrgChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-8 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          Gagal merender bagan organisasi. Gunakan tampilan Daftar atau muat ulang halaman.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function OrgChartTree({
  nodes,
  onAddChild,
  onEdit,
  onDelete,
  defaultExpanded = true,
}: OrgChartTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => (
    defaultExpanded ? collectIds(nodes) : new Set(nodes.map((n) => String(n.id)))
  ));

  useEffect(() => {
    if (defaultExpanded) setExpanded(collectIds(nodes));
  }, [nodes, defaultExpanded]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(collectIds(nodes));
  const collapseAll = () => setExpanded(new Set(nodes.map((n) => String(n.id))));

  if (!nodes.length) return null;

  return (
    <OrgChartErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={expandAll} className="text-xs px-2.5 py-1 border rounded-lg hover:bg-gray-50 text-gray-600">
            Buka Semua
          </button>
          <button type="button" onClick={collapseAll} className="text-xs px-2.5 py-1 border rounded-lg hover:bg-gray-50 text-gray-600">
            Tutup Semua
          </button>
        </div>
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <ul className="flex flex-wrap justify-center items-start gap-x-4 gap-y-6 min-w-0 list-none p-0 m-0">
            {nodes.map((node) => (
              <ChartBranch
                key={String(node.id)}
                node={node}
                depth={0}
                expanded={expanded}
                toggleExpand={toggleExpand}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </div>
      </div>
    </OrgChartErrorBoundary>
  );
}
