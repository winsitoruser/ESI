# Prisma Setup - Bedagang ERP

> ⚠️ **READ THIS BEFORE USING PRISMA** ⚠️

## Architecture Decision: Dual ORM Mode

This project uses **two ORMs** with a clear separation of responsibilities:

| ORM | Responsibility | Allowed Operations |
|-----|----------------|-------------------|
| **Sequelize** | Single Source of Truth | All writes, migrations, transactions, foreign keys |
| **Prisma** | Read-Only Layer | Reads, reports, aggregation queries only |

---

## Why This Approach?

1. **Sequelize is mature** - 336 models, 100% coverage of business logic
2. **Prisma is great for reads** - Excellent for complex queries, aggregations, type-safe reporting
3. **No schema conflicts** - Sequelize controls all migrations; Prisma only introspects

---

## Prisma Configuration

### Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Introspected schema + read-only warnings (DO NOT EDIT MANUALLY) |
| `prisma/prisma.config.js` | Prisma 7.x compatibility config (not currently used) |
| `types/zod-from-prisma.ts` | Auto-generated Zod schemas from Prisma introspection |
| `types/zod-schemas.ts` | Auto-generated Zod schemas from Sequelize static parsing |

### Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate-zod-from-prisma.js` | Generate Zod types from introspected Prisma schema (recommended) |
| `scripts/generate-zod-schemas.js` | Generate Zod types from Sequelize model files (static parsing) |

---

## Workflow

### When to Update Prisma Schema

**ONLY after Sequelize migrations have been applied:**

```bash
# 1. Apply Sequelize migration (SOURCE OF TRUTH)
npm run db:migrate

# 2. Introspect database to update Prisma schema
npx prisma@6 db pull

# 3. Regenerate Prisma Client
npx prisma@6 generate

# 4. Regenerate Zod schemas (optional, for API contracts)
node scripts/generate-zod-from-prisma.js
```

### Using Prisma in Code

**ALWAYS import Prisma with read-only intent documented:**

```typescript
// lib/prisma.ts - Read-only Prisma Client
import { PrismaClient } from '@prisma/client';

// ⚠️ PRISMA IS READ-ONLY
// Use only for: findMany, findUnique, findFirst, aggregate, count, groupBy
// DO NOT USE: create, update, upsert, delete, createMany, updateMany, deleteMany, $transaction

const prisma = new PrismaClient();

export { prisma };

// Read-only convenience exports
export const prismaRead = {
  user: prisma.user,
  product: prisma.product,
  // ... add models as needed
};
```

---

## Forbidden Operations

**NEVER run these commands:**

```bash
# ❌ FORBIDDEN - Migrations belong to Sequelize
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db push
npx prisma migrate reset
```

**NEVER use these PrismaClient methods:**

```typescript
// ❌ FORBIDDEN - Writes must go through Sequelize
prisma.model.create()
prisma.model.update()
prisma.model.upsert()
prisma.model.delete()
prisma.model.createMany()
prisma.model.updateMany()
prisma.model.deleteMany()
prisma.$transaction()  // Use Sequelize transactions instead
```

---

## Allowed Operations

**ONLY use these PrismaClient methods:**

```typescript
// ✅ ALLOWED - Read operations
prisma.model.findMany()
prisma.model.findUnique()
prisma.model.findFirst()
prisma.model.aggregate()
prisma.model.count()
prisma.model.groupBy()

// Complex queries with relations
prisma.model.findMany({
  include: { relatedModel: true },
  where: { /* conditions */ },
  orderBy: { /* sorting */ }
})
```

---

## Zod Schemas for API Contracts

Two sets of Zod schemas are generated:

### 1. From Prisma (Recommended)
```bash
node scripts/generate-zod-from-prisma.js
```
- **Source**: Database introspection via Prisma
- **Coverage**: 212 models, 49 enums
- **Location**: `types/zod-from-prisma.ts`

### 2. From Sequelize (Fallback)
```bash
node scripts/generate-zod-schemas.js
```
- **Source**: Static parsing of Sequelize model files
- **Coverage**: 329 model files (but limited field detection)
- **Location**: `types/zod-schemas.ts`

### Usage

```typescript
import { 
  UserSchema, 
  UserCreateSchema, 
  UserUpdateSchema,
  type User,
  type UserCreate,
  type UserUpdate 
} from '@/types/zod-from-prisma';

// Validate API request body
const validated = UserCreateSchema.parse(req.body);

// Use inferred TypeScript types
function createUser(data: UserCreate): Promise<User> {
  // ... implementation via Sequelize
}
```

---

## Reference

- GitHub Issue: [#12](https://github.com/bedagang/bedagang---PoS/issues/12)
- Parent Decision: Schema review - Keep Sequelize, add Prisma for read-only
- ADR: See `.hermes/DECISIONS.md`
