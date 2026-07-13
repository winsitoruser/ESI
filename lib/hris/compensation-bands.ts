/**
 * Job architecture — salary band compliance vs job_grades min/max.
 */
import { allowHrMockFallback, type HrisDataSource } from './data-source';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export type BandStatus = 'in_band' | 'below_min' | 'above_max' | 'no_grade' | 'no_salary';

export interface CompensationAuditRow {
  employeeId: string;
  employeeName: string;
  department?: string;
  position?: string;
  jobGradeId?: string;
  jobGradeCode?: string;
  jobGradeName?: string;
  gradeLevel?: number;
  minSalary: number;
  maxSalary: number;
  midPoint: number;
  currentSalary: number;
  compaRatio: number | null;
  status: BandStatus;
  gapAmount: number;
}

export interface CompensationAuditSummary {
  totalEmployees: number;
  inBand: number;
  belowMin: number;
  aboveMax: number;
  noGrade: number;
  noSalary: number;
  avgCompaRatio: number | null;
  rows: CompensationAuditRow[];
  dataSource: HrisDataSource;
}

function mockAudit(): CompensationAuditSummary {
  const rows: CompensationAuditRow[] = [
    {
      employeeId: 'e1', employeeName: 'Budi Santoso', department: 'IT', position: 'Software Engineer',
      jobGradeCode: 'G4', jobGradeName: 'Staff Senior', gradeLevel: 4,
      minSalary: 8000000, maxSalary: 12000000, midPoint: 10000000, currentSalary: 9500000,
      compaRatio: 0.95, status: 'in_band', gapAmount: 0,
    },
    {
      employeeId: 'e2', employeeName: 'Siti Aminah', department: 'HR', position: 'HR Officer',
      jobGradeCode: 'G3', jobGradeName: 'Staff', gradeLevel: 3,
      minSalary: 6000000, maxSalary: 9000000, midPoint: 7500000, currentSalary: 5200000,
      compaRatio: 0.69, status: 'below_min', gapAmount: 800000,
    },
  ];
  return {
    totalEmployees: rows.length,
    inBand: 1,
    belowMin: 1,
    aboveMax: 0,
    noGrade: 0,
    noSalary: 0,
    avgCompaRatio: 0.82,
    rows,
    dataSource: 'demo',
  };
}

function classify(salary: number, min: number, max: number): { status: BandStatus; gap: number } {
  if (salary < min) return { status: 'below_min', gap: min - salary };
  if (max > 0 && salary > max) return { status: 'above_max', gap: salary - max };
  return { status: 'in_band', gap: 0 };
}

export async function runCompensationAudit(tenantId?: string | null): Promise<CompensationAuditSummary> {
  if (!sequelize) {
    return allowHrMockFallback() ? mockAudit() : {
      totalEmployees: 0, inBand: 0, belowMin: 0, aboveMax: 0, noGrade: 0, noSalary: 0,
      avgCompaRatio: null, rows: [], dataSource: 'empty',
    };
  }

  const tf = tenantId ? 'AND e.tenant_id = :tenantId' : '';
  const [emps] = await sequelize.query(`
    SELECT e.id, e.name, e.department::text AS department, e.position,
           e.job_grade_id, e.base_salary, e.salary,
           jg.code AS grade_code, jg.name AS grade_name, jg.level AS grade_level,
           COALESCE(jg.min_salary, 0)::numeric AS min_salary,
           COALESCE(jg.max_salary, 0)::numeric AS max_salary
    FROM employees e
    LEFT JOIN job_grades jg ON jg.id::text = e.job_grade_id::text AND jg.is_active = true
    WHERE e.is_active = true ${tf}
    ORDER BY e.name ASC
    LIMIT 500
  `, { replacements: { tenantId } });

  const rows: CompensationAuditRow[] = [];
  let inBand = 0, belowMin = 0, aboveMax = 0, noGrade = 0, noSalary = 0;
  const compaRatios: number[] = [];

  for (const e of emps as any[]) {
    const salary = parseFloat(e.base_salary || e.salary || 0);
    const min = parseFloat(e.min_salary || 0);
    const max = parseFloat(e.max_salary || 0);
    const mid = min > 0 && max > 0 ? (min + max) / 2 : min || max || 0;

    let status: BandStatus;
    let gap = 0;
    let compaRatio: number | null = null;

    if (!e.job_grade_id) {
      status = 'no_grade';
      noGrade++;
    } else if (!salary) {
      status = 'no_salary';
      noSalary++;
    } else {
      const c = classify(salary, min, max);
      status = c.status;
      gap = c.gap;
      if (mid > 0) {
        compaRatio = Math.round((salary / mid) * 100) / 100;
        compaRatios.push(compaRatio);
      }
      if (status === 'in_band') inBand++;
      else if (status === 'below_min') belowMin++;
      else if (status === 'above_max') aboveMax++;
    }

    rows.push({
      employeeId: String(e.id),
      employeeName: e.name,
      department: e.department,
      position: e.position,
      jobGradeId: e.job_grade_id,
      jobGradeCode: e.grade_code,
      jobGradeName: e.grade_name,
      gradeLevel: e.grade_level,
      minSalary: min,
      maxSalary: max,
      midPoint: mid,
      currentSalary: salary,
      compaRatio,
      status,
      gapAmount: gap,
    });
  }

  if (!rows.length) {
    if (allowHrMockFallback()) return mockAudit();
    return {
      totalEmployees: 0, inBand: 0, belowMin: 0, aboveMax: 0, noGrade: 0, noSalary: 0,
      avgCompaRatio: null, rows: [], dataSource: 'empty',
    };
  }

  return {
    totalEmployees: rows.length,
    inBand,
    belowMin,
    aboveMax,
    noGrade,
    noSalary,
    avgCompaRatio: compaRatios.length
      ? Math.round((compaRatios.reduce((a, b) => a + b, 0) / compaRatios.length) * 100) / 100
      : null,
    rows,
    dataSource: 'live',
  };
}
