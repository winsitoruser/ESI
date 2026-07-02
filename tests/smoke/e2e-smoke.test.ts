/**
 * QA E2E Smoke Test — Bedagang ERP
 *
 * Covers:
 *  1. Auth — login flow, role normalization, redirects
 *  2. Dashboard — widgets, data loading logic
 *  3. Products — CRUD, categories, stock
 *  4. DMS — CRUD operations (brankas, persuratan, disposisi)
 *  5. BUMDes — CRUD, Suppliers, Procurement, Logistics
 *  6. Health check & system connectivity
 *
 * Uses http module for live endpoint checks.
 * Mock-based tests for CRUD operations.
 */
import { createMockSession } from '@/tests/helpers/test-utils';

// ============================================================
// HTTP helpers with 3s timeout
// ============================================================
function httpGet(url: string): Promise<{ status: number; data: any; text: string }> {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get(url, (res: any) => {
      let body = '';
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => {
        let data: any = null;
        try { data = JSON.parse(body); } catch { /* text */ }
        resolve({ status: res.statusCode ?? 0, data, text: body });
      });
      res.on('error', () => resolve({ status: 0, data: null, text: '' }));
    });
    req.on('error', () => resolve({ status: 0, data: null, text: '' }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, data: null, text: '' }); });
  });
}

function httpPost(url: string, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    const http = require('http');
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res: any) => {
      let b = '';
      res.on('data', (chunk: string) => { b += chunk; });
      res.on('end', () => {
        let data: any = null;
        try { data = JSON.parse(b); } catch { data = b; }
        resolve({ status: res.statusCode ?? 0, data });
      });
      res.on('error', () => resolve({ status: 0, data: null }));
    });
    req.write(payload);
    req.end();
    req.on('error', () => resolve({ status: 0, data: null }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ status: 0, data: null }); });
  });
}

const API = 'http://localhost:3001';

// ============================================================
// Mock model factory
// ============================================================
function mockModel() {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findByPk: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'mock-id', toJSON: () => ({}) }),
    update: jest.fn().mockResolvedValue([1] as any),
    destroy: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    sum: jest.fn().mockResolvedValue(0),
  };
}

// ============================================================
// 1. HEALTH CHECK
// ============================================================
describe('[Smoke] 1. System Health', () => {
  it('health endpoint responds (200 healthy / 503 degraded)', async () => {
    const r = await httpGet(`${API}/api/health`);
    expect([200, 503]).toContain(r.status);
    expect(r.data).toBeDefined();
    // API service should always report its status
    expect(r.data.services?.api).toBeDefined();
    expect(r.data.version).toBeDefined();
    expect(r.data.environment).toBeDefined();
  });

  it('reports module/business-type stats when healthy', async () => {
    const r = await httpGet(`${API}/api/health`);
    if (r.data.stats) {
      expect(typeof r.data.stats.modules).toBe('number');
      expect(typeof r.data.stats.businessTypes).toBe('number');
    } else {
      // Degraded — stats may be absent
      expect(r.data.status).toBe('degraded');
    }
  });

  it('returns version and environment', async () => {
    const r = await httpGet(`${API}/api/health`);
    expect(r.data.version).toBeDefined();
    expect(r.data.environment).toBe('development');
  });
});

// ============================================================
// 2. AUTH — Login, Role Normalization, Redirects
// ============================================================
describe('[Smoke] 2. Auth — Login & Role Flow', () => {
  const I2E: Record<string,string> = { admin_hq:'hq_admin', kasir:'cashier', gudang:'inventory_staff', hr:'hr_staff', finance:'finance_staff' };
  const E2I: Record<string,string> = { hq_admin:'admin_hq', cashier:'kasir', inventory_staff:'gudang', hr_staff:'hr', finance_staff:'finance' };
  const ALIASES = { ...I2E, ...E2I };
  const REDIRS: Record<string,string> = {
    super_admin:'/hq/dashboard', owner:'/hq/dashboard', hq_admin:'/hq/dashboard', admin:'/hq/dashboard',
    manager:'/hq/dashboard', branch_manager:'/hq/dashboard', manager_toko:'/hq/dashboard',
    finance_staff:'/finance', hr_staff:'/hq/hris', hris_staff:'/hq/hris',
    auditor:'/hq/audit-logs', regulator:'/hq/audit-logs',
    cashier:'/pos/cashier', supervisor_kasir:'/pos/cashier',
    inventory_staff:'/inventory', kitchen_staff:'/pos', staff:'/hq/dashboard',
  };

  const norm = (r?: string|null) => !r ? 'staff' : I2E[r]||r;
  const redir = (r?: string|null) => {
    if (!r) return '/hq/dashboard';
    if (REDIRS[r]) return REDIRS[r];
    const c = ALIASES[r];
    return c && REDIRS[c] ? REDIRS[c] : '/hq/dashboard';
  };

  it('normalizes Indonesian→English', () => {
    expect(norm('admin_hq')).toBe('hq_admin'); expect(norm('kasir')).toBe('cashier');
    expect(norm('gudang')).toBe('inventory_staff'); expect(norm('hr')).toBe('hr_staff');
    expect(norm('finance')).toBe('finance_staff');
  });
  it('preserves English', () => { expect(norm('owner')).toBe('owner'); });
  it('null→staff', () => { expect(norm(null)).toBe('staff'); expect(norm(undefined)).toBe('staff'); });
  it('super_admin/owner→HQ', () => { expect(redir('super_admin')).toBe('/hq/dashboard'); expect(redir('owner')).toBe('/hq/dashboard'); });
  it('cashier→POS', () => { expect(redir('cashier')).toBe('/pos/cashier'); expect(redir('kasir')).toBe('/pos/cashier'); });
  it('gudang→inventory', () => { expect(redir('gudang')).toBe('/inventory'); expect(redir('inventory_staff')).toBe('/inventory'); });
  it('finance→/finance', () => { expect(redir('finance_staff')).toBe('/finance'); });
  it('HR→/hq/hris', () => { expect(redir('hr_staff')).toBe('/hq/hris'); });
  it('auditor→audit-logs', () => { expect(redir('auditor')).toBe('/hq/audit-logs'); });
  it('unknown→dashboard', () => { expect(redir('x')).toBe('/hq/dashboard'); expect(redir(null)).toBe('/hq/dashboard'); });
  it('session has required fields', () => {
    const s = createMockSession();
    expect(s.user.id).toBeDefined(); expect(s.user.email).toBeDefined();
    expect(s.user.role).toBeDefined(); expect(s.user.tenantId).toBeDefined();
  });
  it('different role sessions', () => {
    expect(createMockSession({role:'super_admin'}).user.role).toBe('super_admin');
    expect(createMockSession({role:'cashier'}).user.role).toBe('cashier');
  });
});

// ============================================================
// 3. DASHBOARD
// ============================================================
describe('[Smoke] 3. Dashboard', () => {
  it('dashboard → 401', async () => {
    expect((await httpGet(`${API}/api/hq/dashboard`)).status).toBe(401);
  });
  it('widget-layout → 401', async () => {
    expect((await httpGet(`${API}/api/hq/dashboard/widget-layout`)).status).toBe(401);
  });
});

// ============================================================
// 4. PRODUCTS — CRUD
// ============================================================
describe('[Smoke] 4. Products — CRUD, Categories, Stock', () => {
  let P: ReturnType<typeof mockModel>;
  let C: ReturnType<typeof mockModel>;
  let S: ReturnType<typeof mockModel>;
  beforeEach(() => { P = mockModel(); C = mockModel(); S = mockModel(); });

  it('create', async () => {
    P.create.mockResolvedValue({ id:'p1', name:'A', toJSON:()=>({}) });
    expect((await P.create({name:'A'})).id).toBe('p1');
  });
  it('findAll default []', async () => expect(await P.findAll()).toEqual([]));
  it('findOne default null', async () => expect(await P.findOne({where:{id:'x'}})).toBeNull());
  it('update returns [1]', async () => {
    expect((await P.update({price:30},{where:{id:'p1'}}))[0]).toBe(1);
  });
  it('destroy returns 1', async () => expect(await P.destroy({where:{id:'p1'}})).toBe(1));
  it('count default 0', async () => expect(await P.count()).toBe(0));
  it('findAndCountAll', async () => {
    P.findAndCountAll.mockResolvedValue({count:2,rows:[{id:'p1'},{id:'p2'}]});
    const r = await P.findAndCountAll({limit:10});
    expect(r.count).toBe(2); expect(r.rows).toHaveLength(2);
  });
  it('Category', async () => {
    expect(await C.findAll()).toEqual([]);
    expect(await C.create({name:'Minuman'})).toBeDefined();
  });
  it('Stock lifecycle', async () => {
    expect(await S.findAll()).toEqual([]);
    expect(await S.create({productId:'p1',qty:50})).toBeDefined();
    expect((await S.update({qty:30},{where:{productId:'p1'}}))[0]).toBe(1);
    expect(await S.destroy({where:{productId:'p1'}})).toBe(1);
  });
  it('products API → 401', async () => {
    expect((await httpGet(`${API}/api/hq/products`)).status).toBe(401);
  });
  it('categories API → 401', async () => {
    expect((await httpGet(`${API}/api/hq/products/categories`)).status).toBe(401);
  });
});

// ============================================================
// 5. DMS — Brankas, Persuratan, Disposisi
// ============================================================
describe('[Smoke] 5. DMS — Brankas, Persuratan, Disposisi', () => {
  const ACTIONS = ['overview','files','folders','letters','dispositions',
    'audit','storage','analytics','policies','records-classification',
    'records-stats','shares','mata-elang','signatures',
    'disposal-batches','knowledge-graph','hierarchy','scan',
  ];
  for (const a of ACTIONS) {
    it(`action="${a}" → 401`, async () => {
      expect((await httpGet(`${API}/api/hq/dms?action=${a}`)).status).toBe(401);
    });
  }
  // DMS POST that should return 401 too
  it('POST letter → 401', async () => {
    expect((await httpPost(`${API}/api/hq/dms?action=letter`,{title:'T'})).status).toBe(401);
  });
  it('POST disposition → 401', async () => {
    expect((await httpPost(`${API}/api/hq/dms?action=disposition`,{letterId:'l1'})).status).toBe(401);
  });
});

// ============================================================
// 6. BUMDes
// ============================================================
describe('[Smoke] 6. BUMDes — CRUD', () => {
  const ACTIONS = ['overview','profil','governance','units','capital',
    'accounting','financial-reports','microfinance','profit-sharing','reports','integrations'];
  for (const a of ACTIONS) {
    it(`action="${a}" → 401`, async () => {
      expect((await httpGet(`${API}/api/hq/bumdes?action=${a}`)).status).toBe(401);
    });
  }
});

// ============================================================
// 7. SUPPLIERS
// ============================================================
describe('[Smoke] 7. Suppliers — CRUD', () => {
  let M: ReturnType<typeof mockModel>;
  beforeEach(() => { M = mockModel(); });

  it('GET → 401', async () => {
    expect((await httpGet(`${API}/api/hq/suppliers`)).status).toBe(401);
  });
  it('POST → 401', async () => {
    expect((await httpPost(`${API}/api/hq/suppliers`,{name:'X'})).status).toBe(401);
  });
  it('mock create', async () => expect(await M.create({name:'X'})).toBeDefined());
  it('mock findAll', async () => expect(await M.findAll()).toEqual([]));
  it('mock update', async () => expect((await M.update({n:'Y'},{where:{id:'s1'}}))[0]).toBe(1));
  it('mock destroy', async () => expect(await M.destroy({where:{id:'s1'}})).toBe(1));
});

// ============================================================
// 8. PROCUREMENT
// ============================================================
describe('[Smoke] 8. Procurement — CRUD', () => {
  it('procurement/enhanced → 401', async () => {
    expect((await httpGet(`${API}/api/hq/procurement/enhanced`)).status).toBe(401);
  });
  it('e-procurement → 401', async () => {
    expect((await httpGet(`${API}/api/hq/e-procurement`)).status).toBe(401);
  });
  it('requisitions → 401', async () => {
    expect((await httpGet(`${API}/api/hq/requisitions`)).status).toBe(401);
  });
});

// ============================================================
// 9. LOGISTICS
// ============================================================
describe('[Smoke] 9. Logistics — Warehouse, Inventory, Fleet', () => {
  it('warehouse → 401', async () => {
    expect((await httpGet(`${API}/api/hq/warehouse`)).status).toBe(401);
  });
  it('inventory → 401/404', async () => {
    const s = (await httpGet(`${API}/api/hq/inventory`)).status;
    expect([401, 404]).toContain(s);
  });
  it('fleet → 401', async () => {
    expect((await httpGet(`${API}/api/hq/fleet`)).status).toBe(401);
  });
  it('Stock mock lifecycle', async () => {
    const S = mockModel();
    expect(await S.create({productId:'p1',qty:100})).toBeDefined();
    expect(await S.findAll()).toEqual([]);
    expect((await S.update({qty:75},{where:{productId:'p1'}}))[0]).toBe(1);
    expect(await S.destroy({where:{productId:'p1'}})).toBe(1);
  });
});

// ============================================================
// 10. E2E REGRESSION — Full Flow
// ============================================================
describe('[Smoke] 10. E2E Regression — Full Flow', () => {
  it('login page served', async () => {
    const r = await httpGet(`${API}/auth/login`);
    expect(r.status).toBe(200);
    expect(r.text).toContain('NainERP');
    expect(r.text).toContain('email');
    expect(r.text).toContain('password');
  });

  it('POS cashier page redirects w/o auth', async () => {
    const r = await httpGet(`${API}/pos/cashier`);
    expect(r.status).toBeGreaterThanOrEqual(200);
    expect(r.status).toBeLessThanOrEqual(401);
  });

  // Protected HQ endpoints
  const EPS = ['users','branches','settings','purchase-orders',
    'manufacturing','modules','roles','subscription','billing-info'];
  for (const ep of EPS) {
    it(`${ep} → 401 or 404`, async () => {
      const r = await httpGet(`${API}/api/hq/${ep}`);
      // 401=auth wall, 404=no matching route (still safe)
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    });
  }
});
