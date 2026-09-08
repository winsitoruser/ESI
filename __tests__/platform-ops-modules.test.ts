import { pickSqlCol } from '@/lib/saas/platform-ops-modules';

describe('platform ops modules', () => {
  it('picks snake_case when both exist', () => {
    const cols = new Set(['is_active', 'isActive']);
    expect(pickSqlCol(cols, 'is_active', 'isActive')).toBe('is_active');
  });

  it('quotes camelCase Sequelize columns', () => {
    const cols = new Set(['isActive', 'createdAt', 'lastLogin']);
    expect(pickSqlCol(cols, 'is_active', 'isActive')).toBe('"isActive"');
    expect(pickSqlCol(cols, 'created_at', 'createdAt')).toBe('"createdAt"');
    expect(pickSqlCol(cols, 'last_login', 'lastLogin')).toBe('"lastLogin"');
  });

  it('returns null when neither column exists', () => {
    expect(pickSqlCol(new Set(['email']), 'is_active', 'isActive')).toBeNull();
  });
});
