import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import HQLayout from '@/components/humanify/HumanifyLayout';
import DashboardModuleGrid from '@/components/humanify/DashboardModuleGrid';
import DataSourceBadge from '@/components/humanify/DataSourceBadge';
import GaOnboardingChecklist from '@/components/humanify/GaOnboardingChecklist';
import NewCompanyLaunchBanner from '@/components/humanify/NewCompanyLaunchBanner';
import { emptyMonthPresence, type MonthPresenceMix } from '@/lib/hris/month-presence';
import MonthPresencePie from '@/components/humanify/MonthPresencePie';
import AimanToolsFunctionsCard from '@/components/humanify/AimanToolsFunctionsCard';
import FireProgressBar from '@/components/humanify/FireProgressBar';
import FirstRunTour from '@/components/humanify/FirstRunTour';
import QuickActionsDock from '@/components/humanify/QuickActionsDock';
import HrisEmptyState from '@/components/humanify/HrisEmptyState';
import EmployeeAvatar from '@/components/humanify/EmployeeAvatar';
import { DashboardBannerRail } from '@/components/humanify/MarketingBannerCarousel';
import { HrisHeroMetricCard, HrisHeroNavCard } from '@/components/humanify/HrisHeroMetricCard';
import { OpsStage, OpsPageHero, OpsPanel } from '@/components/humanify/OpsPageChrome';
import { EnterpriseTabBar } from '@/components/humanify/PerformanceModuleChrome';
import { OpsBarChart, OpsPieChart, OpsLineChart } from '@/components/humanify/ops-charts';
import { HF_CHART_COLORS_SOLID } from '@/lib/humanify/chart-tokens';
import { useTranslation } from '@/lib/i18n';
import { USE_MOCK_UI, type HrisDataSource } from '@/lib/hris/data-source';
import {
  Users, UserCheck, Clock, Award,
  Calendar, BarChart3, Target, Star, AlertTriangle,
  Building2, Eye,
  Briefcase, DollarSign, FileText, Shield, Plane,
  GraduationCap, UserPlus, UserMinus, Settings, FolderOpen, ClipboardList,
  CheckCircle2, XCircle, ArrowRight, Bell, Activity,
  PieChart, Layers, Megaphone, KeyRound, PenTool, BookOpen, Timer, RefreshCw, LayoutDashboard,
  Inbox, Home, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PEOPLE_INSIGHT_PAGE_SIZE = 5;

function slicePeopleInsightPage<T>(rows: T[], page: number): T[] {
  const start = (Math.max(1, page) - 1) * PEOPLE_INSIGHT_PAGE_SIZE;
  return rows.slice(start, start + PEOPLE_INSIGHT_PAGE_SIZE);
}

function PeopleInsightPager({
  total,
  page,
  onChange,
}: {
  total: number;
  page: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PEOPLE_INSIGHT_PAGE_SIZE));
  if (total <= PEOPLE_INSIGHT_PAGE_SIZE) return null;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * PEOPLE_INSIGHT_PAGE_SIZE + 1;
  const to = Math.min(safePage * PEOPLE_INSIGHT_PAGE_SIZE, total);

  const windowSize = 5;
  let startPage = Math.max(1, safePage - Math.floor(windowSize / 2));
  let endPage = Math.min(totalPages, startPage + windowSize - 1);
  startPage = Math.max(1, endPage - windowSize + 1);
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hf-border-subtle)] pt-2">
      <p className="text-[10px] text-[color:var(--hf-ink-muted)]">
        {from}–{to} dari {total}
      </p>
      <div className="inline-flex items-center gap-0.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onChange(safePage - 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--hf-border)] text-[color:var(--hf-ink-muted)] disabled:opacity-40 hover:bg-[var(--hf-surface-muted)]"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onChange(1)}
              className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border border-[var(--hf-border)] px-1.5 text-[11px] font-semibold tabular-nums text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]"
            >
              1
            </button>
            {startPage > 2 && <span className="px-0.5 text-[10px] text-[color:var(--hf-ink-faint)]">…</span>}
          </>
        )}
        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition ${
              n === safePage
                ? 'bg-[var(--hf-brand-600)] text-white'
                : 'border border-[var(--hf-border)] text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
            }`}
          >
            {n}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-0.5 text-[10px] text-[color:var(--hf-ink-faint)]">…</span>}
            <button
              type="button"
              onClick={() => onChange(totalPages)}
              className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md border border-[var(--hf-border)] px-1.5 text-[11px] font-semibold tabular-nums text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onChange(safePage + 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--hf-border)] text-[color:var(--hf-ink-muted)] disabled:opacity-40 hover:bg-[var(--hf-surface-muted)]"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── HRIS Module Definitions (translated via t()) ──
function getHrisModules(t: (key: string) => string) {
  return [
    {
      category: t('hris.catEmployeeManagement'),
      color: 'blue',
      modules: [
        { key: 'employees', label: t('hris.employeeData'), desc: t('hris.employeeDataDesc'), href: '/humanify/employees', icon: Users, color: 'bg-[var(--hf-brand-500)]' },
        { key: 'organization', label: t('hris.orgStructure'), desc: t('hris.orgStructureDesc'), href: '/humanify/organization', icon: Building2, color: 'bg-[var(--hf-brand-600)]' },
        { key: 'onboarding', label: 'Onboarding', desc: 'Alur masuk karyawan baru & checklist', href: '/humanify/onboarding', icon: UserPlus, color: 'bg-[var(--hf-brand-100)]' },
        { key: 'assets', label: 'Manajemen Aset', desc: 'Laptop, HP, ID card — issue & return', href: '/humanify/assets', icon: FolderOpen, color: 'bg-[var(--hf-brand-500)]' },
        { key: 'offboarding', label: 'Offboarding / Exit', desc: 'Alur keluar, clearance, exit interview', href: '/humanify/offboarding', icon: KeyRound, color: 'bg-[var(--hf-brand)]' },
        { key: 'org-settings', label: 'Pengaturan Organisasi', desc: 'Policy engine, access, workflow', href: '/humanify/org-settings', icon: Settings, color: 'bg-gray-600' },
        { key: 'contracts', label: 'Kontrak & Reminder', desc: 'Masa kontrak, perpanjangan, notifikasi', href: '/humanify/contracts', icon: FileText, color: 'bg-sky-600' },
        { key: 'ess', label: t('hris.employeeSelfService'), desc: t('hris.employeeSelfServiceDesc'), href: '/humanify/ess', icon: UserCheck, color: 'bg-[var(--hf-brand-100)]' },
        { key: 'mss', label: t('hris.managerSelfService'), desc: t('hris.managerSelfServiceDesc'), href: '/humanify/mss', icon: Briefcase, color: 'bg-[var(--hf-brand)]' },
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
        { key: 'okr', label: 'OKR / KPI', desc: 'Objectives & Key Results cascading alignment', href: '/humanify/okr', icon: Target, color: 'bg-[var(--hf-brand-600)]' },
        { key: 'performance', label: t('hris.performanceReview'), desc: t('hris.performanceReviewDesc'), href: '/humanify/performance', icon: Award, color: 'bg-purple-600' },
        { key: 'kpi-settings', label: t('hris.kpiSettings'), desc: t('hris.kpiSettingsDesc'), href: '/humanify/kpi-settings', icon: Settings, color: 'bg-purple-400' },
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
        { key: 'lms', label: 'LMS', desc: 'Kursus, bank soal, tes, dan penilaian', href: '/humanify/lms', icon: GraduationCap, color: 'bg-[var(--hf-brand-600)]' },
        { key: 'certificates', label: 'Certificate Registry', desc: 'Tracker sertifikat & lisensi karyawan', href: '/humanify/certificates', icon: Award, color: 'bg-amber-500' },
        { key: 'travel-expense', label: t('hris.travelExpense'), desc: t('hris.travelExpenseDesc'), href: '/humanify/travel-expense', icon: Plane, color: 'bg-emerald-600' },
      ]
    },
    {
      category: t('hris.catAnalyticsCompliance'),
      color: 'indigo',
      modules: [
        { key: 'calendar', label: 'Kalender HR', desc: 'Cuti, shift, gajian, event dalam satu kalender', href: '/humanify/calendar', icon: Calendar, color: 'bg-[var(--hf-brand-500)]' },
        { key: 'announcements', label: 'Pengumuman', desc: 'Broadcast pengumuman ke karyawan', href: '/humanify/announcements', icon: Megaphone, color: 'bg-fuchsia-600' },
        { key: 'workforce-analytics', label: t('hris.workforceAnalytics'), desc: t('hris.workforceAnalyticsDesc'), href: '/humanify/workforce-analytics', icon: PieChart, color: 'bg-[var(--hf-brand-600)]' },
        { key: 'reports', label: 'Laporan HRIS', desc: 'Pusat laporan kepegawaian, KPI, absensi & payroll', href: '/humanify/reports', icon: BarChart3, color: 'bg-[var(--hf-brand-100)]' },
        { key: 'activities', label: 'Aktivitas HR', desc: 'Timeline aktivitas kepegawaian & approval', href: '/humanify/activities', icon: Activity, color: 'bg-[var(--hf-brand-600)]' },
        { key: 'industrial-relations', label: t('hris.industrialRelations'), desc: t('hris.industrialRelationsDesc'), href: '/humanify/industrial-relations', icon: AlertTriangle, color: 'bg-[var(--hf-brand)]' },
      ]
    },
  ];
}


const INBOX_TYPE_LABELS: Record<string, string> = {
  leave: 'Cuti',
  overtime: 'Lembur',
  claim: 'Klaim',
  travel: 'Dinas',
  mutation: 'Mutasi',
  mutation_due: 'Mutasi efektif',
  contract: 'Kontrak',
  documents: 'Dokumen',
  attendance: 'Absensi',
  kasbon: 'Kasbon',
};

function greetingForHour(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function computeHrHealth(input: {
  total: number;
  active: number;
  attendanceToday: number;
  avgKpi: number;
  avgPerf: number;
  overdue: number;
  docAvg?: number | null;
}) {
  const parts: number[] = [];
  if (input.total > 0) parts.push((input.active / input.total) * 100);
  if (input.total > 0) parts.push(Math.min(100, input.attendanceToday));
  if (input.avgKpi > 0) parts.push(Math.min(100, input.avgKpi));
  if (input.avgPerf > 0) parts.push(Math.min(100, input.avgPerf));
  if (input.docAvg != null && input.docAvg >= 0) parts.push(input.docAvg);
  if (!parts.length) return null;
  let score = Math.round(parts.reduce((s, n) => s + n, 0) / parts.length);
  if (input.overdue > 0) score = Math.max(0, score - Math.min(25, input.overdue * 4));
  return score;
}

const EMPTY_HRIS_STATS = { total: 0, active: 0, onLeave: 0, inactive: 0, avgPerf: 0, avgKpi: 0, topPerformers: 0, attendanceToday: 0 };
const MOCK_HRIS_STATS = { total: 162, active: 148, onLeave: 8, inactive: 6, avgPerf: 82, avgKpi: 78, topPerformers: 35, attendanceToday: 94 };

const MOCK_PENDING_APPROVALS = [
  { id: 'lv1', type: 'leave', title: 'Cuti Tahunan - Siti Rahayu', subtitle: '15 Mar 2026 s/d 18 Mar 2026 (3 hari)', status: 'pending', date: '2026-03-15', color: 'yellow' },
  { id: 'lv2', type: 'leave', title: 'Cuti Sakit - Budi Santoso', subtitle: '12 Mar 2026 s/d 13 Mar 2026 (2 hari)', status: 'pending', date: '2026-03-12', color: 'red' },
  { id: 'lv3', type: 'leave', title: 'Cuti Personal - Lisa Permata', subtitle: '20 Mar 2026 (1 hari)', status: 'pending', date: '2026-03-20', color: 'yellow' },
  { id: 'ot1', type: 'overtime', title: 'Lembur - Eko Prasetyo', subtitle: 'Gudang Pusat, 4 jam (10 Mar 2026)', status: 'pending', date: '2026-03-10', color: 'blue' },
  { id: 'cl1', type: 'claim', title: 'Klaim Perjalanan - Dewi Lestari', subtitle: 'Perjalanan dinas Medan-Jakarta, Rp 4.500.000', status: 'pending', date: '2026-03-09', color: 'green' },
];

const MOCK_DEPT_STATS = [
  { department: 'Operations', total: 45, active: 42, onLeave: 2, inactive: 1, perf: 85, attend: 96, color: 'blue' },
  { department: 'Sales', total: 32, active: 30, onLeave: 1, inactive: 1, perf: 88, attend: 93, color: 'green' },
  { department: 'Finance', total: 18, active: 17, onLeave: 1, inactive: 0, perf: 82, attend: 97, color: 'yellow' },
  { department: 'Warehouse', total: 28, active: 26, onLeave: 1, inactive: 1, perf: 78, attend: 94, color: 'purple' },
  { department: 'Kitchen', total: 22, active: 20, onLeave: 2, inactive: 0, perf: 80, attend: 91, color: 'indigo' },
  { department: 'IT & Admin', total: 17, active: 13, onLeave: 1, inactive: 3, perf: 86, attend: 98, color: 'cyan' },
];

const MOCK_RECENT_ACTIVITIES = [
  { id: 'a1', action: 'Karyawan baru bergabung', detail: 'Rizki Firmansyah - IT Department, Cabang Jakarta', time: '2 jam lalu', icon: UserPlus, color: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand-600)]' },
  { id: 'a2', action: 'Evaluasi kinerja selesai', detail: 'Q1 2026 - Cabang Bandung (18 karyawan)', time: '5 jam lalu', icon: Award, color: 'bg-purple-100 text-purple-600' },
  { id: 'a3', action: 'Payroll diproses', detail: 'Gaji Februari 2026 - 148 karyawan, total Rp 1.2M', time: '1 hari lalu', icon: DollarSign, color: 'bg-green-100 text-green-600' },
  { id: 'a4', action: 'Training selesai', detail: 'Food Safety & Hygiene - 12 peserta lulus', time: '2 hari lalu', icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
  { id: 'a5', action: 'Kontrak diperpanjang', detail: 'Made Wirawan - Cabang Bali (PKWT 1 tahun)', time: '3 hari lalu', icon: FileText, color: 'bg-[var(--hf-brand-100)] text-[color:var(--hf-brand-600)]' },
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
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(USE_MOCK_UI ? MOCK_HRIS_STATS : EMPTY_HRIS_STATS);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>(USE_MOCK_UI ? MOCK_PENDING_APPROVALS : []);
  const [lastSnoozed, setLastSnoozed] = useState<{ id: string; type: string; title: string } | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>(USE_MOCK_UI ? MOCK_RECENT_ACTIVITIES : []);
  const [deptStats, setDeptStats] = useState<any[]>(USE_MOCK_UI ? MOCK_DEPT_STATS : []);
  const [workforceTrend, setWorkforceTrend] = useState<Array<{ week: string; Kehadiran: number; Kinerja: number }>>([]);
  const [topPerformersList, setTopPerformersList] = useState<any[]>([]);
  const [newHiresThisMonth, setNewHiresThisMonth] = useState<any[]>([]);
  const [resignationsThisMonth, setResignationsThisMonth] = useState<any[]>([]);
  const [disciplinarySpList, setDisciplinarySpList] = useState<any[]>([]);
  const [deptAnalyticsTab, setDeptAnalyticsTab] = useState<'headcount' | 'combined' | 'kinerja' | 'kehadiran'>('headcount');
  const [peopleInsightTab, setPeopleInsightTab] = useState<'kpi' | 'new' | 'resign' | 'sp'>('kpi');
  const [peopleInsightPage, setPeopleInsightPage] = useState(1);
  const [monthPresence, setMonthPresence] = useState<MonthPresenceMix>(() => emptyMonthPresence());
  const [upcoming, setUpcoming] = useState<any[]>(USE_MOCK_UI ? MOCK_UPCOMING : []);
  const [dataSource, setDataSource] = useState<HrisDataSource>(USE_MOCK_UI ? 'demo' : 'empty');
  const [pendingSummary, setPendingSummary] = useState<{ total: number; overdue: number; byType?: Record<string, number> }>({ total: 0, overdue: 0 });
  const [docCompliance, setDocCompliance] = useState<{
    activeEmployees: number;
    complete: number;
    incomplete: number;
    avgPercent: number;
    expiredDocs: number;
    expiringSoonDocs: number;
    topMissing: { type: string; label: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [viewTab, setViewTab] = useState<'overview' | 'modules'>('overview');
  const [feedTab, setFeedTab] = useState<'activities' | 'agenda'>('activities');
  const [trialInfo, setTrialInfo] = useState<{
    trialDaysLeft: number | null;
    trialExpiringSoon?: boolean;
    trialExpired?: boolean;
    plan?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
    fetch('/api/humanify/billing?action=current')
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setTrialInfo({
            trialDaysLeft: j.data.trialDaysLeft,
            trialExpiringSoon: j.data.trialExpiringSoon,
            trialExpired: j.data.trialExpired,
            plan: j.data.plan,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    if (window.location.hash !== '#action-inbox') return;
    setViewTab('overview');
    const t = window.setTimeout(() => {
      document.getElementById('action-inbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [loading]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const dashRes = await fetch('/api/humanify/dashboard');
      if (dashRes.ok) {
        const dash = await dashRes.json();
        if (dash.success) {
          if (dash.dataSource) setDataSource(dash.dataSource);
          if (dash.pendingSummary) setPendingSummary({
            total: dash.pendingSummary.total,
            overdue: dash.pendingSummary.overdue || 0,
            byType: dash.pendingSummary.byType,
          });
          setDocCompliance(dash.documentCompliance || null);
          if (dash.stats) setStats(dash.stats);
          setDeptStats(Array.isArray(dash.deptStats) ? dash.deptStats : []);
          setWorkforceTrend(Array.isArray(dash.workforceTrend) ? dash.workforceTrend : []);
          setTopPerformersList(Array.isArray(dash.topPerformersList) ? dash.topPerformersList : []);
          setNewHiresThisMonth(Array.isArray(dash.newHiresThisMonth) ? dash.newHiresThisMonth : []);
          setResignationsThisMonth(Array.isArray(dash.resignationsThisMonth) ? dash.resignationsThisMonth : []);
          setDisciplinarySpList(Array.isArray(dash.disciplinarySpList) ? dash.disciplinarySpList : []);
          if (dash.monthPresence?.buckets) setMonthPresence(dash.monthPresence);
          setPendingApprovals(Array.isArray(dash.pendingApprovals) ? dash.pendingApprovals : []);
          setUpcoming(Array.isArray(dash.upcoming) ? dash.upcoming : []);
          if (Array.isArray(dash.recentActivities) && dash.recentActivities.length > 0) {
            const iconMap: Record<string, any> = {
              employee_joined: UserPlus, kpi_update: Award, kpi_assigned: Award,
              payroll: DollarSign, leave_request: Calendar, performance_review: Award,
              attendance: Clock,
            };
            const colorMap: Record<string, string> = {
              employee_joined: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
              kpi_update: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
              kpi_assigned: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
              payroll: 'bg-emerald-50 text-[color:var(--hf-success)]',
              leave_request: 'bg-amber-50 text-[color:var(--hf-warning)]',
              performance_review: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
              attendance: 'bg-emerald-50 text-[color:var(--hf-success)]',
            };
            setRecentActivities(dash.recentActivities.slice(0, 5).map((a: any) => ({
              id: a.id,
              action: a.title,
              detail: a.detail || '',
              time: a.time ? new Date(a.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '',
              icon: iconMap[a.type] || Activity,
              color: colorMap[a.type] || 'bg-gray-100 text-gray-600',
            })));
          } else {
            setRecentActivities([]);
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
        const isMock = actRes.value.meta?.isMock;
        if (Array.isArray(acts) && acts.length > 0 && (!isMock || USE_MOCK_UI)) {
          const iconMap: Record<string, any> = {
            employee_joined: UserPlus, kpi_update: Award, kpi_assigned: Award,
            payroll: DollarSign, leave_request: Calendar,
          };
          const colorMap: Record<string, string> = {
            employee_joined: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
            kpi_update: 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]',
            payroll: 'bg-emerald-50 text-[color:var(--hf-success)]',
            leave_request: 'bg-amber-50 text-[color:var(--hf-warning)]',
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
      if (USE_MOCK_UI) {
        setDataSource('demo');
        setStats(MOCK_HRIS_STATS);
        setPendingApprovals(MOCK_PENDING_APPROVALS);
        setDeptStats(MOCK_DEPT_STATS);
        setRecentActivities(MOCK_RECENT_ACTIVITIES);
        setUpcoming(MOCK_UPCOMING);
      } else {
        setDataSource('empty');
      }
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }
  }

  async function handleApproval(item: { id: string; type?: string }, status: 'approved' | 'rejected') {
    const { id, type = 'leave' } = item;
    try {
      let res: Response;
      if (type === 'leave') {
        res = await fetch(`/api/humanify/leave-management?action=${status === 'approved' ? 'approve' : 'reject'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(status === 'approved'
            ? { leaveRequestId: id, comments: 'Disetujui dari dashboard' }
            : { leaveRequestId: id, reason: 'Ditolak dari dashboard' }),
        });
      } else if (type === 'overtime') {
        res = await fetch(`/api/humanify/overtime?action=${status === 'approved' ? 'approve' : 'reject'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(status === 'approved' ? { id } : { id, rejection_reason: 'Ditolak dari dashboard' }),
        });
      } else if (type === 'claim') {
        res = await fetch(`/api/humanify/workflow?action=${status === 'approved' ? 'approve-claim' : 'reject-claim'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...(status === 'rejected' ? { rejection_reason: 'Ditolak dari dashboard' } : {}) }),
        });
      } else if (type === 'travel') {
        res = await fetch(`/api/humanify/travel-expense?action=${status === 'approved' ? 'approve-request' : 'reject-request'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(status === 'approved' ? { id } : { id, reason: 'Ditolak dari dashboard' }),
        });
      } else if (type === 'kasbon') {
        res = await fetch(`/api/humanify/payroll-inputs?id=${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: status === 'approved' ? 'approved' : 'rejected' }),
        });
      } else {
        router.push('/humanify/mss');
        return;
      }
      const data = await res.json();
      if (data.success || res.ok) {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== id));
        fetchDashboardData();
      }
    } catch (err) {
      console.warn('Approval action failed:', err);
    }
  }

  async function handleSnooze(item: { id: string; type?: string; title?: string }) {
    try {
      const res = await fetch('/api/humanify/action-inbox-snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: item.type || 'leave', itemId: item.id, hours: 24 }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== item.id));
        setLastSnoozed({ id: item.id, type: item.type || 'leave', title: item.title || 'Item' });
      }
    } catch (err) {
      console.warn('Snooze failed:', err);
    }
  }

  async function handleUnsnooze() {
    if (!lastSnoozed) return;
    try {
      const res = await fetch('/api/humanify/action-inbox-snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unsnooze',
          itemType: lastSnoozed.type,
          itemId: lastSnoozed.id,
        }),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setLastSnoozed(null);
        fetchDashboardData();
      }
    } catch (err) {
      console.warn('Unsnooze failed:', err);
    }
  }

  if (!mounted) {
    return (
      <HQLayout>
        <OpsStage>
          <div className="h-36 animate-pulse rounded-[var(--hf-radius-xl)] bg-slate-200" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[var(--hf-radius-xl)] bg-slate-100" />
            ))}
          </div>
        </OpsStage>
      </HQLayout>
    );
  }

  const HRIS_MODULES = getHrisModules(t);
  const hasWorkforce = stats.total > 0 || stats.active > 0;
  const firstName = String(session?.user?.name || '').trim().split(/\s+/)[0];
  const now = new Date();
  const greet = greetingForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hrHealth = computeHrHealth({
    total: stats.total,
    active: stats.active,
    attendanceToday: stats.attendanceToday,
    avgKpi: stats.avgKpi,
    avgPerf: stats.avgPerf,
    overdue: pendingSummary.overdue,
    docAvg: docCompliance?.avgPercent,
  });
  const moduleCount = HRIS_MODULES.reduce((acc, c) => acc + c.modules.length, 0);
  const attention = [
    trialInfo?.trialExpired
      ? { tone: 'danger' as const, text: 'Masa trial sudah berakhir. Upgrade paket agar modul berbayar tetap aktif.', href: '/humanify/billing', cta: 'Buka billing' }
      : trialInfo?.trialExpiringSoon || (trialInfo?.plan === 'trial' && trialInfo.trialDaysLeft != null && trialInfo.trialDaysLeft <= 14)
        ? { tone: 'warning' as const, text: `Trial tersisa ${trialInfo.trialDaysLeft} hari.`, href: '/humanify/billing', cta: 'Pilih paket' }
        : null,
    pendingSummary.overdue > 0
      ? { tone: 'warning' as const, text: `${pendingSummary.overdue} item inbox lebih dari 48 jam belum ditindak.`, href: '#action-inbox', cta: 'Buka inbox' }
      : null,
    docCompliance && docCompliance.expiredDocs > 0
      ? { tone: 'danger' as const, text: `${docCompliance.expiredDocs} dokumen kedaluwarsa perlu diperbarui.`, href: '/humanify/employees', cta: 'Buka karyawan' }
      : null,
    docCompliance && docCompliance.incomplete > 0
      ? { tone: 'warning' as const, text: `${docCompliance.incomplete} karyawan belum lengkap dokumen inti.`, href: '#action-inbox', cta: 'Lengkapi' }
      : null,
    !hasWorkforce
      ? { tone: 'info' as const, text: 'Belum ada karyawan. Tambah data pertama agar dashboard terisi.', href: '/humanify/employees?add=1', cta: 'Tambah karyawan' }
      : null,
  ].filter(Boolean) as Array<{ tone: 'danger' | 'warning' | 'info'; text: string; href: string; cta: string }>;

  const featuredMetrics = [
    {
      label: t('hris.totalEmployees'),
      value: stats.total,
      hint: hasWorkforce ? `${stats.active} aktif` : undefined,
      icon: Users,
      tone: 'brand' as const,
      progress: stats.total > 0 ? (stats.active / stats.total) * 100 : null,
      href: '/humanify/employees',
      actionLabel: 'Buka karyawan',
    },
    {
      label: t('hris.attendanceToday'),
      value: hasWorkforce ? `${stats.attendanceToday}%` : '—',
      hint: hasWorkforce ? 'Hari ini' : 'Belum ada data',
      icon: Clock,
      tone: (hasWorkforce && stats.attendanceToday < 80 ? 'warning' : 'success') as const,
      progress: hasWorkforce ? stats.attendanceToday : null,
      href: '/humanify/attendance',
      actionLabel: 'Buka absensi',
    },
    {
      label: t('hris.avgKpiAchievement'),
      value: hasWorkforce && stats.avgKpi ? `${stats.avgKpi}%` : '—',
      hint: stats.topPerformers ? `${stats.topPerformers} top` : undefined,
      icon: Target,
      tone: 'brand' as const,
      progress: hasWorkforce && stats.avgKpi ? stats.avgKpi : null,
      href: '/humanify/kpi',
      actionLabel: 'Buka KPI',
    },
    {
      label: 'Antrian aksi',
      value: pendingSummary.total || pendingApprovals.length,
      hint: pendingSummary.overdue ? `${pendingSummary.overdue} overdue` : 'Inbox',
      icon: Inbox,
      tone: ((pendingSummary.overdue || 0) > 0 ? 'danger' : (pendingSummary.total || pendingApprovals.length) > 0 ? 'warning' : 'success') as const,
      progress: null,
      href: '#action-inbox',
      actionLabel: 'Buka inbox',
    },
  ];

  const secondaryMetrics = [
    {
      label: t('hris.activeEmployees'),
      value: stats.active,
      hint: stats.total ? `${Math.round((stats.active / stats.total) * 100)}%` : undefined,
      icon: UserCheck,
      tone: 'success' as const,
      progress: stats.total ? (stats.active / stats.total) * 100 : null,
      href: '/humanify/employees',
      actionLabel: 'Buka',
    },
    {
      label: t('hris.onLeave'),
      value: stats.onLeave,
      icon: Calendar,
      tone: stats.onLeave > 0 ? ('warning' as const) : ('neutral' as const),
      href: '/humanify/leave',
      actionLabel: 'Buka cuti',
    },
    {
      label: 'Tidak aktif',
      value: stats.inactive,
      icon: Users,
      tone: stats.inactive > 0 ? ('danger' as const) : ('neutral' as const),
      href: '/humanify/employees',
      actionLabel: 'Buka',
    },
    {
      label: t('hris.avgPerformance'),
      value: hasWorkforce && stats.avgPerf ? `${stats.avgPerf}%` : '—',
      icon: BarChart3,
      tone: 'brand' as const,
      progress: hasWorkforce && stats.avgPerf ? stats.avgPerf : null,
      href: '/humanify/performance',
      actionLabel: 'Buka kinerja',
    },
  ];

  const workbench = [
    { label: 'Karyawan', desc: 'Master data & status', href: '/humanify/employees', icon: Users, meta: hasWorkforce ? `${stats.total} orang` : 'Kosong' },
    { label: 'Absensi', desc: 'Kehadiran hari ini', href: '/humanify/attendance', icon: Clock, meta: hasWorkforce ? `${stats.attendanceToday}%` : '—' },
    { label: 'Cuti', desc: 'Pengajuan & saldo', href: '/humanify/leave', icon: Calendar, meta: `${stats.onLeave} cuti` },
    { label: 'Payroll', desc: 'Proses gaji bulanan', href: '/humanify/payroll', icon: DollarSign, meta: 'Buka hub' },
    { label: 'KPI & OKR', desc: 'Target dan review', href: '/humanify/okr', icon: Target, meta: stats.avgKpi ? `${stats.avgKpi}%` : '—' },
    { label: 'LMS', desc: 'Kursus, bank soal, tes', href: '/humanify/lms', icon: GraduationCap, meta: 'Belajar' },
    { label: 'Rekrutmen', desc: 'Lowongan & kandidat', href: '/humanify/recruitment', icon: UserPlus, meta: 'Pipeline' },
    { label: 'Laporan', desc: 'Analitik HR terpadu', href: '/humanify/reports', icon: BarChart3, meta: 'Pusat data' },
  ];

  const deptChartData = deptStats.map((d) => ({
    name: d.department || '—',
    Aktif: d.active,
    Total: d.total,
  }));

  const deptCompositionData = deptStats
    .filter((d) => Number(d.total) > 0)
    .map((d) => ({
      name: d.department || '—',
      value: Number(d.total) || 0,
    }));

  const deptStatusStackData = deptStats.map((d) => ({
    name: d.department?.length > 14 ? `${d.department.slice(0, 12)}…` : (d.department || '—'),
    Aktif: Number(d.active) || 0,
    Cuti: Number(d.onLeave) || 0,
    'Tidak aktif': Number(d.inactive) || 0,
  }));

  const deptPerfOnlyData = deptStats.map((d) => ({
    name: d.department?.length > 16 ? `${d.department.slice(0, 14)}…` : (d.department || '—'),
    Kinerja: Number(d.perf) || 0,
  }));

  const deptAttendOnlyData = deptStats.map((d) => ({
    name: d.department?.length > 16 ? `${d.department.slice(0, 14)}…` : (d.department || '—'),
    Kehadiran: Number(d.attend) || 0,
  }));

  const deptPerfAttendData = deptStats.map((d) => ({
    name: d.department?.length > 16 ? `${d.department.slice(0, 14)}…` : (d.department || '—'),
    Kinerja: Number(d.perf) || 0,
    Kehadiran: Number(d.attend) || 0,
  }));

  const statusCompositionData = [
    { name: 'Aktif', value: Number(stats.active) || 0 },
    { name: 'Cuti', value: Number(stats.onLeave) || 0 },
    { name: 'Tidak aktif', value: Number(stats.inactive) || 0 },
  ].filter((d) => d.value > 0);

  const toneRail = {
    danger: 'bg-[color:var(--hf-danger)]',
    warning: 'bg-[color:var(--hf-warning)]',
    info: 'bg-[var(--hf-brand-500)]',
  };

  return (
    <HQLayout>
      <OpsStage>
        <OpsPageHero
          title={`${greet}${firstName ? `, ${firstName}` : ''}`}
          subtitle={`${dateLabel} · Ringkasan workforce, antrian aksi, kehadiran, dan kelengkapan dokumen.`}
          badge="Beranda HR"
          liveLabel={loading ? 'Memuat' : 'Live'}
          icon={Home}
          score={hrHealth}
          scoreLabel="Health"
          chips={[
            { label: `${stats.total} karyawan`, icon: Users },
            { label: `${pendingSummary.total || pendingApprovals.length} antrian`, icon: Inbox },
            { label: hasWorkforce ? `Hadir ${stats.attendanceToday}%` : 'Belum ada absensi', icon: Clock },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge source={dataSource} />
              {lastUpdated && (
                <span className="rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-white px-3 py-2 text-xs text-[color:var(--hf-ink-muted)]">
                  Update {lastUpdated}
                </span>
              )}
              <button type="button" onClick={fetchDashboardData} disabled={loading} className="hf-btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
              </button>
              <Link href="/humanify/workforce-analytics" className="hf-btn-primary inline-flex items-center gap-1.5 text-sm">
                Analytics <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          }
        />

        <DashboardBannerRail />

        <NewCompanyLaunchBanner companyName={(session?.user as any)?.tenantName || (session?.user as any)?.businessName} />

        {attention.length > 0 && (
          <div className="space-y-2">
            {attention.map((item) => (
              <div key={item.text} className="hf-tile relative flex flex-wrap items-center justify-between gap-3 overflow-hidden px-4 py-3 pl-5 text-sm text-[color:var(--hf-ink)]">
                <span className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${toneRail[item.tone]}`} aria-hidden />
                <p className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{item.text}</span>
                </p>
                <Link
                  href={item.href}
                  className="shrink-0 font-semibold text-[color:var(--hf-brand-600)] hover:underline"
                  onClick={(e) => {
                    if (item.href !== '#action-inbox') return;
                    e.preventDefault();
                    setViewTab('overview');
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', '#action-inbox');
                    }
                    window.setTimeout(() => {
                      document.getElementById('action-inbox')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 80);
                  }}
                >
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        )}

        <EnterpriseTabBar
          tabs={[
            { key: 'overview', label: 'Ringkasan', icon: LayoutDashboard, count: pendingSummary.total || pendingApprovals.length },
            { key: 'modules', label: 'Semua modul', icon: Layers, count: moduleCount },
          ]}
          active={viewTab}
          onChange={setViewTab}
        />

        {viewTab === 'overview' && (
          <>
            <div className="space-y-4">
              <div>
                <p className="hf-section-label mb-2">Metrik utama</p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  {featuredMetrics.map((s) => (
                    <HrisHeroMetricCard
                      key={s.label}
                      featured
                      label={s.label}
                      value={s.value}
                      hint={s.hint}
                      icon={s.icon}
                      tone={s.tone}
                      progress={s.progress}
                      actionLabel={s.actionLabel}
                      href={s.href}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="hf-section-label mb-2">Status workforce</p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {secondaryMetrics.map((s) => (
                    <HrisHeroMetricCard
                      key={s.label}
                      label={s.label}
                      value={s.value}
                      hint={s.hint}
                      icon={s.icon}
                      tone={s.tone}
                      progress={s.progress}
                      actionLabel={s.actionLabel}
                      href={s.href}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="hf-section-label mb-2">Modul kerja</p>
              <div id="hf-tour-modules" data-tour-id="hf-tour-modules" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {workbench.map((item) => (
                  <HrisHeroNavCard key={item.href} label={item.label} desc={item.desc} meta={item.meta} href={item.href} icon={item.icon} />
                ))}
              </div>
            </div>

            <GaOnboardingChecklist />

            <section className="col-span-full block w-full min-w-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="hf-section-label mb-0">{t('hris.deptOverview')}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/humanify/workforce-analytics" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                    Analytics lengkap <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Link href="/humanify/organization" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                    Organisasi <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <div className="hf-card hf-analytics-panel w-full max-w-none overflow-hidden">
                <span className="hf-analytics-panel__rail" aria-hidden />
                <div className="border-b border-[var(--hf-border-subtle)] px-4 py-3 pl-5 md:px-5 md:pl-6">
                  <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Ringkasan per Departemen</p>
                  <p className="text-xs text-[color:var(--hf-ink-muted)]">
                    Komposisi lanjutan, top KPI / karyawan baru / resign / SP (tab), headcount/kinerja, kehadiran bulan ini, dan AIMAN tools
                  </p>
                </div>
                <div className="w-full p-4 pl-5 md:p-5 md:pl-6">
                  {deptStats.length === 0 ? (
                    <div className="flex w-full min-w-0 flex-col gap-4">
                      <div className="grid w-full gap-4 lg:grid-cols-2">
                        <HrisEmptyState
                          title="Belum ada headcount per departemen"
                          description="Tambah karyawan dengan field departemen untuk melihat chart dan breakdown."
                          source={dataSource}
                          action={
                            <Link href="/humanify/employees?add=1" className="hf-btn-secondary inline-flex items-center gap-1 text-xs">
                              <UserPlus className="h-3.5 w-3.5" /> Tambah karyawan
                            </Link>
                          }
                        />
                        <MonthPresencePie mix={monthPresence} />
                      </div>
                      <AimanToolsFunctionsCard />
                    </div>
                  ) : (
                    <div className="flex w-full min-w-0 flex-col gap-5">
                      {/* Row 1: advanced composition + top performers table */}
                      <div className="grid w-full gap-4 lg:grid-cols-2">
                        <div className="hf-tile-nested min-w-0 p-4">
                          <div className="mb-1 flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
                            <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Komposisi departemen</p>
                          </div>
                          <p className="mb-3 text-[11px] text-[color:var(--hf-ink-muted)]">
                            Proporsi headcount + status workforce (aktif / cuti / tidak aktif) per departemen
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Share departemen</p>
                              <OpsPieChart data={deptCompositionData} nameKey="name" valueKey="value" height={220} />
                            </div>
                            <div>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">Status global</p>
                              {statusCompositionData.length > 0 ? (
                                <OpsPieChart data={statusCompositionData} nameKey="name" valueKey="value" height={220} />
                              ) : (
                                <p className="py-10 text-center text-xs text-slate-400">Belum ada data status</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                              Breakdown status per departemen
                            </p>
                            <OpsBarChart
                              data={deptStatusStackData}
                              xKey="name"
                              bars={[
                                { key: 'Aktif', label: 'Aktif', color: HF_CHART_COLORS_SOLID[2] },
                                { key: 'Cuti', label: 'Cuti', color: HF_CHART_COLORS_SOLID[3] },
                                { key: 'Tidak aktif', label: 'Tidak aktif', color: HF_CHART_COLORS_SOLID[4] },
                              ]}
                              height={220}
                              angledLabels
                            />
                          </div>
                        </div>

                        <div className="hf-tile-nested min-w-0 p-4">
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
                              <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Top performance & KPI</p>
                            </div>
                            <Link
                              href={
                                peopleInsightTab === 'new'
                                  ? '/humanify/employees'
                                  : peopleInsightTab === 'resign'
                                    ? '/humanify/offboarding'
                                    : peopleInsightTab === 'sp'
                                      ? '/humanify/industrial-relations'
                                      : '/humanify/kpi'
                              }
                              className="text-[11px] font-medium text-[color:var(--hf-brand-600)] hover:underline"
                            >
                              Lihat semua →
                            </Link>
                          </div>
                          <div className="mb-3 flex flex-wrap gap-1 rounded-lg border border-[var(--hf-border)] p-0.5 text-[11px]">
                            {([
                              { key: 'kpi', label: 'Top KPI', count: topPerformersList.length },
                              { key: 'new', label: 'Baru bulan ini', count: newHiresThisMonth.length },
                              { key: 'resign', label: 'Resign bulan ini', count: resignationsThisMonth.length },
                              { key: 'sp', label: 'Terkena SP', count: disciplinarySpList.length },
                            ] as const).map((tab) => (
                              <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                  setPeopleInsightTab(tab.key);
                                  setPeopleInsightPage(1);
                                }}
                                className={`inline-flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 font-medium transition min-w-[5.5rem] ${
                                  peopleInsightTab === tab.key
                                    ? 'bg-[var(--hf-brand-600)] text-white'
                                    : 'bg-white text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
                                }`}
                              >
                                <span className="truncate">{tab.label}</span>
                                <span
                                  className={`rounded px-1 py-0.5 text-[10px] tabular-nums ${
                                    peopleInsightTab === tab.key ? 'bg-white/20' : 'bg-[var(--hf-surface-muted)]'
                                  }`}
                                >
                                  {tab.count}
                                </span>
                              </button>
                            ))}
                          </div>
                          <p className="mb-3 text-[11px] text-[color:var(--hf-ink-muted)]">
                            {peopleInsightTab === 'kpi'
                              ? 'Peringkat karyawan berdasarkan pencapaian KPI periode berjalan'
                              : peopleInsightTab === 'new'
                                ? 'Karyawan dengan tanggal bergabung di bulan berjalan'
                                : peopleInsightTab === 'resign'
                                  ? 'Karyawan yang resign / offboarding di bulan berjalan'
                                  : 'Karyawan dengan surat peringatan (SP) aktif'}
                          </p>

                          {peopleInsightTab === 'kpi' && (
                            topPerformersList.length === 0 ? (
                              <HrisEmptyState
                                title="Belum ada data KPI"
                                description="Assign target KPI ke karyawan agar ranking tampil di sini."
                                source={dataSource}
                                action={
                                  <Link href="/humanify/kpi" className="hf-btn-secondary inline-flex items-center gap-1 text-xs">
                                    Buka KPI
                                  </Link>
                                }
                              />
                            ) : (
                              <>
                              <div className="overflow-x-auto rounded-lg border border-[var(--hf-border)]">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="bg-[var(--hf-surface-muted)] text-[10px] uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                                    <tr>
                                      <th className="px-3 py-2 font-semibold">#</th>
                                      <th className="px-3 py-2 font-semibold">Karyawan</th>
                                      <th className="px-3 py-2 font-semibold">Departemen</th>
                                      <th className="px-3 py-2 font-semibold text-right">KPI</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--hf-border-subtle)] bg-white">
                                    {slicePeopleInsightPage(topPerformersList, peopleInsightPage).map((row) => (
                                      <tr key={row.id || row.rank} className="hover:bg-[var(--hf-brand-50)]/40">
                                        <td className="px-3 py-2.5 tabular-nums text-[color:var(--hf-ink-faint)]">{row.rank}</td>
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <EmployeeAvatar name={row.name} photoUrl={row.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                              <p className="truncate font-medium text-[color:var(--hf-ink)]">{row.name}</p>
                                              <p className="truncate text-[11px] text-[color:var(--hf-ink-muted)]">{row.position || row.employeeCode || '—'}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[color:var(--hf-ink-muted)]">{row.department || '—'}</td>
                                        <td className="px-3 py-2.5 text-right">
                                          <span
                                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                                              row.kpiScore >= 100
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : row.kpiScore >= 70
                                                  ? 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]'
                                                  : 'bg-amber-50 text-amber-700'
                                            }`}
                                          >
                                            {row.kpiScore}%
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <PeopleInsightPager total={topPerformersList.length} page={peopleInsightPage} onChange={setPeopleInsightPage} />
                              </>
                            )
                          )}

                          {peopleInsightTab === 'new' && (
                            newHiresThisMonth.length === 0 ? (
                              <HrisEmptyState
                                title="Belum ada karyawan baru bulan ini"
                                description="Karyawan dengan hire date di bulan berjalan akan tampil di sini."
                                source={dataSource}
                                action={
                                  <Link href="/humanify/employees?add=1" className="hf-btn-secondary inline-flex items-center gap-1 text-xs">
                                    <UserPlus className="h-3.5 w-3.5" /> Tambah karyawan
                                  </Link>
                                }
                              />
                            ) : (
                              <>
                              <div className="overflow-x-auto rounded-lg border border-[var(--hf-border)]">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="bg-[var(--hf-surface-muted)] text-[10px] uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                                    <tr>
                                      <th className="px-3 py-2 font-semibold">Karyawan</th>
                                      <th className="px-3 py-2 font-semibold">Departemen</th>
                                      <th className="px-3 py-2 font-semibold text-right">Bergabung</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--hf-border-subtle)] bg-white">
                                    {slicePeopleInsightPage(newHiresThisMonth, peopleInsightPage).map((row) => (
                                      <tr key={row.id} className="hover:bg-[var(--hf-brand-50)]/40">
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <EmployeeAvatar name={row.name} photoUrl={row.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                              <p className="truncate font-medium text-[color:var(--hf-ink)]">{row.name}</p>
                                              <p className="truncate text-[11px] text-[color:var(--hf-ink-muted)]">{row.position || row.employeeCode || '—'}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[color:var(--hf-ink-muted)]">{row.department || '—'}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-[color:var(--hf-ink)]">
                                          {row.eventDate
                                            ? new Date(`${row.eventDate}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                                            : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <PeopleInsightPager total={newHiresThisMonth.length} page={peopleInsightPage} onChange={setPeopleInsightPage} />
                              </>
                            )
                          )}

                          {peopleInsightTab === 'resign' && (
                            resignationsThisMonth.length === 0 ? (
                              <HrisEmptyState
                                title="Tidak ada resign bulan ini"
                                description="Karyawan yang offboarding / resign di bulan berjalan akan tampil di sini."
                                source={dataSource}
                                action={
                                  <Link href="/humanify/offboarding" className="hf-btn-secondary inline-flex items-center gap-1 text-xs">
                                    <UserMinus className="h-3.5 w-3.5" /> Buka offboarding
                                  </Link>
                                }
                              />
                            ) : (
                              <>
                              <div className="overflow-x-auto rounded-lg border border-[var(--hf-border)]">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="bg-[var(--hf-surface-muted)] text-[10px] uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                                    <tr>
                                      <th className="px-3 py-2 font-semibold">Karyawan</th>
                                      <th className="px-3 py-2 font-semibold">Departemen</th>
                                      <th className="px-3 py-2 font-semibold text-right">Tanggal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--hf-border-subtle)] bg-white">
                                    {slicePeopleInsightPage(resignationsThisMonth, peopleInsightPage).map((row) => (
                                      <tr key={row.id} className="hover:bg-[var(--hf-brand-50)]/40">
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <EmployeeAvatar name={row.name} photoUrl={row.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                              <p className="truncate font-medium text-[color:var(--hf-ink)]">{row.name}</p>
                                              <p className="truncate text-[11px] text-[color:var(--hf-ink-muted)]">{row.detail || row.position || row.employeeCode || '—'}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[color:var(--hf-ink-muted)]">{row.department || '—'}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-rose-700">
                                          {row.eventDate
                                            ? new Date(`${row.eventDate}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                                            : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <PeopleInsightPager total={resignationsThisMonth.length} page={peopleInsightPage} onChange={setPeopleInsightPage} />
                              </>
                            )
                          )}

                          {peopleInsightTab === 'sp' && (
                            disciplinarySpList.length === 0 ? (
                              <HrisEmptyState
                                title="Tidak ada SP aktif"
                                description="Karyawan dengan surat peringatan (SP1–SP3) aktif akan tampil di sini."
                                source={dataSource}
                                action={
                                  <Link href="/humanify/industrial-relations" className="hf-btn-secondary inline-flex items-center gap-1 text-xs">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Hubungan industri
                                  </Link>
                                }
                              />
                            ) : (
                              <>
                              <div className="overflow-x-auto rounded-lg border border-[var(--hf-border)]">
                                <table className="min-w-full text-left text-sm">
                                  <thead className="bg-[var(--hf-surface-muted)] text-[10px] uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                                    <tr>
                                      <th className="px-3 py-2 font-semibold">Karyawan</th>
                                      <th className="px-3 py-2 font-semibold">Departemen</th>
                                      <th className="px-3 py-2 font-semibold text-right">SP</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--hf-border-subtle)] bg-white">
                                    {slicePeopleInsightPage(disciplinarySpList, peopleInsightPage).map((row) => (
                                      <tr key={row.id} className="hover:bg-[var(--hf-brand-50)]/40">
                                        <td className="px-3 py-2.5">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <EmployeeAvatar name={row.name} photoUrl={row.photoUrl} size="sm" />
                                            <div className="min-w-0">
                                              <p className="truncate font-medium text-[color:var(--hf-ink)]">{row.name}</p>
                                              <p className="truncate text-[11px] text-[color:var(--hf-ink-muted)]">
                                                {row.letterNumber || row.position || row.employeeCode || '—'}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-[color:var(--hf-ink-muted)]">{row.department || '—'}</td>
                                        <td className="px-3 py-2.5 text-right">
                                          <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                                            {row.warningType || 'SP'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <PeopleInsightPager total={disciplinarySpList.length} page={peopleInsightPage} onChange={setPeopleInsightPage} />
                              </>
                            )
                          )}

                          {docCompliance && docCompliance.activeEmployees > 0 && (
                            <div className="mt-4 border-t border-[var(--hf-border-subtle)] pt-3">
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[color:var(--hf-brand-600)]" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[color:var(--hf-ink)]">Kelengkapan dokumen</p>
                                    <p className="text-[10px] text-[color:var(--hf-ink-muted)]">
                                      Rata-rata {docCompliance.avgPercent}% · {docCompliance.complete}/{docCompliance.activeEmployees} lengkap
                                    </p>
                                  </div>
                                </div>
                                <Link href="/humanify/employees" className="text-[11px] font-medium text-[color:var(--hf-brand-600)] hover:underline">
                                  Buka karyawan →
                                </Link>
                              </div>
                              <FireProgressBar value={docCompliance.avgPercent} height={12} className="mt-1" />
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className="rounded-md bg-[var(--hf-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--hf-ink)]">
                                  {docCompliance.incomplete} belum lengkap
                                </span>
                                {docCompliance.expiredDocs > 0 && (
                                  <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                                    {docCompliance.expiredDocs} kedaluwarsa
                                  </span>
                                )}
                                {docCompliance.expiringSoonDocs > 0 && (
                                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                    {docCompliance.expiringSoonDocs} ≤30 hari
                                  </span>
                                )}
                                {docCompliance.topMissing?.slice(0, 3).map((m) => (
                                  <span key={m.type} className="rounded-md bg-white px-2 py-0.5 text-[10px] text-[color:var(--hf-ink-muted)] ring-1 ring-[var(--hf-border-subtle)]">
                                    Minus {m.label.split('(')[0].trim()}: {m.count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Row 2: tabbed headcount/kinerja card + kehadiran bulan ini */}
                      <div className="grid w-full gap-4 lg:grid-cols-2">
                        <div className="hf-tile-nested min-w-0 p-4">
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-[color:var(--hf-brand-600)]" />
                              <p className="text-sm font-semibold text-[color:var(--hf-ink)]">Headcount per departemen</p>
                            </div>
                            <div className="flex rounded-lg border border-[var(--hf-border)] overflow-hidden text-[11px]">
                              {([
                                { key: 'headcount', label: 'Headcount' },
                                { key: 'combined', label: 'Gabungan' },
                                { key: 'kinerja', label: 'Kinerja' },
                                { key: 'kehadiran', label: 'Kehadiran' },
                              ] as const).map((tab) => (
                                <button
                                  key={tab.key}
                                  type="button"
                                  onClick={() => setDeptAnalyticsTab(tab.key)}
                                  className={`px-2.5 py-1 font-medium transition ${
                                    deptAnalyticsTab === tab.key
                                      ? 'bg-[var(--hf-brand-600)] text-white'
                                      : 'bg-white text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className="mb-2 text-[11px] text-[color:var(--hf-ink-muted)]">
                            {deptAnalyticsTab === 'headcount'
                              ? 'Aktif vs total per departemen'
                              : deptAnalyticsTab === 'combined'
                                ? 'Varian bar · KPI + hadir hari ini'
                                : deptAnalyticsTab === 'kinerja'
                                  ? 'Varian bar · hanya kinerja (KPI %)'
                                  : 'Varian bar · hanya kehadiran (%)'}
                          </p>

                          {deptAnalyticsTab === 'headcount' && (
                            <>
                              <OpsBarChart
                                data={deptChartData}
                                xKey="name"
                                bars={[
                                  { key: 'Aktif', label: 'Aktif', color: HF_CHART_COLORS_SOLID[0] },
                                  { key: 'Total', label: 'Total', color: HF_CHART_COLORS_SOLID[1] },
                                ]}
                                height={260}
                                angledLabels
                              />
                              <div className="mt-4 border-t border-[var(--hf-border-subtle)] pt-3">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                                  Data headcount
                                </p>
                                <div className="overflow-x-auto rounded-lg border border-[var(--hf-border)]">
                                  <table className="min-w-full text-left text-sm">
                                    <thead className="bg-[var(--hf-surface-muted)] text-[10px] uppercase tracking-wide text-[color:var(--hf-ink-muted)]">
                                      <tr>
                                        <th className="px-3 py-2 font-semibold">#</th>
                                        <th className="px-3 py-2 font-semibold">Departemen</th>
                                        <th className="px-3 py-2 font-semibold text-right">Aktif</th>
                                        <th className="px-3 py-2 font-semibold text-right">Cuti</th>
                                        <th className="px-3 py-2 font-semibold text-right">Nonaktif</th>
                                        <th className="px-3 py-2 font-semibold text-right">Total</th>
                                        <th className="px-3 py-2 font-semibold text-right">Share</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--hf-border-subtle)] bg-white">
                                      {deptStats.map((d, i) => {
                                        const total = Number(d.total) || 0;
                                        const share = stats.total > 0 ? ((total / Number(stats.total)) * 100) : 0;
                                        return (
                                          <tr key={d.department} className="hover:bg-[var(--hf-brand-50)]/40">
                                            <td className="px-3 py-2 tabular-nums text-[color:var(--hf-ink-faint)]">{i + 1}</td>
                                            <td className="px-3 py-2">
                                              <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                  className="h-2 w-2 shrink-0 rounded-full"
                                                  style={{ backgroundColor: HF_CHART_COLORS_SOLID[i % HF_CHART_COLORS_SOLID.length] }}
                                                />
                                                <span className="truncate font-medium text-[color:var(--hf-ink)]">{d.department}</span>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{d.active || 0}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-amber-700">{d.onLeave || 0}</td>
                                            <td className="px-3 py-2 text-right tabular-nums text-rose-700">{d.inactive || 0}</td>
                                            <td className="px-3 py-2 text-right font-semibold tabular-nums text-[color:var(--hf-ink)]">{total}</td>
                                            <td className="px-3 py-2 text-right">
                                              <div className="inline-flex min-w-[72px] flex-col items-end gap-1">
                                                <span className="text-xs tabular-nums text-[color:var(--hf-ink-muted)]">{share.toFixed(1)}%</span>
                                                <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--hf-surface-muted)]">
                                                  <div
                                                    className="h-full rounded-full bg-[var(--hf-brand-600)]"
                                                    style={{ width: `${Math.min(100, share)}%` }}
                                                  />
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot className="border-t border-[var(--hf-border)] bg-[var(--hf-surface-muted)]/60 text-xs font-semibold">
                                      <tr>
                                        <td className="px-3 py-2" colSpan={2}>Total</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                                          {deptStats.reduce((s, d) => s + (Number(d.active) || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                                          {deptStats.reduce((s, d) => s + (Number(d.onLeave) || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                                          {deptStats.reduce((s, d) => s + (Number(d.inactive) || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-[color:var(--hf-ink)]">
                                          {deptStats.reduce((s, d) => s + (Number(d.total) || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-[color:var(--hf-ink-muted)]">100%</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            </>
                          )}

                          {deptAnalyticsTab === 'combined' && (
                            <OpsBarChart
                              data={deptPerfAttendData}
                              xKey="name"
                              bars={[
                                { key: 'Kinerja', label: 'Kinerja', color: HF_CHART_COLORS_SOLID[0] },
                                { key: 'Kehadiran', label: 'Kehadiran', color: HF_CHART_COLORS_SOLID[2] },
                              ]}
                              height={260}
                              angledLabels
                            />
                          )}
                          {deptAnalyticsTab === 'kinerja' && (
                            <OpsBarChart
                              data={deptPerfOnlyData}
                              xKey="name"
                              bars={[{ key: 'Kinerja', label: 'Kinerja', color: HF_CHART_COLORS_SOLID[0] }]}
                              height={260}
                              angledLabels
                            />
                          )}
                          {deptAnalyticsTab === 'kehadiran' && (
                            <OpsBarChart
                              data={deptAttendOnlyData}
                              xKey="name"
                              bars={[{ key: 'Kehadiran', label: 'Kehadiran', color: HF_CHART_COLORS_SOLID[2] }]}
                              height={260}
                              angledLabels
                            />
                          )}

                          {deptAnalyticsTab !== 'headcount' && (
                            <div className="mt-4 border-t border-[var(--hf-border-subtle)] pt-3">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                                Tren 8 minggu — kinerja & kehadiran
                              </p>
                              {workforceTrend.length > 0 ? (
                                <OpsLineChart
                                  data={workforceTrend}
                                  xKey="week"
                                  lines={[
                                    { key: 'Kinerja', label: 'Kinerja', color: HF_CHART_COLORS_SOLID[0] },
                                    { key: 'Kehadiran', label: 'Kehadiran', color: HF_CHART_COLORS_SOLID[2] },
                                  ]}
                                  height={200}
                                  angledLabels
                                />
                              ) : (
                                <p className="py-8 text-center text-xs text-slate-400">Belum ada tren absensi/KPI untuk digambar.</p>
                              )}
                            </div>
                          )}
                        </div>

                        <MonthPresencePie mix={monthPresence} />
                      </div>

                      <AimanToolsFunctionsCard />
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
              <div id="action-inbox" className="scroll-mt-24">
              <OpsPanel
                title="Action inbox"
                subtitle="Cuti, lembur, klaim, kasbon, kontrak, dan absensi yang perlu ditindak"
                action={
                  <div className="flex items-center gap-2">
                    {pendingSummary.overdue > 0 && (
                      <span className="hf-tile-nested px-2 py-0.5 text-[11px] font-medium text-[color:var(--hf-ink)]">{pendingSummary.overdue} overdue</span>
                    )}
                    <Link href="/humanify/mss" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                      {t('hris.viewAll')} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                }
              >
                {lastSnoozed && (
                  <div className="mb-3 flex items-center justify-between gap-2 hf-tile-nested px-3 py-2 text-xs text-[color:var(--hf-ink)]">
                    <span className="truncate">Ditunda 24 jam: {lastSnoozed.title}</span>
                    <button type="button" onClick={handleUnsnooze} className="shrink-0 font-semibold text-[color:var(--hf-brand-600)] hover:underline">Batalkan</button>
                  </div>
                )}
                {pendingApprovals.length === 0 ? (
                  <HrisEmptyState
                    title="Inbox kosong"
                    description="Approval cuti, lembur, klaim, dan aksi HR muncul di sini setelah ada pengajuan."
                    source={dataSource}
                    action={
                      <Link href="/humanify/employees?add=1" className="hf-btn-primary inline-flex items-center gap-1 text-xs">
                        <UserPlus className="h-3.5 w-3.5" /> Tambah karyawan
                      </Link>
                    }
                  />
                ) : (
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {pendingApprovals.map((item) => (
                      <div key={item.id} className="hf-tile-nested flex items-start gap-3 px-3 py-3">
                        <EmployeeAvatar name={item.employee_name || item.title} photoUrl={item.photo_url} size="sm" className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--hf-ink-faint)]">
                            {INBOX_TYPE_LABELS[item.type] || item.type || 'Aksi'}
                          </p>
                          <p className="truncate text-sm font-medium text-[color:var(--hf-ink)]">{item.title}</p>
                          <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{item.subtitle}</p>
                          <p className="mt-1 text-[11px] text-[color:var(--hf-ink-faint)]">{item.date}</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {item.href && (
                            <Link href={item.href} className="rounded-lg p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]" title="Detail">
                              <Eye className="h-4 w-4" />
                            </Link>
                          )}
                          <button type="button" onClick={() => handleSnooze(item)} className="rounded-lg p-1.5 text-[color:var(--hf-ink-muted)] hover:bg-[var(--hf-surface-muted)]" title="Tunda 24 jam">
                            <Timer className="h-4 w-4" />
                          </button>
                          {item.actionable !== false && !['contract', 'documents', 'attendance'].includes(item.type) && (
                            <>
                              <button type="button" onClick={() => handleApproval(item, 'approved')} className="rounded-lg p-1.5 text-[color:var(--hf-success)] hover:bg-emerald-50" title={t('hris.approve')}>
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => handleApproval(item, 'rejected')} className="rounded-lg p-1.5 text-[color:var(--hf-danger)] hover:bg-rose-50" title={t('hris.reject')}>
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </OpsPanel>
              </div>

              <OpsPanel
                title="Aktivitas & agenda"
                subtitle={feedTab === 'activities' ? 'Timeline operasional HR' : 'Cuti mendatang dan reminder payroll'}
                action={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div
                      className="inline-flex rounded-[var(--hf-radius)] border border-[var(--hf-border)] bg-[var(--hf-surface-muted)] p-0.5"
                      role="tablist"
                      aria-label="Aktivitas dan agenda"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={feedTab === 'activities'}
                        onClick={() => setFeedTab('activities')}
                        className={`rounded-[calc(var(--hf-radius)-2px)] px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          feedTab === 'activities'
                            ? 'bg-white text-[color:var(--hf-ink)] shadow-sm'
                            : 'text-[color:var(--hf-ink-muted)] hover:text-[color:var(--hf-ink)]'
                        }`}
                      >
                        Aktivitas
                        {recentActivities.length > 0 && (
                          <span className="ml-1 tabular-nums text-[color:var(--hf-ink-faint)]">{recentActivities.length}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={feedTab === 'agenda'}
                        onClick={() => setFeedTab('agenda')}
                        className={`rounded-[calc(var(--hf-radius)-2px)] px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          feedTab === 'agenda'
                            ? 'bg-white text-[color:var(--hf-ink)] shadow-sm'
                            : 'text-[color:var(--hf-ink-muted)] hover:text-[color:var(--hf-ink)]'
                        }`}
                      >
                        Agenda
                        {upcoming.length > 0 && (
                          <span className="ml-1 tabular-nums text-[color:var(--hf-ink-faint)]">{upcoming.length}</span>
                        )}
                      </button>
                    </div>
                    {feedTab === 'activities' ? (
                      <Link href="/humanify/activities" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                        Lihat semua <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link href="/humanify/calendar" className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hf-brand-600)] hover:underline">
                        Kalender <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                }
              >
                {feedTab === 'activities' ? (
                  recentActivities.length === 0 ? (
                    <HrisEmptyState title="Belum ada aktivitas" description="Join karyawan, payroll, cuti, dan KPI akan tampil setelah operasional dimulai." source={dataSource} />
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto">
                      {recentActivities.map((act) => (
                        <div key={act.id} className="hf-tile-nested flex items-start gap-3 px-3 py-3">
                          <div className="mt-0.5 shrink-0 rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] p-2 text-[color:var(--hf-brand-600)]">
                            <act.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[color:var(--hf-ink)]">{act.action}</p>
                            <p className="mt-0.5 text-xs text-[color:var(--hf-ink-muted)]">{act.detail}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-[color:var(--hf-ink-faint)]">{act.time}</span>
                        </div>
                      ))}
                    </div>
                  )
                ) : upcoming.length === 0 ? (
                  <HrisEmptyState title="Agenda kosong" description="Cuti mendatang dan reminder payroll muncul setelah ada karyawan dan pengajuan." source={dataSource} />
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {upcoming.map((ev) => (
                      <div key={ev.id} className="hf-tile-nested flex items-center gap-3 px-3 py-3">
                        <div className="h-8 w-1 shrink-0 rounded-full bg-[var(--hf-brand-500)]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-[color:var(--hf-ink)]">{ev.title}</p>
                          <p className="text-xs text-[color:var(--hf-ink-muted)]">{ev.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </OpsPanel>
            </div>

            {!hasWorkforce && (
              <OpsPanel title="Mulai dari nol" subtitle="Dashboard terisi otomatis setelah operasional HR berjalan">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--hf-radius)] bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]">
                    <Bell className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm text-[color:var(--hf-ink-secondary)]">
                      Chart, inbox, dan agenda muncul setelah Anda menambah karyawan lalu menjalankan absensi, cuti, atau payroll. Ikuti checklist Day-1 atau buka go-live.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/humanify/employees?add=1" className="hf-btn-primary text-sm">{t('hris.addEmployee')}</Link>
                      <Link href="/humanify/go-live" className="hf-btn-secondary text-sm">Go-live checklist</Link>
                    </div>
                  </div>
                </div>
              </OpsPanel>
            )}
          </>
        )}

        {viewTab === 'modules' && (
          <DashboardModuleGrid
            categories={HRIS_MODULES}
            title={t('hris.hrisModules')}
            subtitle={t('hris.modulesAvailable', { count: moduleCount })}
          />
        )}
      </OpsStage>
      <FirstRunTour />
      <QuickActionsDock />
    </HQLayout>
  );
}

export { getServerSideProps } from '@/lib/humanify/require-session';
