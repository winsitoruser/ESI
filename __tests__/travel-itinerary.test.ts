import {
  parseItinerary,
  parseTravelPlan,
  itineraryBudget,
  itineraryRoute,
  inferTripType,
  dateSpan,
  emptyStop,
  emptyCost,
  budgetByCategory,
  hydratePlanFromRequest,
} from '@/lib/hris/travel-itinerary';

describe('travel itinerary', () => {
  it('parses multi-city stops and sums planned costs', () => {
    const stops = parseItinerary([
      {
        city: 'Surabaya',
        arriveDate: '2026-09-10',
        departDate: '2026-09-12',
        costs: [
          { category: 'ticket', estimated: 1_200_000 },
          { category: 'hotel', estimated: 1_600_000 },
        ],
      },
      {
        city: 'Bali',
        arriveDate: '2026-09-12',
        departDate: '2026-09-14',
        costs: [{ category: 'ticket', estimated: 800_000 }, { category: 'meal', estimated: 400_000 }],
      },
    ]);
    expect(stops).toHaveLength(2);
    expect(itineraryBudget(stops)).toBe(4_000_000);
    expect(inferTripType(stops)).toBe('multi_city');
    expect(itineraryRoute('Jakarta', stops, 'round_trip')).toBe('Jakarta → Surabaya → Bali → Jakarta');
    expect(dateSpan(stops).start).toBe('2026-09-10');
    expect(dateSpan(stops).end).toBe('2026-09-14');
    expect(budgetByCategory(stops).ticket).toBe(2_000_000);
  });

  it('treats a single stop as single-city', () => {
    const stops = [emptyStop(1, { city: 'Bandung', costs: [emptyCost('hotel')] })];
    expect(inferTripType(stops)).toBe('single');
    expect(itineraryRoute('Jakarta', stops)).toBe('Jakarta → Bandung');
  });

  it('parses a stored plan envelope', () => {
    const plan = parseTravelPlan(
      { tripType: 'round_trip', originCity: 'Jakarta', stops: [{ city: 'Bali', arriveDate: '2026-09-01', departDate: '2026-09-03', costs: [] }] },
      'Bandung',
    );
    expect(plan.tripType).toBe('round_trip');
    expect(plan.originCity).toBe('Jakarta');
    expect(itineraryRoute(plan.originCity, plan.stops, plan.tripType)).toBe('Jakarta → Bali → Jakarta');
  });

  it('accepts wrapped { stops } JSON and snake_case dates', () => {
    const stops = parseItinerary({ stops: [{ city: 'Medan', arrive_date: '2026-10-01', depart_date: '2026-10-03', costs: [] }] });
    expect(stops[0].arriveDate).toBe('2026-10-01');
    expect(stops[0].departDate).toBe('2026-10-03');
  });

  it('hydrates a legacy single-destination payload', () => {
    const plan = hydratePlanFromRequest({
      destination: 'Bandung',
      departureCity: 'Jakarta',
      departureDate: '2026-04-01',
      returnDate: '2026-04-03',
      transportation: 'train',
      estimatedBudget: 500000,
    });
    expect(plan.stops[0].city).toBe('Bandung');
    expect(plan.stops[0].arriveDate).toBe('2026-04-01');
    expect(itineraryBudget(plan.stops)).toBe(500000);
  });
});

describe('travel document', () => {
  it('builds a CSV with route and costs', () => {
    const { travelCsv } = require('@/lib/hris/travel-document');
    const csv = travelCsv({
      request: {
        request_number: 'TRV-1',
        destination: 'Jakarta → Bandung',
        purpose: 'Training',
        estimated_budget: 1000,
        itinerary: { tripType: 'single', originCity: 'Jakarta', stops: [{ city: 'Bandung', arriveDate: '2026-04-01', departDate: '2026-04-02', activity: 'Training', costs: [{ id: 'c1', category: 'ticket', label: 'Tiket', estimated: 1000 }] }] },
      },
      expenses: [{ expense_date: '2026-04-01', category: 'transportation', description: 'KA', amount: 400, status: 'submitted' }],
    });
    expect(csv).toContain('TRV-1');
    expect(csv).toContain('Bandung');
    expect(csv).toContain('Tiket');
  });
});
