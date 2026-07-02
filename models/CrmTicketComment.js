const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmTicketComment = sequelize.define('CrmTicketComment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticketId: { type: DataTypes.UUID, field: 'ticket_id' },
    commentType: { type: DataTypes.STRING(20), defaultValue: 'reply', field: 'comment_type' },
    body: { type: DataTypes.TEXT, allowNull: false },
    isPublic: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_public' },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_ticket_comments',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  CrmTicketComment.associate = (models) => {
    CrmTicketComment.belongsTo(models.CrmTicket, { foreignKey: 'ticket_id', as: 'ticket' });
  };

  return CrmTicketComment;
};
