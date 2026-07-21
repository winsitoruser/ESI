/**
 * Humanify Support Tickets + Knowledge Base store
 * Runtime schema bootstrap (CREATE TABLE IF NOT EXISTS) — matches HRIS pattern.
 */
let ensured = false;

let sequelize: any;
try {
  sequelize = require('../sequelize');
} catch {
  sequelize = null;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory =
  | 'bug'
  | 'billing'
  | 'payroll'
  | 'attendance'
  | 'access'
  | 'feature_request'
  | 'other';

export async function ensureSupportTables(): Promise<boolean> {
  if (!sequelize) return false;
  if (ensured) return true;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS humanify_support_tickets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      ticket_number VARCHAR(32) NOT NULL,
      subject VARCHAR(300) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(40) DEFAULT 'other',
      priority VARCHAR(20) DEFAULT 'normal',
      status VARCHAR(30) DEFAULT 'open',
      requester_name VARCHAR(200),
      requester_email VARCHAR(200),
      requester_user_id VARCHAR(100),
      assigned_to VARCHAR(200),
      resolution_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_support_ticket_number
      ON humanify_support_tickets (ticket_number)
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_hf_support_tickets_tenant
      ON humanify_support_tickets (tenant_id, created_at DESC)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS humanify_support_comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ticket_id UUID NOT NULL REFERENCES humanify_support_tickets(id) ON DELETE CASCADE,
      tenant_id UUID,
      author_name VARCHAR(200),
      author_email VARCHAR(200),
      body TEXT NOT NULL,
      is_staff BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS humanify_kb_articles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      slug VARCHAR(200) NOT NULL,
      title VARCHAR(300) NOT NULL,
      summary TEXT,
      content TEXT NOT NULL,
      category VARCHAR(60) DEFAULT 'umum',
      tags JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'published',
      is_platform BOOLEAN DEFAULT true,
      view_count INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_by VARCHAR(200),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  try {
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_hf_kb_slug_tenant
        ON humanify_kb_articles ((COALESCE(tenant_id::text, 'platform')), slug)
    `);
  } catch (e: any) {
    console.warn('[support-store] kb unique index:', e?.message || e);
  }

  ensured = true;
  await seedDefaultKbIfEmpty();
  return true;
}

const DEFAULT_KB: Array<{
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  sort_order: number;
}> = [
  {
    slug: 'mulai-cepat-humanify',
    title: 'Mulai Cepat Humanify',
    summary: 'Langkah awal setup tenant: karyawan, absensi, payroll.',
    category: 'getting_started',
    sort_order: 1,
    content: `## Mulai Cepat

1. **Struktur organisasi** — buat unit & golongan di menu Struktur Organisasi.
2. **Database karyawan** — tambah karyawan atau impor CSV.
3. **Absensi** — atur shift & geofence di Pengaturan Absensi.
4. **Payroll** — isi komponen gaji lalu jalankan proses di Proses Gaji.
5. **Portal karyawan** — undang user ESS dari Tim & Undangan.

Butuh bantuan? Buka **Tiket Support** dan kirim pengaduan ke tim Humanify.`,
  },
  {
    slug: 'cara-ajukan-tiket-support',
    title: 'Cara Mengajukan Tiket Support',
    summary: 'Bagaimana melaporkan bug, billing, atau permintaan fitur.',
    category: 'support',
    sort_order: 2,
    content: `## Mengajukan Tiket

1. Buka menu **Bantuan → Tiket Support**.
2. Klik **Buat Tiket**, isi subjek, kategori, prioritas, dan deskripsi.
3. Lampirkan langkah reproduksi (untuk bug) atau nomor invoice (untuk billing).
4. Tim Humanify akan merespons di thread komentar tiket.

Status tiket: *Open* → *In Progress* → *Waiting* → *Resolved* → *Closed*.`,
  },
  {
    slug: 'impor-karyawan-csv',
    title: 'Impor Karyawan via CSV',
    summary: 'Format kolom dan tips menghindari error unik email/kode.',
    category: 'karyawan',
    sort_order: 3,
    content: `## Impor Karyawan

Gunakan halaman **Impor Karyawan**. Kolom penting: nama, email, departemen, jabatan, tanggal bergabung.

- Email harus unik per tenant.
- Kode karyawan digenerate otomatis jika kosong.
- Validasi baris gagal tidak menghentikan baris lain.`,
  },
  {
    slug: 'payroll-dan-slip-gaji',
    title: 'Payroll & Slip Gaji',
    summary: 'Alur generate → approve → paid dan akses slip.',
    category: 'payroll',
    sort_order: 4,
    content: `## Payroll

1. Pastikan data gaji karyawan lengkap.
2. Buat run di **Proses Gaji**, hitung, lalu approve.
3. Tandai **paid** setelah transfer.
4. Karyawan melihat slip di Portal ESS / Slip Gaji.

THR, BPJS, lembur, kasbon, dan pinjaman ada di submenu Payroll.`,
  },
  {
    slug: 'absensi-dan-cuti',
    title: 'Absensi & Cuti',
    summary: 'Shift, perangkat, pengajuan cuti, dan persetujuan.',
    category: 'kehadiran',
    sort_order: 5,
    content: `## Absensi & Cuti

- Atur shift & geofence di **Jadwal & Shift** / **Pengaturan Absensi**.
- Rekap harian di **Rekap Harian**.
- Cuti diajukan dari Portal Karyawan atau Manajemen Cuti (HR).
- Persetujuan mengikuti alur approval yang dikonfigurasi.`,
  },
  {
    slug: 'keamanan-dan-sso',
    title: 'Keamanan (2FA) & SSO',
    summary: 'Aktifkan MFA dan SAML untuk enterprise.',
    category: 'keamanan',
    sort_order: 6,
    content: `## Keamanan

- Aktifkan 2FA di **Keamanan (2FA)**.
- SSO SAML dikonfigurasi di **SSO (SAML)** (rencana Enterprise).
- Role & akses diatur di **Role & Akses**.`,
  },
];

async function seedDefaultKbIfEmpty() {
  const [rows]: any = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM humanify_kb_articles WHERE is_platform = true AND tenant_id IS NULL`,
  );
  if ((rows?.[0]?.cnt || 0) > 0) return;
  for (const a of DEFAULT_KB) {
    await sequelize.query(
      `INSERT INTO humanify_kb_articles
        (tenant_id, slug, title, summary, content, category, tags, status, is_platform, sort_order, created_by)
       VALUES (NULL, :slug, :title, :summary, :content, :category, '[]'::jsonb, 'published', true, :sort_order, 'Humanify')`,
      {
        replacements: {
          slug: a.slug,
          title: a.title,
          summary: a.summary,
          content: a.content,
          category: a.category,
          sort_order: a.sort_order,
        },
      },
    );
  }
}

function nextTicketNumber() {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HF-${y}${m}-${r}`;
}

export async function listTickets(opts: {
  tenantId: string | null;
  status?: string;
  category?: string;
  q?: string;
}) {
  await ensureSupportTables();
  if (!opts.tenantId) return [];
  const where = ['tenant_id = :tid'];
  const replacements: any = { tid: opts.tenantId };
  if (opts.status && opts.status !== 'all') {
    where.push('status = :status');
    replacements.status = opts.status;
  }
  if (opts.category && opts.category !== 'all') {
    where.push('category = :category');
    replacements.category = opts.category;
  }
  if (opts.q?.trim()) {
    where.push('(subject ILIKE :q OR description ILIKE :q OR ticket_number ILIKE :q)');
    replacements.q = `%${opts.q.trim()}%`;
  }
  const [rows] = await sequelize.query(
    `SELECT t.*,
       (SELECT COUNT(*)::int FROM humanify_support_comments c WHERE c.ticket_id = t.id) AS comment_count
     FROM humanify_support_tickets t
     WHERE ${where.join(' AND ')}
     ORDER BY
       CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
       t.created_at DESC
     LIMIT 200`,
    { replacements },
  );
  return rows || [];
}

export async function getTicket(id: string, tenantId: string | null) {
  await ensureSupportTables();
  if (!tenantId) return null;
  const [rows]: any = await sequelize.query(
    `SELECT * FROM humanify_support_tickets WHERE id = :id AND tenant_id = :tid LIMIT 1`,
    { replacements: { id, tid: tenantId } },
  );
  return rows?.[0] || null;
}

export async function createTicket(input: {
  tenantId: string;
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  requesterName?: string;
  requesterEmail?: string;
  requesterUserId?: string;
}) {
  await ensureSupportTables();
  const ticketNumber = nextTicketNumber();
  const [rows]: any = await sequelize.query(
    `INSERT INTO humanify_support_tickets
      (tenant_id, ticket_number, subject, description, category, priority,
       requester_name, requester_email, requester_user_id, status)
     VALUES
      (:tid, :num, :subject, :description, :category, :priority,
       :name, :email, :uid, 'open')
     RETURNING *`,
    {
      replacements: {
        tid: input.tenantId,
        num: ticketNumber,
        subject: input.subject.trim(),
        description: input.description.trim(),
        category: input.category || 'other',
        priority: input.priority || 'normal',
        name: input.requesterName || null,
        email: input.requesterEmail || null,
        uid: input.requesterUserId || null,
      },
    },
  );
  return rows?.[0] || null;
}

export async function updateTicket(
  id: string,
  tenantId: string,
  patch: Partial<{
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    subject: string;
    description: string;
    assigned_to: string;
    resolution_note: string;
  }>,
) {
  await ensureSupportTables();
  const sets: string[] = ['updated_at = NOW()'];
  const replacements: any = { id, tid: tenantId };
  const map: Record<string, string> = {
    status: 'status',
    priority: 'priority',
    category: 'category',
    subject: 'subject',
    description: 'description',
    assigned_to: 'assigned_to',
    resolution_note: 'resolution_note',
  };
  for (const [k, col] of Object.entries(map)) {
    if ((patch as any)[k] !== undefined) {
      sets.push(`${col} = :${k}`);
      replacements[k] = (patch as any)[k];
    }
  }
  if (patch.status === 'resolved' || patch.status === 'closed') {
    sets.push('resolved_at = COALESCE(resolved_at, NOW())');
  }
  const [rows]: any = await sequelize.query(
    `UPDATE humanify_support_tickets SET ${sets.join(', ')}
     WHERE id = :id AND tenant_id = :tid
     RETURNING *`,
    { replacements },
  );
  return rows?.[0] || null;
}

export async function listComments(ticketId: string, tenantId: string) {
  await ensureSupportTables();
  const [rows] = await sequelize.query(
    `SELECT * FROM humanify_support_comments
     WHERE ticket_id = :ticketId AND tenant_id = :tid
     ORDER BY created_at ASC`,
    { replacements: { ticketId, tid: tenantId } },
  );
  return rows || [];
}

export async function addComment(input: {
  ticketId: string;
  tenantId: string;
  body: string;
  authorName?: string;
  authorEmail?: string;
  isStaff?: boolean;
}) {
  await ensureSupportTables();
  const [rows]: any = await sequelize.query(
    `INSERT INTO humanify_support_comments
      (ticket_id, tenant_id, author_name, author_email, body, is_staff)
     VALUES (:ticketId, :tid, :name, :email, :body, :staff)
     RETURNING *`,
    {
      replacements: {
        ticketId: input.ticketId,
        tid: input.tenantId,
        name: input.authorName || null,
        email: input.authorEmail || null,
        body: input.body.trim(),
        staff: Boolean(input.isStaff),
      },
    },
  );
  await sequelize.query(
    `UPDATE humanify_support_tickets SET updated_at = NOW()
     WHERE id = :id AND tenant_id = :tid`,
    { replacements: { id: input.ticketId, tid: input.tenantId } },
  );
  return rows?.[0] || null;
}

export async function ticketSummary(tenantId: string | null) {
  await ensureSupportTables();
  if (!tenantId) {
    return { total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 };
  }
  const [rows]: any = await sequelize.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status IN ('resolved','closed'))::int AS resolved,
       COUNT(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved','closed'))::int AS urgent
     FROM humanify_support_tickets WHERE tenant_id = :tid`,
    { replacements: { tid: tenantId } },
  );
  return rows?.[0] || { total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 };
}

export async function listKbArticles(opts: {
  tenantId: string | null;
  category?: string;
  q?: string;
  includeDrafts?: boolean;
}) {
  await ensureSupportTables();
  const where = [
    `((is_platform = true AND tenant_id IS NULL) OR tenant_id = :tid)`,
  ];
  const replacements: any = { tid: opts.tenantId || null };
  if (!opts.includeDrafts) {
    where.push(`status = 'published'`);
  }
  if (opts.category && opts.category !== 'all') {
    where.push('category = :category');
    replacements.category = opts.category;
  }
  if (opts.q?.trim()) {
    where.push('(title ILIKE :q OR summary ILIKE :q OR content ILIKE :q)');
    replacements.q = `%${opts.q.trim()}%`;
  }
  const [rows] = await sequelize.query(
    `SELECT id, tenant_id, slug, title, summary, category, tags, status, is_platform,
            view_count, sort_order, created_by, created_at, updated_at
     FROM humanify_kb_articles
     WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, title ASC
     LIMIT 200`,
    { replacements },
  );
  return rows || [];
}

export async function getKbArticle(slugOrId: string, tenantId: string | null) {
  await ensureSupportTables();
  const [rows]: any = await sequelize.query(
    `SELECT * FROM humanify_kb_articles
     WHERE (slug = :key OR id::text = :key)
       AND ( (is_platform = true AND tenant_id IS NULL) OR tenant_id = :tid )
     LIMIT 1`,
    { replacements: { key: slugOrId, tid: tenantId } },
  );
  const article = rows?.[0] || null;
  if (article) {
    await sequelize.query(
      `UPDATE humanify_kb_articles SET view_count = COALESCE(view_count,0) + 1 WHERE id = :id`,
      { replacements: { id: article.id } },
    );
    article.view_count = Number(article.view_count || 0) + 1;
  }
  return article;
}

export async function upsertKbArticle(input: {
  id?: string;
  tenantId: string | null;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  category?: string;
  status?: string;
  isPlatform?: boolean;
  sortOrder?: number;
  createdBy?: string;
}) {
  await ensureSupportTables();
  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (input.id) {
    const [rows]: any = await sequelize.query(
      `UPDATE humanify_kb_articles SET
         slug = :slug, title = :title, summary = :summary, content = :content,
         category = :category, status = :status, sort_order = :sort_order, updated_at = NOW()
       WHERE id = :id AND (tenant_id = :tid OR (:tid IS NULL AND tenant_id IS NULL))
       RETURNING *`,
      {
        replacements: {
          id: input.id,
          tid: input.tenantId,
          slug,
          title: input.title.trim(),
          summary: input.summary || null,
          content: input.content,
          category: input.category || 'umum',
          status: input.status || 'published',
          sort_order: input.sortOrder ?? 0,
        },
      },
    );
    return rows?.[0] || null;
  }
  const [rows]: any = await sequelize.query(
    `INSERT INTO humanify_kb_articles
      (tenant_id, slug, title, summary, content, category, status, is_platform, sort_order, created_by)
     VALUES (:tid, :slug, :title, :summary, :content, :category, :status, :platform, :sort_order, :created_by)
     RETURNING *`,
    {
      replacements: {
        tid: input.isPlatform ? null : input.tenantId,
        slug,
        title: input.title.trim(),
        summary: input.summary || null,
        content: input.content,
        category: input.category || 'umum',
        status: input.status || 'published',
        platform: input.isPlatform !== false,
        sort_order: input.sortOrder ?? 0,
        created_by: input.createdBy || null,
      },
    },
  );
  return rows?.[0] || null;
}

export async function deleteKbArticle(id: string, tenantId: string | null) {
  await ensureSupportTables();
  // Only allow deleting tenant-owned articles (not platform seed)
  const [, meta]: any = await sequelize.query(
    `DELETE FROM humanify_kb_articles
     WHERE id = :id AND tenant_id = :tid AND is_platform = false`,
    { replacements: { id, tid: tenantId } },
  );
  return (meta?.rowCount || 0) > 0;
}
