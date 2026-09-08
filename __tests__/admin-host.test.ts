import {
  getAdminHost,
  isAdminHost,
  isOpsHost,
  isOpsAllowedPath,
  isOpsPlatformPage,
  isPlatformOperatorRole,
} from '@/lib/humanify/ops-host';
import { isHumanifyHost } from '@/lib/humanify/host';

describe('admin total host', () => {
  it('defaults to admin.humanify.id', () => {
    expect(getAdminHost()).toBe('admin.humanify.id');
    expect(isAdminHost('admin.humanify.id')).toBe(true);
    expect(isAdminHost('ADMIN.humanify.id:443')).toBe(true);
  });

  it('accepts local aliases', () => {
    expect(isAdminHost('admin.localhost')).toBe(true);
    expect(isAdminHost('admin.localhost:3010')).toBe(true);
  });

  it('is the platform control plane (same as ops), not tenant HRIS', () => {
    expect(isOpsHost('admin.humanify.id')).toBe(true);
    expect(isOpsHost('ops.humanify.id')).toBe(true);
    expect(isHumanifyHost('admin.humanify.id')).toBe(false);
    expect(isHumanifyHost('humanify.id')).toBe(true);
    expect(isAdminHost('humanify.id')).toBe(false);
    expect(isAdminHost('ops.humanify.id')).toBe(false);
    expect(isAdminHost('acme.humanify.id')).toBe(false);
  });

  it('allows control-plane paths and rejects tenant HRIS', () => {
    expect(isOpsAllowedPath('/')).toBe(true);
    expect(isOpsAllowedPath('/login')).toBe(true);
    expect(isOpsAllowedPath('/platform')).toBe(true);
    expect(isOpsAllowedPath('/platform/billing')).toBe(true);
    expect(isOpsAllowedPath('/platform/audit')).toBe(true);
    expect(isOpsPlatformPage('/platform/audit')).toBe(true);
    expect(isOpsPlatformPage('/platform/support')).toBe(true);
    expect(isOpsPlatformPage('/platform/users')).toBe(true);
    expect(isOpsPlatformPage('/platform/system')).toBe(true);
    expect(isOpsPlatformPage('/platform/banners')).toBe(true);
    expect(isOpsPlatformPage('/platform/subscriptions')).toBe(true);
    expect(isOpsPlatformPage('/platform/products')).toBe(true);
    expect(isOpsPlatformPage('/platform/finance')).toBe(true);
    expect(isOpsPlatformPage('/platform/crm')).toBe(true);
    expect(isOpsPlatformPage('/platform/marketing')).toBe(true);
    expect(isOpsPlatformPage('/platform/content')).toBe(true);
    expect(isOpsPlatformPage('/platform/analytics')).toBe(true);
    expect(isOpsPlatformPage('/platform/approvals')).toBe(true);
    expect(isOpsPlatformPage('/platform/roles')).toBe(true);
    expect(isOpsPlatformPage('/platform/insights')).toBe(true);
    expect(isOpsAllowedPath('/platform/banners')).toBe(true);
    expect(isOpsAllowedPath('/uploads/marketing/banner.jpg')).toBe(true);
    expect(isOpsAllowedPath('/platform/support')).toBe(true);
    expect(isOpsAllowedPath('/api/platform')).toBe(true);
    expect(isOpsAllowedPath('/humanify')).toBe(false);
    expect(isOpsAllowedPath('/humanify/employees')).toBe(false);
    expect(isOpsAllowedPath('/employee')).toBe(false);
  });

  it('only platform operators may sign in', () => {
    expect(isPlatformOperatorRole('super_admin')).toBe(true);
    expect(isPlatformOperatorRole('platform_admin')).toBe(true);
    expect(isPlatformOperatorRole('owner')).toBe(false);
    expect(isPlatformOperatorRole('hr_staff')).toBe(false);
    expect(isPlatformOperatorRole('employee')).toBe(false);
  });
});
