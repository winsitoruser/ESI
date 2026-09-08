import { Plus, Trash2, MapPin, Wallet } from 'lucide-react';
import {
  COST_CATEGORIES,
  emptyCost,
  emptyStop,
  inferTripType,
  itineraryBudget,
  itineraryRoute,
  stopBudget,
  type ItineraryStop,
  type TravelCostCategory,
  type TravelCostLine,
  type TravelTransport,
  type TravelTripType,
} from '@/lib/hris/travel-itinerary';

const TRANSPORT: Array<{ value: TravelTransport; label: string }> = [
  { value: 'flight', label: 'Pesawat' },
  { value: 'train', label: 'Kereta' },
  { value: 'bus', label: 'Bus' },
  { value: 'car', label: 'Mobil' },
  { value: 'ferry', label: 'Kapal / ferry' },
  { value: 'other', label: 'Lainnya' },
];

function fmt(n: number) {
  return `Rp ${(n || 0).toLocaleString('id-ID')}`;
}

type Variant = 'ops' | 'portal';

export default function TravelItineraryEditor({
  originCity,
  onOriginChange,
  tripType,
  onTripTypeChange,
  stops,
  onChange,
  variant = 'ops',
  readOnly = false,
}: {
  originCity: string;
  onOriginChange: (v: string) => void;
  tripType: TravelTripType;
  onTripTypeChange: (v: TravelTripType) => void;
  stops: ItineraryStop[];
  onChange: (stops: ItineraryStop[]) => void;
  variant?: Variant;
  readOnly?: boolean;
}) {
  const isPortal = variant === 'portal';
  const input = isPortal
    ? 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
    : 'hf-input w-full';
  const label = isPortal
    ? 'text-xs font-medium text-slate-600 mb-1 block'
    : 'text-xs font-medium text-[color:var(--hf-ink-muted)] mb-1 block';

  const setStop = (index: number, patch: Partial<ItineraryStop>) => {
    onChange(stops.map((s, i) => (i === index ? { ...s, ...patch, seq: i + 1 } : { ...s, seq: i + 1 })));
  };
  const setCosts = (index: number, costs: TravelCostLine[]) => setStop(index, { costs });
  const addStop = () => {
    const last = stops[stops.length - 1];
    onChange([...stops, emptyStop(stops.length + 1, {
      arriveDate: last?.departDate || '',
      transportMode: last?.transportMode || 'flight',
    })]);
    if (stops.length >= 1 && tripType === 'single') onTripTypeChange('multi_city');
  };
  const removeStop = (index: number) => {
    const next = stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, seq: i + 1 }));
    onChange(next.length ? next : [emptyStop(1)]);
    if (next.length <= 1) onTripTypeChange('single');
  };

  const total = itineraryBudget(stops);
  const route = itineraryRoute(originCity, stops, tripType);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Kota asal</label>
          <input
            value={originCity}
            onChange={(e) => onOriginChange(e.target.value)}
            placeholder="Jakarta"
            className={input}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className={label}>Jenis rute</label>
          <select
            value={tripType}
            onChange={(e) => {
              const v = e.target.value as TravelTripType;
              onTripTypeChange(v);
              if (v === 'single' && stops.length > 1) onChange([stops[0]]);
              if (v === 'multi_city' && stops.length < 2) addStop();
            }}
            className={input}
            disabled={readOnly}
          >
            <option value="single">Satu kota</option>
            <option value="round_trip">Pergi–pulang</option>
            <option value="multi_city">Multi kota</option>
          </select>
        </div>
      </div>

      {route && (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${
            isPortal ? 'bg-teal-50 text-teal-800' : 'bg-[var(--hf-brand-50)] text-[color:var(--hf-brand-600)]'
        }`}>
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold leading-snug">{route}</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {stops.filter((s) => s.city).length} kota · rencana {fmt(total)}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {stops.map((stop, index) => (
          <div
            key={stop.id}
            className={`rounded-2xl border p-3 sm:p-4 space-y-3 ${
              isPortal ? 'border-slate-200 bg-slate-50/80' : 'border-[var(--hf-border)] bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">
                Kota {index + 1}
                {stop.city ? ` · ${stop.city}` : ''}
              </p>
              {!readOnly && stops.length > 1 && (
                <button type="button" onClick={() => removeStop(index)} className="text-xs text-rose-600 hover:bg-rose-50 rounded-lg px-2 py-1 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Kota tujuan</label>
                <input value={stop.city} onChange={(e) => setStop(index, { city: e.target.value })} placeholder="Surabaya" className={input} disabled={readOnly} />
              </div>
              <div>
                <label className={label}>Transport ke kota ini</label>
                <select value={stop.transportMode} onChange={(e) => setStop(index, { transportMode: e.target.value as TravelTransport })} className={input} disabled={readOnly}>
                  {TRANSPORT.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Tiba</label>
                <input type="date" value={stop.arriveDate} onChange={(e) => setStop(index, { arriveDate: e.target.value })} className={input} disabled={readOnly} />
              </div>
              <div>
                <label className={label}>Berangkat / selesai</label>
                <input type="date" value={stop.departDate} onChange={(e) => setStop(index, { departDate: e.target.value })} className={input} disabled={readOnly} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Agenda / kegiatan</label>
                <input value={stop.activity} onChange={(e) => setStop(index, { activity: e.target.value })} placeholder="Meeting cabang, audit, training…" className={input} disabled={readOnly} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Penginapan (opsional)</label>
                <input value={stop.lodging || ''} onChange={(e) => setStop(index, { lodging: e.target.value })} placeholder="Nama hotel" className={input} disabled={readOnly} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5" /> Rencana biaya kota ini
                </p>
                <span className="text-xs font-semibold text-slate-800">{fmt(stopBudget(stop))}</span>
              </div>
              <div className="space-y-2">
                {(stop.costs || []).map((cost, ci) => (
                  <div key={cost.id} className="grid grid-cols-[1fr_7rem_auto] sm:grid-cols-[10rem_1fr_7rem_auto] gap-1.5 items-center">
                    <select
                      value={cost.category}
                      onChange={(e) => {
                        const category = e.target.value as TravelCostCategory;
                        const meta = COST_CATEGORIES.find((c) => c.code === category);
                        setCosts(index, stop.costs.map((c, j) => j === ci ? { ...c, category, label: meta?.label || category } : c));
                      }}
                      className={input}
                      disabled={readOnly}
                    >
                      {COST_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <input
                      className={`${input} hidden sm:block`}
                      value={cost.label}
                      onChange={(e) => setCosts(index, stop.costs.map((c, j) => j === ci ? { ...c, label: e.target.value } : c))}
                      placeholder="Keterangan"
                      disabled={readOnly}
                    />
                    <input
                      type="number"
                      min={0}
                      className={input}
                      value={cost.estimated || ''}
                      onChange={(e) => setCosts(index, stop.costs.map((c, j) => j === ci ? { ...c, estimated: parseInt(e.target.value, 10) || 0 } : c))}
                      placeholder="0"
                      disabled={readOnly}
                    />
                    {!readOnly && (
                      <button type="button" onClick={() => setCosts(index, stop.costs.filter((_, j) => j !== ci))} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Hapus komponen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setCosts(index, [...stop.costs, emptyCost('other')])}
                  className={`mt-2 text-xs font-medium flex items-center gap-1 ${isPortal ? 'text-teal-700' : 'text-[color:var(--hf-brand-600)]'}`}
                >
                  <Plus className="w-3.5 h-3.5" /> Komponen biaya
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={addStop}
          className={`w-full py-2.5 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-1.5 ${
            isPortal
              ? 'border-teal-300 text-teal-800 hover:bg-teal-50'
              : 'border-[var(--hf-brand-100)] text-[color:var(--hf-brand-600)] hover:bg-[var(--hf-brand-50)]'
          }`}
        >
          <Plus className="w-4 h-4" /> Tambah kota
        </button>
      )}
      <p className="text-[11px] text-slate-500">
        Jenis rute terdeteksi: {inferTripType(stops) === 'multi_city' ? 'multi kota' : 'satu kota'}.
        Total rencana {fmt(total)}.
      </p>
    </div>
  );
}

export function TravelItinerarySummary({
  originCity,
  tripType,
  stops,
  expenses = [],
}: {
  originCity: string;
  tripType: TravelTripType;
  stops: ItineraryStop[];
  expenses?: Array<{ itinerary_stop_id?: string; itineraryStopId?: string; amount?: number; category?: string; description?: string; status?: string }>;
}) {
  const actualByStop = (stopId: string) =>
    expenses
      .filter((e) => (e.itinerary_stop_id || e.itineraryStopId) === stopId)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-800">{itineraryRoute(originCity, stops, tripType) || '—'}</p>
      {stops.map((stop) => {
        const planned = stopBudget(stop);
        const actual = actualByStop(stop.id);
        return (
          <div key={stop.id} className="rounded-xl border border-[var(--hf-border)] p-3">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">{stop.city || 'Kota'}</p>
                <p className="text-xs text-slate-500">
                  {stop.arriveDate || '—'} → {stop.departDate || '—'}
                  {stop.activity ? ` · ${stop.activity}` : ''}
                </p>
              </div>
              <div className="text-right text-xs">
                <p>Rencana {fmt(planned)}</p>
                <p className={actual > planned && planned > 0 ? 'text-rose-600 font-medium' : 'text-slate-600'}>
                  Aktual {fmt(actual)}
                </p>
              </div>
            </div>
            {(stop.costs || []).length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {stop.costs.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>{c.label}</span>
                    <span className="font-medium">{fmt(c.estimated)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
