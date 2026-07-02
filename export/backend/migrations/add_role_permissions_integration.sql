-- ============================================
-- ROLE & PERMISSION SYSTEM - DATABASE MIGRATION
-- ============================================
-- Date: February 4, 2026
-- Description: Add roleId to users table and update roles table
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ADD ROLEID COLUMN TO USERS TABLE
-- ============================================

-- Add roleId column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID;

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_role 
FOREIGN KEY (role_id) 
REFERENCES roles(id) 
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ============================================
-- 2. ADD ISSYSTEM COLUMN TO ROLES TABLE
-- ============================================

-- Add isSystem column to roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- ============================================
-- 3. INSERT DEFAULT ROLES WITH PERMISSIONS
-- ============================================

-- Insert Admin role
INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'admin',
  'Administrator with full access to all features',
  '{
    "dashboard.view": true,
    "dashboard.analytics": true,
    "pos.view": true,
    "pos.create_transaction": true,
    "pos.void_transaction": true,
    "pos.discount": true,
    "pos.refund": true,
    "pos.view_receipts": true,
    "pos.print_receipt": true,
    "pos.settings": true,
    "products.view": true,
    "products.create": true,
    "products.edit": true,
    "products.delete": true,
    "products.import": true,
    "products.export": true,
    "products.manage_categories": true,
    "products.manage_stock": true,
    "inventory.view": true,
    "inventory.stock_in": true,
    "inventory.stock_out": true,
    "inventory.stock_transfer": true,
    "inventory.stock_opname": true,
    "inventory.view_history": true,
    "inventory.settings": true,
    "purchase.view": true,
    "purchase.create": true,
    "purchase.edit": true,
    "purchase.delete": true,
    "purchase.approve": true,
    "purchase.receive": true,
    "purchase.manage_suppliers": true,
    "customers.view": true,
    "customers.create": true,
    "customers.edit": true,
    "customers.delete": true,
    "customers.view_transactions": true,
    "customers.manage_loyalty": true,
    "employees.view": true,
    "employees.create": true,
    "employees.edit": true,
    "employees.delete": true,
    "employees.view_attendance": true,
    "employees.manage_payroll": true,
    "finance.view": true,
    "finance.view_cashflow": true,
    "finance.create_expense": true,
    "finance.edit_expense": true,
    "finance.delete_expense": true,
    "finance.view_income": true,
    "finance.manage_accounts": true,
    "finance.settings": true,
    "reports.view": true,
    "reports.sales": true,
    "reports.inventory": true,
    "reports.finance": true,
    "reports.customers": true,
    "reports.employees": true,
    "reports.export": true,
    "reports.print": true,
    "promotions.view": true,
    "promotions.create": true,
    "promotions.edit": true,
    "promotions.delete": true,
    "promotions.activate": true,
    "settings.view": true,
    "settings.store": true,
    "settings.users": true,
    "settings.roles": true,
    "settings.security": true,
    "settings.backup": true,
    "settings.inventory": true,
    "settings.hardware": true,
    "settings.notifications": true,
    "settings.integrations": true,
    "settings.billing": true,
    "settings.appearance": true
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();

-- Insert Manager role
INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'manager',
  'Manager with access to most features except critical settings',
  '{
    "dashboard.view": true,
    "dashboard.analytics": true,
    "pos.view": true,
    "pos.create_transaction": true,
    "pos.void_transaction": true,
    "pos.discount": true,
    "pos.refund": true,
    "pos.view_receipts": true,
    "pos.print_receipt": true,
    "pos.settings": false,
    "products.view": true,
    "products.create": true,
    "products.edit": true,
    "products.delete": false,
    "products.import": true,
    "products.export": true,
    "products.manage_categories": true,
    "products.manage_stock": true,
    "inventory.view": true,
    "inventory.stock_in": true,
    "inventory.stock_out": true,
    "inventory.stock_transfer": true,
    "inventory.stock_opname": true,
    "inventory.view_history": true,
    "inventory.settings": false,
    "purchase.view": true,
    "purchase.create": true,
    "purchase.edit": true,
    "purchase.delete": false,
    "purchase.approve": true,
    "purchase.receive": true,
    "purchase.manage_suppliers": true,
    "customers.view": true,
    "customers.create": true,
    "customers.edit": true,
    "customers.delete": false,
    "customers.view_transactions": true,
    "customers.manage_loyalty": true,
    "employees.view": true,
    "employees.create": false,
    "employees.edit": false,
    "employees.delete": false,
    "employees.view_attendance": true,
    "employees.manage_payroll": false,
    "finance.view": true,
    "finance.view_cashflow": true,
    "finance.create_expense": true,
    "finance.edit_expense": true,
    "finance.delete_expense": false,
    "finance.view_income": true,
    "finance.manage_accounts": false,
    "finance.settings": false,
    "reports.view": true,
    "reports.sales": true,
    "reports.inventory": true,
    "reports.finance": true,
    "reports.customers": true,
    "reports.employees": true,
    "reports.export": true,
    "reports.print": true,
    "promotions.view": true,
    "promotions.create": true,
    "promotions.edit": true,
    "promotions.delete": false,
    "promotions.activate": true,
    "settings.view": true,
    "settings.store": false,
    "settings.users": false,
    "settings.roles": false,
    "settings.security": false,
    "settings.backup": false,
    "settings.inventory": true,
    "settings.hardware": true,
    "settings.notifications": true,
    "settings.integrations": false,
    "settings.billing": false,
    "settings.appearance": false
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();

-- Insert Cashier role
INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'cashier',
  'Cashier for POS operations and basic customer management',
  '{
    "dashboard.view": true,
    "dashboard.analytics": false,
    "pos.view": true,
    "pos.create_transaction": true,
    "pos.void_transaction": false,
    "pos.discount": true,
    "pos.refund": false,
    "pos.view_receipts": true,
    "pos.print_receipt": true,
    "pos.settings": false,
    "products.view": true,
    "products.create": false,
    "products.edit": false,
    "products.delete": false,
    "customers.view": true,
    "customers.create": true,
    "customers.edit": true,
    "customers.delete": false,
    "customers.view_transactions": true,
    "customers.manage_loyalty": true,
    "inventory.view": true,
    "promotions.view": true
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();

-- Insert Staff role
INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'staff',
  'Staff with basic access to POS and inventory',
  '{
    "dashboard.view": true,
    "dashboard.analytics": false,
    "pos.view": true,
    "pos.create_transaction": true,
    "pos.void_transaction": false,
    "pos.discount": false,
    "pos.refund": false,
    "pos.view_receipts": true,
    "pos.print_receipt": true,
    "products.view": true,
    "customers.view": true,
    "inventory.view": true,
    "promotions.view": true
  }'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();

-- ============================================
-- 4. UPDATE EXISTING USERS WITH ROLE IDS
-- ============================================

-- Update users with admin role
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE r.name = 'admin'
AND u.role = 'admin'
AND u.role_id IS NULL;

-- Update users with manager role
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE r.name = 'manager'
AND u.role = 'manager'
AND u.role_id IS NULL;

-- Update users with cashier role
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE r.name = 'cashier'
AND u.role = 'cashier'
AND u.role_id IS NULL;

-- Update users with staff role
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE r.name = 'staff'
AND (u.role = 'staff' OR u.role IS NULL)
AND u.role_id IS NULL;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check roles created
SELECT id, name, description, is_system, 
       jsonb_object_keys(permissions) as permission_count
FROM roles
ORDER BY is_system DESC, name;

-- Check users with roles
SELECT u.id, u.name, u.email, u.role, r.name as role_name, r.description
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
ORDER BY u.created_at DESC
LIMIT 10;

-- Count permissions per role
SELECT 
    name,
    jsonb_object_keys(permissions) as total_permissions
FROM roles
ORDER BY name;

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO your_app_user;
-- GRANT SELECT, UPDATE ON users TO your_app_user;

-- ============================================
-- ROLLBACK SCRIPT (USE WITH CAUTION!)
-- ============================================
-- Uncomment below to rollback changes

/*
-- Remove foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_role;

-- Remove roleId column
ALTER TABLE users DROP COLUMN IF EXISTS role_id;

-- Remove isSystem column
ALTER TABLE roles DROP COLUMN IF EXISTS is_system;

-- Delete default roles (optional)
-- DELETE FROM roles WHERE name IN ('admin', 'manager', 'cashier', 'staff');
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Changes:
-- 1. Added role_id column to users table
-- 2. Added is_system column to roles table
-- 3. Inserted 4 default roles with full permissions
-- 4. Updated existing users with role_id
-- 5. Created indexes and foreign keys
-- ============================================
