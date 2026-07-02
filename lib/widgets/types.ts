import { LucideIcon } from 'lucide-react';
import { ComponentType } from 'react';

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

export type WidgetModule =
  | 'core'
  | 'sales'
  | 'branches'
  | 'finance'
  | 'hris'
  | 'inventory'
  | 'sfa'
  | 'manufacturing'
  | 'fleet'
  | 'marketing';

export interface WidgetComponentProps {
  isEditMode?: boolean;
  size?: WidgetSize;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  module: WidgetModule;
  icon: LucideIcon;
  defaultSize: WidgetSize;
  component: ComponentType<WidgetComponentProps>;
}

export interface WidgetLayoutItem {
  widgetId: string;
  size: WidgetSize;
  order: number;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface DashboardLayout {
  widgets: WidgetLayoutItem[];
  updatedAt: string;
}

export const MODULE_LABELS: Record<WidgetModule, string> = {
  core: 'Umum',
  sales: 'Penjualan',
  branches: 'Cabang',
  finance: 'Keuangan',
  hris: 'SDM & HRIS',
  inventory: 'Inventory',
  sfa: 'CRM & Sales Force',
  manufacturing: 'Manufaktur',
  fleet: 'Fleet & Transport',
  marketing: 'Marketing',
};

export const MODULE_COLORS: Record<WidgetModule, string> = {
  core: 'bg-gray-100 text-gray-700',
  sales: 'bg-emerald-100 text-emerald-700',
  branches: 'bg-blue-100 text-blue-700',
  finance: 'bg-violet-100 text-violet-700',
  hris: 'bg-amber-100 text-amber-700',
  inventory: 'bg-orange-100 text-orange-700',
  sfa: 'bg-pink-100 text-pink-700',
  manufacturing: 'bg-indigo-100 text-indigo-700',
  fleet: 'bg-cyan-100 text-cyan-700',
  marketing: 'bg-rose-100 text-rose-700',
};

export const SIZE_COLS: Record<WidgetSize, string> = {
  sm: 'col-span-12 sm:col-span-6 lg:col-span-3',
  md: 'col-span-12 sm:col-span-6 lg:col-span-6',
  lg: 'col-span-12 lg:col-span-9',
  xl: 'col-span-12',
};

export const SIZE_TO_GRID: Record<WidgetSize, { w: number; h: number; minW: number; minH: number }> = {
  sm: { w: 3, h: 4, minW: 2, minH: 3 },
  md: { w: 6, h: 4, minW: 3, minH: 3 },
  lg: { w: 9, h: 5, minW: 4, minH: 3 },
  xl: { w: 12, h: 3, minW: 6, minH: 2 },
};

export const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: 'Kecil (1/4)',
  md: 'Sedang (1/2)',
  lg: 'Besar (3/4)',
  xl: 'Penuh (Full)',
};
