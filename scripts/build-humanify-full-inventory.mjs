/**
 * Scan Humanify surfaces (pages, APIs, components, lib, forms, access)
 * and write a structured Excel workbook.
 *
 * Run: node scripts/build-humanify-full-inventory.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'humanify-module-inventory.xlsx');
const CUTOFF = '9 September 2026';

const NAVY = 'FF0F3D3E';
const HEADER_FG = 'FFFFFFFF';
const ZEBRA = 'FFF4F7F6';
const ACCENT = 'FF0D7377';

const PAGE_TITLE_EXTRA = {
  '/humanify/login': 'Login tenant',
  '/humanify/signup': 'Daftar tenant baru',
  '/humanify/setup': 'Wizard onboarding SaaS',
  '/humanify/forgot-password': 'Lupa sandi',
  '/humanify/reset-password': 'Reset sandi',
  '/humanify/verify-email': 'Verifikasi email',
  '/humanify/join': 'Terima undangan tim',
  '/humanify/blog': 'Daftar artikel blog',
  '/humanify/blog/[slug]': 'Artikel blog',
  '/humanify/partners': 'Halaman partner',
  '/humanify/partners/status': 'Status lead partner',
  '/humanify/pricing/roi-calculator': 'Kalkulator ROI',
  '/humanify/admin-login': 'Alias login Admin Total',
  '/humanify/welcome': 'Landing marketing',
  '/humanify/lms/access': 'Akses LMS',
  '/humanify/lms/ai-assistant': 'AI Assistant LMS',
  '/humanify/lms/blueprints': 'Blueprint tes',
  '/humanify/lms/schedules': 'Jadwal tes LMS',
  '/humanify/lms/integrations': 'Integrasi LMS',
  '/humanify/lms/reports': 'Laporan LMS',
  '/humanify/lms/courses/[id]': 'Detail kursus',
  '/humanify/lms/tests/[id]': 'Detail tes',
  '/humanify/lms/psychometric-reports': 'Laporan psikometrik',
  '/humanify/devices': 'Alias perangkat absensi',
  '/humanify/training-development': 'L&D / kurikulum',
  '/humanify/training-scoring': 'Skor training',
  '/humanify/team-members/[id]': 'Detail anggota tim',
  '/employee/login': 'Login portal karyawan',
  '/employee/attendance': 'Deep-link absensi ESS',
  '/employee/leave': 'Deep-link cuti ESS',
  '/employee/payslip': 'Deep-link slip gaji',
  '/employee/training': 'Training ESS',
  '/employee/training/course/[id]': 'Kursus ESS',
  '/employee/training/exam/[id]': 'Ujian ESS',
  '/careers': 'Portal karir publik',
  '/careers/[slug]': 'Detail lowongan + apply',
  '/c/[tenantSlug]/careers': 'Karir tenant-scoped',
  '/c/[tenantSlug]/careers/[slug]': 'Detail lowongan tenant',
  '/platform/login': 'Login operator',
  '/platform/tenants/[id]': 'Detail tenant',
  '/platform/email-preview': 'Preview template email',
};

const PUBLIC_ROUTES = new Set([
  '/humanify/welcome',
  '/humanify/login',
  '/humanify/signup',
  '/humanify/forgot-password',
  '/humanify/reset-password',
  '/humanify/verify-email',
  '/humanify/join',
  '/humanify/blog',
  '/humanify/blog/[slug]',
  '/humanify/partners',
  '/humanify/partners/status',
  '/humanify/pricing/roi-calculator',
  '/humanify/admin-login',
  '/careers',
  '/careers/[slug]',
  '/c/[tenantSlug]/careers',
  '/c/[tenantSlug]/careers/[slug]',
  '/platform/login',
  '/employee/login',
]);

const ROUTE_FEATURE_RULES = [
  [/^\/humanify\/payroll/, 'payroll'],
  [/^\/humanify\/reimbursement/, 'payroll'],
  [/^\/humanify\/casual-workforce/, 'payroll'],
  [/^\/humanify\/travel-expense/, 'payroll'],
  [/^\/humanify\/overtime/, 'payroll'],
  [/^\/humanify\/lms/, 'lms'],
  [/^\/humanify\/training/, 'lms'],
  [/^\/humanify\/certificates/, 'lms'],
  [/^\/humanify\/recruitment/, 'recruitment'],
  [/^\/careers/, 'recruitment'],
  [/^\/c\/[^/]+\/careers/, 'recruitment'],
  [/^\/humanify\/ai/, 'ai'],
  [/^\/humanify\/enterprise/, 'api'],
  [/^\/humanify\/sso/, 'sso'],
  [/^\/humanify\/hr-analytics/, 'analytics'],
  [/^\/humanify\/workforce-analytics/, 'analytics'],
  [/^\/humanify\/reports/, 'analytics'],
  [/^\/humanify\/kpi/, 'analytics'],
  [/^\/humanify\/performance/, 'analytics'],
  [/^\/humanify\/okr/, 'analytics'],
  [/^\/humanify\/attendance/, 'attendance'],
  [/^\/humanify\/leave/, 'attendance'],
];

const API_FEATURE_RULES = [
  [/\/api\/humanify\/payroll(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/reimbursement(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/casual-workforce(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/travel-expense(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/overtime(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/disbursement(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/compliance-export(?:\/|$)/, 'payroll'],
  [/\/api\/humanify\/lms(?:\/|$)/, 'lms'],
  [/\/api\/humanify\/training(?:\/|$)/, 'lms'],
  [/\/api\/humanify\/certificates(?:\/|$)/, 'lms'],
  [/\/api\/humanify\/recruitment(?:\/|$)/, 'recruitment'],
  [/\/api\/humanify\/attendance(?:\/|$)/, 'attendance'],
  [/\/api\/humanify\/leave(?:\/|$)/, 'attendance'],
  [/\/api\/humanify\/workforce-analytics(?:\/|$)/, 'analytics'],
  [/\/api\/humanify\/predictive-analytics(?:\/|$)/, 'analytics'],
  [/\/api\/humanify\/hr-analytics(?:\/|$)/, 'analytics'],
  [/\/api\/humanify\/kpi(?:\/|$)/, 'analytics'],
  [/\/api\/humanify\/performance(?:\/|$)/, 'analytics'],
  [/\/api\/humanify\/okr(?:\/|$)/, 'analytics'],
  [/\/api\/humanify\/ai(?:\/|$)/, 'ai'],
  [/\/api\/humanify\/ai-hub(?:\/|$)/, 'ai'],
  [/\/api\/humanify\/ai-insights(?:\/|$)/, 'ai'],
  [/\/api\/humanify\/enterprise(?:\/|$)/, 'api'],
  [/\/api\/humanify\/sso(?:\/|$)/, 'sso'],
  [/\/api\/v1(?:\/|$)/, 'api'],
];

const PLANS = {
  trial: ['core', 'attendance', 'payroll', 'recruitment', 'lms', 'analytics', 'ai', 'api', 'white_label', 'sso'],
  starter: ['core', 'attendance', 'recruitment'],
  growth: ['core', 'attendance', 'recruitment', 'payroll', 'analytics'],
  enterprise: ['core', 'attendance', 'payroll', 'recruitment', 'analytics', 'api', 'white_label', 'sso'],
};

const FEATURE_LABELS = {
  core: 'Karyawan & organisasi',
  attendance: 'Absensi & cuti',
  payroll: 'Payroll, klaim, THR, PPh21',
  recruitment: 'Rekrutmen & karir',
  lms: 'LMS / Training (add-on)',
  analytics: 'HR Analytics & KPI',
  ai: 'AIMAN (add-on)',
  api: 'API keys Enterprise',
  white_label: 'White-label',
  sso: 'SSO SAML',
};

const STAFF_ITEMS = new Set([
  'humanify-home', 'humanify-calendar', 'humanify-announcements', 'humanify-ess',
  'humanify-leave', 'humanify-attendance', 'humanify-employee-portal', 'humanify-security',
  'humanify-knowledge-base', 'humanify-support',
]);
const MANAGER_EXTRA = new Set([
  'humanify-mss', 'humanify-employees', 'humanify-attendance-group', 'humanify-attendance-mgmt',
  'humanify-attendance-daily', 'humanify-kpi', 'humanify-performance', 'humanify-okr',
  'humanify-team', 'humanify-activities', 'humanify-mutations', 'humanify-travel',
  'humanify-reimbursement', 'humanify-knowledge-base', 'humanify-support',
]);
const ADMIN_ONLY = new Set([
  'humanify-employees-import', 'humanify-org-settings', 'humanify-billing', 'humanify-enterprise',
  'humanify-sso', 'humanify-users-team', 'humanify-users-roles', 'humanify-go-live',
  'humanify-payroll', 'humanify-casual', 'humanify-ai-hub', 'humanify-ir',
  'humanify-industrial-relations', 'humanify-disciplinary',
]);

const ESS_MODULES = [
  ['attendance', 'Absensi', 'Clock in/out GPS + wajah'],
  ['leave', 'Cuti', 'Ajukan & saldo'],
  ['claims', 'Klaim', 'Reimbursement + bukti'],
  ['overtime', 'Lembur', 'Ajukan & rekap'],
  ['travel', 'Perjalanan dinas', 'SPD karyawan'],
  ['payslip', 'Slip gaji', 'Unduh PDF'],
  ['kpi', 'KPI', 'Pencapaian individu'],
  ['files', 'Dokumen', 'KTP, KK, ijazah'],
  ['surveys', 'Survei', 'Engagement pulse'],
  ['training', 'Training & LMS', 'Kursus & ujian'],
  ['visit', 'Kunjungan lapangan', 'SFA check-in foto'],
  ['disciplinary', 'Surat SP', 'Lihat / request SP'],
];

const DESKS = ['super', 'management', 'finance', 'marketing', 'sales', 'cs', 'product', 'it'];
const DESK_GRANTS = {
  super: 'all',
  management: 'all',
  finance: ['users.view', 'clients.view', 'billing.view', 'billing.refund', 'finance.view', 'finance.refund', 'approvals.decide', 'audit.view'],
  marketing: ['users.view', 'clients.view', 'marketing.view', 'marketing.edit', 'content.view', 'content.publish'],
  sales: ['users.view', 'clients.view', 'clients.edit', 'crm.view', 'crm.edit', 'marketing.view'],
  cs: ['users.view', 'users.edit', 'clients.view', 'billing.view', 'crm.view', 'content.view'],
  product: ['users.view', 'clients.view', 'billing.view', 'billing.edit', 'content.view', 'content.publish'],
  it: ['users.view', 'system.view', 'audit.view'],
};
const PLATFORM_PERMS = [
  ['users.view', 'Lihat pengguna'],
  ['users.edit', 'Ubah / suspend user'],
  ['clients.view', 'Lihat klien'],
  ['clients.edit', 'Ubah klien / plan / trial'],
  ['billing.view', 'Lihat billing'],
  ['billing.edit', 'Ubah paket & voucher'],
  ['billing.refund', 'Refund (billing)'],
  ['finance.view', 'Lihat finance'],
  ['finance.refund', 'Refund finance'],
  ['crm.view', 'Lihat CRM'],
  ['crm.edit', 'Ubah pipeline'],
  ['marketing.view', 'Lihat campaign'],
  ['marketing.edit', 'Ubah campaign'],
  ['content.view', 'Lihat CMS'],
  ['content.publish', 'Publish konten'],
  ['approvals.decide', 'Putuskan approval'],
  ['system.view', 'Lihat sistem'],
  ['audit.view', 'Lihat audit'],
  ['roles.assign', 'Assign desk staf'],
];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function firstDoc(src) {
  const block = src.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (block) {
    const line = block[1]
      .replace(/^\s*\*\s?/gm, '')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('@'))[0];
    return (line || '').slice(0, 180);
  }
  const line = src.match(/^\s*\/\/\s*(.+)/);
  return line ? line[1].trim().slice(0, 180) : '';
}

function fileToRoute(file, pagesRoot) {
  let p = rel(file).slice(pagesRoot.length).replace(/\.(tsx|ts|jsx|js)$/, '');
  p = p.replace(/\/index$/, '') || '/';
  p = p.replace(/\[\.\.\.([^\]]+)\]/g, ':$1*');
  return p.startsWith('/') ? p : `/${p}`;
}

function featureFor(pathname, rules) {
  const pathOnly = pathname.split('?')[0];
  for (const [re, feat] of rules) {
    if (re.test(pathOnly)) return feat;
  }
  return 'core';
}

function parseSidebar(src) {
  const items = [];
  const groupRe = /\{\s*id:\s*'([^']+)',\s*title:\s*'([^']+)',\s*items:\s*\[/g;
  const groups = [...src.matchAll(groupRe)];
  for (let i = 0; i < groups.length; i++) {
    const groupId = groups[i][1];
    const groupTitle = groups[i][2];
    const start = groups[i].index;
    const end = i + 1 < groups.length ? groups[i + 1].index : src.length;
    const block = src.slice(start, end);
    const itemRe = /id:\s*'([^']+)',\s*name:\s*'([^']+)'/g;
    let m;
    while ((m = itemRe.exec(block))) {
      const chunk = block.slice(m.index, m.index + 500);
      const href = chunk.match(/href:\s*'([^']+)'/)?.[1] || '';
      const hidden = /hidden:\s*(true|!|String)/.test(chunk);
      items.push({ groupId, groupTitle, id: m[1], name: m[2], href, hidden });
    }
  }
  return items;
}

function parseOpsNav(src) {
  const rows = [];
  let section = 'Primer';
  for (const m of src.matchAll(/label:\s*'([^']+)'/g)) {
    if (['Commercial', 'Growth', 'Admin'].includes(m[1])) section = m[1];
  }
  const blocks = src.split(/const (?:PRIMARY|MORE_GROUPS)/);
  const primary = src.slice(src.indexOf('const PRIMARY'), src.indexOf('const MORE_GROUPS'));
  for (const m of primary.matchAll(/href:\s*'([^']+)'[\s\S]*?label:\s*'([^']+)'[\s\S]*?hint:\s*'([^']+)'/g)) {
    rows.push({ section: 'Primer', href: m[1], label: m[2], hint: m[3] });
  }
  const more = src.slice(src.indexOf('const MORE_GROUPS'));
  let cur = '';
  for (const line of more.split('\n')) {
    const lab = line.match(/label:\s*'([^']+)'/);
    const href = line.match(/href:\s*'([^']+)'/);
    if (lab && !href && ['Commercial', 'Growth', 'Admin'].includes(lab[1])) {
      cur = lab[1];
    } else if (href && lab) {
      rows.push({ section: cur || 'Lainnya', href: href[1], label: lab[1], hint: '' });
    }
  }
  return rows;
}

function extractMethods(src) {
  const set = new Set();
  for (const m of src.matchAll(/req\.method\s*===\s*['"](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"]/g)) set.add(m[1]);
  for (const m of src.matchAll(/case\s+['"](GET|POST|PUT|PATCH|DELETE)['"]/g)) set.add(m[1]);
  for (const m of src.matchAll(/req\.method\s*!==\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g)) set.add(m[1]);
  const allow = src.match(/setHeader\(\s*['"]Allow['"]\s*,\s*\[([^\]]+)\]/);
  if (allow) {
    for (const m of allow[1].matchAll(/['"](GET|POST|PUT|PATCH|DELETE)['"]/g)) set.add(m[1]);
  }
  return [...set].sort();
}

function extractActions(src) {
  const set = new Set();
  for (const m of src.matchAll(/action\s*===\s*['"]([a-zA-Z0-9._-]+)['"]/g)) set.add(m[1]);
  for (const m of src.matchAll(/case\s+['"]([a-zA-Z][a-zA-Z0-9._-]{2,})['"]/g)) {
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(m[1])) set.add(m[1]);
  }
  return [...set].sort().slice(0, 40);
}

function classifyApiAuth(src, route) {
  if (route.includes('/billing/webhook')) return 'Midtrans webhook (signature)';
  if (route.includes('/webhooks/privy')) return 'Privy webhook';
  if (route.includes('/webhooks/recruitment')) return 'ATS webhook';
  if (route.startsWith('/api/v1/')) return 'API key Enterprise';
  if (route.includes('/sso/')) return 'SAML / publik ACS';
  if (route.includes('public-upload')) return 'Publik (file branding)';
  if (/signup|password-reset|email-verify|invitations-accept|partners\/lead|partners\/status|roi-stats|aiman-public/.test(route)) {
    return 'Publik / token';
  }
  if (/\/banners$|\/faqs$|\/articles$/.test(route)) return 'Publik baca / session tulis';
  if (src.includes('withHQAuth')) return 'Session HQ (withHQAuth + RBAC)';
  if (route.startsWith('/api/platform/')) return 'Ops host + session operator';
  if (route.startsWith('/api/employee/')) return 'Session karyawan (ESS)';
  if (/getServerSession|getToken/.test(src)) return 'Session NextAuth';
  return 'Session / periksa handler';
}

function extractApis(src) {
  const set = new Set();
  for (const m of src.matchAll(/['"`](\/api\/(?:humanify|platform|employee|v1)[^'"`?\s]*)/g)) {
    const clean = m[1]
      .replace(/\$\{[^}]+\}/g, ':id')
      .replace(/\/$/, '')
      .split('?')[0];
    if (clean.length < 80) set.add(clean);
  }
  return [...set].sort();
}

function extractFields(src) {
  const names = new Set();
  for (const m of src.matchAll(/\b(?:form|formData|newTask|settlementForm)\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (!['map', 'filter', 'length', 'trim', 'toString'].includes(m[1])) names.add(m[1]);
  }
  for (const m of src.matchAll(/useState\(\s*\{\s*([^}]+)\}/g)) {
    for (const k of m[1].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) names.add(k[1]);
  }
  for (const m of src.matchAll(/\bname=["']([A-Za-z_][A-Za-z0-9_-]*)["']/g)) names.add(m[1]);
  for (const m of src.matchAll(/<label[^>]*>([^<]{2,60})</g)) {
    const t = m[1].replace(/\{.*\}/, '').trim();
    if (t && t.length < 40 && !t.includes('className')) names.add(t);
  }
  return [...names].slice(0, 25);
}

function surfaceForRoute(route) {
  if (route.startsWith('/platform')) return 'Admin Total';
  if (route.startsWith('/employee')) return 'ESS / MSS';
  if (route.startsWith('/careers') || route.startsWith('/c/')) return 'Publik karir';
  if (PUBLIC_ROUTES.has(route)) return 'Publik & auth';
  if (route.startsWith('/humanify')) return 'HQ tenant';
  return 'Lainnya';
}

function authForPage(route) {
  if (PUBLIC_ROUTES.has(route)) return 'Publik';
  if (route.startsWith('/platform')) return 'Operator Naincode (ops host)';
  if (route.startsWith('/employee')) return 'Session karyawan';
  if (route.startsWith('/careers') || route.startsWith('/c/')) return 'Publik';
  return 'Session HQ (requireHumanifySession)';
}

function statusForPage(route, sidebarByHref) {
  const sb = sidebarByHref.get(route);
  if (sb?.hidden) {
    if (route.includes('lms/proctoring') || route.includes('psychometric') || route.includes('academy')) return 'Lab (HUMANIFY_LMS_LAB)';
    if (route.includes('esign')) return 'Hidden / lab (ESIGN_UI_ENABLED)';
    if (route.includes('engagement') || route.includes('project-management')) return 'Hidden IA';
    if (route.includes('ai')) return 'Flag AIMAN UI';
    return 'Hidden sidebar';
  }
  if (route.includes('training-development') || route.includes('training-scoring')) return 'Partial / URL lanjut';
  if (route.startsWith('/humanify/lms/') && !sb) return 'URL lanjut (tidak semua di sidebar)';
  if (PUBLIC_ROUTES.has(route)) return 'Publik';
  if (sb) return 'GA / di sidebar';
  return 'Ada di kode';
}

function personaAccess(itemId, href) {
  if (!itemId) {
    if (href.startsWith('/humanify/payroll') || href.includes('billing') || href.includes('sso') || href.includes('enterprise')) {
      return { staff: 'Tidak', manager: 'Tidak', hr: 'Ya', platform: 'Ya' };
    }
    return { staff: '—', manager: '—', hr: 'Ya', platform: 'Ya' };
  }
  if (STAFF_ITEMS.has(itemId)) return { staff: 'Ya', manager: 'Ya', hr: 'Ya', platform: 'Ya' };
  if (ADMIN_ONLY.has(itemId) || itemId.startsWith('humanify-payroll') || itemId.startsWith('humanify-lms') || itemId.startsWith('humanify-ai')) {
    return { staff: 'Tidak', manager: 'Tidak', hr: 'Ya', platform: 'Ya' };
  }
  if (MANAGER_EXTRA.has(itemId)) return { staff: 'Tidak', manager: 'Ya', hr: 'Ya', platform: 'Ya' };
  return { staff: 'Tidak', manager: 'Ya*', hr: 'Ya', platform: 'Ya' };
}

function parseHrisPermissions(src) {
  const start = src.indexOf("id: 'hris'");
  if (start < 0) return [];
  const slice = src.slice(start, src.indexOf('id: \'crm_sfa\'', start));
  const rows = [];
  let moduleName = '';
  let moduleCode = '';
  let route = '';
  for (const line of slice.split('\n')) {
    const code = line.match(/code:\s*'([^']+)'/);
    const name = line.match(/name:\s*'([^']+)'/);
    const rt = line.match(/route:\s*'([^']+)'/);
    const op = line.match(/op\('([^']+)',\s*'([^']+)'/);
    if (code) moduleCode = code[1];
    if (name && !line.includes('op(') && moduleCode) moduleName = name[1];
    if (rt) route = rt[1];
    if (op) rows.push({ moduleCode, moduleName, route, key: op[1], label: op[2] });
  }
  for (const m of slice.matchAll(/crud\('([^']+)',\s*'([^']+)'\)/g)) {
    for (const act of ['view', 'create', 'update', 'delete']) {
      rows.push({
        moduleCode: m[1],
        moduleName: m[2],
        route,
        key: `${m[1]}.${act}`,
        label: `${act} ${m[2]}`,
      });
    }
  }
  return rows;
}

function moduleForRoute(route, sidebarItems) {
  const hit = sidebarItems.find((i) => i.href === route);
  if (hit) return hit.groupTitle;
  if (route.startsWith('/humanify/lms')) return 'Talent & Belajar';
  if (route.startsWith('/humanify/payroll')) return 'Payroll';
  if (route.startsWith('/humanify/attendance')) return 'Kehadiran & Cuti';
  if (route.startsWith('/platform')) return 'Admin Total';
  if (route.startsWith('/employee')) return 'Portal karyawan';
  if (route.startsWith('/careers') || route.startsWith('/c/')) return 'Rekrutmen publik';
  if (PUBLIC_ROUTES.has(route)) return 'Publik & auth';
  return 'Lainnya';
}

function roleOfComponent(file) {
  const p = rel(file);
  if (p.includes('/disciplinary/')) return 'Surat disiplin';
  if (p.includes('/project-management/')) return 'Proyek HR (hidden IA)';
  if (p.includes('/lms/')) return 'LMS player / chrome';
  if (p.includes('/enterprise/')) return 'Enterprise / template surat';
  if (p.includes('components/employee/')) return 'Portal ESS/MSS';
  const base = path.basename(file, path.extname(file));
  return base.replace(/([A-Z])/g, ' $1').trim();
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: HEADER_FG }, name: 'Calibri', size: 10 };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  row.alignment = { vertical: 'middle', wrapText: true };
  row.height = 22;
}

function addSheet(wb, name, headers, rows, widths) {
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = headers.map((h, i) => ({
    header: h,
    key: `c${i}`,
    width: widths?.[i] || Math.min(42, Math.max(14, String(h).length + 6)),
  }));
  styleHeader(ws.getRow(1));
  rows.forEach((row, rIdx) => {
    const excelRow = ws.addRow(row.map((v) => (v == null ? '' : v)));
    excelRow.alignment = { wrapText: true, vertical: 'top' };
    excelRow.font = { name: 'Calibri', size: 10 };
    if (rIdx % 2 === 1) {
      excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    }
  });
  if (rows.length) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1 + rows.length, column: headers.length },
    };
  }
  ws.getRow(1).eachCell((cell) => {
    cell.border = { bottom: { style: 'thin', color: { argb: ACCENT } } };
  });
  return ws;
}

function collect() {
  const sidebarSrc = read(path.join(ROOT, 'config/humanify-sidebar.config.ts'));
  const sidebarItems = parseSidebar(sidebarSrc);
  const sidebarByHref = new Map(sidebarItems.filter((i) => i.href).map((i) => [i.href, i]));

  const pageRoots = [
    ['pages/humanify', 'pages/humanify'],
    ['pages/platform', 'pages/platform'],
    ['pages/employee', 'pages/employee'],
    ['pages/careers', 'pages/careers'],
    ['pages/c', 'pages/c'],
  ];
  const pages = [];
  for (const [dir] of pageRoots) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (!/\.(tsx|ts|jsx|js)$/.test(file) || file.includes('.test.')) continue;
      const src = read(file);
      const route = fileToRoute(file, 'pages');
      const sb = sidebarByHref.get(route);
      const title = PAGE_TITLE_EXTRA[route] || sb?.name || path.basename(file, path.extname(file));
      const feat = featureFor(route, ROUTE_FEATURE_RULES);
      const persona = personaAccess(sb?.id, route);
      pages.push({
        surface: surfaceForRoute(route),
        module: moduleForRoute(route, sidebarItems),
        title,
        route,
        file: rel(file),
        auth: authForPage(route),
        feature: feat,
        featureLabel: FEATURE_LABELS[feat] || feat,
        status: statusForPage(route, sidebarByHref),
        sidebar: sb ? (sb.hidden ? 'Hidden' : 'Ya') : 'Tidak',
        sidebarId: sb?.id || '',
        doc: firstDoc(src),
        apis: extractApis(src),
        formCount: (src.match(/<form\b/g) || []).length,
        staff: persona.staff,
        manager: persona.manager,
        hr: persona.hr,
        platform: persona.platform,
      });
    }
  }
  pages.sort((a, b) => a.route.localeCompare(b.route));

  const apiRoots = [
    'pages/api/humanify',
    'pages/api/platform',
    'pages/api/employee',
    'pages/api/v1',
  ];
  const apis = [];
  for (const dir of apiRoots) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (!/\.(ts|js)$/.test(file) || file.includes('.test.')) continue;
      const src = read(file);
      const route = `/api${fileToRoute(file, 'pages/api')}`;
      const methods = extractMethods(src);
      const actions = extractActions(src);
      const feat = featureFor(route, API_FEATURE_RULES);
      apis.push({
        prefix: route.startsWith('/api/v1')
          ? 'v1'
          : route.startsWith('/api/platform')
            ? 'platform'
            : route.startsWith('/api/employee')
              ? 'employee'
              : 'humanify',
        route,
        file: rel(file),
        methods: methods.join(', ') || '(lihat handler)',
        actions: actions.join(', '),
        auth: classifyApiAuth(src, route),
        feature: feat,
        featureLabel: FEATURE_LABELS[feat] || feat,
        tenant: /tenant_id|scopedWhere|requireHumanify|getServerSession|withHQAuth/.test(src) ? 'Ya' : 'Tidak / publik',
        doc: firstDoc(src),
      });
    }
  }
  apis.sort((a, b) => a.route.localeCompare(b.route));

  const components = [];
  for (const dir of ['components/humanify', 'components/employee']) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (!/\.(tsx|ts)$/.test(file)) continue;
      const src = read(file);
      components.push({
        area: dir.includes('employee') ? 'ESS/MSS' : 'HQ / ops shared',
        file: rel(file),
        name: path.basename(file, path.extname(file)),
        role: roleOfComponent(file),
        doc: firstDoc(src),
        hasForm: /<form\b|FormData|onSubmit/.test(src) ? 'Ya' : 'Tidak',
        fields: extractFields(src).join(', '),
      });
    }
  }
  components.sort((a, b) => a.file.localeCompare(b.file));

  const backend = [];
  for (const dir of ['lib/hris', 'lib/saas', 'lib/humanify']) {
    for (const file of walk(path.join(ROOT, dir))) {
      if (!/\.(ts|js)$/.test(file) || file.endsWith('.d.ts')) continue;
      const src = read(file);
      const domain = dir.replace('lib/', '');
      backend.push({
        domain,
        file: rel(file),
        name: path.basename(file, path.extname(file)),
        doc: firstDoc(src) || path.basename(file, path.extname(file)).replace(/-/g, ' '),
        exports: [...src.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]).slice(0, 8).join(', '),
      });
    }
  }
  backend.sort((a, b) => a.file.localeCompare(b.file));

  const forms = [];
  const formFiles = [
    ...walk(path.join(ROOT, 'pages/humanify')),
    ...walk(path.join(ROOT, 'pages/platform')),
    ...walk(path.join(ROOT, 'pages/employee')),
    ...walk(path.join(ROOT, 'pages/careers')),
    ...walk(path.join(ROOT, 'pages/c')),
    ...walk(path.join(ROOT, 'components/humanify')),
    ...walk(path.join(ROOT, 'components/employee')),
  ].filter((f) => /\.(tsx|ts)$/.test(f));

  for (const file of formFiles) {
    const src = read(file);
    const base = path.basename(file, path.extname(file));
    const inputCount =
      (src.match(/<input\b/g) || []).length +
      (src.match(/<select\b/g) || []).length +
      (src.match(/<textarea\b/g) || []).length;
    const hasFormTag = /<form\b/.test(src);
    const isFormComp = /Form|Wizard|Modal|Checkout|Studio/.test(base) && /onSubmit|<input|<select|textarea|onChange/.test(src);
    const looksLikeForm = inputCount >= 3 && /onChange|setForm|formData|handleSubmit/.test(src);
    if (!hasFormTag && !isFormComp && !looksLikeForm) continue;
    const routeGuess = file.includes('/pages/')
      ? fileToRoute(file, 'pages')
      : '(komponen shared)';
    const fields = extractFields(src);
    const submitApis = extractApis(src);
    const jenis = hasFormTag
      ? `HTML form (${(src.match(/<form\b/g) || []).length})`
      : isFormComp
        ? 'Komponen form'
        : `Input panel (${inputCount} field)`;
    const formSurface = file.includes('/pages/employee/') || file.includes('/components/employee/')
      ? 'ESS'
      : file.includes('/pages/platform/') || file.includes('OpsLogin')
        ? 'Admin Total'
        : file.includes('/pages/careers/') || file.includes('/pages/c/')
          ? 'Publik'
          : PUBLIC_ROUTES.has(routeGuess)
            ? 'Publik'
            : 'HQ';
    forms.push({
      surface: formSurface,
      lokasi: routeGuess,
      file: rel(file),
      jenis,
      nama: PAGE_TITLE_EXTRA[routeGuess] || sidebarByHref.get(routeGuess)?.name || base,
      fields: fields.join(', ') || '—',
      endpoints: submitApis.join(', ') || '—',
    });
  }

  const opsNav = parseOpsNav(read(path.join(ROOT, 'components/humanify/PlatformOpsNav.tsx')));
  const hrisPerms = parseHrisPermissions(read(path.join(ROOT, 'lib/permissions/permissions-catalog.ts')));

  return { sidebarItems, pages, apis, components, backend, forms, opsNav, hrisPerms };
}

async function writeExcel(data) {
  const { sidebarItems, pages, apis, components, backend, forms, opsNav, hrisPerms } = data;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Naincode Dev';
  wb.created = new Date();
  wb.title = 'Humanify — Inventaris lengkap';
  wb.description = 'Halaman, modul, fitur, frontend, backend, form, endpoint, akses — Humanify HRIS SaaS';

  const cover = wb.addWorksheet('00_Ringkasan');
  cover.columns = [{ width: 36 }, { width: 88 }];
  cover.addRow(['Humanify — Inventaris lengkap (data list)']).font = {
    bold: true, size: 16, color: { argb: NAVY },
  };
  const meta = [
    ['Produk', 'Humanify HRIS SaaS (humanify.id) — bukan SIMESI'],
    ['Cutoff kode', CUTOFF],
    ['Diekspor', new Date().toISOString().slice(0, 10)],
    ['Sumber', 'Scan pages/, pages/api/, components/, lib/ + sidebar + entitlements'],
    ['Cara baca', 'GA/sidebar = dijual. Lab/hidden = ada di kode. LMS & AIMAN = add-on (bukan bundled Enterprise).'],
    [],
    ['Permukaan', 'Jumlah file'],
    ['Halaman (semua permukaan)', pages.length],
    ['  · HQ /humanify', pages.filter((p) => p.surface === 'HQ tenant').length],
    ['  · Admin Total /platform', pages.filter((p) => p.surface === 'Admin Total').length],
    ['  · ESS /employee', pages.filter((p) => p.surface === 'ESS / MSS').length],
    ['  · Publik & karir', pages.filter((p) => p.surface.startsWith('Publik')).length],
    ['Endpoint API', apis.length],
    ['  · /api/humanify', apis.filter((a) => a.prefix === 'humanify').length],
    ['  · /api/platform', apis.filter((a) => a.prefix === 'platform').length],
    ['  · /api/employee', apis.filter((a) => a.prefix === 'employee').length],
    ['  · /api/v1', apis.filter((a) => a.prefix === 'v1').length],
    ['Komponen frontend', components.length],
    ['Modul backend lib/', backend.length],
    ['Form terdeteksi', forms.length],
    ['Item sidebar', sidebarItems.filter((i) => i.href).length],
    [],
    ['Isi sheet', ''],
  ];
  for (const row of meta) {
    const r = cover.addRow(row);
    if (row[0] && !row[1] && String(row[0]).length > 2) r.font = { bold: true, color: { argb: NAVY } };
    r.getCell(2).alignment = { wrapText: true };
  }
  const sheetsHelp = [
    ['01_Halaman', 'Semua halaman UI + auth, paket fitur, persona, status'],
    ['02_Modul_Sidebar', 'IA sidebar HQ (grup, hidden, lab)'],
    ['03_Fitur_Paket', 'Matriks Trial/Starter/Growth/Enterprise + add-on'],
    ['04_Endpoint_API', 'Route API, HTTP method, action, auth, isolasi'],
    ['05_Komponen_FE', 'components/humanify + components/employee'],
    ['06_Backend_Lib', 'lib/hris, lib/saas, lib/humanify'],
    ['07_Form', 'Form HTML / wizard / modal + field + endpoint'],
    ['08_Akses_Role', 'Persona HQ, membership, SoD payroll, ESS'],
    ['09_Permission_HRIS', 'Katalog RBAC tenant (permissions-catalog)'],
    ['10_Desk_Platform', 'Desk operator Admin Total × izin'],
    ['11_ESS_Portal', 'Tab portal karyawan (toggle per tenant)'],
    ['12_Halaman_x_Paket', 'Boleh tidaknya halaman per paket'],
    ['13_Halaman_x_API', 'Halaman → endpoint yang dipanggil'],
    ['14_Admin_Total', 'Nav /platform'],
  ];
  for (const row of sheetsHelp) cover.addRow(row);

  addSheet(
    wb,
    '01_Halaman',
    ['Permukaan', 'Modul', 'Nama', 'Route', 'File', 'Auth', 'Fitur paket', 'Status', 'Sidebar', 'Staff', 'Manager', 'HR Admin', 'Platform ops', 'Jml form', 'Catatan'],
    pages.map((p) => [
      p.surface, p.module, p.title, p.route, p.file, p.auth, p.featureLabel, p.status,
      p.sidebar, p.staff, p.manager, p.hr, p.platform, p.formCount, p.doc,
    ]),
    [16, 20, 28, 38, 42, 28, 22, 28, 12, 10, 10, 12, 12, 10, 48],
  );

  addSheet(
    wb,
    '02_Modul_Sidebar',
    ['Grup ID', 'Grup', 'Item ID', 'Nama', 'Route', 'Hidden / lab'],
    sidebarItems.map((i) => [i.groupId, i.groupTitle, i.id, i.name, i.href || '(grup/parent)', i.hidden ? 'Ya' : 'Tidak']),
    [18, 22, 32, 32, 40, 16],
  );

  const featRows = Object.entries(FEATURE_LABELS).map(([id, label]) => [
    id,
    label,
    PLANS.trial.includes(id) ? 'Ya' : 'Tidak',
    PLANS.starter.includes(id) ? 'Ya' : 'Tidak',
    PLANS.growth.includes(id) ? 'Ya' : 'Tidak',
    PLANS.enterprise.includes(id) ? 'Ya' : (id === 'lms' || id === 'ai' ? 'Add-on' : 'Tidak'),
    id === 'lms' || id === 'ai' ? 'Add-on berbayar (bukan bundled Enterprise)' : 'Termasuk paket',
  ]);
  addSheet(
    wb,
    '03_Fitur_Paket',
    ['Kode fitur', 'Label', 'Trial 14h', 'Starter', 'Growth', 'Enterprise', 'Catatan'],
    [
      ...featRows,
      [],
      ['Harga kursi', 'Rp 10.000 / karyawan / bulan', '', '', '', '', '251+ → 9.500; 1.001+ → 9.000 (all-units)'],
      ['Add-on LMS', 'Rp 1.500 / orang / bulan', '', '', '', '', 'lib/saas/seat-pricing.ts'],
      ['Add-on AIMAN', 'Rp 65.000 / bulan flat', '', '', '', '', 'Bukan bundled Enterprise'],
    ],
    [16, 36, 12, 12, 12, 14, 48],
  );

  addSheet(
    wb,
    '04_Endpoint_API',
    ['Prefix', 'Route', 'File', 'HTTP', 'Action / query', 'Auth / akses', 'Fitur paket', 'Tenant-scoped', 'Catatan'],
    apis.map((a) => [a.prefix, a.route, a.file, a.methods, a.actions, a.auth, a.featureLabel, a.tenant, a.doc]),
    [12, 48, 44, 22, 36, 32, 22, 16, 44],
  );

  addSheet(
    wb,
    '05_Komponen_FE',
    ['Area', 'Komponen', 'File', 'Peran', 'Punya form', 'Field terdeteksi', 'Catatan'],
    components.map((c) => [c.area, c.name, c.file, c.role, c.hasForm, c.fields, c.doc]),
    [16, 32, 52, 28, 12, 48, 44],
  );

  addSheet(
    wb,
    '06_Backend_Lib',
    ['Domain', 'Modul', 'File', 'Export fungsi (cuplikan)', 'Catatan'],
    backend.map((b) => [b.domain, b.name, b.file, b.exports, b.doc]),
    [14, 32, 52, 48, 48],
  );

  addSheet(
    wb,
    '07_Form',
    ['Permukaan', 'Lokasi / route', 'File', 'Jenis', 'Nama', 'Field terdeteksi', 'Endpoint terkait'],
    forms.map((f) => [f.surface, f.lokasi, f.file, f.jenis, f.nama, f.fields, f.endpoints]),
    [14, 36, 48, 22, 28, 48, 44],
  );

  addSheet(
    wb,
    '08_Akses_Role',
    ['Lapisan', 'Kode / peran', 'Siapa', 'Boleh apa', 'Catatan'],
    [
      ['Permukaan', 'HQ tenant', 'Owner, admin, hq_admin, hr_admin, finance, manager, staff', 'UI /humanify sesuai persona sidebar', 'HumanifyLayout + filterHumanifySidebarByPersona'],
      ['Permukaan', 'ESS /employee', 'Karyawan (session)', 'Tab sesuai ESS_PORTAL_MODULES tenant', 'ManagerHub jika isManagerRole'],
      ['Permukaan', 'Admin Total /platform', 'super_admin, platform_admin + desk', 'Control plane Naincode', 'Ops host, bukan UI klien'],
      ['Permukaan', 'Publik', 'Anon + kandidat', 'Welcome, login, signup, blog, careers', 'Tanpa tenant session'],
      ['Membership', 'owner', 'Pemilik tenant', 'Switcher perusahaan, billing, invite, roles', 'saas_company_memberships'],
      ['Membership', 'admin', 'Admin perusahaan', 'Hampir penuh kecuali beberapa ops', 'canManageCompanies'],
      ['Membership', 'member', 'Staf HQ', 'Tidak lihat CompanySwitcher', 'Switch hanya ganti JWT tenant'],
      ['Persona', 'staff', 'Karyawan / viewer', 'Beranda, kalender, pengumuman, leave, absensi, ESS, keamanan, bantuan', 'STAFF_ITEMS'],
      ['Persona', 'manager', 'Atasan', 'Staff + MSS, karyawan, KPI, mutasi, travel, klaim', 'Tanpa payroll/LMS/billing/SSO'],
      ['Persona', 'hr_admin', 'HR / finance_staff / hq_admin', 'Hampir seluruh sidebar', 'Payroll SoD tetap berlaku'],
      ['Persona', 'platform', 'super_admin / platform_admin', 'Semua + Admin Total', 'Impersonate hanya di /platform'],
      ['SoD payroll', 'finance_staff / owner / platform', 'Finance', 'Approve run & tandai paid', 'HR boleh hitung, tidak approve (payroll-finance-sod)'],
      ['Paket', 'starter', 'Tenant Starter', 'core + attendance + recruitment', 'Tanpa payroll/analytics/LMS/AI'],
      ['Paket', 'growth', 'Tenant Growth', 'Starter + payroll + analytics', 'LMS/AI tetap add-on'],
      ['Paket', 'enterprise', 'Tenant Enterprise', 'Growth + API + SSO + white-label', 'LMS + AIMAN add-on terpisah'],
      ['Paket', 'trial', '14 hari', 'Semua fitur termasuk LMS & AI', 'Evaluasi'],
      ['Add-on', 'lms', 'Checkout kursi', 'Membuka /humanify/lms* dan training', 'Rp 1.500/orang/bulan'],
      ['Add-on', 'ai', 'Checkout AIMAN', 'Membuka /humanify/ai', 'Rp 65.000/bulan flat'],
      ['Keamanan', 'MFA', 'User HQ', '/humanify/security enroll TOTP', 'lib/saas/mfa.ts'],
      ['Keamanan', 'SSO SAML', 'Enterprise', '/humanify/sso + /api/humanify/sso/*', 'ACS publik'],
      ['Isolasi', 'tenant_id', 'Semua API tenant', 'scopedWhere + RLS', 'npm run db:humanify-rls'],
    ],
    [16, 36, 40, 52, 48],
  );

  addSheet(
    wb,
    '09_Permission_HRIS',
    ['Modul kode', 'Modul', 'Route UI', 'Permission key', 'Label'],
    hrisPerms.map((p) => [p.moduleCode, p.moduleName, p.route, p.key, p.label]),
    [22, 28, 36, 36, 36],
  );

  const deskRows = PLATFORM_PERMS.map(([perm, label]) => [
    perm,
    label,
    ...DESKS.map((d) => (DESK_GRANTS[d] === 'all' || DESK_GRANTS[d].includes(perm) ? 'Ya' : 'Tidak')),
  ]);
  addSheet(
    wb,
    '10_Desk_Platform',
    ['Izin', 'Label', ...DESKS],
    deskRows,
    [20, 28, 12, 14, 12, 12, 10, 10, 12, 10],
  );

  addSheet(
    wb,
    '11_ESS_Portal',
    ['Key', 'Label tab', 'Default', 'Fungsi', 'Dikonfigurasi di'],
    [
      ['home', 'Beranda', 'Selalu ada', 'Ringkasan, pengumuman, KPI card', '/humanify/ess'],
      ['manager', 'Manajer (MSS)', 'Jika role manajer', 'Approve cuti/klaim/lembur', '/employee + /humanify/mss'],
      ...ESS_MODULES.map(([key, label, fn]) => [key, label, 'On (bisa dimatikan tenant)', fn, '/humanify/ess → ESS_PORTAL_MODULES']),
      ['profile', 'Profil', 'Selalu ada', 'Akun + face enrollment', 'EmployeePortal'],
    ],
    [16, 22, 28, 36, 40],
  );

  addSheet(
    wb,
    '12_Halaman_x_Paket',
    ['Route', 'Nama', 'Fitur', 'Trial', 'Starter', 'Growth', 'Enterprise', 'LMS add-on', 'AIMAN add-on'],
    pages.filter((p) => p.surface === 'HQ tenant' || p.surface === 'Publik karir').map((p) => {
      const f = p.feature;
      const inPlan = (plan) => (PLANS[plan].includes(f) ? 'Ya' : 'Tidak');
      return [
        p.route, p.title, p.featureLabel,
        inPlan('trial'), inPlan('starter'), inPlan('growth'), inPlan('enterprise'),
        f === 'lms' ? 'Membuka' : '—',
        f === 'ai' ? 'Membuka' : '—',
      ];
    }),
    [40, 32, 24, 10, 10, 10, 12, 14, 14],
  );

  const pageApiRows = [];
  for (const p of pages) {
    if (!p.apis.length) continue;
    for (const api of p.apis) {
      pageApiRows.push([p.surface, p.route, p.title, api]);
    }
  }
  addSheet(
    wb,
    '13_Halaman_x_API',
    ['Permukaan', 'Route halaman', 'Nama', 'Endpoint dipanggil'],
    pageApiRows,
    [16, 40, 32, 52],
  );

  addSheet(
    wb,
    '14_Admin_Total',
    ['Grup nav', 'Nama', 'Route', 'Fungsi'],
    [
      ...opsNav.map((o) => [o.section, o.label, o.href, o.hint]),
      ['Admin', 'Login ops', '/platform/login', 'Auth host Admin Total'],
      ['Admin', 'Detail tenant', '/platform/tenants/[id]', 'Lifecycle klien'],
    ],
    [14, 24, 36, 36],
  );

  await fs.promises.mkdir(path.dirname(OUT), { recursive: true });
  await wb.xlsx.writeFile(OUT);
  return { sheets: wb.worksheets.length, pages: pages.length, apis: apis.length, components: components.length, backend: backend.length, forms: forms.length };
}

async function main() {
  const data = collect();
  const stats = await writeExcel(data);
  const st = fs.statSync(OUT);
  console.log(JSON.stringify({
    out: path.relative(ROOT, OUT),
    cutoff: CUTOFF,
    bytes: st.size,
    ...stats,
    sidebar: data.sidebarItems.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
