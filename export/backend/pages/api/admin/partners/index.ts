import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { Partner, PartnerOutlet, PartnerUser, PartnerSubscription, SubscriptionPackage } = db;
const { Op } = require('sequelize');

/**
 * GET /api/admin/partners
 * List all partners with filters and pagination
 * 
 * POST /api/admin/partners
 * Create new partner
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      return await getPartners(req, res);
    } else if (req.method === 'POST') {
      return await createPartner(req, res, session);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Admin Partners API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function getPartners(req: NextApiRequest, res: NextApiResponse) {
  const {
    page = 1,
    limit = 20,
    status,
    activation_status,
    city,
    search,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = req.query;

  // Build where clause
  const where: any = {};
  
  if (status) {
    where.status = status;
  }
  
  if (activation_status) {
    where.activation_status = activation_status;
  }
  
  if (city) {
    where.city = city;
  }
  
  if (search) {
    where[Op.or] = [
      { business_name: { [Op.iLike]: `%${search}%` } },
      { owner_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  try {
    const { count, rows: partners } = await Partner.findAndCountAll({
      where,
      include: [
        {
          model: PartnerOutlet,
          as: 'outlets',
          attributes: ['id', 'outlet_name', 'is_active']
        },
        {
          model: PartnerUser,
          as: 'users',
          attributes: ['id', 'name', 'role', 'is_active']
        },
        {
          model: PartnerSubscription,
          as: 'subscriptions',
          where: { status: 'active' },
          required: false,
          include: [{
            model: SubscriptionPackage,
            as: 'package',
            attributes: ['name', 'price_monthly']
          }]
        }
      ],
      order: [[sort_by as string, sort_order as string]],
      limit: parseInt(limit as string),
      offset
    });

    // Transform data
    const transformedPartners = partners.map((partner: any) => {
      const activeSubscription = partner.subscriptions?.[0];
      
      return {
        id: partner.id,
        business_name: partner.businessName,
        business_type: partner.businessType,
        owner_name: partner.ownerName,
        email: partner.email,
        phone: partner.phone,
        city: partner.city,
        province: partner.province,
        status: partner.status,
        activation_status: partner.activationStatus,
        logo_url: partner.logoUrl,
        total_outlets: partner.outlets?.length || 0,
        active_outlets: partner.outlets?.filter((o: any) => o.is_active).length || 0,
        total_users: partner.users?.length || 0,
        active_users: partner.users?.filter((u: any) => u.is_active).length || 0,
        current_package: activeSubscription?.package?.name || null,
        subscription_end_date: activeSubscription?.endDate || null,
        created_at: partner.createdAt,
        updated_at: partner.updatedAt
      };
    });

    return res.status(200).json({
      success: true,
      data: transformedPartners,
      pagination: {
        total: count,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total_pages: Math.ceil(count / parseInt(limit as string))
      }
    });

  } catch (error: any) {
    console.error('Get Partners Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
      details: error.message
    });
  }
}

async function createPartner(req: NextApiRequest, res: NextApiResponse, session: any) {
  const {
    business_name,
    business_type,
    owner_name,
    email,
    phone,
    address,
    city,
    province,
    postal_code,
    tax_id,
    website
  } = req.body;

  // Validation
  if (!business_name || !owner_name || !email) {
    return res.status(400).json({
      error: 'Missing required fields: business_name, owner_name, email'
    });
  }

  try {
    // Check if email already exists
    const existingPartner = await Partner.findOne({ where: { email } });
    if (existingPartner) {
      return res.status(400).json({
        error: 'Partner with this email already exists'
      });
    }

    // Create partner
    const partner = await Partner.create({
      businessName: business_name,
      businessType: business_type,
      ownerName: owner_name,
      email,
      phone,
      address,
      city,
      province,
      postalCode: postal_code,
      taxId: tax_id,
      website,
      status: 'pending',
      activationStatus: 'pending',
      activationRequestedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      data: partner,
      message: 'Partner created successfully'
    });

  } catch (error: any) {
    console.error('Create Partner Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create partner',
      details: error.message
    });
  }
}
