/**
 * Mock Customer Data
 * Used as fallback when database is unavailable
 */

export const mockCustomers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '081234567890',
    loyaltyTier: 'Gold',
    loyaltyPoints: 5000,
    totalPurchases: 50,
    totalSpent: 25000000,
    status: 'active',
    createdAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '081234567891',
    loyaltyTier: 'Silver',
    loyaltyPoints: 2500,
    totalPurchases: 30,
    totalSpent: 15000000,
    status: 'active',
    createdAt: new Date('2024-02-20')
  }
];

export const mockCustomerSummary = {
  totalCustomers: 150,
  newThisMonth: 12,
  activeCustomers: 145,
  inactiveCustomers: 5,
  averageSpending: 500000,
  topSpenders: [
    {
      id: '1',
      name: 'John Doe',
      totalSpent: 25000000,
      loyaltyTier: 'Gold'
    },
    {
      id: '2',
      name: 'Jane Smith',
      totalSpent: 15000000,
      loyaltyTier: 'Silver'
    }
  ]
};

export const mockPurchaseHistory = [
  {
    id: 'TRX001',
    customerId: '1',
    date: new Date('2024-01-20'),
    total: 500000,
    items: 5,
    status: 'completed'
  },
  {
    id: 'TRX002',
    customerId: '1',
    date: new Date('2024-01-25'),
    total: 750000,
    items: 8,
    status: 'completed'
  }
];

export const mockLoyaltyPrograms = [
  {
    id: '1',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 999,
    discount: 5,
    benefits: ['5% discount on all purchases']
  },
  {
    id: '2',
    name: 'Silver',
    minPoints: 1000,
    maxPoints: 4999,
    discount: 10,
    benefits: ['10% discount on all purchases', 'Birthday bonus']
  },
  {
    id: '3',
    name: 'Gold',
    minPoints: 5000,
    maxPoints: 9999,
    discount: 15,
    benefits: ['15% discount on all purchases', 'Birthday bonus', 'Priority service']
  },
  {
    id: '4',
    name: 'Platinum',
    minPoints: 10000,
    maxPoints: null,
    discount: 20,
    benefits: ['20% discount on all purchases', 'Birthday bonus', 'Priority service', 'Exclusive events']
  }
];

export default {
  mockCustomers,
  mockCustomerSummary,
  mockPurchaseHistory,
  mockLoyaltyPrograms
};
