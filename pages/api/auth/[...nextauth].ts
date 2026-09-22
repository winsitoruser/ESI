import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import {
  evaluateLogin,
  normalizeIp,
  recordLoginFailure,
  recordLoginSuccess,
} from '../../../lib/saas/login-guard';
import { isMfaEnabled, verifyMfaCode } from '../../../lib/saas/mfa';

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
      id: 'sso',
      name: 'SSO',
      credentials: {
        token: { label: 'SSO Token', type: 'text' },
      },
      async authorize(credentials) {
        const raw = String((credentials as any)?.token || '');
        if (!raw) throw new Error('Token SSO wajib');
        const { consumeSsoHandoff } = await import('../../../lib/saas/sso-handoff');
        const handoff = await consumeSsoHandoff(raw);
        if (!handoff) throw new Error('Token SSO tidak valid atau kedaluwarsa');

        const db = getDb();
        const user = await db.User.findOne({ where: { id: handoff.userId } });
        if (!user || !user.isActive) throw new Error('Akun tidak aktif');
        if (user.tenantId && String(user.tenantId) !== String(handoff.tenantId)) {
          throw new Error('Token SSO tidak cocok dengan tenant');
        }

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
        } else if (['hr_staff', 'hris_staff', 'staff', 'manager', 'hq_admin', 'admin'].includes(normalizedRole)) {
          redirectUrl = '/humanify';
        }

        try { await user.update({ lastLogin: new Date() }); } catch { /* */ }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: normalizedRole,
          originalRole: user.role,
          businessName: user.businessName,
          tenantId: user.tenantId || handoff.tenantId || null,
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
          authVia: 'sso',
        };
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Kode 2FA", type: "text" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password harus diisi');
        }

        // Phase 17 — brute-force / credential-stuffing guard (fail-open)
        const ip = normalizeIp((req as any)?.headers?.['x-forwarded-for'] || (req as any)?.headers?.['x-real-ip']);
        const emailKey = String(credentials.email).toLowerCase();
        const verdict = await evaluateLogin(emailKey, ip);
        if (!verdict.allowed) {
          const mins = Math.max(1, Math.ceil(verdict.retryAfterSec / 60));
          throw new Error(`Terlalu banyak percobaan login. Coba lagi dalam ${mins} menit.`);
        }

        try {
          const db = getDb();
          // Find user by email - without includes to avoid schema mismatch
          const user = await db.User.findOne({
            where: { email: credentials.email }
          });

          if (!user) {
            await recordLoginFailure(emailKey, ip);
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
            await recordLoginFailure(emailKey, ip);
            throw new Error('Email atau password salah');
          }

          // Phase 19 — MFA/2FA enforcement (opt-in; fail-open on infra errors)
          // H3 — tenant policy: if requireMfa && user belum enroll → allow login
          // but flag mfaSetupRequired so middleware forces /humanify/security.
          let mfaSetupRequired = false;
          try {
            const { isTenantMfaRequired } = await import('../../../lib/saas/mfa-policy');
            const tenantRequires = user.tenantId
              ? await isTenantMfaRequired(user.tenantId)
              : false;
            const userMfaOn = await isMfaEnabled(user.id);
            if (userMfaOn) {
              const totp = String((credentials as any).totp || '').trim();
              if (!totp) {
                throw new Error('MFA_REQUIRED');
              }
              const totpOk = await verifyMfaCode(user.id, totp);
              if (!totpOk) {
                throw new Error('Kode 2FA salah atau kedaluwarsa');
              }
            } else if (tenantRequires) {
              mfaSetupRequired = true;
            }
            // SEC-IAM-001 — platform privileged accounts must enroll MFA
            const platformMfaRequired =
              String(process.env.HUMANIFY_PLATFORM_MFA_REQUIRED || 'true').toLowerCase() !== 'false';
            const isPlatformRole = ['super_admin', 'superadmin', 'platform_admin'].includes(
              normalizeRole(user.role),
            );
            if (platformMfaRequired && isPlatformRole && !userMfaOn) {
              mfaSetupRequired = true;
            }
          } catch (mfaErr: any) {
            if (mfaErr?.message === 'MFA_REQUIRED' || /Kode 2FA/.test(String(mfaErr?.message))) {
              throw mfaErr;
            }
            const { mustFailClosed } = await import('../../../lib/saas/fail-closed');
            if (mustFailClosed()) {
              throw new Error('Kebijakan MFA sedang tidak tersedia. Coba lagi sebentar.');
            }
          }

          // Successful credential check — clear brute-force counter
          await recordLoginSuccess(emailKey, ip);

          // SEC-IAM-018 — risk-based signals (new IP/UA / automation)
          try {
            const {
              assessLoginRisk,
              clientUaFromReq,
              loadLoginFingerprint,
              rememberLoginFingerprint,
            } = await import('../../../lib/saas/risk-based-auth');
            const fp = await loadLoginFingerprint(String(user.id));
            const ua = clientUaFromReq(req as any);
            const risk = assessLoginRisk({
              role: user.role,
              currentIp: ip,
              previousIp: fp.ip,
              currentUa: ua,
              previousUa: fp.ua,
            });
            if (risk.requireMfaChallenge) {
              const userMfaOnNow = await isMfaEnabled(user.id);
              if (!userMfaOnNow) {
                mfaSetupRequired = true;
              } else {
                const totp = String((credentials as any).totp || '').trim();
                if (!totp) throw new Error('MFA_REQUIRED');
              }
            }
            await rememberLoginFingerprint({ userId: String(user.id), ip, ua });
            try {
              const { notifyLoginIfRisky } = await import('../../../lib/saas/login-notify');
              await notifyLoginIfRisky({
                email: String(user.email || ''),
                userId: String(user.id),
                tenantId: user.tenantId || null,
                ip,
                ua,
                signals: risk.signals,
                score: risk.score,
              });
            } catch { /* fail-open */ }
          } catch (riskErr: any) {
            if (riskErr?.message === 'MFA_REQUIRED') throw riskErr;
            /* fail-open */
          }

          // Update last login
          await user.update({ lastLogin: new Date() });

          // Normalize role to canonical form
          const normalizedRole = normalizeRole(user.role);

          let tenantId = user.tenantId || null;
          let tenantName: string | null = null;
          try {
            const { resolveLoginCompany } = await import(
              '../../../lib/saas/company-membership'
            );
            const resolved = await resolveLoginCompany(user.id, user.tenantId, normalizedRole);
            if (resolved?.tenantId) {
              tenantId = resolved.tenantId;
              tenantName = resolved.name || null;
            }
          } catch {
            /* keep users.tenant_id */
          }
          if (
            !tenantId &&
            ['super_admin', 'superadmin', 'platform_admin'].includes(normalizedRole)
          ) {
            try {
              const { lookupDefaultTenantId } = await import(
                '../../../lib/hris/resolve-employee-tenant'
              );
              const sequelize = require('../../../lib/sequelize');
              tenantId = await lookupDefaultTenantId(sequelize);
            } catch {
              /* stay unbound */
            }
          }

          let setupCompleted = true;
          if (tenantId && !['super_admin', 'superadmin', 'platform_admin'].includes(normalizedRole)) {
            try {
              const { isSaasOnboardingComplete } = await import('../../../lib/saas/humanify-onboarding');
              setupCompleted = await isSaasOnboardingComplete(tenantId);
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
          if (mfaSetupRequired) {
            redirectUrl = '/humanify/security';
          }

          // Return user object (without password)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: normalizedRole,
            originalRole: user.role, // Keep original for debugging
            businessName: user.businessName,
            tenantId,
            branchId: null,
            branchName: null,
            branchCode: null,
            tenantName,
            assignedBranchId: user.assignedBranchId || null,
            kybStatus: null,
            dataScope: user.dataScope || 'own_branch',
            businessCode: null,
            businessStructure: null,
            setupCompleted,
            redirectUrl,
            mfaSetupRequired,
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

      const attachPlatformDefaultTenant = async () => {
        if (token.tenantId || token.impersonating) return;
        const roleNow = String(token.role || token.originalRole || '').toLowerCase();
        if (!['super_admin', 'superadmin', 'platform_admin'].includes(roleNow)) return;
        if (token.platformDefaultTenantLookedUp) return;
        token.platformDefaultTenantLookedUp = true;
        try {
          const { lookupDefaultTenantId } = await import(
            '../../../lib/hris/resolve-employee-tenant'
          );
          const sequelize = require('../../../lib/sequelize');
          const tid = await lookupDefaultTenantId(sequelize);
          if (tid) token.tenantId = tid;
        } catch {
          /* stay unbound */
        }
      };
      
      // Initial login: user is present — new JWT claims (session fixation: pre-login cookie is replaced)
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
        token.mfaSetupRequired = Boolean((user as any).mfaSetupRequired);
        token.pwdAt = Date.now();
        // Plan for middleware entitlement gate
        if (user.tenantId) {
          try {
            const { resolveTenantPlan, resolveTenantBillingAddons } = await import('../../../lib/saas/assert-feature');
            token.subscriptionPlan = await resolveTenantPlan(user.tenantId);
            const billing = await resolveTenantBillingAddons(user.tenantId);
            token.addonLms = billing.lms;
            token.addonAi = billing.ai;
            token.addonAts = billing.ats;
            token.addonTalentBank = billing.talentBank;
            token.billedSeats = billing.billedSeats;
            token.planCheckedAt = now;
          } catch {
            token.subscriptionPlan = null;
          }
        }
        
        // Set token timestamps for sliding session
        token.iat = now; // Issued at
        token.exp = now + ACCESS_TOKEN_EXPIRY; // Access token expiry
      }

      await attachPlatformDefaultTenant();

      // SEC-IAM-006 — reject JWT issued before password reset
      if (token.id && !user) {
        try {
          const sequelize = require('../../../lib/sequelize');
          const [rows] = await sequelize.query(
            `SELECT password_changed_at FROM users WHERE id = :id LIMIT 1`,
            { replacements: { id: token.id } },
          );
          const changed = rows?.[0]?.password_changed_at;
          if (changed && token.pwdAt) {
            const changedMs = new Date(changed).getTime();
            if (Number.isFinite(changedMs) && changedMs > Number(token.pwdAt)) {
              return { error: 'PasswordChanged' };
            }
          }
        } catch { /* column may not exist yet */ }
      }

      // Refresh subscription plan periodically (5 min), after session.update(), or impersonation
      if (token.tenantId) {
        const checked = Number(token.planCheckedAt || 0);
        if (!token.subscriptionPlan || now - checked > 300 || trigger === 'update') {
          try {
            const { resolveTenantPlan, resolveTenantBillingAddons } = await import('../../../lib/saas/assert-feature');
            token.subscriptionPlan = await resolveTenantPlan(token.tenantId as string);
            const billing = await resolveTenantBillingAddons(token.tenantId as string);
            token.addonLms = billing.lms;
            token.addonAi = billing.ai;
            token.addonAts = billing.ats;
            token.addonTalentBank = billing.talentBank;
            token.billedSeats = billing.billedSeats;
            token.planCheckedAt = now;
          } catch { /* keep */ }
        }
      }

      // Manual session update (triggered by client)
      if (trigger === 'update' && session) {
        if (session.mfaSetupRequired === false) {
          token.mfaSetupRequired = false;
        }
        if (session.mfaSetupRequired === true) {
          token.mfaSetupRequired = true;
        }
        const roleNow = String(token.role || token.originalRole || '').toLowerCase();
        const canImpersonate =
          ['super_admin', 'superadmin', 'platform_admin'].includes(roleNow) ||
          Boolean(token.impersonating);

        // Secure support impersonation — only platform ops may switch tenantId this way
        if (session.impersonateTenantId && canImpersonate && !token.impersonating) {
          try {
            const { resolveTenantById } = await import('../../../lib/saas/tenant-slug');
            const t = await resolveTenantById(String(session.impersonateTenantId));
            if (t) {
              token.operatorTenantId = token.tenantId;
              token.operatorRole = token.role;
              token.operatorTenantName = token.tenantName;
              token.impersonating = true;
              token.tenantId = t.id;
              token.tenantName = t.name;
              token.impersonatedTenantSlug = t.slug;
              token.setupCompleted = true;
              token.planCheckedAt = 0;
              delete token.subscriptionPlan;
              delete token.addonLms;
              delete token.addonAi;
              delete token.addonAts;
              delete token.addonTalentBank;
              delete token.billedSeats;
              try {
                const { logSupportAction } = await import('../../../lib/saas/support-audit');
                await logSupportAction({
                  operatorUserId: String(token.id),
                  operatorEmail: (token.email as string) || null,
                  action: 'impersonate_start',
                  tenantId: t.id,
                  tenantSlug: t.slug,
                });
              } catch { /* */ }
            }
          } catch (e: any) {
            console.error('[JWT impersonate]', e.message);
          }
          token.exp = now + ACCESS_TOKEN_EXPIRY;
        } else if (session.switchCompanyId && !token.impersonating) {
          try {
            const { userCanAccessCompany, setActiveCompany } = await import(
              '../../../lib/saas/company-membership'
            );
            const { resolveTenantById } = await import('../../../lib/saas/tenant-slug');
            const { isSaasOnboardingComplete } = await import(
              '../../../lib/saas/humanify-onboarding'
            );
            const tid = String(session.switchCompanyId);
            const { isTenantUuid } = await import('../../../lib/saas/company-membership-policy');
            if (isTenantUuid(tid) && String(token.tenantId || '') === tid) {
              token.exp = now + ACCESS_TOKEN_EXPIRY;
            } else if (isTenantUuid(tid)) {
              const allowed = await userCanAccessCompany(String(token.id), tid);
              if (allowed) {
                const t = await resolveTenantById(tid);
                if (t) {
                  token.tenantId = t.id;
                  token.tenantName = t.name;
                  token.businessName = t.name;
                  token.planCheckedAt = 0;
              delete token.subscriptionPlan;
              delete token.addonLms;
              delete token.addonAi;
              delete token.addonAts;
              delete token.addonTalentBank;
              delete token.billedSeats;
                  token.setupCompleted = await isSaasOnboardingComplete(t.id);
                  const roleSw = String(token.role || '').toLowerCase();
                  if (roleSw === 'owner') {
                    token.redirectUrl = token.setupCompleted ? '/humanify' : '/humanify/setup';
                  }
                  await setActiveCompany(String(token.id), t.id);
                }
              }
            }
          } catch (e: any) {
            console.error('[JWT switchCompany]', e?.message || e);
          }
          token.exp = now + ACCESS_TOKEN_EXPIRY;
        } else if (session.endImpersonation && token.impersonating) {
          try {
            const { logSupportAction } = await import('../../../lib/saas/support-audit');
            await logSupportAction({
              operatorUserId: String(token.id),
              operatorEmail: (token.email as string) || null,
              action: 'impersonate_end',
              tenantId: token.tenantId as string,
              tenantSlug: (token.impersonatedTenantSlug as string) || null,
            });
          } catch { /* */ }
          token.tenantId = token.operatorTenantId;
          token.role = token.operatorRole || token.role;
          token.tenantName = token.operatorTenantName;
          delete token.impersonating;
          delete token.operatorTenantId;
          delete token.operatorRole;
          delete token.operatorTenantName;
          delete token.impersonatedTenantSlug;
          token.exp = now + ACCESS_TOKEN_EXPIRY;
        } else {
          // Never spread client session.update() onto the JWT (role/tenant/id).
          const { applyClientSessionPatch } = await import(
            '../../../lib/saas/session-update-guard'
          );
          token = applyClientSessionPatch(token, session);

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

      // Clear MFA setup gate once user has enrolled
      if (token.mfaSetupRequired && token.id) {
        try {
          if (await isMfaEnabled(token.id as string)) {
            token.mfaSetupRequired = false;
            if (!token.redirectUrl) token.redirectUrl = '/humanify';
          }
        } catch { /* keep */ }
      }

      return token;
    },
    async session({ session, token }) {
      if ((token as any)?.error === 'PasswordChanged') {
        // Force client re-login after password reset
        return { ...session, user: undefined as any, expires: new Date(0).toISOString() };
      }
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
        (session.user as any).impersonating = Boolean(token.impersonating);
        (session.user as any).impersonatedTenantSlug = token.impersonatedTenantSlug as string | undefined;
        (session.user as any).mfaSetupRequired = Boolean(token.mfaSetupRequired);
        (session.user as any).subscriptionPlan = token.subscriptionPlan as string | null | undefined;
        (session.user as any).addonLms = Boolean(token.addonLms);
        (session.user as any).addonAi = Boolean(token.addonAi);
        (session.user as any).addonAts = Boolean(token.addonAts);
        (session.user as any).addonTalentBank = Boolean(token.addonTalentBank);
        (session.user as any).billedSeats = token.billedSeats != null ? Number(token.billedSeats) : null;
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

export default async function authHandler(req: any, res: any) {
  // Bind NextAuth origin to the request host so ops.humanify.id and
  // admin.humanify.id CSRF/session cookies stay host-only and do not
  // collide with apex humanify.id.
  const fwdHost = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '')
    .split(',')[0]
    .trim();
  const fwdProto = String(req.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  const prevUrl = process.env.NEXTAUTH_URL;
  if (fwdHost) {
    process.env.NEXTAUTH_URL = `${fwdProto}://${fwdHost}`;
  }

  try {
    // SEC-S3-1 — rate-limit credential login attempts (HTTP 429) before NextAuth
    const pathParts = Array.isArray(req.query?.nextauth) ? req.query.nextauth : [];
    const isCredentialsCallback =
      req.method === 'POST'
      && pathParts.includes('callback')
      && (pathParts.includes('credentials') || String(req.url || '').includes('credentials'));

    if (isCredentialsCallback) {
      const { checkLimit, RateLimitTier } = await import('../../../lib/middleware/rateLimit');
      const { normalizeIp: nip } = await import('../../../lib/saas/login-guard');
      const ip = nip(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip']);
      const email = String(req.body?.email || req.body?.username || 'anon').toLowerCase().trim();
      const limited = await checkLimit(req, res, {
        ...RateLimitTier.AUTH,
        keyGenerator: () => `rl:login:${ip}:${email}`,
        message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.',
      });
      if (!limited) return;
    }

    return await NextAuth(authOptions)(req, res);
  } finally {
    if (prevUrl !== undefined) process.env.NEXTAUTH_URL = prevUrl;
  }
}
