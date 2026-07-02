import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface TransactionAttributes {
  id: string;
  tenantId: string;
  branchId?: string;
  transactionNumber: string;
  transactionDate: Date;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  accountId: string;
  debitAccountId?: string;
  creditAccountId?: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  description: string;
  reference?: string;
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  attachments?: any;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId?: string;
  public transactionNumber!: string;
  public transactionDate!: Date;
  public type!: 'income' | 'expense' | 'transfer';
  public category!: string;
  public accountId!: string;
  public debitAccountId?: string;
  public creditAccountId?: string;
  public amount!: number;
  public currency!: string;
  public exchangeRate?: number;
  public description!: string;
  public reference?: string;
  public status!: 'draft' | 'pending' | 'completed' | 'cancelled';
  public paymentMethod?: string;
  public attachments?: any;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public approvedBy?: string;
  public approvedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Transaction.init(
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
    transactionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('income', 'expense', 'transfer'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'finance_accounts',
        key: 'id',
      },
    },
    debitAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'finance_accounts',
        key: 'id',
      },
    },
    creditAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'finance_accounts',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR',
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      defaultValue: 1,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    attachments: {
      type: DataTypes.JSONB,
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
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'finance_transactions',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['transactionNumber'], unique: true },
      { fields: ['transactionDate'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['accountId'] },
    ],
  }
);

export default Transaction;
