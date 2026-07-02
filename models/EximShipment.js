'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EximShipment = sequelize.define('EximShipment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    shipmentNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'shipment_number' },
    tradeType: { type: DataTypes.STRING(20), allowNull: false, field: 'trade_type' }, // export, import
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(30), defaultValue: 'draft' }, // draft, booked, in_transit, at_port, customs_clearance, delivered, completed, cancelled
    priority: { type: DataTypes.STRING(20), defaultValue: 'normal' },
    incoterm: { type: DataTypes.STRING(20) }, // FOB, CIF, EXW, DDP, etc.
    transportMode: { type: DataTypes.STRING(30), defaultValue: 'sea', field: 'transport_mode' }, // sea, air, land, multimodal
    partnerId: { type: DataTypes.UUID, field: 'partner_id' },
    partnerName: { type: DataTypes.STRING(200), field: 'partner_name' },
    partnerCountry: { type: DataTypes.STRING(100), field: 'partner_country' },
    forwarderId: { type: DataTypes.UUID, field: 'forwarder_id' },
    forwarderName: { type: DataTypes.STRING(200), field: 'forwarder_name' },
    shippingLine: { type: DataTypes.STRING(200), field: 'shipping_line' },
    vesselName: { type: DataTypes.STRING(200), field: 'vessel_name' },
    voyageNumber: { type: DataTypes.STRING(50), field: 'voyage_number' },
    flightNumber: { type: DataTypes.STRING(50), field: 'flight_number' },
    originPort: { type: DataTypes.STRING(200), field: 'origin_port' },
    originCountry: { type: DataTypes.STRING(100), field: 'origin_country' },
    destinationPort: { type: DataTypes.STRING(200), field: 'destination_port' },
    destinationCountry: { type: DataTypes.STRING(100), field: 'destination_country' },
    etd: { type: DataTypes.DATE }, // estimated time of departure
    eta: { type: DataTypes.DATE }, // estimated time of arrival
    atd: { type: DataTypes.DATE }, // actual time of departure
    ata: { type: DataTypes.DATE }, // actual time of arrival
    totalWeight: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'total_weight' },
    weightUnit: { type: DataTypes.STRING(10), defaultValue: 'kg', field: 'weight_unit' },
    totalVolume: { type: DataTypes.DECIMAL(15, 4), defaultValue: 0, field: 'total_volume' },
    volumeUnit: { type: DataTypes.STRING(10), defaultValue: 'cbm', field: 'volume_unit' },
    totalPackages: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_packages' },
    goodsValue: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'goods_value' },
    insuranceValue: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'insurance_value' },
    freightCost: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'freight_cost' },
    totalCost: { type: DataTypes.DECIMAL(19, 2), defaultValue: 0, field: 'total_cost' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'USD' },
    exchangeRate: { type: DataTypes.DECIMAL(15, 4), defaultValue: 1, field: 'exchange_rate' },
    lcNumber: { type: DataTypes.STRING(50), field: 'lc_number' },
    poReference: { type: DataTypes.STRING(100), field: 'po_reference' },
    invoiceReference: { type: DataTypes.STRING(100), field: 'invoice_reference' },
    customsStatus: { type: DataTypes.STRING(30), field: 'customs_status' }, // pending, submitted, inspecting, cleared, held
    notes: { type: DataTypes.TEXT },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'exim_shipments', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  EximShipment.associate = (models) => {
    EximShipment.hasMany(models.EximDocument, { foreignKey: 'shipmentId', as: 'documents' });
    EximShipment.hasMany(models.EximContainer, { foreignKey: 'shipmentId', as: 'containers' });
    EximShipment.hasMany(models.EximCost, { foreignKey: 'shipmentId', as: 'costs' });
    EximShipment.hasMany(models.EximCustoms, { foreignKey: 'shipmentId', as: 'customs' });
  };

  return EximShipment;
};
