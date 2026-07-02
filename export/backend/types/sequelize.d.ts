import { Sequelize, Model, BuildOptions, WhereOptions, FindOptions, UpdateOptions, DestroyOptions, CreateOptions, Transaction } from 'sequelize';

// Basic model interface
export interface ModelStatic<T extends Model> {
  new (values?: object, options?: BuildOptions): T;
  findOne(options?: FindOptions): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  findByPk(id: string | number, options?: FindOptions): Promise<T | null>;
  create(values: object, options?: CreateOptions): Promise<T>;
  update(values: object, options: UpdateOptions): Promise<[number, T[]]>;
  destroy(options?: DestroyOptions): Promise<number>;
  count(options?: { where?: WhereOptions }): Promise<number>;
  // Add any standard model static methods here
}

// PharmacyCreditRating model
export interface PharmacyCreditRatingAttributes {
  id: string;
  pharmacyId: string;
  overallScore: number;
  grade: string;
  riskLevel: string;
  maxLoanAmount: number;
  interestRateMin: number;
  interestRateMax: number;
  recommendation: string;
  lastUpdated: Date;
  nextReviewDate: Date;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PharmacyCreditRatingModel extends Model<PharmacyCreditRatingAttributes>, PharmacyCreditRatingAttributes {}

export type PharmacyCreditRatingStatic = ModelStatic<PharmacyCreditRatingModel>;

// CreditMetric model
export interface CreditMetricAttributes {
  id: string;
  creditRatingId: string;
  name: string;
  value: string;
  numericValue: number;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
  trend: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreditMetricModel extends Model<CreditMetricAttributes>, CreditMetricAttributes {}

export type CreditMetricStatic = ModelStatic<CreditMetricModel>;

// CreditRatingHistory model
export interface CreditRatingHistoryAttributes {
  id: string;
  creditRatingId: string;
  date: Date;
  score: number;
  grade: string;
  riskLevel: string;
  reason: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreditRatingHistoryModel extends Model<CreditRatingHistoryAttributes>, CreditRatingHistoryAttributes {}

export type CreditRatingHistoryStatic = ModelStatic<CreditRatingHistoryModel>;

// Pharmacy model
export interface PharmacyAttributes {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  ownerName: string;
  type: string;
  status: string;
  location: string;
  contactPerson?: string;
  phone?: string;
  joinDate: Date;
  lastActive?: Date;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiry?: Date;
  // Financial metrics for credit assessment
  monthlyRevenue?: number;
  profitMargin?: number;
  inventoryTurnover?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  cashFlow?: number;
  businessAge?: number; // In years
  paymentHistoryScore?: number; // 0-100 scale
  hasDefaulted?: boolean;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PharmacyModel extends Model<PharmacyAttributes>, PharmacyAttributes {}

export type PharmacyStatic = ModelStatic<PharmacyModel>;

// Extend the db interface to include our models
export interface DBInterface {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  PharmacyCreditRating: PharmacyCreditRatingStatic;
  CreditMetric: CreditMetricStatic;
  CreditRatingHistory: CreditRatingHistoryStatic;
  Pharmacy: PharmacyStatic;
  // Add any other models as needed
  [key: string]: any;
}

// Add module augmentation to make TypeScript recognize these types
declare module '@/models' {
  const db: DBInterface;
  export default db;
}
