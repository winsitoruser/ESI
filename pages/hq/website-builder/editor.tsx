import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { BuilderProvider, useBuilder } from '@/components/website-builder/BuilderContext';
import BuilderToolbar from '@/components/website-builder/BuilderToolbar';
import BuilderCanvas from '@/components/website-builder/BuilderCanvas';
import WidgetPanel from '@/components/website-builder/WidgetPanel';
import PropertyEditor from '@/components/website-builder/PropertyEditor';
import LayersPanel from '@/components/website-builder/LayersPanel';
import PageManager from '@/components/website-builder/PageManager';
import SEOPanel from '@/components/website-builder/SEOPanel';
import PublishSettings from '@/components/website-builder/PublishSettings';
import ThemePanel from '@/components/website-builder/ThemePanel';
import SectionTemplatePicker from '@/components/website-builder/SectionTemplatePicker';
import {
  Blocks, FileText, Layers, PanelRightClose, PanelRightOpen,
  Search, Palette, Globe, Settings2, Sliders,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

function EditorContent() {
  const router = useRouter();
  const { pageId } = router.query;
  const { state, dispatch, loadFromLocalStorage, saveToLocalStorage, initSiteConfig, createPage } = useBuilder();
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
    setLoaded(true);
  }, [loadFromLocalStorage]);

  // Initialize site config if not present
  useEffect(() => {
    if (state.pages.length > 0 && !state.siteConfig) {
      initSiteConfig('My Website');
    }
  }, [state.pages.length, state.siteConfig, initSiteConfig]);

  // Auto-create a default page if none exist after loading
  useEffect(() => {
    if (loaded && state.pages.length === 0) {
      const page = createPage('Beranda', 'beranda');
      dispatch({ type: 'SET_CURRENT_PAGE', id: page.id });
    }
  }, [loaded, state.pages.length, createPage, dispatch]);

  useEffect(() => {
    if (pageId && typeof pageId === 'string' && state.pages.length > 0) {
      const page = state.pages.find(p => p.id === pageId);
      if (page) {
        dispatch({ type: 'SET_CURRENT_PAGE', id: page.id });
      }
    } else if (state.pages.length > 0 && !state.currentPageId) {
      dispatch({ type: 'SET_CURRENT_PAGE', id: state.pages[0].id });
    }
  }, [pageId, state.pages.length, state.currentPageId, dispatch]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMeta = e.metaKey || e.ctrlKey;

    if (isMeta && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      dispatch({ type: 'UNDO' });
    }
    if (isMeta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      dispatch({ type: 'REDO' });
    }
    if (isMeta && e.key === 's') {
      e.preventDefault();
      saveToLocalStorage();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedWidgetId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        dispatch({ type: 'PUSH_HISTORY', description: 'Hapus widget' });
        dispatch({ type: 'DELETE_WIDGET', id: state.selectedWidgetId });
      }
    }
    if (e.key === 'Escape') {
      dispatch({ type: 'SELECT_WIDGET', id: null });
      dispatch({ type: 'SELECT_SECTION', sectionId: null });
      if (state.isPreviewing) dispatch({ type: 'TOGGLE_PREVIEW' });
      if (state.showSectionPicker) dispatch({ type: 'HIDE_SECTION_PICKER' });
    }
    if (isMeta && e.key === 'p') {
      e.preventDefault();
      dispatch({ type: 'TOGGLE_PREVIEW' });
    }
  }, [dispatch, state.selectedWidgetId, state.isPreviewing, state.showSectionPicker, saveToLocalStorage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.pages.length > 0) saveToLocalStorage();
    }, 30000);
    return () => clearInterval(interval);
  }, [state.pages, saveToLocalStorage]);

  const leftPanelTabs = [
    { id: 'widgets' as const, icon: Blocks, label: t('wb.panel.widgets') },
    { id: 'pages' as const, icon: FileText, label: t('wb.panel.pages') },
    { id: 'layers' as const, icon: Layers, label: t('wb.panel.layers') },
  ];

  const rightPanelTabs = [
    { id: 'properties' as const, icon: Sliders, label: t('wb.panel.properties') },
    { id: 'seo' as const, icon: Search, label: t('wb.panel.seo') },
    { id: 'theme' as const, icon: Palette, label: t('wb.panel.theme') },
    { id: 'publish' as const, icon: Globe, label: t('wb.panel.publish') },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <Head>
        <title>Website Builder - {state.pages.find(p => p.id === state.currentPageId)?.name || 'Editor'}</title>
      </Head>

      {/* Top Toolbar */}
      <BuilderToolbar />

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {!state.isPreviewing && (
          <div className="flex flex-shrink-0 h-full">
            {/* Tab Switcher */}
            <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-2 gap-1">
              {leftPanelTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => dispatch({ type: 'SET_LEFT_PANEL', tab: tab.id })}
                  className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    state.leftPanelTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  }`}
                  title={tab.label}
                >
                  <tab.icon size={18} />
                  <span className="text-[9px] font-medium leading-none">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="w-72 bg-white border-r border-gray-200 overflow-hidden">
              {state.leftPanelTab === 'widgets' && <WidgetPanel />}
              {state.leftPanelTab === 'pages' && <PageManager />}
              {state.leftPanelTab === 'layers' && <LayersPanel />}
            </div>
          </div>
        )}

        {/* Canvas */}
        <BuilderCanvas />

        {/* Right Panel */}
        {!state.isPreviewing && state.rightPanelOpen && (
          <div className="flex flex-shrink-0 h-full">
            {/* Right Panel Content */}
            <div className="w-80 bg-white border-l border-gray-200 overflow-hidden flex flex-col">
              {/* Right Panel Tab Bar */}
              <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
                {rightPanelTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: tab.id })}
                    className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors border-b-2 ${
                      state.rightPanelTab === tab.id
                        ? 'text-blue-600 border-blue-500 bg-white'
                        : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title={tab.label}
                  >
                    <tab.icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-hidden">
                {state.rightPanelTab === 'properties' && <PropertyEditor />}
                {state.rightPanelTab === 'seo' && <SEOPanel />}
                {state.rightPanelTab === 'theme' && <ThemePanel />}
                {state.rightPanelTab === 'publish' && <PublishSettings />}
              </div>
            </div>
          </div>
        )}

        {/* Right Panel Toggle */}
        {!state.isPreviewing && (
          <button
            onClick={() => dispatch({ type: 'SET_RIGHT_PANEL', open: !state.rightPanelOpen })}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-white border border-gray-200
              border-r-0 rounded-l-md flex items-center justify-center text-gray-400 hover:text-gray-600
              hover:bg-gray-50 transition-colors shadow-sm"
            style={{ right: state.rightPanelOpen ? '320px' : 0 }}
            title={state.rightPanelOpen ? t('wb.common.close') : t('wb.common.settings')}
          >
            {state.rightPanelOpen ? <PanelRightClose size={12} /> : <PanelRightOpen size={12} />}
          </button>
        )}
      </div>

      {/* Section Template Picker Modal */}
      <SectionTemplatePicker />

      {/* Status Bar */}
      <div className="h-6 bg-white border-t border-gray-200 flex items-center justify-between px-3 text-[10px] text-gray-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>Section: {state.pages.find(p => p.id === state.currentPageId)?.sections?.length || 0}</span>
          <span>Widget: {state.pages.find(p => p.id === state.currentPageId)?.widgets.length || 0}</span>
          <span>{t('wb.common.grid')}: {state.showGrid ? 'ON' : 'OFF'}</span>
          <span>{t('wb.common.device')}: {state.devicePreview} ({state.devicePreview === 'desktop' ? '1440' : state.devicePreview === 'tablet' ? '768' : '375'}px)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Zoom: {state.zoom}%</span>
          <span>{t('wb.common.history')}: {state.historyIndex + 1}/{state.history.length}</span>
          {state.lastSavedAt && (
            <span className="text-green-500">
              {t('wb.common.savedAt', { time: new Date(state.lastSavedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) })}
            </span>
          )}
          {!state.lastSavedAt && <span className="text-green-500">{t('wb.common.autoSaveActive')}</span>}
          {state.siteConfig?.publish?.status === 'published' && (
            <span className="text-blue-500 flex items-center gap-1">● {t('wb.common.published')}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function WebsiteBuilderEditorInner() {
  return (
    <BuilderProvider>
      <EditorContent />
    </BuilderProvider>
  );
}

export default dynamic(() => Promise.resolve(WebsiteBuilderEditorInner), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading Editor...</p>
      </div>
    </div>
  ),
});
