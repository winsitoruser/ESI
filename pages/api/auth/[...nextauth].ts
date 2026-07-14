import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../models');

// ============================================
// ROLE MAPPING: Indonesian ↔ English
// ============================================

// Indonesian → English (DB canonical names)
// These are the Indonesian role names that map to English DB column values
export const INDONESIAN_TO_ENGLISH_ROLES: Record<string, string> = {
  'admin_hq': 'hq_admin',
  'kasir': 'cashier',
  'gudang': 'inventory_staff',
  'hr': 'hr_staff',
  'finance': 'finance_staff',
};

// English → Indonesian (for display/reference, not normalization)
export const ENGLISH_TO_INDONESIAN_ROLES: Record<string, string> = {
  'hq_admin': 'admin_hq',
  'cashier': 'kasir',
  'inventory_staff': 'gudang',
  'hr_staff': 'hr',
  'finance_staff': 'finance',
};

// Combined for lookup
export const ROLE_ALIASES: Record<string, string> = {
  ...INDONESIAN_TO_ENGLISH_ROLES,
  ...ENGLISH_TO_INDONESIAN_ROLES,
};

// ============================================
// ROLE-BASED REDIRECT URLs
// ============================================
export const ROLE_REDIRECTS: Record<string, string> = {
  // Admin/Management roles → HQ Dashboard
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
  'hr_staff': '/humanify',
  'hris_staff': '/humanify',
  // Auditor → Audit Logs
  'auditor': '/hq/audit-logs',
  // Regulator → Public Audit Portal (fallback to audit-logs)
  'regulator': '/hq/audit-logs',
  // Cashier → POS
  'cashier': '/pos/cashier',
  // Supervisor Kasir → POS
  'supervisor_kasir': '/pos/cashier',
  // Inventory/Gudang → Inventory
  'inventory_staff': '/inventory',
  // Kitchen → POS (for kitchen display)
  'kitchen_staff': '/pos',
  // Staff fallback
  'staff': '/hq/dashboard',
};

// Indonesian role redirects (same as above, aliased)
export const ROLE_REDIRECTS_INDO: Record<string, string> = {
  'super_admin': '/hq/dashboard',
  'owner': '/hq/dashboard',
  'admin_hq': '/hq/dashboard',
  'admin': '/hq/dashboard',
  'manager': '/hq/dashboard',
  'manager_toko': '/hq/dashboard',
  'supervisor_kasir': '/pos/cashier',
  // Finance → Finance module
  'finance': '/finance',
  'finance_staff': '/finance',
  // HR/HRIS → HRIS module
  'hr': '/humanify',
  'hr_staff': '/humanify',
  'hris_staff': '/humanify',
  // Auditor
  'auditor': '/hq/audit-logs',
  'regulator': '/hq/audit-logs',
  'kasir': '/pos/cashier',
  'gudang': '/inventory',
  'staff': '/hq/dashboard',
};

/**
 * Get redirect URL based on role
 * Supports both Indonesian and English role names
 */
export function getRedirectUrlForRole(role: string | undefined | null): string {
  if (!role) return '/hq/dashboard';
  
  // Check English role first
  if (ROLE_REDIRECTS[role]) {
    return ROLE_REDIRECTS[role];
  }
  
  // Check Indonesian role (with aliasing)
  if (ROLE_REDIRECTS_INDO[role]) {
    return ROLE_REDIRECTS_INDO[role];
  }
  
  // Check via alias mapping
  const canonicalRole = ROLE_ALIASES[role];
  if (canonicalRole && ROLE_REDIRECTS[canonicalRole]) {
    return ROLE_REDIRECTS[canonicalRole];
  }
  
  // Default fallback
  return '/hq/dashboard';
}

/**
 * Normalize role name to canonical (English) form
 * Converts Indonesian role names to English DB values
 */
export function normalizeRole(role: string | undefined | null): string {
  if (!role) return 'staff';
  // Check if it's an Indonesian alias that needs mapping to English
  if (INDONESIAN_TO_ENGLISH_ROLES[role]) {
    return INDONESIAN_TO_ENGLISH_ROLES[role];
  }
  return role;
}

// ============================================
// SESSION REFRESH CONFIGURATION
// ============================================
// Access token expires after 1 hour
const ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour in seconds
// Refresh token if within last 15 minutes of access token expiry
const REFRESH_THRESHOLD = 15 * 60; // 15 minutes in seconds

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password harus diisi');
        }

        try {
          const db = getDb();
          // Find user by email - without includes to avoid schema mismatch
          const user = await db.User.findOne({
            where: { email: credentials.email }
          });

          if (!user) {
            throw new Error('Email atau password salah');
          }

          // Check if user is active
          if (!user.isActive) {
            throw new Error('Akun Anda tidak aktif. Hubungi administrator.');
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!isPasswordValid) {
            throw new Error('Email atau password salah');
          }

          // Update last login
          await user.update({ lastLogin: new Date() });

          // Normalize role to canonical form
          const normalizedRole = normalizeRole(user.role);

          let setupCompleted = true;
          if (user.tenantId && !['super_admin', 'superadmin', 'platform_admin'].includes(normalizedRole)) {
            try {
              const { isSaasOnboardingComplete } = await import('../../../lib/saas/humanify-onboarding');
              setupCompleted = await isSaasOnboardingComplete(user.tenantId);
            } catch {
              setupCompleted = true;
            }
          }

          let redirectUrl = getRedirectUrlForRole(normalizedRole);
          if (normalizedRole === 'owner') {
            redirectUrl = setupCompleted ? '/humanify' : '/humanify/setup';
          } else if (['hr_staff', 'hris_staff'].includes(normalizedRole)) {
            redirectUrl = '/humanify';
          }

          // Return user object (without password)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: normalizedRole,
            originalRole: user.role, // Keep original for debugging
            businessName: user.businessName,
            tenantId: user.tenantId || null,
            branchId: null,
            branchName: null,
            branchCode: null,
            tenantName: null,
            assignedBranchId: user.assignedBranchId || null,
            kybStatus: null,
            dataScope: user.dataScope || 'own_branch',
            businessCode: null,
            businessStructure: null,
            setupCompleted,
            redirectUrl,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/login',
    signOut: '/',
    error: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days (refresh token lifetime)
  },
  jwt: {
    // JWT is automatically signed by NextAuth
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      const now = Math.floor(Date.now() / 1000);
      
      // Initial login: user is present
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.originalRole = user.originalRole;
        token.businessName = user.businessName;
        token.tenantId = user.tenantId;
        token.branchId = user.branchId;
        token.branchName = user.branchName;
        token.branchCode = user.branchCode;
        token.tenantName = user.tenantName;
        token.assignedBranchId = user.assignedBranchId;
        token.kybStatus = user.kybStatus;
        token.dataScope = user.dataScope;
        token.businessCode = user.businessCode;
        token.businessStructure = user.businessStructure;
        token.setupCompleted = user.setupCompleted;
        token.redirectUrl = user.redirectUrl;
        
        // Set token timestamps for sliding session
        token.iat = now; // Issued at
        token.exp = now + ACCESS_TOKEN_EXPIRY; // Access token expiry
      }

      // Manual session update (triggered by client)
      if (trigger === 'update' && session) {
        // Merge session updates into token
        token = { ...token, ...session };
        
        // Refresh from DB if tenantId exists
        if (token.tenantId) {
          try {
            const { isSaasOnboardingComplete } = await import('../../../lib/saas/humanify-onboarding');
            token.setupCompleted = await isSaasOnboardingComplete(token.tenantId as string);
          } catch {
            /* keep token */
          }
          try {
            const db = require('../../../models');
            const tenant = await db.Tenant.findByPk(token.tenantId, {
              attributes: ['kybStatus', 'setupCompleted', 'businessCode', 'businessStructure'],
            });
            if (tenant) {
              token.kybStatus = tenant.kybStatus;
              if (tenant.setupCompleted === true) token.setupCompleted = true;
              token.businessCode = tenant.businessCode;
              token.businessStructure = tenant.businessStructure;
            }
          } catch (e: any) {
            console.error('[JWT update] Tenant refresh error:', e.message);
          }
        }
        
        // Extend access token on manual update
        token.exp = now + ACCESS_TOKEN_EXPIRY;
      }

      // ============================================
      // SLIDING SESSION / AUTO-REFRESH MECHANISM
      // ============================================
      // If token is within refresh threshold, extend the access token
      // This keeps the session alive as long as the user is active
      if (token.exp && (token.exp - now) < REFRESH_THRESHOLD) {
        console.log(`[JWT] Refreshing session for user ${token.id} (expires in ${token.exp - now}s)`);
        
        // Extend access token expiry
        token.exp = now + ACCESS_TOKEN_EXPIRY;
        token.iat = now;
        
        // Also refresh tenant data from DB on auto-refresh
        if (token.tenantId) {
          try {
            const { isSaasOnboardingComplete } = await import('../../../lib/saas/humanify-onboarding');
            token.setupCompleted = await isSaasOnboardingComplete(token.tenantId as string);
          } catch {
            /* keep token */
          }
          try {
            const db = require('../../../models');
            const tenant = await db.Tenant.findByPk(token.tenantId, {
              attributes: ['kybStatus', 'setupCompleted', 'businessCode', 'businessStructure'],
            });
            if (tenant) {
              token.kybStatus = tenant.kybStatus;
              if (tenant.setupCompleted === true) token.setupCompleted = true;
              token.businessCode = tenant.businessCode;
              token.businessStructure = tenant.businessStructure;
            }
          } catch (e: any) {
            console.error('[JWT auto-refresh] Tenant refresh error:', e.message);
          }
        }
      }

      // Wizard may complete while JWT still has setupCompleted=false — refresh once so middleware doesn't loop /humanify ↔ /setup
      if (token.tenantId && token.setupCompleted === false) {
        try {
          const { isSaasOnboardingComplete } = await import('../../../lib/saas/humanify-onboarding');
          const done = await isSaasOnboardingComplete(token.tenantId as string);
          if (done) {
            token.setupCompleted = true;
            const role = String(token.role || '').toLowerCase();
            if (role === 'owner') token.redirectUrl = '/humanify';
          }
        } catch {
          /* keep token */
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.originalRole = token.originalRole as string;
        session.user.businessName = token.businessName as string;
        session.user.tenantId = token.tenantId as string;
        session.user.branchId = token.branchId as string;
        session.user.branchName = token.branchName as string;
        session.user.branchCode = token.branchCode as string;
        session.user.tenantName = token.tenantName as string;
        session.user.assignedBranchId = token.assignedBranchId as string;
        session.user.kybStatus = token.kybStatus as string;
        session.user.dataScope = token.dataScope as string;
        session.user.businessCode = token.businessCode as string;
        session.user.businessStructure = token.businessStructure as string;
        session.user.setupCompleted = token.setupCompleted as boolean;
        session.user.redirectUrl = token.redirectUrl as string;
      }
      
      // Add token expiry info to session for client-side awareness
      (session as any).expiresAt = token.exp;
      (session as any).redirectUrl = token.redirectUrl;
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allow all internal URLs (same origin)
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return baseUrl;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
