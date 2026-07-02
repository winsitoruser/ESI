import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface AccountAttributes {
  id: string;
  tenantId: string;
  branchId?: string;
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  subCategory?: string;
  parentAccountId?: string;
  balance: number;
  currency: string;
  isActive: boolean;
  description?: string;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AccountCreationAttributes extends Optional<AccountAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Account extends Model<AccountAttributes, AccountCreationAttributes> implements AccountAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId?: string;
  public accountCode!: string;
  public accountName!: string;
  public accountType!: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  public category!: string;
  public subCategory?: string;
  public parentAccountId?: string;
  public balance!: number;
  public currency!: string;
  public isActive!: boolean;
  public description?: string;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Account.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id',
      },
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    accountCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    accountName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    accountType: {
      type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subCategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    parentAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'finance_accounts',
        key: 'id',
      },
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'finance_accounts',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['accountCode'], unique: true },
      { fields: ['accountType'] },
      { fields: ['isActive'] },
    ],
  }
);

export default Account;
