import React from 'react';

export const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) => {
  const c: any = {
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
    yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    gray: 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/10',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10',
    orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10',
    indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c[color] || c.blue}`}>{children}</span>;
};

export const Card = ({ children, className = '', hover = false, onClick }: { children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${hover ? 'hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 cursor-pointer' : ''} transition-all duration-200 ${className}`}>{children}</div>
);

export const SectionHeader = ({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div><h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>{subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}</div>
    {action}
  </div>
);

export const PrimaryBtn = ({ children, onClick, icon: Icon }: { children: React.ReactNode; onClick: () => void; icon?: any }) => (
  <button onClick={onClick} className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all">
    {Icon && <Icon className="w-4 h-4" />} {children}
  </button>
);

export const EmptyState = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-gray-300" /></div>
    <p className="text-sm font-medium text-gray-400">{title}</p>
    {subtitle && <p className="text-xs text-gray-300 mt-1">{subtitle}</p>}
  </div>
);

export const TableWrap = ({ children }: { children: React.ReactNode }) => (
  <Card className="overflow-hidden"><div className="overflow-x-auto">{children}</div></Card>
);

export const inputCls = "w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all placeholder:text-gray-300";

export const FI = ({ label, required, children, span }: { label: string; required?: boolean; children: React.ReactNode; span?: number }) => (
  <div className={span === 2 ? 'sm:col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);
