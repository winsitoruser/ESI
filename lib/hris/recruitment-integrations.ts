/**
 * Recruitment channel integrations — LinkedIn, Indeed, Dealls, Google Jobs, Jobstreet, Kalibrr, Glints
 */
import {
  countApplicantsBySource,
  getPortalCredentialStatus,
  listPortalPosts,
  type PortalProvider,
} from './job-portal-publish';

export type IntegrationStatus = 'connected' | 'configured' | 'webhook_only' | 'pending' | 'coming_soon';

export interface RecruitmentChannel {
  id: string;
  name: string;
  provider: PortalProvider;
  status: IntegrationStatus;
  description: string;
  features: string[];
  configKeys?: string[];
  webhookSecretKey?: string;
  lastSync?: string | null;
  applicantsSynced?: number;
  mode?: string;
  publishSupported?: boolean;
  brandColor?: string;
  docsUrl?: string;
}

export interface ESignProvider {
  id: string;
  name: string;
  provider: 'privy' | 'peruri' | 'bsre';
  status: IntegrationStatus;
  description: string;
  documentTypes: string[];
}

const CHANNEL_META: Omit<RecruitmentChannel, 'status' | 'lastSync' | 'applicantsSynced' | 'mode'>[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    provider: 'linkedin',
    description: 'Posting lowongan & sinkronisasi kandidat dari LinkedIn (Jobs / share + webhook inbound)',
    features: ['Job posting / share', 'Applicant webhook', 'Apply via careers URL', 'Company page'],
    configKeys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORG_ID'],
    webhookSecretKey: 'LINKEDIN_WEBHOOK_SECRET',
    publishSupported: true,
    brandColor: '#0A66C2',
    docsUrl: 'https://www.linkedin.com/developers/',
  },
  {
    id: 'indeed',
    name: 'Indeed',
    provider: 'indeed',
    description: 'Syndikasi lowongan ke Indeed Indonesia via apply URL & publisher feed',
    features: ['Job syndication', 'Applicant feed webhook', 'Sponsored-ready payload'],
    configKeys: ['INDEED_PUBLISHER_ID', 'INDEED_API_TOKEN'],
    webhookSecretKey: 'INDEED_WEBHOOK_SECRET',
    publishSupported: true,
    brandColor: '#2164F3',
    docsUrl: 'https://docs.indeed.com/',
  },
  {
    id: 'dealls',
    name: 'Dealls',
    provider: 'dealls',
    description: 'Multi-posting Dealls ke beberapa job board sekaligus + sync pelamar',
    features: ['Multi-posting', 'API publish', 'Applicant sync', 'Analytics'],
    configKeys: ['DEALLS_API_KEY', 'DEALLS_COMPANY_ID'],
    webhookSecretKey: 'DEALLS_WEBHOOK_SECRET',
    publishSupported: true,
    brandColor: '#7C3AED',
    docsUrl: 'https://dealls.com',
  },
  {
    id: 'google_jobs',
    name: 'Google for Jobs',
    provider: 'google_jobs',
    description: 'Schema.org JobPosting di portal karir Humanify agar terindeks Google for Jobs',
    features: ['JobPosting JSON-LD', 'SEO', 'Direct apply URL'],
    publishSupported: true,
    brandColor: '#EA4335',
    docsUrl: 'https://developers.google.com/search/docs/appearance/structured-data/job-posting',
  },
  {
    id: 'jobstreet',
    name: 'Jobstreet',
    provider: 'jobstreet',
    description: 'Integrasi Jobstreet by SEEK Indonesia — posting & inbound kandidat',
    features: ['Job posting package', 'Resume inbound webhook', 'Screening questions'],
    configKeys: ['JOBSTREET_API_KEY'],
    webhookSecretKey: 'JOBSTREET_WEBHOOK_SECRET',
    publishSupported: true,
    brandColor: '#1D4ED8',
    docsUrl: 'https://www.jobstreet.co.id',
  },
  {
    id: 'kalibrr',
    name: 'Kalibrr',
    provider: 'kalibrr',
    description: 'Portal rekrutmen Kalibrr — populer untuk hiring tech & profesional',
    features: ['Job package', 'Applicant webhook', 'Career page link'],
    configKeys: ['KALIBRR_API_KEY'],
    webhookSecretKey: 'KALIBRR_WEBHOOK_SECRET',
    publishSupported: true,
    brandColor: '#F59E0B',
    docsUrl: 'https://www.kalibrr.com',
  },
  {
    id: 'glints',
    name: 'Glints',
    provider: 'glints',
    description: 'Glints — job board & talent matching untuk talenta muda/profesional',
    features: ['Job package', 'Applicant webhook', 'Talent matching URL'],
    configKeys: ['GLINTS_API_KEY'],
    webhookSecretKey: 'GLINTS_WEBHOOK_SECRET',
    publishSupported: true,
    brandColor: '#0D9488',
    docsUrl: 'https://glints.com/id',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Recruiter',
    provider: 'whatsapp',
    description: '1-Click contact kandidat via WhatsApp dengan template lowongan',
    features: ['1-Click WhatsApp', 'Share lowongan', 'Interview reminder link'],
    configKeys: ['WHATSAPP_PHONE_NUMBER', 'WHATSAPP_BUSINESS_TOKEN'],
    publishSupported: true,
    brandColor: '#16A34A',
  },
  {
    id: 'careers',
    name: 'Portal Karir Humanify',
    provider: 'careers',
    description: 'Lowongan publik di /careers — sumber apply langsung tanpa login',
    features: ['Public apply', 'Google Jobs source', 'Webhook-free'],
    publishSupported: true,
    brandColor: '#4F46E5',
  },
];

export const ESIGN_PROVIDERS: ESignProvider[] = [
  {
    id: 'privy',
    name: 'Privy ID',
    provider: 'privy',
    status: 'coming_soon',
    description: 'Tanda tangan elektronik berstandar PSrE untuk kontrak kerja, PKWT, dan surat HR',
    documentTypes: ['Kontrak Kerja', 'PKWT', 'PKWTT', 'NDA', 'Surat Mutasi', 'Paklaring'],
  },
  {
    id: 'peruri',
    name: 'Peruri Sign',
    provider: 'peruri',
    status: 'coming_soon',
    description: 'Alternatif e-sign PSrE dari Peruri',
    documentTypes: ['Kontrak Kerja', 'Surat Keputusan'],
  },
];

/** @deprecated use getRecruitmentIntegrationSummary(tenantId) */
export const RECRUITMENT_CHANNELS: RecruitmentChannel[] = CHANNEL_META.map(c => ({
  ...c,
  status: 'pending' as IntegrationStatus,
}));

function statusFor(provider: PortalProvider): { status: IntegrationStatus; mode: string } {
  const cred = getPortalCredentialStatus(provider);
  if (provider === 'google_jobs' || provider === 'careers') {
    return { status: 'connected', mode: 'syndication' };
  }

  const apiConnected =
    (provider === 'linkedin' && !!process.env.LINKEDIN_ACCESS_TOKEN) ||
    (provider === 'dealls' && !!process.env.DEALLS_API_KEY) ||
    (provider === 'indeed' && !!process.env.INDEED_PUBLISHER_ID) ||
    (provider === 'jobstreet' && !!process.env.JOBSTREET_API_KEY) ||
    (provider === 'kalibrr' && !!process.env.KALIBRR_API_KEY) ||
    (provider === 'glints' && !!process.env.GLINTS_API_KEY) ||
    (provider === 'whatsapp' && !!process.env.WHATSAPP_PHONE_NUMBER);

  if (apiConnected) return { status: 'connected', mode: cred.mode };
  if (cred.webhookReady && CHANNEL_META.find(c => c.provider === provider)?.webhookSecretKey) {
    return { status: 'webhook_only', mode: 'webhook' };
  }
  // OAuth app registered but no token yet
  if (
    (provider === 'linkedin' && process.env.LINKEDIN_CLIENT_ID) ||
    (provider === 'dealls' && process.env.DEALLS_COMPANY_ID) ||
    (provider === 'indeed' && process.env.INDEED_API_TOKEN)
  ) {
    return { status: 'configured', mode: cred.mode };
  }
  return { status: 'pending', mode: 'manual' };
}

export async function getRecruitmentIntegrationSummary(tenantId: string | null = null) {
  const sourceCounts = await countApplicantsBySource(tenantId);
  const posts = await listPortalPosts(undefined, tenantId);

  const lastByProvider: Record<string, string> = {};
  for (const p of posts) {
    if (!lastByProvider[p.provider] && p.updated_at) {
      lastByProvider[p.provider] = p.updated_at;
    }
  }

  const channels: RecruitmentChannel[] = CHANNEL_META.map((meta) => {
    const { status, mode } = statusFor(meta.provider);
    const src = meta.provider === 'careers' ? 'careers_portal' : meta.provider;
    const applicantsSynced =
      (sourceCounts[src] || 0) +
      (sourceCounts[meta.name.toLowerCase()] || 0) +
      (meta.provider === 'google_jobs' ? (sourceCounts.google_jobs || 0) : 0);

    return {
      ...meta,
      status,
      mode,
      lastSync: lastByProvider[meta.provider] || null,
      applicantsSynced,
    };
  });

  const live = channels.filter(c => c.status === 'connected' || c.status === 'webhook_only' || c.status === 'configured');
  return {
    totalChannels: channels.length,
    connected: channels.filter(c => c.status === 'connected').length,
    configured: live.length,
    totalApplicantsSynced: Object.values(sourceCounts).reduce((s, n) => s + n, 0),
    webhookUrl: '/api/humanify/webhooks/recruitment',
    portalPosts: posts.slice(0, 20),
    publishProviders: channels.filter(c => c.publishSupported).map(c => c.provider),
    channels,
    setupHints: [
      'Set LINKEDIN_ACCESS_TOKEN + LINKEDIN_ORG_ID untuk auto-post LinkedIn',
      'Set DEALLS_API_KEY untuk multi-posting Dealls',
      'Set INDEED_PUBLISHER_ID untuk syndication Indeed',
      'Webhook inbound: POST /api/humanify/webhooks/recruitment dengan header signature HMAC',
      'Google for Jobs memakai schema di /careers/[slug] secara otomatis',
    ],
  };
}
