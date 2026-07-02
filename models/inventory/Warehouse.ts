/**
 * Warehouse Model
 * Sequelize model for warehouse management
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '@/lib/sequelize';

class Warehouse extends Model {
  public id!: string;
  public code!: string;
  public name!: string;
  public address!: string;
  public type!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Warehouse.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('main', 'branch', 'storage', 'production'),
      defaultValue: 'storage',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Warehouse',
    tableName: 'warehouses',
    timestamps: true,
    underscored: true,
  }
);

export default Warehouse;
export { Warehouse };
