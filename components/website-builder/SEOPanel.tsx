import React, { useState } from 'react';
import { useBuilder } from './BuilderContext';
import { useTranslation } from '../../lib/i18n';
import {
  Search, Globe, Image, Share2, Code, FileText, Eye, EyeOff,
  ChevronDown, ChevronRight, AlertCircle, CheckCircle, Info,
  Tag, Link2, BarChart3, Zap, Twitter, Hash,
} from 'lucide-react';
import { SEOSettings } from './types';

interface SectionProps {
  title: string;
  icon: React.FC<any>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon: Icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-gray-400" />
          {title}
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function SEOScoreBar({ score, scoreLabel }: { score: number; scoreLabel: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const label = score >= 80 ? '✓' : score >= 50 ? '~' : '✗';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600">{scoreLabel}</span>
        <span className={`font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}/100 — {label}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function SEOPanel() {
  const { state, dispatch, currentPage } = useBuilder();
  const { t } = useTranslation();
  const seo = currentPage?.seo;

  if (!currentPage || !seo) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
        <p>{t('wb.seoPanel.title')}</p>
      </div>
    );
  }

  const updateSEO = (updates: Partial<SEOSettings>) => {
    dispatch({ type: 'UPDATE_PAGE_SEO', pageId: currentPage.id, seo: updates });
  };

  // Calculate SEO score
  const calculateScore = (): number => {
    let score = 0;
    if (seo.metaTitle && seo.metaTitle.length >= 10 && seo.metaTitle.length <= 60) score += 15;
    else if (seo.metaTitle) score += 5;
    if (seo.metaDescription && seo.metaDescription.length >= 50 && seo.metaDescription.length <= 160) score += 15;
    else if (seo.metaDescription) score += 5;
    if (seo.metaKeywords.length > 0) score += 10;
    if (seo.ogTitle) score += 10;
    if (seo.ogDescription) score += 10;
    if (seo.ogImage) score += 10;
    if (seo.canonicalUrl) score += 5;
    if (seo.robotsIndex) score += 5;
    if (seo.sitemap) score += 5;
    if (seo.structuredData.length > 0) score += 10;
    if (seo.schemaType) score += 5;
    return Math.min(100, score);
  };

  const seoScore = calculateScore();

  const [keywordInput, setKeywordInput] = useState('');

  const addKeyword = () => {
    if (keywordInput.trim() && !seo.metaKeywords.includes(keywordInput.trim())) {
      updateSEO({ metaKeywords: [...seo.metaKeywords, keywordInput.trim()] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    updateSEO({ metaKeywords: seo.metaKeywords.filter(k => k !== kw) });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center gap-2 mb-2">
          <Search size={16} className="text-emerald-600" />
          <h3 className="text-sm font-bold text-gray-800">{t('wb.seoPanel.title')}</h3>
        </div>
        <SEOScoreBar score={seoScore} scoreLabel={t('wb.seoPanel.score')} />
      </div>

      <div className="flex-1 overflow-y-auto builder-panel">
        {/* Quick Tips */}
        <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100">
          <div className="flex items-start gap-2">
            <Zap size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-blue-700 leading-relaxed">
              {seoScore < 50 ? t('wb.seoPanel.metaTitle') + ' & ' + t('wb.seoPanel.metaDescription') :
               seoScore < 80 ? 'Open Graph & Structured Data' :
               'SEO ✓'}
            </div>
          </div>
        </div>

        {/* Meta Tags */}
        <Section title={t('wb.seoPanel.metaTitle')} icon={Tag} defaultOpen={true}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('wb.seoPanel.metaTitle')}
              <span className={`ml-1 ${seo.metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
                ({seo.metaTitle.length}/60)
              </span>
            </label>
            <input
              type="text"
              value={seo.metaTitle}
              onChange={e => updateSEO({ metaTitle: e.target.value })}
              placeholder={t('wb.seoPanel.metaTitle') + '...'}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
            {seo.metaTitle.length > 60 && (
              <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                <AlertCircle size={10} /> Max 60
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('wb.seoPanel.metaDescription')}
              <span className={`ml-1 ${seo.metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>
                ({seo.metaDescription.length}/160)
              </span>
            </label>
            <textarea
              value={seo.metaDescription}
              onChange={e => updateSEO({ metaDescription: e.target.value })}
              placeholder={t('wb.seoPanel.metaDescription') + '...'}
              rows={3}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.metaKeywords')}</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()}
                placeholder={t('wb.seoPanel.metaKeywords') + '...'}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button onClick={addKeyword} className="px-2.5 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">+</button>
            </div>
            {seo.metaKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {seo.metaKeywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded-full">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="text-emerald-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.canonicalUrl')}</label>
            <input
              type="url"
              value={seo.canonicalUrl}
              onChange={e => updateSEO({ canonicalUrl: e.target.value })}
              placeholder="https://example.com/halaman"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </Section>

        {/* Open Graph */}
        <Section title="Open Graph" icon={Share2}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.ogTitle')}</label>
            <input
              type="text"
              value={seo.ogTitle}
              onChange={e => updateSEO({ ogTitle: e.target.value })}
              placeholder={seo.metaTitle || t('wb.seoPanel.ogTitle') + '...'}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.ogDescription')}</label>
            <textarea
              value={seo.ogDescription}
              onChange={e => updateSEO({ ogDescription: e.target.value })}
              placeholder={seo.metaDescription || t('wb.seoPanel.ogDescription') + '...'}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.ogImage')}</label>
            <input
              type="url"
              value={seo.ogImage}
              onChange={e => updateSEO({ ogImage: e.target.value })}
              placeholder="https://example.com/image.jpg (1200x630 recommended)"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.ogType')}</label>
            <select
              value={seo.ogType}
              onChange={e => updateSEO({ ogType: e.target.value as any })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="website">Website</option>
              <option value="article">Article</option>
              <option value="product">Product</option>
            </select>
          </div>

          {/* Preview card */}
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-[10px] text-gray-400 mb-2 font-medium">PREVIEW</p>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                {seo.ogImage ? (
                  <img src={seo.ogImage} alt="" className="h-full w-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <Image size={24} className="text-gray-300" />
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[10px] text-gray-400 truncate">example.com</p>
                <p className="text-xs font-semibold text-gray-800 truncate">{seo.ogTitle || seo.metaTitle || t('wb.seoPanel.metaTitle')}</p>
                <p className="text-[10px] text-gray-500 line-clamp-2">{seo.ogDescription || seo.metaDescription || t('wb.seoPanel.metaDescription')}</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Twitter Card */}
        <Section title={t('wb.seoPanel.twitterCard')} icon={Twitter}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.twitterCard')}</label>
            <select
              value={seo.twitterCard}
              onChange={e => updateSEO({ twitterCard: e.target.value as any })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="summary">Summary</option>
              <option value="summary_large_image">Summary Large Image</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.twitterTitle')}</label>
            <input
              type="text"
              value={seo.twitterTitle}
              onChange={e => updateSEO({ twitterTitle: e.target.value })}
              placeholder={seo.ogTitle || seo.metaTitle || t('wb.seoPanel.twitterTitle') + '...'}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.twitterDescription')}</label>
            <textarea
              value={seo.twitterDescription}
              onChange={e => updateSEO({ twitterDescription: e.target.value })}
              placeholder={seo.ogDescription || seo.metaDescription || t('wb.seoPanel.twitterDescription') + '...'}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
            />
          </div>
        </Section>

        {/* Indexing & Robots */}
        <Section title={t('wb.seoPanel.robotsIndex')} icon={Eye}>
          <div className="space-y-2.5">
            {([
              { key: 'robotsIndex', label: t('wb.seoPanel.robotsIndex'), icon: Search },
              { key: 'robotsFollow', label: t('wb.seoPanel.robotsFollow'), icon: Link2 },
              { key: 'sitemap', label: t('wb.seoPanel.sitemap'), icon: FileText },
            ] as const).map(item => (
              <label key={item.key} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <item.icon size={13} className="text-gray-400" />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
                <div
                  onClick={() => updateSEO({ [item.key]: !seo[item.key] })}
                  className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
                    seo[item.key] ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                  style={{ width: 32, height: 18 }}
                >
                  <div
                    className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform"
                    style={{
                      width: 14, height: 14,
                      transform: seo[item.key] ? 'translateX(15px)' : 'translateX(2px)',
                    }}
                  />
                </div>
              </label>
            ))}
          </div>
          {seo.sitemap && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">{t('wb.seoPanel.sitemap')}</label>
                <select
                  value={seo.sitemapPriority}
                  onChange={e => updateSEO({ sitemapPriority: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                >
                  {[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Change Freq.</label>
                <select
                  value={seo.sitemapChangeFreq}
                  onChange={e => updateSEO({ sitemapChangeFreq: e.target.value as any })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                >
                  <option value="always">Always</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          )}
        </Section>

        {/* Schema / Structured Data */}
        <Section title={t('wb.seoPanel.schemaType')} icon={Code}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.schemaType')}</label>
            <select
              value={seo.schemaType}
              onChange={e => updateSEO({ schemaType: e.target.value as any })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="WebPage">WebPage</option>
              <option value="Article">Article</option>
              <option value="Product">Product</option>
              <option value="Organization">Organization</option>
              <option value="LocalBusiness">LocalBusiness</option>
            </select>
          </div>

          {/* Schema preview */}
          <div className="p-2.5 bg-gray-900 rounded-lg text-[10px] font-mono text-green-400 overflow-x-auto">
            <pre>{JSON.stringify({
              '@context': 'https://schema.org',
              '@type': seo.schemaType,
              name: seo.metaTitle || currentPage.name,
              description: seo.metaDescription,
              url: seo.canonicalUrl,
            }, null, 2)}</pre>
          </div>
        </Section>

        {/* Analytics */}
        <Section title={t('wb.seoPanel.analytics')} icon={BarChart3}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.analytics')}</label>
            <input
              type="text"
              value={seo.analyticsId}
              onChange={e => updateSEO({ analyticsId: e.target.value })}
              placeholder="G-XXXXXXXXXX atau UA-XXXXXXXX-X"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </Section>

        {/* Custom Head Tags */}
        <Section title={t('wb.seoPanel.customHead')} icon={Code}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.seoPanel.customHead')}</label>
            <textarea
              value={seo.customHeadTags}
              onChange={e => updateSEO({ customHeadTags: e.target.value })}
              placeholder={'<meta name="author" content="...">\n<link rel="preconnect" href="...">'}
              rows={4}
              className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </div>
        </Section>

        {/* Google Preview */}
        <div className="px-4 py-4 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wider">{t('wb.seoPanel.preview')}</p>
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-[11px] text-green-700 truncate">{seo.canonicalUrl || 'https://example.com/' + currentPage.slug}</p>
            <p className="text-sm font-medium text-blue-700 hover:underline cursor-pointer truncate mt-0.5">
              {seo.metaTitle || currentPage.name || t('wb.seoPanel.metaTitle')}
            </p>
            <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
              {seo.metaDescription || t('wb.seoPanel.metaDescription') + '...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
