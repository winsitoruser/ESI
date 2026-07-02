const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MfgQcInspection = sequelize.define('MfgQcInspection', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    inspectionNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'inspection_number' },
    workOrderId: { type: DataTypes.UUID, field: 'work_order_id' },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    templateId: { type: DataTypes.UUID, field: 'template_id' },
    inspectionType: { type: DataTypes.STRING(20), defaultValue: 'in_process', field: 'inspection_type' },
    inspectorId: { type: DataTypes.INTEGER, field: 'inspector_id' },
    inspectionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'inspection_date' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    overallResult: { type: DataTypes.STRING(20), field: 'overall_result' },
    sampleSize: { type: DataTypes.INTEGER, defaultValue: 1, field: 'sample_size' },
    defectsFound: { type: DataTypes.INTEGER, defaultValue: 0, field: 'defects_found' },
    defectRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'defect_rate' },
    batchNumber: { type: DataTypes.STRING(100), field: 'batch_number' },
    disposition: { type: DataTypes.STRING(20) },
    correctiveAction: { type: DataTypes.TEXT, field: 'corrective_action' },
    notes: { type: DataTypes.TEXT },
    completedAt: { type: DataTypes.DATE, field: 'completed_at' },
    reviewedBy: { type: DataTypes.INTEGER, field: 'reviewed_by' },
    reviewedAt: { type: DataTypes.DATE, field: 'reviewed_at' }
  }, { tableName: 'mfg_qc_inspections', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  MfgQcInspection.associate = (models) => {
    MfgQcInspection.belongsTo(models.MfgWorkOrder, { foreignKey: 'workOrderId', as: 'workOrder' });
    MfgQcInspection.belongsTo(models.MfgQcTemplate, { foreignKey: 'templateId', as: 'template' });
    MfgQcInspection.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    MfgQcInspection.hasMany(models.MfgQcResult, { foreignKey: 'inspectionId', as: 'results' });
  };

  return MfgQcInspection;
};
