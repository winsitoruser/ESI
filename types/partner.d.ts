import { Model, Optional } from 'sequelize';

export interface PartnerAttributes {
  id: string;
  name: string;
  type: 'pusat' | 'cabang' | 'franchise' | 'mitra';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  ownerId?: string;
  parentId?: string;
  settings?: Record<string, any>;
  logoUrl?: string;
  taxNumber?: string;
  businessLicenseNumber?: string;
  subscriptionPlan?: 'basic' | 'pro' | 'premium' | 'enterprise';
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'cancelled';
  subscriptionExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface PartnerCreationAttributes extends Optional<PartnerAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export interface PartnerInstance 
  extends Model<PartnerAttributes, PartnerCreationAttributes>,
    PartnerAttributes {
      // Instance methods can be defined here
      getCreditRating?: () => Promise<PharmacyCreditRatingInstance>;
      getOwner?: () => Promise<UserInstance>;
      getProducts?: (options?: any) => Promise<ProductInstance[]>;
      getTransactions?: (options?: any) => Promise<TransactionInstance[]>;
      getPurchaseOrders?: (options?: any) => Promise<PurchaseOrderInstance[]>;
    }
