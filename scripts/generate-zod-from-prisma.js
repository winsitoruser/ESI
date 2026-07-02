/**
 * Generate Zod schemas from Prisma schema
 * 
 * This script uses the introspected Prisma schema to generate Zod types.
 * More reliable than static Sequelize parsing since it uses the actual DB schema.
 * 
 * Usage: node scripts/generate-zod-from-prisma.js
 * 
 * Dependencies: npm install zod-prisma-types (or use manual generation)
 */

const fs = require('fs');
const path = require('path');

const PRISMA_SCHEMA_PATH = path.resolve(__dirname, '..', 'prisma/schema.prisma');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'types/zod-from-prisma.ts');

console.log('Generating Zod schemas from Prisma schema...');

// Read the Prisma schema
const schemaContent = fs.readFileSync(PRISMA_SCHEMA_PATH, 'utf-8');

// Parse models from Prisma schema
const models = [];
const enumTypes = [];

// Extract enums first
const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/g;
let enumMatch;
while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
  const enumName = enumMatch[1];
  const enumBody = enumMatch[2];
  const values = enumBody
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'));
  
  enumTypes.push({ name: enumName, values });
  console.log(`Found enum: ${enumName} (${values.length} values)`);
}

// Extract models
const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
let modelMatch;
while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
  const modelName = modelMatch[1];
  const modelBody = modelMatch[2];
  
  const fields = [];
  const fieldLines = modelBody.split('\n');
  
  for (const line of fieldLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) {
      continue;
    }
    
    // Parse field: name type [@annotations]
    // Example: id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    const fieldParts = trimmed.split(/\s+/);
    if (fieldParts.length < 2) continue;
    
    const fieldName = fieldParts[0];
    let fieldType = fieldParts[1];
    const isNullable = fieldType.endsWith('?');
    const isList = fieldType.endsWith('[]');
    const isRelation = trimmed.includes('@relation');
    
    if (isNullable) fieldType = fieldType.slice(0, -1);
    if (isList) fieldType = fieldType.slice(0, -2);
    
    // Check for auto-generated fields
    const hasDefault = trimmed.includes('@default');
    const isAutoIncrement = trimmed.includes('autoincrement()');
    const isPrimaryKey = trimmed.includes('@id');
    const isUpdatedAt = trimmed.includes('@updatedAt');
    
    // Check for db type
    let dbType = fieldType;
    const dbTypeMatch = trimmed.match(/@db\.(\w+)/);
    if (dbTypeMatch) {
      dbType = dbTypeMatch[1];
    }
    
    fields.push({
      name: fieldName,
      type: fieldType,
      dbType,
      isNullable,
      isList,
      isRelation,
      hasDefault,
      isAutoIncrement,
      isPrimaryKey,
      isUpdatedAt
    });
  }
  
  if (fields.length > 0) {
    models.push({ name: modelName, fields });
    console.log(`Found model: ${modelName} (${fields.length} fields)`);
  }
}

console.log(`\nParsed ${models.length} models and ${enumTypes.length} enums`);

// Generate Zod code
function mapPrismaToZod(field, allModels, allEnums) {
  const { type, dbType, isNullable, isList, isRelation } = field;
  
  // Skip relations
  if (isRelation) {
    return null;
  }
  
  // Check if it's an enum
  const enumDef = allEnums.find(e => e.name === type);
  if (enumDef) {
    const enumValues = enumDef.values.map(v => JSON.stringify(v)).join(', ');
    return `z.enum([${enumValues}])`;
  }
  
  // Check if it's a reference to another model (but not a relation)
  const isModelRef = allModels.some(m => m.name === type);
  if (isModelRef && !isRelation) {
    // This is likely a foreign key field - treat as String/UUID based on dbType
    if (dbType === 'Uuid' || type === 'String') {
      return 'z.string().uuid()';
    }
    return 'z.string()';
  }
  
  let zodType;
  
  // Map based on type and dbType
  switch (type) {
    case 'String':
      if (dbType === 'Uuid') {
        zodType = 'z.string().uuid()';
      } else {
        zodType = 'z.string()';
      }
      break;
    case 'Int':
      zodType = 'z.number().int()';
      break;
    case 'BigInt':
      zodType = 'z.bigint()';
      break;
    case 'Float':
    case 'Decimal':
      zodType = 'z.number()';
      break;
    case 'Boolean':
      zodType = 'z.boolean()';
      break;
    case 'DateTime':
      zodType = 'z.coerce.date()';
      break;
    case 'Json':
      zodType = 'z.record(z.string(), z.any()).or(z.array(z.any()))';
      break;
    case 'Bytes':
      zodType = 'z.instanceof(Buffer)';
      break;
    default:
      // Check by dbType
      if (dbType === 'Uuid') {
        zodType = 'z.string().uuid()';
      } else if (dbType === 'Timestamp' || dbType === 'Timestamptz') {
        zodType = 'z.coerce.date()';
      } else {
        zodType = 'z.any()';
      }
  }
  
  // Handle lists
  if (isList) {
    zodType = `z.array(${zodType})`;
  }
  
  return zodType;
}

// Generate schema code for each model
const schemaCode = [];
const typeCode = [];

for (const model of models) {
  const fields = [];
  const createFields = [];
  const updateFields = [];
  
  for (const field of model.fields) {
    const zodType = mapPrismaToZod(field, models, enumTypes);
    if (!zodType) continue; // Skip relations
    
    const isAutoGenerated = 
      field.isAutoIncrement ||
      (field.isPrimaryKey && field.type === 'String' && field.dbType === 'Uuid') ||
      field.name === 'createdAt' ||
      field.name === 'updatedAt' ||
      field.name === 'created_at' ||
      field.name === 'updated_at';
    
    let fieldDef = `  ${field.name}: ${zodType}`;
    if (field.isNullable) {
      fieldDef += '.nullish()';
    }
    fields.push(fieldDef);
    
    if (!isAutoGenerated) {
      let createFieldDef = `  ${field.name}: ${zodType}`;
      if (field.isNullable || field.hasDefault) {
        createFieldDef += '.optional()';
      }
      createFields.push(createFieldDef);
      
      updateFields.push(`  ${field.name}: ${zodType}.optional()`);
    }
  }
  
  if (fields.length === 0) continue;
  
  schemaCode.push(`export const ${model.name}Schema = z.object({
${fields.join(',\n')}
});

export const ${model.name}CreateSchema = z.object({
${createFields.join(',\n')}
});

export const ${model.name}UpdateSchema = z.object({
${updateFields.join(',\n')}
});
`);

  typeCode.push(`export type ${model.name} = z.infer<typeof ${model.name}Schema>;
export type ${model.name}Create = z.infer<typeof ${model.name}CreateSchema>;
export type ${model.name}Update = z.infer<typeof ${model.name}UpdateSchema>;
`);
}

// Generate enum schemas
const enumCode = [];
for (const enumDef of enumTypes) {
  const enumValues = enumDef.values.map(v => JSON.stringify(v)).join(', ');
  enumCode.push(`export const ${enumDef.name}Schema = z.enum([${enumValues}]);
export type ${enumDef.name} = z.infer<typeof ${enumDef.name}Schema>;
`);
}

// Combine final output
const output = `// ============================================================
// ZOD SCHEMAS FROM PRISMA INTROSPECTION
// ============================================================
// Auto-generated from prisma/schema.prisma
// Generated: ${new Date().toISOString()}
// Generator: scripts/generate-zod-from-prisma.js
//
// These schemas are derived from the database introspection via Prisma.
// More complete than Sequelize-based static parsing.
//
// Models: ${models.length}
// Enums: ${enumTypes.length}
// ============================================================

import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

${enumCode.join('\n')}

// ============================================================
// MODEL SCHEMAS
// ============================================================

${schemaCode.join('\n')}

// ============================================================
// TYPE INFERENCES
// ============================================================

${typeCode.join('\n')}

// ============================================================
// API HELPERS
// ============================================================

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  });

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});
`;

// Write output
fs.writeFileSync(OUTPUT_PATH, output);

console.log(`\n============================================================`);
console.log(`Zod schemas generated from Prisma!`);
console.log(`Output: ${OUTPUT_PATH}`);
console.log(`Models: ${models.length}`);
console.log(`Enums: ${enumTypes.length}`);
console.log(`============================================================`);
console.log(`
Usage example:
  import { UserSchema, UserCreateSchema } from '@/types/zod-from-prisma';
  const validated = UserCreateSchema.parse(req.body);
`);
