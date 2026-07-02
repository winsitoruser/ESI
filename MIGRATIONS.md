# Database Migrations & Seeders Guide

> **Framework:** Sequelize ORM v6 + Sequelize CLI v6  
> **Database:** PostgreSQL  
> **Last Updated:** 2026-02-28

---

## Quick Start

```bash
# 1. Create the database (if not exists)
npm run db:create

# 2. Run all pending migrations
npm run db:migrate

# 3. Seed initial data
npm run db:seed

# 4. Full reset (⚠️ drops all tables, re-migrates, re-seeds)
npm run db:reset
```

---

## Configuration

| File | Purpose |
|------|---------|
| `.sequelizerc` | Sequelize CLI path configuration |
| `config/database.js` | DB credentials per environment (dev/test/prod) |
| `migrations/` | All migration files (109 files, `.js` only) |
| `seeders/` | All seeder files (12 files, `.js` only) |

### Environment Variables

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=farmanesia_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

Production uses SSL by default (`dialectOptions.ssl`).

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run db:create` | Create database |
| `npm run db:drop` | Drop database |
| `npm run db:migrate` | Run all pending migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:migrate:undo:all` | Undo all migrations |
| `npm run db:seed` | Run all seeders |
| `npm run db:reset` | Undo all → migrate → seed |

### Manual Sequelize CLI Commands

```bash
# Generate a new migration
npx sequelize-cli migration:generate --name create-example-table

# Run specific migration
npx sequelize-cli db:migrate --to YYYYMMDD-migration-name.js

# Undo specific number of migrations
npx sequelize-cli db:migrate:undo --name YYYYMMDD-migration-name.js

# Check migration status
npx sequelize-cli db:migrate:status
```

---

## Migration File Naming Convention

All migration files follow this pattern:

```
YYYYMMDD[HHMMSS]-descriptive-name.js
```

Examples:
- `20260213-create-modular-system.js`
- `20260228000001-add-role-permissions-integration.js`

**Rules:**
- Date prefix determines execution order (ascending)
- Use kebab-case for description
- Prefix with action: `create-`, `add-`, `update-`, `enhance-`, `link-`
- Only `.js` files allowed in `migrations/`

---

## Migration File Structure (Standard Template)

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if table exists before creating
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('example_table')) {
      await queryInterface.createTable('example_table', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        name: { type: Sequelize.STRING(255), allowNull: false },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // Add indexes (use .catch(() => {}) for idempotency)
    await queryInterface.addIndex('example_table', ['name'], {
      name: 'idx_example_name'
    }).catch(() => {});
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('example_table').catch(() => {});
  }
};
```

### Patterns Used

| Pattern | When to Use |
|---------|-------------|
| `queryInterface.createTable()` | New table creation |
| `queryInterface.addColumn()` | Add column to existing table |
| `queryInterface.addIndex()` | Add index |
| `queryInterface.describeTable()` | Check if column exists before adding |
| `queryInterface.showAllTables()` | Check if table exists before creating |
| `queryInterface.sequelize.query()` | Raw SQL for triggers, DO blocks, complex operations |
| `.catch(() => {})` | Idempotency — skip if already exists |

---

## Migration Categories

### Core System (2024)
| File | Description |
|------|-------------|
| `20240219-create-pos-transactions` | POS transactions system |
| `20240220-create-kitchen-orders` | Kitchen order management |
| `20240221-create-kitchen-inventory` | Kitchen inventory |

### Products & Inventory (Jan 2026)
| File | Description |
|------|-------------|
| `20260115-create-products-table` | Base products table |
| `20260118-create-users-table` | Users table |
| `20260124-create-stock-opname-tables` | Stock opname |
| `20260124-create-warehouse-location-tables` | Warehouses & locations |
| `20260125-*` | Product variants, prices, recipes, suppliers |
| `20260126-*` | Production, wastes, returns, transfers |
| `20260127-*` | RAC system, full inventory system |

### Finance & CRM (Feb 2026)
| File | Description |
|------|-------------|
| `20260204-*` | Finance, promo, vouchers, loyalty, customers |
| `20260207-create-admin-panel-tables` | Admin panel |
| `20260213-*` | HPP, modular system, tables, reservations |

### Multi-Branch & Billing (Feb 2026)
| File | Description |
|------|-------------|
| `20260217-create-billing-tables` | Billing & subscriptions |
| `20260222-*` | Multi-branch, procurement, payroll, warehouse mapping |

### KYB & Modules (Feb 2026)
| File | Description |
|------|-------------|
| `20260223-*` | KYB system, missing tables (parts 1-3), provisioning |
| `20260227-*` | Module system enhancements, packages, features |
| `20260228-*` | Role permissions, branches, store settings, schedules |

---

## Seeders (Execution Order)

| # | File | Description |
|---|------|-------------|
| 1 | `20260118-demo-user` | Demo user account |
| 2 | `20260124-seed-warehouses-locations` | Sample warehouses & locations |
| 3 | `20260124-seed-stock-opname-data` | Sample stock opname data |
| 4 | `20260213-create-master-account` | Super admin account |
| 5 | `20260213-seed-business-types-modules` | Business types & modules |
| 6 | `20260217000001-fnb-user-setup` | F&B user & tenant setup |
| 7 | `20260217000002-seed-billing-plans` | Billing plans & limits |
| 8 | `20260221-sample-integrations` | Sample payment & notification integrations |
| 9 | `20260227-ensure-business-types` | Ensure F&B business types exist |
| 10 | `20260227-seed-business-packages` | F&B business packages |
| 11 | `20260227-seed-dashboard-configurations` | Dashboard widget configs |
| 12 | `20260227-seed-fnb-modules` | F&B modules & dependencies |

---

## Deployment Checklist

1. **Pre-deploy:**
   - [ ] Ensure `DB_*` environment variables are set
   - [ ] Backup existing database
   - [ ] Check migration status: `npx sequelize-cli db:migrate:status`

2. **Deploy:**
   - [ ] Run migrations: `npm run db:migrate`
   - [ ] Run seeders (first deploy only): `npm run db:seed`

3. **Post-deploy:**
   - [ ] Verify tables created: `\dt` in psql
   - [ ] Verify migration log: `SELECT * FROM "SequelizeMeta" ORDER BY name;`
   - [ ] Test critical API endpoints

4. **Rollback (if needed):**
   - [ ] Undo last migration: `npm run db:migrate:undo`
   - [ ] Or undo specific: `npx sequelize-cli db:migrate:undo --name <filename>`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `relation already exists` | Migration is idempotent — safe to ignore |
| `column already exists` | Uses `describeTable` check — safe to ignore |
| `SequelizeMeta table missing` | Run `npm run db:migrate` — auto-creates |
| SSL connection error (prod) | Check `dialectOptions.ssl` in `config/database.js` |
| Migration order conflict | Rename file with correct timestamp prefix |

---

## Dependencies

```json
{
  "sequelize": "^6.37.7",    // ORM (in dependencies)
  "sequelize-cli": "^6.6.2", // CLI tool (in devDependencies)
  "pg": "^8.17.1",           // PostgreSQL driver
  "pg-hstore": "^2.3.4"      // PostgreSQL hstore support
}
```
