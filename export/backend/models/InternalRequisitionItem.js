'use strict';

module.exports = (sequelize, DataTypes) => {
  const InternalRequisitionItem = sequelize.define('InternalRequisitionItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requisition_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    requested_quantity: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Jumlah yang diminta oleh cabang'
    },
    approved_quantity: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Jumlah yang disetujui oleh Pusat'
    },
    fulfilled_quantity: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Jumlah yang sudah dipenuhi/dikirim'
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    current_stock: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Stok saat ini di cabang (snapshot)'
    },
    min_stock: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Batas minimum stok di cabang'
    },
    estimated_unit_cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    estimated_total_cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'partially_approved', 'rejected', 'fulfilled'),
      defaultValue: 'pending'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'internal_requisition_items',
    timestamps: true,
    underscored: true
  });

  InternalRequisitionItem.associate = (models) => {
    // Belongs to InternalRequisition
    InternalRequisitionItem.belongsTo(models.InternalRequisition, {
      foreignKey: 'requisition_id',
      as: 'requisition'
    });

    // Belongs to Product
    InternalRequisitionItem.belongsTo(models.Product, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return InternalRequisitionItem;
};
