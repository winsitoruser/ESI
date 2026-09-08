/**
 * Platform-wide marketing banners (Admin Total CMS).
 * Shown as carousels on the public landing page and HR dashboard.
 */
import { randomUUID } from 'crypto';
import { logAdminAction } from '@/lib/saas/admin-audit';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export const BANNER_PLACEMENTS = ['landing', 'dashboard', 'both'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export type LandingBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  cta_href: string | null;
  placement: BannerPlacement;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
};

const ALLOWED_CTA_HOSTS = new Set([
  'humanify.id',
  'www.humanify.id',
  'admin.humanify.id',
  'ops.humanify.id',
  'naincode.com',
  'www.naincode.com',
]);

export function sanitizeBannerHref(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) {
    if (value.includes('://') || value.toLowerCase().startsWith('/javascript')) return null;
    return value.slice(0, 500);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_CTA_HOSTS.has(host)) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function sanitizeBannerImageUrl(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value.startsWith('/uploads/marketing/') || value.startsWith('/images/')) {
    if (value.includes('://') || value.includes('..')) return null;
    return value.slice(0, 500);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_CTA_HOSTS.has(host)) return null;
    if (!url.pathname.startsWith('/uploads/marketing/') && !url.pathname.startsWith('/images/')) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function normalizePlacement(raw: string | null | undefined): BannerPlacement {
  const v = String(raw || 'both').toLowerCase();
  if (v === 'landing' || v === 'dashboard' || v === 'both') return v;
  return 'both';
}

export async function ensureLandingBannersTable() {
  if (!sequelize || ready) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS saas_landing_banners (
      id UUID PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      subtitle TEXT,
      image_url TEXT NOT NULL,
      cta_label VARCHAR(80),
      cta_href VARCHAR(500),
      placement VARCHAR(20) NOT NULL DEFAULT 'both',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      created_by VARCHAR(160),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_saas_landing_banners_live
    ON saas_landing_banners (is_active, placement, sort_order)
  `);
  ready = true;
}

function mapRow(r: any): LandingBanner {
  return {
    id: String(r.id),
    title: r.title || '',
    subtitle: r.subtitle || null,
    image_url: r.image_url || '',
    cta_label: r.cta_label || null,
    cta_href: r.cta_href || null,
    placement: normalizePlacement(r.placement),
    sort_order: Number(r.sort_order || 0),
    is_active: r.is_active !== false,
    starts_at: r.starts_at || null,
    ends_at: r.ends_at || null,
    created_by: r.created_by || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function toPublicBanner(row: LandingBanner): PublicBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
  };
}

export async function listLandingBanners(): Promise<LandingBanner[]> {
  if (!sequelize) return [];
  await ensureLandingBannersTable();
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_landing_banners
    ORDER BY sort_order ASC, created_at DESC
    LIMIT 40
  `);
  return (rows || []).map(mapRow);
}

export async function listPublicBanners(placement: 'landing' | 'dashboard'): Promise<PublicBanner[]> {
  if (!sequelize) return [];
  await ensureLandingBannersTable();
  const [rows] = await sequelize.query(`
    SELECT * FROM saas_landing_banners
    WHERE is_active = true
      AND placement IN (:placement, 'both')
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
    ORDER BY sort_order ASC, created_at DESC
    LIMIT 7
  `, { replacements: { placement } });
  return (rows || []).map(mapRow).map(toPublicBanner);
}

export async function createLandingBanner(input: {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  placement?: string;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdBy?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<LandingBanner> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureLandingBannersTable();
  const title = String(input.title || '').trim().slice(0, 160);
  if (!title) throw new Error('Judul wajib diisi');
  const imageUrl = sanitizeBannerImageUrl(input.imageUrl);
  if (!imageUrl) throw new Error('URL gambar tidak valid — unggah file atau pakai /uploads/marketing/…');
  const id = randomUUID();
  await sequelize.query(`
    INSERT INTO saas_landing_banners
      (id, title, subtitle, image_url, cta_label, cta_href, placement, sort_order, is_active, starts_at, ends_at, created_by)
    VALUES
      (:id, :title, :subtitle, :image, :ctaLabel, :ctaHref, :placement, :sort, :active, :starts, :ends, :by)
  `, {
    replacements: {
      id,
      title,
      subtitle: String(input.subtitle || '').trim().slice(0, 400) || null,
      image: imageUrl,
      ctaLabel: String(input.ctaLabel || '').trim().slice(0, 80) || null,
      ctaHref: sanitizeBannerHref(input.ctaHref),
      placement: normalizePlacement(input.placement),
      sort: Math.max(0, Math.min(99, Number(input.sortOrder || 0) || 0)),
      active: input.isActive !== false,
      starts: input.startsAt || null,
      ends: input.endsAt || null,
      by: input.createdBy || null,
    },
  });
  await logAdminAction({
    actorUserId: input.actorUserId || null,
    actorEmail: input.createdBy || null,
    action: 'banner.create',
    resourceType: 'banner',
    resourceId: id,
    meta: { title, placement: normalizePlacement(input.placement) },
    ip: input.ip || null,
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_landing_banners WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function updateLandingBanner(input: {
  id: string;
  title?: string;
  subtitle?: string | null;
  imageUrl?: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  placement?: string;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<LandingBanner> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureLandingBannersTable();
  const id = String(input.id || '').trim();
  if (!id) throw new Error('id required');
  const [existing] = await sequelize.query(
    `SELECT * FROM saas_landing_banners WHERE id = :id LIMIT 1`,
    { replacements: { id } },
  );
  if (!existing?.length) throw new Error('Banner tidak ditemukan');

  const nextTitle = input.title != null ? String(input.title).trim().slice(0, 160) : existing[0].title;
  if (!nextTitle) throw new Error('Judul wajib diisi');
  const nextImage = input.imageUrl != null
    ? sanitizeBannerImageUrl(input.imageUrl)
    : existing[0].image_url;
  if (!nextImage) throw new Error('URL gambar tidak valid');

  await sequelize.query(`
    UPDATE saas_landing_banners SET
      title = :title,
      subtitle = :subtitle,
      image_url = :image,
      cta_label = :ctaLabel,
      cta_href = :ctaHref,
      placement = :placement,
      sort_order = :sort,
      is_active = :active,
      starts_at = :starts,
      ends_at = :ends,
      updated_at = NOW()
    WHERE id = :id
  `, {
    replacements: {
      id,
      title: nextTitle,
      subtitle: input.subtitle !== undefined
        ? (String(input.subtitle || '').trim().slice(0, 400) || null)
        : existing[0].subtitle,
      image: nextImage,
      ctaLabel: input.ctaLabel !== undefined
        ? (String(input.ctaLabel || '').trim().slice(0, 80) || null)
        : existing[0].cta_label,
      ctaHref: input.ctaHref !== undefined
        ? sanitizeBannerHref(input.ctaHref)
        : existing[0].cta_href,
      placement: input.placement != null ? normalizePlacement(input.placement) : existing[0].placement,
      sort: input.sortOrder != null
        ? Math.max(0, Math.min(99, Number(input.sortOrder) || 0))
        : existing[0].sort_order,
      active: input.isActive != null ? Boolean(input.isActive) : existing[0].is_active,
      starts: input.startsAt !== undefined ? (input.startsAt || null) : existing[0].starts_at,
      ends: input.endsAt !== undefined ? (input.endsAt || null) : existing[0].ends_at,
    },
  });
  await logAdminAction({
    actorUserId: input.actorUserId || null,
    actorEmail: input.actorEmail || null,
    action: 'banner.update',
    resourceType: 'banner',
    resourceId: id,
    meta: { title: nextTitle },
    ip: input.ip || null,
  });
  const [rows] = await sequelize.query(`SELECT * FROM saas_landing_banners WHERE id = :id`, { replacements: { id } });
  return mapRow(rows[0]);
}

export async function deleteLandingBanner(opts: {
  id: string;
  actorEmail?: string | null;
  actorUserId?: string | null;
  ip?: string | null;
}): Promise<void> {
  if (!sequelize) throw new Error('Database unavailable');
  await ensureLandingBannersTable();
  const id = String(opts.id || '').trim();
  if (!id) throw new Error('id required');
  const [existing] = await sequelize.query(
    `SELECT title FROM saas_landing_banners WHERE id = :id LIMIT 1`,
    { replacements: { id } },
  );
  if (!existing?.length) throw new Error('Banner tidak ditemukan');
  await sequelize.query(`DELETE FROM saas_landing_banners WHERE id = :id`, { replacements: { id } });
  await logAdminAction({
    actorUserId: opts.actorUserId || null,
    actorEmail: opts.actorEmail || null,
    action: 'banner.delete',
    resourceType: 'banner',
    resourceId: id,
    meta: { title: existing[0]?.title },
    ip: opts.ip || null,
  });
}
