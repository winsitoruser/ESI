import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import HQLayout from '@/components/humanify/HumanifyLayout';
import HRStatCard from '@/components/humanify/HRStatCard';
import EnterprisePageHeader from '@/components/humanify/EnterprisePageHeader';
import DashboardModuleGrid from '@/components/humanify/DashboardModuleGrid';
import { useTranslation } from '@/lib/i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown, Award,
  Calendar, BarChart3, Target, Star, AlertCircle, AlertTriangle,
  Building2, ChevronRight, Download, Search, Eye, Edit,
  Briefcase, DollarSign, FileText, Shield, Heart, Plane,
  GraduationCap, UserPlus, Settings, FolderOpen, ClipboardList,
  CheckCircle2, XCircle, ArrowRight, Bell, Zap, Activity,
  PieChart, Layers, MapPin, CircleDot, Megaphone, KeyRound, PenTool, BookOpen, Timer, RefreshCw, LayoutDashboard
} from 'lucide-react';

// ── HRIS Module Definitions (translated via t()) ──
function getHrisModules(t: (key: string) => string) {
  return [
    {
      category: t('hris.catEmployeeManagement'),
      color: 'blue',
      modules: [
        { key: 'employees', label: t('hris.employeeData'), desc: t('hris.employeeDataDesc'), href: '/humanify/employees', icon: Users, color: 'bg-blue-500' },
        { key: 'organization', label: t('hris.orgStructure'), desc: t('hris.orgStructureDesc'), href: '/humanify/organization', icon: Building2, color: 'bg-blue-600' },
        { key: 'onboarding', label: 'Onboarding', desc: 'Alur masuk karyawan baru & checklist', href: '/humanify/onboarding', icon: UserPlus, color: 'bg-blue-400' },
        { key: 'assets', label: 'Manajemen Aset', desc: 'Laptop, HP, ID card — issue & return', href: '/humanify/assets', icon: FolderOpen, color: 'bg-indigo-500' },
        { key: 'offboarding', label: 'Offboarding / Exit', desc: 'Alur keluar, clearance, exit interview', href: '/humanify/offboarding', icon: KeyRound, color: 'bg-blue-700' },
        { key: 'esign', label: 'E-Sign (Privy)', desc: 'Tanda tangan elektronik kontrak kerja', href: '/humanify/esign', icon: PenTool, color: 'bg-violet-600' },
        { key: 'org-settings', label: 'Pengaturan Organisasi', desc: 'Policy engine, access, workflow', href: '/humanify/org-settings', icon: Settings, color: 'bg-gray-600' },
        { key: 'contracts', label: 'Kontrak & Reminder', desc: 'Masa kontrak, perpanjangan, notifikasi', href: '/humanify/contracts', icon: FileText, color: 'bg-sky-600' },
        { key: 'ess', label: t('hris.employeeSelfService'), desc: t('hris.employeeSelfServiceDesc'), href: '/humanify/ess', icon: UserCheck, color: 'bg-blue-800' },
        { key: 'mss', label: t('hris.managerSelfService'), desc: t('hris.managerSelfServiceDesc'), href: '/humanify/mss', icon: Briefcase, color: 'bg-indigo-700' },
      ]
    },
    {
      category: t('hris.catAttendanceLeave'),
      color: 'green',
      modules: [
        { key: 'attendance', label: t('hris.attendance'), desc: t('hris.attendanceDesc'), href: '/humanify/attendance', icon: Clock, color: 'bg-green-500' },
        { key: 'attendance-daily', label: 'Rekap Harian', desc: 'Absensi harian per karyawan', href: '/humanify/attendance/daily', icon: ClipboardList, color: 'bg-green-500' },
        { key: 'attendance-mgmt', label: t('hris.attendanceMgmt'), desc: t('hris.attendanceMgmtDesc'), href: '/humanify/attendance-management', icon: Timer, color: 'bg-green-600' },
        { key: 'leave', label: t('hris.leaveManagement'), desc: t('hris.leaveManagementDesc'), href: '/humanify/leave', icon: Calendar, color: 'bg-green-400' },
        { key: 'attendance-devices', label: t('hris.attendanceDevices'), desc: t('hris.attendanceDevicesDesc'), href: '/humanify/attendance/devices', icon: Layers, color: 'bg-green-700' },
        { key: 'attendance-settings', label: 'Kebijakan Absensi', desc: 'Geofence, toleransi telat, shift', href: '/humanify/attendance/settings', icon: Settings, color: 'bg-emerald-700' },
      ]
    },
    {
      category: t('hris.catPerformanceKpi'),
      color: 'purple',
      modules: [
        { key: 'kpi', label: t('hris.kpiDashboard'), desc: t('hris.kpiDashboardDesc'), href: '/humanify/kpi', icon: Target, color: 'bg-purple-500' },
        { key: 'okr', label: 'OKR / KPI', desc: 'Objectives & Key Results cascading alignment', href: '/humanify/okr', icon: Target, color: 'bg-violet-600' },
        { key: 'performance', label: t('hris.performanceReview'), desc: t('hris.performanceReviewDesc'), href: '/humanify/performance', icon: Award, color: 'bg-purple-600' },
        { key: 'kpi-settings', label: t('hris.kpiSettings'), desc: t('hris.kpiSettingsDesc'), href: '/humanify/kpi-settings', icon: Settings, color: 'bg-purple-400' },
        { key: 'engagement', label: t('hris.employeeEngagement'), desc: t('hris.employeeEngagementDesc'), href: '/humanify/engagement', icon: Heart, color: 'bg-purple-700' },
      ]
    },
    {
      category: t('hris.catPayrollFinance'),
      color: 'emerald',
      modules: [
        { key: 'payroll', label: t('hris.payroll'), desc: t('hris.payrollDesc'), href: '/humanify/payroll', icon: DollarSign, color: 'bg-emerald-500' },
        { key: 'payroll-main', label: 'Proses Gaji', desc: 'Payroll run bulanan + bulk upload', href: '/humanify/payroll/main', icon: DollarSign, color: 'bg-emerald-700' },
        { key: 'payroll-slip', label: 'Slip Gaji', desc: 'Distribusi payslip karyawan', href: '/humanify/payroll/slip-gaji', icon: FileText, color: 'bg-emerald-600' },
        { key: 'payroll-thr', label: 'THR & Bonus', desc: 'Tunjangan Hari Raya tahunan', href: '/humanify/payroll/thr', icon: Star, color: 'bg-pink-500' },
        { key: 'payroll-pph21', label: 'PPh 21', desc: 'Pajak penghasilan & SPT masa', href: '/humanify/payroll/pph21', icon: FileText, color: 'bg-yellow-600' },
        { key: 'payroll-bpjs', label: 'BPJS Kesehatan & TK', desc: 'Iuran BPJS Kesehatan & Ketenagakerjaan', href: '/humanify/payroll/bpjs', icon: Shield, color: 'bg-red-500' },
        { key: 'payroll-lembur', label: 'Lembur (Payroll)', desc: 'Rekap lembur untuk payroll', href: '/humanify/payroll/lembur', icon: Clock, color: 'bg-amber-600' },
        { key: 'payroll-bonus', label: 'Bonus & Insentif', desc: 'Bonus kinerja & proyek → payroll', href: '/humanify/payroll/bonus', icon: Star, color: 'bg-pink-500' },
        { key: 'payroll-cash-advance', label: 'Kasbon', desc: 'Cash advance karyawan', href: '/humanify/payroll/cash-advance', icon: DollarSign, color: 'bg-yellow-600' },
        { key: 'payroll-loan', label: 'Pinjaman Karyawan', desc: 'Pinjaman dengan cicilan otomatis', href: '/humanify/payroll/loan', icon: FileText, color: 'bg-red-600' },
        { key: 'reimbursement', label: 'Reimbursement', desc: 'Klaim biaya & expense policy', href: '/humanify/reimbursement', icon: Plane, color: 'bg-teal-600' },
        { key: 'payroll-laporan', label: 'Laporan Gaji', desc: 'Laporan & analisis payroll', href: '/humanify/payroll/laporan', icon: BarChart3, color: 'bg-teal-600' },
        { key: 'project-mgmt', label: t('hris.projectMgmt'), desc: t('hris.projectMgmtDesc'), href: '/humanify/project-management', icon: FolderOpen, color: 'bg-emerald-700' },
      ]
    },
    {
      category: t('hris.catRecruitmentTraining'),
      color: 'orange',
      modules: [
        { key: 'recruitment', label: t('hris.recruitment'), desc: t('hris.recruitmentDesc'), href: '/humanify/recruitment', icon: UserPlus, color: 'bg-orange-500' },
        { key: 'training', label: t('hris.training'), desc: t('hris.trainingDesc'), href: '/humanify/training', icon: GraduationCap, color: 'bg-orange-600' },
        { key: 'training-dev', label: 'Learning & Development', desc: 'Kurikulum, batch, ujian, outsourcing', href: '/humanify/training-development', icon: BookOpen, color: 'bg-orange-700' },
        { key: 'training-scoring', label: 'Skor & Penilaian Training', desc: 'Competency scoring & sertifikasi', href: '/humanify/training-scoring', icon: PenTool, color: 'bg-amber-700' },
        { key: 'certificates', label: 'Certificate Registry', desc: 'Tracker sertifikat & lisensi karyawan', href: '/humanify/certificates', icon: Award, color: 'bg-amber-500' },
        { key: 'travel-expense', label: t('hris.travelExpense'), desc: t('hris.travelExpenseDesc'), href: '/humanify/travel-expense', icon: Plane, color: 'bg-emerald-600' },
      ]
    },
    {
      category: t('hris.catAnalyticsCompliance'),
      color: 'indigo',
      modules: [
        { key: 'calendar', label: 'Kalender HR', desc: 'Cuti, shift, gajian, event dalam satu kalender', href: '/humanify/calendar', icon: Calendar, color: 'bg-indigo-500' },
        { key: 'announcements', label: 'Pengumuman', desc: 'Broadcast pengumuman ke karyawan', href: '/humanify/announcements', icon: Megaphone, color: 'bg-fuchsia-600' },
        { key: 'workforce-analytics', label: t('hris.workforceAnalytics'), desc: t('hris.workforceAnalyticsDesc'), href: '/humanify/workforce-analytics', icon: PieChart, color: 'bg-indigo-600' },
        { key: 'reports', label: 'Laporan HRIS', desc: 'Pusat laporan kepegawaian, KPI, absensi & payroll', href: '/humanify/reports', icon: BarChart3, color: 'bg-indigo-800' },
        { key: 'activities', label: 'Aktivitas HR', desc: 'Timeline aktivitas kepegawaian & approval', href: '/humanify/activities', icon: Activity, color: 'bg-violet-600' },
        { key: 'industrial-relations', label: t('hris.industrialRelations'), desc: t('hris.industrialRelationsDesc'), href: '/humanify/industrial-relations', icon: AlertTriangle, color: 'bg-indigo-700' },
      ]
    },
  ];
}

function getQuickActions(t: (key: string) => string) {
  return [
    { label: t('hris.addEmployee'), href: '/humanify/employees?add=1', icon: UserPlus, color: 'bg-blue-600' },
    { label: t('hris.inputAttendance'), href: '/humanify/attendance', icon: Clock, color: 'bg-green-600' },
    { label: t('hris.processPayroll'), href: '/humanify/payroll/main', icon: DollarSign, color: 'bg-emerald-600' },
    { label: t('hris.openVacancy'), href: '/humanify/recruitment', icon: UserPlus, color: 'bg-orange-600' },
    { label: t('hris.createKpi'), href: '/humanify/kpi', icon: Target, color: 'bg-purple-600' },
    { label: 'Kirim Pengumuman', href: '/humanify/announcements', icon: Megaphone, color: 'bg-fuchsia-600' },
    { label: 'Kalender HR', href: '/humanify/calendar', icon: Calendar, color: 'bg-indigo-600' },
    { label: 'Laporan HRIS', href: '/humanify/reports', icon: BarChart3, color: 'bg-indigo-700' },
    { label: 'Aktivitas HR', href: '/humanify/activities', icon: Activity, color: 'bg-violet-600' },
    { label: t('hris.scheduleTraining'), href: '/humanify/training', icon: GraduationCap, color: 'bg-red-600' },
  ];
}

const MOCK_HRIS_STATS = { total: 162, active: 148, onLeave: 8, inactive: 6, avgPerf: 82, avgKpi: 78, topPerformers: 35, attendanceToday: 94 };

const MOCK_PENDING_APPROVALS = [
  { id: 'lv1', type: 'leave', title: 'Cuti Tahunan - Siti Rahayu', subtitle: '15 Mar 2026 s/d 18 Mar 2026 (3 hari)', status: 'pending', date: '2026-03-15', color: 'yellow' },
  { id: 'lv2', type: 'leave', title: 'Cuti Sakit - Budi Santoso', subtitle: '12 Mar 2026 s/d 13 Mar 2026 (2 hari)', status: 'pending', date: '2026-03-12', color: 'red' },
  { id: 'lv3', type: 'leave', title: 'Cuti Personal - Lisa Permata', subtitle: '20 Mar 2026 (1 hari)', status: 'pending', date: '2026-03-20', color: 'yellow' },
  { id: 'ot1', type: 'overtime', title: 'Lembur - Eko Prasetyo', subtitle: 'Gudang Pusat, 4 jam (10 Mar 2026)', status: 'pending', date: '2026-03-10', color: 'blue' },
  { id: 'cl1', type: 'claim', title: 'Klaim Perjalanan - Dewi Lestari', subtitle: 'Perjalanan dinas Medan-Jakarta, Rp 4.500.000', status: 'pending', date: '2026-03-09', color: 'green' },
];

const MOCK_DEPT_STATS = [
  { department: 'Operations', total: 45, active: 42, perf: 85, attend: 96, color: 'blue' },
  { department: 'Sales', total: 32, active: 30, perf: 88, attend: 93, color: 'green' },
  { department: 'Finance', total: 18, active: 17, perf: 82, attend: 97, color: 'yellow' },
  { department: 'Warehouse', total: 28, active: 26, perf: 78, attend: 94, color: 'purple' },
  { department: 'Kitchen', total: 22, active: 20, perf: 80, attend: 91, color: 'indigo' },
  { department: 'IT & Admin', total: 17, active: 13, perf: 86, attend: 98, color: 'cyan' },
];

const MOCK_RECENT_ACTIVITIES = [
  { id: 'a1', action: 'Karyawan baru bergabung', detail: 'Rizki Firmansyah - IT Department, Cabang Jakarta', time: '2 jam lalu', icon: UserPlus, color: 'bg-blue-100 text-blue-600' },
  { id: 'a2', action: 'Evaluasi kinerja selesai', detail: 'Q1 2026 - Cabang Bandung (18 karyawan)', time: '5 jam lalu', icon: Award, color: 'bg-purple-100 text-purple-600' },
  { id: 'a3', action: 'Payroll diproses', detail: 'Gaji Februari 2026 - 148 karyawan, total Rp 1.2M', time: '1 hari lalu', icon: DollarSign, color: 'bg-green-100 text-green-600' },
  { id: 'a4', action: 'Training selesai', detail: 'Food Safety & Hygiene - 12 peserta lulus', time: '2 hari lalu', icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
  { id: 'a5', action: 'Kontrak diperpanjang', detail: 'Made Wirawan - Cabang Bali (PKWT 1 tahun)', time: '3 hari lalu', icon: FileText, color: 'bg-indigo-100 text-indigo-600' },
];

const MOCK_UPCOMING = [
  { id: 'u1', title: 'Batas Pengumpulan Timesheet', date: '15 Mar 2026', color: 'red' },
  { id: 'u2', title: 'Training Leadership Batch 3', date: '18-19 Mar 2026', color: 'purple' },
  { id: 'u3', title: 'Review KPI Q1 2026', date: '25 Mar 2026', color: 'orange' },
  { id: 'u4', title: 'Proses Payroll Maret', date: '28 Mar 2026', color: 'blue' },
  { id: 'u5', title: 'Hari Raya Nyepi (Libur)', date: '29 Mar 2026', color: 'indigo' },
];

export default function HRISDashboard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(MOCK_HRIS_STATS);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>(MOCK_PENDING_APPROVALS);
  const [recentActivities, setRecentActivities] = useState<any[]>(MOCK_RECENT_ACTIVITIES);
  const [deptStats, setDeptStats] = useState<any[]>(MOCK_DEPT_STATS);
  const [upcoming, setUpcoming] = useState<any[]>(MOCK_UPCOMING);
  const [expandedCat, setExpandedCat] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [viewTab, setViewTab] = useState<'overview' | 'modules'>('overview');

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const dashRes = await fetch('/api/humanify/dashboard');
      if (dashRes.ok) {
        const dash = await dashRes.json();
        if (dash.success) {
          if (dash.stats) setStats(dash.stats);
          if (dash.deptStats?.length) setDeptStats(dash.deptStats);
          if (dash.pendingApprovals?.length) setPendingApprovals(dash.pendingApprovals);
          if (dash.upcoming?.length) setUpcoming(dash.upcoming);
          if (dash.recentActivities?.length) {
            const iconMap: Record<string, any> = {
              employee_joined: UserPlus, kpi_update: Award, kpi_assigned: Award,
              payroll: DollarSign, leave_request: Calendar, performance_review: Award,
              attendance: Clock,
            };
            const colorMap: Record<string, string> = {
              employee_joined: 'bg-blue-100 text-blue-600', kpi_update: 'bg-purple-100 text-purple-600',
              kpi_assigned: 'bg-purple-100 text-purple-600', payroll: 'bg-green-100 text-green-600',
              leave_request: 'bg-yellow-100 text-yellow-600', performance_review: 'bg-purple-100 text-purple-600',
              attendance: 'bg-green-100 text-green-600',
            };
            setRecentActivities(dash.recentActivities.slice(0, 5).map((a: any) => ({
              id: a.id,
              action: a.title,
              detail: a.detail || '',
              time: a.time ? new Date(a.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '',
              icon: iconMap[a.type] || Activity,
              color: colorMap[a.type] || 'bg-gray-100 text-gray-600',
            })));
          }
          setLoading(false);
          return;
        }
      }

      // Fallback: parallel fetch
      const [empRes, attRes, kpiRes, leaveRes, actRes] = await Promise.allSettled([
        fetch('/api/humanify/employees?limit=200&offset=0').then(r => r.json()),
        fetch('/api/humanify/attendance?period=month').then(r => r.json()),
        fetch('/api/humanify/kpi').then(r => r.json()),
        fetch('/api/humanify/leave').then(r => r.json()),
        fetch('/api/humanify/activities?limit=10').then(r => r.json()),
      ]);

      // Process employee stats
      if (empRes.status === 'fulfilled' && empRes.value?.data) {
        const employees = Array.isArray(empRes.value.data) ? empRes.value.data : [];
        if (employees.length > 0) {
          const total = empRes.value.meta?.total || employees.length;
          const active = employees.filter((e: any) => e.status === 'active').length;
          const onLeave = employees.filter((e: any) => e.status === 'on_leave').length;
          const inactive = employees.filter((e: any) => e.status === 'inactive' || e.status === 'terminated').length;
          const perfScores = employees.filter((e: any) => e.performance?.score > 0).map((e: any) => e.performance.score);
          const avgPerf = perfScores.length > 0 ? Math.round(perfScores.reduce((s: number, v: number) => s + v, 0) / perfScores.length) : stats.avgPerf;
          const topPerformers = employees.filter((e: any) => e.performance?.score >= 85).length;

          // Build department stats from real data
          const deptMap: Record<string, any> = {};
          employees.forEach((e: any) => {
            const dept = e.department || 'Other';
            if (!deptMap[dept]) deptMap[dept] = { department: dept, total: 0, active: 0, perf: [], attend: [], color: 'blue' };
            deptMap[dept].total++;
            if (e.status === 'active') deptMap[dept].active++;
            if (e.performance?.score) deptMap[dept].perf.push(e.performance.score);
            if (e.performance?.attendance) deptMap[dept].attend.push(e.performance.attendance);
          });
          const realDeptStats = Object.values(deptMap).map((d: any, i: number) => ({
            ...d,
            perf: d.perf.length > 0 ? Math.round(d.perf.reduce((s: number, v: number) => s + v, 0) / d.perf.length) : 80,
            attend: d.attend.length > 0 ? Math.round(d.attend.reduce((s: number, v: number) => s + v, 0) / d.attend.length) : 95,
            color: ['blue', 'green', 'yellow', 'purple', 'indigo', 'cyan'][i % 6]
          }));
          if (realDeptStats.length > 0) setDeptStats(realDeptStats);

          setStats(prev => ({ ...prev, total, active, onLeave, inactive, avgPerf, topPerformers }));
        }
      }

      // Process attendance stats
      if (attRes.status === 'fulfilled') {
        const attData = attRes.value?.data || attRes.value;
        const summary = attData?.summary;
        if (summary?.avgAttendance) {
          setStats(prev => ({ ...prev, attendanceToday: Math.round(summary.avgAttendance) }));
        }
      }

      // Process KPI stats
      if (kpiRes.status === 'fulfilled' && kpiRes.value?.summary) {
        const kpiSummary = kpiRes.value.summary;
        if (kpiSummary.avgAchievement) {
          setStats(prev => ({ ...prev, avgKpi: kpiSummary.avgAchievement }));
        }
      }

      // Process leave/pending approvals
      if (leaveRes.status === 'fulfilled') {
        const leaveData = leaveRes.value?.data;
        if (Array.isArray(leaveData) && leaveData.length > 0) {
          const pending = leaveData.filter((l: any) => l.status === 'pending');
          if (pending.length > 0) {
            const mapped = pending.slice(0, 5).map((l: any, i: number) => ({
              id: l.id || String(i),
              type: 'leave',
              title: `Cuti ${l.leaveType === 'annual' ? 'Tahunan' : l.leaveType === 'sick' ? 'Sakit' : 'Personal'} - ${l.employeeName || 'Karyawan'}`,
              subtitle: `${l.startDate} s/d ${l.endDate} (${l.totalDays || '-'} hari)`,
              status: 'pending',
              date: l.startDate || '',
              color: l.leaveType === 'sick' ? 'red' : 'yellow'
            }));
            setPendingApprovals(mapped);
          }
        }
      }

      // Process activities from API
      if (actRes.status === 'fulfilled' && actRes.value?.success) {
        const acts = actRes.value.data;
        if (Array.isArray(acts) && acts.length > 0) {
          const iconMap: Record<string, any> = {
            employee_joined: UserPlus, kpi_update: Award, kpi_assigned: Award,
            payroll: DollarSign, leave_request: Calendar,
          };
          const colorMap: Record<string, string> = {
            employee_joined: 'bg-blue-100 text-blue-600', kpi_update: 'bg-purple-100 text-purple-600',
            payroll: 'bg-green-100 text-green-600', leave_request: 'bg-yellow-100 text-yellow-600',
          };
          setRecentActivities(acts.slice(0, 5).map((a: any) => ({
            id: a.id,
            action: a.title,
            detail: a.detail || '',
            time: a.time ? new Date(a.time).toLocaleDateString('id-ID') : '',
            icon: iconMap[a.type] || Activity,
            color: colorMap[a.type] || 'bg-gray-100 text-gray-600',
          })));
        }
      }
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
      setStats(MOCK_HRIS_STATS);
      setPendingApprovals(MOCK_PENDING_APPROVALS);
      setDeptStats(MOCK_DEPT_STATS);
      setRecentActivities(MOCK_RECENT_ACTIVITIES);
      setUpcoming(MOCK_UPCOMING);
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }
  }

  async function handleApproval(id: string, status: 'approved' | 'rejected') {
    try {
      const res = await fetch('/api/humanify/leave', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setPendingApprovals(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.warn('Approval action failed:', err);
    }
  }

  if (!mounted) {
    return (
      <HQLayout title="Humanify" subtitle={t('hris.subtitle')}>
        <div className="space-y-6 animate-pulse">
          <div className="h-36 rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}</div>
        </div>
      </HQLayout>
    );
  }

  const HRIS_MODULES = getHrisModules(t);
  const QUICK_ACTIONS = getQuickActions(t);

  const statCards = [
    { label: t('hris.totalEmployees'), value: stats.total, icon: Users, gradient: 'from-blue-500 to-indigo-600', trend: { value: '+3', positive: true }, href: '/humanify/employees' },
    { label: t('hris.activeEmployees'), value: stats.active, icon: UserCheck, gradient: 'from-emerald-500 to-teal-600', trend: stats.total ? { value: `${Math.round(stats.active / stats.total * 100)}%`, positive: true } : undefined, href: '/humanify/employees' },
    { label: t('hris.onLeave'), value: stats.onLeave, icon: Calendar, gradient: 'from-amber-500 to-orange-600', href: '/humanify/leave' },
    { label: t('hris.avgPerformance'), value: `${stats.avgPerf}%`, icon: BarChart3, gradient: 'from-violet-500 to-purple-600', trend: { value: '+2.3%', positive: true }, href: '/humanify/performance' },
    { label: t('hris.avgKpiAchievement'), value: `${stats.avgKpi}%`, icon: Target, gradient: 'from-indigo-500 to-blue-600', trend: { value: '+5.1%', positive: true }, href: '/humanify/kpi' },
    { label: t('hris.attendanceToday'), value: `${stats.attendanceToday}%`, icon: Clock, gradient: 'from-cyan-500 to-sky-600', href: '/humanify/attendance' },
    { label: t('hris.topPerformers'), value: stats.topPerformers, icon: Award, gradient: 'from-orange-500 to-rose-600', trend: { value: '+5', positive: true }, href: '/humanify/kpi' },
    { label: t('hris.pendingApproval'), value: pendingApprovals.length, icon: AlertCircle, gradient: 'from-rose-500 to-red-600', href: '/humanify/leave' },
  ];

  const deptChartData = deptStats.map((d) => ({
    name: d.department?.length > 12 ? `${d.department.slice(0, 10)}…` : d.department,
    active: d.active,
    total: d.total,
  }));

  return (
    <HQLayout title="Humanify" subtitle={t('hris.subtitle')}>
      <div className="space-y-6">
        <EnterprisePageHeader
          title="Humanify Command Center"
          subtitle="Ringkasan workforce real-time — karyawan, kehadiran, KPI, approval, dan modul HRIS terintegrasi"
          badge="HRIS Dashboard"
          icon={LayoutDashboard}
          gradient="indigo"
          actions={
            <>
              {lastUpdated && <span className="rounded-xl bg-white/15 px-3 py-2 text-xs text-white/80 backdrop-blur-sm">Update {lastUpdated}</span>}
              <button type="button" onClick={fetchDashboardData} disabled={loading} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <Link href="/humanify/workforce-analytics" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25">Analytics</Link>
            </>
          }
        />

        <div className="flex gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm w-fit">
          {(['overview', 'modules'] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setViewTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${viewTab === tab ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              {tab === 'overview' ? 'Ringkasan' : 'Semua Modul'}
            </button>
          ))}
        </div>

        {viewTab === 'overview' && (
        <>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {statCards.map((s, i) => (
            <HRStatCard key={i} label={s.label} value={s.value} trend={s.trend} icon={s.icon} gradient={s.gradient} onClick={() => router.push(s.href)} />
          ))}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{t('hris.quickActions')}</h3>
              <p className="text-white/70 text-sm">{t('hris.quickActionsDesc')}</p>
            </div>
            <Zap className="w-6 h-6 text-yellow-300" />
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => router.push(a.href)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-center group">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── MODULE NAVIGATION — overview shortcuts ── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {[
            { label: 'Karyawan', href: '/humanify/employees', icon: Users, c: 'from-blue-500 to-indigo-600' },
            { label: 'Absensi', href: '/humanify/attendance', icon: Clock, c: 'from-emerald-500 to-teal-600' },
            { label: 'Payroll', href: '/humanify/payroll', icon: DollarSign, c: 'from-violet-500 to-purple-600' },
            { label: 'KPI', href: '/humanify/kpi', icon: Target, c: 'from-amber-500 to-orange-600' },
            { label: 'Rekrutmen', href: '/humanify/recruitment', icon: UserPlus, c: 'from-rose-500 to-pink-600' },
            { label: 'Laporan', href: '/humanify/reports', icon: BarChart3, c: 'from-cyan-500 to-sky-600' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${item.c} p-4 text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg`}>
              <item.icon className="h-5 w-5 opacity-90" />
              <span className="text-sm font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* ── TWO COLUMN: PENDING APPROVALS + RECENT ACTIVITIES ── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="font-semibold text-gray-900">{t('hris.pendingApproval')}</h3>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{pendingApprovals.length}</span>
              </div>
              <a href="/humanify/leave" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">{t('hris.viewAll')} <ArrowRight className="w-3 h-3" /></a>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleApproval(item.id, 'approved')} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title={t('hris.approve')}>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleApproval(item.id, 'rejected')} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title={t('hris.reject')}>
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{item.date}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">{t('hris.recentActivities')}</h3>
              </div>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {recentActivities.map((act) => (
                <div key={act.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${act.color} flex-shrink-0 mt-0.5`}>
                      <act.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{act.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{act.detail}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TWO COLUMN: DEPT OVERVIEW + UPCOMING CALENDAR ── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Department Overview */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">{t('hris.deptOverview')}</h3>
              <p className="text-xs text-slate-500">Headcount aktif per departemen</p>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="active" fill="#6366f1" name="Aktif" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {deptStats.map((d) => (
                  <div key={d.department} className="border rounded-xl p-4 hover:shadow-md transition-all hover:border-indigo-200 group">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-sm">{d.department}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d.active}/{d.total}</span>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{t('hris.performance')}</span><span className={`font-medium ${d.perf >= 85 ? 'text-green-600' : d.perf >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{d.perf}%</span></div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${d.perf >= 85 ? 'bg-green-500' : d.perf >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${d.perf}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{t('hris.attendance')}</span><span className="font-medium">{d.attend}%</span></div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${d.attend}%` }} /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900">{t('hris.upcomingAgenda')}</h3>
              </div>
            </div>
            <div className="divide-y">
              {upcoming.map((ev) => {
                const colors: Record<string, string> = {
                  red: 'bg-red-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
                  yellow: 'bg-yellow-500', blue: 'bg-blue-500', indigo: 'bg-indigo-500'
                };
                return (
                  <div key={ev.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${colors[ev.color] || 'bg-gray-400'} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                        <p className="text-xs text-gray-500">{ev.date}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t">
              <button className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                {t('hris.viewAllAgenda')} →
              </button>
            </div>
          </div>
        </div>

        {/* ── ANNOUNCEMENTS / INFO BANNER ── */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900">{t('hris.hrAnnouncement')}</h4>
              <p className="text-sm text-amber-700 mt-1">Batas pengumpulan data lembur Februari 2026 adalah <strong>5 Maret 2026</strong>. Pastikan semua manajer cabang sudah menginput data timesheet dan lembur karyawan masing-masing melalui modul Timesheet atau Manager Self Service.</p>
              <div className="flex gap-2 mt-3">
                <a href="/humanify/attendance-management" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">{t('hris.manageAttendance')}</a>
                <a href="/humanify/payroll" className="text-xs px-3 py-1.5 border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100">{t('hris.processPayroll')}</a>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {viewTab === 'modules' && (
          <DashboardModuleGrid
            categories={HRIS_MODULES}
            title={t('hris.hrisModules')}
            subtitle={t('hris.modulesAvailable', { count: HRIS_MODULES.reduce((acc, c) => acc + c.modules.length, 0) })}
          />
        )}

      </div>
    </HQLayout>
  );
}

export { getServerSideProps } from '@/lib/humanify/require-session';
