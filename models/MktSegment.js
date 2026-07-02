const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktSegment = sequelize.define('MktSegment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    segmentType: { type: DataTypes.STRING(20), defaultValue: 'static', field: 'segment_type' },
    criteria: { type: DataTypes.JSONB, defaultValue: {} },
    customerCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'customer_count' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    autoRefresh: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_refresh' },
    refreshFrequency: { type: DataTypes.STRING(20), defaultValue: 'weekly', field: 'refresh_frequency' },
    lastRefreshedAt: { type: DataTypes.DATE, field: 'last_refreshed_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'mkt_segments',
    timestamps: true,
    underscored: true
  });

  MktSegment.associate = (models) => {
    MktSegment.hasMany(models.MktSegmentRule, { foreignKey: 'segment_id', as: 'rules' });
  };

  return MktSegment;
};
