import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface BudgetAttributes {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  fiscalYear: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  category: string;
  accountId?: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  currency: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BudgetCreationAttributes extends Optional<BudgetAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Budget extends Model<BudgetAttributes, BudgetCreationAttributes> implements BudgetAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId?: string;
  public name!: string;
  public fiscalYear!: number;
  public period!: 'monthly' | 'quarterly' | 'yearly';
  public startDate!: Date;
  public endDate!: Date;
  public category!: string;
  public accountId?: string;
  public plannedAmount!: number;
  public actualAmount!: number;
  public variance!: number;
  public variancePercentage!: number;
  public currency!: string;
  public status!: 'draft' | 'active' | 'completed' | 'cancelled';
  public notes?: string;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Budget.init(
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
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    fiscalYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    period: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'finance_accounts',
        key: 'id',
      },
    },
    plannedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    actualAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    variance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    variancePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR',
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    notes: {
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
    tableName: 'finance_budgets',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['fiscalYear'] },
      { fields: ['period'] },
      { fields: ['status'] },
    ],
  }
);

export default Budget;
