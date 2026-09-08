/**
 * Multi-city travel itinerary + planned cost components.
 * Client-safe — no sequelize.
 */

export type TravelCostCategory =
  | 'ticket'
  | 'transport'
  | 'hotel'
  | 'meal'
  | 'local_transport'
  | 'communication'
  | 'visa'
  | 'other';

export type TravelTransport = 'flight' | 'train' | 'bus' | 'car' | 'ferry' | 'other';
export type TravelTripType = 'single' | 'round_trip' | 'multi_city';

export type TravelCostLine = {
  id: string;
  category: TravelCostCategory;
  label: string;
  estimated: number;
  notes?: string;
};

export type ItineraryStop = {
  id: string;
  seq: number;
  city: string;
  country?: string;
  arriveDate: string;
  departDate: string;
  activity: string;
  lodging?: string;
  transportMode: TravelTransport;
  costs: TravelCostLine[];
};

export const COST_CATEGORIES: Array<{ code: TravelCostCategory; label: string }> = [
  { code: 'ticket', label: 'Tiket (pesawat/KA/kapal)' },
  { code: 'transport', label: 'Transport bandara/stasiun' },
  { code: 'hotel', label: 'Hotel / penginapan' },
  { code: 'meal', label: 'Makan' },
  { code: 'local_transport', label: 'Transport lokal' },
  { code: 'communication', label: 'Komunikasi' },
  { code: 'visa', label: 'Visa / dokumen' },
  { code: 'other', label: 'Lainnya' },
];

export const COST_TO_EXPENSE: Record<TravelCostCategory, string> = {
  ticket: 'transportation',
  transport: 'transportation',
  hotel: 'accommodation',
  meal: 'meals',
  local_transport: 'transportation',
  communication: 'communication',
  visa: 'other',
  other: 'other',
};

export function costCategoryLabel(code: string): string {
  return COST_CATEGORIES.find((c) => c.code === code)?.label || code;
}

function nid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyCost(category: TravelCostCategory = 'hotel'): TravelCostLine {
  const meta = COST_CATEGORIES.find((c) => c.code === category);
  return { id: nid('c'), category, label: meta?.label || category, estimated: 0 };
}

export function emptyStop(seq: number, partial?: Partial<ItineraryStop>): ItineraryStop {
  return {
    id: nid('s'),
    seq,
    city: '',
    country: 'Indonesia',
    arriveDate: '',
    departDate: '',
    activity: '',
    lodging: '',
    transportMode: 'flight',
    costs: [emptyCost('ticket'), emptyCost('hotel'), emptyCost('meal')],
    ...partial,
  };
}

export type TravelPlan = {
  tripType: TravelTripType;
  originCity: string;
  stops: ItineraryStop[];
};

export function parseTravelPlan(raw: unknown, fallbackOrigin = ''): TravelPlan {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const stops = parseItinerary(obj.stops ?? obj);
    const origin = String(obj.originCity || obj.origin_city || fallbackOrigin || '');
    const tripType = (['single', 'round_trip', 'multi_city'].includes(String(obj.tripType || obj.trip_type))
      ? (obj.tripType || obj.trip_type)
      : inferTripType(stops)) as TravelTripType;
    return { tripType, originCity: origin, stops };
  }
  const stops = parseItinerary(raw);
  return { tripType: inferTripType(stops), originCity: fallbackOrigin, stops };
}

export function serializeTravelPlan(plan: TravelPlan): TravelPlan {
  return {
    tripType: plan.tripType || inferTripType(plan.stops),
    originCity: plan.originCity || '',
    stops: parseItinerary(plan.stops),
  };
}

/** Legacy single-destination payloads (smoke tests / old ESS form). */
export function hydratePlanFromRequest(body: Record<string, unknown>): TravelPlan {
  const origin = String(body.departureCity ?? body.departure_city ?? '');
  let plan = parseTravelPlan(body.itinerary ?? body.plan, origin);
  if (plan.stops.some((s) => s.city)) {
    return serializeTravelPlan({ ...plan, originCity: plan.originCity || origin });
  }
  const destRaw = String(body.destination || '');
  const destCity = destRaw.split('→').map((s) => s.trim()).filter(Boolean).pop() || '';
  if (!destCity) return serializeTravelPlan({ ...plan, originCity: origin });
  const arrive = String(body.departureDate ?? body.startDate ?? body.start_date ?? '');
  const depart = String(body.returnDate ?? body.endDate ?? body.end_date ?? '');
  const transport = (['flight', 'train', 'bus', 'car', 'ferry', 'other'].includes(String(body.transportation))
    ? body.transportation
    : 'flight') as TravelTransport;
  const stop = emptyStop(1, {
    city: destCity,
    arriveDate: arrive,
    departDate: depart,
    transportMode: transport,
  });
  const lump = Number(body.estimatedBudget ?? body.estimated_budget ?? body.estimatedCost ?? 0) || 0;
  if (lump > 0) stop.costs = [{ ...emptyCost('other'), label: 'Anggaran trip', estimated: lump }];
  const tripType = (['single', 'round_trip', 'multi_city'].includes(String(body.tripType || body.trip_type))
    ? (body.tripType || body.trip_type)
    : 'single') as TravelTripType;
  return serializeTravelPlan({ tripType, originCity: origin, stops: [stop] });
}

export function parseItinerary(raw: unknown): ItineraryStop[] {
  let list: any[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) list = p; } catch { list = []; }
  } else if (raw && typeof raw === 'object' && Array.isArray((raw as any).stops)) {
    list = (raw as any).stops;
  }
  return list.map((s, i) => ({
    id: String(s.id || nid('s')),
    seq: Number(s.seq ?? i + 1),
    city: String(s.city || ''),
    country: s.country || 'Indonesia',
    arriveDate: String(s.arriveDate || s.arrive_date || ''),
    departDate: String(s.departDate || s.depart_date || ''),
    activity: String(s.activity || s.agenda || ''),
    lodging: s.lodging || s.hotel || '',
    transportMode: (['flight', 'train', 'bus', 'car', 'ferry', 'other'].includes(s.transportMode || s.transport_mode)
      ? (s.transportMode || s.transport_mode)
      : 'flight') as TravelTransport,
    costs: Array.isArray(s.costs)
      ? s.costs.map((c: any) => ({
        id: String(c.id || nid('c')),
        category: (COST_CATEGORIES.some((x) => x.code === c.category) ? c.category : 'other') as TravelCostCategory,
        label: String(c.label || costCategoryLabel(c.category) || 'Biaya'),
        estimated: Number(c.estimated || c.amount || 0) || 0,
        notes: c.notes || '',
      }))
      : [],
  }));
}

export function stopBudget(stop: ItineraryStop): number {
  return (stop.costs || []).reduce((s, c) => s + (Number(c.estimated) || 0), 0);
}

export function itineraryBudget(stops: ItineraryStop[]): number {
  return stops.reduce((s, st) => s + stopBudget(st), 0);
}

export function itineraryRoute(origin: string, stops: ItineraryStop[], tripType: TravelTripType = 'multi_city'): string {
  const cities = [origin, ...stops.map((s) => s.city).filter(Boolean)].filter(Boolean);
  if (tripType === 'round_trip' && origin && cities[cities.length - 1] !== origin) cities.push(origin);
  const uniqueRun: string[] = [];
  for (const c of cities) {
    if (uniqueRun[uniqueRun.length - 1] !== c) uniqueRun.push(c);
  }
  return uniqueRun.join(' → ') || origin || '';
}

export function inferTripType(stops: ItineraryStop[]): TravelTripType {
  if (stops.length <= 1) return 'single';
  return 'multi_city';
}

export function dateSpan(stops: ItineraryStop[], fallbackStart = '', fallbackEnd = '') {
  const arrives = stops.map((s) => s.arriveDate).filter(Boolean).sort();
  const departs = stops.map((s) => s.departDate).filter(Boolean).sort();
  return {
    start: arrives[0] || fallbackStart,
    end: departs[departs.length - 1] || fallbackEnd,
  };
}

export function budgetByCategory(stops: ItineraryStop[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const st of stops) {
    for (const c of st.costs || []) {
      out[c.category] = (out[c.category] || 0) + (Number(c.estimated) || 0);
    }
  }
  return out;
}
