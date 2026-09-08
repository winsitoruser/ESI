/**
 * Admin Total CMS — blog / articles (spec §13).
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';
import { nextFaqStatus, type FaqStatus } from '@/lib/saas/cms-content';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export type CmsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: FaqStatus;
  createdAt: string;
  publishedAt: string | null;
};

export type PublicArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body?: string;
  publishedAt: string | null;
};

export function slugifyArticle(raw: string): string {
  const s = String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || `artikel-${Date.now().toString(36)}`;
}

export async function ensureCmsArticlesTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_cms_articles (
      id UUID PRIMARY KEY,
      slug VARCHAR(80) NOT NULL UNIQUE,
      title VARCHAR(200) NOT NULL,
      excerpt TEXT,
      body TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    )
  `);
  ready = true;
}

function pickStatus(raw: unknown): FaqStatus {
  const v = String(raw || 'draft').toLowerCase();
  return (['draft', 'review', 'approved', 'published'] as const).includes(v as FaqStatus)
    ? (v as FaqStatus)
    : 'draft';
}

function mapRow(r: any): CmsArticle {
  return {
    id: String(r.id),
    slug: r.slug || '',
    title: r.title || '',
    excerpt: r.excerpt || null,
    body: r.body || '',
    status: pickStatus(r.status),
    createdAt: r.created_at,
    publishedAt: r.published_at || null,
  };
}

export async function listCmsArticles(): Promise<{ articles: CmsArticle[] }> {
  if (!sequelize) return { articles: [] };
  await ensureCmsArticlesTable();
  const [rows] = await sequelize.query(
    `SELECT * FROM saas_cms_articles ORDER BY created_at DESC LIMIT 100`,
  );
  return { articles: (rows || []).map(mapRow) };
}

export async function listPublishedArticles(limit = 12): Promise<PublicArticle[]> {
  if (!sequelize) return [];
  await ensureCmsArticlesTable();
  const lim = Math.min(50, Math.max(1, limit));
  const [rows] = await sequelize.query(`
    SELECT id, slug, title, excerpt, published_at
    FROM saas_cms_articles
    WHERE status = 'published'
    ORDER BY published_at DESC NULLS LAST
    LIMIT :lim
  `, { replacements: { lim } });
  return (rows || []).map((r: any) => ({
    id: String(r.id),
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt || null,
    publishedAt: r.published_at || null,
  }));
}

export async function getPublishedArticle(slug: string): Promise<PublicArticle | null> {
  if (!sequelize) return null;
  await ensureCmsArticlesTable();
  const [rows] = await sequelize.query(`
    SELECT id, slug, title, excerpt, body, published_at
    FROM saas_cms_articles
    WHERE slug = :slug AND status = 'published'
    LIMIT 1
  `, { replacements: { slug: String(slug || '').slice(0, 80) } });
  if (!rows?.[0]) return null;
  const r = rows[0];
  return {
    id: String(r.id),
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt || null,
    body: r.body || '',
    publishedAt: r.published_at || null,
  };
}

export async function upsertCmsArticle(input: {
  id?: string;
  title: string;
  body: string;
  excerpt?: string | null;
  slug?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<CmsArticle> {
  if (!sequelize) throw new Error('Database unavailable');
  const title = String(input.title || '').trim().slice(0, 200);
  const body = String(input.body || '').trim().slice(0, 20000);
  if (!title || !body) throw new Error('Judul dan isi wajib');
  await ensureCmsArticlesTable();
  const id = String(input.id || '').trim() || randomUUID();
  const slug = slugifyArticle(input.slug || title);
  await sequelize.query(`
    INSERT INTO saas_cms_articles (id, slug, title, excerpt, body, created_by)
    VALUES (:id, :slug, :title, :excerpt, :body, :by)
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      title = EXCLUDED.title,
      excerpt = EXCLUDED.excerpt,
      body = EXCLUDED.body,
      updated_at = NOW()
  `, {
    replacements: {
      id,
      slug,
      title,
      excerpt: String(input.excerpt || '').trim().slice(0, 400) || null,
      body,
      by: input.actorEmail || null,
    },
  });
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: input.id ? 'cms.article_update' : 'cms.article_create',
    resourceType: 'article',
    resourceId: id,
    ip: input.ip,
    meta: { slug },
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_cms_articles WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function advanceCmsArticle(input: {
  id: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<CmsArticle | null> {
  if (!sequelize) throw new Error('Database unavailable');
  const id = String(input.id || '').trim();
  await ensureCmsArticlesTable();
  const [cur] = await sequelize.query(`SELECT * FROM saas_cms_articles WHERE id = :id`, { replacements: { id } });
  if (!cur?.[0]) return null;
  const next = nextFaqStatus(pickStatus(cur[0].status));
  if (!next) throw new Error('Artikel sudah terbit');
  const published = next === 'published' ? ', published_at = NOW()' : '';
  const [rows] = await sequelize.query(
    `UPDATE saas_cms_articles SET status = :next, updated_at = NOW() ${published} WHERE id = :id RETURNING *`,
    { replacements: { id, next } },
  );
  await logAdminAction({
    actorEmail: input.actorEmail,
    actorUserId: input.actorUserId,
    action: 'cms.article_advance',
    resourceType: 'article',
    resourceId: id,
    ip: input.ip,
    meta: { status: next },
  });
  return rows?.[0] ? mapRow(rows[0]) : null;
}

export async function unpublishCmsArticle(id: string): Promise<CmsArticle | null> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureCmsArticlesTable();
  const [rows] = await sequelize.query(
    `UPDATE saas_cms_articles SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = :id RETURNING *`,
    { replacements: { id } },
  );
  return rows?.[0] ? mapRow(rows[0]) : null;
}
