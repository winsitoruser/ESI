const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const BranchModule = sequelize.define('BranchModule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    },
    field: 'branch_id'
  },
  moduleCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'module_code'
  },
  moduleName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'module_name'
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_enabled'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  enabledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'enabled_at'
  },
  enabledBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'enabled_by'
  },
  disabledAt: {
    type: DataTypes.DATE,
    field: 'disabled_at'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'branch_modules',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['branch_id', 'module_code'],
      name: 'unique_branch_module'
    }
  ]
});

BranchModule.associate = function(models) {
  BranchModule.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });

  BranchModule.belongsTo(models.User, {
    foreignKey: 'enabledBy',
    as: 'enabledByUser'
  });
};

// Available modules for branch setup
BranchModule.AVAILABLE_MODULES = [
  { code: 'pos', name: 'Point of Sale', description: 'Kasir dan transaksi penjualan', icon: 'ShoppingCart', isCore: true },
  { code: 'inventory', name: 'Inventory', description: 'Manajemen stok dan gudang', icon: 'Package', isCore: true },
  { code: 'kitchen', name: 'Kitchen Display', description: 'Tampilan dapur untuk F&B', icon: 'ChefHat', isCore: false },
  { code: 'table', name: 'Table Management', description: 'Manajemen meja restoran', icon: 'LayoutGrid', isCore: false },
  { code: 'reservation', name: 'Reservasi', description: 'Sistem reservasi pelanggan', icon: 'Calendar', isCore: false },
  { code: 'loyalty', name: 'Loyalty Program', description: 'Program loyalitas pelanggan', icon: 'Gift', isCore: false },
  { code: 'finance', name: 'Keuangan', description: 'Laporan dan manajemen keuangan', icon: 'DollarSign', isCore: false },
  { code: 'hris', name: 'HRIS', description: 'Manajemen karyawan dan absensi', icon: 'Users', isCore: false },
  { code: 'delivery', name: 'Delivery', description: 'Integrasi layanan delivery', icon: 'Truck', isCore: false },
  { code: 'promo', name: 'Promo & Diskon', description: 'Manajemen promosi dan diskon', icon: 'Percent', isCore: false }
];

// Enable default modules for a branch
BranchModule.enableDefaultModules = async function(branchId, enabledBy = null) {
  const defaultModules = this.AVAILABLE_MODULES.filter(m => m.isCore);
  const modules = [];
  
  for (const mod of defaultModules) {
    const [module] = await this.findOrCreate({
      where: { branchId, moduleCode: mod.code },
      defaults: {
        branchId,
        moduleCode: mod.code,
        moduleName: mod.name,
        isEnabled: true,
        enabledBy
      }
    });
    modules.push(module);
  }
  
  return modules;
};

module.exports = BranchModule;
