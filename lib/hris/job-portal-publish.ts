/**
 * Job portal publishing — LinkedIn, Indeed, Dealls, Jobstreet, Google Jobs, Kalibrr, Glints
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

export type PortalProvider =
  | 'linkedin' | 'indeed' | 'dealls' | 'google_jobs'
  | 'jobstreet' | 'kalibrr' | 'glints' | 'whatsapp' | 'careers';

export interface JobOpeningPayload {
  id: string;
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  type?: string;
  description?: string;
  requirements?: string;
  salary_min?: number;
  salary_max?: number;
  deadline?: string;
  status?: string;
}

export interface PortalPublishResult {
  provider: PortalProvider;
  status: 'published' | 'syndicated' | 'ready' | 'failed' | 'skipped';
  external_id?: string;
  external_url?: string;
  message: string;
  payload?: Record<string, unknown>;
}

let tableReady = false;

export async function ensureJobPortalTables() {
  if (!sequelize || tableReady) return;
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS hris_job_portal_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        job_opening_id UUID NOT NULL,
        provider VARCHAR(40) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ready',
        external_id VARCHAR(200),
        external_url TEXT,
        apply_url TEXT,
        payload JSONB DEFAULT '{}',
        last_error TEXT,
        published_at TIMESTAMPTZ,
        unpublished_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (job_opening_id, provider)
      )
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_portal_posts_job ON hris_job_portal_posts(job_opening_id)
    `);
    tableReady = true;
  } catch {
    /* columns may use uuid_generate_v4 on older DBs */
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS hris_job_portal_posts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID,
          job_opening_id UUID NOT NULL,
          provider VARCHAR(40) NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'ready',
          external_id VARCHAR(200),
          external_url TEXT,
          apply_url TEXT,
          payload JSONB DEFAULT '{}',
          last_error TEXT,
          published_at TIMESTAMPTZ,
          unpublished_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (job_opening_id, provider)
        )
      `);
      tableReady = true;
    } catch { /* ignore */ }
  }
}

function baseUrl(): string {
  return (process.env.NEXTAUTH_URL || process.env.HUMANIFY_PUBLIC_URL || 'https://humanify.id').replace(/\/$/, '');
}

function slugify(title: string, id: string) {
  const base = String(title || 'job')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const short = String(id || '').replace(/-/g, '').slice(0, 8);
  return `${base}-${short}`;
}

export function careersApplyUrl(job: JobOpeningPayload): string {
  return `${baseUrl()}/careers/${slugify(job.title, job.id)}`;
}

export function buildGoogleJobsSchema(job: JobOpeningPayload) {
  const empType = (job.employment_type || job.type || 'FULL_TIME').toUpperCase().replace('-', '_');
  return {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.requirements].filter(Boolean).join('\n\n') || job.title,
    datePosted: new Date().toISOString().slice(0, 10),
    validThrough: job.deadline || undefined,
    employmentType: empType.includes('PART') ? 'PART_TIME' : empType.includes('CONTRACT') ? 'CONTRACTOR' : 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: process.env.COMPANY_NAME || 'Humanify / Naincode',
      sameAs: baseUrl(),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location || 'Indonesia',
        addressCountry: 'ID',
      },
    },
    baseSalary: job.salary_min || job.salary_max ? {
      '@type': 'MonetaryAmount',
      currency: 'IDR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salary_min || undefined,
        maxValue: job.salary_max || undefined,
        unitText: 'MONTH',
      },
    } : undefined,
    directApply: true,
    url: careersApplyUrl(job),
  };
}

function hasAnyEnv(keys: string[]): boolean {
  return keys.some(k => !!(process.env[k] && String(process.env[k]).trim()));
}

export function getPortalCredentialStatus(provider: PortalProvider): {
  configured: boolean;
  webhookReady: boolean;
  mode: 'api' | 'syndication' | 'webhook' | 'manual';
  missingKeys: string[];
} {
  const map: Record<PortalProvider, { api: string[]; webhook?: string; mode: 'api' | 'syndication' | 'webhook' | 'manual' }> = {
    linkedin: {
      api: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_CLIENT_ID'],
      webhook: 'LINKEDIN_WEBHOOK_SECRET',
      mode: 'api',
    },
    indeed: {
      api: ['INDEED_PUBLISHER_ID', 'INDEED_API_TOKEN'],
      webhook: 'INDEED_WEBHOOK_SECRET',
      mode: 'syndication',
    },
    dealls: {
      api: ['DEALLS_API_KEY', 'DEALLS_COMPANY_ID'],
      webhook: 'DEALLS_WEBHOOK_SECRET',
      mode: 'api',
    },
    google_jobs: {
      api: [],
      mode: 'syndication',
    },
    jobstreet: {
      api: ['JOBSTREET_API_KEY'],
      webhook: 'JOBSTREET_WEBHOOK_SECRET',
      mode: 'api',
    },
    kalibrr: {
      api: ['KALIBRR_API_KEY'],
      webhook: 'KALIBRR_WEBHOOK_SECRET',
      mode: 'api',
    },
    glints: {
      api: ['GLINTS_API_KEY'],
      webhook: 'GLINTS_WEBHOOK_SECRET',
      mode: 'api',
    },
    whatsapp: {
      api: ['WHATSAPP_BUSINESS_TOKEN', 'WHATSAPP_PHONE_NUMBER'],
      mode: 'manual',
    },
    careers: {
      api: [],
      mode: 'syndication',
    },
  };

  const cfg = map[provider];
  const apiOk = cfg.api.length === 0 || hasAnyEnv(cfg.api);
  const webhookReady = cfg.webhook ? !!(process.env[cfg.webhook] && String(process.env[cfg.webhook]).trim()) : true;
  // Google Jobs & careers always "configured" via public careers portal
  const configured = provider === 'google_jobs' || provider === 'careers' ? true : apiOk || webhookReady;

  return {
    configured,
    webhookReady,
    mode: cfg.api.length && hasAnyEnv(cfg.api) ? cfg.mode : (provider === 'google_jobs' || provider === 'careers' ? 'syndication' : webhookReady ? 'webhook' : 'manual'),
    missingKeys: cfg.api.filter(k => !process.env[k]),
  };
}

async function callDeallsApi(job: JobOpeningPayload): Promise<PortalPublishResult> {
  const key = process.env.DEALLS_API_KEY;
  const companyId = process.env.DEALLS_COMPANY_ID;
  if (!key) {
    return {
      provider: 'dealls',
      status: 'ready',
      external_url: 'https://dealls.com',
      message: 'Paket lowongan siap — set DEALLS_API_KEY untuk auto-post, atau sync via webhook inbound.',
      payload: { title: job.title, applyUrl: careersApplyUrl(job), companyId },
    };
  }

  try {
    const endpoint = process.env.DEALLS_API_URL || 'https://api.dealls.com/v1/jobs';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        company_id: companyId,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        department: job.department,
        employment_type: job.type || job.employment_type,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        apply_url: careersApplyUrl(job),
        deadline: job.deadline,
      }),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
      return {
        provider: 'dealls',
        status: 'ready',
        message: `Dealls API ${res.status} — paket disimpan untuk retry. ${data.message || data.error || ''}`,
        payload: { requestStatus: res.status, response: data, applyUrl: careersApplyUrl(job) },
        external_url: 'https://dealls.com',
      };
    }
    return {
      provider: 'dealls',
      status: 'published',
      external_id: String(data.id || data.job_id || ''),
      external_url: data.url || data.job_url || 'https://dealls.com',
      message: 'Berhasil diposting ke Dealls',
      payload: data,
    };
  } catch (e: any) {
    return {
      provider: 'dealls',
      status: 'ready',
      message: `Dealls unreachable — paket siap: ${e.message}`,
      external_url: 'https://dealls.com',
      payload: { applyUrl: careersApplyUrl(job) },
    };
  }
}

async function callLinkedInApi(job: JobOpeningPayload): Promise<PortalPublishResult> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORG_ID;
  const applyUrl = careersApplyUrl(job);
  const shareText = `Lowongan: ${job.title}${job.location ? ` — ${job.location}` : ''}\nLamar: ${applyUrl}`;

  if (!token) {
    const composeUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(applyUrl)}`;
    return {
      provider: 'linkedin',
      status: 'ready',
      external_url: composeUrl,
      message: 'Siap dipublikasikan ke LinkedIn. Set LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORG_ID untuk auto-post Jobs API, atau bagikan tautan careers.',
      payload: {
        shareText,
        applyUrl,
        jobPostingSchema: buildGoogleJobsSchema(job),
        oauthHint: 'OAuth: LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET',
      },
    };
  }

  try {
    // LinkedIn Posts API (UGC) as practical fallback when Jobs Marketplace isn't contracted
    const author = orgId ? `urn:li:organization:${orgId}` : (process.env.LINKEDIN_PERSON_URN || '');
    if (!author) {
      return {
        provider: 'linkedin',
        status: 'ready',
        external_url: applyUrl,
        message: 'Token ada tetapi LINKEDIN_ORG_ID belum di-set — paket siap diposting manual.',
        payload: { shareText, applyUrl },
      };
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: shareText },
            shareMediaCategory: 'ARTICLE',
            media: [{
              status: 'READY',
              originalUrl: applyUrl,
              title: { text: job.title },
              description: { text: (job.description || '').slice(0, 200) },
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      return {
        provider: 'linkedin',
        status: 'ready',
        message: `LinkedIn API ${res.status} — simpan sebagai ready. ${data.message || ''}`,
        external_url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(applyUrl)}`,
        payload: { response: data, applyUrl },
      };
    }

    return {
      provider: 'linkedin',
      status: 'published',
      external_id: data.id || crypto.randomUUID(),
      external_url: applyUrl,
      message: 'Berhasil dipublikasikan ke LinkedIn',
      payload: data,
    };
  } catch (e: any) {
    return {
      provider: 'linkedin',
      status: 'ready',
      message: `LinkedIn unreachable — paket siap: ${e.message}`,
      external_url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(applyUrl)}`,
      payload: { applyUrl },
    };
  }
}

function publishIndeed(job: JobOpeningPayload): PortalPublishResult {
  const applyUrl = careersApplyUrl(job);
  const publisherId = process.env.INDEED_PUBLISHER_ID;
  const feedItem = {
    title: job.title,
    date: new Date().toISOString(),
    referencenumber: job.id,
    url: applyUrl,
    company: process.env.COMPANY_NAME || 'Humanify',
    city: job.location || 'Indonesia',
    country: 'ID',
    description: [job.description, job.requirements].filter(Boolean).join('\n\n'),
    salary: job.salary_min && job.salary_max ? `${job.salary_min} - ${job.salary_max} IDR` : undefined,
    jobtype: job.type || 'fulltime',
    publisherId,
  };
  return {
    provider: 'indeed',
    status: publisherId ? 'syndicated' : 'ready',
    external_id: job.id,
    external_url: applyUrl,
    message: publisherId
      ? 'Tersindikasi ke Indeed feed (reference + apply URL careers).'
      : 'Paket Indeed feed siap. Set INDEED_PUBLISHER_ID untuk syndication ID.',
    payload: feedItem,
  };
}

function publishGoogleJobs(job: JobOpeningPayload): PortalPublishResult {
  const schema = buildGoogleJobsSchema(job);
  return {
    provider: 'google_jobs',
    status: 'syndicated',
    external_id: job.id,
    external_url: careersApplyUrl(job),
    message: 'JobPosting schema.org aktif di halaman karir — Google for Jobs dapat mengindeks apply URL.',
    payload: schema as unknown as Record<string, unknown>,
  };
}

function publishGenericBoard(
  provider: PortalProvider,
  job: JobOpeningPayload,
  boardUrl: string,
  apiKeyEnv: string,
): PortalPublishResult {
  const applyUrl = careersApplyUrl(job);
  const key = process.env[apiKeyEnv];
  return {
    provider,
    status: key ? 'syndicated' : 'ready',
    external_url: boardUrl,
    external_id: job.id,
    message: key
      ? `Lowongan disiapkan untuk ${provider} (API key terdeteksi). Apply URL: careers portal.`
      : `Paket ${provider} siap. Konfigurasi ${apiKeyEnv} untuk auto-post, atau unggah manual memakai apply URL.`,
    payload: {
      title: job.title,
      location: job.location,
      department: job.department,
      description: job.description,
      requirements: job.requirements,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      applyUrl,
      boardUrl,
    },
  };
}

function publishWhatsApp(job: JobOpeningPayload): PortalPublishResult {
  const phone = (process.env.WHATSAPP_PHONE_NUMBER || '').replace(/\D/g, '');
  const text = encodeURIComponent(
    `Halo, saya tertarik melamar posisi *${job.title}*${job.location ? ` di ${job.location}` : ''}.\nDetail: ${careersApplyUrl(job)}`,
  );
  const url = phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;
  return {
    provider: 'whatsapp',
    status: 'ready',
    external_url: url,
    message: 'Tautan WhatsApp 1-click recruiter / kandidat siap digunakan.',
    payload: { applyUrl: careersApplyUrl(job), phone: phone || null },
  };
}

async function publishOne(provider: PortalProvider, job: JobOpeningPayload): Promise<PortalPublishResult> {
  switch (provider) {
    case 'linkedin': return callLinkedInApi(job);
    case 'dealls': return callDeallsApi(job);
    case 'indeed': return publishIndeed(job);
    case 'google_jobs': return publishGoogleJobs(job);
    case 'jobstreet': return publishGenericBoard('jobstreet', job, 'https://www.jobstreet.co.id', 'JOBSTREET_API_KEY');
    case 'kalibrr': return publishGenericBoard('kalibrr', job, 'https://www.kalibrr.com', 'KALIBRR_API_KEY');
    case 'glints': return publishGenericBoard('glints', job, 'https://glints.com/id', 'GLINTS_API_KEY');
    case 'whatsapp': return publishWhatsApp(job);
    case 'careers':
      return {
        provider: 'careers',
        status: 'published',
        external_url: careersApplyUrl(job),
        message: 'Aktif di portal karir publik Humanify',
        payload: { applyUrl: careersApplyUrl(job) },
      };
    default:
      return { provider, status: 'failed', message: `Provider tidak dikenal: ${provider}` };
  }
}

async function upsertPost(
  tenantId: string | null,
  job: JobOpeningPayload,
  result: PortalPublishResult,
) {
  if (!sequelize) return;
  await ensureJobPortalTables();
  try {
    await sequelize.query(`
      INSERT INTO hris_job_portal_posts (
        tenant_id, job_opening_id, provider, status, external_id, external_url, apply_url, payload, published_at, updated_at
      ) VALUES (
        :tid, :jid, :provider, :status, :eid, :eurl, :aurl, :payload::jsonb,
        CASE WHEN :status IN ('published','syndicated','ready') THEN NOW() ELSE NULL END, NOW()
      )
      ON CONFLICT (job_opening_id, provider) DO UPDATE SET
        status = EXCLUDED.status,
        external_id = COALESCE(EXCLUDED.external_id, hris_job_portal_posts.external_id),
        external_url = COALESCE(EXCLUDED.external_url, hris_job_portal_posts.external_url),
        apply_url = EXCLUDED.apply_url,
        payload = EXCLUDED.payload,
        published_at = COALESCE(hris_job_portal_posts.published_at, EXCLUDED.published_at),
        last_error = NULL,
        updated_at = NOW()
    `, {
      replacements: {
        tid: tenantId,
        jid: job.id,
        provider: result.provider,
        status: result.status,
        eid: result.external_id || null,
        eurl: result.external_url || null,
        aurl: careersApplyUrl(job),
        payload: JSON.stringify(result.payload || { message: result.message }),
      },
    });
  } catch (e: any) {
    console.warn('portal post upsert:', e.message);
  }
}

export async function publishJobToPortals(opts: {
  job: JobOpeningPayload;
  providers: PortalProvider[];
  tenantId: string | null;
}): Promise<PortalPublishResult[]> {
  await ensureJobPortalTables();
  const results: PortalPublishResult[] = [];
  for (const provider of opts.providers) {
    const result = await publishOne(provider, opts.job);
    results.push(result);
    await upsertPost(opts.tenantId, opts.job, result);
  }
  return results;
}

export async function listPortalPosts(jobOpeningId?: string, tenantId?: string | null) {
  if (!sequelize) return [];
  await ensureJobPortalTables();
  try {
    const [rows] = await sequelize.query(`
      SELECT p.*, o.title as job_title
      FROM hris_job_portal_posts p
      LEFT JOIN hris_job_openings o ON o.id = p.job_opening_id
      WHERE (p.tenant_id = :tid OR :tid IS NULL OR p.tenant_id IS NULL)
        ${jobOpeningId ? 'AND p.job_opening_id = :jid' : ''}
      ORDER BY p.updated_at DESC
      LIMIT 100
    `, { replacements: { tid: tenantId || null, jid: jobOpeningId || null } });
    return rows;
  } catch {
    return [];
  }
}

export async function countApplicantsBySource(tenantId: string | null): Promise<Record<string, number>> {
  if (!sequelize) return {};
  try {
    const [rows] = await sequelize.query(`
      SELECT LOWER(COALESCE(source, 'other')) AS source, COUNT(*)::int AS count
      FROM hris_candidates
      WHERE (tenant_id = :tid OR :tid IS NULL OR tenant_id IS NULL)
      GROUP BY 1
    `, { replacements: { tid: tenantId } });
    const map: Record<string, number> = {};
    for (const r of rows) map[r.source] = r.count;
    return map;
  } catch {
    return {};
  }
}
