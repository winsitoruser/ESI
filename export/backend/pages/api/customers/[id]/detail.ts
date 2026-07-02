import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const db = require('../../../../models');
const Customer = db.Customer;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required'
      });
    }

    const customer = await Customer.findOne({
      where: { id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        phoneNumber: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        province: customer.province,
        postalCode: customer.postalCode,
        type: customer.type,
        customerType: customer.customerType,
        companyName: customer.companyName,
        picName: customer.picName,
        picPosition: customer.picPosition,
        contact1: customer.contact1,
        contact2: customer.contact2,
        companyEmail: customer.companyEmail,
        companyAddress: customer.companyAddress,
        taxId: customer.taxId,
        status: customer.status,
        membershipLevel: customer.membershipLevel,
        points: customer.points,
        loyaltyPoints: customer.points,
        discount: parseFloat(customer.discount),
        totalPurchases: customer.totalPurchases,
        totalSpent: parseFloat(customer.totalSpent),
        lastVisit: customer.lastVisit,
        birthDate: customer.birthDate,
        gender: customer.gender,
        notes: customer.notes,
        isActive: customer.isActive,
        registrationDate: customer.createdAt,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Get Customer Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
