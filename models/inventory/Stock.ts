import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface StockAttributes {
  id: string;
  tenantId: string;
  branchId: string;
  warehouseId?: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unitCost: number;
  totalValue: number;
  lastRestockDate?: Date;
  lastSyncDate?: Date;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StockCreationAttributes extends Optional<StockAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Stock extends Model<StockAttributes, StockCreationAttributes> implements StockAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId!: string;
  public warehouseId?: string;
  public productId!: string;
  public quantity!: number;
  public reservedQuantity!: number;
  public availableQuantity!: number;
  public unitCost!: number;
  public totalValue!: number;
  public lastRestockDate?: Date;
  public lastSyncDate?: Date;
  public status!: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Stock.init(
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
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'inventory_warehouses',
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reservedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    availableQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unitCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    totalValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    lastRestockDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSyncDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock', 'overstock'),
      allowNull: false,
      defaultValue: 'in_stock',
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
    tableName: 'inventory_stocks',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['productId'] },
      { fields: ['status'] },
      { fields: ['branchId', 'productId'], unique: true },
    ],
  }
);

export default Stock;
