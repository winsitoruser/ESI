/**
 * Admin Total — platform superadmin host (admin.humanify.id).
 * Same control plane as ops.humanify.id: tenants, billing, partners, observability.
 * Not the tenant HRIS app (`/humanify` on humanify.id).
 */
export {
  getAdminHost,
  getAdminOrigin,
  getApexOrigin,
  isAdminHost,
  isOpsHost,
  isPlatformOperatorRole,
} from '@/lib/humanify/ops-host';
