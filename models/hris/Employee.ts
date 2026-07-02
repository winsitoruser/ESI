import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface EmployeeAttributes {
  id: string;
  tenantId: string;
  branchId: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  managerId?: string;
  joinDate: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'intern';
  salary?: number;
  bankAccount?: string;
  taxId?: string;
  address?: string;
  emergencyContact?: any;
  documents?: any;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EmployeeCreationAttributes extends Optional<EmployeeAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Employee extends Model<EmployeeAttributes, EmployeeCreationAttributes> implements EmployeeAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId!: string;
  public employeeNumber!: string;
  public name!: string;
  public email!: string;
  public phone!: string;
  public position!: string;
  public department!: string;
  public managerId?: string;
  public joinDate!: Date;
  public endDate?: Date;
  public status!: 'active' | 'inactive' | 'on_leave' | 'terminated';
  public employmentType!: 'full_time' | 'part_time' | 'contract' | 'intern';
  public salary?: number;
  public bankAccount?: string;
  public taxId?: string;
  public address?: string;
  public emergencyContact?: any;
  public documents?: any;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Employee.init(
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
    employeeNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'hris_employees',
        key: 'id',
      },
    },
    joinDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'on_leave', 'terminated'),
      allowNull: false,
      defaultValue: 'active',
    },
    employmentType: {
      type: DataTypes.ENUM('full_time', 'part_time', 'contract', 'intern'),
      allowNull: false,
      defaultValue: 'full_time',
    },
    salary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    bankAccount: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    taxId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emergencyContact: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    documents: {
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
    tableName: 'hris_employees',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['employeeNumber'], unique: true },
      { fields: ['email'] },
      { fields: ['status'] },
      { fields: ['department'] },
    ],
  }
);

export default Employee;
