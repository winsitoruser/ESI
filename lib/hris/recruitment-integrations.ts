/**
 * Recruitment channel integrations — Dealls, LinkedIn, Indeed, Google for Jobs
 */

export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'coming_soon';

export interface RecruitmentChannel {
  id: string;
  name: string;
  provider: 'dealls' | 'linkedin' | 'indeed' | 'google_jobs' | 'jobstreet' | 'whatsapp';
  status: IntegrationStatus;
  description: string;
  features: string[];
  configKeys?: string[];
  lastSync?: string;
  applicantsSynced?: number;
}

export interface ESignProvider {
  id: string;
  name: string;
  provider: 'privy' | 'peruri' | 'bsre';
  status: IntegrationStatus;
  description: string;
  documentTypes: string[];
}

export const RECRUITMENT_CHANNELS: RecruitmentChannel[] = [
  {
    id: 'dealls',
    name: 'Dealls',
    provider: 'dealls',
    status: 'connected',
    description: 'Rekrut melalui Dealls — posting lowongan ke multiple job board sekaligus',
    features: ['Multi-posting', 'Applicant sync', 'Pipeline integration', 'Analytics'],
    configKeys: ['DEALLS_API_KEY', 'DEALLS_COMPANY_ID'],
    lastSync: '2026-07-08T04:00:00Z',
    applicantsSynced: 47,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    provider: 'linkedin',
    status: 'connected',
    description: 'Posting lowongan & sinkronisasi kandidat dari LinkedIn Jobs',
    features: ['Job posting', 'Applicant import', 'Company page sync', 'InMail tracking'],
    configKeys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    lastSync: '2026-07-07T22:00:00Z',
    applicantsSynced: 28,
  },
  {
    id: 'indeed',
    name: 'Indeed',
    provider: 'indeed',
    status: 'connected',
    description: 'Syndikasi lowongan ke Indeed Indonesia',
    features: ['Auto-post jobs', 'Applicant feed', 'Sponsored jobs'],
    configKeys: ['INDEED_PUBLISHER_ID'],
    lastSync: '2026-07-07T18:00:00Z',
    applicantsSynced: 35,
  },
  {
    id: 'google_jobs',
    name: 'Google for Jobs',
    provider: 'google_jobs',
    status: 'connected',
    description: 'Structured data untuk Google for Jobs search',
    features: ['Schema.org markup', 'SEO optimization', 'Apply tracking'],
    lastSync: '2026-07-08T00:00:00Z',
    applicantsSynced: 18,
  },
  {
    id: 'jobstreet',
    name: 'Jobstreet',
    provider: 'jobstreet',
    status: 'pending',
    description: 'Integrasi Jobstreet Indonesia (menunggu API credentials)',
    features: ['Job posting', 'Resume download', 'Screening questions'],
    configKeys: ['JOBSTREET_API_KEY'],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Recruiter',
    provider: 'whatsapp',
    status: 'connected',
    description: '1-Click contact kandidat via WhatsApp dengan template otomatis',
    features: ['1-Click WhatsApp', 'Template messages', 'Auto email update', 'Interview reminder'],
    lastSync: '2026-07-08T05:00:00Z',
    applicantsSynced: 62,
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

export function getRecruitmentIntegrationSummary() {
  const connected = RECRUITMENT_CHANNELS.filter(c => c.status === 'connected');
  return {
    totalChannels: RECRUITMENT_CHANNELS.length,
    connected: connected.length,
    totalApplicantsSynced: connected.reduce((s, c) => s + (c.applicantsSynced || 0), 0),
    channels: RECRUITMENT_CHANNELS,
  };
}
