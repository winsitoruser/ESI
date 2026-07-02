import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface ProductAttributes {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  category: string;
  subCategory?: string;
  unit: string;
  barcode?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate?: number;
  isActive: boolean;
  trackInventory: boolean;
  minStockLevel?: number;
  maxStockLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  images?: any;
  specifications?: any;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  public id!: string;
  public tenantId!: string;
  public sku!: string;
  public name!: string;
  public description?: string;
  public categoryId?: string;
  public category!: string;
  public subCategory?: string;
  public unit!: string;
  public barcode?: string;
  public costPrice!: number;
  public sellingPrice!: number;
  public taxRate?: number;
  public isActive!: boolean;
  public trackInventory!: boolean;
  public minStockLevel?: number;
  public maxStockLevel?: number;
  public reorderPoint?: number;
  public reorderQuantity?: number;
  public images?: any;
  public specifications?: any;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
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
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    subCategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    costPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    sellingPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    trackInventory: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    minStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    maxStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reorderPoint: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reorderQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    specifications: {
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
  },
  {
    sequelize,
    tableName: 'inventory_products',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['sku'], unique: true },
      { fields: ['category'] },
      { fields: ['isActive'] },
      { fields: ['barcode'] },
    ],
  }
);

export default Product;
