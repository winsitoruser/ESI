const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    businessTypeId: {
      type: DataTypes.UUID,
      field: 'business_type_id',
      references: {
        model: 'business_types',
        key: 'id'
      }
    },
    businessName: {
      type: DataTypes.STRING(255),
      field: 'business_name'
    },
    businessAddress: {
      type: DataTypes.TEXT,
      field: 'business_address'
    },
    businessPhone: {
      type: DataTypes.STRING(50),
      field: 'business_phone'
    },
    businessEmail: {
      type: DataTypes.STRING(255),
      field: 'business_email'
    },
    setupCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'setup_completed'
    },
    onboardingStep: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'onboarding_step'
    },
    kybStatus: {
      type: DataTypes.STRING(30),
      defaultValue: 'pending_kyb',
      field: 'kyb_status'
    },
    businessStructure: {
      type: DataTypes.STRING(20),
      defaultValue: 'single',
      field: 'business_structure'
    },
    parentTenantId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_tenant_id',
      references: { model: 'tenants', key: 'id' }
    },
    isHq: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_hq'
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'activated_at'
    },
    activatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'activated_by'
    },
    businessCode: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
      field: 'business_code'
    }
  }, {
    tableName: 'tenants',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Tenant.associate = (models) => {
    // Tenant belongs to a business type
    Tenant.belongsTo(models.BusinessType, {
      foreignKey: 'businessTypeId',
      as: 'businessType'
    });

    // Tenant has many users
    Tenant.hasMany(models.User, {
      foreignKey: 'tenantId',
      as: 'users'
    });

    // Tenant has many modules through tenant_modules
    Tenant.belongsToMany(models.Module, {
      through: models.TenantModule,
      foreignKey: 'tenantId',
      otherKey: 'moduleId',
      as: 'modules'
    });

    // Direct access to junction table
    Tenant.hasMany(models.TenantModule, {
      foreignKey: 'tenantId',
      as: 'tenantModules'
    });

    // KYB Applications
    Tenant.hasMany(models.KybApplication, {
      foreignKey: 'tenantId',
      as: 'kybApplications'
    });

    // Sub-branches (for HQ tenants)
    Tenant.hasMany(models.Tenant, {
      foreignKey: 'parentTenantId',
      as: 'subBranches'
    });

    // Parent HQ
    Tenant.belongsTo(models.Tenant, {
      foreignKey: 'parentTenantId',
      as: 'parentTenant'
    });
  };

  return Tenant;
};
