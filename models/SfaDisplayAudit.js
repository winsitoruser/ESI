const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaDisplayAudit = sequelize.define('SfaDisplayAudit', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    visitId: { type: DataTypes.UUID, field: 'visit_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    salespersonId: { type: DataTypes.INTEGER, field: 'salesperson_id' },
    auditDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'audit_date' },
    storeType: { type: DataTypes.STRING(30), field: 'store_type' },
    overallScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'overall_score' },
    compliancePct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'compliance_pct' },
    totalItems: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_items' },
    compliantItems: { type: DataTypes.INTEGER, defaultValue: 0, field: 'compliant_items' },
    photoBeforeUrl: { type: DataTypes.TEXT, field: 'photo_before_url' },
    photoAfterUrl: { type: DataTypes.TEXT, field: 'photo_after_url' },
    notes: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'submitted' },
    reviewedBy: { type: DataTypes.INTEGER, field: 'reviewed_by' },
    reviewedAt: { type: DataTypes.DATE, field: 'reviewed_at' },
    lat: { type: DataTypes.DECIMAL(10, 7) },
    lng: { type: DataTypes.DECIMAL(10, 7) },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'sfa_display_audits', timestamps: true, underscored: true });

  SfaDisplayAudit.associate = (models) => {
    SfaDisplayAudit.belongsTo(models.SfaVisit, { foreignKey: 'visit_id', as: 'visit' });
    SfaDisplayAudit.hasMany(models.SfaDisplayItem, { foreignKey: 'audit_id', as: 'items' });
  };
  return SfaDisplayAudit;
};
