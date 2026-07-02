const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaCoverageAssignment = sequelize.define('SfaCoverageAssignment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    coveragePlanId: { type: DataTypes.UUID, field: 'coverage_plan_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    customerClass: { type: DataTypes.STRING(30), defaultValue: 'general', field: 'customer_class' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    visitDay: { type: DataTypes.STRING(10), field: 'visit_day' },
    visitWeek: { type: DataTypes.INTEGER, field: 'visit_week' },
    visitFrequency: { type: DataTypes.STRING(20), defaultValue: 'weekly', field: 'visit_frequency' },
    lastVisitDate: { type: DataTypes.DATEONLY, field: 'last_visit_date' },
    nextPlannedVisit: { type: DataTypes.DATEONLY, field: 'next_planned_visit' },
    totalVisitsPlanned: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_visits_planned' },
    totalVisitsActual: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_visits_actual' },
    compliancePct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'compliance_pct' },
    customerAddress: { type: DataTypes.TEXT, field: 'customer_address' },
    customerLat: { type: DataTypes.DECIMAL(10, 7), field: 'customer_lat' },
    customerLng: { type: DataTypes.DECIMAL(10, 7), field: 'customer_lng' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'sfa_coverage_assignments', timestamps: true, underscored: true });

  SfaCoverageAssignment.associate = (models) => {
    SfaCoverageAssignment.belongsTo(models.SfaCoveragePlan, { foreignKey: 'coverage_plan_id', as: 'plan' });
    SfaCoverageAssignment.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
    SfaCoverageAssignment.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
  };
  return SfaCoverageAssignment;
};
