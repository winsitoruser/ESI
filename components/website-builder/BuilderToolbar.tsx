import React from 'react';
import { useBuilder } from './BuilderContext';
import {
  Monitor, Tablet, Smartphone, Eye, EyeOff,
  Undo2, Redo2, Save, ZoomIn, ZoomOut,
  Grid3X3, Layers, Download, Code2, ArrowLeft,
  RotateCcw, Maximize2, Globe, Search, Palette,
  Rocket, Settings, CheckCircle, Loader2,
} from 'lucide-react';
import { DeviceType, DEVICE_WIDTHS } from './types';
import { useTranslation } from '../../lib/i18n';
import Link from 'next/link';

const deviceOptions: { type: DeviceType; icon: React.FC<any>; labelKey: string; width: number }[] = [
  { type: 'desktop', icon: Monitor, labelKey: 'wb.toolbar.desktop', width: DEVICE_WIDTHS.desktop },
  { type: 'tablet', icon: Tablet, labelKey: 'wb.toolbar.tablet', width: DEVICE_WIDTHS.tablet },
  { type: 'mobile', icon: Smartphone, labelKey: 'wb.toolbar.mobile', width: DEVICE_WIDTHS.mobile },
];

export default function BuilderToolbar() {
  const { state, dispatch, currentPage, saveToLocalStorage } = useBuilder();
  const { t } = useTranslation();

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const publishStatus = state.siteConfig?.publish?.status;

  const handleSave = () => {
    dispatch({ type: 'SET_SAVING', isSaving: true });
    saveToLocalStorage();
    setTimeout(() => dispatch({ type: 'SET_SAVING', isSaving: false }), 800);
  };

  const handleExportHTML = () => {
    if (!currentPage) return;
    const seo = currentPage.seo;
    const theme = state.siteConfig?.theme;
    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo?.metaTitle || currentPage.settings.title || currentPage.name}</title>
  <meta name="description" content="${seo?.metaDescription || ''}">
  <meta name="keywords" content="${seo?.metaKeywords?.join(', ') || ''}">
  ${seo?.canonicalUrl ? `<link rel="canonical" href="${seo.canonicalUrl}">` : ''}
  <meta property="og:title" content="${seo?.ogTitle || seo?.metaTitle || currentPage.name}">
  <meta property="og:description" content="${seo?.ogDescription || seo?.metaDescription || ''}">
  ${seo?.ogImage ? `<meta property="og:image" content="${seo.ogImage}">` : ''}
  <meta property="og:type" content="${seo?.ogType || 'website'}">
  <meta name="twitter:card" content="${seo?.twitterCard || 'summary_large_image'}">
  ${!seo?.robotsIndex ? '<meta name="robots" content="noindex">' : ''}
  ${seo?.analyticsId ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${seo.analyticsId}"></script>` : ''}
  ${seo?.customHeadTags || ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${theme?.fontBody || currentPage.settings.fontFamily}; background: ${currentPage.settings.backgroundColor}; color: ${theme?.colorText || '#1f2937'}; }
    .container { max-width: ${currentPage.settings.maxWidth}; margin: 0 auto; padding: ${currentPage.settings.padding}; }
    @media (max-width: 768px) { .container { padding: 16px; } }
  </style>
</head>
<body>
  <div class="container">
    <p>Halaman: ${currentPage.name}</p>
    <p>Widget: ${currentPage.widgets.length} komponen</p>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPage.slug || 'page'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 flex-shrink-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <Link
          href="/hq/website-builder"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline font-medium">{t('wb.toolbar.back')}</span>
        </Link>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Page Name */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 max-w-[160px] truncate">
            {currentPage?.name || t('wb.toolbar.newPage')}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            currentPage?.status === 'published'
              ? 'bg-green-100 text-green-700'
              : currentPage?.status === 'scheduled'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {currentPage?.status === 'published' ? t('wb.common.published') : currentPage?.status === 'scheduled' ? t('wb.common.scheduled') : t('wb.common.draft')}
          </span>
        </div>
      </div>

      {/* Center Section - Device Preview with dimensions */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {deviceOptions.map(({ type, icon: Icon, labelKey, width }) => (
          <button
            key={type}
            onClick={() => dispatch({ type: 'SET_DEVICE', device: type })}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              state.devicePreview === type
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title={`${t(labelKey)} (${width}px)`}
          >
            <Icon size={14} />
            <span className="hidden md:inline">{t(labelKey)}</span>
            {state.devicePreview === type && (
              <span className="hidden lg:inline text-[10px] text-blue-400 ml-0.5">{width}px</span>
            )}
          </button>
        ))}
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-1">
        {/* Undo / Redo */}
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!canUndo}
          className={`p-1.5 rounded-md transition-colors ${
            canUndo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
          }`}
          title={`${t('wb.common.undo')} (Ctrl+Z)`}
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={!canRedo}
          className={`p-1.5 rounded-md transition-colors ${
            canRedo ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'
          }`}
          title={`${t('wb.common.redo')} (Ctrl+Y)`}
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        {/* Zoom */}
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom - 10 })}
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          title={t('wb.common.zoomOut')}
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: 100 })}
          className="px-2 py-1 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors min-w-[44px] text-center"
          title={t('wb.common.resetZoom')}
        >
          {state.zoom}%
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoom + 10 })}
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
          title={t('wb.common.zoomIn')}
        >
          <ZoomIn size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        {/* Toggle Grid */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
          className={`p-1.5 rounded-md transition-colors ${
            state.showGrid ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title={t('wb.toolbar.toggleGrid')}
        >
          <Grid3X3 size={16} />
        </button>

        {/* SEO */}
        <button
          onClick={() => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'seo' })}
          className={`p-1.5 rounded-md transition-colors ${
            state.rightPanelTab === 'seo' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title={t('wb.toolbar.seoSettings')}
        >
          <Search size={16} />
        </button>

        {/* Theme */}
        <button
          onClick={() => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'theme' })}
          className={`p-1.5 rounded-md transition-colors ${
            state.rightPanelTab === 'theme' ? 'text-pink-600 bg-pink-50' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title={t('wb.toolbar.themeStyle')}
        >
          <Palette size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-0.5" />

        {/* Preview */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_PREVIEW' })}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            state.isPreviewing
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={`${t('wb.common.preview')} (Ctrl+P)`}
        >
          {state.isPreviewing ? <EyeOff size={14} /> : <Eye size={14} />}
          <span className="hidden sm:inline">{state.isPreviewing ? t('wb.toolbar.editMode') : t('wb.toolbar.previewMode')}</span>
        </button>

        {/* Export */}
        <button
          onClick={handleExportHTML}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          title={t('wb.common.exportHTML')}
        >
          <Download size={16} />
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-semibold
            hover:bg-gray-900 transition-colors shadow-sm"
        >
          {state.isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span className="hidden sm:inline">{state.isSaving ? t('wb.common.saving') : t('wb.common.save')}</span>
        </button>

        {/* Publish */}
        <button
          onClick={() => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'publish' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
            publishStatus === 'published'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700'
          }`}
        >
          {publishStatus === 'published' ? <CheckCircle size={14} /> : <Rocket size={14} />}
          <span className="hidden sm:inline">{publishStatus === 'published' ? t('wb.common.published') : t('wb.common.publish')}</span>
        </button>
      </div>
    </div>
  );
}
