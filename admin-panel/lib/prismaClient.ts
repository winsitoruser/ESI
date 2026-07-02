// Import Sequelize as a replacement for Prisma
import db from '@/models';

// Simple logger fallback if monitoring is not available
const apiLogger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
  child: (context: any) => apiLogger
};

// Create an adapter that mimics PrismaClient
// Import models with fallbacks for missing models
let GeneralSettings, Role, Branch, Transaction, User, FinanceLedgerEntry, PaymentMethod, Currency, Document;

// Create mock implementations for missing models
class MockModel {
  static async findAll(options: any = {}): Promise<any[]> {
    return [];
  }

  static async findOne(options: any = {}): Promise<any | null> {
    return null;
  }

  static async create(data: any): Promise<any> {
    return { id: 'mock-id', ...data };
  }

  static async update(data: any, options: any = {}): Promise<[number, any[]]> {
    return [0, []];
  }

  static async count(options: any = {}): Promise<number> {
    return 0;
  }

  static async destroy(options: any = {}): Promise<number> {
    return 0;
  }
}

// Mock implementation of Currency
class MockCurrency extends MockModel {
  static async findAll(options: any = {}): Promise<any[]> {
    return getMockCurrencies();
  }

  static async findOne(options: any = {}): Promise<any | null> {
    const currencies = getMockCurrencies();
    const whereClause = options.where || {};
    return currencies.find(c => {
      for (const [key, value] of Object.entries(whereClause)) {
        if (c[key as keyof typeof c] !== value) return false;
      }
      return true;
    }) || null;
  }
}

// Mock implementation of FinanceLedgerEntry
class MockFinanceLedgerEntry extends MockModel {
  static async findAll(options: any = {}): Promise<any[]> {
    return getMockLedgerEntries();
  }
}

// Mock implementation of PaymentMethod
class MockPaymentMethod extends MockModel {
  static async findAll(options: any = {}): Promise<any[]> {
    return getMockPaymentMethods();
  }
}

// Mock implementation of Document
class MockDocument extends MockModel {
  static async findAll(options: any = {}): Promise<any[]> {
    return getMockDocuments();
  }
  
  static async findOne(options: any = {}): Promise<any | null> {
    const documents = getMockDocuments();
    const whereClause = options.where || {};
    return documents.find(doc => {
      for (const [key, value] of Object.entries(whereClause)) {
        if (doc[key as keyof typeof doc] !== value) return false;
      }
      return true;
    }) || null;
  }
  
  static async create(data: any): Promise<any> {
    return {
      id: `doc_${Math.random().toString(36).substring(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: data.tenantId || 'default-tenant'
    };
  }
  
  static async destroy(options: any = {}): Promise<number> {
    return 1; // Simulasi 1 dokumen terhapus
  }
}

// Import real models if they exist, otherwise use mock implementations
try { GeneralSettings = require('../models/GeneralSettings'); } catch (e) { console.warn('GeneralSettings model not found'); GeneralSettings = MockModel; }
try { Role = require('../models/Role'); } catch (e) { console.warn('Role model not found'); Role = MockModel; }
try { Branch = require('../models/Partner'); } catch (e) { console.warn('Partner model not found'); Branch = MockModel; } // Using Partner model for branches
try { Transaction = require('../models/Transaction'); } catch (e) { console.warn('Transaction model not found'); Transaction = MockModel; } // For financial transactions
try { User = require('../models/User'); } catch (e) { console.warn('User model not found'); User = MockModel; } // For employees

// These models might not exist yet as part of the migration
try { FinanceLedgerEntry = require('../models/FinanceLedgerEntry'); } catch (e) { console.warn('FinanceLedgerEntry model not found'); FinanceLedgerEntry = MockFinanceLedgerEntry; } // For finance ledger entries
try { PaymentMethod = require('../models/PaymentMethod'); } catch (e) { console.warn('PaymentMethod model not found'); PaymentMethod = MockPaymentMethod; } // For payment methods
try { Currency = require('../models/Currency'); } catch (e) { console.warn('Currency model not found'); Currency = MockCurrency; } // For currencies and exchange rates
try { Document = require('../models/Document'); } catch (e) { console.warn('Document model not found'); Document = MockDocument; } // For document uploads

// Create mock expense categories for fallback
const mockExpenseCategories = [
  { id: 'cat_supplies', name: 'Persediaan & Inventori', description: 'Pembelian obat, alat medis, dan perlengkapan klinik' },
  { id: 'cat_utilities', name: 'Utilitas', description: 'Listrik, air, internet, telepon' },
  { id: 'cat_rent', name: 'Sewa & Aset', description: 'Sewa gedung, peralatan, dan pemeliharaan aset' },
  { id: 'cat_salary', name: 'Gaji & Bonus', description: 'Gaji karyawan, bonus, tunjangan' },
  { id: 'cat_taxes', name: 'Pajak & Perizinan', description: 'Pajak, biaya perizinan, dan legal' },
  { id: 'cat_marketing', name: 'Marketing', description: 'Iklan, promosi, dan kegiatan marketing' },
  { id: 'cat_services', name: 'Jasa Profesional', description: 'Konsultan, akuntan, dan jasa profesional lainnya' },
  { id: 'cat_others', name: 'Lainnya', description: 'Pengeluaran lain yang tidak masuk kategori di atas' },
];

const prisma = {
  document: {
    findMany: async (params: any) => {
      try {
        apiLogger.info('Fetching documents with params:', params);
        const options: any = { where: {} };
        
        if (params?.where?.id) {
          options.where.id = params.where.id;
        }
        
        if (params?.where?.receiptId) {
          options.where.receiptId = params.where.receiptId;
        }
        
        if (params?.where?.returnId) {
          options.where.returnId = params.where.returnId;
        }
        
        if (params?.where?.tenantId) {
          options.where.tenantId = params.where.tenantId;
        }
        
        if (params?.orderBy?.createdAt) {
          options.order = [['createdAt', params.orderBy.createdAt === 'asc' ? 'ASC' : 'DESC']];
        } else {
          options.order = [['createdAt', 'DESC']];
        }
        
        const documents = await Document.findAll(options);
        return documents.map((doc: any) => ({
          ...doc.dataValues || doc,
          isFromMock: !doc.dataValues
        }));
      } catch (error) {
        apiLogger.error('Error fetching documents from DB:', error);
        apiLogger.info('Falling back to mock documents');
        const mockDocs = getMockDocuments();
        return mockDocs.map(doc => ({ ...doc, isFromMock: true }));
      }
    },
    
    findFirst: async (params: any) => {
      try {
        apiLogger.info('Finding one document with params:', params);
        const options: any = { where: {}, limit: 1 };
        
        if (params?.where?.id) {
          options.where.id = params.where.id;
        }
        
        if (params?.where?.receiptId) {
          options.where.receiptId = params.where.receiptId;
        }
        
        if (params?.where?.returnId) {
          options.where.returnId = params.where.returnId;
        }
        
        const doc = await Document.findOne(options);
        if (doc) {
          return {
            ...doc.dataValues || doc,
            isFromMock: !doc.dataValues
          };
        }
        return null;
      } catch (error) {
        apiLogger.error('Error finding document from DB:', error);
        apiLogger.info('Falling back to mock documents');
        const mockDocs = getMockDocuments();
        const doc = mockDocs.find(d => {
          if (params?.where?.id && d.id === params.where.id) return true;
          if (params?.where?.receiptId && d.receiptId === params.where.receiptId) return true;
          if (params?.where?.returnId && d.returnId === params.where.returnId) return true;
          return false;
        });
        
        if (doc) {
          return { ...doc, isFromMock: true };
        }
        return null;
      }
    },
    
    create: async (params: any) => {
      try {
        apiLogger.info('Creating document with data:', params.data);
        const doc = await Document.create(params.data);
        return {
          ...doc.dataValues || doc,
          isFromMock: !doc.dataValues
        };
      } catch (error) {
        apiLogger.error('Error creating document in DB:', error);
        apiLogger.info('Using mock document implementation');
        const mockDoc = await MockDocument.create(params.data);
        return { ...mockDoc, isFromMock: true };
      }
    },
    
    update: async (params: any) => {
      try {
        apiLogger.info('Updating document with data:', { where: params.where, data: params.data });
        await Document.update(params.data, { where: params.where });
        const updatedDoc = await Document.findOne({ where: params.where });
        return {
          ...updatedDoc?.dataValues || updatedDoc,
          isFromMock: !updatedDoc?.dataValues
        };
      } catch (error) {
        apiLogger.error('Error updating document in DB:', error);
        apiLogger.info('Using mock document implementation');
        const mockDocs = getMockDocuments();
        const docIndex = mockDocs.findIndex(d => d.id === params.where.id);
        if (docIndex >= 0) {
          mockDocs[docIndex] = { ...mockDocs[docIndex], ...params.data, updatedAt: new Date() };
          return { ...mockDocs[docIndex], isFromMock: true };
        }
        return null;
      }
    },
    
    delete: async (params: any) => {
      try {
        apiLogger.info('Deleting document with params:', params.where);
        const doc = await Document.findOne({ where: params.where });
        if (!doc) return { count: 0 };
        await Document.destroy({ where: params.where });
        return { count: 1 };
      } catch (error) {
        apiLogger.error('Error deleting document from DB:', error);
        apiLogger.info('Using mock document implementation');
        await MockDocument.destroy({ where: params.where });
        return { count: 1 };
      }
    },
  },
  
  financialTransaction: {
    async findMany(params: any) {
      try {
        return await Transaction.findAll({
          where: params?.where || {},
          order: params?.orderBy ? [[Object.keys(params.orderBy)[0], params.orderBy[Object.keys(params.orderBy)[0]]]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined,
          include: params?.include || []
        });
      } catch (error) {
        apiLogger.error('Error in prisma.financialTransaction.findMany adapter:', error);
        return [];
      }
    },
    async findFirst(params: any) {
      try {
        return await Transaction.findOne({
          where: params?.where || {}
        });
      } catch (error) {
        apiLogger.error('Error in prisma.financialTransaction.findFirst adapter:', error);
        return null;
      }
    },
    async create(params: any) {
      try {
        return await Transaction.create(params.data);
      } catch (error) {
        apiLogger.error('Error in prisma.financialTransaction.create adapter:', error);
        return null;
      }
    },
    async aggregate(params: any) {
      try {
        if (params?.sum) {
          const result = await Transaction.sum(Object.keys(params.sum)[0], {
            where: params?.where || {}
          });
          return { _sum: { [Object.keys(params.sum)[0]]: result || 0 } };
        }
        return { _sum: { amount: 0 } };
      } catch (error) {
        apiLogger.error('Error in prisma.financialTransaction.aggregate adapter:', error);
        return { _sum: { amount: 0 } };
      }
    }
  },
  branch: {
    async findMany(params: any) {
      try {
        return await Branch.findAll({
          where: params?.where || {},
          order: params?.orderBy ? [[Object.keys(params.orderBy)[0], params.orderBy[Object.keys(params.orderBy)[0]]]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined,
          include: params?.include || []
        });
      } catch (error) {
        apiLogger.error('Error in prisma.branch.findMany adapter:', error);
        return [];
      }
    },
    async findFirst(params: any) {
      try {
        return await Branch.findOne({
          where: params?.where || {}
        });
      } catch (error) {
        apiLogger.error('Error in prisma.branch.findFirst adapter:', error);
        return null;
      }
    },
    async create(params: any) {
      try {
        return await Branch.create(params.data);
      } catch (error) {
        apiLogger.error('Error in prisma.branch.create adapter:', error);
        return null;
      }
    },
    async update(params: any) {
      try {
        const { where, data } = params;
        await Branch.update(data, { where });
        return await Branch.findOne({ where });
      } catch (error) {
        apiLogger.error('Error in prisma.branch.update adapter:', error);
        return null;
      }
    },
    async delete(params: any) {
      try {
        const { where } = params;
        const branchToDelete = await Branch.findOne({ where });
        if (!branchToDelete) return null;
        
        await Branch.destroy({ where });
        return branchToDelete;
      } catch (error) {
        apiLogger.error('Error in prisma.branch.delete adapter:', error);
        return null;
      }
    }
  },
  role: {
    async findMany(params: any) {
      try {
        return await Role.findAll({
          where: params?.where || {},
          order: params?.orderBy ? [[Object.keys(params.orderBy)[0], params.orderBy[Object.keys(params.orderBy)[0]]]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined,
          include: params?.include || []
        });
      } catch (error) {
        apiLogger.error('Error in prisma.role.findMany adapter:', error);
        return [];
      }
    },
    async findFirst(params: any) {
      try {
        return await Role.findOne({
          where: params?.where || {}
        });
      } catch (error) {
        apiLogger.error('Error in prisma.role.findFirst adapter:', error);
        return null;
      }
    },
    async create(params: any) {
      try {
        return await Role.create(params.data);
      } catch (error) {
        apiLogger.error('Error in prisma.role.create adapter:', error);
        return null;
      }
    },
    async update(params: any) {
      try {
        const { where, data } = params;
        await Role.update(data, { where });
        return await Role.findOne({ where });
      } catch (error) {
        apiLogger.error('Error in prisma.role.update adapter:', error);
        return null;
      }
    },
    async delete(params: any) {
      try {
        const { where } = params;
        const roleToDelete = await Role.findOne({ where });
        if (!roleToDelete) return null;
        
        await Role.destroy({ where });
        return roleToDelete;
      } catch (error) {
        apiLogger.error('Error in prisma.role.delete adapter:', error);
        return null;
      }
    }
  },
  generalSettings: {
    async findFirst(params: any) {
      try {
        return await GeneralSettings.findOne({ where: params?.where || {} });
      } catch (error) {
        apiLogger.error('Error in prisma.generalSettings.findFirst adapter:', error);
        return null;
      }
    },
    async update(params: any) {
      try {
        const { where, data } = params;
        await GeneralSettings.update(data, { where });
        return await GeneralSettings.findOne({ where });
      } catch (error) {
        apiLogger.error('Error in prisma.generalSettings.update adapter:', error);
        return null;
      }
    },
    async create(params: any) {
      try {
        const { data } = params;
        return await GeneralSettings.create(data);
      } catch (error) {
        apiLogger.error('Error in prisma.generalSettings.create adapter:', error);
        return null;
      }
    }
  },

  // Finance operations
  income: {
    findMany: async (params: any) => {
      try {
        return await db.Transaction.findAll({
          where: params?.where || {},
          include: params?.include || [],
          order: params?.orderBy ? [Object.entries(params.orderBy)[0]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined
        });
      } catch (error) {
        apiLogger.error('Error in prisma.income.findMany adapter:', error);
        return [];
      }
    },
    count: async (params: any) => {
      try {
        return await db.Transaction.count({
          where: params?.where || {}
        });
      } catch (error) {
        apiLogger.error('Error in prisma.income.count adapter:', error);
        return 0;
      }
    },
    aggregate: async (params: any) => {
      try {
        if (params?.sum) {
          const result = await db.Transaction.sum(Object.keys(params.sum)[0], {
            where: params?.where || {}
          });
          return { _sum: { [Object.keys(params.sum)[0]]: result || 0 } };
        }
        return { _sum: { amount: 0 } };
      } catch (error) {
        apiLogger.error('Error in prisma.income.aggregate adapter:', error);
        return { _sum: { amount: 0 } };
      }
    }
  },
  expense: {
    findMany: async (params: any) => {
      try {
        return await db.Expense.findAll({
          where: params?.where || {},
          include: params?.include || [],
          order: params?.orderBy ? [Object.entries(params.orderBy)[0]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined
        });
      } catch (error) {
        apiLogger.error('Error in prisma.expense.findMany adapter:', error);
        return [];
      }
    },
    count: async (params: any) => {
      try {
        return await db.Expense.count({
          where: params?.where || {}
        });
      } catch (error) {
        apiLogger.error('Error in prisma.expense.count adapter:', error);
        return 0;
      }
    },
    aggregate: async (params: any) => {
      try {
        if (params?.sum) {
          const result = await db.Expense.sum(Object.keys(params.sum)[0], {
            where: params?.where || {}
          });
          return { _sum: { [Object.keys(params.sum)[0]]: result || 0 } };
        }
        return { _sum: { amount: 0 } };
      } catch (error) {
        apiLogger.error('Error in prisma.expense.aggregate adapter:', error);
        return { _sum: { amount: 0 } };
      }
    }
  },
  bankAccount: {
    findMany: async (params: any) => {
      try {
        return await db.BankAccount.findAll({
          where: params?.where || {},
          include: params?.include || [],
          order: params?.orderBy ? [Object.entries(params.orderBy)[0]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined
        });
      } catch (error) {
        apiLogger.error('Error in prisma.bankAccount.findMany adapter:', error);
        return [];
      }
    },
    aggregate: async (params: any) => {
      try {
        if (params?.sum) {
          const result = await db.BankAccount.sum(Object.keys(params.sum)[0], {
            where: params?.where || {}
          });
          return { _sum: { [Object.keys(params.sum)[0]]: result || 0 } };
        }
        return { _sum: { balance: 0 } };
      } catch (error) {
        apiLogger.error('Error in prisma.bankAccount.aggregate adapter:', error);
        return { _sum: { balance: 0 } };
      }
    }
  },
  // Generic query method as fallback
  $queryRaw: async () => {
    apiLogger.warn('$queryRaw called in prisma adapter - returning empty data');
    return [];
  },
  // Transactions not supported in this adapter
  $transaction(operations: any[]) {
    try {
      // For now, just run each operation in sequence without proper transaction
      return Promise.all(operations.map(op => op));
    } catch (error) {
      apiLogger.error('Error in prisma.$transaction adapter:', error);
      throw error;
    }
  },
  
  // Employee adapter (using User model)
  employee: {
    async findMany(params: any) {
      try {
        return await User.findAll({
          where: params?.where || {},
          order: params?.orderBy ? [[Object.keys(params.orderBy)[0], params.orderBy[Object.keys(params.orderBy)[0]]]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined,
          include: params?.include || [],
          // Always exclude password
          attributes: { exclude: ['password'] }
        });
      } catch (error) {
        apiLogger.error('Error in prisma.employee.findMany adapter:', error);
        return [];
      }
    },
    
    async findUnique(params: any) {
      try {
        return await User.findOne({
          where: params?.where || {},
          attributes: { exclude: ['password'] }
        });
      } catch (error) {
        apiLogger.error('Error in prisma.employee.findUnique adapter:', error);
        return null;
      }
    },
    
    async create(params: any) {
      try {
        return await User.create(params.data);
      } catch (error) {
        apiLogger.error('Error in prisma.employee.create adapter:', error);
        return null;
      }
    },
    
    async update(params: any) {
      try {
        const { where, data } = params;
        await User.update(data, { where });
        return await User.findOne({ 
          where,
          attributes: { exclude: ['password'] }
        });
      } catch (error) {
        apiLogger.error('Error in prisma.employee.update adapter:', error);
        return null;
      }
    },
    
    async delete(params: any) {
      try {
        const { where } = params;
        const userToDelete = await User.findOne({ 
          where,
          attributes: { exclude: ['password'] }
        });
        if (!userToDelete) return null;
        
        await User.destroy({ where });
        return userToDelete;
      } catch (error) {
        apiLogger.error('Error in prisma.employee.delete adapter:', error);
        return null;
      }
    }
  },
  
  // Expense adapter - uses Transaction model with type='expense'
  expenseTransaction: {
    async findMany(params: any) {
      try {
        // Adapt for expenses (transactions with type='expense')
        const whereParams = {
          ...params?.where,
          type: 'expense'
        };
        
        let include = params?.include || [];
        
        // Handle Prisma-style includes for related data
        if (params?.include) {
          if (params.include.category) {
            // We'll handle category in the response transformation
          }
          
          if (params.include.createdBy) {
            include.push({
              model: User,
              as: 'employee',
              attributes: ['id', 'name']
            });
          }
        }
        
        // Query expenses as transactions
        const expenses = await Transaction.findAll({
          where: whereParams,
          order: params?.orderBy ? [[Object.keys(params.orderBy)[0], params.orderBy[Object.keys(params.orderBy)[0]]]] : [],
          limit: params?.take || undefined,
          offset: params?.skip || undefined,
          include
        });
        
        // Transform the result to match Prisma's expected format
        if (expenses.length > 0) {
          // Transform data to match expected format with categories
          return expenses.map(expense => {
            const result = expense.toJSON();
            
            // Add category info if requested
            if (params?.include?.category) {
              // Find matching category from mock data by categoryId
              const categoryId = result.categoryId || 'cat_others';
              const category = mockExpenseCategories.find(c => c.id === categoryId) || 
                mockExpenseCategories.find(c => c.id === 'cat_others');
              
              result.category = category;
            }
            
            // Rename employee to createdBy if requested
            if (params?.include?.createdBy && result.employee) {
              result.createdBy = {
                name: result.employee.name
              };
              delete result.employee;
            }
            
            return result;
          });
        }
        
        return [];
      } catch (error) {
        apiLogger.error('Error in prisma.expense.findMany adapter:', error);
        return [];
      }
    },
    
    async create(params: any) {
      try {
        // Add expense type to the data
        const data = {
          ...params.data,
          type: 'expense'
        };
        
        // Create expense as a transaction
        const expense = await Transaction.create(data);
        
        return expense;
      } catch (error) {
        apiLogger.error('Error in prisma.expense.create adapter:', error);
        return null;
      }
    },
    
    async update(params: any) {
      try {
        const { where, data } = params;
        
        // Make sure we're updating an expense type transaction
        const whereWithType = {
          ...where,
          type: 'expense'
        };
        
        await Transaction.update(data, { where: whereWithType });
        return await Transaction.findOne({ where: whereWithType });
      } catch (error) {
        apiLogger.error('Error in prisma.expense.update adapter:', error);
        return null;
      }
    },
    
    async delete(params: any) {
      try {
        const { where } = params;
        
        // Make sure we're deleting an expense type transaction
        const whereWithType = {
          ...where,
          type: 'expense'
        };
        
        const expenseToDelete = await Transaction.findOne({ where: whereWithType });
        if (!expenseToDelete) return null;
        
        await Transaction.destroy({ where: whereWithType });
        return expenseToDelete;
      } catch (error) {
        apiLogger.error('Error in prisma.expense.delete adapter:', error);
        return null;
      }
    }
  },
  
  // Expense category adapter (uses mock data since we don't have a real model)
  expenseCategory: {
    async findMany(params: any) {
      try {
        // Use the mock data since we don't have a real model
        let categories = [...mockExpenseCategories];
        
        // Apply where conditions if provided
        if (params?.where) {
          const { where } = params;
          
          // Filter by name (contains string)
          if (where.name?.contains) {
            const searchText = where.name.contains.toLowerCase();
            categories = categories.filter(category => 
              category.name.toLowerCase().includes(searchText)
            );
          }
          
          // Filter by id (exact match)
          if (where.id) {
            categories = categories.filter(category => category.id === where.id);
          }
        }
        
        // Apply orderBy if provided
        if (params?.orderBy) {
          const orderBy = Array.isArray(params.orderBy) ? params.orderBy : [params.orderBy];
          
          categories.sort((a, b) => {
            for (const criteria of orderBy) {
              const [field, direction] = Object.entries(criteria)[0];
              const fieldName = field as keyof typeof a;
              
              // Skip if the field doesn't exist
              if (!(fieldName in a) || !(fieldName in b)) continue;
              
              // Sort ascending
              if (direction === 'asc') {
                return a[fieldName] > b[fieldName] ? 1 : -1;
              }
              
              // Sort descending
              return a[fieldName] > b[fieldName] ? -1 : 1;
            }
            return 0; // Return 0 if no sort criteria matched
          });
        }
        
        // Apply pagination if provided
        if (params?.skip || params?.take) {
          const skip = params.skip || 0;
          const take = params.take || categories.length;
          categories = categories.slice(skip, skip + take);
        }
        
        return categories;
      } catch (error) {
        apiLogger.error('Error in prisma.expenseCategory.findMany adapter:', error);
        return [];
      }
    },
    
    async findUnique(params: any) {
      try {
        const { where } = params;
        
        // Find the category in mock data
        if (where.id) {
          return mockExpenseCategories.find(category => category.id === where.id) || null;
        }
        
        return null;
      } catch (error) {
        apiLogger.error('Error in prisma.expenseCategory.findUnique adapter:', error);
        return null;
      }
    },
    
    // Additional methods can be added as needed
  },
  
  // Currency adapter
  currency: {
    async findMany(params: any) {
      try {
        const whereClause = params?.where || {};
        
        // Get currencies from database
        const currencies = await Currency.findAll({
          where: whereClause,
          limit: params?.take || undefined,
          offset: params?.skip || undefined
        });
        
        apiLogger.info(`Retrieved ${currencies.length} currencies from database`);
        return currencies;
      } catch (error) {
        apiLogger.error('Error in prisma.currency.findMany adapter:', error);
        
        // Return mock currencies as fallback
        return getMockCurrencies();
      }
    },
    
    async findFirst(params: any) {
      try {
        const whereClause = params?.where || {};
        
        // Find first currency matching criteria
        const currency = await Currency.findOne({
          where: whereClause
        });
        
        return currency;
      } catch (error) {
        apiLogger.error('Error in prisma.currency.findFirst adapter:', error);
        
        // Return null as fallback
        return null;
      }
    },
    
    async create(params: any) {
      try {
        const data = { ...params.data };
        
        // Handle nested relations
        if (data.tenant?.connect?.id) {
          data.tenantId = data.tenant.connect.id;
          delete data.tenant;
        }
        
        // Create currency
        const currency = await Currency.create(data);
        return currency;
      } catch (error: any) {
        apiLogger.error('Error in prisma.currency.create adapter:', error);
        
        // Check for duplicate key error
        if (error.name === 'SequelizeUniqueConstraintError') {
          // Simulate Prisma's P2002 error code for consistency
          const customError: any = new Error('Unique constraint failed');
          customError.code = 'P2002';
          throw customError;
        }
        
        throw error;
      }
    },
    
    async update(params: any) {
      try {
        const data = { ...params.data };
        
        // Update currency
        const [updated, currencies] = await Currency.update(data, {
          where: params.where,
          returning: true
        });
        
        if (!updated || currencies.length === 0) {
          return null;
        }
        
        return currencies[0];
      } catch (error: any) {
        apiLogger.error('Error in prisma.currency.update adapter:', error);
        
        // Check for duplicate key error
        if (error.name === 'SequelizeUniqueConstraintError') {
          // Simulate Prisma's P2002 error code for consistency
          const customError: any = new Error('Unique constraint failed');
          customError.code = 'P2002';
          throw customError;
        }
        
        throw error;
      }
    },
    
    async updateMany(params: any) {
      try {
        const { where, data } = params;
        
        // Update multiple currencies
        const [updated] = await Currency.update(data, {
          where: where
        });
        
        return { count: updated };
      } catch (error) {
        apiLogger.error('Error in prisma.currency.updateMany adapter:', error);
        throw error;
      }
    },
    
    async delete(params: any) {
      try {
        const currencyToDelete = await Currency.findOne({
          where: params.where
        });
        
        if (!currencyToDelete) {
          return null;
        }
        
        await currencyToDelete.destroy();
        return currencyToDelete;
      } catch (error) {
        apiLogger.error('Error in prisma.currency.delete adapter:', error);
        throw error;
      }
    },
    
    async count(params: any) {
      try {
        const count = await Currency.count({
          where: params.where || {}
        });
        
        return count;
      } catch (error) {
        apiLogger.error('Error in prisma.currency.count adapter:', error);
        return 0;
      }
    }
  }
};

// Helper function to generate mock ledger entries
function getMockLedgerEntries() {
  return [
    {
      id: 'le_001',
      description: 'Pembayaran supplier',
      amount: 2500000,
      date: new Date(),
      category: 'expense',
      transactionId: 'tx_001',
      paymentMethodId: 'pm_cash',
      currencyId: 'idr',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    },
    {
      id: 'le_002',
      description: 'Penjualan resep',
      amount: 350000,
      date: new Date(),
      category: 'income',
      transactionId: 'tx_002',
      paymentMethodId: 'pm_cash',
      currencyId: 'idr',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    },
    {
      id: 'le_003',
      description: 'Pembayaran utilities',
      amount: 750000,
      date: new Date(),
      category: 'expense',
      transactionId: 'tx_003',
      paymentMethodId: 'pm_transfer',
      currencyId: 'idr',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    }
  ];
}

// Helper function to generate mock documents for fallback
function getMockDocuments() {
  return [
    {
      id: 'doc_001',
      filename: 'invoice-123.pdf',
      originalName: 'Invoice PO-123.pdf',
      fileType: 'application/pdf',
      size: 245000,
      url: '/uploads/documents/invoice-123.pdf',
      thumbnailUrl: '/uploads/thumbnails/invoice-123.jpg',
      description: 'Invoice untuk penerimaan barang dari supplier ABC',
      receiptId: 'receipt_001',
      returnId: null,
      tenantId: 'default-tenant',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'doc_002',
      filename: 'damaged-product.jpg',
      originalName: 'damaged-product.jpg',
      fileType: 'image/jpeg',
      size: 340000,
      url: '/uploads/documents/damaged-product.jpg',
      thumbnailUrl: '/uploads/thumbnails/damaged-product.jpg',
      description: 'Foto produk rusak untuk proses retur',
      receiptId: null,
      returnId: 'return_001',
      tenantId: 'default-tenant',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'doc_003',
      filename: 'surat-jalan.pdf',
      originalName: 'Surat Jalan 456.pdf',
      fileType: 'application/pdf',
      size: 180000,
      url: '/uploads/documents/surat-jalan.pdf',
      thumbnailUrl: '/uploads/thumbnails/surat-jalan.jpg',
      description: 'Surat jalan pengiriman dari PT Supplier',
      receiptId: 'receipt_002',
      returnId: null,
      tenantId: 'default-tenant',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}

// Helper function to generate mock payment methods
function getMockPaymentMethods() {
  return [
    {
      id: 'pm_cash',
      name: 'Tunai',
      type: 'cash',
      description: 'Pembayaran langsung dengan uang tunai',
      fee: 0,
      requiresVerification: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant',
      currencyId: 'idr'
    },
    {
      id: 'pm_credit_card',
      name: 'Kartu Kredit',
      type: 'credit_card',
      description: 'Pembayaran menggunakan kartu kredit',
      fee: 2.5,
      requiresVerification: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant',
      currencyId: 'idr'
    },
    {
      id: 'pm_bank_transfer',
      name: 'Transfer Bank',
      type: 'bank_transfer',
      description: 'Pembayaran melalui transfer antar bank',
      fee: 0,
      requiresVerification: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant',
      currencyId: 'idr'
    },
    {
      id: 'pm_ewallet',
      name: 'E-Wallet',
      type: 'ewallet',
      description: 'Pembayaran menggunakan dompet elektronik',
      fee: 1,
      requiresVerification: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant',
      currencyId: 'idr'
    },
    {
      id: 'pm_asuransi',
      name: 'Asuransi',
      type: 'insurance',
      description: 'Pembayaran melalui klaim asuransi',
      fee: 0,
      requiresVerification: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant',
      currencyId: 'idr'
    }
  ];
}

// Helper function to generate mock currencies
function getMockCurrencies() {
  return [
    {
      id: 'idr',
      code: 'IDR',
      name: 'Indonesian Rupiah',
      symbol: 'Rp',
      exchangeRate: 1.0,
      isDefault: true,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    },
    {
      id: 'usd',
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      exchangeRate: 0.000065,
      isDefault: false,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    },
    {
      id: 'sgd',
      code: 'SGD',
      name: 'Singapore Dollar',
      symbol: 'S$',
      exchangeRate: 0.000087,
      isDefault: false,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    },
    {
      id: 'eur',
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      exchangeRate: 0.000059,
      isDefault: false,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    },
    {
      id: 'jpy',
      code: 'JPY',
      name: 'Japanese Yen',
      symbol: '¥',
      exchangeRate: 0.0097,
      isDefault: false,
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default-tenant'
    }
  ];
}

export default prisma;
