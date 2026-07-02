import bcrypt from 'bcryptjs';
import sequelize from '../config/database';
import { setupAssociations } from '../models';
import { Tenant, User, Role, BusinessType, Module, TenantModule, SubscriptionPackage } from '../models';
import logger from '../utils/logger';

const MODULES = [
  { name: 'POS', slug: 'pos', category: 'core', description: 'Point of Sale' },
  { name: 'Inventory', slug: 'inventory', category: 'core', description: 'Inventory Management' },
  { name: 'Product', slug: 'product', category: 'core', description: 'Product Management' },
  { name: 'Purchase', slug: 'purchase', category: 'core', description: 'Purchase & Supplier' },
  { name: 'Customer', slug: 'customer', category: 'core', description: 'Customer Management' },
  { name: 'Finance', slug: 'finance', category: 'finance', description: 'Financial Accounting' },
  { name: 'HRIS', slug: 'hris', category: 'hr', description: 'Human Resources' },
  { name: 'SFA', slug: 'sfa', category: 'sales', description: 'Sales Force Automation' },
  { name: 'CRM', slug: 'crm', category: 'sales', description: 'Customer Relationship Management' },
  { name: 'Kitchen', slug: 'kitchen', category: 'fnb', description: 'Kitchen Display System' },
  { name: 'Table', slug: 'table', category: 'fnb', description: 'Table & Reservation' },
  { name: 'Loyalty', slug: 'loyalty', category: 'marketing', description: 'Loyalty Program' },
  { name: 'Marketing', slug: 'marketing', category: 'marketing', description: 'Marketing Campaigns' },
  { name: 'Fleet', slug: 'fleet', category: 'logistics', description: 'Fleet Management' },
  { name: 'TMS', slug: 'tms', category: 'logistics', description: 'Transport Management' },
  { name: 'Manufacturing', slug: 'manufacturing', category: 'production', description: 'Manufacturing & BOM' },
  { name: 'Asset', slug: 'asset', category: 'operations', description: 'Asset Management' },
  { name: 'Project', slug: 'project', category: 'operations', description: 'Project Management' },
  { name: 'Procurement', slug: 'procurement', category: 'purchasing', description: 'E-Procurement' },
  { name: 'EXIM', slug: 'exim', category: 'trade', description: 'Export Import' },
  { name: 'Billing', slug: 'billing', category: 'system', description: 'Subscription & Billing' },
];

const BUSINESS_TYPES = [
  { name: 'Retail', slug: 'retail', is_active: true },
  { name: 'F&B / Restaurant', slug: 'fnb', is_active: true },
  { name: 'Wholesale / Distribution', slug: 'wholesale', is_active: true },
  { name: 'Manufacturing', slug: 'manufacturing', is_active: true },
  { name: 'Services', slug: 'services', is_active: true },
  { name: 'E-Commerce', slug: 'ecommerce', is_active: true },
  { name: 'Supermarket / Minimarket', slug: 'supermarket', is_active: true },
  { name: 'Fashion & Apparel', slug: 'fashion', is_active: true },
  { name: 'Pharmacy', slug: 'pharmacy', is_active: true },
  { name: 'Automotive', slug: 'automotive', is_active: true },
];

const PACKAGES = [
  {
    name: 'Starter', slug: 'starter', price_monthly: 99000, price_yearly: 999000,
    max_branches: 1, max_users: 3, max_products: 500, max_transactions: 1000,
    modules_included: ['pos', 'product', 'inventory', 'customer'], sort_order: 1, is_active: true,
    description: 'For small businesses getting started',
  },
  {
    name: 'Business', slug: 'business', price_monthly: 299000, price_yearly: 2990000,
    max_branches: 3, max_users: 15, max_products: 5000, max_transactions: 10000,
    modules_included: ['pos', 'product', 'inventory', 'customer', 'purchase', 'finance', 'hris', 'loyalty', 'kitchen', 'table'],
    sort_order: 2, is_active: true, description: 'For growing businesses',
  },
  {
    name: 'Enterprise', slug: 'enterprise', price_monthly: 799000, price_yearly: 7990000,
    max_branches: 50, max_users: 100, max_products: null, max_transactions: null,
    modules_included: MODULES.map(m => m.slug), sort_order: 3, is_active: true,
    description: 'For large organizations with all modules',
  },
];

async function seed(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected for seeding.');

    setupAssociations();

    // Sync all tables
    await sequelize.sync({ force: true });
    logger.info('All tables created.');

    // Seed Business Types
    await BusinessType.bulkCreate(BUSINESS_TYPES as any);
    logger.info(`${BUSINESS_TYPES.length} business types seeded.`);

    // Seed Modules
    await Module.bulkCreate(MODULES.map(m => ({ ...m, is_active: true })) as any);
    logger.info(`${MODULES.length} modules seeded.`);

    // Seed Subscription Packages
    await SubscriptionPackage.bulkCreate(PACKAGES as any);
    logger.info(`${PACKAGES.length} subscription packages seeded.`);

    // Seed Roles
    const roles = [
      { name: 'Super Admin', slug: 'super_admin', permissions: { all: true }, is_system: true, is_active: true },
      { name: 'Admin', slug: 'admin', permissions: { manage_users: true, manage_branches: true, manage_settings: true }, is_system: true, is_active: true },
      { name: 'Manager', slug: 'manager', permissions: { view_reports: true, manage_staff: true, manage_inventory: true }, is_system: true, is_active: true },
      { name: 'Cashier', slug: 'cashier', permissions: { pos: true, view_products: true }, is_system: true, is_active: true },
      { name: 'Staff', slug: 'staff', permissions: { basic: true }, is_system: true, is_active: true },
    ];
    await Role.bulkCreate(roles as any);
    logger.info(`${roles.length} roles seeded.`);

    // Seed Demo Tenant & Admin User
    const tenant = await Tenant.create({
      name: 'Demo Company',
      slug: 'demo-company',
      business_type_id: 1,
      status: 'active',
    } as any);

    const passwordHash = await bcrypt.hash('admin123', 12);
    await User.create({
      tenant_id: (tenant as any).id,
      name: 'Admin Demo',
      email: 'admin@demo.com',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
    } as any);

    // Activate all modules for demo tenant
    const modules = await Module.findAll();
    await TenantModule.bulkCreate(
      modules.map((m: any) => ({ tenant_id: (tenant as any).id, module_id: m.id, is_active: true }))
    );

    logger.info('Demo tenant created: admin@demo.com / admin123');
    logger.info('Seeding completed successfully!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
