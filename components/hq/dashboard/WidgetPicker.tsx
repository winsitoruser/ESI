import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check, LayoutGrid } from 'lucide-react';
import { widgetRegistry } from '../../../lib/widgets/registry';
import { WidgetModule, MODULE_COLORS, WidgetLayoutItem } from '../../../lib/widgets/types';
import { useTranslation } from '@/lib/i18n';

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  activeWidgets: WidgetLayoutItem[];
  onAddWidget: (widgetId: string) => void;
  onRemoveWidget: (widgetId: string) => void;
}

const ALL_MODULES: WidgetModule[] = ['core', 'sales', 'branches', 'finance', 'hris', 'inventory', 'sfa', 'manufacturing', 'fleet', 'marketing'];

export default function WidgetPicker({ isOpen, onClose, activeWidgets, onAddWidget, onRemoveWidget }: WidgetPickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<WidgetModule | 'all'>('all');

  const getWidgetTitle = (id: string, fallback: string) => {
    const key = `dashboard.widgets.${id}`;
    const val = t(key);
    return val !== key ? val : fallback;
  };
  const getWidgetDesc = (id: string, fallback: string) => {
    const key = `dashboard.widgetDesc.${id}`;
    const val = t(key);
    return val !== key ? val : fallback;
  };
  const getModuleLabel = (mod: string) => {
    const key = `dashboard.moduleLabels.${mod}`;
    const val = t(key);
    return val !== key ? val : mod;
  };

  const activeIds = useMemo(() => new Set(activeWidgets.map(w => w.widgetId)), [activeWidgets]);

  const filtered = useMemo(() => {
    return widgetRegistry.filter(w => {
      if (selectedModule !== 'all' && w.module !== selectedModule) return false;
      if (search) {
        const q = search.toLowerCase();
        return getWidgetTitle(w.id, w.title).toLowerCase().includes(q) || getWidgetDesc(w.id, w.description).toLowerCase().includes(q) || getModuleLabel(w.module).toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, selectedModule]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(w => {
      if (!map[w.module]) map[w.module] = [];
      map[w.module].push(w);
    });
    return map;
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <LayoutGrid className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('dashboard.addWidget')}</h2>
              <p className="text-xs text-gray-500">{widgetRegistry.length} widget • {activeIds.size} {t('dashboard.activeWidgets', { count: activeIds.size }).replace(String(activeIds.size) + ' ', '')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search + Filter */}
        <div className="px-6 py-3 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.searchWidget')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedModule('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                selectedModule === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('branches.all')} ({widgetRegistry.length})
            </button>
            {ALL_MODULES.map(m => {
              const count = widgetRegistry.filter(w => w.module === m).length;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedModule(m)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                    selectedModule === m ? MODULE_COLORS[m] : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getModuleLabel(m)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">{t('dashboard.noWidgetMatch')}</p>
            </div>
          ) : (
            Object.entries(grouped).map(([module, widgets]) => (
              <div key={module} className="mb-6 last:mb-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full ${MODULE_COLORS[module as WidgetModule]}`}>
                    {getModuleLabel(module)}
                  </span>
                  <span className="text-gray-400">{widgets.length} widget</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {widgets.map(w => {
                    const isActive = activeIds.has(w.id);
                    return (
                      <div
                        key={w.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                          isActive
                            ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                            : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-gray-50'
                        }`}
                        onClick={() => isActive ? onRemoveWidget(w.id) : onAddWidget(w.id)}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isActive ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                          <w.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{getWidgetTitle(w.id, w.title)}</p>
                          <p className="text-xs text-gray-500 truncate">{getWidgetDesc(w.id, w.description)}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {isActive ? (
                            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 bg-gray-100 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center transition-colors">
                              <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {t('dashboard.activeWidgets', { count: activeIds.size })}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            {t('dashboard.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
