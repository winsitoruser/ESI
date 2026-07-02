import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { Partner, PartnerOutlet, PartnerUser, PartnerSubscription, SubscriptionPackage } = db;

/**
 * GET /api/admin/partners/:id - Get partner details
 * PUT /api/admin/partners/:id - Update partner
 * DELETE /api/admin/partners/:id - Delete partner
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      return await getPartnerDetail(id as string, res);
    } else if (req.method === 'PUT') {
      return await updatePartner(id as string, req, res);
    } else if (req.method === 'DELETE') {
      return await deletePartner(id as string, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Partner Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function getPartnerDetail(id: string, res: NextApiResponse) {
  try {
    const partner = await Partner.findByPk(id, {
      include: [
        {
          model: PartnerOutlet,
          as: 'outlets',
          attributes: ['id', 'outlet_name', 'outlet_code', 'city', 'is_active', 'last_sync_at']
        },
        {
          model: PartnerUser,
          as: 'users',
          attributes: ['id', 'name', 'email', 'role', 'is_active', 'last_login_at']
        },
        {
          model: PartnerSubscription,
          as: 'subscriptions',
          include: [{
            model: SubscriptionPackage,
            as: 'package',
            attributes: ['id', 'name', 'price_monthly', 'max_outlets', 'max_users', 'features']
          }],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    return res.status(200).json({
      success: true,
      data: partner
    });
  } catch (error: any) {
    console.error('Get Partner Detail Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch partner details',
      details: error.message
    });
  }
}

async function updatePartner(id: string, req: NextApiRequest, res: NextApiResponse) {
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
    website,
    logo_url
  } = req.body;

  try {
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== partner.email) {
      const existingPartner = await Partner.findOne({ where: { email } });
      if (existingPartner) {
        return res.status(400).json({
          error: 'Email already in use by another partner'
        });
      }
    }

    // Update partner
    await partner.update({
      businessName: business_name || partner.businessName,
      businessType: business_type || partner.businessType,
      ownerName: owner_name || partner.ownerName,
      email: email || partner.email,
      phone: phone !== undefined ? phone : partner.phone,
      address: address !== undefined ? address : partner.address,
      city: city !== undefined ? city : partner.city,
      province: province !== undefined ? province : partner.province,
      postalCode: postal_code !== undefined ? postal_code : partner.postalCode,
      taxId: tax_id !== undefined ? tax_id : partner.taxId,
      website: website !== undefined ? website : partner.website,
      logoUrl: logo_url !== undefined ? logo_url : partner.logoUrl
    });

    return res.status(200).json({
      success: true,
      data: partner,
      message: 'Partner updated successfully'
    });
  } catch (error: any) {
    console.error('Update Partner Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update partner',
      details: error.message
    });
  }
}

async function deletePartner(id: string, res: NextApiResponse) {
  try {
    const partner = await Partner.findByPk(id);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check if partner has active subscriptions
    const activeSubscription = await PartnerSubscription.findOne({
      where: {
        partner_id: id,
        status: 'active'
      }
    });

    if (activeSubscription) {
      return res.status(400).json({
        error: 'Cannot delete partner with active subscription. Please cancel subscription first.'
      });
    }

    await partner.destroy();

    return res.status(200).json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete Partner Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete partner',
      details: error.message
    });
  }
}
