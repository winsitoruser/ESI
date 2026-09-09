import {
  canManageCompanies,
  isCompanySwitchAllowed,
  isTenantUuid,
  membershipRoleForUserRole,
  pickDefaultCompanyId,
  resolveParentTenantId,
  shouldShowCompanySwitcher,
} from '../lib/saas/company-membership-policy';

describe('canManageCompanies', () => {
  it('allows owner, HR admin, and platform ops', () => {
    expect(canManageCompanies('owner')).toBe(true);
    expect(canManageCompanies('hq_admin')).toBe(true);
    expect(canManageCompanies('hr_admin')).toBe(true);
    expect(canManageCompanies('super_admin')).toBe(true);
    expect(canManageCompanies('platform_admin')).toBe(true);
  });

  it('denies staff and managers', () => {
    expect(canManageCompanies('staff')).toBe(false);
    expect(canManageCompanies('manager')).toBe(false);
    expect(canManageCompanies('cashier')).toBe(false);
    expect(canManageCompanies(null)).toBe(false);
  });
});

describe('membershipRoleForUserRole', () => {
  it('maps privilege roles to owner/admin membership', () => {
    expect(membershipRoleForUserRole('owner')).toBe('owner');
    expect(membershipRoleForUserRole('super_admin')).toBe('owner');
    expect(membershipRoleForUserRole('hq_admin')).toBe('admin');
    expect(membershipRoleForUserRole('staff')).toBe('member');
  });
});

describe('shouldShowCompanySwitcher', () => {
  it('shows when the user can create a company even with zero rows', () => {
    expect(shouldShowCompanySwitcher({ canCreate: true, companyCount: 0 })).toBe(true);
  });

  it('shows when the user already has more than one company', () => {
    expect(shouldShowCompanySwitcher({ canCreate: false, companyCount: 2 })).toBe(true);
  });

  it('hides for a single-company staff user', () => {
    expect(shouldShowCompanySwitcher({ canCreate: false, companyCount: 1 })).toBe(false);
    expect(shouldShowCompanySwitcher({ canCreate: false, companyCount: 0 })).toBe(false);
  });
});

describe('isCompanySwitchAllowed', () => {
  const memberships = [
    { tenantId: 'aaa', status: 'active' },
    { tenantId: 'bbb', status: 'revoked' },
  ];

  it('allows only active memberships', () => {
    expect(isCompanySwitchAllowed({ requestedTenantId: 'aaa', memberships })).toBe(true);
    expect(isCompanySwitchAllowed({ requestedTenantId: 'bbb', memberships })).toBe(false);
    expect(isCompanySwitchAllowed({ requestedTenantId: 'zzz', memberships })).toBe(false);
  });

  it('blocks switch during support impersonation', () => {
    expect(isCompanySwitchAllowed({
      requestedTenantId: 'aaa',
      memberships,
      impersonating: true,
    })).toBe(false);
  });
});

describe('pickDefaultCompanyId', () => {
  it('prefers the default membership, then home tenant, then first', () => {
    expect(pickDefaultCompanyId({
      memberships: [
        { tenantId: 'one' },
        { tenantId: 'two', isDefault: true },
      ],
      homeTenantId: 'one',
    })).toBe('two');

    expect(pickDefaultCompanyId({
      memberships: [{ tenantId: 'one' }, { tenantId: 'two' }],
      homeTenantId: 'two',
    })).toBe('two');

    expect(pickDefaultCompanyId({
      memberships: [{ tenantId: 'one' }],
      homeTenantId: null,
    })).toBe('one');

    expect(pickDefaultCompanyId({
      memberships: [],
      homeTenantId: 'home',
    })).toBe('home');
  });
});

describe('isTenantUuid', () => {
  it('accepts only RFC UUID tenant ids', () => {
    expect(isTenantUuid('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true);
    expect(isTenantUuid('not-a-tenant')).toBe(false);
    expect(isTenantUuid('')).toBe(false);
    expect(isTenantUuid(null)).toBe(false);
  });
});

describe('resolveParentTenantId', () => {
  const owned = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const other = 'ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee';

  it('nests only under a tenant the user already owns', () => {
    expect(resolveParentTenantId({
      homeTenantId: owned,
      memberships: [{ tenantId: owned }],
    })).toBe(owned);
  });

  it('does not nest under a JWT/default tenant outside memberships', () => {
    expect(resolveParentTenantId({
      homeTenantId: other,
      memberships: [{ tenantId: owned }],
    })).toBe(owned);
    expect(resolveParentTenantId({
      homeTenantId: other,
      memberships: [],
    })).toBeNull();
  });
});

describe('company onboarding flow', () => {
  it('sends new companies into setup, then dashboard with onboard flag', () => {
    const {
      NEW_COMPANY_SETUP_HREF,
      NEW_COMPANY_DASHBOARD_HREF,
      industryLabel,
    } = require('../lib/saas/company-onboarding-flow');
    expect(NEW_COMPANY_SETUP_HREF).toContain('/humanify/setup');
    expect(NEW_COMPANY_SETUP_HREF).toContain('from=new-company');
    const { newCompanySetupHref } = require('../lib/saas/company-onboarding-flow');
    expect(newCompanySetupHref('db41fafc-7424-4333-bd4e-a42159d9fdae')).toContain('companyId=db41fafc-7424-4333-bd4e-a42159d9fdae');
    const { humanifyLoginHref } = require('../lib/saas/company-onboarding-flow');
    expect(humanifyLoginHref('/humanify/setup?from=new-company&companyId=abc')).toContain(
      encodeURIComponent('/humanify/setup?from=new-company&companyId=abc'),
    );
    const { requestedSetupCompanyId } = require('../lib/saas/setup-tenant');
    expect(requestedSetupCompanyId(
      { companyId: 'db41fafc-7424-4333-bd4e-a42159d9fdae', from: 'new-company' },
    )).toBe('db41fafc-7424-4333-bd4e-a42159d9fdae');
    expect(requestedSetupCompanyId({ companyId: 'not-a-uuid' })).toBe('');
    expect(requestedSetupCompanyId(
      { companyId: 'db41fafc-7424-4333-bd4e-a42159d9fdae' },
      { companyId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' },
    )).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    expect(NEW_COMPANY_DASHBOARD_HREF).toContain('onboard=new-company');
    expect(industryLabel('software_house')).toBe('Teknologi / IT');
  });
});
