import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../lib/sequelize';

interface PerformanceReviewAttributes {
  id: string;
  tenantId: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  reviewDate: Date;
  performanceScore: number;
  kpiAchievement: number;
  attendanceScore: number;
  rating: number;
  strengths?: string;
  weaknesses?: string;
  goals?: string;
  comments?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  metadata?: any;
  createdBy: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PerformanceReviewCreationAttributes extends Optional<PerformanceReviewAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class PerformanceReview extends Model<PerformanceReviewAttributes, PerformanceReviewCreationAttributes> implements PerformanceReviewAttributes {
  public id!: string;
  public tenantId!: string;
  public employeeId!: string;
  public reviewerId!: string;
  public reviewPeriod!: string;
  public reviewDate!: Date;
  public performanceScore!: number;
  public kpiAchievement!: number;
  public attendanceScore!: number;
  public rating!: number;
  public strengths?: string;
  public weaknesses?: string;
  public goals?: string;
  public comments?: string;
  public status!: 'draft' | 'submitted' | 'approved' | 'rejected';
  public metadata?: any;
  public createdBy!: string;
  public updatedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PerformanceReview.init(
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'hris_employees',
        key: 'id',
      },
    },
    reviewerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'hris_employees',
        key: 'id',
      },
    },
    reviewPeriod: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    performanceScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    kpiAchievement: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    attendanceScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    rating: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    weaknesses: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    goals: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'draft',
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
    tableName: 'hris_performance_reviews',
    timestamps: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['employeeId'] },
      { fields: ['reviewerId'] },
      { fields: ['reviewDate'] },
      { fields: ['status'] },
    ],
  }
);

export default PerformanceReview;
