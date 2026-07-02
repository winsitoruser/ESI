const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const BranchRealTimeMetrics = sequelize.define('BranchRealTimeMetrics', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'branch_id',
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  // Kitchen Metrics
  kitchenStatus: {
    type: DataTypes.ENUM('idle', 'normal', 'busy', 'overloaded'),
    defaultValue: 'idle',
    field: 'kitchen_status'
  },
  kitchenActiveOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'kitchen_active_orders'
  },
  kitchenPendingOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'kitchen_pending_orders'
  },
  kitchenAvgPrepTime: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Average preparation time in minutes',
    field: 'kitchen_avg_prep_time'
  },
  kitchenSlaCompliance: {
    type: DataTypes.FLOAT,
    defaultValue: 100,
    comment: 'SLA compliance percentage',
    field: 'kitchen_sla_compliance'
  },
  // Queue Metrics
  queueLength: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'queue_length'
  },
  queueAvgWaitTime: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Average wait time in minutes',
    field: 'queue_avg_wait_time'
  },
  queueServedToday: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'queue_served_today'
  },
  // Order Metrics
  ordersOnline: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_online'
  },
  ordersOffline: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_offline'
  },
  ordersDineIn: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_dine_in'
  },
  ordersTakeaway: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_takeaway'
  },
  ordersDelivery: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_delivery'
  },
  totalOrdersToday: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_orders_today'
  },
  // Occupancy Metrics
  tableOccupancy: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    comment: 'Table occupancy percentage',
    field: 'table_occupancy'
  },
  tablesTotal: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'tables_total'
  },
  tablesOccupied: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'tables_occupied'
  },
  tablesAvailable: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'tables_available'
  },
  tablesReserved: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'tables_reserved'
  },
  // Employee Metrics
  employeesPresent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'employees_present'
  },
  employeesTotal: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'employees_total'
  },
  employeesOnBreak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'employees_on_break'
  },
  kitchenStaffActive: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'kitchen_staff_active'
  },
  cashiersActive: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'cashiers_active'
  },
  waitersActive: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'waiters_active'
  },
  // Sales Metrics
  salesToday: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'sales_today'
  },
  salesThisHour: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'sales_this_hour'
  },
  avgTransactionValue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'avg_transaction_value'
  },
  transactionsToday: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'transactions_today'
  },
  // Timestamps
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_updated'
  }
}, {
  tableName: 'branch_realtime_metrics',
  timestamps: true,
  underscored: true
});

module.exports = BranchRealTimeMetrics;
