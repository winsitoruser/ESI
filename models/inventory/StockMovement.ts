import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface StockMovementAttributes {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
  quantity: number;
  fromBranchId?: string;
  toBranchId?: string;
  referenceType?: string;
  referenceId?: string;
  unitCost: number;
  totalCost: number;
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  metadata?: any;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StockMovementCreationAttributes extends Optional<StockMovementAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class StockMovement extends Model<StockMovementAttributes, StockMovementCreationAttributes> implements StockMovementAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId!: string;
  public productId!: string;
  public type!: 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
  public quantity!: number;
  public fromBranchId?: string;
  public toBranchId?: string;
  public referenceType?: string;
  public referenceId?: string;
  public unitCost!: number;
  public totalCost!: number;
  public reason?: string;
  public notes?: string;
  public performedBy!: string;
  public performedAt!: Date;
  public metadata?: any;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StockMovement.init(
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
      allowNull: false,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'inventory_products',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM('in', 'out', 'transfer', 'adjustment', 'return'),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fromBranchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    toBranchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    unitCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    totalCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    performedBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    performedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'inventory_stock_movements',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['productId'] },
      { fields: ['type'] },
      { fields: ['performedAt'] },
    ],
  }
);

export default StockMovement;
