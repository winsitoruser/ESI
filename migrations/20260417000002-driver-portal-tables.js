'use strict';

/**
 * Driver Portal — tabel pendukung:
 *   1. fleet_vehicle_inspections  — cek kelayakan kendaraan pre-trip (K3)
 *   2. fleet_delivery_proofs      — Proof of Delivery (foto + tanda tangan)
 *   3. fleet_driver_expenses      — pengeluaran harian driver (tol/parkir/makan)
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ================================================================
    // 1. fleet_vehicle_inspections
    // ================================================================
    await queryInterface.createTable('fleet_vehicle_inspections', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      assignment_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_route_assignments', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      driver_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_drivers', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      vehicle_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_vehicles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      inspection_type: {
        type: Sequelize.STRING(30), allowNull: false, defaultValue: 'pre_trip',
        comment: 'pre_trip, post_trip, periodic',
      },
      odometer_reading: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      fuel_level_percent: { type: Sequelize.INTEGER, allowNull: true },
      // Checklist items (JSON) — contoh:
      // { tires: "ok", lights: "ok", brakes: "ok", mirrors: "ok",
      //   oil: "ok", coolant: "ok", wiper: "ok", horn: "ok",
      //   seatbelt: "ok", spare_tire: "ok", toolkit: "ok", documents: "ok" }
      checklist: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      issues_found: { type: Sequelize.JSONB, allowNull: true, comment: 'list of problems' },
      overall_status: {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pass',
        comment: 'pass, pass_with_notes, fail',
      },
      photos: { type: Sequelize.JSONB, allowNull: true, comment: 'array of photo urls' },
      notes: { type: Sequelize.TEXT, allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('fleet_vehicle_inspections', ['driver_id', 'created_at']);
    await queryInterface.addIndex('fleet_vehicle_inspections', ['vehicle_id', 'created_at']);
    await queryInterface.addIndex('fleet_vehicle_inspections', ['assignment_id']);

    // ================================================================
    // 2. fleet_delivery_proofs  (POD — Proof of Delivery)
    // ================================================================
    await queryInterface.createTable('fleet_delivery_proofs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      assignment_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_route_assignments', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      driver_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_drivers', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      vehicle_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_vehicles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      stop_index: { type: Sequelize.INTEGER, allowNull: true, comment: 'index stop dalam route' },
      recipient_name: { type: Sequelize.STRING(150), allowNull: false },
      recipient_phone: { type: Sequelize.STRING(30), allowNull: true },
      recipient_role: { type: Sequelize.STRING(80), allowNull: true, comment: 'misal: admin, security, keluarga' },
      reference_number: { type: Sequelize.STRING(80), allowNull: true, comment: 'nomor surat jalan / invoice' },
      signature_data: { type: Sequelize.TEXT, allowNull: true, comment: 'data URL base64 (PNG)' },
      photos: { type: Sequelize.JSONB, allowNull: true, comment: 'array of photo urls' },
      items_delivered: { type: Sequelize.JSONB, allowNull: true },
      status: {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'delivered',
        comment: 'delivered, partial, rejected, attempted',
      },
      delivered_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('fleet_delivery_proofs', ['driver_id', 'delivered_at']);
    await queryInterface.addIndex('fleet_delivery_proofs', ['assignment_id']);
    await queryInterface.addIndex('fleet_delivery_proofs', ['reference_number']);

    // ================================================================
    // 3. fleet_driver_expenses  (tol / parkir / makan / lainnya)
    // ================================================================
    await queryInterface.createTable('fleet_driver_expenses', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      assignment_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_route_assignments', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      driver_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_drivers', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      vehicle_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'fleet_vehicles', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      expense_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      category: {
        type: Sequelize.STRING(30), allowNull: false,
        comment: 'toll, parking, meal, lodging, repair, other',
      },
      description: { type: Sequelize.STRING(255), allowNull: true },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'IDR' },
      receipt_number: { type: Sequelize.STRING(80), allowNull: true },
      receipt_photo_url: { type: Sequelize.STRING(500), allowNull: true },
      payment_method: {
        type: Sequelize.STRING(30), allowNull: true,
        comment: 'cash, company_card, reimburse',
      },
      status: {
        type: Sequelize.STRING(20), allowNull: false, defaultValue: 'submitted',
        comment: 'submitted, approved, rejected, paid',
      },
      approved_by: { type: Sequelize.UUID, allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      rejection_reason: { type: Sequelize.STRING(255), allowNull: true },
      latitude: { type: Sequelize.DECIMAL(10, 8), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(11, 8), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('fleet_driver_expenses', ['driver_id', 'expense_date']);
    await queryInterface.addIndex('fleet_driver_expenses', ['assignment_id']);
    await queryInterface.addIndex('fleet_driver_expenses', ['status']);
    await queryInterface.addIndex('fleet_driver_expenses', ['category']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('fleet_driver_expenses');
    await queryInterface.dropTable('fleet_delivery_proofs');
    await queryInterface.dropTable('fleet_vehicle_inspections');
  },
};
