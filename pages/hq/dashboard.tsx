import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout';
import type { Layout, LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import HQLayout from '../../components/hq/HQLayout';
import { LayoutGrid, Plus, Save, RotateCcw, Edit, Sparkles, GripVertical, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { WidgetLayoutItem, WidgetSize, SIZE_TO_GRID, MODULE_COLORS } from '../../lib/widgets/types';
import { getWidgetById, DEFAULT_LAYOUT } from '../../lib/widgets/registry';
import WidgetPicker from '../../components/hq/dashboard/WidgetPicker';

const STORAGE_KEY = 'bedagang-dashboard-layout-v3';
const ROW_HEIGHT = 50;
const GRID_COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

function widgetSizeFromWidth(w: number): WidgetSize {
  if (w >= 10) return 'xl';
  if (w >= 7) return 'lg';
  if (w >= 4) return 'md';
  return 'sm';
}

function HQDashboardContent() {
  const { t } = useTranslation();
  // Initialize widgets with DEFAULT_LAYOUT to avoid empty state flash
  const [widgets, setWidgets] = useState<WidgetLayoutItem[]>([...DEFAULT_LAYOUT]);
  const [isEditMode, setIsEditMode] = useState(false);
  const { width: containerWidth, containerRef, mounted: containerMounted } = useContainerWidth();
  const [showPicker, setShowPicker] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const hasLoadedFromStorage = useRef(false);

  // Load layout from localStorage ONCE on mount
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.widgets?.length > 0 && parsed.widgets[0].x !== undefined) {
          setWidgets(parsed.widgets);
          return;
        }
      }
    } catch {
      // Keep DEFAULT_LAYOUT on error
    }
  }, []);
  // Sync from server
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/hq/dashboard/widget-layout');
        if (r.ok) {
          const j = await r.json();
          if (j.data?.widgets?.length > 0 && j.data.widgets[0].x !== undefined) {
            setWidgets(j.data.widgets);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(j.data));
          }
        }
      } catch {}
    })();
  }, []);

  const saveLayout = useCallback(async (layout: WidgetLayoutItem[]) => {
    const data = { widgets: layout, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    try {
      await fetch('/api/hq/dashboard/widget-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: layout }),
      });
    } catch {}
    setHasChanges(false);
  }, []);

  const handleAddWidget = useCallback((widgetId: string) => {
    const def = getWidgetById(widgetId);
    if (!def) return;
    const grid = SIZE_TO_GRID[def.defaultSize];
    const maxY = widgets.length > 0 ? Math.max(...widgets.map(w => (w.y || 0) + (w.h || 4))) : 0;
    const maxOrder = widgets.length > 0 ? Math.max(...widgets.map(w => w.order)) : -1;
    setWidgets(prev => [...prev, {
      widgetId, size: def.defaultSize, order: maxOrder + 1,
      x: 0, y: maxY, w: grid.w, h: grid.h, minW: grid.minW, minH: grid.minH,
    }]);
    setHasChanges(true);
  }, [widgets]);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.widgetId !== widgetId).map((w, i) => ({ ...w, order: i })));
    setHasChanges(true);
  }, []);

  const handleResetLayout = useCallback(() => {
    setWidgets([...DEFAULT_LAYOUT]);
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    saveLayout(widgets);
    setIsEditMode(false);
  }, [widgets, saveLayout]);

  // Convert widgets to grid layout items
  const gridLayout: LayoutItem[] = useMemo(() => {
    return widgets.map(w => {
      const grid = SIZE_TO_GRID[w.size] || SIZE_TO_GRID['sm'];
      return {
        i: w.widgetId,
        x: w.x ?? 0, y: w.y ?? 0,
        w: w.w ?? grid.w, h: w.h ?? grid.h,
        minW: w.minW ?? grid.minW, minH: w.minH ?? grid.minH,
        maxW: 12, maxH: 20,
        static: !isEditMode,
      };
    });
  }, [widgets, isEditMode]);

  // Sync grid changes back to widget state
  const handleLayoutChange = useCallback((layout: Layout, _layouts: ResponsiveLayouts) => {
    if (!isEditMode) return;
    setWidgets(prev => {
      const map = new Map(layout.map(l => [l.i, l]));
      return prev.map(w => {
        const l = map.get(w.widgetId);
        if (!l) return w;
        return { ...w, x: l.x, y: l.y, w: l.w, h: l.h, size: widgetSizeFromWidth(l.w) };
      });
    });
    setHasChanges(true);
  }, [isEditMode]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Dashboard Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t('dashboard.title')}</h1>
              <p className="text-xs text-gray-500">
                {isEditMode ? t('dashboard.dragWidgets') : t('dashboard.activeWidgets', { count: widgets.length })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <button onClick={() => setShowPicker(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> {t('dashboard.addWidget')}
                </button>
                <button onClick={handleResetLayout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> {t('dashboard.reset')}
                </button>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                  <Save className="w-3.5 h-3.5" /> {t('dashboard.save')}
                </button>
                <button onClick={() => { setIsEditMode(false); setHasChanges(false); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  {t('dashboard.cancel')}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditMode(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                <Edit className="w-3.5 h-3.5" /> {t('dashboard.editDashboard')}
              </button>
            )}
          </div>
        </div>
        {isEditMode && (
          <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              <strong>{t('dashboard.editMode')}</strong> — {t('dashboard.editModeDesc')}
              {hasChanges && <span className="ml-2 text-blue-900 font-semibold">• {t('dashboard.unsavedChanges')}</span>}
            </p>
          </div>
        )}
      </div>

      {/* Widget Canvas */}
      <div className={`flex-1 overflow-y-auto px-4 lg:px-5 pt-4 pb-6 transition-colors ${isEditMode ? 'bg-gray-100' : 'bg-gray-50'}`}>
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-gray-100 rounded-2xl mb-4">
              <LayoutGrid className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('dashboard.noWidgets')}</h3>
            <p className="text-sm text-gray-500 mb-5 max-w-sm">{t('dashboard.noWidgetsDesc')}</p>
            <button onClick={() => { setIsEditMode(true); setShowPicker(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25">
              <Plus className="w-4 h-4" /> {t('dashboard.addFirstWidget')}
            </button>
          </div>
        ) : (
          <div ref={containerRef as React.RefObject<HTMLDivElement>} className="w-full">
            {containerMounted && (
              <ResponsiveGridLayout
                className="dashboard-grid"
                width={containerWidth}
                layouts={{ lg: gridLayout }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={GRID_COLS}
                rowHeight={ROW_HEIGHT}
                dragConfig={{ enabled: isEditMode, bounded: true, handle: '.widget-drag-handle' }}
                resizeConfig={{ enabled: isEditMode }}
                compactor={verticalCompactor}
                onLayoutChange={handleLayoutChange}
                margin={[16, 16] as const}
                containerPadding={[0, 0] as const}
              >
                {widgets.map(item => {
                  const widgetDef = getWidgetById(item.widgetId);
                  if (!widgetDef) return <div key={item.widgetId} />;
                  const WidgetComponent = widgetDef.component;
                  const moduleColor = MODULE_COLORS[widgetDef.module];
                  return (
                    <div key={item.widgetId}>
                      <div className={`h-full bg-white rounded-xl border overflow-hidden flex flex-col transition-shadow ${
                        isEditMode
                          ? 'border-dashed border-blue-300 shadow-lg shadow-blue-500/5'
                          : 'border-gray-200 shadow-sm hover:shadow-md'
                      }`}>
                        {/* Widget Header with drag handle */}
                        <div className={`widget-drag-handle flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0 ${
                          isEditMode ? 'cursor-grab active:cursor-grabbing bg-gray-50/80' : ''
                        }`}>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isEditMode && <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                            <span className="text-gray-400 flex-shrink-0">
                              <widgetDef.icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-semibold text-gray-800 truncate">{t(`dashboard.widgets.${widgetDef.id}`) !== `dashboard.widgets.${widgetDef.id}` ? t(`dashboard.widgets.${widgetDef.id}`) : widgetDef.title}</span>
                            <span className={`hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-medium rounded-full flex-shrink-0 ${moduleColor}`}>
                              {t(`dashboard.moduleLabels.${widgetDef.module}`) !== `dashboard.moduleLabels.${widgetDef.module}` ? t(`dashboard.moduleLabels.${widgetDef.module}`) : widgetDef.module}
                            </span>
                          </div>
                          {isEditMode && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveWidget(item.widgetId); }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 ml-1"
                              title={t('dashboard.removeWidget')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {/* Widget Content */}
                        <div className="flex-1 p-3 overflow-auto">
                          <WidgetComponent />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </ResponsiveGridLayout>
            )}
          </div>
        )}
      </div>

      {showPicker && (
        <WidgetPicker isOpen={showPicker} activeWidgets={widgets} onAddWidget={handleAddWidget} onRemoveWidget={handleRemoveWidget} onClose={() => setShowPicker(false)} />
      )}

      <style jsx global>{`
        .dashboard-grid .react-grid-item.react-grid-placeholder {
          background: rgba(59, 130, 246, 0.15) !important;
          border: 2px dashed rgba(59, 130, 246, 0.5) !important;
          border-radius: 12px !important;
          opacity: 1 !important;
        }
        .dashboard-grid .react-grid-item.react-draggable-dragging {
          z-index: 100;
          box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
          border-radius: 12px;
          opacity: 0.95;
        }
        .dashboard-grid .react-grid-item > .react-resizable-handle {
          opacity: 0;
          width: 20px;
          height: 20px;
        }
        .dashboard-grid .react-grid-item:hover > .react-resizable-handle {
          opacity: 1;
        }
        .dashboard-grid .react-grid-item > .react-resizable-handle::after {
          border-right: 2.5px solid rgba(59, 130, 246, 0.6);
          border-bottom: 2.5px solid rgba(59, 130, 246, 0.6);
          width: 8px;
          height: 8px;
          right: 4px;
          bottom: 4px;
        }
      `}</style>
    </div>
  );
}

export default function HQDashboard() {
  return (
    <HQLayout noPadding>
      <HQDashboardContent />
    </HQLayout>
  );
}
