/**
 * Client-safe AIMAN agent catalog (tools + workflows).
 * Keep free of Sequelize / Node-only imports so UI can import it.
 */

export type AgentToolKind = 'read' | 'write';

export type AgentToolName =
  | 'payroll_prep_checklist'
  | 'recruitment_screen_preview'
  | 'list_hr_backlog'
  | 'leave_pending_detail'
  | 'contract_expiry_check'
  | 'onboarding_status'
  | 'run_automation_scan'
  | 'execute_recruitment_screening'
  | 'execute_contract_expiry_alert'
  | 'execute_leave_backlog_alert';

export type AgentToolDef = {
  name: AgentToolName;
  kind: AgentToolKind;
  label: string;
  description: string;
};

export const AIMAN_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'payroll_prep_checklist',
    kind: 'read',
    label: 'Checklist persiapan payroll',
    description: 'Cek karyawan tanpa gaji, run payroll terbuka, dan sinyal absensi.',
  },
  {
    name: 'recruitment_screen_preview',
    kind: 'read',
    label: 'Pratinjau screening kandidat',
    description: 'Hitung skor kandidat applied tanpa mengubah stage.',
  },
  {
    name: 'list_hr_backlog',
    kind: 'read',
    label: 'Backlog HR',
    description: 'Ringkas cuti, klaim, dan lembur pending.',
  },
  {
    name: 'leave_pending_detail',
    kind: 'read',
    label: 'Detail cuti pending',
    description: 'Daftar singkat pengajuan cuti yang menunggu approval.',
  },
  {
    name: 'contract_expiry_check',
    kind: 'read',
    label: 'Cek kontrak hampir habis',
    description: 'Kontrak aktif yang berakhir dalam 30 hari.',
  },
  {
    name: 'onboarding_status',
    kind: 'read',
    label: 'Status onboarding',
    description: 'Proses onboarding karyawan baru yang masih berjalan.',
  },
  {
    name: 'run_automation_scan',
    kind: 'write',
    label: 'Jalankan scan otomasi',
    description: 'Scan semua aturan otomasi aktif (bisa memicu aksi).',
  },
  {
    name: 'execute_recruitment_screening',
    kind: 'write',
    label: 'Advance kandidat lolos screening',
    description: 'Naikkan stage kandidat skor tinggi (applied → screening).',
  },
  {
    name: 'execute_contract_expiry_alert',
    kind: 'write',
    label: 'Jalankan alert kontrak',
    description: 'Evaluasi & catat alert kontrak hampir habis.',
  },
  {
    name: 'execute_leave_backlog_alert',
    kind: 'write',
    label: 'Jalankan alert backlog cuti',
    description: 'Evaluasi & catat alert jika cuti pending menumpuk.',
  },
];

export type AgentWorkflowCatalogItem = {
  id: string;
  title: string;
  prompt: string;
  description: string;
  tools: AgentToolName[];
};

/** Assisted functions — phrases that trigger AIMAN workflows in copilot. */
export const AIMAN_AGENT_WORKFLOWS: AgentWorkflowCatalogItem[] = [
  {
    id: 'payroll_prep',
    title: 'Persiapan Payroll',
    prompt: 'Persiapkan payroll bulan ini',
    description: 'Checklist gaji + backlog HR sebelum run.',
    tools: ['payroll_prep_checklist', 'list_hr_backlog'],
  },
  {
    id: 'recruitment_screen',
    title: 'Screening Kandidat',
    prompt: 'Pratinjau screening kandidat',
    description: 'Skor kandidat applied; advance butuh konfirmasi.',
    tools: ['recruitment_screen_preview'],
  },
  {
    id: 'leave_desk',
    title: 'Meja Cuti',
    prompt: 'Meja cuti — detail pending',
    description: 'Detail cuti menunggu + opsi alert backlog.',
    tools: ['leave_pending_detail', 'list_hr_backlog'],
  },
  {
    id: 'contract_watch',
    title: 'Pantau Kontrak',
    prompt: 'Cek kontrak hampir habis',
    description: 'Kontrak aktif yang berakhir ≤30 hari.',
    tools: ['contract_expiry_check'],
  },
  {
    id: 'onboarding_check',
    title: 'Cek Onboarding',
    prompt: 'Cek onboarding',
    description: 'Status onboarding karyawan baru.',
    tools: ['onboarding_status', 'list_hr_backlog'],
  },
  {
    id: 'hr_backlog',
    title: 'Backlog HR',
    prompt: 'Backlog HR',
    description: 'Antrian cuti, klaim, dan lembur.',
    tools: ['list_hr_backlog', 'leave_pending_detail'],
  },
  {
    id: 'general_scan',
    title: 'Scan Otomasi',
    prompt: 'Jalankan scan otomasi',
    description: 'Scan aturan otomasi (write butuh konfirmasi).',
    tools: ['list_hr_backlog', 'run_automation_scan'],
  },
];
