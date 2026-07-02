import React, { useState } from 'react';
import { Maximize2, Minimize2, X, GripVertical, ChevronDown } from 'lucide-react';
import { WidgetSize, MODULE_COLORS, WidgetModule } from '../../../lib/widgets/types';
import { useTranslation } from '@/lib/i18n';

interface WidgetWrapperProps {
  title: string;
  module: WidgetModule;
  icon: React.ReactNode;
  children: React.ReactNode;
  size?: WidgetSize;
  isEditMode?: boolean;
  noPadding?: boolean;
  onRemove?: () => void;
  onResize?: (size: WidgetSize) => void;
  className?: string;
}

const SIZES: WidgetSize[] = ['sm', 'md', 'lg', 'xl'];

export default function WidgetWrapper({
  title, module, icon, children, size = 'sm',
  isEditMode, noPadding, onRemove, onResize, className = ''
}: WidgetWrapperProps) {
  const { t } = useTranslation();
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const getModuleLabel = (mod: string) => {
    const key = `dashboard.moduleLabels.${mod}`;
    const val = t(key);
    return val !== key ? val : mod;
  };
  const getSizeLabel = (s: string) => {
    const key = `dashboard.sizeLabels.${s}`;
    const val = t(key);
    return val !== key ? val : s;
  };

  return (
    <div className={`h-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden transition-all ${
      isEditMode ? '' : 'hover:shadow-md'
    } ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 ${
        isEditMode ? 'bg-gray-50 cursor-grab' : ''
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          {isEditMode && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          <span className="text-gray-500 flex-shrink-0">{icon}</span>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 ${MODULE_COLORS[module]}`}>
            {getModuleLabel(module)}
          </span>
        </div>
        {isEditMode && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {/* Resize dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSizeMenu(!showSizeMenu)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {size === 'sm' ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showSizeMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => { onResize?.(s); setShowSizeMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                        s === size ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-700'
                      }`}
                    >
                      {getSizeLabel(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Remove */}
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {/* Content */}
      <div className={`flex-1 ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>
    </div>
  );
}
