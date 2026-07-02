import React from 'react';
import { useBuilder } from './BuilderContext';
import { getWidgetDefinition } from './widgets/registry';
import { WidgetInstance, BuilderRow, BuilderColumn } from './types';
import { useTranslation } from '../../lib/i18n';
import {
  Eye, EyeOff, Lock, Unlock, GripVertical, Trash2, ChevronUp, ChevronDown,
  ChevronRight, Layers as LayersIcon, AlignJustify, Columns,
} from 'lucide-react';

function WidgetRow({ widget, indent = 0 }: { widget: WidgetInstance; indent?: number }) {
  const { state, dispatch } = useBuilder();
  const { t } = useTranslation();
  const def = getWidgetDefinition(widget.type);
  const Icon = def?.icon;
  const isSelected = state.selectedWidgetId === widget.id;

  return (
    <div
      className={`flex items-center gap-2 py-1.5 rounded-lg cursor-pointer transition-all pr-2 ${
        isSelected
          ? 'bg-blue-50 border border-blue-200'
          : 'hover:bg-gray-100 border border-transparent'
      } ${widget.hidden ? 'opacity-50' : ''}`}
      style={{ paddingLeft: `${8 + indent * 16}px` }}
      onClick={() => dispatch({ type: 'SELECT_WIDGET', id: widget.id })}
    >
      <GripVertical size={12} className="text-gray-300 flex-shrink-0 cursor-grab" />
      <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
        isSelected ? 'bg-blue-100' : 'bg-gray-100'
      }`}>
        {Icon && <Icon size={12} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-700 truncate">
          {def?.name || widget.type}
        </div>
        <div className="text-[10px] text-gray-400">
          ({widget.layout.x},{widget.layout.y}) {widget.layout.w}x{widget.layout.h}
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'TOGGLE_WIDGET_VISIBILITY', id: widget.id });
          }}
          className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
          title={widget.hidden ? t('wb.common.show') : t('wb.common.hide')}
        >
          {widget.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'LOCK_WIDGET', id: widget.id });
          }}
          className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
          title={widget.locked ? t('wb.common.unlock') : t('wb.common.lock')}
        >
          {widget.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'PUSH_HISTORY', description: 'Hapus widget' });
            dispatch({ type: 'DELETE_WIDGET', id: widget.id });
          }}
          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
          title={t('wb.common.delete')}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Row Layer Item ───
function RowLayerItem({ row, sectionId, indent = 1 }: { row: BuilderRow; sectionId: string; indent?: number }) {
  const { state, dispatch } = useBuilder();
  const { t } = useTranslation();
  const isSelected = state.selectedRowId === row.id;
  const widgetCount = row.columns.reduce((s, c) => s + c.widgets.length, 0);

  return (
    <div className="mb-0.5">
      <div
        className={`flex items-center gap-2 py-1.5 pr-2 rounded-lg cursor-pointer transition-all ${
          isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-100 border border-transparent'
        } ${row.hidden ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${8 + indent * 16}px` }}
        onClick={() => {
          dispatch({ type: 'SELECT_ROW', rowId: isSelected ? null : row.id });
          dispatch({ type: 'SELECT_WIDGET', id: null });
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'TOGGLE_ROW_COLLAPSE', sectionId, rowId: row.id });
          }}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600"
        >
          <ChevronRight size={12} className={`transition-transform ${row.collapsed ? '' : 'rotate-90'}`} />
        </button>
        <AlignJustify size={12} className={isSelected ? 'text-indigo-600' : 'text-gray-400'} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-700 truncate">{t('wb.row.name')}</div>
          <div className="text-[10px] text-gray-400">{row.columns.length} {t('wb.row.columns')}, {widgetCount} widget</div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'UPDATE_ROW_STYLE', sectionId, rowId: row.id, style: { hidden: !row.hidden } as any });
            }}
            className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
          >
            {row.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'PUSH_HISTORY', description: t('wb.canvas.deleteRow') });
              dispatch({ type: 'DELETE_ROW', sectionId, rowId: row.id });
            }}
            className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Columns & their widgets */}
      {!row.collapsed && row.columns.map((col, colIdx) => (
        <div key={col.id} className="mb-0.5">
          <div
            className={`flex items-center gap-2 py-1 pr-2 rounded-md cursor-pointer transition-all ${
              state.selectedColumnId === col.id
                ? 'bg-cyan-50 border border-cyan-200'
                : 'hover:bg-gray-50 border border-transparent'
            }`}
            style={{ paddingLeft: `${8 + (indent + 1) * 16}px` }}
            onClick={() => {
              dispatch({ type: 'SELECT_COLUMN', columnId: state.selectedColumnId === col.id ? null : col.id });
              dispatch({ type: 'SELECT_WIDGET', id: null });
            }}
          >
            <Columns size={10} className={state.selectedColumnId === col.id ? 'text-cyan-600' : 'text-gray-400'} />
            <span className="text-[10px] font-medium text-gray-600">{t('wb.column.name')} {colIdx + 1}</span>
            <span className="text-[10px] text-gray-400 ml-auto">{Math.round(col.width)}%</span>
          </div>
          {col.widgets.map(w => (
            <WidgetRow key={w.id} widget={w} indent={indent + 2} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LayersPanel() {
  const { state, dispatch, currentWidgets, currentSections } = useBuilder();
  const { t } = useTranslation();

  const hasSections = currentSections.length > 0;
  const totalWidgets = hasSections
    ? currentSections.reduce((sum, s) => {
        const legacyCount = s.widgets.length;
        const rowCount = (s.rows || []).reduce((rs, r) => rs + r.columns.reduce((cs, c) => cs + c.widgets.length, 0), 0);
        return sum + legacyCount + rowCount;
      }, 0)
    : currentWidgets.length;
  const totalRows = hasSections
    ? currentSections.reduce((sum, s) => sum + (s.rows || []).length, 0)
    : 0;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="p-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">{t('wb.layersPanel.title')}</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {hasSections ? `${t('wb.layersPanel.sections', { count: currentSections.length })}, ` : ''}
          {totalRows > 0 ? `${t('wb.layersPanel.rows', { count: totalRows })}, ` : ''}
          {t('wb.layersPanel.widgets', { count: totalWidgets })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {totalWidgets === 0 && !hasSections && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {t('wb.layersPanel.noWidgets')}
          </div>
        )}

        {/* Section-based layers */}
        {hasSections && currentSections.map((section, idx) => {
          const isSectionSelected = state.selectedSectionId === section.id;
          const sortedWidgets = [...section.widgets].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
          const sortedRows = [...(section.rows || [])].sort((a, b) => a.order - b.order);

          return (
            <div key={section.id} className="mb-1">
              {/* Section Header */}
              <div
                className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
                  isSectionSelected
                    ? 'bg-purple-50 border border-purple-200'
                    : 'hover:bg-gray-100 border border-transparent'
                } ${section.hidden ? 'opacity-50' : ''}`}
                onClick={() => dispatch({ type: 'SELECT_SECTION', sectionId: isSectionSelected ? null : section.id })}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'TOGGLE_SECTION_COLLAPSE', sectionId: section.id });
                  }}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight size={12} className={`transition-transform ${section.collapsed ? '' : 'rotate-90'}`} />
                </button>
                <LayersIcon size={12} className={isSectionSelected ? 'text-purple-600' : 'text-gray-400'} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 truncate">{section.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {(section.rows || []).length > 0 
                      ? `${(section.rows || []).length} row` 
                      : `${section.widgets.length} widget`
                    }
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'UPDATE_SECTION', sectionId: section.id, updates: { hidden: !section.hidden } });
                    }}
                    className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
                  >
                    {section.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'PUSH_HISTORY', description: `Hapus section: ${section.name}` });
                      dispatch({ type: 'DELETE_SECTION', sectionId: section.id });
                    }}
                    className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Section Rows */}
              {!section.collapsed && sortedRows.map(row => (
                <RowLayerItem key={row.id} row={row} sectionId={section.id} indent={1} />
              ))}

              {/* Section Legacy Widgets */}
              {!section.collapsed && sortedWidgets.map(widget => (
                <WidgetRow key={widget.id} widget={widget} indent={1} />
              ))}
            </div>
          );
        })}

        {/* Legacy flat widgets (no sections) */}
        {!hasSections && [...currentWidgets]
          .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x)
          .map(widget => (
            <WidgetRow key={widget.id} widget={widget} indent={0} />
          ))
        }
      </div>
    </div>
  );
}
