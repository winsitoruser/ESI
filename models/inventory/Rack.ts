/**
 * Rack Model
 * Sequelize model for warehouse rack/shelf management
 */
import { DataTypes, Model, Sequelize } from 'sequelize';
import sequelize from '@/lib/sequelize';

class Rack extends Model {
  public id!: string;
  public code!: string;
  public name!: string;
  public warehouseId!: string;
  public floor!: number;
  public capacity!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Rack.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    warehouseId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    floor: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'Rack',
    tableName: 'racks',
    timestamps: true,
    underscored: true,
  }
);

export default Rack;
export { Rack };
