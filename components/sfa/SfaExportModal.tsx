import { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Download, Loader2, CheckSquare, Square, BarChart3 } from 'lucide-react';

type TFn = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  open: boolean;
  onClose: () => void;
  t: TFn;
  hasCrm: boolean;
  hasSfa: boolean;
};

type EntityRow = { id: string; label: string; module: string; category: string };

export default function SfaExportModal({ open, onClose, t, hasCrm, hasSfa }: Props) {
  const [grouped, setGrouped] = useState<Record<string, EntityRow[]> | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moduleScope, setModuleScope] = useState<'all' | 'sfa' | 'crm'>('all');
  const [includeAnalytics, setIncludeAnalytics] = useState(true);
  const [salesType, setSalesType] = useState('');
  const [outletChannel, setOutletChannel] = useState('');
  const [productGroup, setProductGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetDates = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 89);
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(end.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!open) return;
    resetDates();
    setError(null);
    (async () => {
      try {
        const r = await fetch('/api/hq/sfa/import-export?action=entities');
        const d = await r.json();
        if (d.success && d.data?.grouped) {
          setGrouped(d.data.grouped);
          const def = new Set<string>(['leads', 'opportunities', 'visits', 'sales_entries']);
          if (hasCrm) {
            def.add('customers');
            def.add('tasks');
          }
          setSelected(def);
        }
      } catch {
        setGrouped(null);
      }
    })();
  }, [open, hasCrm, resetDates]);

  useEffect(() => {
    if (moduleScope === 'crm') {
      setSelected((prev) => {
        const n = new Set(prev);
        n.delete('sales_entries');
        return n;
      });
    }
  }, [moduleScope]);

  const flatEntities = useMemo(() => {
    if (!grouped) return [];
    const rows: EntityRow[] = [];
    Object.values(grouped).forEach((list) => {
      list.forEach((e) => rows.push(e));
    });
    return rows;
  }, [grouped]);

  const visibleEntities = useMemo(() => {
    return flatEntities.filter((e) => {
      if (!hasSfa && e.module === 'sfa') return false;
      if (!hasCrm && e.module === 'crm') return false;
      if (moduleScope === 'sfa' && e.module !== 'sfa') return false;
      if (moduleScope === 'crm' && e.module !== 'crm') return false;
      return true;
    });
  }, [flatEntities, hasSfa, hasCrm, moduleScope]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    const ids = visibleEntities.map((e) => e.id);
    if (moduleScope !== 'crm') ids.push('sales_entries');
    setSelected(new Set(ids));
  };

  const clearAll = () => setSelected(new Set());

  const submit = async () => {
    const entities = Array.from(selected);
    if (!entities.length) {
      setError(t('sfa.exportPickOne'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hq/sfa/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          entities,
          includeAnalytics,
          moduleScope,
          salesFilters: {
            sales_type: salesType || undefined,
            outlet_channel: outletChannel || undefined,
            product_group: productGroup || undefined,
          },
        }),
      });
      if (!res.ok) {
        let msg = t('sfa.exportFailed');
        try {
          const j = await res.json();
          if (j.error) msg = String(j.error);
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition');
      let filename = `sfa_export_${dateFrom}_${dateTo}.xlsx`;
      if (cd) {
        const m = /filename="?([^";]+)"?/i.exec(cd);
        if (m) filename = m[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError(t('sfa.exportFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Download className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t('sfa.exportCenterTitle')}</h2>
              <p className="text-[11px] text-gray-500">{t('sfa.exportCenterSub')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('sfa.exportDateFrom')}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('sfa.exportDateTo')}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">{t('sfa.exportModuleScope')}</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              value={moduleScope}
              onChange={(e) => setModuleScope(e.target.value as 'all' | 'sfa' | 'crm')}
            >
              <option value="all">{t('sfa.exportModuleAll')}</option>
              <option value="sfa">{t('sfa.exportModuleSfa')}</option>
              {hasCrm && <option value="crm">{t('sfa.exportModuleCrm')}</option>}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnalytics}
              onChange={(e) => setIncludeAnalytics(e.target.checked)}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-800">{t('sfa.exportIncludeAnalytics')}</span>
          </label>

          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-amber-900">{t('sfa.exportSalesExtra')}</p>
            <div className="grid grid-cols-1 gap-2">
              <input
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                placeholder="sales_type (primary / secondary …)"
                value={salesType}
                onChange={(e) => setSalesType(e.target.value)}
              />
              <input
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                placeholder="outlet_channel"
                value={outletChannel}
                onChange={(e) => setOutletChannel(e.target.value)}
              />
              <input
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                placeholder="product_group"
                value={productGroup}
                onChange={(e) => setProductGroup(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-500">{t('sfa.exportSalesExtraHint')}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-600">{t('sfa.exportSelectDatasets')}</span>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllVisible} className="text-[10px] font-semibold text-amber-700 hover:underline">
                  {t('sfa.exportSelectAll')}
                </button>
                <button type="button" onClick={clearAll} className="text-[10px] font-semibold text-gray-500 hover:underline">
                  {t('sfa.exportClearAll')}
                </button>
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50">
              {moduleScope !== 'crm' && (
                <button
                  type="button"
                  onClick={() => toggle('sales_entries')}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-left"
                >
                  {selected.has('sales_entries') ? (
                    <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                  <span className="text-xs text-gray-800">{t('sfa.exportEntitySales')}</span>
                  <span className="text-[10px] text-gray-400 ml-auto">SFA</span>
                </button>
              )}
              {visibleEntities.map((e) => (
                <label key={e.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <button type="button" onClick={() => toggle(e.id)} className="flex items-center gap-2 flex-1 text-left">
                    {selected.has(e.id) ? (
                      <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-300 shrink-0" />
                    )}
                    <span className="text-xs text-gray-800">{e.label}</span>
                    <span className="text-[10px] text-gray-400 ml-auto uppercase">{e.module}</span>
                  </button>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100"
          >
            {t('sfa.cancelBtn')}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? t('sfa.exportGenerating') : t('sfa.exportDownloadXlsx')}
          </button>
        </div>
      </div>
    </div>
  );
}
