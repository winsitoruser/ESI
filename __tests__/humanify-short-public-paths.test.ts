import { rewriteHumanifyShortPublicPath } from '@/lib/humanify/paths';

describe('humanify.id short public URLs', () => {
  it('maps /login to Humanify login, not SIMESI /auth/login', () => {
    expect(rewriteHumanifyShortPublicPath('/login')).toBe('/humanify/login');
    expect(rewriteHumanifyShortPublicPath('/login/')).toBe('/humanify/login');
  });

  it('maps signup and recovery paths', () => {
    expect(rewriteHumanifyShortPublicPath('/signup')).toBe('/humanify/signup');
    expect(rewriteHumanifyShortPublicPath('/forgot-password')).toBe('/humanify/forgot-password');
  });

  it('does not swallow the HR app namespace', () => {
    expect(rewriteHumanifyShortPublicPath('/humanify/attendance')).toBeNull();
    expect(rewriteHumanifyShortPublicPath('/')).toBeNull();
  });
});
