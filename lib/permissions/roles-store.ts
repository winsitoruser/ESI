// Simple in-memory role store with preset seeding.
// Digunakan sebagai fallback sebelum integrasi DB Sequelize final.
// Shared antar API route via module singleton (globalThis cache agar tahan HMR).

import { ROLE_PRESETS, expandPermissions, type DataScope } from './permissions-catalog';

export interface StoredRole {
  id: string;
  code: string;
  name: string;
  description: string;
  level: number;
  dataScope: DataScope;
  permissions: Record<string, boolean>;
  userCount: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RolesStoreShape {
  roles: StoredRole[];
  seeded: boolean;
}

const g = globalThis as unknown as { __bedagang_roles_store__?: RolesStoreShape };

function seed(): RolesStoreShape {
  const roles: StoredRole[] = ROLE_PRESETS.map((preset, idx) => {
    const expanded = expandPermissions(preset.permissions);
    const permMap: Record<string, boolean> = {};
    expanded.forEach(k => { permMap[k] = true; });
    return {
      id: `sys-${idx + 1}`,
      code: preset.code,
      name: preset.name,
      description: preset.description,
      level: preset.level,
      dataScope: preset.dataScope,
      permissions: permMap,
      userCount: [25, 8, 12, 18, 45, 6, 4, 5, 2][idx] || 0,
      isSystem: preset.level <= 2 || ['CASHIER', 'BRANCH_MANAGER'].includes(preset.code),
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date('2026-01-01').toISOString()
    };
  });
  return { roles, seeded: true };
}

if (!g.__bedagang_roles_store__) {
  g.__bedagang_roles_store__ = seed();
}

export const rolesStore = {
  list(): StoredRole[] {
    return g.__bedagang_roles_store__!.roles;
  },
  findById(id: string): StoredRole | undefined {
    return g.__bedagang_roles_store__!.roles.find(r => r.id === id);
  },
  findByCode(code: string): StoredRole | undefined {
    return g.__bedagang_roles_store__!.roles.find(r => r.code === code);
  },
  create(role: StoredRole) {
    g.__bedagang_roles_store__!.roles.push(role);
    return role;
  },
  update(id: string, patch: Partial<StoredRole>): StoredRole | null {
    const store = g.__bedagang_roles_store__!;
    const idx = store.roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    store.roles[idx] = { ...store.roles[idx], ...patch, updatedAt: new Date().toISOString() };
    return store.roles[idx];
  },
  remove(id: string): boolean {
    const store = g.__bedagang_roles_store__!;
    const role = store.roles.find(r => r.id === id);
    if (!role || role.isSystem) return false;
    store.roles = store.roles.filter(r => r.id !== id);
    return true;
  },
  stats() {
    const roles = g.__bedagang_roles_store__!.roles;
    return {
      total: roles.length,
      system: roles.filter(r => r.isSystem).length,
      custom: roles.filter(r => !r.isSystem).length,
      active: roles.filter(r => r.isActive).length,
      totalUsers: roles.reduce((s, r) => s + (r.userCount || 0), 0)
    };
  }
};
