#!/usr/bin/env node
/**
 * Generate Zod TypeScript schemas from Sequelize model files
 * 
 * This script:
 * 1. Reads and parses Sequelize model files from ./models
 * 2. Extracts attribute definitions using static analysis
 * 3. Generates Zod schemas for API contracts
 * 
 * NO database connection required!
 * 
 * Output: ./types/zod-schemas.ts
 */

const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.resolve(__dirname, '..', 'models');

console.log('Parsing Sequelize model files...');

/**
 * Parse a Sequelize model file and extract attribute definitions
 * Uses regex-based static analysis (no DB connection needed)
 */
function parseModelFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.js');
  
  // Try to extract the model name from define() call
  const defineMatch = content.match(/define\(['"]([^'"]+)['"]/);
  const modelName = defineMatch ? defineMatch[1] : fileName;
  
  // Extract the attributes object
  // Pattern: sequelize.define('ModelName', { ...attributes... }, { ...options... })
  const attributes = {};
  
  // Find the attributes object - look for patterns like:
  // fieldName: { type: DataTypes.STRING, allowNull: false, ... }
  
  // First, try to match the attribute definitions block
  // This regex looks for the second argument to define()
  const defineCallMatch = content.match(/define\(\s*['"][^'"]+['"]\s*,\s*(\{[\s\S]*?\})\s*(?:,|\))/);
  
  if (defineCallMatch) {
    const attrBlock = defineCallMatch[1];
    
    // Parse individual attributes from the block
    // Look for patterns like:
    // fieldName: { type: DataTypes.STRING, ... }
    // fieldName: DataTypes.STRING
    
    // Split by field definitions (simplified)
    // This is not perfect but works for most Sequelize patterns
    const attrPattern = /(\w+):\s*(\{[^}]*\}|DataTypes\.[\w.]+(?:\([^)]*\))?)/g;
    let match;
    
    while ((match = attrPattern.exec(attrBlock)) !== null) {
      const fieldName = match[1];
      const fieldDef = match[2];
      
      // Skip if this looks like a function (e.g., getter/setter)
      if (fieldDef.trim().startsWith('get(') || fieldDef.trim().startsWith('set(')) {
        continue;
      }
      
      attributes[fieldName] = parseFieldDefinition(fieldName, fieldDef, content);
    }
  }
  
  // Also check for direct sequelize.define patterns
  if (Object.keys(attributes).length === 0) {
    // Try alternative pattern: id: { type: DataTypes.UUID, ... }
    // Look for attribute definitions more broadly
    const simpleAttrPattern = /(\w+):\s*\{[^}]*type:\s*DataTypes\.[^}]+}/g;
    let simpleMatch;
    
    while ((simpleMatch = simpleAttrPattern.exec(content)) !== null) {
      const fullMatch = simpleMatch[0];
      const nameMatch = fullMatch.match(/^(\w+):/);
      if (nameMatch) {
        const fieldName = nameMatch[1];
        attributes[fieldName] = parseFieldDefinition(fieldName, fullMatch, content);
      }
    }
  }
  
  return {
    modelName,
    fileName,
    attributes,
    hasAttributes: Object.keys(attributes).length > 0
  };
}

/**
 * Parse an individual field definition
 */
function parseFieldDefinition(fieldName, fieldDef, fullContent) {
  const result = {
    type: 'ANY',
    allowNull: true,
    defaultValue: undefined,
    isPrimaryKey: false,
    autoIncrement: false,
    field: fieldName,
    isVirtual: false,
    enumValues: []
  };
  
  // Check for VIRTUAL type
  if (fieldDef.includes('DataTypes.VIRTUAL')) {
    result.isVirtual = true;
    return result;
  }
  
  // Check for allowNull
  if (fieldDef.includes('allowNull: false')) {
    result.allowNull = false;
  }
  
  // Check for primaryKey
  if (fieldDef.includes('primaryKey: true')) {
    result.isPrimaryKey = true;
  }
  
  // Check for autoIncrement
  if (fieldDef.includes('autoIncrement: true')) {
    result.autoIncrement = true;
  }
  
  // Check for defaultValue
  const defaultMatch = fieldDef.match(/defaultValue:\s*([^,}\s]+)/);
  if (defaultMatch) {
    result.defaultValue = defaultMatch[1];
  }
  
  // Check for field mapping (field: 'db_column_name')
  const fieldMatch = fieldDef.match(/field:\s*['"]([^'"]+)['"]/);
  if (fieldMatch) {
    result.field = fieldMatch[1];
  }
  
  // Determine data type
  if (fieldDef.includes('DataTypes.UUID')) {
    result.type = 'UUID';
  } else if (fieldDef.includes('DataTypes.STRING')) {
    result.type = 'STRING';
  } else if (fieldDef.includes('DataTypes.TEXT')) {
    result.type = 'TEXT';
  } else if (fieldDef.includes('DataTypes.INTEGER')) {
    result.type = 'INTEGER';
  } else if (fieldDef.includes('DataTypes.BIGINT')) {
    result.type = 'BIGINT';
  } else if (fieldDef.includes('DataTypes.FLOAT') || fieldDef.includes('DataTypes.DOUBLE')) {
    result.type = 'FLOAT';
  } else if (fieldDef.includes('DataTypes.DECIMAL')) {
    result.type = 'DECIMAL';
  } else if (fieldDef.includes('DataTypes.BOOLEAN')) {
    result.type = 'BOOLEAN';
  } else if (fieldDef.includes('DataTypes.DATE')) {
    result.type = 'DATE';
  } else if (fieldDef.includes('DataTypes.DATEONLY')) {
    result.type = 'DATEONLY';
  } else if (fieldDef.includes('DataTypes.JSON')) {
    result.type = 'JSON';
  } else if (fieldDef.includes('DataTypes.ENUM')) {
    result.type = 'ENUM';
    // Try to extract enum values
    const enumMatch = fieldDef.match(/DataTypes\.ENUM\(([^)]+)\)/);
    if (enumMatch) {
      // Parse values like 'value1', 'value2'
      const valuesMatch = enumMatch[1].match(/['"]([^'"]+)['"]/g);
      if (valuesMatch) {
        result.enumValues = valuesMatch.map(v => v.replace(/['"]/g, ''));
      }
    }
  } else if (fieldDef.includes('DataTypes.ARRAY')) {
    result.type = 'ARRAY';
  }
  
  return result;
}

/**
 * Map Sequelize DataType to Zod type
 */
function mapToZod(attr) {
  if (attr.isVirtual) {
    return null; // Skip virtual fields
  }
  
  let zodType;
  
  switch (attr.type) {
    case 'UUID':
      zodType = 'z.string().uuid()';
      break;
    case 'STRING':
    case 'TEXT':
      zodType = 'z.string()';
      break;
    case 'INTEGER':
    case 'BIGINT':
      zodType = 'z.number().int()';
      break;
    case 'FLOAT':
    case 'DECIMAL':
      zodType = 'z.number()';
      break;
    case 'BOOLEAN':
      zodType = 'z.boolean()';
      break;
    case 'DATE':
    case 'DATEONLY':
      zodType = 'z.coerce.date()';
      break;
    case 'JSON':
      zodType = 'z.record(z.string(), z.any()).or(z.array(z.any()))';
      break;
    case 'ENUM':
      if (attr.enumValues.length > 0) {
        const enumStr = attr.enumValues.map(v => JSON.stringify(v)).join(', ');
        zodType = `z.enum([${enumStr}])`;
      } else {
        zodType = 'z.string()';
      }
      break;
    case 'ARRAY':
      zodType = 'z.array(z.any())';
      break;
    default:
      zodType = 'z.any()';
  }
  
  return {
    zodType,
    isNullable: attr.allowNull,
    hasDefault: attr.defaultValue !== undefined,
    isAutoGenerated: attr.autoIncrement || 
      (attr.isPrimaryKey && attr.type === 'UUID') ||
      attr.field === 'createdAt' ||
      attr.field === 'updatedAt' ||
      attr.field === 'created_at' ||
      attr.field === 'updated_at'
  };
}

/**
 * Generate Zod schema code for a model
 */
function generateZodCode(parsedModel) {
  const { modelName, attributes } = parsedModel;
  
  const fields = [];
  const createFields = [];
  const updateFields = [];
  
  for (const [fieldName, attr] of Object.entries(attributes)) {
    const mapped = mapToZod(attr);
    if (!mapped) continue;
    
    let fieldDef = `  ${fieldName}: ${mapped.zodType}`;
    
    if (mapped.isNullable) {
      fieldDef += '.nullish()';
    }
    fields.push(fieldDef);
    
    // For Create schema: exclude auto-generated fields
    if (!mapped.isAutoGenerated) {
      let createFieldDef = `  ${fieldName}: ${mapped.zodType}`;
      if (mapped.isNullable || mapped.hasDefault) {
        createFieldDef += '.optional()';
      }
      createFields.push(createFieldDef);
      
      // Update schema: all fields optional
      updateFields.push(`  ${fieldName}: ${mapped.zodType}.optional()`);
    }
  }
  
  if (fields.length === 0) {
    return null; // No attributes parsed
  }
  
  return {
    base: `export const ${modelName}Schema = z.object({\n${fields.join(',\n')}\n});`,
    create: `export const ${modelName}CreateSchema = z.object({\n${createFields.join(',\n')}\n});`,
    update: `export const ${modelName}UpdateSchema = z.object({\n${updateFields.join(',\n')}\n});`,
    type: `export type ${modelName} = z.infer<typeof ${modelName}Schema>;\nexport type ${modelName}Create = z.infer<typeof ${modelName}CreateSchema>;\nexport type ${modelName}Update = z.infer<typeof ${modelName}UpdateSchema>;`
  };
}

// Get all model files
const modelFiles = fs.readdirSync(MODELS_DIR)
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .sort();

console.log(`Found ${modelFiles.length} model files`);

// Parse all models
const generatedSchemas = [];
const generatedTypes = [];
let successCount = 0;

for (const file of modelFiles) {
  const filePath = path.join(MODELS_DIR, file);
  try {
    const parsed = parseModelFile(filePath);
    
    if (!parsed.hasAttributes) {
      console.log(`⚠ Skipping ${file}: no attributes found (uses direct sequelize import)`);
      continue;
    }
    
    const generated = generateZodCode(parsed);
    if (generated) {
      generatedSchemas.push(generated.base);
      generatedSchemas.push(generated.create);
      generatedSchemas.push(generated.update);
      generatedTypes.push(generated.type);
      console.log(`✓ ${parsed.modelName}Schema (${Object.keys(parsed.attributes).length} fields)`);
      successCount++;
    } else {
      console.log(`⚠ ${file}: no fields generated`);
    }
  } catch (error) {
    console.log(`✗ Error parsing ${file}:`, error.message);
  }
}

// Generate output
const output = [
  `// Auto-generated Zod schemas from Sequelize models`,
  `// Generated: ${new Date().toISOString()}`,
  `// Generator: scripts/generate-zod-schemas.js`,
  ``,
  `import { z } from 'zod';`,
  ``,
  `// ============================================================`,
  `// MODEL SCHEMAS`,
  `// ============================================================`,
  ``,
  ...generatedSchemas,
  ``,
  `// ============================================================`,
  `// TYPE INFERENCES`,
  `// ============================================================`,
  ``,
  ...generatedTypes,
  ``,
  `// ============================================================`,
  `// API RESPONSE/REQUEST HELPERS`,
  `// ============================================================`,
  ``,
  `export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>`,
  `  z.object({`,
  `    data: z.array(itemSchema),`,
  `    total: z.number().int(),`,
  `    page: z.number().int(),`,
  `    pageSize: z.number().int(),`,
  `    totalPages: z.number().int(),`,
  `  });`,
  ``,
  `export const ApiErrorSchema = z.object({`,
  `  error: z.string(),`,
  `  message: z.string().optional(),`,
  `  details: z.record(z.string(), z.any()).optional(),`,
  `});`,
  ``,
  `export const ApiSuccessSchema = z.object({`,
  `  success: z.literal(true),`,
  `  message: z.string().optional(),`,
  `});`,
  ``,
].join('\n');

// Ensure output directory exists
const outputDir = path.resolve(__dirname, '..', 'types');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'zod-schemas.ts');
fs.writeFileSync(outputPath, output);

console.log('');
console.log(`============================================================`);
console.log(`Zod schemas generated successfully!`);
console.log(`Output: ${outputPath}`);
console.log(`Models processed: ${successCount} / ${modelFiles.length}`);
console.log(`============================================================`);
console.log('');
console.log('Usage example:');
console.log('  import { UserSchema, UserCreateSchema } from \'@/types/zod-schemas\';');
console.log('  const validated = UserCreateSchema.parse(req.body);');
console.log('');
console.log('Note: Some models use direct sequelize imports and were skipped.');
console.log('      For complete coverage, run with an active database connection.');
console.log('');
