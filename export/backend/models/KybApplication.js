const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const KybApplication = sequelize.define('KybApplication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'id' }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' }
  },

  // Step 1: Business Identity
  businessName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'business_name'
  },
  businessCategory: {
    type: DataTypes.STRING(100),
    field: 'business_category'
  },
  businessSubcategory: {
    type: DataTypes.STRING(100),
    field: 'business_subcategory'
  },
  businessDuration: {
    type: DataTypes.STRING(50),
    field: 'business_duration'
  },
  businessDescription: {
    type: DataTypes.TEXT,
    field: 'business_description'
  },
  employeeCount: {
    type: DataTypes.STRING(50),
    field: 'employee_count'
  },
  annualRevenue: {
    type: DataTypes.STRING(50),
    field: 'annual_revenue'
  },

  // Step 2: Legal Status
  legalEntityType: {
    type: DataTypes.STRING(50),
    field: 'legal_entity_type'
  },
  legalEntityName: {
    type: DataTypes.STRING(255),
    field: 'legal_entity_name'
  },
  nibNumber: {
    type: DataTypes.STRING(100),
    field: 'nib_number'
  },
  siupNumber: {
    type: DataTypes.STRING(100),
    field: 'siup_number'
  },
  npwpNumber: {
    type: DataTypes.STRING(100),
    field: 'npwp_number'
  },
  ktpNumber: {
    type: DataTypes.STRING(50),
    field: 'ktp_number'
  },
  ktpName: {
    type: DataTypes.STRING(255),
    field: 'ktp_name'
  },

  // Step 4: PIC & Address
  picName: {
    type: DataTypes.STRING(255),
    field: 'pic_name'
  },
  picPhone: {
    type: DataTypes.STRING(50),
    field: 'pic_phone'
  },
  picEmail: {
    type: DataTypes.STRING(255),
    field: 'pic_email'
  },
  picPosition: {
    type: DataTypes.STRING(100),
    field: 'pic_position'
  },
  businessAddress: {
    type: DataTypes.TEXT,
    field: 'business_address'
  },
  businessCity: {
    type: DataTypes.STRING(100),
    field: 'business_city'
  },
  businessProvince: {
    type: DataTypes.STRING(100),
    field: 'business_province'
  },
  businessPostalCode: {
    type: DataTypes.STRING(20),
    field: 'business_postal_code'
  },
  businessDistrict: {
    type: DataTypes.STRING(100),
    field: 'business_district'
  },
  businessCoordinates: {
    type: DataTypes.JSON,
    field: 'business_coordinates'
  },

  // Step 5: Business Structure
  businessStructure: {
    type: DataTypes.STRING(20),
    defaultValue: 'single',
    field: 'business_structure'
  },
  plannedBranchCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'planned_branch_count'
  },
  branchLocations: {
    type: DataTypes.JSON,
    field: 'branch_locations'
  },

  // Step 6: Additional
  additionalNotes: {
    type: DataTypes.TEXT,
    field: 'additional_notes'
  },
  referralSource: {
    type: DataTypes.STRING(100),
    field: 'referral_source'
  },
  expectedStartDate: {
    type: DataTypes.DATEONLY,
    field: 'expected_start_date'
  },

  // KYB Status
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'draft'
  },
  submittedAt: {
    type: DataTypes.DATE,
    field: 'submitted_at'
  },
  currentStep: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'current_step'
  },
  completionPercentage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'completion_percentage'
  },

  // Review
  reviewedBy: {
    type: DataTypes.UUID,
    field: 'reviewed_by'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    field: 'reviewed_at'
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    field: 'review_notes'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    field: 'rejection_reason'
  }
}, {
  tableName: 'kyb_applications',
  timestamps: true,
  underscored: true
});

KybApplication.associate = function(models) {
  KybApplication.belongsTo(models.Tenant, {
    foreignKey: 'tenant_id',
    as: 'tenant'
  });
  KybApplication.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  KybApplication.hasMany(models.KybDocument, {
    foreignKey: 'kyb_application_id',
    as: 'documents'
  });
};

module.exports = KybApplication;
