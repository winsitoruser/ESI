/**
 * Candidate Portal - Authentication API
 * 
 * POST ?action=login     - Candidate login
 * POST ?action=register  - Candidate self-registration
 * GET  ?action=profile   - Get candidate profile (requires token)
 * PUT  ?action=update-profile - Update candidate profile
 * 
 * Uses JWT tokens independent from NextAuth (separate auth flow for candidates)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const sequelize = require('../../../lib/sequelize');

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'candidate-portal-secret-key');
const TOKEN_EXPIRY = '7d';

// Helper: extract candidate from JWT
async function getCandidateFromToken(req: NextApiRequest): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch { return null; }
}

// Helper: create JWT
async function createToken(payload: Record<string, any>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { action } = req.query;
    const method = req.method;

    // ── POST: Login ──
    if (method === 'POST' && action === 'login') {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email dan password harus diisi' });

      const [accounts] = await sequelize.query(
        'SELECT * FROM hris_candidate_accounts WHERE email = :email AND status != \'suspended\' LIMIT 1',
        { replacements: { email: email.toLowerCase().trim() } }
      );
      if (!accounts.length) return res.status(401).json({ error: 'Email atau password salah' });

      const account = accounts[0];
      const valid = await bcrypt.compare(password, account.password);
      if (!valid) return res.status(401).json({ error: 'Email atau password salah' });

      // Update last login
      await sequelize.query(
        'UPDATE hris_candidate_accounts SET last_login_at = NOW() WHERE id = :id',
        { replacements: { id: account.id } }
      );

      // Log activity
      await sequelize.query(
        `INSERT INTO hris_candidate_activity_logs (candidate_account_id, activity_type, ip_address, user_agent)
         VALUES (:aid, 'login', :ip, :ua)`,
        { replacements: { aid: account.id, ip: (req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || ''), ua: req.headers['user-agent'] || '' } }
      );

      const token = await createToken({
        id: account.id,
        email: account.email,
        name: account.name,
        tenantId: account.tenant_id,
        employeeId: account.employee_id,
        candidateId: account.candidate_id,
        role: 'candidate'
      });

      return res.json({
        success: true,
        token,
        user: {
          id: account.id,
          email: account.email,
          name: account.name,
          phone: account.phone,
          photo_url: account.photo_url,
          tenant_id: account.tenant_id,
          employee_id: account.employee_id,
          status: account.status,
        }
      });
    }

    // ── POST: Register ──
    if (method === 'POST' && action === 'register') {
      const { email, password, name, phone, tenant_id, id_number, date_of_birth, gender, address, education } = req.body;
      if (!email || !password || !name || !tenant_id) {
        return res.status(400).json({ error: 'Email, password, nama, dan tenant_id wajib diisi' });
      }
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

      // Check duplicate
      const [existing] = await sequelize.query(
        'SELECT id FROM hris_candidate_accounts WHERE email = :email',
        { replacements: { email: email.toLowerCase().trim() } }
      );
      if (existing.length) return res.status(409).json({ error: 'Email sudah terdaftar' });

      const hashedPassword = await bcrypt.hash(password, 12);

      const [rows] = await sequelize.query(`
        INSERT INTO hris_candidate_accounts (tenant_id, email, password, name, phone, id_number, date_of_birth, gender, address, education, status)
        VALUES (:tid, :email, :pwd, :name, :phone, :idNum, :dob, :gender, :addr, :edu, 'active')
        RETURNING id, tenant_id, email, name, phone, status, created_at
      `, {
        replacements: {
          tid: tenant_id, email: email.toLowerCase().trim(), pwd: hashedPassword,
          name, phone: phone || null, idNum: id_number || null,
          dob: date_of_birth || null, gender: gender || null,
          addr: address || null, edu: education || null
        }
      });

      const account = rows[0];
      const token = await createToken({
        id: account.id,
        email: account.email,
        name: account.name,
        tenantId: account.tenant_id,
        role: 'candidate'
      });

      return res.status(201).json({ success: true, token, user: account });
    }

    // ── GET: Profile ──
    if (method === 'GET' && action === 'profile') {
      const candidate = await getCandidateFromToken(req);
      if (!candidate) return res.status(401).json({ error: 'Token tidak valid' });

      const [accounts] = await sequelize.query(
        `SELECT id, tenant_id, employee_id, candidate_id, email, name, phone, photo_url,
                id_number, date_of_birth, gender, address, education, experience, skills,
                documents, status, email_verified, last_login_at, created_at
         FROM hris_candidate_accounts WHERE id = :id`,
        { replacements: { id: candidate.id } }
      );
      if (!accounts.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });

      return res.json({ success: true, data: accounts[0] });
    }

    // ── PUT: Update Profile ──
    if (method === 'PUT' && action === 'update-profile') {
      const candidate = await getCandidateFromToken(req);
      if (!candidate) return res.status(401).json({ error: 'Token tidak valid' });

      const body = req.body;
      const [rows] = await sequelize.query(`
        UPDATE hris_candidate_accounts SET
          name = COALESCE(:name, name), phone = COALESCE(:phone, phone),
          address = COALESCE(:addr, address), education = COALESCE(:edu, education),
          id_number = COALESCE(:idNum, id_number), date_of_birth = COALESCE(:dob, date_of_birth),
          gender = COALESCE(:gender, gender), updated_at = NOW()
        WHERE id = :id RETURNING id, email, name, phone, address, education
      `, {
        replacements: {
          id: candidate.id, name: body.name || null, phone: body.phone || null,
          addr: body.address || null, edu: body.education || null,
          idNum: body.id_number || null, dob: body.date_of_birth || null,
          gender: body.gender || null
        }
      });

      return res.json({ success: true, data: rows[0] });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error('[candidate auth API]', error.message);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
