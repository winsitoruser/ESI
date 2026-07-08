/**
 * HRIS Mutation / Penugasan / Perpindahan — types & helpers
 */

export type MutationType = 'transfer' | 'promotion' | 'demotion' | 'rotation' | 'assignment';
export type MutationScope = 'department' | 'section' | 'branch' | 'region' | 'position';
export type MutationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'executed';

export interface ApprovalLevel {
  level: number;
  role: string;
  title: string;
  required: boolean;
}

export const MUTATION_TYPE_LABELS: Record<MutationType, string> = {
  transfer: 'Mutasi / Pindah',
  promotion: 'Promosi',
  demotion: 'Demosi',
  rotation: 'Rotasi',
  assignment: 'Penugasan',
};

export const MUTATION_SCOPE_LABELS: Record<MutationScope, string> = {
  department: 'Antar Departemen',
  section: 'Antar Bagian / Unit',
  branch: 'Antar Cabang / Wilayah',
  region: 'Antar Wilayah',
  position: 'Perubahan Jabatan',
};

export const MUTATION_STATUS_LABELS: Record<MutationStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  executed: 'Dieksekusi',
};

/** Default multi-step approval: Manajer → HRD → Direktur (promosi/demosi) */
export function getDefaultApprovalLevels(mutationType: MutationType): ApprovalLevel[] {
  const base: ApprovalLevel[] = [
    { level: 1, role: 'MANAGER', title: 'Atasan / Manajer Departemen', required: true },
    { level: 2, role: 'HR_MANAGER', title: 'HRD / SDM', required: true },
  ];
  if (mutationType === 'promotion' || mutationType === 'demotion') {
    base.push({ level: 3, role: 'DIRECTOR', title: 'Direktur / Manajemen', required: true });
  }
  return base;
}

export function inferMutationScope(body: {
  mutation_scope?: string;
  from_department?: string;
  to_department?: string;
  from_branch_id?: string;
  to_branch_id?: string;
  from_position?: string;
  to_position?: string;
}): MutationScope {
  if (body.mutation_scope) return body.mutation_scope as MutationScope;
  if (body.from_branch_id && body.to_branch_id && body.from_branch_id !== body.to_branch_id) return 'branch';
  if (body.from_department && body.to_department && body.from_department !== body.to_department) return 'department';
  if (body.from_position && body.to_position && body.from_position !== body.to_position) return 'position';
  return 'section';
}

/** Build document data for mutation-letter / assignment PDF */
export function buildMutationLetterData(mut: Record<string, unknown>) {
  const type = (mut.mutation_type as MutationType) || 'transfer';
  const isAssignment = type === 'assignment';
  return {
    employeeName: mut.employee_name,
    employeeId: mut.employee_code,
    mutationType: type,
    oldPosition: mut.from_position,
    newPosition: mut.to_position,
    oldDepartment: mut.from_department,
    newDepartment: mut.to_department,
    oldBranch: mut.from_branch_name,
    newBranch: mut.to_branch_name,
    effectiveDate: mut.effective_date,
    mutationNumber: mut.mutation_number,
    reason: mut.reason,
    body: isAssignment
      ? `Berdasarkan kebutuhan operasional, dengan ini ditetapkan Surat Penugasan (${mut.mutation_number}) untuk penempatan karyawan sebagai berikut:`
      : undefined,
  };
}

export function getDocumentTypeForMutation(type: MutationType): 'mutation-letter' | 'mutation-letter' {
  return 'mutation-letter';
}
