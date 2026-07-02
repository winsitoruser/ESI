/**
 * Schema-Based Input Validation Middleware
 * Validates request body, query, and params against defined schemas.
 * Returns 400 with detailed error messages on validation failure.
 *
 * Usage:
 *   import { withValidation, V } from '@/lib/middleware/withValidation';
 *
 *   const createSchema = {
 *     transactionType: V.required().oneOf(['income', 'expense', 'transfer']),
 *     amount: V.required().number().min(0),
 *     description: V.required().string().maxLength(500),
 *     notes: V.optional().string().maxLength(1000),
 *     email: V.optional().email(),
 *   };
 *
 *   async function handler(req, res) {
 *     if (req.method === 'POST') {
 *       const errors = validateBody(req, createSchema);
 *       if (errors) return res.status(400).json(errors);
 *       // ... proceed with validated data
 *     }
 *   }
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ─── Schema Types ───────────────────────────────────────

type ValidatorFn = (value: any, fieldName: string) => string | null;

interface FieldSchema {
  validators: ValidatorFn[];
  isRequired: boolean;
}

interface ValidationSchema {
  [field: string]: FieldSchema;
}

interface ValidationResult {
  success: false;
  error: 'VALIDATION_ERROR';
  message: string;
  details: { field: string; message: string }[];
}

// ─── Validator Builder ──────────────────────────────────

class FieldValidator implements FieldSchema {
  validators: ValidatorFn[] = [];
  isRequired = false;

  required(): this {
    this.isRequired = true;
    this.validators.push((val, field) =>
      (val === undefined || val === null || val === '') ? `${field} is required` : null
    );
    return this;
  }

  optional(): this {
    this.isRequired = false;
    return this;
  }

  string(): this {
    this.validators.push((val, field) =>
      val !== undefined && val !== null && typeof val !== 'string' ? `${field} must be a string` : null
    );
    return this;
  }

  number(): this {
    this.validators.push((val, field) => {
      if (val === undefined || val === null) return null;
      const n = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(n) ? `${field} must be a number` : null;
    });
    return this;
  }

  integer(): this {
    this.validators.push((val, field) => {
      if (val === undefined || val === null) return null;
      const n = typeof val === 'string' ? parseInt(val, 10) : val;
      return !Number.isInteger(n) ? `${field} must be an integer` : null;
    });
    return this;
  }

  boolean(): this {
    this.validators.push((val, field) =>
      val !== undefined && val !== null && typeof val !== 'boolean' ? `${field} must be a boolean` : null
    );
    return this;
  }

  min(minVal: number): this {
    this.validators.push((val, field) => {
      if (val === undefined || val === null) return null;
      const n = typeof val === 'string' ? parseFloat(val) : val;
      return n < minVal ? `${field} must be at least ${minVal}` : null;
    });
    return this;
  }

  max(maxVal: number): this {
    this.validators.push((val, field) => {
      if (val === undefined || val === null) return null;
      const n = typeof val === 'string' ? parseFloat(val) : val;
      return n > maxVal ? `${field} must be at most ${maxVal}` : null;
    });
    return this;
  }

  minLength(len: number): this {
    this.validators.push((val, field) =>
      val && typeof val === 'string' && val.length < len ? `${field} must be at least ${len} characters` : null
    );
    return this;
  }

  maxLength(len: number): this {
    this.validators.push((val, field) =>
      val && typeof val === 'string' && val.length > len ? `${field} must be at most ${len} characters` : null
    );
    return this;
  }

  email(): this {
    this.validators.push((val, field) => {
      if (!val) return null;
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !re.test(val) ? `${field} must be a valid email` : null;
    });
    return this;
  }

  phone(): this {
    this.validators.push((val, field) => {
      if (!val) return null;
      const re = /^(\+62|62|0)[0-9]{9,12}$/;
      return !re.test(String(val).replace(/[\s-]/g, '')) ? `${field} must be a valid phone number` : null;
    });
    return this;
  }

  date(): this {
    this.validators.push((val, field) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? `${field} must be a valid date` : null;
    });
    return this;
  }

  oneOf(allowed: (string | number)[]): this {
    this.validators.push((val, field) => {
      if (val === undefined || val === null) return null;
      return !allowed.includes(val) ? `${field} must be one of: ${allowed.join(', ')}` : null;
    });
    return this;
  }

  array(): this {
    this.validators.push((val, field) =>
      val !== undefined && val !== null && !Array.isArray(val) ? `${field} must be an array` : null
    );
    return this;
  }

  arrayMinLength(len: number): this {
    this.validators.push((val, field) =>
      Array.isArray(val) && val.length < len ? `${field} must have at least ${len} items` : null
    );
    return this;
  }

  pattern(regex: RegExp, message?: string): this {
    this.validators.push((val, field) => {
      if (!val) return null;
      return !regex.test(String(val)) ? (message || `${field} has invalid format`) : null;
    });
    return this;
  }

  custom(fn: (value: any) => string | null): this {
    this.validators.push((val, field) => {
      if (val === undefined || val === null) return null;
      return fn(val);
    });
    return this;
  }
}

// ─── Public API ─────────────────────────────────────────

/**
 * Validator factory - start building a field schema
 */
export const V = {
  required: () => new FieldValidator().required(),
  optional: () => new FieldValidator().optional(),
};

/**
 * Validate data against a schema
 */
export function validate(
  data: Record<string, any>,
  schema: ValidationSchema
): ValidationResult | null {
  const errors: { field: string; message: string }[] = [];

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field];

    // Skip optional fields that are absent
    if (!fieldSchema.isRequired && (value === undefined || value === null || value === '')) {
      continue;
    }

    for (const validator of fieldSchema.validators) {
      const error = validator(value, field);
      if (error) {
        errors.push({ field, message: error });
        break; // One error per field
      }
    }
  }

  if (errors.length === 0) return null;

  return {
    success: false,
    error: 'VALIDATION_ERROR',
    message: `Validation failed: ${errors.map(e => e.message).join('; ')}`,
    details: errors,
  };
}

/**
 * Validate request body against schema. Returns error response object or null.
 */
export function validateBody(
  req: NextApiRequest,
  schema: ValidationSchema
): ValidationResult | null {
  return validate(req.body || {}, schema);
}

/**
 * Validate request query against schema. Returns error response object or null.
 */
export function validateQuery(
  req: NextApiRequest,
  schema: ValidationSchema
): ValidationResult | null {
  return validate(req.query || {}, schema);
}

/**
 * Sanitize request body by stripping HTML tags and trimming strings.
 * Mutates req.body in place.
 */
export function sanitizeBody(req: NextApiRequest): void {
  if (!req.body || typeof req.body !== 'object') return;

  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === 'string') {
      // Strip HTML tags and trim
      req.body[key] = value.replace(/<[^>]*>/g, '').trim();
    }
  }
}
