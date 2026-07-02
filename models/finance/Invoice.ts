import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface InvoiceAttributes {
  id: string;
  tenantId: string;
  branchId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  type: 'sales' | 'purchase' | 'inter_branch';
  customerId?: string;
  supplierId?: string;
  relatedBranchId?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms?: string;
  notes?: string;
  items: any;
  attachments?: any;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InvoiceCreationAttributes extends Optional<InvoiceAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Invoice extends Model<InvoiceAttributes, InvoiceCreationAttributes> implements InvoiceAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId?: string;
  public invoiceNumber!: string;
  public invoiceDate!: Date;
  public dueDate!: Date;
  public type!: 'sales' | 'purchase' | 'inter_branch';
  public customerId?: string;
  public supplierId?: string;
  public relatedBranchId?: string;
  public subtotal!: number;
  public taxAmount!: number;
  public discountAmount!: number;
  public totalAmount!: number;
  public paidAmount!: number;
  public outstandingAmount!: number;
  public currency!: string;
  public status!: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  public paymentTerms?: string;
  public notes?: string;
  public items!: any;
  public attachments?: any;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Invoice.init(
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
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    invoiceDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('sales', 'purchase', 'inter_branch'),
      allowNull: false,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    relatedBranchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id',
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    outstandingAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'IDR',
    },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    paymentTerms: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: 'finance_invoices',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['invoiceNumber'], unique: true },
      { fields: ['invoiceDate'] },
      { fields: ['dueDate'] },
      { fields: ['type'] },
      { fields: ['status'] },
    ],
  }
);

export default Invoice;
