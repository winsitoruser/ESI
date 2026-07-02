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

  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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

    const customer = await Customer.findOne({ where: { id } });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const {
      name,
      phone,
      phoneNumber,
      email,
      address,
      city,
      province,
      postalCode,
      customerType,
      companyName,
      picName,
      picPosition,
      contact1,
      contact2,
      companyEmail,
      companyAddress,
      taxId,
      type,
      status,
      membershipLevel,
      birthDate,
      gender,
      notes,
      discount,
      isActive
    } = req.body;

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

    // Check if phone is being changed and if it's already taken
    const phoneValue = phone || phoneNumber;
    if (phoneValue && phoneValue !== customer.phone) {
      const existingCustomer = await Customer.findOne({
        where: { 
          phone: phoneValue,
          id: { [db.Sequelize.Op.ne]: id }
        }
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          error: 'Nomor telepon sudah digunakan oleh pelanggan lain'
        });
      }
    }

    // Update customer
    await customer.update({
      ...(name && { name }),
      ...(phoneValue && { phone: phoneValue }),
      ...(email !== undefined && { email }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(province !== undefined && { province }),
      ...(postalCode !== undefined && { postalCode }),
      ...(customerType && { customerType }),
      ...(companyName !== undefined && { companyName }),
      ...(picName !== undefined && { picName }),
      ...(picPosition !== undefined && { picPosition }),
      ...(contact1 !== undefined && { contact1 }),
      ...(contact2 !== undefined && { contact2 }),
      ...(companyEmail !== undefined && { companyEmail }),
      ...(companyAddress !== undefined && { companyAddress }),
      ...(taxId !== undefined && { taxId }),
      ...(type && { type }),
      ...(status && { status }),
      ...(membershipLevel && { membershipLevel }),
      ...(birthDate !== undefined && { birthDate }),
      ...(gender !== undefined && { gender }),
      ...(notes !== undefined && { notes }),
      ...(discount !== undefined && { discount }),
      ...(isActive !== undefined && { isActive })
    });

    // Fetch updated customer
    const updatedCustomer = await Customer.findOne({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Customer berhasil diupdate',
      data: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        phoneNumber: updatedCustomer.phone,
        email: updatedCustomer.email,
        address: updatedCustomer.address,
        city: updatedCustomer.city,
        province: updatedCustomer.province,
        postalCode: updatedCustomer.postalCode,
        type: updatedCustomer.type,
        customerType: updatedCustomer.customerType,
        companyName: updatedCustomer.companyName,
        picName: updatedCustomer.picName,
        picPosition: updatedCustomer.picPosition,
        contact1: updatedCustomer.contact1,
        contact2: updatedCustomer.contact2,
        companyEmail: updatedCustomer.companyEmail,
        companyAddress: updatedCustomer.companyAddress,
        taxId: updatedCustomer.taxId,
        status: updatedCustomer.status,
        membershipLevel: updatedCustomer.membershipLevel,
        points: updatedCustomer.points,
        discount: parseFloat(updatedCustomer.discount),
        totalPurchases: updatedCustomer.totalPurchases,
        totalSpent: parseFloat(updatedCustomer.totalSpent),
        lastVisit: updatedCustomer.lastVisit,
        birthDate: updatedCustomer.birthDate,
        gender: updatedCustomer.gender,
        notes: updatedCustomer.notes,
        isActive: updatedCustomer.isActive,
        createdAt: updatedCustomer.createdAt,
        updatedAt: updatedCustomer.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Update Customer API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
