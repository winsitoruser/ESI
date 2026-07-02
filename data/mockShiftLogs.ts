export const mockShiftLogs = [
  {
    id: '1',
    cashierName: 'John Doe',
    openedAt: new Date('2026-01-18T08:00:00'),
    closedAt: new Date('2026-01-18T16:00:00'),
    openingCash: 1000000,
    closingCash: 3500000,
    totalSales: 2500000,
    transactionCount: 45,
    status: 'closed' as const
  },
  {
    id: '2',
    cashierName: 'Jane Smith',
    openedAt: new Date('2026-01-18T16:00:00'),
    closedAt: new Date('2026-01-18T23:00:00'),
    openingCash: 1000000,
    closingCash: 2800000,
    totalSales: 1800000,
    transactionCount: 32,
    status: 'closed' as const
  },
  {
    id: '3',
    cashierName: 'Bob Wilson',
    openedAt: new Date('2026-01-19T08:00:00'),
    openingCash: 1000000,
    totalSales: 1200000,
    transactionCount: 18,
    status: 'open' as const
  }
];
