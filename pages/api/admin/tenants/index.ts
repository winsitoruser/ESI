import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('@/models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { Tenant, BusinessType, User, TenantModule, Module, Partner } = db;

    switch (req.method) {
      case 'GET':
        return await getTenants(req, res, { Tenant, BusinessType, User, Partner });
      
      case 'POST':
        return await createTenant(req, res, { Tenant, BusinessType });
      
      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin tenants API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function getTenants(req: NextApiRequest, res: NextApiResponse, models: any) {
  const { Tenant, BusinessType, User, Partner } = models;
  const { businessType, search, status, page = 1, limit = 20 } = req.query;

  const where: any = {};
  
  if (businessType && businessType !== 'all') {
    where.businessTypeId = businessType;
  }

  if (search) {
    where[db.Sequelize.Op.or] = [
      { businessName: { [db.Sequelize.Op.iLike]: `%${search}%` } },
      { businessEmail: { [db.Sequelize.Op.iLike]: `%${search}%` } }
    ];
  }

  if (status === 'active') {
    where.setupCompleted = true;
  } else if (status === 'pending') {
    where.setupCompleted = false;
  }

  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows: tenants } = await Tenant.findAndCountAll({
    where,
    include: [
      {
        model: BusinessType,
        as: 'businessType',
        attributes: ['id', 'code', 'name', 'icon']
      },
      {
        model: Partner,
        as: 'partner',
        attributes: ['id', 'businessName', 'ownerName', 'email', 'status']
      },
      {
        model: User,
        as: 'users',
        attributes: ['id', 'name', 'email', 'role']
      }
    ],
    limit: Number(limit),
    offset,
    order: [['createdAt', 'DESC']]
  });

  return res.status(200).json({
    success: true,
    data: {
      tenants,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      }
    }
  });
}

async function createTenant(req: NextApiRequest, res: NextApiResponse, models: any) {
  const { Tenant, BusinessType } = models;
  const { 
    businessTypeId, 
    businessName, 
    businessEmail, 
    businessPhone, 
    businessAddress, 
    partnerId,
    tenantType,
    maxBranches,
    subscriptionPlan,
    ownerName,
    ownerEmail,
    ownerPhone
  } = req.body;

  if (!businessTypeId || !businessName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Business type and name are required' 
    });
  }

  const businessType = await BusinessType.findByPk(businessTypeId);
  if (!businessType) {
    return res.status(404).json({ success: false, error: 'Business type not found' });
  }

  // Set maxBranches based on tenant type and subscription plan
  let finalMaxBranches = maxBranches || 1;
  let maxUsers = 5;
  
  if (subscriptionPlan === 'professional') {
    finalMaxBranches = tenantType === 'multi' ? 5 : 1;
    maxUsers = 20;
  } else if (subscriptionPlan === 'enterprise') {
    finalMaxBranches = 999; // Unlimited
    maxUsers = 999; // Unlimited
  }

  const tenant = await Tenant.create({
    businessTypeId,
    businessName,
    businessEmail,
    businessPhone,
    businessAddress,
    partnerId,
    subscriptionPlan: subscriptionPlan || 'basic',
    maxBranches: finalMaxBranches,
    maxUsers: maxUsers,
    status: 'trial',
    contactName: ownerName,
    contactEmail: ownerEmail,
    contactPhone: ownerPhone,
    setupCompleted: false,
    onboardingStep: 0
  });

  // Enable default modules for this business type
  const defaultModules = await db.BusinessTypeModule.findAll({
    where: {
      businessTypeId,
      isDefault: true
    },
    include: [{
      model: db.Module,
      as: 'module'
    }]
  });

  for (const btm of defaultModules) {
    await db.TenantModule.create({
      tenantId: tenant.id,
      moduleId: btm.moduleId,
      isEnabled: true
    });
  }

  // Create owner user for the tenant
  const bcrypt = require('bcryptjs');
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const ownerUser = await db.User.create({
    name: ownerName,
    email: ownerEmail,
    phone: ownerPhone,
    password: hashedPassword,
    tenantId: tenant.id,
    role: 'owner',
    isActive: true
  });

  // TODO: Send email dengan credentials ke owner
  // For now, return temp password in response (should be sent via email in production)

  return res.status(201).json({
    success: true,
    data: {
      tenant,
      owner: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        tempPassword: tempPassword // Remove this in production, send via email
      }
    },
    message: 'Tenant created successfully. Owner credentials have been generated.'
  });
}
