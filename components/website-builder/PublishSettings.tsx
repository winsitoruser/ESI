import React, { useState } from 'react';
import { useBuilder } from './BuilderContext';
import { useTranslation } from '../../lib/i18n';
import {
  Globe, Lock, Shield, CheckCircle, AlertCircle, Clock, Copy,
  ExternalLink, RefreshCw, ChevronDown, ChevronRight, Eye, EyeOff,
  Server, Wifi, X, Link2, Key, Zap, Settings,
} from 'lucide-react';
import { DomainSettings, PublishConfig, DEFAULT_DOMAIN, DEFAULT_PUBLISH } from './types';

interface SectionProps {
  title: string;
  icon: React.FC<any>;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

function Section({ title, icon: Icon, children, defaultOpen = false, badge, badgeColor = 'bg-gray-100 text-gray-600' }: SectionProps) {
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
          {badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>}
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function PublishSettings() {
  const { state, dispatch } = useBuilder();
  const { t } = useTranslation();
  const domain = state.siteConfig?.domain || DEFAULT_DOMAIN;
  const publish = state.siteConfig?.publish || DEFAULT_PUBLISH;
  const [copied, setCopied] = useState(false);

  const updateDomain = (updates: Partial<DomainSettings>) => {
    dispatch({ type: 'UPDATE_DOMAIN', domain: updates });
  };

  const updatePublish = (updates: Partial<PublishConfig>) => {
    dispatch({ type: 'UPDATE_PUBLISH_CONFIG', config: updates });
  };

  const getPublishedUrl = () => {
    if (domain.domainType === 'custom' && domain.customDomain) {
      return `https://${domain.customDomain}`;
    }
    if (domain.subdomain) {
      return `https://${domain.subdomain}.bedagang.site`;
    }
    return '';
  };

  const handleCopyUrl = () => {
    const url = getPublishedUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePublish = () => {
    dispatch({ type: 'PUBLISH_SITE' });
  };

  const handleUnpublish = () => {
    dispatch({ type: 'UNPUBLISH_SITE' });
  };

  const sslStatusConfig = {
    none: { color: 'text-gray-400', bg: 'bg-gray-100', icon: Shield, label: t('wb.common.settings') },
    pending: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: Clock, label: t('wb.common.loading') },
    active: { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, label: 'Active' },
    error: { color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle, label: 'Error' },
  };

  const dnsStatusConfig = {
    not_configured: { color: 'text-gray-400', bg: 'bg-gray-100', label: t('wb.common.settings') },
    pending: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: t('wb.common.loading') },
    verified: { color: 'text-green-600', bg: 'bg-green-50', label: 'Verified' },
    error: { color: 'text-red-600', bg: 'bg-red-50', label: 'Error - DNS' },
  };

  const ssl = sslStatusConfig[domain.sslStatus];
  const dns = dnsStatusConfig[domain.dnsStatus];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={16} className="text-violet-600" />
          <h3 className="text-sm font-bold text-gray-800">{t('wb.publishSettings.title')}</h3>
        </div>

        {/* Publish Status */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            publish.status === 'published' ? 'bg-green-100 text-green-700' :
            publish.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {publish.status === 'published' ? <CheckCircle size={11} /> : <Clock size={11} />}
            {publish.status === 'published' ? t('wb.common.published') : publish.status === 'scheduled' ? t('wb.common.scheduled') : t('wb.common.draft')}
          </span>
          {publish.publishedAt && (
            <span className="text-[10px] text-gray-400">
              v{publish.version} · {new Date(publish.publishedAt).toLocaleDateString('id-ID')}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto builder-panel">
        {/* Quick Publish */}
        <div className="px-4 py-4 border-b border-gray-100">
          {publish.status === 'published' ? (
            <div className="space-y-2">
              {getPublishedUrl() && (
                <div className="flex items-center gap-1.5 p-2.5 bg-green-50 rounded-lg border border-green-200">
                  <Globe size={13} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs text-green-700 truncate flex-1">{getPublishedUrl()}</span>
                  <button onClick={handleCopyUrl} className="p-1 hover:bg-green-100 rounded" title="Copy URL">
                    {copied ? <CheckCircle size={13} className="text-green-600" /> : <Copy size={13} className="text-green-500" />}
                  </button>
                  <a href={getPublishedUrl()} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-green-100 rounded">
                    <ExternalLink size={13} className="text-green-500" />
                  </a>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePublish}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw size={13} /> Update
                </button>
                <button
                  onClick={handleUnpublish}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <EyeOff size={13} /> Unpublish
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handlePublish}
              disabled={!domain.subdomain && !domain.customDomain}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={16} />
              {t('wb.publishSettings.publishNow')}
            </button>
          )}
          {!domain.subdomain && !domain.customDomain && publish.status !== 'published' && (
            <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle size={10} /> {t('wb.publishSettings.subdomain')} / {t('wb.publishSettings.customDomain')}
            </p>
          )}
        </div>

        {/* Domain Type Selection */}
        <Section title={t('wb.publishSettings.domain')} icon={Globe} defaultOpen={true}
          badge={domain.domainType === 'custom' ? 'Custom' : 'Subdomain'}
          badgeColor={domain.domainType === 'custom' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
        >
          {/* Domain Type Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => updateDomain({ domainType: 'subdomain' })}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                domain.domainType === 'subdomain' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Subdomain
            </button>
            <button
              onClick={() => updateDomain({ domainType: 'custom' })}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                domain.domainType === 'custom' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t('wb.publishSettings.customDomain')}
            </button>
          </div>

          {domain.domainType === 'subdomain' ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.publishSettings.subdomain')}</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={domain.subdomain}
                  onChange={e => updateDomain({ subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="nama-bisnis"
                  className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <span className="px-3 py-2 text-xs bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg text-gray-500 whitespace-nowrap">
                  .bedagang.site
                </span>
              </div>
              {domain.subdomain && (
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Link2 size={9} /> https://{domain.subdomain}.bedagang.site
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.publishSettings.customDomain')}</label>
                <input
                  type="text"
                  value={domain.customDomain}
                  onChange={e => updateDomain({ customDomain: e.target.value.toLowerCase() })}
                  placeholder="www.example.com"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              {domain.customDomain && (
                <div className="space-y-2">
                  {/* DNS Instructions */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-[11px] font-semibold text-amber-700 mb-2">{t('wb.publishSettings.dns')}:</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-2 bg-white rounded-md border border-amber-100">
                        <div className="text-[10px]">
                          <span className="font-semibold text-gray-700">Type:</span> <span className="text-gray-500">CNAME</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="font-semibold text-gray-700">Name:</span> <span className="text-gray-500">www</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="font-semibold text-gray-700">Value:</span> <span className="text-gray-500">cname.bedagang.site</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded-md border border-amber-100">
                        <div className="text-[10px]">
                          <span className="font-semibold text-gray-700">Type:</span> <span className="text-gray-500">A</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="font-semibold text-gray-700">Name:</span> <span className="text-gray-500">@</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="font-semibold text-gray-700">Value:</span> <span className="text-gray-500">76.76.21.21</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DNS Status */}
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg ${dns.bg}`}>
                    <Wifi size={13} className={dns.color} />
                    <span className={`text-xs font-medium ${dns.color}`}>{dns.label}</span>
                    <button
                      onClick={() => updateDomain({ dnsStatus: 'verified' })}
                      className="ml-auto text-[10px] font-medium text-blue-600 hover:underline"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extra Options */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-600">WWW Redirect</span>
              <div
                onClick={() => updateDomain({ enableWWW: !domain.enableWWW })}
                className={`relative cursor-pointer rounded-full transition-colors ${domain.enableWWW ? 'bg-blue-500' : 'bg-gray-300'}`}
                style={{ width: 32, height: 18 }}
              >
                <div className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform"
                  style={{ width: 14, height: 14, transform: domain.enableWWW ? 'translateX(15px)' : 'translateX(2px)' }}
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-600">Force HTTPS</span>
              <div
                onClick={() => updateDomain({ forceHTTPS: !domain.forceHTTPS })}
                className={`relative cursor-pointer rounded-full transition-colors ${domain.forceHTTPS ? 'bg-blue-500' : 'bg-gray-300'}`}
                style={{ width: 32, height: 18 }}
              >
                <div className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform"
                  style={{ width: 14, height: 14, transform: domain.forceHTTPS ? 'translateX(15px)' : 'translateX(2px)' }}
                />
              </div>
            </label>
          </div>
        </Section>

        {/* SSL Certificate */}
        <Section title={t('wb.publishSettings.ssl')} icon={Lock}
          badge={ssl.label}
          badgeColor={`${ssl.bg} ${ssl.color}`}
        >
          <div className={`flex items-center gap-2 p-3 rounded-lg ${ssl.bg}`}>
            <ssl.icon size={16} className={ssl.color} />
            <div>
              <p className={`text-xs font-semibold ${ssl.color}`}>{ssl.label}</p>
              {domain.sslCertExpiry && (
                <p className="text-[10px] text-gray-500">Berlaku hingga: {new Date(domain.sslCertExpiry).toLocaleDateString('id-ID')}</p>
              )}
            </div>
          </div>
          {domain.sslStatus !== 'active' && (
            <button
              onClick={() => updateDomain({ sslStatus: 'pending' })}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Shield size={13} /> {t('wb.publishSettings.ssl')} (Let&apos;s Encrypt)
            </button>
          )}
        </Section>

        {/* Access Control */}
        <Section title={t('wb.publishSettings.passwordProtect')} icon={Key}>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Lock size={13} className="text-gray-400" />
              <span className="text-xs text-gray-600">{t('wb.publishSettings.passwordProtect')}</span>
            </div>
            <div
              onClick={() => updatePublish({ passwordProtected: !publish.passwordProtected })}
              className={`relative cursor-pointer rounded-full transition-colors ${publish.passwordProtected ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ width: 32, height: 18 }}
            >
              <div className="absolute top-0.5 bg-white rounded-full shadow-sm transition-transform"
                style={{ width: 14, height: 14, transform: publish.passwordProtected ? 'translateX(15px)' : 'translateX(2px)' }}
              />
            </div>
          </label>
          {publish.passwordProtected && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.publishSettings.passwordProtect')}</label>
              <input
                type="password"
                value={publish.password}
                onChange={e => updatePublish({ password: e.target.value })}
                placeholder="Password..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2">
              <Settings size={13} className="text-gray-400" />
              <span className="text-xs text-gray-600">{t('wb.publishSettings.maintenance')}</span>
            </div>
            <div
              onClick={() => updatePublish({ maintenanceMode: !publish.maintenanceMode })}
              className={`relative cursor-pointer rounded-full transition-colors ${publish.maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'}`}
              style={{ width: 32, height: 18 }}
            >
              <div className="absolute top-0.5 bg-white rounded-full shadow-sm transition-transform"
                style={{ width: 14, height: 14, transform: publish.maintenanceMode ? 'translateX(15px)' : 'translateX(2px)' }}
              />
            </div>
          </label>
          {publish.maintenanceMode && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('wb.publishSettings.maintenanceMsg')}</label>
              <textarea
                value={publish.maintenanceMessage}
                onChange={e => updatePublish({ maintenanceMessage: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
            </div>
          )}
        </Section>

        {/* Favicon */}
        <Section title="Favicon" icon={Globe}>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Favicon URL</label>
            <input
              type="url"
              value={domain.favicon}
              onChange={e => updateDomain({ favicon: e.target.value })}
              placeholder="https://example.com/favicon.ico"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {domain.favicon && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <img src={domain.favicon} alt="Favicon" className="w-6 h-6" onError={e => (e.currentTarget.style.display = 'none')} />
              <span className="text-[10px] text-gray-500">Preview favicon</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">404 Page</label>
            <input
              type="text"
              value={domain.customNotFoundPage}
              onChange={e => updateDomain({ customNotFoundPage: e.target.value })}
              placeholder="not-found"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
