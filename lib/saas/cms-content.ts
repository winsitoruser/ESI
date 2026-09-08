/**
 * Admin Total CMS — FAQ with publish workflow (spec §13).
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const FAQ_STATUSES = ['draft', 'review', 'approved', 'published'] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];

export type CmsFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: FaqStatus;
  createdAt: string;
  publishedAt: string | null;
};

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

function pickStatus(raw: unknown): FaqStatus {
  const v = String(raw || 'draft').toLowerCase();
  return (FAQ_STATUSES as readonly string[]).includes(v) ? (v as FaqStatus) : 'draft';
}

/** Advance one step in Draft → Review → Approve → Publish. */
export function nextFaqStatus(current: FaqStatus): FaqStatus | null {
  if (current === 'draft') return 'review';
  if (current === 'review') return 'approved';
  if (current === 'approved') return 'published';
  return null;
}

export async function ensureCmsFaqsTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_cms_faqs (
      id UUID PRIMARY KEY,
      question VARCHAR(280) NOT NULL,
      answer TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'umum',
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_cms_faqs_status
    ON saas_cms_faqs (status, sort_order, created_at DESC)
  `);
  ready = true;
}

function mapRow(r: any): CmsFaq {
  return {
    id: String(r.id),
    question: r.question || '',
    answer: r.answer || '',
    category: r.category || 'umum',
    sortOrder: Number(r.sort_order || 0),
    status: pickStatus(r.status),
    createdAt: r.created_at,
    publishedAt: r.published_at || null,
  };
}

export async function listCmsFaqs(): Promise<{ faqs: CmsFaq[] }> {
  if (!sequelize) return { faqs: [] };
  await ensureCmsFaqsTable();
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_cms_faqs ORDER BY sort_order ASC, created_at DESC LIMIT 200`,
  );
  return { faqs: (rows || []).map(mapRow) };
}

export async function listPublishedFaqs(): Promise<PublicFaq[]> {
  if (!sequelize) return [];
  await ensureCmsFaqsTable();
  const [rows] = await sequelize.query(`
    SELECT id, question, answer, category
    FROM saas_cms_faqs
    WHERE status = 'published'
    ORDER BY sort_order ASC, published_at DESC NULLS LAST
    LIMIT 24
  `);
  return (rows || []).map((r: any) => ({
    id: String(r.id),
    question: r.question || '',
    answer: r.answer || '',
    category: r.category || 'umum',
  }));
}

export async function upsertCmsFaq(input: {
  id?: string;
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<CmsFaq> {
  if (!sequelize) throw new Error('Database unavailable');
  const question = String(input.question || '').trim().slice(0, 280);
  const answer = String(input.answer || '').trim().slice(0, 8000);
  if (!question || !answer) throw new Error('Pertanyaan dan jawaban wajib');
  await ensureCmsFaqsTable();
  const id = String(input.id || '').trim() || randomUUID();
  await sequelize.query(`
    INSERT INTO saas_cms_faqs (id, question, answer, category, sort_order, created_by)
    VALUES (:id, :q, :a, :cat, :sort, :by)
    ON CONFLICT (id) DO UPDATE SET
      question = EXCLUDED.question,
      answer = EXCLUDED.answer,
      category = EXCLUDED.category,
      sort_order = EXCLUDED.sort_order,
      updated_at = NOW()
  `, {
    replacements: {
      id,
      q: question,
      a: answer,
      cat: String(input.category || 'umum').trim().slice(0, 80) || 'umum',
      sort: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
      by: input.actorEmail || null,
    },
  });
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: input.id ? 'cms.faq_update' : 'cms.faq_create',
    resourceType: 'faq',
    resourceId: id,
    ip: input.ip,
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_cms_faqs WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function advanceCmsFaq(input: {
  id: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<CmsFaq | null> {
  if (!sequelize) throw new Error('Database unavailable');
  const id = String(input.id || '').trim();
  await ensureCmsFaqsTable();
  const [cur] = await sequelize.query(`SELECT * FROM saas_cms_faqs WHERE id = :id`, { replacements: { id } });
  if (!cur?.[0]) return null;
  const next = nextFaqStatus(pickStatus(cur[0].status));
  if (!next) throw new Error('FAQ sudah terbit');
  const published = next === 'published' ? ', published_at = NOW()' : '';
  const [rows] = await sequelize.query(
    `UPDATE saas_cms_faqs SET status = :next, updated_at = NOW() ${published} WHERE id = :id RETURNING *`,
    { replacements: { id, next } },
  );
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: 'cms.faq_advance',
    resourceType: 'faq',
    resourceId: id,
    ip: input.ip,
    meta: { status: next },
  });
  return rows?.[0] ? mapRow(rows[0]) : null;
}

export async function unpublishCmsFaq(id: string): Promise<CmsFaq | null> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureCmsFaqsTable();
  const [rows] = await sequelize.query(
    `UPDATE saas_cms_faqs SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = :id RETURNING *`,
    { replacements: { id } },
  );
  return rows?.[0] ? mapRow(rows[0]) : null;
}
