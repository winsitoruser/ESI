import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
// react-grid-layout: editor page uses ssr:false so this only runs client-side
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RGL = require('react-grid-layout');
const GridLayout = (RGL.default || RGL) as React.ComponentType<any>;
import { useBuilder } from './BuilderContext';
import {
  DEVICE_WIDTHS, GRID_COLS, Section, WidgetInstance,
  BuilderRow, BuilderColumn, ROW_LAYOUT_PRESETS,
  DEFAULT_COLUMN_STYLE, DEFAULT_ROW_STYLE,
} from './types';
import { getWidgetDefinition } from './widgets/registry';
import WidgetRenderer from './widgets/WidgetRenderer';
import { useTranslation } from '../../lib/i18n';
import {
  Trash2, GripVertical, Copy, Lock, Settings,
  Plus, ChevronUp, ChevronDown, Eye, EyeOff,
  Layers, LayoutTemplate, Palette, Maximize2,
  ChevronRight, MoveVertical, ArrowUpDown, Columns,
  Lock as LockIcon, Unlock, PaintBucket, AlignJustify,
  GripHorizontal, MoreHorizontal, PanelLeft, PanelRight,
} from 'lucide-react';

// ======== Add-Section Divider Button ========
function AddSectionButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex items-center justify-center py-2 group/add">
      <div className="absolute inset-x-6 h-px bg-gray-200 group-hover/add:bg-purple-300 transition-colors" />
      <button
        onClick={onClick}
        className="relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-semibold
          bg-white border-2 border-dashed border-gray-300 text-gray-400
          hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 hover:shadow-sm
          transition-all duration-200"
      >
        <Plus size={13} />
        {label || t('wb.canvas.addSection')}
      </button>
    </div>
  );
}

// ======== Add-Row Button ========
function AddRowButton({ sectionId, insertIndex }: { sectionId: string; insertIndex: number }) {
  const { addRow } = useBuilder();
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative flex items-center justify-center py-1.5 group/addrow">
      <div className="absolute inset-x-12 h-px bg-transparent group-hover/addrow:bg-blue-200 transition-colors" />
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="relative z-10 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold
          bg-white border border-dashed border-gray-200 text-gray-300
          hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-sm
          opacity-0 group-hover/addrow:opacity-100 transition-all duration-200"
      >
        <Plus size={11} />
        {t('wb.canvas.addRow')}
      </button>

      {/* Row Layout Picker Popover */}
      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute z-50 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 w-[320px]">
            <div className="text-xs font-bold text-gray-700 mb-2">{t('wb.canvas.columnLayout')}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ROW_LAYOUT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    addRow(sectionId, preset.columns, insertIndex);
                    setShowPicker(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100
                    hover:border-blue-400 hover:bg-blue-50 transition-all group/preset"
                >
                  {/* Visual column preview */}
                  <div className="flex w-full gap-0.5 h-6">
                    {preset.columns.map((w, i) => (
                      <div
                        key={i}
                        style={{ width: `${w}%` }}
                        className="bg-gray-200 group-hover/preset:bg-blue-300 rounded-sm transition-colors"
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-gray-500 group-hover/preset:text-blue-600 font-medium">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======== Section Toolbar ========
function SectionToolbar({
  section,
  isFirst,
  isLast,
  isSelected,
}: {
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
}) {
  const { dispatch } = useBuilder();
  const { t } = useTranslation();
  const totalWidgets = (section.widgets?.length || 0) +
    (section.rows || []).reduce((acc, r) => acc + r.columns.reduce((a, c) => a + c.widgets.length, 0), 0);
  const totalRows = (section.rows || []).length;

  return (
    <div className={`flex items-center justify-between px-4 py-2 transition-colors ${
      isSelected ? 'bg-blue-50 border-b border-blue-200' : 'bg-gray-50 border-b border-gray-200'
    }`}>
      {/* Left: section name + type */}
      <div
        className="flex items-center gap-2 cursor-pointer min-w-0"
        onClick={() => dispatch({ type: 'SELECT_SECTION', sectionId: isSelected ? null : section.id })}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: 'TOGGLE_SECTION_COLLAPSE', sectionId: section.id });
          }}
          className="p-0.5 rounded text-gray-400 hover:text-gray-600"
        >
          <ChevronRight size={14} className={`transition-transform ${section.collapsed ? '' : 'rotate-90'}`} />
        </button>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          section.type === 'hero' ? 'bg-blue-500' :
          section.type === 'header' ? 'bg-violet-500' :
          section.type === 'footer' ? 'bg-gray-700' :
          section.type === 'cta' ? 'bg-red-500' :
          section.type === 'features' ? 'bg-green-500' :
          section.type === 'testimonials' ? 'bg-amber-500' :
          section.type === 'pricing' ? 'bg-emerald-500' :
          section.type === 'contact' ? 'bg-purple-500' :
          section.type === 'gallery' ? 'bg-cyan-500' :
          'bg-gray-400'
        }`} />
        <span className="text-[11px] font-bold text-gray-700 truncate max-w-[140px]">{section.name}</span>
        {totalRows > 0 && (
          <span className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
            {totalRows} row
          </span>
        )}
        <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
          {totalWidgets} widget
        </span>
        {section.hidden && <EyeOff size={11} className="text-gray-400" />}
        {section.locked && <LockIcon size={11} className="text-amber-500" />}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => dispatch({ type: 'MOVE_SECTION', sectionId: section.id, direction: 'up' })}
          disabled={isFirst}
          className={`p-1 rounded transition-colors ${isFirst ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
          title={t('wb.section.moveUp')}
        >
          <ChevronUp size={13} />
        </button>
        <button
          onClick={() => dispatch({ type: 'MOVE_SECTION', sectionId: section.id, direction: 'down' })}
          disabled={isLast}
          className={`p-1 rounded transition-colors ${isLast ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
          title={t('wb.section.moveDown')}
        >
          <ChevronDown size={13} />
        </button>

        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        <button
          onClick={() => dispatch({ type: 'UPDATE_SECTION', sectionId: section.id, updates: { hidden: !section.hidden } })}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          title={section.hidden ? t('wb.section.show') : t('wb.section.hide')}
        >
          {section.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_SECTION', sectionId: section.id, updates: { locked: !section.locked } })}
          className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          title={section.locked ? t('wb.section.unlock') : t('wb.section.lock')}
        >
          {section.locked ? <LockIcon size={13} /> : <Unlock size={13} />}
        </button>

        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        <button
          onClick={() => {
            dispatch({ type: 'PUSH_HISTORY', description: `Duplikasi section: ${section.name}` });
            dispatch({ type: 'DUPLICATE_SECTION', sectionId: section.id });
          }}
          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title={t('wb.section.duplicate')}
        >
          <Copy size={13} />
        </button>
        <button
          onClick={() => {
            dispatch({ type: 'PUSH_HISTORY', description: `Hapus section: ${section.name}` });
            dispatch({ type: 'DELETE_SECTION', sectionId: section.id });
          }}
          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title={t('wb.section.delete')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ======== Row Toolbar ========
function RowToolbar({
  row,
  sectionId,
  isFirst,
  isLast,
  isSelected,
}: {
  row: BuilderRow;
  sectionId: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
}) {
  const { dispatch } = useBuilder();
  const { t } = useTranslation();

  return (
    <div className={`flex items-center justify-between px-3 py-1 transition-all text-[10px] ${
      isSelected
        ? 'bg-indigo-50 border border-indigo-200 rounded-t-lg'
        : 'bg-transparent border border-transparent hover:bg-gray-50 hover:border-gray-100 rounded-t-lg'
    }`}>
      <div
        className="flex items-center gap-1.5 cursor-pointer"
        onClick={() => dispatch({ type: 'SELECT_ROW', rowId: isSelected ? null : row.id })}
      >
        <GripHorizontal size={12} className="text-gray-300 cursor-grab active:cursor-grabbing" />
        <AlignJustify size={11} className={isSelected ? 'text-indigo-500' : 'text-gray-400'} />
        <span className={`font-semibold ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
          {t('wb.row.name')}
        </span>
        <span className="text-gray-300">
          {row.columns.length} {t('wb.row.columns')}
        </span>
      </div>

      <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100'} transition-opacity`}>
        <button
          onClick={() => dispatch({ type: 'MOVE_ROW', sectionId, rowId: row.id, direction: 'up' })}
          disabled={isFirst}
          className={`p-0.5 rounded ${isFirst ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
          title={t('wb.common.moveUp')}
        >
          <ChevronUp size={11} />
        </button>
        <button
          onClick={() => dispatch({ type: 'MOVE_ROW', sectionId, rowId: row.id, direction: 'down' })}
          disabled={isLast}
          className={`p-0.5 rounded ${isLast ? 'text-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
          title={t('wb.common.moveDown')}
        >
          <ChevronDown size={11} />
        </button>
        <div className="w-px h-3 bg-gray-200 mx-0.5" />
        <button
          onClick={() => {
            dispatch({ type: 'PUSH_HISTORY', description: 'Duplikasi row' });
            dispatch({ type: 'DUPLICATE_ROW', sectionId, rowId: row.id });
          }}
          className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          title={t('wb.canvas.duplicateRow')}
        >
          <Copy size={11} />
        </button>
        <button
          onClick={() => {
            dispatch({ type: 'PUSH_HISTORY', description: 'Hapus row' });
            dispatch({ type: 'DELETE_ROW', sectionId, rowId: row.id });
          }}
          className="p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
          title={t('wb.canvas.deleteRow')}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ======== Column Drop Zone ========
function ColumnDropZone({
  column,
  sectionId,
  rowId,
  isSelected,
}: {
  column: BuilderColumn;
  sectionId: string;
  rowId: string;
  isSelected: boolean;
}) {
  const { state, dispatch, addWidgetToColumn } = useBuilder();
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const widgetType = e.dataTransfer.getData('widgetType') || state.droppingWidgetType;
    if (widgetType) {
      addWidgetToColumn(sectionId, rowId, column.id, widgetType);
      dispatch({ type: 'SET_DRAGGING', isDragging: false, widgetType: null });
    }
  };

  const shadowMap: Record<string, string> = {
    none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg',
  };

  return (
    <div
      className={`relative flex flex-col min-h-[60px] rounded-lg transition-all duration-200 ${
        isDragOver
          ? 'ring-2 ring-blue-400 ring-dashed bg-blue-50/60'
          : isSelected
            ? 'ring-2 ring-cyan-400 bg-white'
            : 'ring-1 ring-gray-200 hover:ring-gray-300 bg-white'
      } ${shadowMap[column.style?.shadow || 'none']}`}
      style={{
        backgroundColor: column.style?.backgroundColor !== 'transparent' ? column.style?.backgroundColor : undefined,
        padding: column.style?.padding ?? 8,
        borderRadius: column.style?.borderRadius ?? 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: column.style?.verticalAlign === 'middle' ? 'stretch' : undefined,
        justifyContent:
          column.style?.verticalAlign === 'middle' ? 'center' :
          column.style?.verticalAlign === 'bottom' ? 'flex-end' :
          column.style?.verticalAlign === 'stretch' ? 'stretch' : 'flex-start',
      }}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_COLUMN', columnId: column.id });
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header - only on hover/selected */}
      {isSelected && (
        <div className="absolute -top-5 left-1 flex items-center gap-1 z-20">
          <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
            {t('wb.column.name')} ({Math.round(column.width)}%)
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'PUSH_HISTORY', description: 'Hapus kolom' });
              dispatch({ type: 'DELETE_COLUMN', sectionId, rowId, columnId: column.id });
            }}
            className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
            title={t('wb.canvas.deleteColumn')}
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}

      {/* Widgets in column */}
      {column.widgets.map((widget, wIdx) => (
        <div key={widget.id} className="mb-1 last:mb-0">
          <ColumnWidgetItem
            widget={widget}
            sectionId={sectionId}
            rowId={rowId}
            columnId={column.id}
            isSelected={state.selectedWidgetId === widget.id}
            isHovered={state.hoveredWidgetId === widget.id}
          />
        </div>
      ))}

      {/* Empty state */}
      {column.widgets.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-4 text-center transition-colors ${
          isDragOver ? 'text-blue-500' : 'text-gray-300'
        }`}>
          <Plus size={16} className="mb-1" />
          <p className="text-[10px] font-medium">
            {isDragOver ? t('wb.canvas.dropHere') : t('wb.canvas.columnEmpty')}
          </p>
        </div>
      )}
    </div>
  );
}

// ======== Column Widget Item (for widgets inside columns) ========
function ColumnWidgetItem({
  widget,
  sectionId,
  rowId,
  columnId,
  isSelected,
  isHovered,
}: {
  widget: WidgetInstance;
  sectionId: string;
  rowId: string;
  columnId: string;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const { dispatch } = useBuilder();
  const { t } = useTranslation();
  const def = getWidgetDefinition(widget.type);

  return (
    <div
      className={`widget-item group/cw relative rounded-md transition-all duration-150 ${
        widget.hidden ? 'opacity-30' : ''
      } ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-md z-20'
          : isHovered
            ? 'ring-2 ring-blue-300 z-10'
            : 'ring-1 ring-transparent hover:ring-gray-200'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_WIDGET', id: widget.id });
        dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'properties' });
      }}
      onMouseEnter={() => dispatch({ type: 'HOVER_WIDGET', id: widget.id })}
      onMouseLeave={() => dispatch({ type: 'HOVER_WIDGET', id: null })}
    >
      <div className="w-full overflow-hidden rounded-md">
        <WidgetRenderer widget={widget} />
      </div>

      {/* Widget Label */}
      {(isSelected || isHovered) && (
        <div className="absolute -top-5 left-0 flex items-center gap-1 z-30">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-t-md ${
            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
          }`}>
            {def?.name || widget.type}
          </span>
        </div>
      )}

      {/* Quick Actions */}
      {(isSelected || isHovered) && !widget.locked && (
        <div className="absolute -top-5 right-0 flex items-center gap-0.5 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'PUSH_HISTORY', description: 'Duplikasi widget' });
              dispatch({ type: 'DUPLICATE_WIDGET', id: widget.id });
            }}
            className="p-0.5 bg-gray-700 text-white rounded-t-md hover:bg-blue-600"
            title={t('wb.common.duplicate')}
          >
            <Copy size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'PUSH_HISTORY', description: 'Hapus widget' });
              dispatch({ type: 'DELETE_WIDGET_FROM_COLUMN', sectionId, rowId, columnId, widgetId: widget.id });
            }}
            className="p-0.5 bg-gray-700 text-white rounded-t-md hover:bg-red-600"
            title={t('wb.common.delete')}
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

// ======== Row with Columns ========
function RowContainer({
  row,
  section,
  isFirst,
  isLast,
}: {
  row: BuilderRow;
  section: Section;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { state } = useBuilder();
  const isSelected = state.selectedRowId === row.id;
  const device = state.devicePreview;
  const shouldStack = device === 'mobile' && row.style?.stackOnMobile;
  const shouldReverse = device === 'mobile' && row.style?.reverseOnMobile;

  const columns = shouldReverse ? [...row.columns].reverse() : row.columns;

  if (row.collapsed) {
    return (
      <div className="group/row">
        <RowToolbar row={row} sectionId={section.id} isFirst={isFirst} isLast={isLast} isSelected={isSelected} />
        <div className="py-2 px-4 text-center text-[10px] text-gray-400 italic bg-gray-50 rounded-b-lg">
          Row collapsed
        </div>
      </div>
    );
  }

  return (
    <div className="group/row">
      <RowToolbar row={row} sectionId={section.id} isFirst={isFirst} isLast={isLast} isSelected={isSelected} />
      <div
        className={`transition-all rounded-b-lg ${isSelected ? 'ring-1 ring-indigo-200' : ''}`}
        style={{
          backgroundColor: row.style?.backgroundColor !== 'transparent' ? row.style?.backgroundColor : undefined,
          paddingTop: row.style?.paddingTop ?? 8,
          paddingBottom: row.style?.paddingBottom ?? 8,
          paddingLeft: row.style?.paddingLeft ?? 0,
          paddingRight: row.style?.paddingRight ?? 0,
          marginTop: row.style?.marginTop ?? 0,
          marginBottom: row.style?.marginBottom ?? 0,
          minHeight: row.style?.minHeight || undefined,
        }}
      >
        <div
          className={shouldStack ? 'flex flex-col' : 'flex flex-row'}
          style={{
            gap: row.style?.gap ?? 16,
            alignItems:
              row.style?.verticalAlign === 'middle' ? 'center' :
              row.style?.verticalAlign === 'bottom' ? 'flex-end' :
              row.style?.verticalAlign === 'stretch' ? 'stretch' : 'flex-start',
          }}
        >
          {columns.map(col => (
            <div
              key={col.id}
              style={{ width: shouldStack ? '100%' : `${col.width}%`, minWidth: 0 }}
              className="relative"
            >
              <ColumnDropZone
                column={col}
                sectionId={section.id}
                rowId={row.id}
                isSelected={state.selectedColumnId === col.id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ======== Section Content (rows + legacy widgets) ========
function SectionContent({ section }: { section: Section }) {
  const { state, dispatch, addWidgetToSection } = useBuilder();
  const { t } = useTranslation();
  const device = state.devicePreview;
  const cols = GRID_COLS[device];
  const canvasWidth = DEVICE_WIDTHS[device];
  const rowHeight = 40;

  const rows = (section.rows || []).sort((a, b) => a.order - b.order);
  const hasRows = rows.length > 0;
  const hasLegacyWidgets = section.widgets.length > 0;

  const sectionBg = section.style?.backgroundColor || 'transparent';
  const maxWidthMap: Record<string, number> = { full: canvasWidth, container: 1200, narrow: 800 };
  const maxWPx = maxWidthMap[section.style?.maxWidth || 'container'] || canvasWidth;
  const gridWidth = Math.min(canvasWidth, maxWPx);

  // Legacy grid layout
  const layout = useMemo(() =>
    section.widgets.map(w => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: Math.min(w.layout.w, cols),
      h: w.layout.h,
      minW: w.layout.minW,
      minH: w.layout.minH,
      maxW: w.layout.maxW,
      maxH: w.layout.maxH,
      isDraggable: !w.locked && !section.locked && !state.isPreviewing,
      isResizable: !w.locked && !section.locked && !state.isPreviewing,
    })),
    [section.widgets, cols, state.isPreviewing, section.locked]
  );

  const handleLayoutChange = useCallback((newLayout: any[]) => {
    dispatch({ type: 'UPDATE_SECTION_LAYOUTS', sectionId: section.id, layouts: newLayout });
  }, [dispatch, section.id]);

  const handleDrop = useCallback((_layoutItems: any[], layoutItem: any, e: any) => {
    const widgetType = e?.dataTransfer?.getData('widgetType') || state.droppingWidgetType;
    if (widgetType) {
      addWidgetToSection(section.id, widgetType, layoutItem.x, layoutItem.y);
      dispatch({ type: 'SET_DRAGGING', isDragging: false, widgetType: null });
    }
  }, [addWidgetToSection, section.id, state.droppingWidgetType, dispatch]);

  const droppingItem = state.droppingWidgetType
    ? (() => {
        const def = getWidgetDefinition(state.droppingWidgetType);
        return def ? { i: '__dropping__', x: 0, y: 0, w: def.defaultSize.w, h: def.defaultSize.h } : undefined;
      })()
    : undefined;

  if (section.collapsed) {
    return (
      <div className="py-3 px-6 text-center text-xs text-gray-400 italic">
        {t('wb.canvas.sectionCollapsed')}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: sectionBg !== 'transparent' ? sectionBg : undefined,
        paddingTop: section.style?.paddingTop ?? 48,
        paddingBottom: section.style?.paddingBottom ?? 48,
        minHeight: section.style?.minHeight || 80,
        borderTop: section.style?.borderTop !== 'none' ? section.style?.borderTop : undefined,
        borderBottom: section.style?.borderBottom !== 'none' ? section.style?.borderBottom : undefined,
      }}
      className="relative"
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
    >
      <div style={{ maxWidth: maxWPx, margin: '0 auto', paddingLeft: section.style?.paddingLeft ?? 24, paddingRight: section.style?.paddingRight ?? 24 }}>

        {/* Row-based layout */}
        {hasRows && (
          <div className="space-y-1">
            <AddRowButton sectionId={section.id} insertIndex={0} />
            {rows.map((row, rIdx) => (
              <React.Fragment key={row.id}>
                <RowContainer
                  row={row}
                  section={section}
                  isFirst={rIdx === 0}
                  isLast={rIdx === rows.length - 1}
                />
                <AddRowButton sectionId={section.id} insertIndex={rIdx + 1} />
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Legacy grid widgets (backward compat) */}
        {hasLegacyWidgets && GridLayout && (
          <div className={hasRows ? 'mt-4 pt-4 border-t border-dashed border-gray-200' : ''}>
            <GridLayout
              className="layout"
              layout={layout}
              cols={cols}
              rowHeight={rowHeight}
              width={gridWidth - (section.style?.paddingLeft ?? 24) - (section.style?.paddingRight ?? 24)}
              onLayoutChange={handleLayoutChange as any}
              onDrop={handleDrop as any}
              isDroppable={true}
              droppingItem={droppingItem}
              compactType="vertical"
              preventCollision={false}
              useCSSTransforms={true}
              draggableHandle=".widget-drag-handle"
              margin={[8, 8]}
              containerPadding={[0, 0]}
              style={{ minHeight: section.widgets.length === 0 ? 120 : undefined }}
            >
              {section.widgets.map(widget => (
                <div key={widget.id}>
                  <WidgetItem
                    widget={widget}
                    sectionId={section.id}
                    isSelected={state.selectedWidgetId === widget.id}
                    isHovered={state.hoveredWidgetId === widget.id}
                  />
                </div>
              ))}
            </GridLayout>
          </div>
        )}

        {/* Empty state: no rows and no widgets */}
        {!hasRows && !hasLegacyWidgets && (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
              <Plus size={20} className="text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-400 mb-1">{t('wb.canvas.emptySectionTitle')}</p>
            <p className="text-[10px] text-gray-300 mb-3">{t('wb.canvas.emptySectionDesc')}</p>
            <AddRowButton sectionId={section.id} insertIndex={0} />
          </div>
        )}

        {/* Show add-row even when section only has legacy widgets */}
        {!hasRows && hasLegacyWidgets && (
          <div className="mt-2">
            <AddRowButton sectionId={section.id} insertIndex={0} />
          </div>
        )}
      </div>
    </div>
  );
}

// ======== Widget Item (used in legacy section grid) ========
function WidgetItem({
  widget,
  sectionId,
  isSelected,
  isHovered,
}: {
  widget: WidgetInstance;
  sectionId?: string;
  isSelected: boolean;
  isHovered: boolean;
}) {
  const { dispatch } = useBuilder();
  const { t } = useTranslation();
  const def = getWidgetDefinition(widget.type);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'PUSH_HISTORY', description: 'Hapus widget' });
    if (sectionId) {
      dispatch({ type: 'DELETE_WIDGET_FROM_SECTION', sectionId, widgetId: widget.id });
    } else {
      dispatch({ type: 'DELETE_WIDGET', id: widget.id });
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'PUSH_HISTORY', description: 'Duplikasi widget' });
    dispatch({ type: 'DUPLICATE_WIDGET', id: widget.id });
  };

  return (
    <div
      className={`widget-item group relative rounded-lg transition-all duration-150 ${
        widget.hidden ? 'opacity-30' : ''
      } ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/10 z-20'
          : isHovered
            ? 'ring-2 ring-blue-300 z-10'
            : 'ring-1 ring-transparent hover:ring-gray-300'
      } ${widget.locked ? 'cursor-not-allowed' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_WIDGET', id: widget.id });
        dispatch({ type: 'SET_RIGHT_PANEL_TAB', tab: 'properties' });
      }}
      onMouseEnter={() => dispatch({ type: 'HOVER_WIDGET', id: widget.id })}
      onMouseLeave={() => dispatch({ type: 'HOVER_WIDGET', id: null })}
    >
      <div className="w-full h-full overflow-hidden rounded-lg">
        <WidgetRenderer widget={widget} />
      </div>

      {/* Widget Label */}
      {(isSelected || isHovered) && (
        <div className="absolute -top-6 left-0 flex items-center gap-1 z-30">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-t-md ${
            isSelected ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
          }`}>
            {def?.name || widget.type}
          </span>
          {widget.locked && <Lock size={10} className="text-amber-500" />}
        </div>
      )}

      {/* Drag Handle + Quick Actions */}
      {(isSelected || isHovered) && !widget.locked && (
        <div className="absolute -top-6 right-0 flex items-center gap-0.5 z-30">
          <button
            className="widget-drag-handle p-1 bg-gray-700 text-white rounded-t-md hover:bg-gray-800 cursor-grab active:cursor-grabbing"
            title={t('wb.canvas.dragToReorder')}
          >
            <GripVertical size={12} />
          </button>
          <button
            onClick={handleDuplicate}
            className="p-1 bg-gray-700 text-white rounded-t-md hover:bg-blue-600"
            title={t('wb.common.duplicate')}
          >
            <Copy size={12} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 bg-gray-700 text-white rounded-t-md hover:bg-red-600"
            title={t('wb.common.delete')}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Resize indicator */}
      {isSelected && !widget.locked && (
        <div className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center">
          <div className="w-2 h-2 rounded-sm bg-blue-500" />
        </div>
      )}
    </div>
  );
}

// ======== MAIN CANVAS ========
export default function BuilderCanvas() {
  const { state, dispatch, currentWidgets, currentSections, addWidget } = useBuilder();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const device = state.devicePreview;
  const cols = GRID_COLS[device];
  const canvasWidth = DEVICE_WIDTHS[device];
  const rowHeight = 40;

  const hasSections = currentSections.length > 0;

  // Legacy layout for pages without sections
  const legacyLayout = useMemo(() =>
    currentWidgets.map(w => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: Math.min(w.layout.w, cols),
      h: w.layout.h,
      minW: w.layout.minW,
      minH: w.layout.minH,
      maxW: w.layout.maxW,
      maxH: w.layout.maxH,
      isDraggable: !w.locked && !state.isPreviewing,
      isResizable: !w.locked && !state.isPreviewing,
    })),
    [currentWidgets, cols, state.isPreviewing]
  );

  const handleLegacyLayoutChange = useCallback((newLayout: any[]) => {
    dispatch({ type: 'UPDATE_LAYOUTS', layouts: newLayout });
  }, [dispatch]);

  const handleLegacyDrop = useCallback((_layoutItems: any[], layoutItem: any, e: any) => {
    const widgetType = e?.dataTransfer?.getData('widgetType') || state.droppingWidgetType;
    if (widgetType) {
      addWidget(widgetType, layoutItem.x, layoutItem.y);
      dispatch({ type: 'SET_DRAGGING', isDragging: false, widgetType: null });
    }
  }, [addWidget, state.droppingWidgetType, dispatch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.widget-item')) return;
    dispatch({ type: 'SELECT_WIDGET', id: null });
    dispatch({ type: 'SELECT_SECTION', sectionId: null });
    dispatch({ type: 'SELECT_ROW', rowId: null });
    dispatch({ type: 'SELECT_COLUMN', columnId: null });
  }, [dispatch]);

  const droppingItem = state.droppingWidgetType
    ? (() => {
        const def = getWidgetDefinition(state.droppingWidgetType);
        return def ? { i: '__dropping__', x: 0, y: 0, w: def.defaultSize.w, h: def.defaultSize.h } : undefined;
      })()
    : undefined;

  // Not mounted yet or GridLayout not loaded
  if (!mounted || !GridLayout) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t('wb.canvas.loading')}</p>
        </div>
      </div>
    );
  }

  // ======= Preview Mode =======
  if (state.isPreviewing) {
    return (
      <div className="flex-1 flex justify-center overflow-auto bg-gray-100 p-8">
        <div
          style={{ width: canvasWidth, transform: `scale(${state.zoom / 100})`, transformOrigin: 'top center' }}
          className="bg-white shadow-2xl rounded-lg overflow-hidden"
        >
          {/* Render sections in order */}
          {currentSections.filter(s => !s.hidden).map(section => {
            const sectionBg = section.style?.backgroundColor || 'transparent';
            const maxWidthMap = { full: '100%', container: '1200px', narrow: '800px' };
            const maxW = maxWidthMap[section.style?.maxWidth || 'container'];
            return (
              <div
                key={section.id}
                style={{
                  backgroundColor: sectionBg !== 'transparent' ? sectionBg : undefined,
                  paddingTop: section.style?.paddingTop ?? 48,
                  paddingBottom: section.style?.paddingBottom ?? 48,
                }}
              >
                <div style={{ maxWidth: maxW, margin: '0 auto', paddingLeft: section.style?.paddingLeft ?? 24, paddingRight: section.style?.paddingRight ?? 24 }}>
                  {/* Preview rows */}
                  {(section.rows || []).sort((a, b) => a.order - b.order).filter(r => !r.hidden).map(row => (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        flexDirection: device === 'mobile' && row.style?.stackOnMobile ? 'column' : 'row',
                        gap: row.style?.gap ?? 16,
                        paddingTop: row.style?.paddingTop ?? 8,
                        paddingBottom: row.style?.paddingBottom ?? 8,
                        backgroundColor: row.style?.backgroundColor !== 'transparent' ? row.style?.backgroundColor : undefined,
                      }}
                    >
                      {row.columns.map(col => (
                        <div
                          key={col.id}
                          style={{
                            width: device === 'mobile' && row.style?.stackOnMobile ? '100%' : `${col.width}%`,
                            padding: col.style?.padding ?? 8,
                            backgroundColor: col.style?.backgroundColor !== 'transparent' ? col.style?.backgroundColor : undefined,
                          }}
                        >
                          {col.widgets.filter(w => !w.hidden).map(widget => (
                            <div key={widget.id} className="mb-2 last:mb-0">
                              <WidgetRenderer widget={widget} isPreview />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Preview legacy widgets */}
                  {section.widgets.filter(w => !w.hidden).sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x).map(widget => (
                    <div
                      key={widget.id}
                      style={{
                        position: 'absolute',
                        left: `${(widget.layout.x / cols) * 100}%`,
                        top: widget.layout.y * rowHeight,
                        width: `${(widget.layout.w / cols) * 100}%`,
                        height: widget.layout.h * rowHeight,
                        padding: 4,
                      }}
                    >
                      <WidgetRenderer widget={widget} isPreview />
                    </div>
                  ))}
                  {section.widgets.length > 0 && (
                    <div style={{ height: section.widgets.reduce((max, w) => Math.max(max, (w.layout.y + w.layout.h) * rowHeight), 0) }} />
                  )}
                </div>
              </div>
            );
          })}
          {/* Legacy widgets */}
          {!hasSections && (
            <div style={{ position: 'relative', minHeight: 600 }}>
              {currentWidgets.filter(w => !w.hidden).sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x).map(widget => (
                <div
                  key={widget.id}
                  style={{
                    position: 'absolute',
                    left: `${(widget.layout.x / cols) * 100}%`,
                    top: widget.layout.y * rowHeight,
                    width: `${(widget.layout.w / cols) * 100}%`,
                    height: widget.layout.h * rowHeight,
                    padding: 4,
                  }}
                >
                  <WidgetRenderer widget={widget} isPreview />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======= Edit Mode =======
  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-auto bg-gray-100/80"
      onClick={handleCanvasClick}
      onDragOver={handleDragOver}
    >
      <div className="flex justify-center py-6 px-4">
        <div
          style={{
            width: canvasWidth,
            transform: `scale(${state.zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Device Frame */}
          <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ${
            state.isDragging ? 'ring-2 ring-blue-400 ring-offset-2' : ''
          }`}>

            {/* ====== SECTION-BASED CANVAS ====== */}
            {hasSections && (
              <div>
                {/* Top add-section */}
                <AddSectionButton
                  onClick={() => dispatch({ type: 'SHOW_SECTION_PICKER', insertIndex: 0 })}
                  label={t('wb.canvas.addSectionTop')}
                />

                {currentSections.map((section, idx) => {
                  const isSectionSelected = state.selectedSectionId === section.id;
                  return (
                    <div key={section.id}>
                      {/* Section Container */}
                      <div
                        className={`relative transition-all ${
                          isSectionSelected ? 'ring-2 ring-blue-400 ring-inset' : ''
                        } ${section.hidden ? 'opacity-40' : ''}`}
                      >
                        <SectionToolbar
                          section={section}
                          isFirst={idx === 0}
                          isLast={idx === currentSections.length - 1}
                          isSelected={isSectionSelected}
                        />
                        <SectionContent section={section} />
                      </div>

                      {/* Add-section between */}
                      <AddSectionButton
                        onClick={() => dispatch({ type: 'SHOW_SECTION_PICKER', insertIndex: idx + 1 })}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ====== LEGACY FLAT CANVAS (no sections) ====== */}
            {!hasSections && (
              <div
                className="relative min-h-[600px]"
                style={{
                  backgroundImage: state.showGrid
                    ? `linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)`
                    : 'none',
                  backgroundSize: `${canvasWidth / cols}px ${rowHeight}px`,
                }}
              >
                {currentWidgets.length === 0 && !state.isDragging && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none z-10">
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <LayoutTemplate size={32} className="text-gray-300" />
                    </div>
                    <p className="text-lg font-medium text-gray-500 mb-2">{t('wb.canvas.emptyTitle')}</p>
                    <p className="text-sm text-gray-400 max-w-sm text-center mb-6">
                      {t('wb.canvas.emptyDesc')}
                    </p>
                    <div className="flex gap-3 pointer-events-auto">
                      <button
                        onClick={() => dispatch({ type: 'SHOW_SECTION_PICKER', insertIndex: 0 })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold
                          hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25"
                      >
                        <LayoutTemplate size={16} />
                        {t('wb.canvas.pickTemplate')}
                      </button>
                    </div>
                  </div>
                )}

                {state.isDragging && currentWidgets.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 bg-blue-50/50">
                      <p className="text-blue-500 font-medium text-lg">{t('wb.canvas.dropHere')}</p>
                    </div>
                  </div>
                )}

                <GridLayout
                  className="layout"
                  layout={legacyLayout}
                  cols={cols}
                  rowHeight={rowHeight}
                  width={canvasWidth}
                  onLayoutChange={handleLegacyLayoutChange as any}
                  onDrop={handleLegacyDrop as any}
                  isDroppable={true}
                  droppingItem={droppingItem}
                  compactType="vertical"
                  preventCollision={false}
                  useCSSTransforms={true}
                  draggableHandle=".widget-drag-handle"
                  margin={[8, 8]}
                  containerPadding={[16, 16]}
                >
                  {currentWidgets.map(widget => (
                    <div key={widget.id}>
                      <WidgetItem
                        widget={widget}
                        isSelected={state.selectedWidgetId === widget.id}
                        isHovered={state.hoveredWidgetId === widget.id}
                      />
                    </div>
                  ))}
                </GridLayout>

                {/* Bottom add-section button when legacy canvas has widgets */}
                {currentWidgets.length > 0 && (
                  <div className="py-4">
                    <AddSectionButton
                      onClick={() => dispatch({ type: 'SHOW_SECTION_PICKER', insertIndex: 0 })}
                      label={t('wb.canvas.convertToSection')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
