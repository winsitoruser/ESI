import { Model, DataTypes, ModelAttributes } from 'sequelize';
import sequelize from '../config/database';

export const tenantScope = {
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tenants', key: 'id' },
  },
};

export const branchScope = {
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'branches', key: 'id' },
  },
};

export const timestamps = {
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
};

export const createdBy = {
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  updated_by: { type: DataTypes.INTEGER, allowNull: true },
};

export { sequelize, DataTypes, Model };
export type { ModelAttributes };
