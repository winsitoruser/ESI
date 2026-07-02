import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from '@/lib/i18n';
import HQLayout from '../../../components/hq/HQLayout';
import { toast } from 'react-hot-toast';
import {
  Briefcase, Plus, Search, Eye, Trash2, BarChart3, TrendingUp, TrendingDown,
  AlertTriangle, FileText, Loader2, Calendar, Users, DollarSign, Activity,
  ClipboardList, Flag, Timer, ListTodo, CheckCircle2, XCircle, Clock,
  ArrowUpRight, ArrowDownRight, Target, Zap, PieChart, GitBranch, Shield,
  ChevronRight, Download, RefreshCw, Layers, Hash, Award, Percent, Edit3,
  Building2, Truck, Package, FileSpreadsheet, Rocket
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, Legend, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, ComposedChart
} from 'recharts';
import EmployeePicker from '../../../components/projectManagement/EmployeePicker';
import LookupPicker from '../../../components/projectManagement/LookupPicker';
import GanttChart from '../../../components/projectManagement/GanttChart';
import CalendarView from '../../../components/projectManagement/CalendarView';
import WorkloadHeatmap from '../../../components/projectManagement/WorkloadHeatmap';
import EVMPanel from '../../../components/projectManagement/EVMPanel';

type TabType = 'dashboard' | 'projects' | 'tasks' | 'milestones' | 'timesheets' | 'resources' | 'risks' | 'budgets' | 'documents' | 'gantt' | 'calendar' | 'workload' | 'sprints' | 'evm';

const SC: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700', completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700', todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-yellow-100 text-yellow-700', review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700', blocked: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700', draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  identified: 'bg-blue-100 text-blue-700', mitigating: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', accepted: 'bg-gray-100 text-gray-700',
};
const PC: Record<string, string> = { low: 'bg-gray-100 text-gray-600', normal: 'bg-blue-100 text-blue-600', high: 'bg-orange-100 text-orange-600', urgent: 'bg-red-100 text-red-600', critical: 'bg-red-200 text-red-800' };
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const DOUGHNUT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];
const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => { if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`; if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}Jt`; return fmt(n); };
const pctChange = (cur: number, prev: number) => prev === 0 ? 0 : ((cur - prev) / prev * 100);

// Mock data for charts when API data isn't available
const MOCK_BUDGET_TREND = [
  { month: 'Jan', planned: 120, actual: 95, committed: 110 },
  { month: 'Feb', planned: 250, actual: 210, committed: 235 },
  { month: 'Mar', planned: 380, actual: 340, committed: 360 },
  { month: 'Apr', planned: 520, actual: 480, committed: 500 },
  { month: 'Mei', planned: 680, actual: 610, committed: 650 },
  { month: 'Jun', planned: 850, actual: 760, committed: 820 },
];
const MOCK_TASK_DISTRIBUTION = [
  { name: 'To Do', value: 12, color: '#6B7280' },
  { name: 'In Progress', value: 18, color: '#F59E0B' },
  { name: 'Review', value: 6, color: '#8B5CF6' },
  { name: 'Done', value: 24, color: '#10B981' },
  { name: 'Blocked', value: 3, color: '#EF4444' },
];
const MOCK_RESOURCE_ALLOCATION = [
  { name: 'Development', allocated: 85, capacity: 100 },
  { name: 'Design', allocated: 60, capacity: 80 },
  { name: 'QA Testing', allocated: 45, capacity: 60 },
  { name: 'Operations', allocated: 90, capacity: 95 },
  { name: 'Management', allocated: 40, capacity: 50 },
];
const MOCK_RISK_MATRIX: { prob: string; impact: string; count: number; level: string }[] = [
  { prob: 'Very High', impact: 'Low', count: 1, level: 'medium' },
  { prob: 'Very High', impact: 'Medium', count: 2, level: 'high' },
  { prob: 'Very High', impact: 'High', count: 1, level: 'critical' },
  { prob: 'Very High', impact: 'Very High', count: 0, level: 'critical' },
  { prob: 'High', impact: 'Low', count: 2, level: 'low' },
  { prob: 'High', impact: 'Medium', count: 3, level: 'medium' },
  { prob: 'High', impact: 'High', count: 2, level: 'high' },
  { prob: 'High', impact: 'Very High', count: 1, level: 'critical' },
  { prob: 'Medium', impact: 'Low', count: 3, level: 'low' },
  { prob: 'Medium', impact: 'Medium', count: 4, level: 'medium' },
  { prob: 'Medium', impact: 'High', count: 2, level: 'medium' },
  { prob: 'Medium', impact: 'Very High', count: 1, level: 'high' },
  { prob: 'Low', impact: 'Low', count: 5, level: 'low' },
  { prob: 'Low', impact: 'Medium', count: 3, level: 'low' },
  { prob: 'Low', impact: 'High', count: 1, level: 'medium' },
  { prob: 'Low', impact: 'Very High', count: 0, level: 'medium' },
];
const MOCK_WEEKLY_HOURS = [
  { week: 'W1', hours: 320, target: 400 },
  { week: 'W2', hours: 380, target: 400 },
  { week: 'W3', hours: 410, target: 400 },
  { week: 'W4', hours: 350, target: 400 },
  { week: 'W5', hours: 420, target: 400 },
  { week: 'W6', hours: 390, target: 400 },
];
const MOCK_PROJECT_HEALTH = [
  { subject: 'Jadwal', A: 75, fullMark: 100 },
  { subject: 'Anggaran', A: 82, fullMark: 100 },
  { subject: 'Kualitas', A: 90, fullMark: 100 },
  { subject: 'Risiko', A: 65, fullMark: 100 },
  { subject: 'Sumber Daya', A: 70, fullMark: 100 },
  { subject: 'Stakeholder', A: 88, fullMark: 100 },
];
const MATRIX_LEVEL_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-medium">{typeof p.value === 'number' ? p.value.toLocaleString('id-ID') : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color, trend, trendValue }: any) => (
  <div className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500">{title}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5 text-white" /></div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <div className="flex items-center gap-2 mt-1">
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      {trend && (
        <span className={`text-xs font-medium flex items-center gap-0.5 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendValue}
        </span>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm border p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const KPIGauge = ({ label, value, target, unit = '%', targetWord = 'Target' }: { label: string; value: number; target: number; unit?: string; targetWord?: string }) => {
  const pct = Math.min((value / target) * 100, 100);
  const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'} strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${color}`}>{value}{unit}</span>
        </div>
      </div>
      <p className="text-xs text-gray-600 font-medium">{label}</p>
      <p className="text-[10px] text-gray-400">{targetWord}: {target}{unit}</p>
    </div>
  );
};

export default function ProjectManagementPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [resources, setResources] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [taskViewMode, setTaskViewMode] = useState<'table' | 'kanban'>('table');
  const [ganttData, setGanttData] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [evmData, setEvmData] = useState<any>(null);
  const [criticalPath, setCriticalPath] = useState<any>(null);

  const { t, formatDate } = useTranslation();
  const fD = (d: string | null) => (d ? formatDate(d, 'short') : '-');
  const trEnum = (raw: string) => {
    const out = t(`pjm.enums.${raw}`);
    return out.startsWith('pjm.enums.') ? raw : out;
  };

  const tabs = useMemo(() => [
    { id: 'dashboard', name: t('pjm.tabs.dashboard'), icon: BarChart3 },
    { id: 'projects', name: t('pjm.tabs.projects'), icon: Briefcase },
    { id: 'tasks', name: t('pjm.tabs.tasks'), icon: ListTodo },
    { id: 'gantt', name: t('pjm.tabs.gantt'), icon: GitBranch },
    { id: 'calendar', name: t('pjm.tabs.calendar'), icon: Calendar },
    { id: 'sprints', name: t('pjm.tabs.sprints'), icon: Rocket },
    { id: 'milestones', name: t('pjm.tabs.milestones'), icon: Flag },
    { id: 'timesheets', name: t('pjm.tabs.timesheets'), icon: Timer },
    { id: 'workload', name: t('pjm.tabs.workload'), icon: Users },
    { id: 'resources', name: t('pjm.tabs.resources'), icon: Layers },
    { id: 'risks', name: t('pjm.tabs.risks'), icon: AlertTriangle },
    { id: 'budgets', name: t('pjm.tabs.budgets'), icon: DollarSign },
    { id: 'evm', name: t('pjm.tabs.evm'), icon: Activity },
    { id: 'documents', name: t('pjm.tabs.documents'), icon: FileText },
  ], [t]);

  const mockTaskDistribution = useMemo(() => [
    { name: t('pjm.enums.taskStatus_todo'), value: 12, color: '#6B7280' },
    { name: t('pjm.enums.taskStatus_in_progress'), value: 18, color: '#F59E0B' },
    { name: t('pjm.enums.taskStatus_review'), value: 6, color: '#8B5CF6' },
    { name: t('pjm.enums.taskStatus_done'), value: 24, color: '#10B981' },
    { name: t('pjm.enums.taskStatus_blocked'), value: 3, color: '#EF4444' },
  ], [t]);

  const mockProjectHealth = useMemo(() => [
    { subject: t('pjm.common.health.schedule'), A: 75, fullMark: 100 },
    { subject: t('pjm.common.health.budget'), A: 82, fullMark: 100 },
    { subject: t('pjm.common.health.quality'), A: 90, fullMark: 100 },
    { subject: t('pjm.common.health.risk'), A: 65, fullMark: 100 },
    { subject: t('pjm.common.health.resource'), A: 70, fullMark: 100 },
    { subject: t('pjm.common.health.stakeholder'), A: 88, fullMark: 100 },
  ], [t]);

  const impactLabel = (i: string) =>
    i === 'Low' ? t('pjm.enums.matrixLow') : i === 'Medium' ? t('pjm.enums.matrixMedium') : i === 'High' ? t('pjm.enums.matrixHigh') : t('pjm.enums.matrixVeryHigh');
  const probLabel = (p: string) =>
    p === 'Very High' ? t('pjm.enums.matrixVeryHigh') : p === 'High' ? t('pjm.enums.matrixHigh') : p === 'Medium' ? t('pjm.enums.matrixMedium') : t('pjm.enums.matrixLow');

  useEffect(() => {
    setMounted(true);
    const tab = router.query.tab as string;
    if (tab && ['dashboard','projects','tasks','milestones','timesheets','resources','risks','budgets','documents','gantt','calendar','workload','sprints','evm'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [router.query.tab]);

  const fetchData = useCallback(async (tab: string) => {
    setLoading(true);
    try {
      // Map UI tab name -> API action
      const actionMap: Record<string, string> = {
        dashboard: 'dashboard',
        gantt: 'gantt',
        calendar: 'calendar',
        workload: 'workload',
        sprints: 'sprints',
        evm: 'evm',
      };
      const apiAction = actionMap[tab] || tab;
      const params = new URLSearchParams({ action: apiAction });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (selectedProjectId) params.set('projectId', selectedProjectId);
      const r = await fetch('/api/hq/project-management?' + params);
      const d = await r.json();
      if (!d.success) return;
      switch (tab) {
        case 'dashboard': setDashboard(d.data); break;
        case 'projects': setProjects(d.data.rows); setProjectTotal(d.data.total); break;
        case 'tasks': setTasks(d.data.rows); break;
        case 'milestones': setMilestones(d.data); break;
        case 'timesheets': setTimesheets(d.data.rows); setTotalHours(d.data.totalHours); break;
        case 'resources': setResources(d.data); break;
        case 'risks': setRisks(d.data); break;
        case 'budgets': setBudgets(d.data); break;
        case 'documents': setDocuments(d.data); break;
        case 'gantt': setGanttData(Array.isArray(d.data) ? d.data : (d.data?.items || [])); break;
        case 'calendar': setCalendarEvents(Array.isArray(d.data) ? d.data : (d.data?.events || [])); break;
        case 'workload': setWorkload(Array.isArray(d.data) ? d.data : (d.data?.rows || [])); break;
        case 'sprints': setSprints(Array.isArray(d.data) ? d.data : (d.data?.rows || [])); break;
        case 'evm': setEvmData(d.data); break;
      }
    } catch (e: any) { console.error(e); } finally { setLoading(false); }
  }, [statusFilter, searchTerm, selectedProjectId]);

  // Ensure projects list is available even on non-projects tabs (for pickers and EVM selector)
  useEffect(() => {
    if (!mounted) return;
    if (projects.length === 0) {
      fetch('/api/hq/project-management?action=projects').then(r => r.json()).then(d => {
        if (d.success) setProjects(d.data.rows || []);
      }).catch(() => {});
    }
  }, [mounted]); // eslint-disable-line

  useEffect(() => { if (mounted) fetchData(activeTab); }, [mounted, activeTab, fetchData]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/hq/project-management?action=${activeTab}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { toast.success(t('pjm.toast.created')); setShowCreateModal(false); setForm({}); fetchData(activeTab); }
      else toast.error(d.error?.message || t('pjm.toast.failed'));
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!confirm(t('pjm.common.confirmDelete'))) return;
    try {
      await fetch(`/api/hq/project-management?action=${table}&id=${id}`, { method: 'DELETE' });
      toast.success(t('pjm.toast.deleted')); fetchData(activeTab);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/hq/project-management?action=${activeTab}&id=${editingItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      const d = await r.json();
      if (d.success) { toast.success(t('pjm.toast.updated')); setShowEditModal(false); setEditingItem(null); setForm({}); fetchData(activeTab); }
      else toast.error(d.error?.message || t('pjm.toast.failedUpdate'));
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const openEdit = (item: any) => {
    let editForm: any = {};
    switch (activeTab) {
      case 'projects': editForm = { name: item.name, description: item.description, category: item.category, managerName: item.manager_name, managerEmployeeId: item.manager_employee_id, branchId: item.branch_id, branchName: item.branch_name, customerId: item.customer_id, clientName: item.client_name, priority: item.priority, budgetAmount: item.budget_amount, startDate: item.start_date, endDate: item.end_date, status: item.status, progressPercent: item.progress_percent }; break;
      case 'tasks': editForm = { name: item.name, description: item.description, priority: item.priority, assigneeName: item.assignee_name, assigneeEmployeeId: item.assignee_employee_id, startDate: item.start_date, dueDate: item.due_date, estimatedHours: item.estimated_hours, status: item.status, progressPercent: item.progress_percent, storyPoints: item.story_points }; break;
      case 'milestones': editForm = { name: item.name, description: item.description, dueDate: item.due_date, status: item.status }; break;
      case 'timesheets': editForm = { hoursWorked: item.hours_worked, description: item.description, status: item.status, billable: !!item.billable }; break;
      case 'risks': editForm = { title: item.title, description: item.description, probability: item.probability, impact: item.impact, status: item.status, mitigationPlan: item.mitigation_plan, ownerName: item.owner_name, ownerEmployeeId: item.owner_employee_id }; break;
      case 'resources': editForm = { resourceName: item.resource_name, resourceType: item.resource_type, role: item.role, allocationPercent: item.allocation_percent, costPerHour: item.cost_per_hour, startDate: item.start_date, endDate: item.end_date, hrisEmployeeId: item.hris_employee_id, fleetVehicleId: item.fleet_vehicle_id, inventoryItemId: item.inventory_item_id, quantity: item.quantity }; break;
      case 'budgets': editForm = { category: item.category, description: item.description, plannedAmount: item.planned_amount, actualAmount: item.actual_amount, purchaseOrderId: item.purchase_order_id, purchaseOrderNumber: item.purchase_order_number }; break;
      case 'documents': editForm = { title: item.title, documentType: item.document_type, description: item.description, fileUrl: item.file_url, version: item.version }; break;
      case 'sprints': editForm = { name: item.name, goal: item.goal, startDate: item.start_date, endDate: item.end_date, capacity: item.capacity, status: item.status }; break;
    }
    setEditingItem(item); setForm(editForm); setShowEditModal(true);
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await fetch(`/api/hq/project-management?action=tasks&id=${taskId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...(newStatus === 'done' ? { completedDate: new Date().toISOString().split('T')[0], progressPercent: 100 } : {}) })
      });
      toast.success(t('pjm.toast.statusChanged')); fetchData(activeTab);
    } catch (e: any) { toast.error(e.message); }
  };

  // Kanban grouped tasks
  const kanbanTasks = useMemo(() => {
    const cols = ['todo', 'in_progress', 'review', 'done', 'blocked'];
    const grouped: Record<string, any[]> = {};
    cols.forEach(c => { grouped[c] = []; });
    tasks.forEach(t => { const s = t.status || 'todo'; if (grouped[s]) grouped[s].push(t); else grouped['todo'].push(t); });
    return grouped;
  }, [tasks]);

  const Toolbar = ({ placeholder, statuses, createLabel }: { placeholder: string; statuses: { v: string; l: string }[]; createLabel: string }) => (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder={placeholder} value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData(activeTab)} />
      </div>
      {statuses.length > 0 && (
        <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">{t('pjm.common.allStatus')}</option>
          {statuses.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      )}
      {projects.length > 0 && activeTab !== 'projects' && (
        <select className="border rounded-lg px-3 py-2 text-sm" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
          <option value="">{t('pjm.common.allProjects')}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
        </select>
      )}
      <button onClick={() => { setForm(selectedProjectId ? { projectId: selectedProjectId } : {}); setShowCreateModal(true); }}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
        <Plus className="w-4 h-4" /> {createLabel}
      </button>
    </div>
  );

  const DataTable = ({ columns, data, onDelete, onEdit, onRowClick, tableName }: { columns: { key: string; label: string; render?: (v: any, row: any) => React.ReactNode }[]; data: any[]; onDelete?: string; onEdit?: boolean; onRowClick?: (row: any) => void; tableName?: string }) => (
    <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{columns.map(c => <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-600">{c.label}</th>)}{(onDelete || onEdit) && <th className="px-4 py-3 text-center font-medium text-gray-600">{t('pjm.common.actions')}</th>}</tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row, i) => (
            <tr key={row.id || i} className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
              {columns.map(c => <td key={c.key} className="px-4 py-3">{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '-')}</td>)}
              {(onDelete || onEdit) && <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center gap-1">
                  {onEdit && <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-blue-50 rounded" title={t('pjm.common.edit')}><Eye className="w-4 h-4 text-blue-500" /></button>}
                  {onDelete && <button onClick={() => handleDelete(onDelete, row.id)} className="p-1.5 hover:bg-red-50 rounded" title={t('pjm.common.delete')}><Trash2 className="w-4 h-4 text-red-400" /></button>}
                </div>
              </td>}
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={columns.length + ((onDelete || onEdit) ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">{t('pjm.common.noData')}</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const Badge = ({ value, colors }: { value: string; colors: Record<string, string> }) => {
    const out = t(`pjm.enums.${value}`);
    const label = out.startsWith('pjm.enums.') ? value : out;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-700'}`}>{label}</span>
    );
  };

  const Progress = ({ value }: { value: number }) => (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${value}%` }} /></div>
      <span className="text-xs">{value.toFixed(0)}%</span>
    </div>
  );

  if (!mounted) return null;

  return (
    <HQLayout title={t('pjm.title')} subtitle={t('pjm.subtitle')}>
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex overflow-x-auto px-4">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as TabType); setStatusFilter('all'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="w-4 h-4" />{tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-gray-500">{t('pjm.loading')}</span></div>
        ) : (<>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={t('pjm.common.statTotalProjects')} value={dashboard?.projectStats?.total || 8} sub={`${dashboard?.projectStats?.active || 5} ${t('pjm.common.subActive')}`} icon={Briefcase} color="bg-blue-500" trend="up" trendValue="+12%" />
                <StatCard title={t('pjm.common.statActiveTasks')} value={dashboard?.taskStats?.in_progress || 18} sub={`${dashboard?.taskStats?.overdue || 3} ${t('pjm.common.subLate')}`} icon={ListTodo} color="bg-yellow-500" trend="down" trendValue="2 overdue" />
                <StatCard title={t('pjm.common.statTotalBudget')} value={fmtShort(Number(dashboard?.projectStats?.total_budget || 2500000000))} sub={`${t('pjm.common.subActual')}: ${fmtShort(Number(dashboard?.projectStats?.total_actual_cost || 1800000000))}`} icon={DollarSign} color="bg-green-500" trend="up" trendValue={`72% ${t('pjm.common.subBudgetUsed')}`} />
                <StatCard title={t('pjm.common.statHighRisk')} value={dashboard?.riskStats?.high_risks || 4} sub={`${dashboard?.riskStats?.total || 16} ${t('pjm.common.subTotalRisks')}`} icon={AlertTriangle} color="bg-red-500" trend="down" trendValue={`-2 ${t('pjm.common.subTrendMonth')}`} />
              </div>

              {/* Task Status Pipeline */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[
                  [t('pjm.enums.taskStatus_todo'), dashboard?.taskStats?.todo || 12, 'bg-gray-100 text-gray-700', '📋'],
                  [t('pjm.enums.taskStatus_in_progress'), dashboard?.taskStats?.in_progress || 18, 'bg-yellow-100 text-yellow-700', '🔄'],
                  [t('pjm.enums.taskStatus_review'), dashboard?.taskStats?.review || 6, 'bg-purple-100 text-purple-700', '👀'],
                  [t('pjm.enums.taskStatus_done'), dashboard?.taskStats?.done || 24, 'bg-green-100 text-green-700', '✅'],
                  [t('pjm.enums.taskStatus_blocked'), dashboard?.taskStats?.blocked || 3, 'bg-red-100 text-red-700', '🚫'],
                  [t('pjm.enums.taskStatus_overdue'), dashboard?.taskStats?.overdue || 2, 'bg-red-200 text-red-800', '⏰']
                ].map(([l, v, c, icon]) => (
                  <div key={l as string} className={`${c} rounded-xl p-4 text-center border transition-transform hover:scale-105`}>
                    <p className="text-2xl font-bold">{v}</p>
                    <p className="text-xs font-medium mt-1">{l}</p>
                  </div>
                ))}
              </div>

              {/* KPI Gauges */}
              <ChartCard title={t('pjm.common.kpiProject')} subtitle={t('pjm.common.kpiProjectSub')}>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  <KPIGauge label={t('pjm.common.onTimeDelivery')} value={78} target={90} targetWord={t('pjm.common.target')} />
                  <KPIGauge label={t('pjm.common.budgetCompliance')} value={85} target={95} targetWord={t('pjm.common.target')} />
                  <KPIGauge label={t('pjm.common.quality')} value={92} target={90} targetWord={t('pjm.common.target')} />
                  <KPIGauge label={t('pjm.common.resourceUtil')} value={76} target={85} targetWord={t('pjm.common.target')} />
                  <KPIGauge label={t('pjm.common.taskCompletion')} value={68} target={80} targetWord={t('pjm.common.target')} />
                  <KPIGauge label={t('pjm.common.clientSatisfaction')} value={88} target={85} targetWord={t('pjm.common.target')} />
                </div>
              </ChartCard>

              {/* Charts Row 1: Area Chart + Doughnut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title={t('pjm.common.budgetTrendTitle')} subtitle={t('pjm.common.budgetTrendSub')} action={
                  <select className="text-xs border rounded-lg px-2 py-1 text-gray-500">
                    <option>{t('pjm.common.months.m6')}</option><option>{t('pjm.common.months.m12')}</option><option>{t('pjm.common.months.ytd')}</option>
                  </select>
                }>
                  <div className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dashboard?.budgetTrend || MOCK_BUDGET_TREND}>
                        <defs>
                          <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradCommitted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                        <RTooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Area type="monotone" dataKey="planned" name={t('pjm.common.chartPlanned')} stroke="#3B82F6" fill="url(#gradPlanned)" strokeWidth={2} />
                        <Area type="monotone" dataKey="actual" name={t('pjm.common.chartActual')} stroke="#10B981" fill="url(#gradActual)" strokeWidth={2} />
                        <Area type="monotone" dataKey="committed" name={t('pjm.common.chartCommitted')} stroke="#F59E0B" fill="url(#gradCommitted)" strokeWidth={2} strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title={t('pjm.common.taskDistTitle')} subtitle={t('pjm.common.taskDistSub')}>
                  <ResponsiveContainer width="100%" height={280}>
                    <RPieChart>
                      <Pie data={dashboard?.taskDistribution || mockTaskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {(dashboard?.taskDistribution || mockTaskDistribution).map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.color || DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip />
                    </RPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {(dashboard?.taskDistribution || mockTaskDistribution).map((d: any, i: number) => (
                      <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color || DOUGHNUT_COLORS[i] }} />
                        {d.name}: {d.value}
                      </span>
                    ))}
                  </div>
                </ChartCard>
              </div>

              {/* Charts Row 2: Weekly Hours + Resource Allocation + Project Health Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title={t('pjm.common.weeklyHoursTitle')} subtitle={t('pjm.common.weeklyHoursSub')}>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={dashboard?.weeklyHours || MOCK_WEEKLY_HOURS}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <RTooltip content={<CustomTooltip />} />
                      <Bar dataKey="hours" name={t('pjm.common.chartHoursActual')} fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                      <Line type="monotone" dataKey="target" name={t('pjm.common.chartTarget')} stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t('pjm.common.resourceAllocTitle')} subtitle={t('pjm.common.resourceAllocSub')}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dashboard?.resourceAllocation || MOCK_RESOURCE_ALLOCATION} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} stroke="#9CA3AF" />
                      <RTooltip content={<CustomTooltip />} />
                      <Bar dataKey="allocated" name={t('pjm.common.chartUsed')} fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={14} />
                      <Bar dataKey="capacity" name={t('pjm.common.chartCapacity')} fill="#E5E7EB" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t('pjm.common.healthTitle')} subtitle={t('pjm.common.healthSub')}>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dashboard?.projectHealth || mockProjectHealth}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name={t('pjm.common.chartScore')} dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Risk Matrix */}
              <ChartCard title={t('pjm.common.riskMatrixTitle')} subtitle={t('pjm.common.riskMatrixSub')}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 text-xs font-medium text-gray-500 border w-24">{t('pjm.common.probImpact')}</th>
                        {['Low', 'Medium', 'High', 'Very High'].map(h => (
                          <th key={h} className="p-2 text-xs font-medium text-gray-600 border text-center">{impactLabel(h)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['Very High', 'High', 'Medium', 'Low'].map(prob => (
                        <tr key={prob}>
                          <td className="p-2 text-xs font-medium text-gray-600 border bg-gray-50">{probLabel(prob)}</td>
                          {['Low', 'Medium', 'High', 'Very High'].map(impact => {
                            const cell = (dashboard?.riskMatrix || MOCK_RISK_MATRIX).find((r: any) => r.prob === prob && r.impact === impact);
                            const level = cell?.level || 'low';
                            return (
                              <td key={impact} className={`p-3 border text-center ${MATRIX_LEVEL_COLORS[level]}`}>
                                <span className="text-lg font-bold">{cell?.count || 0}</span>
                                <p className="text-[10px] capitalize mt-0.5">{t(`pjm.common.riskLevel.${level}`)}</p>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-4 mt-3 justify-center">
                    {Object.entries(MATRIX_LEVEL_COLORS).map(([level, cls]) => (
                      <span key={level} className={`text-xs px-2 py-1 rounded border ${cls} capitalize`}>{t(`pjm.common.riskLevel.${level}`)}</span>
                    ))}
                  </div>
                </div>
              </ChartCard>

              {/* Recent Projects Table */}
              <ChartCard title={t('pjm.common.recentProjectsTitle')} subtitle={t('pjm.common.recentProjectsSub')}>
                <DataTable columns={[
                  { key: 'project_code', label: t('pjm.common.columns.code'), render: v => <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{v}</span> },
                  { key: 'name', label: t('pjm.common.columns.projectName'), render: (v, r) => <><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.manager_name || '-'}</p></> },
                  { key: 'status', label: t('pjm.common.columns.status'), render: v => <Badge value={v} colors={SC} /> },
                  { key: 'progress_percent', label: t('pjm.common.progress'), render: v => <Progress value={Number(v || 0)} /> },
                  { key: 'budget_amount', label: t('pjm.common.columns.budgetCol'), render: v => fmtShort(Number(v || 0)) },
                  { key: 'end_date', label: t('pjm.common.deadline'), render: v => fD(v) },
                ]} data={dashboard?.recentProjects || []} />
              </ChartCard>
            </div>
          )}

          {activeTab === 'projects' && (<div className="space-y-5">
            {/* Project Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: t('pjm.common.prjSummary.total'), count: projectTotal || projects.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: trEnum('active'), count: projects.filter(p => p.status === 'active').length, color: 'bg-green-50 text-green-700 border-green-200' },
                { label: trEnum('planning'), count: projects.filter(p => p.status === 'planning').length, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                { label: trEnum('on_hold'), count: projects.filter(p => p.status === 'on_hold').length, color: 'bg-orange-50 text-orange-700 border-orange-200' },
                { label: t('pjm.common.prjSummary.done'), count: projects.filter(p => p.status === 'completed').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map(s => (
                <div key={s.label} className={`${s.color} border rounded-xl p-3 text-center`}>
                  <p className="text-xl font-bold">{s.count}</p>
                  <p className="text-xs font-medium">{s.label}</p>
                </div>
              ))}
            </div>
            <Toolbar placeholder={t('pjm.common.searchProjects')} statuses={[{v:'planning',l:trEnum('planning')},{v:'active',l:trEnum('active')},{v:'on_hold',l:trEnum('on_hold')},{v:'completed',l:trEnum('completed')},{v:'cancelled',l:trEnum('cancelled')}]} createLabel={t('pjm.common.createProject')} />
            {/* Project Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map(p => {
                const budgetPct = p.budget_amount ? Math.round((Number(p.actual_cost || 0) / Number(p.budget_amount)) * 100) : 0;
                const isOverBudget = budgetPct > 100;
                return (
                  <div key={p.id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col cursor-pointer" onClick={() => router.push(`/hq/project-management/${p.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.project_code}</span>
                          <Badge value={p.priority} colors={PC} />
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{p.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{p.category || '-'} &bull; {p.manager_name || '-'}</p>
                      </div>
                      <Badge value={p.status} colors={SC} />
                    </div>
                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{t('pjm.common.progress')}</span><span className="font-medium">{Number(p.progress_percent || 0).toFixed(0)}%</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-full rounded-full transition-all ${Number(p.progress_percent || 0) >= 80 ? 'bg-green-500' : Number(p.progress_percent || 0) >= 40 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(Number(p.progress_percent || 0), 100)}%` }} />
                      </div>
                    </div>
                    {/* Budget */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{t('pjm.common.budget')}</span><span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-700'}`}>{budgetPct}%</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>{fmtShort(Number(p.actual_cost || 0))}</span>
                        <span>{fmtShort(Number(p.budget_amount || 0))}</span>
                      </div>
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fD(p.start_date)}</span>
                        <span className="flex items-center gap-1"><ListTodo className="w-3 h-3" />{p.completed_task_count || 0}/{p.task_count || 0}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete('projects', p.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">{t('pjm.common.noProjects')}</div>}
            </div>
          </div>)}

          {activeTab === 'tasks' && (<div className="space-y-5">
            {/* Task Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: 'todo', label: t('pjm.enums.todo'), count: tasks.filter(t => t.status === 'todo').length, color: 'bg-gray-50 text-gray-700 border-gray-200' },
                { key: 'in_progress', label: t('pjm.enums.in_progress'), count: tasks.filter(t => t.status === 'in_progress').length, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                { key: 'review', label: t('pjm.enums.review'), count: tasks.filter(t => t.status === 'review').length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { key: 'done', label: t('pjm.enums.done'), count: tasks.filter(t => t.status === 'done').length, color: 'bg-green-50 text-green-700 border-green-200' },
                { key: 'blocked', label: t('pjm.enums.blocked'), count: tasks.filter(t => t.status === 'blocked').length, color: 'bg-red-50 text-red-700 border-red-200' },
              ].map(s => (
                <div key={s.key} className={`${s.color} border rounded-xl p-3 text-center cursor-pointer hover:shadow-sm transition-shadow`} onClick={() => setStatusFilter(s.key)}>
                  <p className="text-xl font-bold">{s.count}</p>
                  <p className="text-xs font-medium">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Toolbar placeholder={t('pjm.common.searchTasks')} statuses={[{v:'todo',l:trEnum('todo')},{v:'in_progress',l:trEnum('in_progress')},{v:'review',l:trEnum('review')},{v:'done',l:trEnum('done')},{v:'blocked',l:trEnum('blocked')}]} createLabel={t('pjm.common.createTask')} />
              <div className="flex items-center gap-1 ml-3 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setTaskViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${taskViewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><ListTodo className="w-4 h-4" /></button>
                <button onClick={() => setTaskViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${taskViewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><Layers className="w-4 h-4" /></button>
              </div>
            </div>

            {taskViewMode === 'table' ? (
              <DataTable columns={[
                { key: 'task_code', label: t('pjm.common.columns.code'), render: v => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{v}</span> },
                { key: 'name', label: t('pjm.common.columns.task'), render: (v, r) => <><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.project_name}</p></> },
                { key: 'status', label: t('pjm.common.columns.status'), render: v => <Badge value={v} colors={SC} /> },
                { key: 'priority', label: t('pjm.common.columns.priority'), render: v => <Badge value={v} colors={PC} /> },
                { key: 'assignee_name', label: t('pjm.common.columns.assignee'), render: v => v ? <span className="inline-flex items-center gap-1"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">{v.charAt(0).toUpperCase()}</span><span className="text-sm">{v}</span></span> : <span className="text-gray-400">-</span> },
                { key: 'due_date', label: t('pjm.common.deadline'), render: (v) => { const d = v ? new Date(v) : null; const isOverdue = d && d < new Date(); return <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : ''}`}>{fD(v)}{isOverdue ? ' !' : ''}</span>; } },
                { key: 'progress_percent', label: t('pjm.common.progress'), render: v => <Progress value={Number(v || 0)} /> },
                { key: 'estimated_hours', label: t('pjm.common.columns.hours'), render: (v, r) => <span className="text-xs"><span className="font-medium">{Number(r.actual_hours || 0).toFixed(1)}</span>/{Number(v || 0).toFixed(1)}h</span> },
              ]} data={tasks} onDelete="tasks" onEdit={true} />
            ) : (
              /* KANBAN BOARD */
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '55vh' }}>
                {[
                  { id: 'todo', label: t('pjm.enums.todo'), borderColor: 'border-t-gray-400', bg: 'bg-gray-50' },
                  { id: 'in_progress', label: t('pjm.enums.in_progress'), borderColor: 'border-t-yellow-400', bg: 'bg-yellow-50' },
                  { id: 'review', label: t('pjm.enums.review'), borderColor: 'border-t-purple-400', bg: 'bg-purple-50' },
                  { id: 'done', label: t('pjm.enums.done'), borderColor: 'border-t-green-400', bg: 'bg-green-50' },
                  { id: 'blocked', label: t('pjm.enums.blocked'), borderColor: 'border-t-red-400', bg: 'bg-red-50' },
                ].map(col => (
                  <div key={col.id} className={`flex-shrink-0 w-72 ${col.bg} rounded-xl border-t-4 ${col.borderColor} border flex flex-col`}>
                    <div className="px-4 py-3 flex items-center justify-between border-b">
                      <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
                      <span className="bg-white text-xs font-bold text-gray-500 px-2 py-0.5 rounded-full shadow-sm">{kanbanTasks[col.id]?.length || 0}</span>
                    </div>
                    <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(55vh - 52px)' }}>
                      {(kanbanTasks[col.id] || []).map((task: any) => (
                        <div key={task.id} className="bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                          <div className="flex items-start justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-gray-400">{task.task_code}</span>
                            <select className="text-[10px] bg-transparent border rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              value={task.status} onChange={e => { e.stopPropagation(); handleTaskStatusChange(task.id, e.target.value); }}
                              onClick={e => e.stopPropagation()}>
                              <option value="todo">{trEnum('todo')}</option><option value="in_progress">{trEnum('in_progress')}</option><option value="review">{trEnum('review')}</option><option value="done">{trEnum('done')}</option><option value="blocked">{trEnum('blocked')}</option>
                            </select>
                          </div>
                          <p className="text-sm font-medium text-gray-800 mb-1.5 line-clamp-2">{task.name}</p>
                          <p className="text-[11px] text-gray-400 mb-2">{task.project_name}</p>
                          <div className="flex items-center justify-between">
                            <Badge value={task.priority || 'normal'} colors={PC} />
                            {task.due_date && <span className={`text-[10px] flex items-center gap-0.5 ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}><Calendar className="w-3 h-3" />{fD(task.due_date)}</span>}
                          </div>
                          {task.assignee_name && (
                            <div className="mt-2 pt-2 border-t flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">{task.assignee_name.charAt(0).toUpperCase()}</span>
                              <span className="text-[11px] text-gray-500">{task.assignee_name}</span>
                            </div>
                          )}
                          {Number(task.progress_percent) > 0 && <div className="mt-1.5"><Progress value={Number(task.progress_percent)} /></div>}
                        </div>
                      ))}
                      {(kanbanTasks[col.id] || []).length === 0 && <div className="text-center py-8 text-gray-300 text-xs">{t('pjm.common.noTasks')}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>)}

          {activeTab === 'milestones' && (<div className="space-y-5">
            {/* Milestone Timeline Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                <p className="text-xl font-bold text-yellow-700">{milestones.filter(m => m.status === 'pending').length}</p>
                <p className="text-xs text-yellow-600">{t('pjm.common.msSummary.pending')}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <Activity className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <p className="text-xl font-bold text-blue-700">{milestones.filter(m => m.status === 'in_progress').length}</p>
                <p className="text-xs text-blue-600">{t('pjm.common.msSummary.inProgress')}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-xl font-bold text-green-700">{milestones.filter(m => m.status === 'completed').length}</p>
                <p className="text-xs text-green-600">{t('pjm.common.msSummary.completed')}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto text-red-600 mb-1" />
                <p className="text-xl font-bold text-red-700">{milestones.filter(m => m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed').length}</p>
                <p className="text-xs text-red-600">{t('pjm.common.msSummary.overdue')}</p>
              </div>
            </div>
            <Toolbar placeholder={t('pjm.common.searchMilestones')} statuses={[{v:'pending',l:trEnum('pending')},{v:'in_progress',l:trEnum('in_progress')},{v:'completed',l:trEnum('completed')}]} createLabel={t('pjm.common.createMilestone')} />
            {/* Milestone Cards */}
            <div className="space-y-3">
              {milestones.map((m, idx) => {
                const isOverdue = m.due_date && new Date(m.due_date) < new Date() && m.status !== 'completed';
                const taskPct = m.task_count ? Math.round(((m.done_count || 0) / m.task_count) * 100) : 0;
                return (
                  <div key={m.id || idx} className={`bg-white rounded-xl border ${isOverdue ? 'border-red-300 bg-red-50/30' : ''} shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === 'completed' ? 'bg-green-100' : m.status === 'in_progress' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Flag className={`w-5 h-5 ${m.status === 'completed' ? 'text-green-600' : m.status === 'in_progress' ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                        <Badge value={m.status} colors={SC} />
                        {isOverdue && <span className="text-xs text-red-600 font-medium">{t('pjm.common.overdue')}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{m.project_name} &bull; {t('pjm.common.deadline')}: {fD(m.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-sm font-medium">{m.done_count || 0}/{m.task_count || 0}</p>
                        <p className="text-[10px] text-gray-400">{t('pjm.common.columns.task')}</p>
                      </div>
                      <div className="w-20">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${taskPct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-0.5">{taskPct}%</p>
                      </div>
                      <button onClick={() => handleDelete('milestones', m.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                );
              })}
              {milestones.length === 0 && <div className="text-center py-12 text-gray-400">{t('pjm.common.noMilestones')}</div>}
            </div>
          </div>)}

          {activeTab === 'timesheets' && (<div className="space-y-5">
            {/* Timesheet Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title={t('pjm.common.totalHours')} value={`${totalHours.toFixed(1)}h`} sub={`${timesheets.length} ${t('pjm.common.entries')}`} icon={Clock} color="bg-blue-500" />
              <StatCard title={t('pjm.common.hoursToday')} value={`${timesheets.filter(t => t.work_date === new Date().toISOString().split('T')[0]).reduce((s, t) => s + Number(t.hours_worked || 0), 0).toFixed(1)}h`} icon={Timer} color="bg-green-500" />
              <StatCard title={t('pjm.common.approved')} value={timesheets.filter(t => t.status === 'approved').length} sub={`${timesheets.filter(t => t.status === 'submitted').length} ${t('pjm.common.waiting')}`} icon={CheckCircle2} color="bg-emerald-500" />
              <StatCard title={t('pjm.common.totalCost')} value={fmtShort(timesheets.reduce((s, t) => s + Number(t.total_cost || 0), 0))} icon={DollarSign} color="bg-purple-500" />
            </div>
            <Toolbar placeholder={t('pjm.common.searchTimesheets')} statuses={[{v:'draft',l:trEnum('draft')},{v:'submitted',l:trEnum('submitted')},{v:'approved',l:trEnum('approved')},{v:'rejected',l:trEnum('rejected')}]} createLabel={t('pjm.common.inputTimesheet')} />
            <DataTable columns={[
              { key: 'employee_name', label: t('pjm.common.columns.employee'), render: v => v ? <span className="inline-flex items-center gap-1.5"><span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">{v.charAt(0).toUpperCase()}</span><span className="font-medium text-sm">{v}</span></span> : '-' },
              { key: 'project_name', label: t('pjm.common.columns.project'), render: v => <span className="text-sm">{v}</span> },
              { key: 'task_name', label: t('pjm.common.columns.task'), render: v => v || <span className="text-gray-400">-</span> },
              { key: 'work_date', label: t('pjm.common.columns.date'), render: v => fD(v) },
              { key: 'hours_worked', label: t('pjm.common.columns.hours'), render: v => <span className="font-medium text-blue-600">{Number(v).toFixed(1)}h</span> },
              { key: 'status', label: t('pjm.common.columns.status'), render: v => <Badge value={v} colors={SC} /> },
              { key: 'total_cost', label: t('pjm.common.columns.cost'), render: v => <span className="font-medium">{fmt(Number(v || 0))}</span> },
            ]} data={timesheets} onDelete="timesheets" onEdit={true} />
          </div>)}

          {activeTab === 'resources' && (<div className="space-y-5">
            {/* Resource Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <p className="text-xl font-bold text-blue-700">{resources.filter(r => r.resource_type === 'human').length}</p>
                <p className="text-xs text-blue-600">{t('pjm.common.resSummary.human')}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <Layers className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                <p className="text-xl font-bold text-orange-700">{resources.filter(r => r.resource_type === 'equipment').length}</p>
                <p className="text-xs text-orange-600">{t('pjm.common.resSummary.equipment')}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <Hash className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-xl font-bold text-green-700">{resources.filter(r => r.resource_type === 'material').length}</p>
                <p className="text-xs text-green-600">{t('pjm.common.resSummary.material')}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                <Percent className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <p className="text-xl font-bold text-purple-700">{resources.length > 0 ? Math.round(resources.reduce((s, r) => s + Number(r.allocation_percent || 0), 0) / resources.length) : 0}%</p>
                <p className="text-xs text-purple-600">{t('pjm.common.avgAllocation')}</p>
              </div>
            </div>
            <Toolbar placeholder={t('pjm.common.searchResources')} statuses={[]} createLabel={t('pjm.common.addResource')} />
            <DataTable columns={[
              { key: 'resource_name', label: t('pjm.common.columns.name'), render: v => <span className="font-medium">{v}</span> },
              { key: 'resource_type', label: t('pjm.common.type'), render: v => <Badge value={v} colors={{ human: 'bg-blue-100 text-blue-700', equipment: 'bg-orange-100 text-orange-700', material: 'bg-green-100 text-green-700' }} /> },
              { key: 'role', label: t('pjm.common.columns.role'), render: v => v || <span className="text-gray-400">-</span> },
              { key: 'project_name', label: t('pjm.common.columns.project') },
              { key: 'allocation_percent', label: t('pjm.common.columns.allocation'), render: v => {
                const pct = Number(v || 0);
                return <div className="flex items-center gap-2"><div className="w-16 h-2 bg-gray-200 rounded-full"><div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} /></div><span className="text-xs font-medium">{pct}%</span></div>;
              }},
              { key: 'cost_per_hour', label: t('pjm.common.columns.costPerHour'), render: v => fmt(Number(v || 0)) },
              { key: 'start_date', label: t('pjm.common.period'), render: (v, r) => <span className="text-xs">{fD(v)} - {fD(r.end_date)}</span> },
            ]} data={resources} onDelete="resources" onEdit={true} />
          </div>)}

          {activeTab === 'risks' && (<div className="space-y-5">
            {/* Risk Summary + Mini Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-red-600" /><span className="text-xs font-medium text-red-600">{t('pjm.common.riskSummary.criticalHigh')}</span></div>
                  <p className="text-2xl font-bold text-red-700">{risks.filter(r => Number(r.risk_score) >= 6).length}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-yellow-600" /><span className="text-xs font-medium text-yellow-600">{t('pjm.common.riskSummary.medium')}</span></div>
                  <p className="text-2xl font-bold text-yellow-700">{risks.filter(r => Number(r.risk_score) >= 3 && Number(r.risk_score) < 6).length}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-xs font-medium text-green-600">{t('pjm.common.riskSummary.low')}</span></div>
                  <p className="text-2xl font-bold text-green-700">{risks.filter(r => Number(r.risk_score) < 3).length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-blue-600" /><span className="text-xs font-medium text-blue-600">{t('pjm.common.riskSummary.resolved')}</span></div>
                  <p className="text-2xl font-bold text-blue-700">{risks.filter(r => r.status === 'resolved').length}</p>
                </div>
              </div>
              {/* Inline Risk Matrix */}
              <div className="bg-white rounded-xl border p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('pjm.common.riskMatrixTitle')}</h4>
                <table className="w-full border-collapse text-xs">
                  <thead><tr><th className="p-1.5 border text-gray-400 font-medium">P\I</th>{['L','M','H','VH'].map(h => <th key={h} className="p-1.5 border text-center font-medium text-gray-500">{h}</th>)}</tr></thead>
                  <tbody>
                    {['Very High','High','Medium','Low'].map(prob => (
                      <tr key={prob}>
                        <td className="p-1.5 border bg-gray-50 font-medium text-gray-500">{prob.charAt(0)}{prob.includes(' ') ? prob.split(' ')[1].charAt(0) : ''}</td>
                        {['Low','Medium','High','Very High'].map(impact => {
                          const cell = MOCK_RISK_MATRIX.find(r => r.prob === prob && r.impact === impact);
                          return <td key={impact} className={`p-1.5 border text-center font-bold ${MATRIX_LEVEL_COLORS[cell?.level || 'low']}`}>{cell?.count || 0}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Toolbar placeholder={t('pjm.common.searchRisks')} statuses={[{v:'identified',l:trEnum('identified')},{v:'mitigating',l:trEnum('mitigating')},{v:'resolved',l:trEnum('resolved')},{v:'accepted',l:trEnum('accepted')}]} createLabel={t('pjm.common.addRisk')} />
            <DataTable columns={[
              { key: 'risk_code', label: t('pjm.common.columns.code'), render: v => <span className="font-mono text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">{v}</span> },
              { key: 'title', label: t('pjm.common.columns.risk'), render: (v, r) => <><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{r.project_name}</p></> },
              { key: 'category', label: t('pjm.common.columns.category'), render: v => v || '-' },
              { key: 'probability', label: t('pjm.modal.probability'), render: v => <Badge value={v} colors={PC} /> },
              { key: 'impact', label: t('pjm.modal.impact'), render: v => <Badge value={v} colors={PC} /> },
              { key: 'risk_score', label: t('pjm.common.score'), render: v => { const s = Number(v); return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${s >= 9 ? 'bg-red-100 text-red-700' : s >= 6 ? 'bg-orange-100 text-orange-700' : s >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{v}</span>; } },
              { key: 'status', label: t('pjm.common.columns.status'), render: v => <Badge value={v} colors={SC} /> },
              { key: 'owner_name', label: t('pjm.common.owner'), render: v => v || '-' },
            ]} data={risks} onDelete="risks" onEdit={true} />
          </div>)}

          {activeTab === 'budgets' && (<div className="space-y-5">
            {/* Budget Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title={t('pjm.common.plannedBudget')} value={fmtShort(Number(budgets?.summary?.total_planned || 0))} icon={DollarSign} color="bg-blue-500" trend="up" trendValue={t('pjm.common.total')} />
              <StatCard title={t('pjm.common.spent')} value={fmtShort(Number(budgets?.summary?.total_actual || 0))} icon={TrendingUp} color="bg-green-500" trend="up" trendValue={`${budgets?.summary?.total_planned ? Math.round(Number(budgets.summary.total_actual || 0) / Number(budgets.summary.total_planned) * 100) : 0}%`} />
              <StatCard title={t('pjm.common.chartCommitted')} value={fmtShort(Number(budgets?.summary?.total_committed || 0))} icon={ClipboardList} color="bg-orange-500" />
              <StatCard title={t('pjm.common.remainingBudget')} value={fmtShort(Math.max(0, Number(budgets?.summary?.total_planned || 0) - Number(budgets?.summary?.total_actual || 0)))} icon={Award} color="bg-purple-500" trend={Number(budgets?.summary?.total_planned || 0) > Number(budgets?.summary?.total_actual || 0) ? 'up' : 'down'} trendValue={Number(budgets?.summary?.total_planned || 0) > Number(budgets?.summary?.total_actual || 0) ? t('pjm.common.underBudget') : t('pjm.common.overBudget')} />
            </div>
            {/* Budget Utilization Bar */}
            {budgets?.summary && (
              <div className="bg-white rounded-xl border p-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('pjm.common.utilization')}</h4>
                <div className="w-full bg-gray-100 rounded-full h-4 relative overflow-hidden">
                  <div className="h-full bg-green-500 rounded-l-full absolute left-0" style={{ width: `${Math.min(Number(budgets.summary.total_actual || 0) / Number(budgets.summary.total_planned || 1) * 100, 100)}%` }} />
                  <div className="h-full bg-yellow-400/60 rounded-l-full absolute left-0" style={{ width: `${Math.min(Number(budgets.summary.total_committed || 0) / Number(budgets.summary.total_planned || 1) * 100, 100)}%`, opacity: 0.5 }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {t('pjm.common.actual')}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> {t('pjm.common.committed')}</span>
                  <span>{Math.round(Number(budgets.summary.total_actual || 0) / Number(budgets.summary.total_planned || 1) * 100)}% {t('pjm.common.pctUsed')}</span>
                </div>
              </div>
            )}
            <Toolbar placeholder={t('pjm.common.searchBudgets')} statuses={[]} createLabel={t('pjm.common.addBudget')} />
            <DataTable columns={[
              { key: 'category', label: t('pjm.common.columns.category'), render: v => <span className="font-medium capitalize inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${v === 'labor' ? 'bg-blue-500' : v === 'material' ? 'bg-green-500' : v === 'equipment' ? 'bg-orange-500' : 'bg-gray-400'}`} />{typeof v === 'string' ? trEnum(v) : v}</span> },
              { key: 'description', label: t('pjm.common.columns.description'), render: v => v || '-' },
              { key: 'project_name', label: t('pjm.common.columns.project') },
              { key: 'planned_amount', label: t('pjm.common.chartPlanned'), render: v => <span className="font-medium">{fmt(Number(v || 0))}</span> },
              { key: 'actual_amount', label: t('pjm.common.chartActual'), render: v => fmt(Number(v || 0)) },
              { key: 'committed_amount', label: t('pjm.common.chartCommitted'), render: v => fmt(Number(v || 0)) },
              { key: 'variance', label: t('pjm.common.variance'), render: (_, r) => { const v = Number(r.planned_amount || 0) - Number(r.actual_amount || 0); return <span className={`font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>{v >= 0 ? '+' : ''}{fmt(v)}</span>; } },
            ]} data={budgets?.rows || []} onDelete="budgets" onEdit={true} />
          </div>)}

          {activeTab === 'documents' && (<div className="space-y-5">
            {/* Document Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <FileText className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <p className="text-xl font-bold text-blue-700">{documents.length}</p>
                <p className="text-xs text-blue-600">{t('pjm.common.totalDocuments')}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <Download className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <p className="text-xl font-bold text-green-700">{documents.filter(d => d.document_type === 'report').length}</p>
                <p className="text-xs text-green-600">{t('pjm.common.reports')}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <ClipboardList className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                <p className="text-xl font-bold text-orange-700">{documents.filter(d => d.document_type === 'contract').length}</p>
                <p className="text-xs text-orange-600">{t('pjm.common.contracts')}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                <Calendar className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <p className="text-xl font-bold text-purple-700">{documents.filter(d => { const dt = new Date(d.created_at); const now = new Date(); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear(); }).length}</p>
                <p className="text-xs text-purple-600">{t('pjm.common.thisMonth')}</p>
              </div>
            </div>
            <Toolbar placeholder={t('pjm.common.searchDocuments')} statuses={[]} createLabel={t('pjm.common.uploadDocument')} />
            <DataTable columns={[
              { key: 'title', label: t('pjm.common.columns.document'), render: (v, r) => <div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.document_type === 'report' ? 'bg-blue-100' : r.document_type === 'contract' ? 'bg-orange-100' : 'bg-gray-100'}`}><FileText className={`w-4 h-4 ${r.document_type === 'report' ? 'text-blue-600' : r.document_type === 'contract' ? 'text-orange-600' : 'text-gray-500'}`} /></div><span className="font-medium">{v}</span></div> },
              { key: 'document_type', label: t('pjm.common.type'), render: v => <span className="capitalize text-xs bg-gray-100 px-2 py-1 rounded">{v ? trEnum(String(v)) : '-'}</span> },
              { key: 'project_name', label: t('pjm.common.columns.project') },
              { key: 'version', label: t('pjm.common.version'), render: v => v ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{v}</span> : '-' },
              { key: 'uploaded_by_name', label: t('pjm.common.uploader'), render: v => v || '-' },
              { key: 'created_at', label: t('pjm.common.columns.date'), render: v => fD(v) },
            ]} data={documents} onDelete="documents" onEdit={true} />
          </div>)}

          {/* GANTT CHART TAB */}
          {activeTab === 'gantt' && (<div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><GitBranch className="w-5 h-5 text-blue-600" />{t('pjm.common.ganttTitle')}</h2>
                <p className="text-xs text-gray-500">{t('pjm.common.ganttSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="border rounded-lg px-3 py-2 text-sm" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                  <option value="">{t('pjm.common.allProjects')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
                <button onClick={() => fetchData('gantt')} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5" />{t('pjm.common.refresh')}</button>
                <button onClick={() => router.push('/hq/project-management/gantt')}
                  className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow">
                  <Zap className="w-3.5 h-3.5" /> {t('pjm.common.ganttPro')}
                </button>
              </div>
            </div>
            <GanttChart
              items={ganttData.map((r: any) => ({
                id: r.id, name: r.name, start: r.start_date || r.startDate || r.start,
                end: r.end_date || r.endDate || r.due_date || r.end, progress: Number(r.progress_percent || r.progress || 0),
                status: r.status, type: r.type || (r.due_date && !r.end_date ? 'milestone' : r.task_id ? 'task' : 'project'),
                isCritical: !!r.is_critical, assigneeName: r.assignee_name || r.manager_name,
              }))}
              onItemClick={(it) => {
                if (it.type === 'project') router.push(`/hq/project-management/${it.id}`);
                else toast(`${t('pjm.common.taskToast')}: ${it.name}`);
              }}
            />
          </div>)}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && (<div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" />{t('pjm.common.calendarTitle')}</h2>
                <p className="text-xs text-gray-500">{t('pjm.common.calendarSubtitle')}</p>
              </div>
              <select className="border rounded-lg px-3 py-2 text-sm" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                <option value="">{t('pjm.common.allProjects')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
            </div>
            <CalendarView
              events={calendarEvents.map((e: any) => ({
                id: e.id, title: e.title || e.name,
                date: e.date || e.due_date || e.start_date,
                endDate: e.end_date,
                type: e.type || (e.milestone_id ? 'milestone' : e.task_id ? 'task' : 'deadline'),
                status: e.status,
              }))}
            />
          </div>)}

          {/* WORKLOAD TAB */}
          {activeTab === 'workload' && (<div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-purple-600" />{t('pjm.common.workloadTitle')}</h2>
                <p className="text-xs text-gray-500">{t('pjm.common.workloadSubtitle')}</p>
              </div>
              <select className="border rounded-lg px-3 py-2 text-sm" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                <option value="">{t('pjm.common.allProjects')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
            </div>
            <WorkloadHeatmap
              data={workload.map((w: any) => ({
                employeeId: w.employee_id || w.id,
                employeeName: w.employee_name || w.name || '-',
                position: w.position,
                branchId: w.branch_id,
                activeTasks: Number(w.active_tasks || w.taskCount || 0),
                totalHours: Number(w.total_hours || w.loggedHours || 0),
                capacityHours: Number(w.capacity_hours || 40),
                overdue: Number(w.overdue_count || 0),
              }))}
            />
          </div>)}

          {/* SPRINTS TAB */}
          {activeTab === 'sprints' && (<div className="space-y-4">
            <Toolbar placeholder={t('pjm.common.searchSprints')} statuses={[{v:'planning',l:trEnum('planning')},{v:'active',l:trEnum('active')},{v:'completed',l:trEnum('completed')}]} createLabel={t('pjm.common.createSprint')} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sprints.length === 0 && (
                <div className="col-span-full bg-white border-2 border-dashed rounded-xl p-12 text-center">
                  <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t('pjm.common.sprintEmpty')}</p>
                </div>
              )}
              {sprints.map((sp: any) => {
                const start = sp.start_date ? new Date(sp.start_date) : null;
                const end = sp.end_date ? new Date(sp.end_date) : null;
                const today = new Date();
                let daysRemaining = 0;
                if (end && start) {
                  daysRemaining = Math.ceil((end.getTime() - today.getTime()) / 86400000);
                }
                const completion = sp.total_tasks > 0 ? (sp.completed_tasks / sp.total_tasks) * 100 : 0;
                return (
                  <div key={sp.id} className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-800">{sp.name}</h4>
                        <p className="text-xs text-gray-500 font-mono">{sp.sprint_code}</p>
                      </div>
                      <Badge value={sp.status} colors={SC} />
                    </div>
                    {sp.goal && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{sp.goal}</p>}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>{t('pjm.sprint.period')}:</span>
                        <span>{fD(sp.start_date)} — {fD(sp.end_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('pjm.sprint.progress')}:</span>
                        <span className="font-semibold">{sp.completed_tasks || 0}/{sp.total_tasks || 0} ({completion.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-emerald-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
                      </div>
                      {sp.status === 'active' && (
                        <p className={`mt-2 text-xs font-medium ${daysRemaining < 3 ? 'text-red-600' : 'text-blue-600'}`}>
                          {daysRemaining > 0 ? t('pjm.sprint.daysLeft', { n: daysRemaining }) : daysRemaining === 0 ? t('pjm.sprint.lastDay') : t('pjm.sprint.ended')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>)}

          {/* EVM TAB */}
          {activeTab === 'evm' && (<div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-600" />{t('pjm.common.evmTitle')}</h2>
                <p className="text-xs text-gray-500">{t('pjm.common.evmSubtitle')}</p>
              </div>
              <select className="border rounded-lg px-3 py-2 text-sm" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                <option value="">{t('pjm.common.selectProjectAnalysis')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
            </div>
            {!selectedProjectId && (
              <div className="bg-white border-2 border-dashed rounded-xl p-12 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t('pjm.common.selectProjectEvm')}</p>
              </div>
            )}
            {selectedProjectId && evmData && (
              <EVMPanel data={{
                BAC: Number(evmData.BAC || 0), PV: Number(evmData.PV || 0), EV: Number(evmData.EV || 0),
                AC: Number(evmData.AC || 0), SV: Number(evmData.SV || 0), CV: Number(evmData.CV || 0),
                SPI: Number(evmData.SPI || 0), CPI: Number(evmData.CPI || 0),
                EAC: Number(evmData.EAC || 0), ETC: Number(evmData.ETC || 0), VAC: Number(evmData.VAC || 0),
                progress: Number(evmData.progress || 0),
              }} />
            )}
            {selectedProjectId && !evmData && !loading && (
              <div className="bg-white border rounded-xl p-8 text-center text-sm text-gray-500">{t('pjm.common.evmNotAvailable')}</div>
            )}
          </div>)}
        </>)}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  {activeTab === 'projects' ? <Briefcase className="w-5 h-5 text-blue-600" /> :
                   activeTab === 'tasks' ? <ListTodo className="w-5 h-5 text-blue-600" /> :
                   activeTab === 'milestones' ? <Flag className="w-5 h-5 text-blue-600" /> :
                   activeTab === 'timesheets' ? <Timer className="w-5 h-5 text-blue-600" /> :
                   activeTab === 'risks' ? <AlertTriangle className="w-5 h-5 text-blue-600" /> :
                   activeTab === 'resources' ? <Users className="w-5 h-5 text-blue-600" /> :
                   activeTab === 'budgets' ? <DollarSign className="w-5 h-5 text-blue-600" /> :
                   <FileText className="w-5 h-5 text-blue-600" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('pjm.modal.createNew', { name: tabs.find(tab => tab.id === activeTab)?.name || '' })}</h3>
                  <p className="text-xs text-gray-500">{t('pjm.modal.createHint')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {(activeTab === 'projects') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Proyek <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Masukkan nama proyek" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={3} placeholder="Deskripsi singkat proyek" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. IT, Konstruksi" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Cabang</label>
                    <LookupPicker action="branches" icon={Building2} value={form.branchId} nameValue={form.branchName}
                      onChange={(b) => setForm({ ...form, branchId: b?.id, branchName: b?.name })} placeholder="Pilih cabang…" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Manager (HRIS) <span className="text-red-500">*</span></label>
                  <EmployeePicker value={form.managerEmployeeId} nameValue={form.managerName}
                    onChange={(emp) => setForm({ ...form, managerEmployeeId: emp?.id, managerName: emp?.name })}
                    placeholder="Pilih PM dari HRIS…" branchId={form.branchId} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Klien (CRM)</label>
                  <LookupPicker action="customers" value={form.customerId} nameValue={form.clientName}
                    onChange={(c) => setForm({ ...form, customerId: c?.id, clientName: c?.name })}
                    placeholder="Pilih pelanggan dari CRM…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prioritas</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.priority || 'normal'} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Anggaran (Rp)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="0" value={form.budgetAmount || ''} onChange={e => setForm({ ...form, budgetAmount: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Mulai</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Selesai</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
              </>)}
              {(activeTab === 'tasks') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Tugas <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Masukkan nama tugas" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee (HRIS)</label>
                  <EmployeePicker value={form.assigneeEmployeeId} nameValue={form.assigneeName}
                    onChange={(emp) => setForm({ ...form, assigneeEmployeeId: emp?.id, assigneeName: emp?.name })}
                    placeholder="Pilih dari HRIS…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prioritas</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.priority || 'normal'} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Story Points</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. 3, 5, 8" value={form.storyPoints || ''} onChange={e => setForm({ ...form, storyPoints: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Mulai</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Estimasi Jam</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="0" value={form.estimatedHours || ''} onChange={e => setForm({ ...form, estimatedHours: e.target.value })} /></div>
              </>)}
              {(activeTab === 'milestones') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Milestone <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Masukkan nama milestone" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={3} placeholder="Deskripsi milestone" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>)}
              {(activeTab === 'timesheets') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Karyawan (HRIS) <span className="text-red-500">*</span></label>
                  <EmployeePicker value={form.hrisEmployeeId} nameValue={form.employeeName}
                    onChange={(emp) => setForm({ ...form, hrisEmployeeId: emp?.id, employeeName: emp?.name, employeeId: emp?.id })}
                    placeholder="Pilih karyawan dari HRIS…" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal <span className="text-red-500">*</span></label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.workDate || ''} onChange={e => setForm({ ...form, workDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jam Kerja <span className="text-red-500">*</span></label><input type="number" step="0.5" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="8.0" value={form.hoursWorked || ''} onChange={e => setForm({ ...form, hoursWorked: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="billable" checked={form.billable || false} onChange={e => setForm({ ...form, billable: e.target.checked })} />
                  <label htmlFor="billable" className="text-xs text-gray-600">Jam billable (dapat ditagihkan ke klien)</label>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi Aktivitas</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={2} placeholder="Apa yang dikerjakan?" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>)}
              {(activeTab === 'risks') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Risiko <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Judul risiko" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Probabilitas</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.probability || 'medium'} onChange={e => setForm({ ...form, probability: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very High</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Dampak</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.impact || 'medium'} onChange={e => setForm({ ...form, impact: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very High</option></select></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Risk Owner (HRIS)</label>
                  <EmployeePicker value={form.ownerEmployeeId} nameValue={form.ownerName}
                    onChange={(emp) => setForm({ ...form, ownerEmployeeId: emp?.id, ownerName: emp?.name })}
                    placeholder="Pilih risk owner…" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Rencana Mitigasi</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={3} placeholder="Langkah mitigasi risiko" value={form.mitigationPlan || ''} onChange={e => setForm({ ...form, mitigationPlan: e.target.value })} /></div>
              </>)}
              {(activeTab === 'resources') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Resource <span className="text-red-500">*</span></label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.resourceType || 'human'} onChange={e => setForm({ ...form, resourceType: e.target.value, hrisEmployeeId: null, fleetVehicleId: null, inventoryItemId: null, resourceName: '' })}>
                    <option value="human">Karyawan (HRIS)</option>
                    <option value="equipment">Kendaraan/Alat (Fleet)</option>
                    <option value="material">Material (Inventory)</option>
                  </select>
                </div>
                {form.resourceType === 'human' || !form.resourceType ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Karyawan <span className="text-red-500">*</span></label>
                    <EmployeePicker value={form.hrisEmployeeId} nameValue={form.resourceName}
                      onChange={(emp) => setForm({ ...form, hrisEmployeeId: emp?.id, resourceName: emp?.name })}
                      placeholder="Pilih karyawan…" required />
                  </div>
                ) : form.resourceType === 'equipment' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kendaraan <span className="text-red-500">*</span></label>
                    <LookupPicker action="fleet-vehicles" icon={Truck} value={form.fleetVehicleId} nameValue={form.resourceName}
                      onChange={(v) => setForm({ ...form, fleetVehicleId: v?.id, resourceName: v?.name })}
                      placeholder="Pilih kendaraan…" required />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Material <span className="text-red-500">*</span></label>
                    <LookupPicker action="inventory-items" icon={Package} value={form.inventoryItemId} nameValue={form.resourceName}
                      onChange={(v) => setForm({ ...form, inventoryItemId: v?.id, resourceName: v?.name })}
                      placeholder="Pilih item inventory…" required />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Role/Kegunaan</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. Developer, Pickup" value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">{form.resourceType === 'material' ? 'Kuantitas' : 'Alokasi (%)'}</label>
                    {form.resourceType === 'material'
                      ? <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="0" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                      : <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="100" value={form.allocationPercent || 100} onChange={e => setForm({ ...form, allocationPercent: e.target.value })} />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Biaya/Jam (Rp)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="0" value={form.costPerHour || ''} onChange={e => setForm({ ...form, costPerHour: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Mulai Alokasi</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                </div>
              </>)}
              {(activeTab === 'budgets') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Pilih Kategori</option><option value="labor">Labor</option><option value="material">Material</option><option value="equipment">Equipment</option><option value="travel">Travel</option><option value="overhead">Overhead</option><option value="contingency">Contingency</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Rencana (Rp)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="0" value={form.plannedAmount || ''} onChange={e => setForm({ ...form, plannedAmount: e.target.value })} /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Order (opsional)</label>
                  <LookupPicker action="purchase-orders" icon={FileSpreadsheet} value={form.purchaseOrderId} nameValue={form.purchaseOrderNumber}
                    onChange={(po) => setForm({ ...form, purchaseOrderId: po?.id, purchaseOrderNumber: po?.name, committedAmount: form.committedAmount || form.plannedAmount })}
                    placeholder="Link ke PO…" emptyHint="Belum ada Purchase Order" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Deskripsi anggaran" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>)}
              {(activeTab === 'sprints') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek <span className="text-red-500">*</span></label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Sprint <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. Sprint 1 - Auth Module" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Goal Sprint</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={2} placeholder="Apa target utama sprint ini?" value={form.goal || ''} onChange={e => setForm({ ...form, goal: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Mulai <span className="text-red-500">*</span></label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Selesai <span className="text-red-500">*</span></label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kapasitas (Story Points)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="e.g. 40" value={form.capacity || ''} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
              </>)}
              {(activeTab === 'documents') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Proyek</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">{t('pjm.modal.selectProject')}</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Dokumen <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="Judul dokumen" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Dokumen</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.documentType || ''} onChange={e => setForm({ ...form, documentType: e.target.value })}><option value="">Pilih Tipe</option><option value="report">Report</option><option value="contract">Contract</option><option value="proposal">Proposal</option><option value="minutes">Minutes</option><option value="specification">Specification</option><option value="other">Other</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">URL File</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" placeholder="https://..." value={form.fileUrl || ''} onChange={e => setForm({ ...form, fileUrl: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Versi</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.version || '1.0'} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
              </>)}
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition">{t('pjm.common.cancel')}</button>
              <button onClick={handleCreate} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('pjm.common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowEditModal(false); setEditingItem(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('pjm.modal.edit', { name: tabs.find(tab => tab.id === activeTab)?.name || '' })}</h3>
                  <p className="text-xs text-gray-500">{t('pjm.modal.editHint')}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {(activeTab === 'projects') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Proyek <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.status || 'planning'} onChange={e => setForm({ ...form, status: e.target.value })}><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prioritas</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.priority || 'normal'} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Manager (HRIS)</label>
                    <EmployeePicker value={form.managerEmployeeId} nameValue={form.managerName}
                      onChange={(emp) => setForm({ ...form, managerEmployeeId: emp?.id, managerName: emp?.name })}
                      placeholder="Pilih PM…" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Anggaran</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.budgetAmount || ''} onChange={e => setForm({ ...form, budgetAmount: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Progress (%)</label><input type="number" min={0} max={100} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.progressPercent || ''} onChange={e => setForm({ ...form, progressPercent: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Mulai</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Selesai</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
              </>)}
              {(activeTab === 'tasks') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Tugas <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.status || 'todo'} onChange={e => setForm({ ...form, status: e.target.value })}><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="done">Done</option><option value="blocked">Blocked</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Prioritas</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.priority || 'normal'} onChange={e => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee (HRIS)</label>
                  <EmployeePicker value={form.assigneeEmployeeId} nameValue={form.assigneeName}
                    onChange={(emp) => setForm({ ...form, assigneeEmployeeId: emp?.id, assigneeName: emp?.name })}
                    placeholder="Pilih assignee…" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Progress (%)</label><input type="number" min={0} max={100} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.progressPercent || ''} onChange={e => setForm({ ...form, progressPercent: e.target.value })} /></div>
                </div>
              </>)}
              {(activeTab === 'milestones') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Milestone <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.status || 'pending'} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
              </>)}
              {(activeTab === 'timesheets') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jam Kerja</label><input type="number" step="0.5" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.hoursWorked || ''} onChange={e => setForm({ ...form, hoursWorked: parseFloat(e.target.value) })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.status || 'draft'} onChange={e => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>)}
              {(activeTab === 'risks') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Risiko <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Probabilitas</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.probability || 'medium'} onChange={e => setForm({ ...form, probability: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very High</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Dampak</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.impact || 'medium'} onChange={e => setForm({ ...form, impact: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very High</option></select></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.status || 'identified'} onChange={e => setForm({ ...form, status: e.target.value })}><option value="identified">Identified</option><option value="mitigating">Mitigating</option><option value="resolved">Resolved</option><option value="accepted">Accepted</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Risk Owner (HRIS)</label>
                  <EmployeePicker value={form.ownerEmployeeId} nameValue={form.ownerName}
                    onChange={(emp) => setForm({ ...form, ownerEmployeeId: emp?.id, ownerName: emp?.name })}
                    placeholder="Pilih owner…" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Rencana Mitigasi</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" rows={3} value={form.mitigationPlan || ''} onChange={e => setForm({ ...form, mitigationPlan: e.target.value })} /></div>
              </>)}
              {(activeTab === 'resources') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Resource <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.resourceName || ''} onChange={e => setForm({ ...form, resourceName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.resourceType || 'human'} onChange={e => setForm({ ...form, resourceType: e.target.value })}><option value="human">Human</option><option value="equipment">Equipment</option><option value="material">Material</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.role || ''} onChange={e => setForm({ ...form, role: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Alokasi (%)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.allocationPercent || 100} onChange={e => setForm({ ...form, allocationPercent: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Biaya/Jam (Rp)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.costPerHour || ''} onChange={e => setForm({ ...form, costPerHour: e.target.value })} /></div>
                </div>
              </>)}
              {(activeTab === 'budgets') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}><option value="">Pilih</option><option value="labor">Labor</option><option value="material">Material</option><option value="equipment">Equipment</option><option value="travel">Travel</option><option value="overhead">Overhead</option><option value="contingency">Contingency</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Rencana (Rp)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.plannedAmount || ''} onChange={e => setForm({ ...form, plannedAmount: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Aktual (Rp)</label><input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.actualAmount || ''} onChange={e => setForm({ ...form, actualAmount: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </>)}
              {(activeTab === 'documents') && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Judul Dokumen <span className="text-red-500">*</span></label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Dokumen</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.documentType || ''} onChange={e => setForm({ ...form, documentType: e.target.value })}><option value="">Pilih Tipe</option><option value="report">Report</option><option value="contract">Contract</option><option value="proposal">Proposal</option><option value="invoice">Invoice</option><option value="other">Other</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">URL File</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.fileUrl || ''} onChange={e => setForm({ ...form, fileUrl: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Versi</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={form.version || ''} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
              </>)}
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setShowEditModal(false); setEditingItem(null); }} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition">{t('pjm.common.cancel')}</button>
              <button onClick={handleUpdate} disabled={saving} className="px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {t('pjm.common.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </HQLayout>
  );
}
