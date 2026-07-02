import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface AttendanceAttributes {
  id: string;
  tenantId: string;
  branchId: string;
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  workHours?: number;
  overtimeHours?: number;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'sick' | 'holiday';
  leaveType?: string;
  notes?: string;
  location?: any;
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public id!: string;
  public tenantId!: string;
  public branchId!: string;
  public employeeId!: string;
  public date!: Date;
  public checkIn?: Date;
  public checkOut?: Date;
  public workHours?: number;
  public overtimeHours?: number;
  public status!: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'sick' | 'holiday';
  public leaveType?: string;
  public notes?: string;
  public location?: any;
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Attendance.init(
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'hris_employees',
        key: 'id',
      },
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    checkIn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    checkOut: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    workHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    overtimeHours: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('present', 'absent', 'late', 'half_day', 'leave', 'sick', 'holiday'),
      allowNull: false,
      defaultValue: 'present',
    },
    leaveType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
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
    tableName: 'hris_attendance',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['branchId'] },
      { fields: ['employeeId'] },
      { fields: ['date'] },
      { fields: ['status'] },
      { fields: ['employeeId', 'date'], unique: true },
    ],
  }
);

export default Attendance;
