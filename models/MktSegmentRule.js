const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktSegmentRule = sequelize.define('MktSegmentRule', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    segmentId: { type: DataTypes.UUID, allowNull: false, field: 'segment_id' },
    ruleGroup: { type: DataTypes.INTEGER, defaultValue: 0, field: 'rule_group' },
    field: { type: DataTypes.STRING(100), allowNull: false },
    operator: { type: DataTypes.STRING(30), allowNull: false },
    value: { type: DataTypes.TEXT },
    valueType: { type: DataTypes.STRING(20), defaultValue: 'string', field: 'value_type' },
    logicOperator: { type: DataTypes.STRING(5), defaultValue: 'AND', field: 'logic_operator' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, {
    tableName: 'mkt_segment_rules',
    timestamps: true,
    underscored: true
  });

  MktSegmentRule.associate = (models) => {
    MktSegmentRule.belongsTo(models.MktSegment, { foreignKey: 'segment_id', as: 'segment' });
  };

  return MktSegmentRule;
};
