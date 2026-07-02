import React, { useState, useMemo } from 'react';
import { useBuilder } from './BuilderContext';
import { getWidgetDefinition } from './widgets/registry';
import { WidgetProperty, BuilderRow, BuilderColumn, ROW_LAYOUT_PRESETS } from './types';
import { useTranslation } from '../../lib/i18n';
import {
  X, Trash2, Copy, Lock, Unlock, Eye, EyeOff,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ChevronDown, ChevronRight, Settings, Palette, Layout, Type,
  Columns, ArrowUpDown,
} from 'lucide-react';

const groupIcons: Record<string, React.FC<any>> = {
  'Konten': Type,
  'Style': Palette,
  'Layout': Layout,
  'Pengaturan': Settings,
  'Links': Layout,
};

function PropertyField({ prop, value, onChange }: {
  prop: WidgetProperty;
  value: any;
  onChange: (val: any) => void;
}) {
  switch (prop.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={prop.placeholder}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white resize-y
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? 0}
          onChange={e => onChange(Number(e.target.value))}
          min={prop.min}
          max={prop.max}
          step={prop.step}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      );

    case 'slider':
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={value ?? prop.defaultValue}
            onChange={e => onChange(Number(e.target.value))}
            min={prop.min ?? 0}
            max={prop.max ?? 100}
            step={prop.step ?? 1}
            className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer
              accent-blue-500"
          />
          <span className="text-xs text-gray-500 font-mono w-10 text-right">
            {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
          </span>
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="color"
              value={value ?? '#000000'}
              onChange={e => onChange(e.target.value)}
              className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer p-0.5"
            />
          </div>
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-md bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      );

    case 'select':
      return (
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        >
          {prop.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <button
          onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
            value ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            value ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`} />
        </button>
      );

    case 'alignment':
      return (
        <div className="flex gap-1">
          {[
            { val: 'left', icon: AlignLeft },
            { val: 'center', icon: AlignCenter },
            { val: 'right', icon: AlignRight },
            { val: 'justify', icon: AlignJustify },
          ].map(({ val, icon: Icon }) => (
            <button
              key={val}
              onClick={() => onChange(val)}
              className={`flex-1 p-1.5 rounded-md transition-colors ${
                value === val
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} className="mx-auto" />
            </button>
          ))}
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      );
  }
}

// ======== Row Properties Editor ========
function RowPropertiesEditor() {
  const { state, dispatch, currentSections } = useBuilder();
  const { t } = useTranslation();

  const selectedRow = useMemo(() => {
    if (!state.selectedRowId) return null;
    for (const section of currentSections) {
      const row = (section.rows || []).find(r => r.id === state.selectedRowId);
      if (row) return { row, sectionId: section.id };
    }
    return null;
  }, [state.selectedRowId, currentSections]);

  if (!selectedRow) return null;
  const { row, sectionId } = selectedRow;

  const updateStyle = (key: string, value: any) => {
    dispatch({ type: 'UPDATE_ROW_STYLE', sectionId, rowId: row.id, style: { [key]: value } });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="p-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <AlignJustify size={16} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{t('wb.propertyEditor.rowProperties')}</div>
              <div className="text-[10px] text-gray-400">{row.columns.length} {t('wb.row.columns')}</div>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SELECT_ROW', rowId: null })}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Column Layout Presets */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">{t('wb.canvas.columnLayout')}</label>
          <div className="grid grid-cols-2 gap-1.5">
            {ROW_LAYOUT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => dispatch({ type: 'SET_ROW_LAYOUT', sectionId, rowId: row.id, columns: preset.columns })}
                className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-100
                  hover:border-indigo-400 hover:bg-indigo-50 transition-all"
              >
                <div className="flex w-full gap-0.5 h-5">
                  {preset.columns.map((w, i) => (
                    <div key={i} style={{ width: `${w}%` }} className="bg-gray-200 rounded-sm" />
                  ))}
                </div>
                <span className="text-[9px] text-gray-500 font-medium">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gap */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.row.gap')}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={48} step={4} value={row.style?.gap ?? 16}
              onChange={e => updateStyle('gap', Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            <span className="text-xs text-gray-500 font-mono w-8 text-right">{row.style?.gap ?? 16}px</span>
          </div>
        </div>

        {/* Vertical Alignment */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.row.verticalAlign')}</label>
          <div className="flex gap-1">
            {(['top', 'middle', 'bottom', 'stretch'] as const).map(val => (
              <button key={val}
                onClick={() => updateStyle('verticalAlign', val)}
                className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
                  (row.style?.verticalAlign || 'top') === val
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t(`wb.row.${val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.row.backgroundColor')}</label>
          <div className="flex items-center gap-2">
            <input type="color" value={row.style?.backgroundColor || '#ffffff'}
              onChange={e => updateStyle('backgroundColor', e.target.value)}
              className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer p-0.5" />
            <input type="text" value={row.style?.backgroundColor || 'transparent'}
              onChange={e => updateStyle('backgroundColor', e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-md bg-white" />
          </div>
        </div>

        {/* Padding */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.row.padding')}</label>
          <div className="grid grid-cols-2 gap-2">
            {(['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] as const).map(key => (
              <div key={key} className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 w-4">{key.replace('padding', '')[0]}</span>
                <input type="number" min={0} max={200} value={row.style?.[key] ?? 8}
                  onChange={e => updateStyle(key, Number(e.target.value))}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md bg-white w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Options */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Mobile</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={row.style?.stackOnMobile ?? true}
                onChange={e => updateStyle('stackOnMobile', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600" />
              <span className="text-xs text-gray-600">{t('wb.row.stackOnMobile')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={row.style?.reverseOnMobile ?? false}
                onChange={e => updateStyle('reverseOnMobile', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600" />
              <span className="text-xs text-gray-600">{t('wb.row.reverseOnMobile')}</span>
            </label>
          </div>
        </div>

        {/* Min Height */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.row.minHeight')}</label>
          <input type="number" min={0} max={1000} value={row.style?.minHeight ?? 0}
            onChange={e => updateStyle('minHeight', Number(e.target.value))}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white" />
        </div>
      </div>
    </div>
  );
}

// ======== Column Properties Editor ========
function ColumnPropertiesEditor() {
  const { state, dispatch, currentSections } = useBuilder();
  const { t } = useTranslation();

  const selectedColumn = useMemo(() => {
    if (!state.selectedColumnId) return null;
    for (const section of currentSections) {
      for (const row of (section.rows || [])) {
        const col = row.columns.find(c => c.id === state.selectedColumnId);
        if (col) return { column: col, sectionId: section.id, rowId: row.id };
      }
    }
    return null;
  }, [state.selectedColumnId, currentSections]);

  if (!selectedColumn) return null;
  const { column, sectionId, rowId } = selectedColumn;

  const updateStyle = (key: string, value: any) => {
    dispatch({ type: 'UPDATE_COLUMN_STYLE', sectionId, rowId, columnId: column.id, style: { [key]: value } });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="p-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Columns size={16} className="text-cyan-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{t('wb.propertyEditor.columnProperties')}</div>
              <div className="text-[10px] text-gray-400">{t('wb.column.width')}: {Math.round(column.width)}%</div>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SELECT_COLUMN', columnId: null })}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Width */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.column.widthPercent')}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={10} max={100} step={5} value={column.width}
              onChange={e => dispatch({ type: 'UPDATE_COLUMN_STYLE', sectionId, rowId, columnId: column.id, style: { width: Number(e.target.value) } })}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            <span className="text-xs text-gray-500 font-mono w-10 text-right">{Math.round(column.width)}%</span>
          </div>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.column.backgroundColor')}</label>
          <div className="flex items-center gap-2">
            <input type="color" value={column.style?.backgroundColor || '#ffffff'}
              onChange={e => updateStyle('backgroundColor', e.target.value)}
              className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer p-0.5" />
            <input type="text" value={column.style?.backgroundColor || 'transparent'}
              onChange={e => updateStyle('backgroundColor', e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-md bg-white" />
          </div>
        </div>

        {/* Padding */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.column.padding')}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={48} step={4} value={column.style?.padding ?? 8}
              onChange={e => updateStyle('padding', Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            <span className="text-xs text-gray-500 font-mono w-8 text-right">{column.style?.padding ?? 8}px</span>
          </div>
        </div>

        {/* Vertical Alignment */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.column.verticalAlign')}</label>
          <div className="flex gap-1">
            {(['top', 'middle', 'bottom', 'stretch'] as const).map(val => (
              <button key={val}
                onClick={() => updateStyle('verticalAlign', val)}
                className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
                  (column.style?.verticalAlign || 'top') === val
                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t(`wb.row.${val}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Border Radius */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.column.borderRadius')}</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={32} step={2} value={column.style?.borderRadius ?? 0}
              onChange={e => updateStyle('borderRadius', Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            <span className="text-xs text-gray-500 font-mono w-8 text-right">{column.style?.borderRadius ?? 0}px</span>
          </div>
        </div>

        {/* Shadow */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('wb.column.shadow')}</label>
          <select value={column.style?.shadow || 'none'}
            onChange={e => updateStyle('shadow', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white">
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function PropertyEditor() {
  const { state, selectedWidget, dispatch, currentSections } = useBuilder();
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Konten', 'Style', 'Layout', 'Pengaturan', 'Links']));

  const definition = selectedWidget ? getWidgetDefinition(selectedWidget.type) : null;

  const groupedProperties = useMemo(() => {
    if (!definition) return {};
    const groups: Record<string, WidgetProperty[]> = {};
    definition.properties.forEach(prop => {
      const group = prop.group || 'Umum';
      if (!groups[group]) groups[group] = [];
      groups[group].push(prop);
    });
    return groups;
  }, [definition]);

  const toggleGroup = (group: string) => {
    const next = new Set(expandedGroups);
    if (next.has(group)) next.delete(group); else next.add(group);
    setExpandedGroups(next);
  };

  const handlePropertyChange = (key: string, value: any) => {
    if (!selectedWidget) return;
    dispatch({ type: 'UPDATE_WIDGET_PROPERTY', widgetId: selectedWidget.id, key, value });
  };

  // Show row properties if a row is selected
  if (state.selectedRowId && !selectedWidget) {
    return <RowPropertiesEditor />;
  }

  // Show column properties if a column is selected
  if (state.selectedColumnId && !selectedWidget) {
    return <ColumnPropertiesEditor />;
  }

  if (!selectedWidget || !definition) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Settings size={28} className="text-gray-300" />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">{t('wb.propertyEditor.noWidget')}</p>
        <p className="text-xs text-center text-gray-400 leading-relaxed">
          {t('wb.propertyEditor.selectWidget')}
        </p>
      </div>
    );
  }

  const Icon = definition.icon;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Header */}
      <div className="p-3 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Icon size={16} className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">{definition.name}</div>
              <div className="text-[10px] text-gray-400">{selectedWidget.id.slice(0, 8)}...</div>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'SELECT_WIDGET', id: null })}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              dispatch({ type: 'PUSH_HISTORY', description: `Duplikasi ${definition.name}` });
              dispatch({ type: 'DUPLICATE_WIDGET', id: selectedWidget.id });
            }}
            className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-md text-xs
              text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
            title={t('wb.common.duplicate')}
          >
            <Copy size={13} />
            <span>{t('wb.common.duplicate')}</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'LOCK_WIDGET', id: selectedWidget.id })}
            className="flex items-center justify-center gap-1 p-1.5 rounded-md text-xs
              text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
            title={selectedWidget.locked ? t('wb.common.unlock') : t('wb.common.lock')}
          >
            {selectedWidget.locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WIDGET_VISIBILITY', id: selectedWidget.id })}
            className="flex items-center justify-center gap-1 p-1.5 rounded-md text-xs
              text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
            title={selectedWidget.hidden ? t('wb.common.show') : t('wb.common.hide')}
          >
            {selectedWidget.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'PUSH_HISTORY', description: `Hapus ${definition.name}` });
              dispatch({ type: 'DELETE_WIDGET', id: selectedWidget.id });
            }}
            className="flex items-center justify-center gap-1 p-1.5 rounded-md text-xs
              text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
            title={t('wb.common.delete')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Object.entries(groupedProperties).map(([groupName, props]) => {
          const isExpanded = expandedGroups.has(groupName);
          const GroupIcon = groupIcons[groupName] || Settings;

          return (
            <div key={groupName} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <GroupIcon size={14} className="text-gray-400" />
                <span className="flex-1 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {groupName}
                </span>
                {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {props.map(prop => (
                    <div key={prop.key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        {prop.label}
                      </label>
                      <PropertyField
                        prop={prop}
                        value={selectedWidget.properties[prop.key]}
                        onChange={(val) => handlePropertyChange(prop.key, val)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Size Info */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'X', value: selectedWidget.layout.x },
            { label: 'Y', value: selectedWidget.layout.y },
            { label: 'W', value: selectedWidget.layout.w },
            { label: 'H', value: selectedWidget.layout.h },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-md py-1.5">
              <div className="text-[10px] text-gray-400 font-medium">{item.label}</div>
              <div className="text-xs font-semibold text-gray-700">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
