import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown, Award,
  Calendar, BarChart3, Target, Star, AlertCircle, AlertTriangle,
  Building2, ChevronRight, Download, Search, Eye, Edit,
  Briefcase, DollarSign, FileText, Shield, Heart, Plane,
  GraduationCap, UserPlus, Settings, FolderOpen, ClipboardList,
  CheckCircle2, XCircle, ArrowRight, Bell, Zap, Activity,
  PieChart, Layers, MapPin, CircleDot, Megaphone, KeyRound, PenTool, BookOpen, Timer
} from 'lucide-react';

// ── HRIS Module Definitions (translated via t()) ──
function getHrisModules(t: (key: string) => string) {
  return [
    {
      category: t('hris.catEmployeeManagement'),
      color: 'blue',
      modules: [
        { key: 'employees', label: t('hris.employeeData'), desc: t('hris.employeeDataDesc'), href: '/hq/hris/employees', icon: Users, color: 'bg-blue-500' },
        { key: 'organization', label: t('hris.orgStructure'), desc: t('hris.orgStructureDesc'), href: '/hq/hris/organization', icon: Building2, color: 'bg-blue-600' },
        { key: 'onboarding', label: 'Onboarding', desc: 'Alur masuk karyawan baru & checklist', href: '/hq/hris/onboarding', icon: UserPlus, color: 'bg-blue-400' },
        { key: 'offboarding', label: 'Offboarding / Exit', desc: 'Alur keluar, clearance, exit interview', href: '/hq/hris/offboarding', icon: KeyRound, color: 'bg-blue-700' },
        { key: 'contracts', label: 'Kontrak & Reminder', desc: 'Masa kontrak, perpanjangan, notifikasi', href: '/hq/hris/contracts', icon: FileText, color: 'bg-sky-600' },
        { key: 'ess', label: t('hris.employeeSelfService'), desc: t('hris.employeeSelfServiceDesc'), href: '/hq/hris/ess', icon: UserCheck, color: 'bg-blue-800' },
        { key: 'mss', label: t('hris.managerSelfService'), desc: t('hris.managerSelfServiceDesc'), href: '/hq/hris/mss', icon: Briefcase, color: 'bg-indigo-700' },
      ]
    },
    {
      category: t('hris.catAttendanceLeave'),
      color: 'green',
      modules: [
        { key: 'attendance', label: t('hris.attendance'), desc: t('hris.attendanceDesc'), href: '/hq/hris/attendance', icon: Clock, color: 'bg-green-500' },
        { key: 'attendance-daily', label: 'Rekap Harian', desc: 'Absensi harian per karyawan', href: '/hq/hris/attendance/daily', icon: ClipboardList, color: 'bg-green-500' },
        { key: 'attendance-mgmt', label: t('hris.attendanceMgmt'), desc: t('hris.attendanceMgmtDesc'), href: '/hq/hris/attendance-management', icon: Timer, color: 'bg-green-600' },
        { key: 'leave', label: t('hris.leaveManagement'), desc: t('hris.leaveManagementDesc'), href: '/hq/hris/leave', icon: Calendar, color: 'bg-green-400' },
        { key: 'attendance-devices', label: t('hris.attendanceDevices'), desc: t('hris.attendanceDevicesDesc'), href: '/hq/hris/attendance/devices', icon: Layers, color: 'bg-green-700' },
        { key: 'attendance-settings', label: 'Kebijakan Absensi', desc: 'Geofence, toleransi telat, shift', href: '/hq/hris/attendance/settings', icon: Settings, color: 'bg-emerald-700' },
      ]
    },
    {
      category: t('hris.catPerformanceKpi'),
      color: 'purple',
      modules: [
        { key: 'kpi', label: t('hris.kpiDashboard'), desc: t('hris.kpiDashboardDesc'), href: '/hq/hris/kpi', icon: Target, color: 'bg-purple-500' },
        { key: 'performance', label: t('hris.performanceReview'), desc: t('hris.performanceReviewDesc'), href: '/hq/hris/performance', icon: Award, color: 'bg-purple-600' },
        { key: 'kpi-settings', label: t('hris.kpiSettings'), desc: t('hris.kpiSettingsDesc'), href: '/hq/hris/kpi-settings', icon: Settings, color: 'bg-purple-400' },
        { key: 'engagement', label: t('hris.employeeEngagement'), desc: t('hris.employeeEngagementDesc'), href: '/hq/hris/engagement', icon: Heart, color: 'bg-purple-700' },
      ]
    },
    {
      category: t('hris.catPayrollFinance'),
      color: 'emerald',
      modules: [
        { key: 'payroll', label: t('hris.payroll'), desc: t('hris.payrollDesc'), href: '/hq/hris/payroll', icon: DollarSign, color: 'bg-emerald-500' },
        { key: 'payroll-main', label: 'Proses Gaji', desc: 'Payroll run bulanan + bulk upload', href: '/hq/hris/payroll/main', icon: DollarSign, color: 'bg-emerald-700' },
        { key: 'payroll-slip', label: 'Slip Gaji', desc: 'Distribusi payslip karyawan', href: '/hq/hris/payroll/slip-gaji', icon: FileText, color: 'bg-emerald-600' },
        { key: 'payroll-thr', label: 'THR & Bonus', desc: 'Tunjangan Hari Raya tahunan', href: '/hq/hris/payroll/thr', icon: Star, color: 'bg-pink-500' },
        { key: 'payroll-pph21', label: 'PPh 21', desc: 'Pajak penghasilan & SPT masa', href: '/hq/hris/payroll/pph21', icon: FileText, color: 'bg-yellow-600' },
        { key: 'payroll-bpjs', label: 'BPJS Kesehatan & TK', desc: 'Iuran BPJS Kesehatan & Ketenagakerjaan', href: '/hq/hris/payroll/bpjs', icon: Shield, color: 'bg-red-500' },
        { key: 'payroll-lembur', label: 'Lembur (Payroll)', desc: 'Rekap lembur untuk payroll', href: '/hq/hris/payroll/lembur', icon: Clock, color: 'bg-amber-600' },
        { key: 'payroll-laporan', label: 'Laporan Gaji', desc: 'Laporan & analisis payroll', href: '/hq/hris/payroll/laporan', icon: BarChart3, color: 'bg-teal-600' },
        { key: 'travel-expense', label: t('hris.travelExpense'), desc: t('hris.travelExpenseDesc'), href: '/hq/hris/travel-expense', icon: Plane, color: 'bg-emerald-600' },
        { key: 'project-mgmt', label: t('hris.projectMgmt'), desc: t('hris.projectMgmtDesc'), href: '/hq/hris/project-management', icon: FolderOpen, color: 'bg-emerald-700' },
      ]
    },
    {
      category: t('hris.catRecruitmentTraining'),
      color: 'orange',
      modules: [
        { key: 'recruitment', label: t('hris.recruitment'), desc: t('hris.recruitmentDesc'), href: '/hq/hris/recruitment', icon: UserPlus, color: 'bg-orange-500' },
        { key: 'training', label: t('hris.training'), desc: t('hris.trainingDesc'), href: '/hq/hris/training', icon: GraduationCap, color: 'bg-orange-600' },
        { key: 'training-dev', label: 'Learning & Development', desc: 'Kurikulum, batch, ujian, outsourcing', href: '/hq/hris/training-development', icon: BookOpen, color: 'bg-orange-700' },
        { key: 'training-scoring', label: 'Skor & Penilaian Training', desc: 'Competency scoring & sertifikasi', href: '/hq/hris/training-scoring', icon: PenTool, color: 'bg-amber-700' },
      ]
    },
    {
      category: t('hris.catAnalyticsCompliance'),
      color: 'indigo',
      modules: [
        { key: 'calendar', label: 'Kalender HR', desc: 'Cuti, shift, gajian, event dalam satu kalender', href: '/hq/hris/calendar', icon: Calendar, color: 'bg-indigo-500' },
        { key: 'announcements', label: 'Pengumuman', desc: 'Broadcast pengumuman ke karyawan', href: '/hq/hris/announcements', icon: Megaphone, color: 'bg-fuchsia-600' },
        { key: 'workforce-analytics', label: t('hris.workforceAnalytics'), desc: t('hris.workforceAnalyticsDesc'), href: '/hq/hris/workforce-analytics', icon: PieChart, color: 'bg-indigo-600' },
        { key: 'industrial-relations', label: t('hris.industrialRelations'), desc: t('hris.industrialRelationsDesc'), href: '/hq/hris/industrial-relations', icon: AlertTriangle, color: 'bg-indigo-700' },
      ]
    },
  ];
}

function getQuickActions(t: (key: string) => string) {
  return [
    { label: t('hris.addEmployee'), href: '/hq/hris/employees', icon: UserPlus, color: 'bg-blue-600' },
    { label: t('hris.inputAttendance'), href: '/hq/hris/attendance', icon: Clock, color: 'bg-green-600' },
    { label: t('hris.processPayroll'), href: '/hq/hris/payroll/main', icon: DollarSign, color: 'bg-emerald-600' },
    { label: t('hris.openVacancy'), href: '/hq/hris/recruitment', icon: UserPlus, color: 'bg-orange-600' },
    { label: t('hris.createKpi'), href: '/hq/hris/kpi', icon: Target, color: 'bg-purple-600' },
    { label: 'Kirim Pengumuman', href: '/hq/hris/announcements', icon: Megaphone, color: 'bg-fuchsia-600' },
    { label: 'Kalender HR', href: '/hq/hris/calendar', icon: Calendar, color: 'bg-indigo-600' },
    { label: t('hris.scheduleTraining'), href: '/hq/hris/training', icon: GraduationCap, color: 'bg-red-600' },
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

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch multiple APIs in parallel
      const [empRes, attRes, kpiRes, leaveRes] = await Promise.allSettled([
        fetch('/api/hq/hris/employees?limit=200&offset=0').then(r => r.json()),
        fetch('/api/hq/hris/attendance?period=month').then(r => r.json()),
        fetch('/api/hq/hris/kpi').then(r => r.json()),
        fetch('/api/hq/hris/leave').then(r => r.json()),
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
    } catch (err) {
      console.warn('Dashboard data fetch error:', err);
      setStats(MOCK_HRIS_STATS);
      setPendingApprovals(MOCK_PENDING_APPROVALS);
      setDeptStats(MOCK_DEPT_STATS);
      setRecentActivities(MOCK_RECENT_ACTIVITIES);
      setUpcoming(MOCK_UPCOMING);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(id: string, status: 'approved' | 'rejected') {
    try {
      const res = await fetch('/api/hq/hris/leave', {
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

  if (!mounted) return null;

  const HRIS_MODULES = getHrisModules(t);
  const QUICK_ACTIONS = getQuickActions(t);

  const statCards = [
    { label: t('hris.totalEmployees'), value: stats.total, icon: Users, color: 'bg-blue-500', trend: '+3', trendUp: true },
    { label: t('hris.activeEmployees'), value: stats.active, icon: UserCheck, color: 'bg-green-500', trend: `${Math.round(stats.active / stats.total * 100)}%`, trendUp: true },
    { label: t('hris.onLeave'), value: stats.onLeave, icon: Calendar, color: 'bg-yellow-500', trend: null, trendUp: false },
    { label: t('hris.avgPerformance'), value: `${stats.avgPerf}%`, icon: BarChart3, color: 'bg-purple-500', trend: '+2.3%', trendUp: true },
    { label: t('hris.avgKpiAchievement'), value: `${stats.avgKpi}%`, icon: Target, color: 'bg-indigo-500', trend: '+5.1%', trendUp: true },
    { label: t('hris.attendanceToday'), value: `${stats.attendanceToday}%`, icon: Clock, color: 'bg-emerald-500', trend: null, trendUp: true },
    { label: t('hris.topPerformers'), value: stats.topPerformers, icon: Award, color: 'bg-orange-500', trend: '+5', trendUp: true },
    { label: t('hris.pendingApproval'), value: pendingApprovals.length, icon: AlertCircle, color: 'bg-red-500', trend: null, trendUp: false },
  ];

  return (
    <HQLayout title={t('hris.title')} subtitle={t('hris.subtitle')}>
      <div className="space-y-6">

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${s.color} bg-opacity-10`}>
                  <s.icon className={`w-4 h-4 ${s.color.replace('bg-', 'text-')}`} />
                </div>
                {s.trend && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {s.trend}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl p-5 text-white">
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

        {/* ── MODULE NAVIGATION ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('hris.hrisModules')}</h3>
            <p className="text-sm text-gray-500">{t('hris.modulesAvailable', { count: HRIS_MODULES.reduce((acc, c) => acc + c.modules.length, 0) })}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HRIS_MODULES.map((cat) => (
              <div key={cat.category} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-4 py-3 border-b bg-gray-50/50">
                  <h4 className="font-semibold text-sm text-gray-800">{cat.category}</h4>
                </div>
                <div className="p-2">
                  {cat.modules.map((m) => (
                    <a key={m.key} href={m.href}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className={`w-9 h-9 rounded-lg ${m.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                        <m.icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{m.label}</p>
                        <p className="text-[11px] text-gray-500 truncate">{m.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
              <a href="/hq/hris/leave" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">{t('hris.viewAll')} <ArrowRight className="w-3 h-3" /></a>
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
          <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{t('hris.deptOverview')}</h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

          {/* Upcoming Events */}
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
                <a href="/hq/hris/attendance-management" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">{t('hris.manageAttendance')}</a>
                <a href="/hq/hris/payroll" className="text-xs px-3 py-1.5 border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100">{t('hris.processPayroll')}</a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </HQLayout>
  );
}
