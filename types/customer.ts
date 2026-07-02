export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  address: string | null;
  totalSpent: number;
  loyaltyPoints: number;
  membershipLevel: MembershipLevel;
  registrationDate: string;
  lastPurchaseDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export type MembershipLevel = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  averagePurchaseValue: number;
  customerRetentionRate: number;
  topSpenders: Customer[];
  recentCustomers: Customer[];
}

export interface CustomerPurchaseHistory {
  id: string;
  customerId: string;
  date: string;
  invoiceNumber: string;
  totalAmount: number;
  items: PurchaseItem[];
  paymentMethod: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  reward: string;
  isActive: boolean;
  expiryDate: string | null;
  termsAndConditions: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  customerCount: number;
  isActive: boolean;
}

export interface SegmentCriteria {
  minSpend?: number;
  maxSpend?: number;
  minPurchaseFrequency?: number;
  membershipLevels?: MembershipLevel[];
  purchasedProducts?: string[];
  registrationDateStart?: string;
  registrationDateEnd?: string;
}
