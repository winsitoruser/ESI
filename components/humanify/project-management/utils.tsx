import React from 'react';
import { FileSpreadsheet, FileImage, File, FileText } from 'lucide-react';

export const fmtCur = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;

export const statusColor = (s: string) => {
  const m: Record<string, string> = {
    planning: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    in_progress: 'bg-violet-100 text-violet-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-violet-100 text-violet-800',
    cancelled: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-violet-100 text-violet-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    calculated: 'bg-purple-100 text-purple-800',
    paid: 'bg-emerald-100 text-emerald-800',
  };
  return m[s] || 'bg-gray-100 text-gray-800';
};

export const priorityColor = (p: string) => {
  const m: Record<string, string> = {
    low: 'border-gray-300',
    medium: 'border-violet-300',
    high: 'border-orange-300',
    critical: 'border-red-400',
  };
  return m[p] || 'border-gray-300';
};

export const fmtSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export const getFileIcon = (ext: string): React.ReactNode => {
  const e = ext?.toLowerCase().replace('.', '');
  if (['xlsx', 'xls', 'csv'].includes(e)) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(e)) return <FileImage className="w-5 h-5 text-pink-600" />;
  if (['pdf'].includes(e)) return <File className="w-5 h-5 text-red-600" />;
  return <FileText className="w-5 h-5 text-violet-600" />;
};

export const DOC_CATEGORIES = ['Umum', 'Kontrak', 'Proposal', 'Laporan', 'Invoice', 'SPK', 'K3/Safety', 'Legalitas', 'Foto/Dokumentasi', 'Lainnya'];

export const BULK_HEADERS: Record<string, { required: string[]; optional: string[]; example: string }> = {
  workers: {
    required: ['employee_id', 'role', 'daily_rate'],
    optional: ['hourly_rate', 'allocation_percent', 'worker_type', 'assignment_start', 'assignment_end'],
    example: 'employee_id,role,daily_rate,worker_type,allocation_percent\n101,Site Engineer,500000,contract,100\n102,Foreman,350000,contract,100\n103,Helper,200000,freelance,50',
  },
  timesheets: {
    required: ['employee_id', 'timesheet_date', 'hours_worked'],
    optional: ['overtime_hours', 'activity_description', 'task_category'],
    example: 'employee_id,timesheet_date,hours_worked,overtime_hours,activity_description\n101,2026-02-28,8,2,Pengecoran lantai 3\n102,2026-02-28,8,0,Supervisi pekerja\n103,2026-02-28,6,0,Angkut material',
  },
  payroll: {
    required: ['employee_id', 'period_start', 'period_end'],
    optional: [],
    example: 'employee_id,period_start,period_end\n101,2026-02-01,2026-02-28\n102,2026-02-01,2026-02-28\n103,2026-02-01,2026-02-28',
  },
};

export const BULK_LABELS: Record<string, { title: string; color: string }> = {
  workers: { title: 'Impor Massal Tenaga Kerja', color: 'green' },
  timesheets: { title: 'Impor Massal Timesheet', color: 'blue' },
  payroll: { title: 'Hitung Penggajian Massal', color: 'purple' },
};

export const defaultProjectForm = {
  name: '',
  description: '',
  clientName: '',
  location: '',
  startDate: '',
  endDate: '',
  budgetAmount: 0,
  department: '',
  industry: '',
  priority: 'medium',
  contractNumber: '',
  contractValue: 0,
};

export const defaultWorkerForm = {
  projectId: '',
  employeeId: '',
  role: '',
  assignmentStart: '',
  assignmentEnd: '',
  dailyRate: 0,
  hourlyRate: 0,
  allocationPercent: 100,
  workerType: 'permanent' as string,
};

export const defaultTsForm = {
  projectId: '',
  employeeId: '',
  timesheetDate: '',
  hoursWorked: 8,
  overtimeHours: 0,
  activityDescription: '',
  taskCategory: '',
};

export const defaultPayrollCalcForm = {
  projectId: '',
  employeeId: '',
  periodStart: '',
  periodEnd: '',
};
