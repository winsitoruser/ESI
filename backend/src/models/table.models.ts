import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Table extends Model {}
Table.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  number: { type: DataTypes.STRING(20), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: true },
  capacity: { type: DataTypes.INTEGER, defaultValue: 4 },
  zone: { type: DataTypes.STRING(50), allowNull: true },
  floor: { type: DataTypes.STRING(50), allowNull: true },
  status: { type: DataTypes.ENUM('available', 'occupied', 'reserved', 'maintenance'), defaultValue: 'available' },
  position_x: { type: DataTypes.INTEGER, allowNull: true },
  position_y: { type: DataTypes.INTEGER, allowNull: true },
  shape: { type: DataTypes.ENUM('square', 'round', 'rectangle'), defaultValue: 'square' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'tables', underscored: true });

export class TableSession extends Model {}
TableSession.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  table_id: { type: DataTypes.INTEGER, allowNull: false },
  transaction_id: { type: DataTypes.INTEGER, allowNull: true },
  guest_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: { type: DataTypes.ENUM('active', 'completed', 'cancelled'), defaultValue: 'active' },
  started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  ended_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'table_sessions', underscored: true });

export class Reservation extends Model {}
Reservation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  reservation_no: { type: DataTypes.STRING(50), allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  customer_name: { type: DataTypes.STRING(200), allowNull: false },
  customer_phone: { type: DataTypes.STRING(20), allowNull: true },
  customer_email: { type: DataTypes.STRING(255), allowNull: true },
  table_id: { type: DataTypes.INTEGER, allowNull: true },
  guest_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  time_start: { type: DataTypes.TIME, allowNull: false },
  time_end: { type: DataTypes.TIME, allowNull: true },
  duration_minutes: { type: DataTypes.INTEGER, defaultValue: 120 },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'), defaultValue: 'pending' },
  special_requests: { type: DataTypes.TEXT, allowNull: true },
  deposit_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  source: { type: DataTypes.ENUM('walk_in', 'phone', 'online', 'app'), defaultValue: 'phone' },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'reservations', paranoid: true, underscored: true });
