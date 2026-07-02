const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaDisplayItem = sequelize.define('SfaDisplayItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    auditId: { type: DataTypes.UUID, allowNull: false, field: 'audit_id' },
    category: { type: DataTypes.STRING(50) },
    checkItem: { type: DataTypes.STRING(200), allowNull: false, field: 'check_item' },
    isCompliant: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_compliant' },
    score: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    maxScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 10, field: 'max_score' },
    facingCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'facing_count' },
    shelfPosition: { type: DataTypes.STRING(30), field: 'shelf_position' },
    photoUrl: { type: DataTypes.TEXT, field: 'photo_url' },
    notes: { type: DataTypes.TEXT },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_display_items', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaDisplayItem.associate = (models) => {
    SfaDisplayItem.belongsTo(models.SfaDisplayAudit, { foreignKey: 'audit_id', as: 'audit' });
  };
  return SfaDisplayItem;
};
