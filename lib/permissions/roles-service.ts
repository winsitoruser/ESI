// =======================================================================
// Roles Service — DB-first dengan fallback in-memory
// =======================================================================
// Pakai model Sequelize kalau DB tersedia; kalau gagal, pakai
// `rolesStore` in-memory sebagai fallback supaya UI tetap jalan saat
// development tanpa DB.
// =======================================================================

import { rolesStore, type StoredRole } from './roles-store';
import { expandPermissions, type DataScope } from './permissions-catalog';

export type RoleRecord = StoredRole;

interface RawRoleRow {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  level: number | null;
  data_scope?: string | null;
  dataScope?: string | null;
  permissions: any;
  is_system?: boolean;
  isSystem?: boolean;
  is_active?: boolean;
  isActive?: boolean;
  user_count?: number;
  userCount?: number;
  created_at?: string | Date;
  createdAt?: string | Date;
  updated_at?: string | Date;
  updatedAt?: string | Date;
}

function normalizeRow(row: RawRoleRow, userCountOverride?: number): RoleRecord {
  const perms = row.permissions || {};
  const permMap: Record<string, boolean> = typeof perms === 'string'
    ? (() => { try { return JSON.parse(perms); } catch { return {}; } })()
    : perms;

  return {
    id: String(row.id),
    code: (row.code || row.name.toUpperCase().replace(/\s+/g, '_')),
    name: row.name,
    description: row.description || '',
    level: row.level ?? 5,
    dataScope: ((row.data_scope ?? row.dataScope) || 'branch') as DataScope,
    permissions: permMap,
    isSystem: Boolean(row.is_system ?? row.isSystem),
    isActive: row.is_active ?? row.isActive ?? true,
    userCount: userCountOverride ?? row.user_count ?? row.userCount ?? 0,
    createdAt: new Date(row.created_at ?? row.createdAt ?? Date.now()).toISOString(),
    updatedAt: new Date(row.updated_at ?? row.updatedAt ?? Date.now()).toISOString()
  };
}

async function getModels(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../models');
    const db = mod && (mod.default || mod);
    if (!db?.Role) return null;
    // Quick ping — bila DB mati/belum dimigrasi akan throw
    await db.Role.sequelize.query('SELECT 1').catch((e: any) => { throw e; });
    return db;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[roles-service] DB not available, fallback to in-memory:', err?.message);
    }
    return null;
  }
}

export const rolesService = {
  async list(): Promise<RoleRecord[]> {
    const db = await getModels();
    if (!db) return rolesStore.list();

    try {
      const rows = await db.Role.findAll({ order: [['level', 'ASC'], ['name', 'ASC']], raw: true });
      // user counts: query sekali, group by role_id
      let counts: Record<string, number> = {};
      try {
        const [result] = await db.Role.sequelize.query(
          'SELECT role_id, COUNT(*)::int AS cnt FROM users WHERE role_id IS NOT NULL GROUP BY role_id'
        );
        (result as any[]).forEach(r => { counts[r.role_id] = r.cnt; });
      } catch { /* ignore — table users/role_id may not exist */ }

      return rows.map((r: RawRoleRow) => normalizeRow(r, counts[String(r.id)]));
    } catch (err: any) {
      console.warn('[roles-service] list DB err, fallback:', err?.message);
      return rolesStore.list();
    }
  },

  async findById(id: string): Promise<RoleRecord | null> {
    const db = await getModels();
    if (!db) return rolesStore.findById(id) || null;
    try {
      const row = await db.Role.findByPk(id, { raw: true });
      return row ? normalizeRow(row) : null;
    } catch {
      return rolesStore.findById(id) || null;
    }
  },

  async findByCode(code: string): Promise<RoleRecord | null> {
    const db = await getModels();
    if (!db) return rolesStore.findByCode(code) || null;
    try {
      const row = await db.Role.findOne({ where: { code }, raw: true });
      return row ? normalizeRow(row) : null;
    } catch {
      return rolesStore.findByCode(code) || null;
    }
  },

  async create(input: {
    code: string; name: string; description?: string; level?: number;
    dataScope?: DataScope; isActive?: boolean; permissions: Record<string, boolean>;
  }): Promise<RoleRecord> {
    const db = await getModels();
    const payload = {
      code: input.code,
      name: input.name,
      description: input.description || '',
      level: input.level ?? 5,
      dataScope: input.dataScope || 'branch',
      permissions: input.permissions,
      isSystem: false,
      isActive: input.isActive !== false,
      userCount: 0
    };

    if (db) {
      try {
        const row = await db.Role.create(payload);
        return normalizeRow(row.toJSON());
      } catch (err: any) {
        console.warn('[roles-service] create DB err, fallback:', err?.message);
      }
    }

    const record: RoleRecord = {
      id: Date.now().toString(),
      code: payload.code,
      name: payload.name,
      description: payload.description,
      level: payload.level,
      dataScope: payload.dataScope,
      permissions: payload.permissions,
      isSystem: false,
      isActive: payload.isActive,
      userCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    rolesStore.create(record);
    return record;
  },

  async update(id: string, patch: Partial<RoleRecord>): Promise<RoleRecord | null> {
    const db = await getModels();
    if (db) {
      try {
        const row = await db.Role.findByPk(id);
        if (!row) return null;
        const fields: any = {};
        if (patch.name !== undefined) fields.name = patch.name;
        if (patch.description !== undefined) fields.description = patch.description;
        if (patch.level !== undefined) fields.level = patch.level;
        if (patch.dataScope !== undefined) fields.dataScope = patch.dataScope;
        if (patch.isActive !== undefined) fields.isActive = patch.isActive;
        if (patch.permissions !== undefined) fields.permissions = patch.permissions;
        await row.update(fields);
        return normalizeRow(row.toJSON());
      } catch (err: any) {
        console.warn('[roles-service] update DB err, fallback:', err?.message);
      }
    }
    return rolesStore.update(id, patch);
  },

  async remove(id: string): Promise<{ ok: boolean; reason?: string }> {
    const db = await getModels();
    if (db) {
      try {
        const row = await db.Role.findByPk(id);
        if (!row) return { ok: false, reason: 'not_found' };
        if (row.isSystem) return { ok: false, reason: 'system_role' };

        // cek user_count via users.role_id
        let inUse = 0;
        try {
          const [[res]] = await db.Role.sequelize.query(
            'SELECT COUNT(*)::int AS cnt FROM users WHERE role_id = :id',
            { replacements: { id } }
          );
          inUse = res?.cnt || 0;
        } catch { /* ignore */ }
        if (inUse > 0) return { ok: false, reason: `in_use_${inUse}` };

        await row.destroy();
        return { ok: true };
      } catch (err: any) {
        console.warn('[roles-service] remove DB err, fallback:', err?.message);
      }
    }
    const ok = rolesStore.remove(id);
    return ok ? { ok: true } : { ok: false, reason: 'cannot_remove' };
  },

  async stats() {
    const list = await this.list();
    return {
      total: list.length,
      system: list.filter(r => r.isSystem).length,
      custom: list.filter(r => !r.isSystem).length,
      active: list.filter(r => r.isActive).length,
      totalUsers: list.reduce((s, r) => s + (r.userCount || 0), 0)
    };
  },

  /** Assign role ke user (update kolom role_id). */
  async assignToUser(userId: string | number, roleId: string): Promise<{ ok: boolean; reason?: string }> {
    const db = await getModels();
    if (!db) return { ok: false, reason: 'db_unavailable' };
    try {
      const [[found]] = await db.Role.sequelize.query(
        'SELECT id, name, code FROM roles WHERE id = :id', { replacements: { id: roleId } }
      );
      if (!found) return { ok: false, reason: 'role_not_found' };

      await db.Role.sequelize.query(
        'UPDATE users SET role_id = :role_id, updated_at = NOW() WHERE id = :user_id',
        { replacements: { role_id: roleId, user_id: userId } }
      );
      return { ok: true };
    } catch (err: any) {
      console.warn('[roles-service] assignToUser err:', err?.message);
      return { ok: false, reason: err?.message || 'assign_error' };
    }
  }
};

/** Utility: expand permission list (wildcard supported) ke map boolean */
export function buildPermissionMap(input: Record<string, boolean> | string[] | undefined): Record<string, boolean> {
  if (!input) return {};
  if (Array.isArray(input)) {
    const expanded = expandPermissions(input);
    const out: Record<string, boolean> = {};
    expanded.forEach(k => { out[k] = true; });
    return out;
  }
  return input;
}
