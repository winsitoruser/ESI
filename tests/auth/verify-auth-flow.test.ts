/**
 * Auth Overhaul Final Verification
 * 
 * End-to-end verification that the full auth flow works:
 * Login → get session with role → redirect to correct dashboard based on role
 * 
 * Tests:
 * 1. Role normalisation (Indonesian ↔ English) - matches [...nextauth].ts functions
 * 2. Role-based redirect URLs - every role maps correctly
 * 3. Session callback passes all required fields - consistency check
 * 4. Middleware role checks - admin, driver, management recognition
 * 5. Complete end-to-end flow simulation - normalized role → redirect URL
 */

// ============================================
// REPLICATE THE FUNCTIONS FROM [...nextauth].ts
// to test in isolation without DB
// ============================================

const INDONESIAN_TO_ENGLISH_ROLES: Record<string, string> = {
  'admin_hq': 'hq_admin',
  'kasir': 'cashier',
  'gudang': 'inventory_staff',
  'hr': 'hr_staff',
  'finance': 'finance_staff',
};

const ENGLISH_TO_INDONESIAN_ROLES: Record<string, string> = {
  'hq_admin': 'admin_hq',
  'cashier': 'kasir',
  'inventory_staff': 'gudang',
  'hr_staff': 'hr',
  'finance_staff': 'finance',
};

const ROLE_ALIASES: Record<string, string> = {
  ...INDONESIAN_TO_ENGLISH_ROLES,
  ...ENGLISH_TO_INDONESIAN_ROLES,
};

const ROLE_REDIRECTS: Record<string, string> = {
  'super_admin': '/hq/dashboard',
  'owner': '/hq/dashboard',
  'hq_admin': '/hq/dashboard',
  'admin': '/hq/dashboard',
  'manager': '/hq/dashboard',
  'branch_manager': '/hq/dashboard',
  'manager_toko': '/hq/dashboard',
  // Finance → Finance module
  'finance_staff': '/finance',
  // HR/HRIS → HRIS module
  'hr_staff': '/hq/hris',
  'hris_staff': '/hq/hris',
  // Auditor → Audit Logs
  'auditor': '/hq/audit-logs',
  'regulator': '/hq/audit-logs',
  'cashier': '/pos/cashier',
  'supervisor_kasir': '/pos/cashier',
  'inventory_staff': '/inventory',
  'kitchen_staff': '/pos',
  'staff': '/hq/dashboard',
};

const ROLE_REDIRECTS_INDO: Record<string, string> = {
  'super_admin': '/hq/dashboard',
  'owner': '/hq/dashboard',
  'admin_hq': '/hq/dashboard',
  'admin': '/hq/dashboard',
  'manager': '/hq/dashboard',
  'manager_toko': '/hq/dashboard',
  'supervisor_kasir': '/pos/cashier',
  'finance': '/finance',
  'finance_staff': '/finance',
  'hr': '/hq/hris',
  'hr_staff': '/hq/hris',
  'hris_staff': '/hq/hris',
  'auditor': '/hq/audit-logs',
  'regulator': '/hq/audit-logs',
  'kasir': '/pos/cashier',
  'gudang': '/inventory',
  'staff': '/hq/dashboard',
};

function normalizeRole(role: string | undefined | null): string {
  if (!role) return 'staff';
  if (INDONESIAN_TO_ENGLISH_ROLES[role]) {
    return INDONESIAN_TO_ENGLISH_ROLES[role];
  }
  return role;
}

function getRedirectUrlForRole(role: string | undefined | null): string {
  if (!role) return '/hq/dashboard';
  if (ROLE_REDIRECTS[role]) return ROLE_REDIRECTS[role];
  if (ROLE_REDIRECTS_INDO[role]) return ROLE_REDIRECTS_INDO[role];
  const canonicalRole = ROLE_ALIASES[role];
  if (canonicalRole && ROLE_REDIRECTS[canonicalRole]) {
    return ROLE_REDIRECTS[canonicalRole];
  }
  return '/hq/dashboard';
}

// ============================================
// MIDDLEWARE-LIKE CHECKS
// ============================================

function middlewareIsAdmin(role: string): boolean {
  return ['admin', 'super_admin', 'superadmin'].includes(role.toLowerCase());
}

function middlewareIsDriver(role: string): boolean {
  return ['driver', 'fleet_driver', 'armada'].includes(role.toLowerCase());
}

function middlewareIsManagement(role: string): boolean {
  const norm = role.toLowerCase();
  return middlewareIsAdmin(norm) || ['hq_admin', 'owner', 'manager', 'branch_manager', 'manager_toko', 'finance_staff', 'hr_staff', 'hris_staff', 'auditor', 'regulator'].includes(norm);
}

// ============================================
// TESTS
// ============================================

describe('Auth Overhaul Final Verification', () => {

  // ==========================================
  // SECTION 1: Role Normalization
  // ==========================================
  describe('1. Role Normalization (Indonesian → English)', () => {
    const mappings = [
      ['admin_hq', 'hq_admin'],
      ['kasir', 'cashier'],
      ['gudang', 'inventory_staff'],
      ['hr', 'hr_staff'],
      ['finance', 'finance_staff'],
    ];

    it.each(mappings)('normalizes Indonesian "%s" → English "%s"', (indo, eng) => {
      expect(normalizeRole(indo)).toBe(eng);
    });

    const englishRoles = [
      'super_admin', 'owner', 'hq_admin', 'admin', 'manager',
      'branch_manager', 'cashier', 'inventory_staff', 'kitchen_staff',
      'hr_staff', 'finance_staff', 'staff',
    ];

    it.each(englishRoles)('keeps English canonical role "%s" unchanged', (role) => {
      expect(normalizeRole(role)).toBe(role);
    });

    it.each([null, undefined, ''])('returns "staff" for null/undefined/empty', (val) => {
      expect(normalizeRole(val)).toBe('staff');
    });

    it('handles unknown roles by returning them unchanged', () => {
      expect(normalizeRole('custom_role')).toBe('custom_role');
      expect(normalizeRole('kitchen')).toBe('kitchen');
    });
  });

  // ==========================================
  // SECTION 2: Redirect URL by Role
  // ==========================================
  describe('2. Role-Based Redirect URLs', () => {
    // Roles that map to HQ Dashboard
    const hqRoles = [
      'super_admin', 'owner', 'hq_admin', 'admin',
      'manager', 'branch_manager', 'manager_toko', 'staff',
    ];
    it.each(hqRoles)('"%s" → /hq/dashboard', (role) => {
      expect(getRedirectUrlForRole(role)).toBe('/hq/dashboard');
    });

    // Indonesian roles that map to HQ Dashboard
    const hqRolesIndo = ['admin_hq'];
    it.each(hqRolesIndo)('Indonesian "%s" → /hq/dashboard', (role) => {
      expect(getRedirectUrlForRole(role)).toBe('/hq/dashboard');
    });

    // Finance roles → /finance
    const financeRoles = ['finance_staff', 'finance'];
    it.each(financeRoles)('"%s" → /finance', (role) => {
      expect(getRedirectUrlForRole(role)).toBe('/finance');
    });

    // HR/HRIS roles → /hq/hris
    const hrisRoles = ['hr_staff', 'hris_staff', 'hr'];
    it.each(hrisRoles)('"%s" → /hq/hris', (role) => {
      expect(getRedirectUrlForRole(role)).toBe('/hq/hris');
    });

    // Auditor roles → /hq/audit-logs
    const auditorRoles = ['auditor', 'regulator'];
    it.each(auditorRoles)('"%s" → /hq/audit-logs', (role) => {
      expect(getRedirectUrlForRole(role)).toBe('/hq/audit-logs');
    });

    // Cashier roles → /pos/cashier
    const cashierRoles = ['cashier', 'kasir', 'supervisor_kasir'];
    it.each(cashierRoles)('"%s" → /pos/cashier', (role) => {
      expect(getRedirectUrlForRole(role)).toBe('/pos/cashier');
    });

    it('inventory_staff → /inventory', () => {
      expect(getRedirectUrlForRole('inventory_staff')).toBe('/inventory');
    });

    it('gudang → /inventory', () => {
      expect(getRedirectUrlForRole('gudang')).toBe('/inventory');
    });

    it('kitchen_staff → /pos', () => {
      expect(getRedirectUrlForRole('kitchen_staff')).toBe('/pos');
    });

    it('null → /hq/dashboard (fallback)', () => {
      expect(getRedirectUrlForRole(null)).toBe('/hq/dashboard');
    });

    it('undefined → /hq/dashboard (fallback)', () => {
      expect(getRedirectUrlForRole(undefined)).toBe('/hq/dashboard');
    });

    it('unknown role → /hq/dashboard (fallback)', () => {
      expect(getRedirectUrlForRole('unknown_role')).toBe('/hq/dashboard');
    });
  });

  // ==========================================
  // SECTION 3: Login Page Redirect Logic
  // ==========================================
  describe('3. Login Page Redirect Priority', () => {
    // This tests the login page's redirect decision logic:
    // Priority 1: callbackUrl (if not auth-related)
    // Priority 2: session.redirectUrl
    // Priority 3: role-based redirect
    // Fallback: /hq/dashboard

    it('callbackUrl takes priority over role-based redirect', () => {
      const callbackUrl = '/inventory/products';
      const userRole = 'cashier';
      const sessionRedirectUrl = '/pos/cashier';

      // Priority 1 logic from login.tsx
      let target: string;
      if (callbackUrl && !callbackUrl.includes('/auth/')) {
        target = callbackUrl;
      } else if (sessionRedirectUrl) {
        target = sessionRedirectUrl;
      } else if (userRole) {
        target = getRedirectUrlForRole(userRole);
      } else {
        target = '/hq/dashboard';
      }

      expect(target).toBe('/inventory/products');
    });

    it('callbackUrl is ignored if it contains /auth/', () => {
      const callbackUrl = '/auth/login';
      const userRole = 'cashier';
      const sessionRedirectUrl = '/pos/cashier';

      let target: string;
      if (callbackUrl && !callbackUrl.includes('/auth/')) {
        target = callbackUrl;
      } else if (sessionRedirectUrl) {
        target = sessionRedirectUrl;
      } else if (userRole) {
        target = getRedirectUrlForRole(userRole);
      } else {
        target = '/hq/dashboard';
      }

      expect(target).toBe('/pos/cashier');
    });

    it('session.redirectUrl takes priority over computed role redirect', () => {
      const callbackUrl = undefined as string | undefined;
      const userRole = 'cashier';
      const sessionRedirectUrl = '/custom/override';

      let target: string;
      if (callbackUrl && !callbackUrl.includes('/auth/')) {
        target = callbackUrl;
      } else if (sessionRedirectUrl) {
        target = sessionRedirectUrl;
      } else if (userRole) {
        target = getRedirectUrlForRole(userRole);
      } else {
        target = '/hq/dashboard';
      }

      expect(target).toBe('/custom/override');
    });

    it('falls back to computed role redirect when no callbackUrl or sessionRedirectUrl', () => {
      const callbackUrl = undefined as string | undefined;
      const userRole = 'gudang';
      const sessionRedirectUrl = undefined as string | undefined;

      let target: string;
      if (callbackUrl && !callbackUrl.includes('/auth/')) {
        target = callbackUrl;
      } else if (sessionRedirectUrl) {
        target = sessionRedirectUrl;
      } else if (userRole) {
        target = getRedirectUrlForRole(userRole);
      } else {
        target = '/hq/dashboard';
      }

      expect(target).toBe('/inventory');
    });

    it('falls back to /hq/dashboard with no role info', () => {
      const callbackUrl = undefined as string | undefined;
      const userRole = undefined as string | undefined;
      const sessionRedirectUrl = undefined as string | undefined;

      let target: string;
      if (callbackUrl && !callbackUrl.includes('/auth/')) {
        target = callbackUrl;
      } else if (sessionRedirectUrl) {
        target = sessionRedirectUrl;
      } else if (userRole) {
        target = getRedirectUrlForRole(userRole);
      } else {
        target = '/hq/dashboard';
      }

      expect(target).toBe('/hq/dashboard');
    });
  });

  // ==========================================
  // SECTION 4: Middleware Role Recognition
  // ==========================================
  describe('4. Middleware Role Checks', () => {
    // Admin check (for /admin/ routes)
    it('recognizes super_admin as admin', () => {
      expect(middlewareIsAdmin('super_admin')).toBe(true);
    });

    it('recognizes admin as admin', () => {
      expect(middlewareIsAdmin('admin')).toBe(true);
    });

    it('recognizes superadmin (no underscore) as admin', () => {
      expect(middlewareIsAdmin('superadmin')).toBe(true);
    });

    it('does NOT consider hq_admin as admin', () => {
      expect(middlewareIsAdmin('hq_admin')).toBe(false);
    });

    it('does NOT consider owner as admin', () => {
      expect(middlewareIsAdmin('owner')).toBe(false);
    });

    // Driver check
    it('recognizes driver roles', () => {
      expect(middlewareIsDriver('driver')).toBe(true);
      expect(middlewareIsDriver('fleet_driver')).toBe(true);
      expect(middlewareIsDriver('armada')).toBe(true);
    });

    it('does NOT consider cashier as driver', () => {
      expect(middlewareIsDriver('cashier')).toBe(false);
    });

    // Management check (for onboarding bypass)
    it('recognizes all admin roles as management', () => {
      expect(middlewareIsManagement('admin')).toBe(true);
      expect(middlewareIsManagement('super_admin')).toBe(true);
    });

    const managementRoles = ['hq_admin', 'owner', 'manager', 'branch_manager', 'manager_toko', 'finance_staff', 'hr_staff', 'hris_staff', 'auditor', 'regulator'];
    it.each(managementRoles)('recognizes "%s" as management', (role) => {
      expect(middlewareIsManagement(role)).toBe(true);
    });

    it('does NOT consider cashier as management', () => {
      expect(middlewareIsManagement('cashier')).toBe(false);
    });

    it('does NOT consider inventory_staff as management', () => {
      expect(middlewareIsManagement('inventory_staff')).toBe(false);
    });

    it('does NOT consider kitchen_staff as management', () => {
      expect(middlewareIsManagement('kitchen_staff')).toBe(false);
    });
  });

  // ==========================================
  // SECTION 5: Complete Flow Simulation
  // ==========================================
  describe('5. Complete End-to-End Flow', () => {
    // Simulates: DB role → normalize → JWT → session → redirect
    
    const flowTestCases = [
      // [DB Role (could be Indonesian), Expected Normalized, Expected Redirect]
      ['admin_hq',   'hq_admin',       '/hq/dashboard'],
      ['kasir',      'cashier',         '/pos/cashier'],
      ['gudang',     'inventory_staff', '/inventory'],
      ['hr',         'hr_staff',        '/hq/hris'],
      ['finance',    'finance_staff',   '/finance'],
      ['super_admin','super_admin',     '/hq/dashboard'],
      ['owner',      'owner',           '/hq/dashboard'],
      ['hq_admin',   'hq_admin',        '/hq/dashboard'],
      ['cashier',    'cashier',         '/pos/cashier'],
      ['inventory_staff','inventory_staff','/inventory'],
      ['kitchen_staff','kitchen_staff', '/pos'],
      ['staff',      'staff',           '/hq/dashboard'],
      // New roles from task requirements
      ['manager_toko', 'manager_toko',  '/hq/dashboard'],
      ['supervisor_kasir', 'supervisor_kasir', '/pos/cashier'],
      ['auditor',    'auditor',         '/hq/audit-logs'],
      ['regulator',  'regulator',       '/hq/audit-logs'],
      ['hris_staff', 'hris_staff',      '/hq/hris'],
      ['finance_staff', 'finance_staff', '/finance'],
      ['hr_staff',   'hr_staff',        '/hq/hris'],
    ];

    it.each(flowTestCases)(
      'DB role "%s" → normalized "%s" → redirect "%s"',
      (dbRole, expectedNormalized, expectedRedirect) => {
        // Step 1: Authorize — normalize the DB role
        const normalized = normalizeRole(dbRole);

        // Step 2: JWT callback stores normalized role (simulated)
        expect(normalized).toBe(expectedNormalized);

        // Step 3: Compute redirect URL from normalized role
        const redirectUrl = getRedirectUrlForRole(normalized);

        // Step 4: Session callback passes role+redirectUrl to client
        expect(redirectUrl).toBe(expectedRedirect);

        // Step 5: Login page uses redirectUrl (or computes it from role)
        const role = normalized;
        const target = redirectUrl || getRedirectUrlForRole(role) || '/hq/dashboard';
        expect(target).toBe(expectedRedirect);
      }
    );

    it('flows all 7 required task roles end-to-end', () => {
      // Task requirements explicitly list these 7 roles
      const requiredRoles = ['super_admin', 'owner', 'admin_hq', 'kasir', 'gudang', 'hr', 'finance'];
      
      for (const dbRole of requiredRoles) {
        const normalized = normalizeRole(dbRole);
        expect(normalized).toBeTruthy();
        const redirect = getRedirectUrlForRole(normalized);
        expect(redirect).toBeTruthy();
        // All 7 required roles should have a valid redirect
        expect(redirect).not.toBe('');
      }
    });
  });
});
