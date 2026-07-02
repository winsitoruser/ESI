import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import HQLayout from '../../../components/hq/HQLayout';
import { useBusinessType } from '../../../contexts/BusinessTypeContext';
import { useTranslation } from '@/lib/i18n';
import {
  ArrowLeft, ArrowRight, ChevronDown, ExternalLink,
  LayoutDashboard, ShoppingCart, Package, Users, Wallet, BarChart3,
  Building2, Truck, UserCheck, Settings, MessageCircle, Globe,
  Briefcase, Megaphone, Layers, Send, Shield, Headphones,
  Star, CheckCircle, Zap, BookOpen, HelpCircle, Target,
  TrendingUp, FileText, Database, Lock, Activity,
  Calendar, CreditCard, Map, Monitor, PieChart, Box,
  Clock, Bell, Tag, Search, Eye, Sparkles, Play
} from 'lucide-react';

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════
interface ModuleDetail {
  name: string;
  tagline: string;
  longDesc: string;
  icon: any;
  gradient: string;
  gradientBg: string;
  href: string;
  category: string;
  highlights: string[];
  features: { title: string; desc: string; icon: any }[];
  stats: { label: string; value: string }[];
}

interface Article {
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  icon: any;
  color: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

// ═══════════════════════════════════════════════════════
// Module Style/Icon Metadata (non-translatable)
// ═══════════════════════════════════════════════════════
interface ModuleMeta {
  icon: any;
  gradient: string;
  gradientBg: string;
  href: string;
  featureIcons: any[];
}

const ESI_EXCLUDED_MODULES = new Set([
  'pos', 'branches', 'manufacturing', 'dms', 'bumdes', 'livestreaming', 'fnb',
]);

const MODULE_META: Record<string, ModuleMeta> = {
  dashboard: { icon: LayoutDashboard, gradient: 'from-indigo-500 to-indigo-600', gradientBg: 'from-indigo-900 via-indigo-950 to-violet-950', href: '/hq/dashboard', featureIcons: [TrendingUp, Building2, Target, Bell] },
  project_management: { icon: Briefcase, gradient: 'from-emerald-500 to-emerald-600', gradientBg: 'from-emerald-900 via-emerald-950 to-teal-950', href: '/hq/project-management', featureIcons: [Target, Calendar, Users, Activity] },
  asset_management: { icon: Layers, gradient: 'from-teal-500 to-teal-600', gradientBg: 'from-teal-900 via-teal-950 to-emerald-950', href: '/hq/assets', featureIcons: [Box, Settings, Activity, FileText] },
  knowledge_base: { icon: BookOpen, gradient: 'from-green-500 to-green-600', gradientBg: 'from-green-900 via-green-950 to-emerald-950', href: '/hq/knowledge-base', featureIcons: [BookOpen, Search, FileText, Shield] },
  inventory: { icon: Package, gradient: 'from-emerald-500 to-emerald-600', gradientBg: 'from-emerald-900 via-emerald-950 to-teal-950', href: '/hq/inventory', featureIcons: [Box, Send, FileText, Search, Bell] },
  products: { icon: Layers, gradient: 'from-teal-500 to-teal-600', gradientBg: 'from-teal-900 via-teal-950 to-emerald-950', href: '/hq/products', featureIcons: [Package, Layers, Tag, FileText] },
  finance: { icon: Wallet, gradient: 'from-amber-500 to-amber-600', gradientBg: 'from-amber-900 via-amber-950 to-orange-950', href: '/hq/finance', featureIcons: [Database, Zap, PieChart, Target, FileText] },
  finance_pro: { icon: Wallet, gradient: 'from-amber-500 to-amber-600', gradientBg: 'from-amber-900 via-amber-950 to-orange-950', href: '/hq/finance', featureIcons: [Database, Zap, PieChart, Target, FileText] },
  hris: { icon: UserCheck, gradient: 'from-cyan-500 to-cyan-600', gradientBg: 'from-cyan-900 via-cyan-950 to-blue-950', href: '/hq/hris', featureIcons: [Users, Wallet, Clock, Calendar, Target, Monitor] },
  users: { icon: Users, gradient: 'from-sky-500 to-sky-600', gradientBg: 'from-sky-900 via-sky-950 to-blue-950', href: '/hq/users', featureIcons: [Users, Shield, Lock, Eye] },
  crm: { icon: Briefcase, gradient: 'from-pink-500 to-pink-600', gradientBg: 'from-pink-900 via-pink-950 to-rose-950', href: '/hq/sfa', featureIcons: [Target, TrendingUp, Eye, Map, Star, Sparkles] },
  helpdesk: { icon: Headphones, gradient: 'from-violet-500 to-violet-600', gradientBg: 'from-violet-900 via-violet-950 to-indigo-950', href: '/hq/helpdesk', featureIcons: [Headphones, MessageCircle, Package, ShoppingCart, CheckCircle, Clock] },
  marketing: { icon: Megaphone, gradient: 'from-rose-500 to-rose-600', gradientBg: 'from-rose-900 via-rose-950 to-pink-950', href: '/hq/marketing', featureIcons: [Megaphone, Tag, Users, Wallet] },
  fms: { icon: Truck, gradient: 'from-orange-500 to-orange-600', gradientBg: 'from-orange-900 via-orange-950 to-amber-950', href: '/hq/fms', featureIcons: [Truck, Users, Settings, Activity, PieChart] },
  tms: { icon: Send, gradient: 'from-lime-500 to-lime-600', gradientBg: 'from-lime-900 via-lime-950 to-green-950', href: '/hq/tms', featureIcons: [Package, Map, Truck, CheckCircle, FileText] },
  reports: { icon: BarChart3, gradient: 'from-purple-500 to-purple-600', gradientBg: 'from-purple-900 via-purple-950 to-violet-950', href: '/hq/reports/consolidated', featureIcons: [PieChart, Settings, FileText, TrendingUp] },
  audit: { icon: Shield, gradient: 'from-slate-500 to-slate-600', gradientBg: 'from-slate-800 via-slate-900 to-gray-950', href: '/hq/audit-logs', featureIcons: [Eye, Search, Activity, FileText] },
  whatsapp: { icon: MessageCircle, gradient: 'from-green-500 to-green-600', gradientBg: 'from-green-900 via-green-950 to-emerald-950', href: '/hq/whatsapp', featureIcons: [Megaphone, Bell, FileText, MessageCircle] },
  marketplace: { icon: Globe, gradient: 'from-blue-500 to-cyan-600', gradientBg: 'from-blue-900 via-cyan-950 to-teal-950', href: '/hq/marketplace', featureIcons: [Package, Activity, ShoppingCart, Tag] },
  settings: { icon: Settings, gradient: 'from-gray-500 to-gray-600', gradientBg: 'from-gray-800 via-gray-900 to-slate-950', href: '/hq/settings', featureIcons: [Package, FileText, CreditCard, FileText] },
};

// Helper: build translated ModuleDetail from translation keys + META
function buildModuleDetail(t: (key: string, params?: Record<string, string | number>) => string, code: string): ModuleDetail | null {
  const meta = MODULE_META[code];
  if (!meta) return null;
  const d = (key: string) => t(`md.${code}.${key}`);
  const featureKeys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
  const features = featureKeys
    .filter(fk => d(`${fk}t`) !== `md.${code}.${fk}t`)
    .map((fk, i) => ({ title: d(`${fk}t`), desc: d(`${fk}d`), icon: meta.featureIcons[i] || Package }));
  const statsKeys = ['s1', 's2', 's3'];
  const stats = statsKeys
    .filter(sk => d(`${sk}l`) !== `md.${code}.${sk}l`)
    .map(sk => ({ label: d(`${sk}l`), value: d(`${sk}v`) }));
  return {
    name: d('name'), tagline: d('tagline'), longDesc: d('longDesc'),
    icon: meta.icon, gradient: meta.gradient, gradientBg: meta.gradientBg, href: meta.href, category: d('category'),
    highlights: [d('h1'), d('h2'), d('h3')].filter(h => !h.startsWith('md.')),
    features, stats,
  };
}

// ═══════════════════════════════════════════════════════
// Add-on Recommendations per Module
// ═══════════════════════════════════════════════════════
const ADDON_RECS: Record<string, string[]> = {
  dashboard: ['reports', 'finance_pro', 'hris'],
  project_management: ['asset_management', 'inventory', 'hris'],
  asset_management: ['inventory', 'fms', 'project_management'],
  knowledge_base: ['hris', 'project_management', 'helpdesk'],
  inventory: ['products', 'fms', 'tms'],
  products: ['inventory', 'marketplace'],
  finance: ['hris', 'reports'],
  finance_pro: ['hris', 'reports', 'project_management'],
  hris: ['finance_pro', 'crm', 'fms'],
  users: ['audit', 'hris'],
  crm: ['marketing', 'whatsapp', 'helpdesk'],
  helpdesk: ['crm', 'whatsapp', 'knowledge_base'],
  marketing: ['crm', 'whatsapp'],
  fms: ['tms', 'hris', 'finance_pro'],
  tms: ['fms', 'inventory', 'crm'],
  reports: ['finance_pro', 'crm', 'hris'],
  audit: ['users', 'settings'],
  whatsapp: ['crm', 'marketing'],
  marketplace: ['inventory', 'products'],
  settings: ['audit', 'users'],
};

// ═══════════════════════════════════════════════════════
// Industry-specific Articles (icon/color metadata only)
// ═══════════════════════════════════════════════════════
const ARTICLE_META: Record<string, { icon: any; color: string }[]> = {
  fnb: [
    { icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { icon: Package, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Sparkles, color: 'bg-violet-50 text-violet-600' },
  ],
  retail: [
    { icon: Globe, color: 'bg-blue-50 text-blue-600' },
    { icon: Package, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Star, color: 'bg-amber-50 text-amber-600' },
  ],
  distribution: [
    { icon: Truck, color: 'bg-orange-50 text-orange-600' },
    { icon: Map, color: 'bg-blue-50 text-blue-600' },
    { icon: Truck, color: 'bg-emerald-50 text-emerald-600' },
  ],
  manufacturing: [
    { icon: Settings, color: 'bg-violet-50 text-violet-600' },
    { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Clock, color: 'bg-cyan-50 text-cyan-600' },
  ],
  services: [
    { icon: Briefcase, color: 'bg-pink-50 text-pink-600' },
    { icon: Target, color: 'bg-blue-50 text-blue-600' },
    { icon: Wallet, color: 'bg-amber-50 text-amber-600' },
  ],
  logistics: [
    { icon: Send, color: 'bg-lime-50 text-lime-600' },
    { icon: Map, color: 'bg-blue-50 text-blue-600' },
    { icon: PieChart, color: 'bg-emerald-50 text-emerald-600' },
  ],
};

function buildArticles(t: (key: string) => string, group: string): Article[] {
  const meta = ARTICLE_META[group] || ARTICLE_META['retail'];
  return meta.map((m, i) => ({
    title: t(`mp.articles.${group}.a${i + 1}.title`),
    excerpt: t(`mp.articles.${group}.a${i + 1}.excerpt`),
    category: t(`mp.articles.${group}.a${i + 1}.category`),
    readTime: t(`mp.articles.${group}.a${i + 1}.readTime`),
    icon: m.icon,
    color: m.color,
  }));
}

function buildFaqs(t: (key: string) => string, group: string): FAQItem[] {
  const keys = ['q1', 'q2', 'q3', 'q4', 'q5'];
  return keys
    .filter(k => {
      const val = t(`mp.faq.${group}.${k}.q`);
      return val && !val.startsWith('mp.faq.');
    })
    .map(k => ({
      question: t(`mp.faq.${group}.${k}.q`),
      answer: t(`mp.faq.${group}.${k}.a`),
    }));
}

// ═══════════════════════════════════════════════════════
// Helper: Map business type to industry group
// ═══════════════════════════════════════════════════════
function getIndustryGroup(businessType: string | null): string {
  if (!businessType) return 'retail';
  const map: Record<string, string> = {
    fine_dining: 'fnb', cloud_kitchen: 'fnb', qsr: 'fnb', cafe: 'fnb', catering: 'fnb', bakery: 'fnb',
    retail: 'retail', minimarket: 'retail', supermarket: 'retail', fashion: 'retail', electronics: 'retail',
    distribution: 'distribution', wholesale: 'distribution', fmcg: 'distribution',
    manufacturing: 'manufacturing', production: 'manufacturing',
    services: 'services', consulting: 'services', agency: 'services',
    logistics: 'logistics', rental_bus: 'logistics', rental_truck: 'logistics', rental_car: 'logistics', rental_heavy_equipment: 'logistics',
  };
  return map[businessType] || 'retail';
}

// ═══════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════
export default function ModuleDetailPage() {
  const router = useRouter();
  const { code } = router.query;
  const { businessType } = useBusinessType();
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const moduleCode = typeof code === 'string' ? code : '';

  React.useEffect(() => {
    if (moduleCode && ESI_EXCLUDED_MODULES.has(moduleCode)) {
      router.replace('/hq/home');
    }
  }, [moduleCode, router]);

  const mod = useMemo(() => buildModuleDetail(t, moduleCode), [t, moduleCode]);
  const industryGroup = getIndustryGroup(businessType);
  const industryLabel = t(`mp.detail.industry.${industryGroup}`);
  const articles = useMemo(() => buildArticles(t, industryGroup), [t, industryGroup]);
  const faqs = useMemo(() => buildFaqs(t, industryGroup), [t, industryGroup]);
  const recs = useMemo(() => (ADDON_RECS[moduleCode] || [])
    .filter(addonCode => MODULE_META[addonCode])
    .map(addonCode => ({
      code: addonCode,
      reason: t(`mp.addon.${moduleCode}.${addonCode}`),
      mod: buildModuleDetail(t, addonCode)!,
    })), [t, moduleCode]);

  if (!mod) {
    return (
      <HQLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <HelpCircle className="w-16 h-16 text-gray-300 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('mp.detail.moduleNotFound')}</h1>
          <p className="text-gray-500 mb-6">{t('mp.detail.moduleNotFoundDesc', { code: moduleCode })}</p>
          <Link href="/hq/home" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
            {t('mp.detail.backToHome')}
          </Link>
        </div>
      </HQLayout>
    );
  }

  const Icon = mod.icon;

  return (
    <HQLayout>
      <Head>
        <title>{mod.name} - Bedagang ERP</title>
      </Head>

      <div className="w-full space-y-8">
        {/* ═══ Back Navigation ═══ */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/hq/home')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('mp.detail.backToHome')}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-400">{mod.category}</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">{mod.name}</span>
        </div>

        {/* ═══ HERO SECTION ═══ */}
        <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br ${mod.gradientBg} p-6 sm:p-8 lg:p-10`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-5">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-white/40 uppercase tracking-wider">{mod.category}</span>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{mod.name}</h1>
                  </div>
                </div>
                <p className="text-lg sm:text-xl text-white/80 font-medium mb-4">{mod.tagline}</p>
                <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-2xl">{mod.longDesc}</p>

                <div className="flex flex-wrap gap-3 mt-6">
                  <Link
                    href={mod.href}
                    className={`inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg`}
                  >
                    <Play className="w-4 h-4" />
                    {t('mp.detail.openModule', { name: mod.name })}
                  </Link>
                  <button
                    onClick={() => {
                      const el = document.getElementById('features-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/10"
                  >
                    {t('mp.detail.viewFeatures')}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-row lg:flex-col gap-4 lg:gap-5 lg:min-w-[200px]">
                {mod.stats.map((s, i) => (
                  <div key={i} className="bg-white/[0.08] backdrop-blur-sm border border-white/[0.08] rounded-xl px-5 py-4 flex-1 lg:flex-none">
                    <p className="text-[11px] uppercase tracking-wider text-white/30 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {mod.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-sm text-white/60">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FEATURES SECTION ═══ */}
        <div id="features-section">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center`}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('mp.detail.featuredFeatures')}</h2>
              <p className="text-sm text-gray-500">{t('mp.detail.mainCapabilities', { name: mod.name })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mod.features.map((feat, i) => {
              const FeatIcon = feat.icon;
              return (
                <div key={i} className="group bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg hover:border-gray-300/80 hover:-translate-y-0.5 transition-all duration-200">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <FeatIcon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">{feat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ ADDON RECOMMENDATIONS ═══ */}
        {recs.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('mp.detail.recommendedAddons')}</h2>
                <p className="text-sm text-gray-500">{t('mp.detail.enhanceWith', { name: mod.name })}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recs.map((rec) => {
                const RecIcon = rec.mod.icon;
                return (
                  <Link
                    key={rec.code}
                    href={`/hq/modules/${rec.code}`}
                    className="group bg-white rounded-xl border border-gray-200/60 p-5 hover:shadow-lg hover:border-gray-300/80 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${rec.mod.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <RecIcon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900">{rec.mod.name}</h3>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ INDUSTRY ARTICLES ═══ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('mp.detail.articlesInsight')}</h2>
                <p className="text-sm text-gray-500">{t('mp.detail.curatedContent', { industry: industryLabel })}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article, i) => {
              const ArtIcon = article.icon;
              return (
                <div
                  key={i}
                  className="group bg-white rounded-xl border border-gray-200/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Article header with gradient */}
                  <div className={`h-32 bg-gradient-to-br ${
                    i === 0 ? 'from-blue-500 to-indigo-600' :
                    i === 1 ? 'from-emerald-500 to-teal-600' :
                    'from-violet-500 to-purple-600'
                  } relative overflow-hidden flex items-center justify-center`}>
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    </div>
                    <ArtIcon className="w-12 h-12 text-white/30" />
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${article.color}`}>{article.category}</span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {article.readTime}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{article.excerpt}</p>
                    <div className="flex items-center gap-1.5 mt-4 text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {t('mp.detail.readMore')} <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ FAQ SECTION ═══ */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('mp.detail.faq')}</h2>
              <p className="text-sm text-gray-500">{t('mp.detail.faqDesc', { industry: industryLabel })}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 -mt-1">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CTA SECTION ═══ */}
        <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r ${mod.gradient} p-8 sm:p-10 text-center`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative z-10">
            <Icon className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">{t('mp.detail.readyToUse', { name: mod.name })}</h2>
            <p className="text-white/70 text-sm mb-6 max-w-lg mx-auto">
              {t('mp.detail.startUsing', { name: mod.name })}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={mod.href}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
              >
                <ExternalLink className="w-4 h-4" />
                {t('mp.detail.openModule', { name: mod.name })}
              </Link>
              <Link
                href="/hq/home"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('mp.detail.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HQLayout>
  );
}
