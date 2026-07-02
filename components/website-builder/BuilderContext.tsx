import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import {
  BuilderState, BuilderPage, WidgetInstance, DeviceType, HistoryEntry,
  SiteConfig, DomainSettings, PublishConfig, ThemeSettings, SEOSettings,
  Section, SectionStyle, DEFAULT_SECTION_STYLE,
  DEFAULT_SEO, DEFAULT_DOMAIN, DEFAULT_PUBLISH, DEFAULT_THEME,
  BuilderRow, BuilderColumn, RowStyle, ColumnStyle,
  DEFAULT_ROW_STYLE, DEFAULT_COLUMN_STYLE,
} from './types';
import { getWidgetDefinition } from './widgets/registry';
import { v4 as uuidv4 } from 'uuid';

type BuilderAction =
  | { type: 'SET_PAGES'; pages: BuilderPage[] }
  | { type: 'ADD_PAGE'; page: BuilderPage }
  | { type: 'UPDATE_PAGE'; id: string; updates: Partial<BuilderPage> }
  | { type: 'DELETE_PAGE'; id: string }
  | { type: 'SET_CURRENT_PAGE'; id: string | null }
  | { type: 'ADD_WIDGET'; widget: WidgetInstance }
  | { type: 'UPDATE_WIDGET'; id: string; updates: Partial<WidgetInstance> }
  | { type: 'UPDATE_WIDGET_PROPERTY'; widgetId: string; key: string; value: any }
  | { type: 'DELETE_WIDGET'; id: string }
  | { type: 'DUPLICATE_WIDGET'; id: string }
  | { type: 'UPDATE_LAYOUTS'; layouts: any[] }
  | { type: 'SELECT_WIDGET'; id: string | null }
  | { type: 'HOVER_WIDGET'; id: string | null }
  | { type: 'SET_DEVICE'; device: DeviceType }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_PREVIEW' }
  | { type: 'TOGGLE_LAYERS' }
  | { type: 'SET_LEFT_PANEL'; tab: 'widgets' | 'pages' | 'layers' }
  | { type: 'SET_RIGHT_PANEL'; open: boolean }
  | { type: 'SET_RIGHT_PANEL_TAB'; tab: 'properties' | 'seo' | 'theme' | 'publish' }
  | { type: 'SET_DRAGGING'; isDragging: boolean; widgetType?: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY'; description: string }
  | { type: 'MOVE_WIDGET_ORDER'; fromIndex: number; toIndex: number }
  | { type: 'LOCK_WIDGET'; id: string }
  | { type: 'TOGGLE_WIDGET_VISIBILITY'; id: string }
  | { type: 'SET_SITE_CONFIG'; config: SiteConfig }
  | { type: 'UPDATE_DOMAIN'; domain: Partial<DomainSettings> }
  | { type: 'UPDATE_PUBLISH_CONFIG'; config: Partial<PublishConfig> }
  | { type: 'UPDATE_THEME'; theme: Partial<ThemeSettings> }
  | { type: 'UPDATE_PAGE_SEO'; pageId: string; seo: Partial<SEOSettings> }
  | { type: 'UPDATE_GLOBAL_SEO'; seo: Partial<SEOSettings> }
  | { type: 'TOGGLE_PUBLISH_MODAL' }
  | { type: 'TOGGLE_RESPONSIVE_PREVIEW' }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SET_LAST_SAVED'; time: string }
  | { type: 'PUBLISH_SITE' }
  | { type: 'UNPUBLISH_SITE' }
  | { type: 'ADD_SECTION'; section: Section }
  | { type: 'DELETE_SECTION'; sectionId: string }
  | { type: 'UPDATE_SECTION'; sectionId: string; updates: Partial<Section> }
  | { type: 'UPDATE_SECTION_STYLE'; sectionId: string; style: Partial<SectionStyle> }
  | { type: 'MOVE_SECTION'; sectionId: string; direction: 'up' | 'down' }
  | { type: 'DUPLICATE_SECTION'; sectionId: string }
  | { type: 'SELECT_SECTION'; sectionId: string | null }
  | { type: 'TOGGLE_SECTION_COLLAPSE'; sectionId: string }
  | { type: 'ADD_WIDGET_TO_SECTION'; sectionId: string; widget: WidgetInstance }
  | { type: 'DELETE_WIDGET_FROM_SECTION'; sectionId: string; widgetId: string }
  | { type: 'UPDATE_SECTION_LAYOUTS'; sectionId: string; layouts: any[] }
  | { type: 'SHOW_SECTION_PICKER'; insertIndex: number }
  | { type: 'HIDE_SECTION_PICKER' }
  // ===== ROW ACTIONS =====
  | { type: 'ADD_ROW'; sectionId: string; row: BuilderRow; insertIndex?: number }
  | { type: 'DELETE_ROW'; sectionId: string; rowId: string }
  | { type: 'UPDATE_ROW'; sectionId: string; rowId: string; updates: Partial<BuilderRow> }
  | { type: 'UPDATE_ROW_STYLE'; sectionId: string; rowId: string; style: Partial<RowStyle> }
  | { type: 'MOVE_ROW'; sectionId: string; rowId: string; direction: 'up' | 'down' }
  | { type: 'DUPLICATE_ROW'; sectionId: string; rowId: string }
  | { type: 'TOGGLE_ROW_COLLAPSE'; sectionId: string; rowId: string }
  | { type: 'SELECT_ROW'; rowId: string | null }
  // ===== COLUMN ACTIONS =====
  | { type: 'ADD_COLUMN'; sectionId: string; rowId: string; column: BuilderColumn }
  | { type: 'DELETE_COLUMN'; sectionId: string; rowId: string; columnId: string }
  | { type: 'UPDATE_COLUMN'; sectionId: string; rowId: string; columnId: string; updates: Partial<BuilderColumn> }
  | { type: 'UPDATE_COLUMN_STYLE'; sectionId: string; rowId: string; columnId: string; style: Partial<ColumnStyle> }
  | { type: 'RESIZE_COLUMN'; sectionId: string; rowId: string; columnId: string; width: number }
  | { type: 'SELECT_COLUMN'; columnId: string | null }
  // ===== WIDGET IN COLUMN =====
  | { type: 'ADD_WIDGET_TO_COLUMN'; sectionId: string; rowId: string; columnId: string; widget: WidgetInstance }
  | { type: 'DELETE_WIDGET_FROM_COLUMN'; sectionId: string; rowId: string; columnId: string; widgetId: string }
  | { type: 'MOVE_WIDGET_IN_COLUMN'; sectionId: string; rowId: string; columnId: string; fromIndex: number; toIndex: number }
  // ===== ROW LAYOUT PICKER =====
  | { type: 'SHOW_ROW_LAYOUT_PICKER'; sectionId: string; insertIndex: number }
  | { type: 'HIDE_ROW_LAYOUT_PICKER' }
  | { type: 'APPLY_ROW_LAYOUT'; sectionId: string; rowId: string; columnWidths: number[] };

const initialState: BuilderState = {
  siteConfig: null,
  pages: [],
  currentPageId: null,
  selectedWidgetId: null,
  hoveredWidgetId: null,
  devicePreview: 'desktop',
  zoom: 100,
  showGrid: true,
  isDragging: false,
  history: [],
  historyIndex: -1,
  isPreviewing: false,
  showLayers: false,
  leftPanelTab: 'widgets',
  rightPanelTab: 'properties',
  rightPanelOpen: true,
  droppingWidgetType: null,
  showPublishModal: false,
  showResponsivePreview: false,
  showSectionPicker: false,
  sectionPickerInsertIndex: -1,
  selectedSectionId: null,
  selectedRowId: null,
  selectedColumnId: null,
  showRowLayoutPicker: false,
  rowLayoutPickerSectionId: null,
  rowLayoutPickerInsertIndex: -1,
  responsivePreviewUrl: '',
  isSaving: false,
  lastSavedAt: null,
};

function getCurrentPage(state: BuilderState): BuilderPage | undefined {
  return state.pages.find(p => p.id === state.currentPageId);
}

function getCurrentPageWidgets(state: BuilderState): WidgetInstance[] {
  return getCurrentPage(state)?.widgets || [];
}

function getCurrentPageSections(state: BuilderState): Section[] {
  return getCurrentPage(state)?.sections || [];
}

function updateCurrentPageWidgets(state: BuilderState, widgets: WidgetInstance[]): BuilderPage[] {
  return state.pages.map(p =>
    p.id === state.currentPageId
      ? { ...p, widgets, updatedAt: new Date().toISOString() }
      : p
  );
}

function updateCurrentPageSections(state: BuilderState, sections: Section[]): BuilderPage[] {
  return state.pages.map(p =>
    p.id === state.currentPageId
      ? { ...p, sections, updatedAt: new Date().toISOString() }
      : p
  );
}

// Find which section a widget lives in (returns null if in flat widgets)
function findWidgetSection(state: BuilderState, widgetId: string): string | null {
  const sections = getCurrentPageSections(state);
  for (const s of sections) {
    // Check legacy flat widgets
    if (s.widgets.some(w => w.id === widgetId)) return s.id;
    // Check row/column widgets
    for (const row of (s.rows || [])) {
      for (const col of row.columns) {
        if (col.widgets.some(w => w.id === widgetId)) return s.id;
      }
    }
  }
  return null;
}

// Find which column a widget lives in
function findWidgetLocation(state: BuilderState, widgetId: string): { sectionId: string; rowId: string; columnId: string } | null {
  const sections = getCurrentPageSections(state);
  for (const s of sections) {
    for (const row of (s.rows || [])) {
      for (const col of row.columns) {
        if (col.widgets.some(w => w.id === widgetId)) {
          return { sectionId: s.id, rowId: row.id, columnId: col.id };
        }
      }
    }
  }
  return null;
}

// Helper to update a section's rows
function updateSectionRows(
  state: BuilderState,
  sectionId: string,
  updater: (rows: BuilderRow[]) => BuilderRow[]
): BuilderPage[] {
  const sections = getCurrentPageSections(state).map(s =>
    s.id === sectionId ? { ...s, rows: updater(s.rows || []) } : s
  );
  return state.pages.map(p =>
    p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
  );
}

// Helper to update a specific row in a section
function updateRowInSection(
  state: BuilderState,
  sectionId: string,
  rowId: string,
  updater: (row: BuilderRow) => BuilderRow
): BuilderPage[] {
  return updateSectionRows(state, sectionId, rows =>
    rows.map(r => r.id === rowId ? updater(r) : r)
  );
}

// Helper to update a specific column in a row
function updateColumnInRow(
  state: BuilderState,
  sectionId: string,
  rowId: string,
  columnId: string,
  updater: (col: BuilderColumn) => BuilderColumn
): BuilderPage[] {
  return updateRowInSection(state, sectionId, rowId, row => ({
    ...row,
    columns: row.columns.map(c => c.id === columnId ? updater(c) : c),
  }));
}

// Update a widget in either flat widgets or sections
function updateWidgetAnywhere(
  state: BuilderState,
  widgetId: string,
  updater: (w: WidgetInstance) => WidgetInstance
): BuilderPage[] {
  const sectionId = findWidgetSection(state, widgetId);
  if (sectionId) {
    const sections = getCurrentPageSections(state).map(s =>
      s.id === sectionId
        ? { ...s, widgets: s.widgets.map(w => w.id === widgetId ? updater(w) : w) }
        : s
    );
    return state.pages.map(p =>
      p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
    );
  }
  const widgets = getCurrentPageWidgets(state).map(w => w.id === widgetId ? updater(w) : w);
  return updateCurrentPageWidgets(state, widgets);
}

// Delete a widget from either flat widgets or sections
function deleteWidgetAnywhere(state: BuilderState, widgetId: string): BuilderPage[] {
  const sectionId = findWidgetSection(state, widgetId);
  if (sectionId) {
    const sections = getCurrentPageSections(state).map(s =>
      s.id === sectionId
        ? { ...s, widgets: s.widgets.filter(w => w.id !== widgetId) }
        : s
    );
    return state.pages.map(p =>
      p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
    );
  }
  const widgets = getCurrentPageWidgets(state).filter(w => w.id !== widgetId);
  return updateCurrentPageWidgets(state, widgets);
}

// Duplicate a widget in either flat widgets or sections
function duplicateWidgetAnywhere(state: BuilderState, widgetId: string): { pages: BuilderPage[]; newId: string } | null {
  const newId = uuidv4();
  const sectionId = findWidgetSection(state, widgetId);
  if (sectionId) {
    const sections = getCurrentPageSections(state).map(s => {
      if (s.id !== sectionId) return s;
      const source = s.widgets.find(w => w.id === widgetId);
      if (!source) return s;
      const dup: WidgetInstance = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        layout: { ...source.layout, i: newId, y: source.layout.y + source.layout.h },
      };
      return { ...s, widgets: [...s.widgets, dup] };
    });
    return {
      pages: state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      ),
      newId,
    };
  }
  const widgets = getCurrentPageWidgets(state);
  const source = widgets.find(w => w.id === widgetId);
  if (!source) return null;
  const dup: WidgetInstance = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    layout: { ...source.layout, i: newId, y: source.layout.y + source.layout.h },
  };
  return { pages: updateCurrentPageWidgets(state, [...widgets, dup]), newId };
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'SET_PAGES':
      return { ...state, pages: action.pages };

    case 'ADD_PAGE':
      return { ...state, pages: [...state.pages, action.page] };

    case 'UPDATE_PAGE':
      return {
        ...state,
        pages: state.pages.map(p =>
          p.id === action.id ? { ...p, ...action.updates, updatedAt: new Date().toISOString() } : p
        ),
      };

    case 'DELETE_PAGE': {
      const newPages = state.pages.filter(p => p.id !== action.id);
      return {
        ...state,
        pages: newPages,
        currentPageId: state.currentPageId === action.id
          ? (newPages[0]?.id || null)
          : state.currentPageId,
      };
    }

    case 'SET_CURRENT_PAGE':
      return { ...state, currentPageId: action.id, selectedWidgetId: null };

    case 'ADD_WIDGET': {
      const widgets = [...getCurrentPageWidgets(state), action.widget];
      return {
        ...state,
        pages: updateCurrentPageWidgets(state, widgets),
        selectedWidgetId: action.widget.id,
      };
    }

    case 'UPDATE_WIDGET': {
      const pages = updateWidgetAnywhere(state, action.id, w => ({ ...w, ...action.updates }));
      return { ...state, pages };
    }

    case 'UPDATE_WIDGET_PROPERTY': {
      const pages = updateWidgetAnywhere(state, action.widgetId, w => ({
        ...w, properties: { ...w.properties, [action.key]: action.value }
      }));
      return { ...state, pages };
    }

    case 'DELETE_WIDGET': {
      const pages = deleteWidgetAnywhere(state, action.id);
      return {
        ...state,
        pages,
        selectedWidgetId: state.selectedWidgetId === action.id ? null : state.selectedWidgetId,
      };
    }

    case 'DUPLICATE_WIDGET': {
      const result = duplicateWidgetAnywhere(state, action.id);
      if (!result) return state;
      return {
        ...state,
        pages: result.pages,
        selectedWidgetId: result.newId,
      };
    }

    case 'UPDATE_LAYOUTS': {
      const widgets = getCurrentPageWidgets(state).map(w => {
        const layoutItem = action.layouts.find((l: any) => l.i === w.id);
        if (layoutItem) {
          return { ...w, layout: { ...w.layout, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h } };
        }
        return w;
      });
      return { ...state, pages: updateCurrentPageWidgets(state, widgets) };
    }

    case 'SELECT_WIDGET':
      return { ...state, selectedWidgetId: action.id, rightPanelOpen: action.id !== null ? true : state.rightPanelOpen };

    case 'HOVER_WIDGET':
      return { ...state, hoveredWidgetId: action.id };

    case 'SET_DEVICE':
      return { ...state, devicePreview: action.device };

    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(200, Math.max(25, action.zoom)) };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'TOGGLE_PREVIEW':
      return { ...state, isPreviewing: !state.isPreviewing, selectedWidgetId: null };

    case 'TOGGLE_LAYERS':
      return { ...state, showLayers: !state.showLayers };

    case 'SET_LEFT_PANEL':
      return { ...state, leftPanelTab: action.tab };

    case 'SET_RIGHT_PANEL':
      return { ...state, rightPanelOpen: action.open };

    case 'SET_DRAGGING':
      return { ...state, isDragging: action.isDragging, droppingWidgetType: action.widgetType || null };

    case 'PUSH_HISTORY': {
      const widgets = getCurrentPageWidgets(state);
      const sections = getCurrentPageSections(state);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        widgets: JSON.parse(JSON.stringify(widgets)),
        sections: JSON.parse(JSON.stringify(sections)),
        timestamp: Date.now(),
        description: action.description,
      });
      if (newHistory.length > 50) newHistory.shift();
      return { ...state, history: newHistory, historyIndex: newHistory.length - 1 };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      let pages = updateCurrentPageWidgets(state, entry.widgets);
      if (entry.sections) {
        pages = pages.map(p =>
          p.id === state.currentPageId ? { ...p, sections: entry.sections!, updatedAt: new Date().toISOString() } : p
        );
      }
      return { ...state, pages, historyIndex: newIndex, selectedWidgetId: null };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      let pages = updateCurrentPageWidgets(state, entry.widgets);
      if (entry.sections) {
        pages = pages.map(p =>
          p.id === state.currentPageId ? { ...p, sections: entry.sections!, updatedAt: new Date().toISOString() } : p
        );
      }
      return { ...state, pages, historyIndex: newIndex, selectedWidgetId: null };
    }

    case 'MOVE_WIDGET_ORDER': {
      const widgets = [...getCurrentPageWidgets(state)];
      const [moved] = widgets.splice(action.fromIndex, 1);
      widgets.splice(action.toIndex, 0, moved);
      return { ...state, pages: updateCurrentPageWidgets(state, widgets) };
    }

    case 'LOCK_WIDGET': {
      const pages = updateWidgetAnywhere(state, action.id, w => ({ ...w, locked: !w.locked }));
      return { ...state, pages };
    }

    case 'TOGGLE_WIDGET_VISIBILITY': {
      const pages = updateWidgetAnywhere(state, action.id, w => ({ ...w, hidden: !w.hidden }));
      return { ...state, pages };
    }

    case 'SET_SITE_CONFIG':
      return { ...state, siteConfig: action.config };

    case 'UPDATE_DOMAIN':
      if (!state.siteConfig) return state;
      return { ...state, siteConfig: { ...state.siteConfig, domain: { ...state.siteConfig.domain, ...action.domain } } };

    case 'UPDATE_PUBLISH_CONFIG':
      if (!state.siteConfig) return state;
      return { ...state, siteConfig: { ...state.siteConfig, publish: { ...state.siteConfig.publish, ...action.config } } };

    case 'UPDATE_THEME':
      if (!state.siteConfig) return state;
      return { ...state, siteConfig: { ...state.siteConfig, theme: { ...state.siteConfig.theme, ...action.theme } } };

    case 'UPDATE_PAGE_SEO': {
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, seo: { ...p.seo, ...action.seo } } : p
      );
      return { ...state, pages };
    }

    case 'UPDATE_GLOBAL_SEO':
      if (!state.siteConfig) return state;
      return { ...state, siteConfig: { ...state.siteConfig, globalSeo: { ...state.siteConfig.globalSeo, ...action.seo } } };

    case 'SET_RIGHT_PANEL_TAB':
      return { ...state, rightPanelTab: action.tab, rightPanelOpen: true };

    case 'TOGGLE_PUBLISH_MODAL':
      return { ...state, showPublishModal: !state.showPublishModal };

    case 'TOGGLE_RESPONSIVE_PREVIEW':
      return { ...state, showResponsivePreview: !state.showResponsivePreview };

    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving };

    case 'SET_LAST_SAVED':
      return { ...state, lastSavedAt: action.time };

    case 'PUBLISH_SITE':
      if (!state.siteConfig) return state;
      return {
        ...state,
        siteConfig: {
          ...state.siteConfig,
          publish: { ...state.siteConfig.publish, status: 'published', publishedAt: new Date().toISOString(), version: state.siteConfig.publish.version + 1 },
        },
        pages: state.pages.map(p => ({ ...p, status: 'published' as const, publishedAt: new Date().toISOString() })),
      };

    case 'UNPUBLISH_SITE':
      if (!state.siteConfig) return state;
      return {
        ...state,
        siteConfig: {
          ...state.siteConfig,
          publish: { ...state.siteConfig.publish, status: 'unpublished' },
        },
        pages: state.pages.map(p => ({ ...p, status: 'draft' as const })),
      };

    // ===== SECTION ACTIONS =====
    case 'ADD_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = [...(page.sections || []), action.section];
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages, selectedSectionId: action.section.id, showSectionPicker: false };
    }

    case 'DELETE_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).filter(s => s.id !== action.sectionId)
        .map((s, i) => ({ ...s, order: i }));
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages, selectedSectionId: state.selectedSectionId === action.sectionId ? null : state.selectedSectionId };
    }

    case 'UPDATE_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).map(s =>
        s.id === action.sectionId ? { ...s, ...action.updates } : s
      );
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages };
    }

    case 'UPDATE_SECTION_STYLE': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).map(s =>
        s.id === action.sectionId ? { ...s, style: { ...s.style, ...action.style } } : s
      );
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages };
    }

    case 'MOVE_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = [...(page.sections || [])].sort((a, b) => a.order - b.order);
      const idx = sections.findIndex(s => s.id === action.sectionId);
      if (idx < 0) return state;
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= sections.length) return state;
      [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
      const reordered = sections.map((s, i) => ({ ...s, order: i }));
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections: reordered, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages };
    }

    case 'DUPLICATE_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const source = (page.sections || []).find(s => s.id === action.sectionId);
      if (!source) return state;
      const newId = uuidv4();
      const duplicatedWidgets = source.widgets.map(w => {
        const wId = uuidv4();
        return { ...JSON.parse(JSON.stringify(w)), id: wId, layout: { ...w.layout, i: wId } };
      });
      const dup: Section = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (copy)`,
        widgets: duplicatedWidgets,
        order: source.order + 1,
      };
      const allSections = [...(page.sections || [])];
      allSections.splice(source.order + 1, 0, dup);
      const reordered = allSections.map((s, i) => ({ ...s, order: i }));
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections: reordered, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages, selectedSectionId: newId };
    }

    case 'SELECT_SECTION':
      return { ...state, selectedSectionId: action.sectionId, selectedWidgetId: action.sectionId ? null : state.selectedWidgetId };

    case 'TOGGLE_SECTION_COLLAPSE': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).map(s =>
        s.id === action.sectionId ? { ...s, collapsed: !s.collapsed } : s
      );
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections } : p
      );
      return { ...state, pages };
    }

    case 'ADD_WIDGET_TO_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).map(s =>
        s.id === action.sectionId ? { ...s, widgets: [...s.widgets, action.widget] } : s
      );
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages, selectedWidgetId: action.widget.id };
    }

    case 'DELETE_WIDGET_FROM_SECTION': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).map(s =>
        s.id === action.sectionId ? { ...s, widgets: s.widgets.filter(w => w.id !== action.widgetId) } : s
      );
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages, selectedWidgetId: state.selectedWidgetId === action.widgetId ? null : state.selectedWidgetId };
    }

    case 'UPDATE_SECTION_LAYOUTS': {
      const page = state.pages.find(p => p.id === state.currentPageId);
      if (!page) return state;
      const sections = (page.sections || []).map(s => {
        if (s.id !== action.sectionId) return s;
        const widgets = s.widgets.map(w => {
          const li = action.layouts.find((l: any) => l.i === w.id);
          if (li) return { ...w, layout: { ...w.layout, x: li.x, y: li.y, w: li.w, h: li.h } };
          return w;
        });
        return { ...s, widgets };
      });
      const pages = state.pages.map(p =>
        p.id === state.currentPageId ? { ...p, sections, updatedAt: new Date().toISOString() } : p
      );
      return { ...state, pages };
    }

    case 'SHOW_SECTION_PICKER':
      return { ...state, showSectionPicker: true, sectionPickerInsertIndex: action.insertIndex };

    case 'HIDE_SECTION_PICKER':
      return { ...state, showSectionPicker: false, sectionPickerInsertIndex: -1 };

    // ===== ROW ACTIONS =====
    case 'ADD_ROW': {
      const pages = updateSectionRows(state, action.sectionId, rows => {
        const newRows = [...rows];
        const idx = action.insertIndex !== undefined ? action.insertIndex : newRows.length;
        newRows.splice(idx, 0, action.row);
        return newRows.map((r, i) => ({ ...r, order: i }));
      });
      return { ...state, pages, selectedRowId: action.row.id };
    }

    case 'DELETE_ROW': {
      const pages = updateSectionRows(state, action.sectionId, rows =>
        rows.filter(r => r.id !== action.rowId).map((r, i) => ({ ...r, order: i }))
      );
      return {
        ...state,
        pages,
        selectedRowId: state.selectedRowId === action.rowId ? null : state.selectedRowId,
        selectedColumnId: null,
      };
    }

    case 'UPDATE_ROW': {
      const pages = updateRowInSection(state, action.sectionId, action.rowId, r => ({ ...r, ...action.updates }));
      return { ...state, pages };
    }

    case 'UPDATE_ROW_STYLE': {
      const pages = updateRowInSection(state, action.sectionId, action.rowId, r => ({
        ...r, style: { ...r.style, ...action.style },
      }));
      return { ...state, pages };
    }

    case 'MOVE_ROW': {
      const pages = updateSectionRows(state, action.sectionId, rows => {
        const sorted = [...rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex(r => r.id === action.rowId);
        if (idx < 0) return rows;
        const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= sorted.length) return rows;
        [sorted[idx], sorted[newIdx]] = [sorted[newIdx], sorted[idx]];
        return sorted.map((r, i) => ({ ...r, order: i }));
      });
      return { ...state, pages };
    }

    case 'DUPLICATE_ROW': {
      const pages = updateSectionRows(state, action.sectionId, rows => {
        const source = rows.find(r => r.id === action.rowId);
        if (!source) return rows;
        const newRowId = uuidv4();
        const dupCols = source.columns.map(c => ({
          ...JSON.parse(JSON.stringify(c)),
          id: uuidv4(),
          widgets: c.widgets.map(w => {
            const wId = uuidv4();
            return { ...JSON.parse(JSON.stringify(w)), id: wId, layout: { ...w.layout, i: wId } };
          }),
        }));
        const dup: BuilderRow = {
          ...JSON.parse(JSON.stringify(source)),
          id: newRowId,
          columns: dupCols,
          order: source.order + 1,
        };
        const newRows = [...rows];
        newRows.splice(source.order + 1, 0, dup);
        return newRows.map((r, i) => ({ ...r, order: i }));
      });
      return { ...state, pages };
    }

    case 'TOGGLE_ROW_COLLAPSE': {
      const pages = updateRowInSection(state, action.sectionId, action.rowId, r => ({
        ...r, collapsed: !r.collapsed,
      }));
      return { ...state, pages };
    }

    case 'SELECT_ROW':
      return {
        ...state,
        selectedRowId: action.rowId,
        selectedColumnId: null,
        selectedWidgetId: action.rowId ? null : state.selectedWidgetId,
      };

    // ===== COLUMN ACTIONS =====
    case 'ADD_COLUMN': {
      const pages = updateRowInSection(state, action.sectionId, action.rowId, row => ({
        ...row,
        columns: [...row.columns, action.column],
      }));
      return { ...state, pages, selectedColumnId: action.column.id };
    }

    case 'DELETE_COLUMN': {
      const pages = updateRowInSection(state, action.sectionId, action.rowId, row => {
        const remaining = row.columns.filter(c => c.id !== action.columnId);
        // Redistribute width equally
        const equalWidth = remaining.length > 0 ? 100 / remaining.length : 100;
        return { ...row, columns: remaining.map(c => ({ ...c, width: equalWidth })) };
      });
      return {
        ...state,
        pages,
        selectedColumnId: state.selectedColumnId === action.columnId ? null : state.selectedColumnId,
      };
    }

    case 'UPDATE_COLUMN': {
      const pages = updateColumnInRow(state, action.sectionId, action.rowId, action.columnId, c => ({
        ...c, ...action.updates,
      }));
      return { ...state, pages };
    }

    case 'UPDATE_COLUMN_STYLE': {
      const pages = updateColumnInRow(state, action.sectionId, action.rowId, action.columnId, c => ({
        ...c, style: { ...c.style, ...action.style },
      }));
      return { ...state, pages };
    }

    case 'RESIZE_COLUMN': {
      const pages = updateColumnInRow(state, action.sectionId, action.rowId, action.columnId, c => ({
        ...c, width: action.width,
      }));
      return { ...state, pages };
    }

    case 'SELECT_COLUMN':
      return {
        ...state,
        selectedColumnId: action.columnId,
        selectedWidgetId: action.columnId ? null : state.selectedWidgetId,
      };

    // ===== WIDGET IN COLUMN =====
    case 'ADD_WIDGET_TO_COLUMN': {
      const pages = updateColumnInRow(state, action.sectionId, action.rowId, action.columnId, c => ({
        ...c, widgets: [...c.widgets, action.widget],
      }));
      return { ...state, pages, selectedWidgetId: action.widget.id };
    }

    case 'DELETE_WIDGET_FROM_COLUMN': {
      const pages = updateColumnInRow(state, action.sectionId, action.rowId, action.columnId, c => ({
        ...c, widgets: c.widgets.filter(w => w.id !== action.widgetId),
      }));
      return {
        ...state,
        pages,
        selectedWidgetId: state.selectedWidgetId === action.widgetId ? null : state.selectedWidgetId,
      };
    }

    case 'MOVE_WIDGET_IN_COLUMN': {
      const pages = updateColumnInRow(state, action.sectionId, action.rowId, action.columnId, c => {
        const widgets = [...c.widgets];
        const [moved] = widgets.splice(action.fromIndex, 1);
        widgets.splice(action.toIndex, 0, moved);
        return { ...c, widgets };
      });
      return { ...state, pages };
    }

    // ===== ROW LAYOUT PICKER =====
    case 'SHOW_ROW_LAYOUT_PICKER':
      return {
        ...state,
        showRowLayoutPicker: true,
        rowLayoutPickerSectionId: action.sectionId,
        rowLayoutPickerInsertIndex: action.insertIndex,
      };

    case 'HIDE_ROW_LAYOUT_PICKER':
      return {
        ...state,
        showRowLayoutPicker: false,
        rowLayoutPickerSectionId: null,
        rowLayoutPickerInsertIndex: -1,
      };

    case 'APPLY_ROW_LAYOUT': {
      const pages = updateRowInSection(state, action.sectionId, action.rowId, row => {
        // Resize existing columns or create new ones to match layout
        const newColumns: BuilderColumn[] = action.columnWidths.map((width, i) => {
          const existing = row.columns[i];
          if (existing) {
            return { ...existing, width };
          }
          return {
            id: uuidv4(),
            width,
            widgets: [],
            style: { ...DEFAULT_COLUMN_STYLE },
          };
        });
        // If fewer columns now, merge extra widgets into last column
        if (row.columns.length > action.columnWidths.length) {
          const extraWidgets = row.columns
            .slice(action.columnWidths.length)
            .flatMap(c => c.widgets);
          if (newColumns.length > 0 && extraWidgets.length > 0) {
            newColumns[newColumns.length - 1] = {
              ...newColumns[newColumns.length - 1],
              widgets: [...newColumns[newColumns.length - 1].widgets, ...extraWidgets],
            };
          }
        }
        return { ...row, columns: newColumns };
      });
      return { ...state, pages };
    }

    default:
      return state;
  }
}

interface BuilderContextType {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  currentPage: BuilderPage | null;
  currentWidgets: WidgetInstance[];
  currentSections: Section[];
  selectedWidget: WidgetInstance | null;
  addWidget: (widgetType: string, x?: number, y?: number) => void;
  addWidgetToSection: (sectionId: string, widgetType: string, x?: number, y?: number) => void;
  addWidgetToColumn: (sectionId: string, rowId: string, columnId: string, widgetType: string) => void;
  addRow: (sectionId: string, columnWidths: number[], insertIndex?: number) => BuilderRow;
  createPage: (name: string, slug: string) => BuilderPage;
  addSection: (name: string, sectionType: Section['type'], insertIndex?: number, widgets?: WidgetInstance[], style?: Partial<SectionStyle>) => Section;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  initSiteConfig: (name: string) => void;
}

const BuilderContext = createContext<BuilderContextType | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  const currentPage = state.pages.find(p => p.id === state.currentPageId) || null;
  const currentWidgets = currentPage?.widgets || [];
  const currentSections = (currentPage?.sections || []).sort((a, b) => a.order - b.order);
  const selectedWidget = currentWidgets.find(w => w.id === state.selectedWidgetId)
    || currentSections.flatMap(s => s.widgets).find(w => w.id === state.selectedWidgetId)
    || currentSections.flatMap(s => (s.rows || []).flatMap(r => r.columns.flatMap(c => c.widgets))).find(w => w.id === state.selectedWidgetId)
    || null;

  const addWidget = useCallback((widgetType: string, x = 0, y = 0) => {
    const def = getWidgetDefinition(widgetType);
    if (!def) return;

    const id = uuidv4();
    const props: Record<string, any> = {};
    def.properties.forEach(p => { props[p.key] = p.defaultValue; });

    const maxY = currentWidgets.reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0);

    const widget: WidgetInstance = {
      id,
      type: widgetType,
      properties: props,
      layout: {
        i: id,
        x: x,
        y: y > 0 ? y : maxY,
        w: def.defaultSize.w,
        h: def.defaultSize.h,
        minW: def.minSize?.w,
        minH: def.minSize?.h,
        maxW: def.maxSize?.w,
        maxH: def.maxSize?.h,
      },
    };

    dispatch({ type: 'PUSH_HISTORY', description: `Tambah ${def.name}` });
    dispatch({ type: 'ADD_WIDGET', widget });
  }, [currentWidgets, dispatch]);

  const addWidgetToSection = useCallback((sectionId: string, widgetType: string, x = 0, y = 0) => {
    const def = getWidgetDefinition(widgetType);
    if (!def) return;

    const section = currentSections.find(s => s.id === sectionId);
    const sectionWidgets = section?.widgets || [];
    const maxY = sectionWidgets.reduce((max, w) => Math.max(max, w.layout.y + w.layout.h), 0);

    const id = uuidv4();
    const props: Record<string, any> = {};
    def.properties.forEach(p => { props[p.key] = p.defaultValue; });

    const widget: WidgetInstance = {
      id,
      type: widgetType,
      properties: props,
      layout: {
        i: id,
        x,
        y: y > 0 ? y : maxY,
        w: def.defaultSize.w,
        h: def.defaultSize.h,
        minW: def.minSize?.w,
        minH: def.minSize?.h,
        maxW: def.maxSize?.w,
        maxH: def.maxSize?.h,
      },
    };

    dispatch({ type: 'PUSH_HISTORY', description: `Tambah ${def.name} ke section` });
    dispatch({ type: 'ADD_WIDGET_TO_SECTION', sectionId, widget });
  }, [currentSections, dispatch]);

  const addWidgetToColumn = useCallback((sectionId: string, rowId: string, columnId: string, widgetType: string) => {
    const def = getWidgetDefinition(widgetType);
    if (!def) return;
    const id = uuidv4();
    const props: Record<string, any> = {};
    def.properties.forEach(p => { props[p.key] = p.defaultValue; });
    const widget: WidgetInstance = {
      id,
      type: widgetType,
      properties: props,
      layout: { i: id, x: 0, y: 0, w: 12, h: def.defaultSize.h, minW: def.minSize?.w, minH: def.minSize?.h, maxW: def.maxSize?.w, maxH: def.maxSize?.h },
    };
    dispatch({ type: 'PUSH_HISTORY', description: `Tambah ${def.name} ke kolom` });
    dispatch({ type: 'ADD_WIDGET_TO_COLUMN', sectionId, rowId, columnId, widget });
  }, [dispatch]);

  const addRow = useCallback((sectionId: string, columnWidths: number[], insertIndex?: number): BuilderRow => {
    const row: BuilderRow = {
      id: uuidv4(),
      columns: columnWidths.map(w => ({
        id: uuidv4(),
        width: w,
        widgets: [],
        style: { ...DEFAULT_COLUMN_STYLE },
      })),
      style: { ...DEFAULT_ROW_STYLE },
      order: insertIndex ?? 0,
    };
    dispatch({ type: 'PUSH_HISTORY', description: 'Tambah row' });
    dispatch({ type: 'ADD_ROW', sectionId, row, insertIndex });
    return row;
  }, [dispatch]);

  const addSection = useCallback((
    name: string,
    sectionType: Section['type'],
    insertIndex?: number,
    widgets: WidgetInstance[] = [],
    style?: Partial<SectionStyle>,
  ): Section => {
    const order = insertIndex !== undefined ? insertIndex : currentSections.length;
    const section: Section = {
      id: uuidv4(),
      name,
      type: sectionType,
      widgets,
      rows: [],
      style: { ...DEFAULT_SECTION_STYLE, ...style },
      order,
    };
    dispatch({ type: 'PUSH_HISTORY', description: `Tambah section: ${name}` });
    dispatch({ type: 'ADD_SECTION', section });
    return section;
  }, [currentSections, dispatch]);

  const createPage = useCallback((name: string, slug: string): BuilderPage => {
    const page: BuilderPage = {
      id: uuidv4(),
      name,
      slug,
      widgets: [],
      sections: [],
      status: 'draft',
      settings: {
        title: name,
        description: '',
        backgroundColor: '#ffffff',
        maxWidth: '1200px',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
      },
      seo: { ...DEFAULT_SEO, metaTitle: name },
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PAGE', page });
    return page;
  }, [dispatch]);

  const initSiteConfig = useCallback((name: string) => {
    const config: SiteConfig = {
      id: uuidv4(),
      name,
      domain: { ...DEFAULT_DOMAIN },
      publish: { ...DEFAULT_PUBLISH },
      theme: { ...DEFAULT_THEME },
      globalSeo: {},
      pages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'SET_SITE_CONFIG', config });
  }, [dispatch]);

  const saveToLocalStorage = useCallback(() => {
    try {
      const data = {
        siteConfig: state.siteConfig,
        pages: state.pages,
      };
      localStorage.setItem('bedagang-website-builder', JSON.stringify(data));
      dispatch({ type: 'SET_LAST_SAVED', time: new Date().toISOString() });
    } catch (e) {
      console.error('Failed to save:', e);
    }
  }, [state.pages, state.siteConfig, dispatch]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('bedagang-website-builder');
      if (saved) {
        const data = JSON.parse(saved);
        // Support both old format (array) and new format (object with siteConfig)
        if (Array.isArray(data)) {
          const pages = data as BuilderPage[];
          // Migrate old pages: add sections, seo and version if missing
          const migratedPages = pages.map(p => ({
            ...p,
            sections: (p as any).sections || [],
            seo: p.seo || { ...DEFAULT_SEO, metaTitle: p.name },
            version: p.version || 1,
          }));
          dispatch({ type: 'SET_PAGES', pages: migratedPages });
          if (migratedPages.length > 0) {
            dispatch({ type: 'SET_CURRENT_PAGE', id: migratedPages[0].id });
          }
        } else if (data.pages) {
          const pages = (data.pages as BuilderPage[]).map(p => ({
            ...p,
            sections: (p as any).sections || [],
            seo: p.seo || { ...DEFAULT_SEO, metaTitle: p.name },
            version: p.version || 1,
          }));
          dispatch({ type: 'SET_PAGES', pages });
          if (data.siteConfig) {
            dispatch({ type: 'SET_SITE_CONFIG', config: data.siteConfig });
          }
          if (pages.length > 0) {
            dispatch({ type: 'SET_CURRENT_PAGE', id: pages[0].id });
          }
        }
      }
    } catch (e) {
      console.error('Failed to load:', e);
    }
  }, [dispatch]);

  return (
    <BuilderContext.Provider value={{
      state, dispatch, currentPage, currentWidgets, currentSections, selectedWidget,
      addWidget, addWidgetToSection, addWidgetToColumn, addRow, createPage, addSection,
      saveToLocalStorage, loadFromLocalStorage, initSiteConfig,
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider');
  return ctx;
}
