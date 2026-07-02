import React, { useState } from 'react';
import { useBuilder } from './BuilderContext';
import { widgetRegistry, getAllCategories, getWidgetsByCategory } from './widgets/registry';
import { CATEGORY_LABELS, WidgetCategory, WidgetDefinition } from './types';
import { useTranslation } from '../../lib/i18n';
import {
  Search, ChevronDown, ChevronRight, GripVertical, Layers, FileText, LayoutGrid,
  Plus, FolderOpen, Star, Clock, Sparkles,
} from 'lucide-react';

const categoryIcons: Record<WidgetCategory, React.FC<any>> = {
  layout: LayoutGrid, text: FileText, media: Star, navigation: Layers,
  forms: Plus, data: LayoutGrid, commerce: Star, social: Layers,
  charts: Star, modules: Sparkles,
};

const categoryColors: Record<WidgetCategory, string> = {
  layout: '#3b82f6', text: '#8b5cf6', media: '#ec4899', navigation: '#10b981',
  forms: '#f59e0b', data: '#06b6d4', commerce: '#ef4444', social: '#6366f1',
  charts: '#14b8a6', modules: '#f97316',
};

interface WidgetCardProps {
  widget: WidgetDefinition;
}

function WidgetCard({ widget }: WidgetCardProps) {
  const { addWidget, addWidgetToSection, dispatch, currentSections, state } = useBuilder();
  const { t } = useTranslation();
  const Icon = widget.icon;
  const color = categoryColors[widget.category] || '#6b7280';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('widgetType', widget.type);
    e.dataTransfer.effectAllowed = 'copy';
    dispatch({ type: 'SET_DRAGGING', isDragging: true, widgetType: widget.type });
  };

  const handleDragEnd = () => {
    dispatch({ type: 'SET_DRAGGING', isDragging: false, widgetType: null });
  };

  const handleClick = () => {
    // When sections exist, add to selected section or first section
    if (currentSections.length > 0) {
      const targetSection = state.selectedSectionId
        ? currentSections.find(s => s.id === state.selectedSectionId)
        : currentSections[0];
      if (targetSection) {
        addWidgetToSection(targetSection.id, widget.type);
        return;
      }
    }
    addWidget(widget.type);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className="group relative flex items-center gap-3 p-2.5 rounded-lg border border-transparent
        hover:border-gray-200 hover:bg-white hover:shadow-sm cursor-grab active:cursor-grabbing
        transition-all duration-150"
      title={t('wb.widgetPanel.dragOrClick', { name: widget.name })}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}12` }}
      >
        <Icon size={18} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{widget.name}</div>
        <div className="text-[11px] text-gray-400 truncate">{widget.description}</div>
      </div>
      <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

export default function WidgetPanel() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['layout', 'text', 'media']));
  const [viewMode, setViewMode] = useState<'category' | 'all'>('category');

  const categories = getAllCategories();

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setExpandedCategories(next);
  };

  const filteredWidgets = searchQuery.trim()
    ? widgetRegistry.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : widgetRegistry;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('wb.widgetPanel.searchWidgets')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
              placeholder:text-gray-400 transition-all"
          />
        </div>
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setViewMode('category')}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'category' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t('wb.widgetPanel.category')}
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              viewMode === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t('wb.widgetPanel.all')}
          </button>
        </div>
      </div>

      {/* Widget List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
        {searchQuery.trim() ? (
          // Search results
          <div className="space-y-0.5">
            <div className="px-2 py-1.5 text-xs font-medium text-gray-400">
              {t('wb.widgetPanel.resultsFound', { count: filteredWidgets.length })}
            </div>
            {filteredWidgets.map(w => <WidgetCard key={w.type} widget={w} />)}
            {filteredWidgets.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                {t('wb.widgetPanel.noMatch')}
              </div>
            )}
          </div>
        ) : viewMode === 'all' ? (
          // All widgets flat list
          <div className="space-y-0.5">
            {widgetRegistry.map(w => <WidgetCard key={w.type} widget={w} />)}
          </div>
        ) : (
          // Category view
          categories.map(cat => {
            const widgets = getWidgetsByCategory(cat);
            const isExpanded = expandedCategories.has(cat);
            const CatIcon = categoryIcons[cat] || LayoutGrid;
            const color = categoryColors[cat];

            return (
              <div key={cat} className="mb-1">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <CatIcon size={13} color={color} />
                  </div>
                  <span className="flex-1 text-left text-sm font-semibold text-gray-700">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                    {widgets.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-1 mt-0.5 space-y-0.5">
                    {widgets.map(w => <WidgetCard key={w.type} widget={w} />)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom hint */}
      <div className="p-3 border-t border-gray-100">
        <div className="text-[11px] text-gray-400 text-center leading-relaxed">
          {t('wb.widgetPanel.dragHint')}
        </div>
      </div>
    </div>
  );
}
