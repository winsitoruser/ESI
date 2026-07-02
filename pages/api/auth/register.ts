import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

// Dynamic import for CommonJS module
const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = getDb();
    const { name, email, phone, businessName, businessType, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nama, email, dan password wajib diisi' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { email } });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find business type if provided
    let businessTypeId = null;
    if (businessType) {
      const bt = await db.BusinessType.findOne({ where: { code: businessType } });
      if (bt) businessTypeId = bt.id;
    }

    // Generate unique tenant code
    const bName = businessName || `Bisnis ${name}`;
    const baseCode = bName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
    const uniqueSuffix = Date.now().toString(36).toUpperCase().slice(-4);
    const tenantCode = `${baseCode || 'TNT'}-${uniqueSuffix}`;

    // Create tenant with pending KYB status
    // status must be one of: 'active','inactive','suspended','trial' (DB ENUM)
    // onboardingStep must be INTEGER (DB column is int4)
    // code is NOT NULL in DB
    const tenant = await db.Tenant.create({
      businessName: bName,
      name: bName,
      code: tenantCode,
      businessTypeId,
      status: 'trial',
      kybStatus: 'pending_kyb',
      setupCompleted: false,
      onboardingStep: 0,
      isActive: true,
    });

    // Create user linked to tenant
    const user = await db.User.create({
      name,
      email,
      phone: phone || null,
      businessName: businessName || null,
      password: hashedPassword,
      tenantId: tenant.id,
      role: 'owner',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create KYB application draft
    await db.KybApplication.create({
      tenantId: tenant.id,
      userId: user.id,
      businessName: businessName || `Bisnis ${name}`,
      businessCategory: businessType || null,
      status: 'draft',
      currentStep: 1,
      completionPercentage: 0,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user.toJSON();

    return res.status(201).json({
      message: 'Registrasi berhasil',
      user: userWithoutPassword,
      tenantId: tenant.id,
      redirectTo: '/onboarding',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      message: 'Terjadi kesalahan saat registrasi',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
}
