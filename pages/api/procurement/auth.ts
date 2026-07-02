import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const sequelize = require('../../../lib/sequelize');

const ok = (data: any) => ({ success: true, data });
const fail = (code: string, msg: string) => ({ success: false, error: { code, message: msg } });

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'bedagang_epr_salt').digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const action = req.query.action as string;

  try {
    if (req.method === 'POST') {
      switch (action) {
        case 'register': return handleRegister(req, res);
        case 'login': return handleLogin(req, res);
        case 'profile': return handleGetProfile(req, res);
        default: return res.status(400).json(fail('INVALID_ACTION', 'Unknown action'));
      }
    }
    return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Method not allowed'));
  } catch (error: any) {
    console.error('[Procurement Auth]', error.message);
    return res.status(500).json(fail('INTERNAL_ERROR', error.message));
  }
}

async function handleRegister(req: NextApiRequest, res: NextApiResponse) {
  const { companyName, contactPerson, email, phone, password, npwp, address, city, province, businessType } = req.body;

  if (!companyName || !contactPerson || !email || !password) {
    return res.status(400).json(fail('VALIDATION', 'Nama perusahaan, contact person, email, dan password wajib diisi'));
  }

  if (password.length < 6) {
    return res.status(400).json(fail('VALIDATION', 'Password minimal 6 karakter'));
  }

  // Check duplicate email
  const [existing] = await sequelize.query(
    `SELECT id FROM epr_vendor_portal_users WHERE email = :email LIMIT 1`,
    { replacements: { email: email.toLowerCase().trim() }, type: sequelize.QueryTypes.SELECT }
  );
  if (existing) {
    return res.status(409).json(fail('DUPLICATE', 'Email sudah terdaftar'));
  }

  const passwordHash = hashPassword(password);

  const [result] = await sequelize.query(`
    INSERT INTO epr_vendor_portal_users
      (id, company_name, contact_person, email, phone, password_hash, npwp, address, city, province, business_type, status)
    VALUES
      (gen_random_uuid(), :companyName, :contactPerson, :email, :phone, :passwordHash, :npwp, :address, :city, :province, :businessType, 'pending')
    RETURNING id, company_name, contact_person, email, status, created_at
  `, {
    replacements: {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      passwordHash,
      npwp: npwp || null,
      address: address || null,
      city: city || null,
      province: province || null,
      businessType: businessType || null,
    }
  });

  return res.status(201).json(ok(result[0]));
}

async function handleLogin(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json(fail('VALIDATION', 'Email dan password wajib diisi'));
  }

  const passwordHash = hashPassword(password);

  const [user] = await sequelize.query(`
    SELECT id, vendor_id, company_name, contact_person, email, phone, status, last_login
    FROM epr_vendor_portal_users
    WHERE email = :email AND password_hash = :passwordHash
    LIMIT 1
  `, { replacements: { email: email.toLowerCase().trim(), passwordHash }, type: sequelize.QueryTypes.SELECT });

  if (!user) {
    return res.status(401).json(fail('INVALID_CREDENTIALS', 'Email atau password salah'));
  }

  if (user.status === 'suspended') {
    return res.status(403).json(fail('SUSPENDED', 'Akun Anda telah ditangguhkan'));
  }

  // Update login stats
  await sequelize.query(`
    UPDATE epr_vendor_portal_users SET last_login = NOW(), login_count = login_count + 1, updated_at = NOW() WHERE id = :id
  `, { replacements: { id: user.id } });

  // Return user token (simple token based on id for this portal)
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email, ts: Date.now() })).toString('base64');

  return res.json(ok({ user, token }));
}

async function handleGetProfile(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(fail('UNAUTHORIZED', 'Token required'));
  }

  try {
    const payload = JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString());
    const [user] = await sequelize.query(`
      SELECT id, vendor_id, company_name, contact_person, email, phone, npwp, address, city, province, business_type, status, last_login, created_at
      FROM epr_vendor_portal_users WHERE id = :id LIMIT 1
    `, { replacements: { id: payload.id }, type: sequelize.QueryTypes.SELECT });

    if (!user) return res.status(404).json(fail('NOT_FOUND', 'User not found'));
    return res.json(ok(user));
  } catch {
    return res.status(401).json(fail('INVALID_TOKEN', 'Invalid token'));
  }
}
