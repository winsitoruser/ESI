/**
 * Humanify SaaS — provision new tenant + owner user (schema-safe).
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { ensureUniqueTenantSlug } from './tenant-slug';
import { getTenantColumns } from './tenant-schema';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

const getDb = () => require('../../models');

export interface ProvisionInput {
  companyName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  industry?: string;
  employeeRange?: string;
}

export interface ProvisionResult {
  tenantId: string;
  slug: string;
  userId: number;
  email: string;
}

function buildTenantCode(companyName: string): string {
  const base = companyName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `${base || 'HFY'}-${suffix}`;
}

export async function provisionHumanifyTenant(input: ProvisionInput): Promise<ProvisionResult> {
  if (!sequelize) throw new Error('Database unavailable');

  const db = getDb();
  const email = String(input.email).trim().toLowerCase();
  const companyName = String(input.companyName).trim();
  const ownerName = String(input.ownerName).trim();

  if (!email || !companyName || !ownerName || !input.password) {
    throw new Error('Data registrasi tidak lengkap');
  }
  if (input.password.length < 8) {
    throw new Error('Password minimal 8 karakter');
  }

  const existing = await db.User.findOne({ where: { email } });
  if (existing) throw new Error('Email sudah terdaftar');

  const cols = await getTenantColumns();
  const tenantId = randomUUID();
  const slug = await ensureUniqueTenantSlug(companyName);
  const code = buildTenantCode(companyName);
  const now = new Date();

  const settings = {
    saas_onboarding: {
      step: 1,
      completed: false,
      startedAt: now.toISOString(),
      company: {
        industry: input.industry || 'professional_services',
        employeeRange: input.employeeRange || '1-50',
      },
    },
    product: 'humanify',
  };

  const fields: string[] = ['id'];
  const values: string[] = [':id'];
  const replacements: Record<string, unknown> = { id: tenantId };

  const add = (col: string, param: string, value: unknown) => {
    if (!cols.has(col)) return;
    fields.push(col);
    values.push(param);
    replacements[param.slice(1)] = value;
  };

  add('name', ':name', companyName);
  add('code', ':code', code);
  add('slug', ':slug', slug);
  add('status', ':status', 'trial');
  add('is_active', ':is_active', true);
  if (cols.has('settings')) {
    fields.push('settings');
    values.push('CAST(:settings AS jsonb)');
    replacements.settings = JSON.stringify(settings);
  }
  add('business_name', ':business_name', companyName);
  add('setup_completed', ':setup_completed', false);
  add('onboarding_step', ':onboarding_step', 1);
  add('contact_name', ':contact_name', ownerName);
  add('contact_email', ':contact_email', email);
  add('contact_phone', ':contact_phone', input.phone || null);
  add('subscription_plan', ':subscription_plan', 'trial');
  add('max_users', ':max_users', 25);
  add('max_branches', ':max_branches', 3);

  if (cols.has('created_at')) {
    fields.push('created_at');
    values.push('NOW()');
  }
  if (cols.has('updated_at')) {
    fields.push('updated_at');
    values.push('NOW()');
  }

  const fieldList = fields.join(', ');
  const valueList = values.join(', ');

  await sequelize.query(
    `INSERT INTO tenants (${fieldList}) VALUES (${valueList})`,
    { replacements },
  );

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const user = await db.User.create({
    name: ownerName,
    email,
    phone: input.phone || null,
    businessName: companyName,
    password: hashedPassword,
    tenantId,
    role: 'owner',
    isActive: true,
  });

  return {
    tenantId,
    slug,
    userId: user.id,
    email,
  };
}
