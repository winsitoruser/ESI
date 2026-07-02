import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const db = require('../../../models');
const Customer = db.Customer;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      phone,
      phoneNumber, // Support both field names
      email,
      address,
      city,
      province,
      postalCode,
      customerType,
      // Corporate fields
      companyName,
      picName,
      picPosition,
      contact1,
      contact2,
      companyEmail,
      companyAddress,
      taxId,
      // Other fields
      type,
      membershipLevel,
      birthDate,
      gender,
      notes
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nama pelanggan harus diisi'
      });
    }

    const phoneValue = phone || phoneNumber;
    if (!phoneValue) {
      return res.status(400).json({
        success: false,
        error: 'Nomor telepon harus diisi'
      });
    }

    // Validate corporate fields if customerType is corporate
    if (customerType === 'corporate') {
      if (!companyName) {
        return res.status(400).json({
          success: false,
          error: 'Nama perusahaan harus diisi untuk pelanggan corporate'
        });
      }
      if (!picName) {
        return res.status(400).json({
          success: false,
          error: 'Nama PIC harus diisi untuk pelanggan corporate'
        });
      }
    }

    // Check if phone already exists
    const existingCustomer = await Customer.findOne({
      where: { phone: phoneValue }
    });

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        error: 'Nomor telepon sudah terdaftar'
      });
    }

    // Create customer
    const customer = await Customer.create({
      name,
      phone: phoneValue,
      email,
      address,
      city,
      province,
      postalCode,
      customerType: customerType || 'individual',
      companyName,
      picName,
      picPosition,
      contact1,
      contact2,
      companyEmail,
      companyAddress,
      taxId,
      type: type || 'member',
      membershipLevel: membershipLevel || 'Bronze',
      birthDate,
      gender,
      notes,
      status: 'active',
      isActive: true,
      points: 0,
      totalPurchases: 0,
      totalSpent: 0
    });

    return res.status(201).json({
      success: true,
      message: 'Pelanggan berhasil ditambahkan',
      data: customer
    });

  } catch (error: any) {
    console.error('Create Customer API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
