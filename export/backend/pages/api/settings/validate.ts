import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../models');

interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'url' | 'number' | 'minLength' | 'maxLength' | 'regex';
  value?: any;
  message: string;
}

interface ValidationSchema {
  [key: string]: ValidationRule[];
}

const validationSchemas: { [key: string]: ValidationSchema } = {
  store: {
    name: [
      { type: 'required', message: 'Nama toko wajib diisi' },
      { type: 'minLength', value: 3, message: 'Nama toko minimal 3 karakter' }
    ],
    phone: [
      { type: 'required', message: 'Nomor telepon wajib diisi' },
      { type: 'phone', message: 'Format nomor telepon tidak valid' }
    ],
    email: [
      { type: 'email', message: 'Format email tidak valid' }
    ],
    website: [
      { type: 'url', message: 'Format URL tidak valid' }
    ],
    taxId: [
      { type: 'regex', value: /^\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}$/, message: 'Format NPWP tidak valid (XX.XXX.XXX.X-XXX.XXX)' }
    ]
  },
  printer: {
    name: [
      { type: 'required', message: 'Nama printer wajib diisi' }
    ],
    ipAddress: [
      { type: 'required', message: 'IP Address wajib diisi untuk koneksi network' },
      { type: 'regex', value: /^(\d{1,3}\.){3}\d{1,3}$/, message: 'Format IP Address tidak valid' }
    ],
    port: [
      { type: 'number', message: 'Port harus berupa angka' },
      { type: 'regex', value: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/, message: 'Port harus antara 1-65535' }
    ]
  }
};

function validateField(value: any, rules: ValidationRule[]): string[] {
  const errors: string[] = [];
  
  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(rule.message);
        }
        break;
        
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(rule.message);
        }
        break;
        
      case 'phone':
        if (value && !/^(\+62|62)?[\s-]?0?8[1-9][0-9]{6,9}$/.test(value.replace(/[\s-]/g, ''))) {
          errors.push(rule.message);
        }
        break;
        
      case 'url':
        if (value && !/^https?:\/\/.+/.test(value)) {
          errors.push(rule.message);
        }
        break;
        
      case 'number':
        if (value && isNaN(Number(value))) {
          errors.push(rule.message);
        }
        break;
        
      case 'minLength':
        if (value && value.length < rule.value) {
          errors.push(rule.message);
        }
        break;
        
      case 'maxLength':
        if (value && value.length > rule.value) {
          errors.push(rule.message);
        }
        break;
        
      case 'regex':
        if (value && !rule.value.test(value)) {
          errors.push(rule.message);
        }
        break;
    }
  }
  
  return errors;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const { schema, data } = req.body;
      
      if (!schema || !data) {
        return res.status(400).json({ error: 'Schema and data are required' });
      }
      
      const validationSchema = validationSchemas[schema];
      if (!validationSchema) {
        return res.status(400).json({ error: 'Invalid validation schema' });
      }
      
      const errors: { [key: string]: string[] } = {};
      let isValid = true;
      
      for (const [field, rules] of Object.entries(validationSchema)) {
        const fieldErrors = validateField(data[field], rules);
        if (fieldErrors.length > 0) {
          errors[field] = fieldErrors;
          isValid = false;
        }
      }
      
      // Log validation attempt
      const { AuditLog } = getDb();
      await AuditLog.create({
        userId: session.user?.id || '',
        action: 'VALIDATE',
        entityType: 'Settings',
        entityId: 'validation',
        oldValues: {},
        newValues: { schema, isValid, errors },
        ipAddress: (req as any).ip || '',
        userAgent: req.headers['user-agent'],
        description: `Validated ${schema} settings`
      });
      
      return res.status(200).json({
        success: true,
        isValid,
        errors
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error: any) {
    console.error('Validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Validation failed',
      details: error.message
    });
  }
}
