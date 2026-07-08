export interface ProjectItem { id: string; project_code: string; name: string; description: string; client_name: string; location: string; start_date: string; end_date: string; status: string; budget_amount: number; actual_cost: number; project_manager_id: number; department: string; industry: string; completion_percent: number; priority: string; milestones: any[]; }
export interface Worker { id: string; project_id: string; employee_id: number; resource_name?: string; role: string; assignment_start: string; assignment_end: string; daily_rate: number; hourly_rate: number; allocation_percent: number; status: string; worker_type: string; contract_number: string; }
export interface Timesheet { id: string; project_id: string; employee_id: number; timesheet_date: string; hours_worked: number; overtime_hours: number; activity_description: string; task_category: string; status: string; }
export interface PayrollItem { id: string; project_id: string; employee_id: number; period_start: string; period_end: string; regular_hours: number; overtime_hours: number; days_worked: number; gross_amount: number; net_amount: number; status: string; }
export interface ProjectDocument { id: string; projectId: string | null; name: string; description: string; category: string; originalFilename: string; filePath: string; fileSize: number; mimeType: string; fileExtension: string; uploadedBy: string; uploadedAt: string; tags: string; version: string; status: string; }
export interface DocTemplate { id: string; name: string; description: string; category: string; icon: string; color: string; format: string; version: string; lastUpdated: string; sections: string[]; tags: string[]; downloadCount: number; }

export type TabKey = 'projects' | 'workers' | 'timesheets' | 'payroll' | 'documents' | 'templates';

export interface ProjectForm {
  name: string;
  description: string;
  clientName: string;
  location: string;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  department: string;
  industry: string;
  priority: string;
  contractNumber: string;
  contractValue: number;
}

export interface WorkerForm {
  projectId: string;
  employeeId: string;
  employeeName?: string;
  role: string;
  assignmentStart: string;
  assignmentEnd: string;
  dailyRate: number;
  hourlyRate: number;
  allocationPercent: number;
  workerType: string;
}

export interface TimesheetForm {
  projectId: string;
  employeeId: string;
  employeeName?: string;
  timesheetDate: string;
  hoursWorked: number;
  overtimeHours: number;
  activityDescription: string;
  taskCategory: string;
}

export interface PayrollCalcForm {
  projectId: string;
  employeeId: string;
  employeeName?: string;
  periodStart: string;
  periodEnd: string;
}

export interface UploadForm {
  name: string;
  description: string;
  category: string;
  projectId: string;
  tags: string;
}

export interface DocFilter {
  category: string;
  search: string;
}

export interface TplFilter {
  category: string;
  search: string;
}

export interface ToastState {
  msg: string;
  type: string;
}

export interface BulkResult {
  success: number;
  failed: number;
}
