const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaVisit = sequelize.define('SfaVisit', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    salespersonId: { type: DataTypes.INTEGER, field: 'salesperson_id' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    visitType: { type: DataTypes.STRING(30), defaultValue: 'regular', field: 'visit_type' },
    purpose: { type: DataTypes.TEXT },
    visitDate: { type: DataTypes.DATEONLY, field: 'visit_date' },
    status: { type: DataTypes.STRING(20), defaultValue: 'planned' },
    checkInTime: { type: DataTypes.DATE, field: 'check_in_time' },
    checkInLat: { type: DataTypes.DECIMAL(10, 7), field: 'check_in_lat' },
    checkInLng: { type: DataTypes.DECIMAL(10, 7), field: 'check_in_lng' },
    checkInAddress: { type: DataTypes.TEXT, field: 'check_in_address' },
    checkInPhotoUrl: { type: DataTypes.TEXT, field: 'check_in_photo_url' },
    checkOutTime: { type: DataTypes.DATE, field: 'check_out_time' },
    checkOutLat: { type: DataTypes.DECIMAL(10, 7), field: 'check_out_lat' },
    checkOutLng: { type: DataTypes.DECIMAL(10, 7), field: 'check_out_lng' },
    checkOutAddress: { type: DataTypes.TEXT, field: 'check_out_address' },
    checkOutPhotoUrl: { type: DataTypes.TEXT, field: 'check_out_photo_url' },
    durationMinutes: { type: DataTypes.INTEGER, field: 'duration_minutes' },
    outcome: { type: DataTypes.STRING(30) },
    outcomeNotes: { type: DataTypes.TEXT, field: 'outcome_notes' },
    orderTaken: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'order_taken' },
    orderValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'order_value' },
    feedback: { type: DataTypes.TEXT },
    nextVisitDate: { type: DataTypes.DATEONLY, field: 'next_visit_date' }
  }, {
    tableName: 'sfa_visits',
    timestamps: true,
    underscored: true
  });

  SfaVisit.associate = (models) => {
    SfaVisit.belongsTo(models.SfaLead, { foreignKey: 'lead_id', as: 'lead' });
    SfaVisit.belongsTo(models.SfaOpportunity, { foreignKey: 'opportunity_id', as: 'opportunity' });
  };

  return SfaVisit;
};
