/**
 * Humanify — HRIS System (Naincode Inti Teknologi)
 */
import {
  LayoutDashboard, Users, UserCheck, Target, Award, DollarSign, HardHat,
  UserPlus, GraduationCap, FileBarChart, Activity, Users2, ClipboardList,
  Building2, ArrowRightLeft, BarChart3, Timer, Calendar, CalendarCheck,
  CalendarDays, Settings, Megaphone, FileText, KeyRound, Heart, Shield,
  Briefcase, Plane, BookOpen, PenTool, AlertTriangle, Calculator, Banknote,
  Percent, Gift, Clock, Network, Fingerprint, Sparkles, Layers, Ban,
  Wallet, Package, CreditCard, Crosshair, PenLine, Scale, Globe, Brain,
  type LucideIcon,
} from 'lucide-react';
import type { SidebarConfig, MenuGroup } from './sidebar.config';

export const humanifySidebarConfig: SidebarConfig = {
  layout: 'hq',
  logo: {
    icon: UserCheck,
    title: 'Humanify',
    subtitle: 'HRIS · Naincode',
    href: '/humanify',
  },
  groups: [
    {
      id: 'main',
      title: 'Utama',
      items: [
        { id: 'humanify-welcome', name: 'Tentang Humanify', href: '/humanify/welcome', icon: Sparkles, modules: ['humanify', 'hris'] },
        { id: 'humanify-home', name: 'Beranda', href: '/humanify', icon: Sparkles, modules: ['humanify', 'hris'] },
        { id: 'humanify-calendar', name: 'Kalender HR', href: '/humanify/calendar', icon: Calendar, modules: ['humanify', 'hris'] },
        { id: 'humanify-announcements', name: 'Pengumuman', href: '/humanify/announcements', icon: Megaphone, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'people',
      title: 'Karyawan',
      items: [
        { id: 'humanify-employees', name: 'Database Karyawan', href: '/humanify/employees', icon: Users, modules: ['humanify', 'hris'] },
        { id: 'humanify-organization', name: 'Struktur Organisasi', href: '/humanify/organization', icon: Network, modules: ['humanify', 'hris'] },
        { id: 'humanify-onboarding', name: 'Onboarding', href: '/humanify/onboarding', icon: UserPlus, modules: ['humanify', 'hris'] },
        { id: 'humanify-offboarding', name: 'Offboarding / Exit', href: '/humanify/offboarding', icon: KeyRound, modules: ['humanify', 'hris'] },
        { id: 'humanify-contracts', name: 'Kontrak & Reminder', href: '/humanify/contracts', icon: FileText, modules: ['humanify', 'hris'] },
        { id: 'humanify-assets', name: 'Manajemen Aset', href: '/humanify/assets', icon: Package, modules: ['humanify', 'hris'] },
        { id: 'humanify-esign', name: 'E-Sign (Privy)', href: '/humanify/esign', icon: PenLine, modules: ['humanify', 'hris'] },
        { id: 'humanify-org-settings', name: 'Pengaturan Organisasi', href: '/humanify/org-settings', icon: Settings, modules: ['humanify', 'hris'] },
        { id: 'humanify-ess', name: 'Layanan Mandiri Karyawan', href: '/humanify/ess', icon: Heart, modules: ['humanify', 'hris'] },
        { id: 'humanify-mss', name: 'Layanan Mandiri Manajer', href: '/humanify/mss', icon: Shield, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'attendance',
      title: 'Kehadiran & Cuti',
      items: [
        { id: 'humanify-attendance', name: 'Kehadiran & Absensi', href: '/humanify/attendance', icon: CalendarCheck, modules: ['humanify', 'hris'] },
        { id: 'humanify-attendance-mgmt', name: 'Jadwal & Shift', href: '/humanify/attendance-management', icon: Timer, modules: ['humanify', 'hris'] },
        { id: 'humanify-attendance-daily', name: 'Rekap Harian', href: '/humanify/attendance/daily', icon: CalendarDays, modules: ['humanify', 'hris'] },
        { id: 'humanify-attendance-devices', name: 'Perangkat Absensi', href: '/humanify/attendance/devices', icon: Fingerprint, modules: ['humanify', 'hris'] },
        { id: 'humanify-attendance-settings', name: 'Pengaturan Absensi', href: '/humanify/attendance/settings', icon: Settings, modules: ['humanify', 'hris'] },
        { id: 'humanify-leave', name: 'Manajemen Cuti', href: '/humanify/leave', icon: Calendar, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'performance',
      title: 'Kinerja',
      items: [
        { id: 'humanify-okr', name: 'OKR / KPI', href: '/humanify/okr', icon: Crosshair, modules: ['humanify', 'hris'] },
        { id: 'humanify-kpi', name: 'KPI Karyawan', href: '/humanify/kpi', icon: Target, modules: ['humanify', 'hris'] },
        { id: 'humanify-kpi-settings', name: 'Pengaturan KPI', href: '/humanify/kpi-settings', icon: Settings, modules: ['humanify', 'hris'] },
        { id: 'humanify-performance', name: 'Penilaian Kinerja', href: '/humanify/performance', icon: Award, modules: ['humanify', 'hris'] },
        { id: 'humanify-engagement', name: 'Keterlibatan & Budaya', href: '/humanify/engagement', icon: Activity, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'payroll',
      title: 'Payroll',
      items: [
        {
          id: 'humanify-payroll',
          name: 'Penggajian',
          icon: Banknote,
          modules: ['humanify', 'hris'],
          children: [
            { id: 'humanify-payroll-hub', name: 'Dasbor Payroll', href: '/humanify/payroll', icon: LayoutDashboard, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-main', name: 'Proses Gaji', href: '/humanify/payroll/main', icon: Calculator, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-slip', name: 'Slip Gaji', href: '/humanify/payroll/slip-gaji', icon: FileText, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-thr', name: 'THR', href: '/humanify/payroll/thr', icon: Gift, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-pph21', name: 'PPh 21', href: '/humanify/payroll/pph21', icon: Percent, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-bpjs', name: 'BPJS', href: '/humanify/payroll/bpjs', icon: Shield, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-lembur', name: 'Lembur', href: '/humanify/payroll/lembur', icon: Clock, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-bonus', name: 'Bonus & Insentif', href: '/humanify/payroll/bonus', icon: Gift, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-cash-advance', name: 'Kasbon', href: '/humanify/payroll/cash-advance', icon: Wallet, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-loan', name: 'Pinjaman Karyawan', href: '/humanify/payroll/loan', icon: CreditCard, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-laporan', name: 'Laporan Gaji', href: '/humanify/payroll/laporan', icon: BarChart3, modules: ['humanify', 'hris'] },
            { id: 'humanify-payroll-disbursement', name: 'Transfer Bank', href: '/humanify/payroll/disbursement', icon: Banknote, modules: ['humanify', 'hris'] },
          ],
        },
        { id: 'humanify-reimbursement', name: 'Reimbursement', href: '/humanify/reimbursement', icon: Wallet, modules: ['humanify', 'hris'] },
        { id: 'humanify-casual', name: 'Tenaga Harian & Borongan', href: '/humanify/casual-workforce', icon: HardHat, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'talent',
      title: 'Rekrutmen & Pengembangan',
      items: [
        { id: 'humanify-recruitment', name: 'Rekrutmen', href: '/humanify/recruitment', icon: UserPlus, modules: ['humanify', 'hris'] },
        { id: 'humanify-careers', name: 'Portal Karir Publik', href: '/careers', icon: Globe, modules: ['humanify', 'hris'] },
        {
          id: 'humanify-lms',
          name: 'Learning Management',
          icon: GraduationCap,
          modules: ['humanify', 'hris'],
          children: [
            { id: 'humanify-lms-hub', name: 'LMS Dashboard', href: '/humanify/lms', icon: LayoutDashboard, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-courses', name: 'Kursus & Learning Path', href: '/humanify/lms/courses', icon: BookOpen, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-question-bank', name: 'Bank Soal', href: '/humanify/lms/question-bank', icon: BookOpen, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-tests', name: 'Tes & Ujian', href: '/humanify/lms/tests', icon: ClipboardList, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-blueprints', name: 'Blueprint Adaptif', href: '/humanify/lms/blueprints', icon: Layers, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-psychometric', name: 'Psikotes', href: '/humanify/lms/psychometric', icon: Brain, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-psycho-reports', name: 'Laporan Psikotes', href: '/humanify/lms/psychometric-reports', icon: FileBarChart, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-schedules', name: 'Penjadwalan Tes', href: '/humanify/lms/schedules', icon: Calendar, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-grading', name: 'Penilaian', href: '/humanify/lms/grading', icon: PenTool, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-reports', name: 'Laporan Hasil', href: '/humanify/lms/reports', icon: BarChart3, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-analytics', name: 'Analytics L&D', href: '/humanify/lms/analytics', icon: Activity, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-proctoring', name: 'Proctoring Review', href: '/humanify/lms/proctoring', icon: Shield, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-competency', name: 'Kompetensi & Sertifikat', href: '/humanify/lms/competency', icon: Award, modules: ['humanify', 'hris'] },
            { id: 'humanify-lms-access', name: 'Akses & Role LMS', href: '/humanify/lms/access', icon: Users, modules: ['humanify', 'hris'] },
          ],
        },
        { id: 'humanify-training', name: 'Program Training', href: '/humanify/training', icon: GraduationCap, modules: ['humanify', 'hris'] },
        { id: 'humanify-training-dev', name: 'Pelatihan & Pengembangan', href: '/humanify/training-development', icon: BookOpen, modules: ['humanify', 'hris'] },
        { id: 'humanify-training-scoring', name: 'Skor Training', href: '/humanify/training-scoring', icon: PenTool, modules: ['humanify', 'hris'] },
        { id: 'humanify-certificates', name: 'Certificate Registry', href: '/humanify/certificates', icon: Award, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'ops',
      title: 'Operasional HR',
      items: [
        { id: 'humanify-team', name: 'Tim Internal', href: '/humanify/team-members', icon: Users2, modules: ['humanify', 'hris'] },
        { id: 'humanify-tasks', name: 'Tugas Tim', href: '/humanify/tasks', icon: ClipboardList, modules: ['humanify', 'hris'] },
        { id: 'humanify-activities', name: 'Aktivitas HR', href: '/humanify/activities', icon: Activity, modules: ['humanify', 'hris'] },
        { id: 'humanify-mutations', name: 'Mutasi & Penugasan', href: '/humanify/mutations', icon: ArrowRightLeft, modules: ['humanify', 'hris'] },
        { id: 'humanify-travel', name: 'Perjalanan & Biaya', href: '/humanify/travel-expense', icon: Plane, modules: ['humanify', 'hris'] },
        { id: 'humanify-project', name: 'Manajemen Proyek HR', href: '/humanify/project-management', icon: Briefcase, modules: ['humanify', 'hris'] },
        { id: 'humanify-ir', name: 'Hubungan Industrial & Kepatuhan', href: '/humanify/industrial-relations', icon: Scale, modules: ['humanify', 'hris'] },
        { id: 'humanify-disciplinary', name: 'Surat Disiplin (SP & SOP)', href: '/humanify/disciplinary-letters', icon: Ban, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'analytics',
      title: 'Laporan & Analitik',
      items: [
        { id: 'humanify-hr-analytics', name: 'HR Analytics Hub', href: '/humanify/hr-analytics', icon: Activity, modules: ['humanify', 'hris'] },
        { id: 'humanify-reports', name: 'Laporan HRIS', href: '/humanify/reports', icon: FileBarChart, modules: ['humanify', 'hris'] },
        { id: 'humanify-analytics', name: 'Workforce Analytics', href: '/humanify/workforce-analytics', icon: BarChart3, modules: ['humanify', 'hris'] },
      ],
    },
    {
      id: 'platform',
      title: 'Platform',
      items: [
        { id: 'humanify-employee-portal', name: 'Portal Karyawan', href: '/employee', icon: UserCheck, modules: ['humanify', 'hris'] },
        { id: 'humanify-users-roles', name: 'Role & Akses', href: '/humanify/users/roles', icon: Shield, modules: ['humanify', 'hris'] },
        { id: 'humanify-about-naincode', name: 'Tentang Naincode', href: '/humanify/welcome', icon: Layers, modules: ['humanify', 'hris'] },
      ],
    },
  ] as MenuGroup[],
};
