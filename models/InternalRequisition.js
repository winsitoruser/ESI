'use strict';

module.exports = (sequelize, DataTypes) => {
  const InternalRequisition = sequelize.define('InternalRequisition', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ir_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Nomor Internal Requisition (auto-generated)'
    },
    requesting_branch_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Cabang yang mengajukan permintaan'
    },
    fulfilling_branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Cabang/Gudang yang akan memenuhi permintaan (biasanya Pusat)'
    },
    request_type: {
      type: DataTypes.ENUM('restock', 'new_item', 'emergency', 'scheduled', 'transfer'),
      defaultValue: 'restock',
      comment: 'Tipe permintaan'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'submitted',
        'under_review',
        'approved',
        'partially_approved',
        'rejected',
        'processing',
        'ready_to_ship',
        'in_transit',
        'delivered',
        'completed',
        'cancelled'
      ),
      defaultValue: 'draft'
    },
    requested_delivery_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Tanggal pengiriman yang diminta'
    },
    actual_delivery_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    total_items: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_quantity: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    estimated_value: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Estimasi nilai barang yang diminta'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requested_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'User yang membuat IR'
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    consolidated_po_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID PO konsolidasi jika IR ini sudah digabung ke PO'
    }
  }, {
    tableName: 'internal_requisitions',
    timestamps: true,
    underscored: true
  });

  InternalRequisition.associate = (models) => {
    // Belongs to requesting branch
    InternalRequisition.belongsTo(models.Branch, {
      foreignKey: 'requesting_branch_id',
      as: 'requestingBranch'
    });

    // Belongs to fulfilling branch
    InternalRequisition.belongsTo(models.Branch, {
      foreignKey: 'fulfilling_branch_id',
      as: 'fulfillingBranch'
    });

    // Has many items
    InternalRequisition.hasMany(models.InternalRequisitionItem, {
      foreignKey: 'requisition_id',
      as: 'items'
    });

    // Belongs to User (requester)
    if (models.User) {
      InternalRequisition.belongsTo(models.User, {
        foreignKey: 'requested_by',
        as: 'requester'
      });
      InternalRequisition.belongsTo(models.User, {
        foreignKey: 'reviewed_by',
        as: 'reviewer'
      });
      InternalRequisition.belongsTo(models.User, {
        foreignKey: 'approved_by',
        as: 'approver'
      });
    }

    // Belongs to consolidated PO
    if (models.PurchaseOrder) {
      InternalRequisition.belongsTo(models.PurchaseOrder, {
        foreignKey: 'consolidated_po_id',
        as: 'consolidatedPO'
      });
    }
  };

  // Generate IR number
  InternalRequisition.generateIRNumber = async function(branchCode) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `IR-${branchCode}-${year}${month}`;
    
    const lastIR = await this.findOne({
      where: {
        ir_number: {
          [sequelize.Sequelize.Op.like]: `${prefix}%`
        }
      },
      order: [['created_at', 'DESC']]
    });

    let sequence = 1;
    if (lastIR) {
      const lastNumber = parseInt(lastIR.ir_number.slice(-4)) || 0;
      sequence = lastNumber + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  };

  return InternalRequisition;
};
