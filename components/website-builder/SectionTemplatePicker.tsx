import React, { useState, useMemo } from 'react';
import { useBuilder } from './BuilderContext';
import { sectionTemplates } from './SectionTemplates';
import { SECTION_CATEGORY_LABELS, SectionTemplateItem, DEFAULT_SECTION_STYLE, WidgetInstance } from './types';
import { getWidgetDefinition } from './widgets/registry';
import { useTranslation } from '../../lib/i18n';
import { v4 as uuidv4 } from 'uuid';
import {
  X, Search, LayoutTemplate, Plus, Sparkles,
  ChevronRight, Eye, Zap,
} from 'lucide-react';

const categoryOrder: SectionTemplateItem['category'][] = [
  'header', 'hero', 'features', 'content', 'stats',
  'testimonials', 'cta', 'pricing', 'gallery',
  'contact', 'ecommerce', 'footer',
];

function buildWidgetsFromTemplate(template: SectionTemplateItem): WidgetInstance[] {
  return template.widgets.map(tw => {
    const def = getWidgetDefinition(tw.type);
    if (!def) return null;
    const id = uuidv4();
    const props: Record<string, any> = {};
    def.properties.forEach(p => { props[p.key] = p.defaultValue; });
    if (tw.properties) Object.assign(props, tw.properties);
    return {
      id,
      type: tw.type,
      properties: props,
      layout: {
        i: id,
        x: tw.x ?? 0,
        y: tw.y ?? 0,
        w: tw.w ?? def.defaultSize.w,
        h: tw.h ?? def.defaultSize.h,
        minW: def.minSize?.w,
        minH: def.minSize?.h,
        maxW: def.maxSize?.w,
        maxH: def.maxSize?.h,
      },
    };
  }).filter(Boolean) as WidgetInstance[];
}

export default function SectionTemplatePicker() {
  const { state, dispatch, addSection } = useBuilder();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<SectionTemplateItem['category'] | 'all'>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = sectionTemplates;
    if (activeCategory !== 'all') {
      list = list.filter(t => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }
    return list;
  }, [search, activeCategory]);

  const handleInsert = (template: SectionTemplateItem) => {
    const widgets = buildWidgetsFromTemplate(template);
    const style = { ...DEFAULT_SECTION_STYLE, ...template.style };
    addSection(
      template.name,
      template.sectionType,
      state.sectionPickerInsertIndex >= 0 ? state.sectionPickerInsertIndex : undefined,
      widgets,
      style,
    );
    dispatch({ type: 'HIDE_SECTION_PICKER' });
  };

  const handleAddBlank = () => {
    addSection(
      t('wb.section.newSection'),
      'custom',
      state.sectionPickerInsertIndex >= 0 ? state.sectionPickerInsertIndex : undefined,
    );
    dispatch({ type: 'HIDE_SECTION_PICKER' });
  };

  if (!state.showSectionPicker) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-w-[95vw] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <LayoutTemplate size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('wb.templatePicker.title')}</h2>
              <p className="text-xs text-gray-500">{t('wb.templatePicker.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'HIDE_SECTION_PICKER' })}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search + Categories */}
        <div className="px-6 py-3 border-b border-gray-100 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('wb.templatePicker.search')}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              autoFocus
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === 'all'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t('wb.templatePicker.allCategories')} ({sectionTemplates.length})
            </button>
            {categoryOrder.map(cat => {
              const count = sectionTemplates.filter(t => t.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {SECTION_CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Blank Section CTA */}
          <button
            onClick={handleAddBlank}
            className="w-full mb-4 p-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center gap-4
              hover:border-purple-400 hover:bg-purple-50/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
              <Plus size={22} className="text-gray-400 group-hover:text-purple-600" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-gray-700 group-hover:text-purple-700">{t('wb.templatePicker.blankSection')}</div>
              <div className="text-xs text-gray-400">{t('wb.templatePicker.blankSectionDesc')}</div>
            </div>
          </button>

          {/* Template Grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">{t('wb.widgetPanel.noMatch')}</p>
              <p className="text-xs mt-1">{t('wb.common.search')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(template => (
                <div
                  key={template.id}
                  className={`relative group rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                    hoveredId === template.id
                      ? 'border-purple-400 shadow-purple-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onMouseEnter={() => setHoveredId(template.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleInsert(template)}
                >
                  {/* Preview area */}
                  <div
                    className="h-28 flex items-center justify-center relative"
                    style={{ backgroundColor: template.style?.backgroundColor || '#f8fafc' }}
                  >
                    {/* Widget layout mini-preview */}
                    <div className="relative w-[85%] h-[75%]">
                      {template.widgets.slice(0, 6).map((w, i) => {
                        const cols = 12;
                        const left = ((w.x || 0) / cols) * 100;
                        const width = ((w.w || 4) / cols) * 100;
                        const totalH = Math.max(...template.widgets.map(tw => (tw.y || 0) + (tw.h || 2)), 6);
                        const top = ((w.y || 0) / totalH) * 100;
                        const height = ((w.h || 2) / totalH) * 100;
                        return (
                          <div
                            key={i}
                            className="absolute rounded"
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                              backgroundColor: template.color + '20',
                              border: `1.5px solid ${template.color}40`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Hover overlay */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                      hoveredId === template.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-lg text-sm font-bold text-purple-600 shadow-lg">
                        <Plus size={16} />
                        {t('wb.templatePicker.insert')}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: template.color }}
                      />
                      <span className="text-xs font-bold text-gray-800 truncate">{template.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1">{template.description}</p>
                    <div className="flex gap-1 mt-2">
                      {template.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            <Sparkles size={12} className="inline mr-1" />
            {filtered.length} template
          </span>
          <button
            onClick={() => dispatch({ type: 'HIDE_SECTION_PICKER' })}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('wb.common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
