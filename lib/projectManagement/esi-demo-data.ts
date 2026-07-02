/**
 * Data demo program konservasi ESI — dipakai saat tabel PJM kosong atau belum ada.
 */

export const ESI_DEMO_PROJECTS = [
  {
    id: 'esi-p1',
    project_code: 'ESI-KON-2026-001',
    name: 'Reintroduksi Elang Jawa — Gunung Halimun',
    description: 'Program pelepasan dan monitoring elang jawa di habitat alami.',
    status: 'active',
    priority: 'high',
    progress_percent: 62,
    start_date: '2026-01-15',
    end_date: '2026-12-31',
    budget_amount: 850000000,
    actual_cost: 420000000,
    manager_name: 'Dr. Rina Wijaya',
    total_tasks: 24,
    completed_tasks: 14,
    task_count: 24,
    completed_task_count: 14,
    milestone_count: 5,
    resource_count: 8,
    open_risks: 2,
    branch_name: 'Kantor Pusat ESI',
    category: 'reintroduction',
  },
  {
    id: 'esi-p2',
    project_code: 'ESI-KON-2026-002',
    name: 'Rehabilitasi Orangutan — Pusat Trauma',
    description: 'Perawatan medis, enrichment, dan persiapan pelepasan orangutan.',
    status: 'active',
    priority: 'urgent',
    progress_percent: 45,
    start_date: '2025-11-01',
    end_date: '2026-08-30',
    budget_amount: 1200000000,
    actual_cost: 680000000,
    manager_name: 'Pak Budi Santoso',
    total_tasks: 32,
    completed_tasks: 12,
    task_count: 32,
    completed_task_count: 12,
    milestone_count: 6,
    resource_count: 12,
    open_risks: 3,
    branch_name: 'Kantor Pusat ESI',
    category: 'rehabilitation',
  },
  {
    id: 'esi-p3',
    project_code: 'ESI-KON-2026-003',
    name: 'Monitoring Habitat Badak Jawa',
    description: 'Patroli lapangan, camera trap, dan analisis vegetasi.',
    status: 'planning',
    priority: 'high',
    progress_percent: 18,
    start_date: '2026-03-01',
    end_date: '2027-02-28',
    budget_amount: 650000000,
    actual_cost: 95000000,
    manager_name: 'Siti Rahmawati',
    total_tasks: 16,
    completed_tasks: 3,
    task_count: 16,
    completed_task_count: 3,
    milestone_count: 4,
    resource_count: 6,
    open_risks: 1,
    branch_name: 'Kantor Pusat ESI',
    category: 'monitoring',
  },
  {
    id: 'esi-p4',
    project_code: 'ESI-EDU-2026-004',
    name: 'Edukasi Konservasi — Sekolah Adiwiyata',
    description: 'Workshop kesadaran satwa liar untuk 20 sekolah mitra.',
    status: 'active',
    priority: 'normal',
    progress_percent: 78,
    start_date: '2026-02-01',
    end_date: '2026-06-30',
    budget_amount: 180000000,
    actual_cost: 125000000,
    manager_name: 'Maya Kusuma',
    total_tasks: 18,
    completed_tasks: 15,
    task_count: 18,
    completed_task_count: 15,
    milestone_count: 3,
    resource_count: 4,
    open_risks: 0,
    branch_name: 'Kantor Pusat ESI',
    category: 'education',
  },
  {
    id: 'esi-p5',
    project_code: 'ESI-GRANT-2025-012',
    name: 'Grant KLHK — Patroli Hutan Lindung',
    description: 'Patroli ranger, laporan compliance grant pemerintah.',
    status: 'completed',
    priority: 'normal',
    progress_percent: 100,
    start_date: '2025-06-01',
    end_date: '2025-12-31',
    budget_amount: 420000000,
    actual_cost: 398000000,
    manager_name: 'Andi Pratama',
    total_tasks: 20,
    completed_tasks: 20,
    task_count: 20,
    completed_task_count: 20,
    milestone_count: 4,
    resource_count: 10,
    open_risks: 0,
    branch_name: 'Kantor Pusat ESI',
    category: 'grant',
  },
];

export const ESI_DEMO_MILESTONES = [
  { id: 'm1', name: 'Survei habitat fase 1', status: 'pending', due_date: '2026-04-15', project_name: 'Reintroduksi Elang Jawa — Gunung Halimun', project_code: 'ESI-KON-2026-001' },
  { id: 'm2', name: 'Pelepasan batch ke-2', status: 'pending', due_date: '2026-05-20', project_name: 'Reintroduksi Elang Jawa — Gunung Halimun', project_code: 'ESI-KON-2026-001' },
  { id: 'm3', name: 'Laporan grant Q2', status: 'pending', due_date: '2026-04-30', project_name: 'Rehabilitasi Orangutan — Pusat Trauma', project_code: 'ESI-KON-2026-002' },
  { id: 'm4', name: 'Instalasi camera trap', status: 'pending', due_date: '2026-05-10', project_name: 'Monitoring Habitat Badak Jawa', project_code: 'ESI-KON-2026-003' },
];

export function buildEsiDemoDashboard() {
  const active = ESI_DEMO_PROJECTS.filter(p => p.status === 'active').length;
  const completed = ESI_DEMO_PROJECTS.filter(p => p.status === 'completed').length;
  const planning = ESI_DEMO_PROJECTS.filter(p => p.status === 'planning').length;
  const totalBudget = ESI_DEMO_PROJECTS.reduce((s, p) => s + p.budget_amount, 0);
  const totalActual = ESI_DEMO_PROJECTS.reduce((s, p) => s + p.actual_cost, 0);
  const avgProgress = ESI_DEMO_PROJECTS.reduce((s, p) => s + p.progress_percent, 0) / ESI_DEMO_PROJECTS.length;

  return {
    projectStats: {
      total: String(ESI_DEMO_PROJECTS.length),
      planning: String(planning),
      active: String(active),
      on_hold: '0',
      completed: String(completed),
      cancelled: '0',
      total_budget: String(totalBudget),
      total_actual_cost: String(totalActual),
      avg_progress: String(avgProgress.toFixed(1)),
      overdue: '1',
    },
    taskStats: {
      total: '110',
      todo: '28',
      in_progress: '34',
      review: '12',
      done: '42',
      blocked: '4',
      overdue: '6',
      completed_this_week: '8',
    },
    riskStats: {
      total: '6',
      identified: '3',
      mitigating: '2',
      resolved: '1',
      high_risks: '2',
    },
    timesheetStats: {
      total_hours_month: '1240',
      pending_approval: '5',
      approved_cost: '185000000',
    },
    recentProjects: ESI_DEMO_PROJECTS.slice(0, 5),
    upcomingMilestones: ESI_DEMO_MILESTONES,
    budgetTrend: [
      { month: 'Jan', planned: 120, actual: 95, committed: 110 },
      { month: 'Feb', planned: 280, actual: 210, committed: 250 },
      { month: 'Mar', planned: 420, actual: 340, committed: 390 },
      { month: 'Apr', planned: 580, actual: 480, committed: 520 },
      { month: 'Mei', planned: 720, actual: 610, committed: 680 },
      { month: 'Jun', planned: 850, actual: 720, committed: 800 },
    ],
    taskDistribution: [
      { name: 'To Do', value: 28, color: '#6B7280' },
      { name: 'In Progress', value: 34, color: '#F59E0B' },
      { name: 'Review', value: 12, color: '#8B5CF6' },
      { name: 'Done', value: 42, color: '#10B981' },
      { name: 'Blocked', value: 4, color: '#EF4444' },
    ],
    weeklyHours: [
      { week: 'W10', hours: 280, target: 400 },
      { week: 'W11', hours: 310, target: 400 },
      { week: 'W12', hours: 295, target: 400 },
      { week: 'W13', hours: 340, target: 400 },
      { week: 'W14', hours: 315, target: 400 },
      { week: 'W15', hours: 360, target: 400 },
    ],
    riskMatrix: [
      { prob: 'High', impact: 'High', count: 1, level: 'critical' },
      { prob: 'Medium', impact: 'High', count: 2, level: 'high' },
      { prob: 'Medium', impact: 'Medium', count: 3, level: 'medium' },
    ],
    _demo: true,
    _source: 'esi-conservation-demo',
  };
}

export function filterEsiDemoProjects(opts: {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  let rows = [...ESI_DEMO_PROJECTS];
  const { status, priority, search, page = 1, limit = 20 } = opts;

  if (status && status !== 'all') {
    rows = rows.filter(p => p.status === status);
  }
  if (priority && priority !== 'all') {
    rows = rows.filter(p => p.priority === priority);
  }
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  const total = rows.length;
  const offset = (page - 1) * limit;
  return { rows: rows.slice(offset, offset + limit), total, page, limit };
}
