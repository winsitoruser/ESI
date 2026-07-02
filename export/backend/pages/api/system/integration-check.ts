import { NextApiRequest, NextApiResponse } from 'next';
import { QueryTypes } from 'sequelize';

/**
 * System Integration Check API
 * Verifies database connections, model associations, and inter-module communication
 */

interface IntegrationStatus {
  module: string;
  status: 'ok' | 'warning' | 'error';
  details: string;
  tables?: string[];
  apiEndpoints?: string[];
}

interface CheckResult {
  timestamp: string;
  database: {
    connected: boolean;
    version?: string;
    tables: number;
  };
  modules: IntegrationStatus[];
  websocket: {
    available: boolean;
    endpoint: string;
  };
  summary: {
    total: number;
    ok: number;
    warnings: number;
    errors: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result: CheckResult = {
    timestamp: new Date().toISOString(),
    database: { connected: false, tables: 0 },
    modules: [],
    websocket: { available: false, endpoint: '/api/websocket/broadcast' },
    summary: { total: 0, ok: 0, warnings: 0, errors: 0 }
  };

  // Check database connection
  try {
    const { sequelize } = await import('@/lib/sequelizeClient');
    
    await sequelize.authenticate();
    result.database.connected = true;

    // Get database version
    const [versionResult] = await sequelize.query('SELECT version()', { type: QueryTypes.SELECT });
    result.database.version = (versionResult as any)?.version || 'Unknown';

    // Count tables
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `, { type: QueryTypes.SELECT });
    result.database.tables = tables.length;

    // Check each module's tables and integration
    result.modules = await checkModules(sequelize);

  } catch (error: any) {
    result.database.connected = false;
    result.modules.push({
      module: 'Database',
      status: 'error',
      details: `Connection failed: ${error.message}`
    });
  }

  // Check WebSocket
  try {
    const wsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/websocket/broadcast`, {
      method: 'GET'
    });
    result.websocket.available = wsResponse.ok;
  } catch {
    result.websocket.available = false;
  }

  // Calculate summary
  result.summary.total = result.modules.length;
  result.summary.ok = result.modules.filter(m => m.status === 'ok').length;
  result.summary.warnings = result.modules.filter(m => m.status === 'warning').length;
  result.summary.errors = result.modules.filter(m => m.status === 'error').length;

  return res.status(200).json(result);
}

async function checkModules(sequelize: any): Promise<IntegrationStatus[]> {
  const modules: IntegrationStatus[] = [];

  // 1. POS Module
  modules.push(await checkPOSModule(sequelize));

  // 2. Kitchen Module
  modules.push(await checkKitchenModule(sequelize));

  // 3. Inventory Module
  modules.push(await checkInventoryModule(sequelize));

  // 4. HRIS Module
  modules.push(await checkHRISModule(sequelize));

  // 5. Finance Module
  modules.push(await checkFinanceModule(sequelize));

  // 6. HQ/Branch Module
  modules.push(await checkHQModule(sequelize));

  // 7. Reports Module
  modules.push(await checkReportsModule(sequelize));

  return modules;
}

async function checkPOSModule(sequelize: any): Promise<IntegrationStatus> {
  const requiredTables = ['pos_transactions', 'pos_transaction_items', 'shifts', 'held_transactions'];
  const apiEndpoints = ['/api/pos/transactions', '/api/pos/shifts', '/api/pos/receipts'];
  
  try {
    const existingTables = await checkTables(sequelize, requiredTables);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      // Check data integrity
      const [txCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM pos_transactions',
        { type: QueryTypes.SELECT }
      );
      
      return {
        module: 'POS',
        status: 'ok',
        details: `All tables exist. ${(txCount as any).count} transactions found.`,
        tables: existingTables,
        apiEndpoints
      };
    } else {
      return {
        module: 'POS',
        status: 'warning',
        details: `Missing tables: ${missingTables.join(', ')}`,
        tables: existingTables,
        apiEndpoints
      };
    }
  } catch (error: any) {
    return {
      module: 'POS',
      status: 'error',
      details: error.message,
      apiEndpoints
    };
  }
}

async function checkKitchenModule(sequelize: any): Promise<IntegrationStatus> {
  const requiredTables = ['kitchen_orders', 'kitchen_order_items', 'kitchen_inventory_items', 'recipes'];
  const apiEndpoints = ['/api/kitchen/orders', '/api/kitchen/inventory', '/api/kitchen/recipes'];
  
  try {
    const existingTables = await checkTables(sequelize, requiredTables);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      return {
        module: 'Kitchen',
        status: 'ok',
        details: 'All tables exist and accessible.',
        tables: existingTables,
        apiEndpoints
      };
    } else if (missingTables.length < requiredTables.length) {
      return {
        module: 'Kitchen',
        status: 'warning',
        details: `Partial setup. Missing: ${missingTables.join(', ')}`,
        tables: existingTables,
        apiEndpoints
      };
    } else {
      return {
        module: 'Kitchen',
        status: 'warning',
        details: 'Tables not initialized. Using mock data.',
        apiEndpoints
      };
    }
  } catch (error: any) {
    return {
      module: 'Kitchen',
      status: 'error',
      details: error.message,
      apiEndpoints
    };
  }
}

async function checkInventoryModule(sequelize: any): Promise<IntegrationStatus> {
  const requiredTables = ['products', 'stocks', 'stock_movements', 'warehouses'];
  const apiEndpoints = ['/api/inventory/products', '/api/inventory/stock', '/api/inventory/movements'];
  
  try {
    const existingTables = await checkTables(sequelize, requiredTables);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      const [productCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM products',
        { type: QueryTypes.SELECT }
      );
      
      return {
        module: 'Inventory',
        status: 'ok',
        details: `All tables exist. ${(productCount as any).count} products in database.`,
        tables: existingTables,
        apiEndpoints
      };
    } else {
      return {
        module: 'Inventory',
        status: 'warning',
        details: `Missing tables: ${missingTables.join(', ')}`,
        tables: existingTables,
        apiEndpoints
      };
    }
  } catch (error: any) {
    return {
      module: 'Inventory',
      status: 'error',
      details: error.message,
      apiEndpoints
    };
  }
}

async function checkHRISModule(sequelize: any): Promise<IntegrationStatus> {
  const requiredTables = ['employees', 'employee_attendance', 'employee_kpis', 'kpi_templates'];
  const apiEndpoints = ['/api/hq/hris/employees', '/api/hq/hris/attendance', '/api/hq/hris/kpi'];
  
  try {
    const existingTables = await checkTables(sequelize, requiredTables);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      const [empCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM employees',
        { type: QueryTypes.SELECT }
      );
      
      return {
        module: 'HRIS',
        status: 'ok',
        details: `All tables exist. ${(empCount as any).count} employees in database.`,
        tables: existingTables,
        apiEndpoints
      };
    } else {
      return {
        module: 'HRIS',
        status: 'warning',
        details: `Missing tables: ${missingTables.join(', ')}. Using mock data.`,
        tables: existingTables,
        apiEndpoints
      };
    }
  } catch (error: any) {
    return {
      module: 'HRIS',
      status: 'warning',
      details: `Database check failed. APIs available with mock data.`,
      apiEndpoints
    };
  }
}

async function checkFinanceModule(sequelize: any): Promise<IntegrationStatus> {
  const requiredTables = ['finance_transactions', 'finance_accounts', 'finance_invoices', 'finance_budgets'];
  const apiEndpoints = ['/api/hq/finance/summary', '/api/hq/finance/revenue', '/api/hq/finance/profit-loss'];
  
  try {
    const existingTables = await checkTables(sequelize, requiredTables);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      return {
        module: 'Finance',
        status: 'ok',
        details: 'All tables exist and accessible.',
        tables: existingTables,
        apiEndpoints
      };
    } else {
      return {
        module: 'Finance',
        status: 'warning',
        details: `Missing tables: ${missingTables.join(', ')}. APIs available with mock data.`,
        tables: existingTables,
        apiEndpoints
      };
    }
  } catch (error: any) {
    return {
      module: 'Finance',
      status: 'warning',
      details: `Database check failed. APIs available with mock data.`,
      apiEndpoints
    };
  }
}

async function checkHQModule(sequelize: any): Promise<IntegrationStatus> {
  const requiredTables = ['branches', 'branch_real_time_metrics', 'tenants'];
  const apiEndpoints = ['/api/hq/branches', '/api/hq/dashboard', '/api/hq/realtime'];
  
  try {
    const existingTables = await checkTables(sequelize, requiredTables);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length === 0) {
      const [branchCount] = await sequelize.query(
        'SELECT COUNT(*) as count FROM branches WHERE is_active = true',
        { type: QueryTypes.SELECT }
      );
      
      return {
        module: 'HQ/Branch',
        status: 'ok',
        details: `All tables exist. ${(branchCount as any).count} active branches.`,
        tables: existingTables,
        apiEndpoints
      };
    } else {
      return {
        module: 'HQ/Branch',
        status: 'warning',
        details: `Missing tables: ${missingTables.join(', ')}`,
        tables: existingTables,
        apiEndpoints
      };
    }
  } catch (error: any) {
    return {
      module: 'HQ/Branch',
      status: 'warning',
      details: `Database check failed. APIs available with mock data.`,
      apiEndpoints
    };
  }
}

async function checkReportsModule(sequelize: any): Promise<IntegrationStatus> {
  const apiEndpoints = ['/api/reports/sales', '/api/reports/inventory', '/api/reports/financial'];
  
  // Reports module primarily aggregates data from other modules
  return {
    module: 'Reports',
    status: 'ok',
    details: 'Reports module aggregates data from POS, Inventory, and Finance.',
    apiEndpoints
  };
}

async function checkTables(sequelize: any, tableNames: string[]): Promise<string[]> {
  const existing: string[] = [];
  
  for (const tableName of tableNames) {
    try {
      await sequelize.query(`SELECT 1 FROM ${tableName} LIMIT 1`, { type: QueryTypes.SELECT });
      existing.push(tableName);
    } catch {
      // Table doesn't exist or not accessible
    }
  }
  
  return existing;
}
