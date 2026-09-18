/**
 * Client-safe AIMAN agent catalog (tools + workflows).
 * Keep free of Sequelize / Node-only imports so UI can import it.
 */

export type AgentToolKind = 'read' | 'write';

export type AgentToolName =
  | 'payroll_prep_checklist'
  | 'payroll_create_draft_run'
  | 'recruitment_screen_preview'
  | 'list_hr_backlog'
  | 'leave_pending_detail'
  | 'run_leave_escalation'
  | 'contract_expiry_check'
  | 'onboarding_status'
  | 'ir_pending_sp_list'
  | 'ir_phase_reminder'
  | 'run_automation_scan'
  | 'execute_recruitment_screening'
  | 'execute_contract_expiry_alert'
  | 'execute_leave_backlog_alert';

export type AgentToolDef = {
  name: AgentToolName;
  kind: AgentToolKind;
  label: string;
  description: string;
  /** Phrase that triggers the matching AIMAN agent workflow / tool via chat. */
  prompt: string;
};

export const AIMAN_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'payroll_prep_checklist',
    kind: 'read',
    label: 'Checklist persiapan payroll',
    description: 'Cek karyawan tanpa gaji, run payroll terbuka, dan sinyal absensi.',
    prompt: 'Persiapkan payroll bulan ini',
  },
  {
    name: 'payroll_create_draft_run',
    kind: 'write',
    label: 'Buat draft payroll run',
    description: 'Buat payroll run status draft untuk bulan berjalan (bukan approve/bayar).',
    prompt: 'Buat draft payroll bulan ini',
  },
  {
    name: 'recruitment_screen_preview',
    kind: 'read',
    label: 'Pratinjau screening kandidat',
    description: 'Hitung skor kandidat applied tanpa mengubah stage.',
    prompt: 'Pratinjau screening kandidat',
  },
  {
    name: 'list_hr_backlog',
    kind: 'read',
    label: 'Backlog HR',
    description: 'Ringkas cuti, klaim, dan lembur pending.',
    prompt: 'Backlog HR',
  },
  {
    name: 'leave_pending_detail',
    kind: 'read',
    label: 'Detail cuti pending',
    description: 'Daftar singkat pengajuan cuti yang menunggu approval.',
    prompt: 'Meja cuti — detail pending',
  },
  {
    name: 'run_leave_escalation',
    kind: 'write',
    label: 'Eskalasi cuti overtime SLA',
    description: 'Notifikasi approver/HR untuk cuti melewati escalation_hours (tanpa auto-approve).',
    prompt: 'Jalankan eskalasi cuti',
  },
  {
    name: 'contract_expiry_check',
    kind: 'read',
    label: 'Cek kontrak hampir habis',
    description: 'Kontrak aktif yang berakhir dalam 30 hari.',
    prompt: 'Cek kontrak hampir habis',
  },
  {
    name: 'onboarding_status',
    kind: 'read',
    label: 'Status onboarding',
    description: 'Proses onboarding karyawan baru yang masih berjalan.',
    prompt: 'Cek onboarding',
  },
  {
    name: 'ir_pending_sp_list',
    kind: 'read',
    label: 'Daftar SP / IR pending',
    description: 'Surat peringatan / disiplin yang masih dalam pipeline.',
    prompt: 'Cek SP pending',
  },
  {
    name: 'ir_phase_reminder',
    kind: 'write',
    label: 'Reminder fase IR/SP',
    description: 'Kirim notifikasi HR untuk surat disiplin yang menumpuk di fase aktif.',
    prompt: 'Kirim reminder SP pending',
  },
  {
    name: 'run_automation_scan',
    kind: 'write',
    label: 'Jalankan scan otomasi',
    description: 'Scan semua aturan otomasi aktif (bisa memicu aksi).',
    prompt: 'Jalankan scan otomasi',
  },
  {
    name: 'execute_recruitment_screening',
    kind: 'write',
    label: 'Advance kandidat lolos screening',
    description: 'Naikkan stage kandidat skor tinggi (applied → screening).',
    prompt: 'Jalankan screening kandidat',
  },
  {
    name: 'execute_contract_expiry_alert',
    kind: 'write',
    label: 'Jalankan alert kontrak',
    description: 'Evaluasi & catat alert kontrak hampir habis.',
    prompt: 'Jalankan alert kontrak hampir habis',
  },
  {
    name: 'execute_leave_backlog_alert',
    kind: 'write',
    label: 'Jalankan alert backlog cuti',
    description: 'Evaluasi & catat alert jika cuti pending menumpuk.',
    prompt: 'Jalankan alert backlog cuti',
  },
];

export type AgentWorkflowCatalogItem = {
  id: string;
  title: string;
  prompt: string;
  description: string;
  tools: AgentToolName[];
};

export type AgentCta = {
  href: string;
  label: string;
  description?: string;
};

/** Default CTAs per tool — open the Humanify page that owns the explained data. */
export const AIMAN_TOOL_CTAS: Record<AgentToolName, AgentCta[]> = {
  payroll_prep_checklist: [
    { href: '/humanify/payroll/main', label: 'Buka Proses Gaji', description: 'Lanjutkan run payroll' },
    { href: '/humanify/employees', label: 'Database Karyawan', description: 'Lengkapi komponen gaji' },
    { href: '/humanify/attendance', label: 'Absensi', description: 'Cek keterlambatan' },
  ],
  payroll_create_draft_run: [
    { href: '/humanify/payroll/main', label: 'Proses Gaji', description: 'Lanjutkan hitung/approve' },
  ],
  recruitment_screen_preview: [
    { href: '/humanify/recruitment', label: 'Buka Rekrutmen', description: 'Pipeline kandidat' },
    { href: '/humanify/recruitment?tab=candidates', label: 'Daftar Kandidat', description: 'Lihat skor & stage' },
  ],
  list_hr_backlog: [
    { href: '/humanify/mss', label: 'Action Inbox MSS', description: 'Antrian approval' },
    { href: '/humanify/leave', label: 'Manajemen Cuti', description: 'Cuti pending' },
    { href: '/humanify/reimbursement', label: 'Klaim', description: 'Klaim pending' },
    { href: '/humanify/payroll/lembur', label: 'Lembur', description: 'Lembur pending' },
  ],
  leave_pending_detail: [
    { href: '/humanify/leave', label: 'Manajemen Cuti', description: 'Review & setujui cuti' },
    { href: '/humanify/mss', label: 'Action Inbox', description: 'Antrian manajer' },
  ],
  run_leave_escalation: [
    { href: '/humanify/leave', label: 'Manajemen Cuti', description: 'Tindak lanjuti eskalasi' },
    { href: '/humanify/mss', label: 'Action Inbox MSS', description: 'Antrian approval' },
  ],
  contract_expiry_check: [
    { href: '/humanify/contracts', label: 'Kontrak & Reminder', description: 'Kontrak hampir habis' },
    { href: '/humanify/employees', label: 'Database Karyawan', description: 'Profil karyawan' },
  ],
  onboarding_status: [
    { href: '/humanify/onboarding', label: 'Onboarding', description: 'Proses karyawan baru' },
    { href: '/humanify/employees', label: 'Database Karyawan', description: 'Lengkapi data' },
  ],
  ir_pending_sp_list: [
    { href: '/humanify/disciplinary-letters', label: 'Surat Disiplin', description: 'Pipeline SP' },
    { href: '/humanify/industrial-relations', label: 'Hubungan Industrial', description: 'IR overview' },
  ],
  ir_phase_reminder: [
    { href: '/humanify/disciplinary-letters', label: 'Surat Disiplin', description: 'Tindak lanjut fase' },
  ],
  run_automation_scan: [
    { href: '/humanify/ai?tab=automation', label: 'Otomasi AIMAN', description: 'Aturan & log scan' },
  ],
  execute_recruitment_screening: [
    { href: '/humanify/recruitment', label: 'Buka Rekrutmen', description: 'Cek stage kandidat' },
  ],
  execute_contract_expiry_alert: [
    { href: '/humanify/contracts', label: 'Kontrak & Reminder', description: 'Tindak lanjut kontrak' },
  ],
  execute_leave_backlog_alert: [
    { href: '/humanify/leave', label: 'Manajemen Cuti', description: 'Kurangi backlog cuti' },
    { href: '/humanify/ai?tab=automation', label: 'Otomasi AIMAN', description: 'Log alert' },
  ],
};

/** Assisted functions — phrases that trigger AIMAN workflows in copilot. */
export const AIMAN_AGENT_WORKFLOWS: AgentWorkflowCatalogItem[] = [
  {
    id: 'payroll_prep',
    title: 'Persiapan Payroll',
    prompt: 'Persiapkan payroll bulan ini',
    description: 'Checklist gaji + opsi buat draft run (konfirmasi).',
    tools: ['payroll_prep_checklist', 'payroll_create_draft_run'],
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
    description: 'Detail cuti menunggu + eskalasi SLA (konfirmasi).',
    tools: ['leave_pending_detail', 'run_leave_escalation'],
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
    id: 'ir_desk',
    title: 'Meja IR / SP',
    prompt: 'Cek SP pending',
    description: 'Pipeline surat disiplin + reminder fase (konfirmasi).',
    tools: ['ir_pending_sp_list', 'ir_phase_reminder'],
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
