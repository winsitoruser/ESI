import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const getDb = () => require('../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const db = getDb();
    const { businessName, businessTypeCode } = req.body;

    if (!businessName || !businessTypeCode) {
      return res.status(400).json({
        success: false,
        message: 'Business name and type are required'
      });
    }

    // Check if user already has a tenant
    const userId = parseInt(session.user.id);
    const existingUser = await db.User.findByPk(userId);
    
    if (existingUser.tenantId) {
      // User already has a tenant - let them proceed instead of blocking
      return res.status(200).json({
        success: true,
        message: 'Tenant sudah ada, melanjutkan ke KYB',
        data: {
          tenantId: existingUser.tenantId,
          businessName: businessName || 'Existing'
        }
      });
    }

    // Get or create business type
    const businessTypeNames: Record<string, string> = {
      // F&B
      fine_dining: 'Fine Dining',
      casual_dining: 'Casual Dining',
      qsr: 'Quick Service Restaurant',
      cafe: 'Cafe & Coffee Shop',
      cloud_kitchen: 'Cloud Kitchen',
      bakery: 'Bakery & Pastry',
      catering: 'Catering',
      bar_lounge: 'Bar & Lounge',
      // Retail
      retail_general: 'Toko Retail Umum',
      minimarket: 'Minimarket & Supermarket',
      fashion: 'Fashion & Apparel',
      electronics: 'Elektronik & Gadget',
      building_materials: 'Bahan Bangunan',
      pharmacy: 'Apotek & Farmasi',
      bookstore: 'Toko Buku & ATK',
      cosmetics: 'Kosmetik & Skincare',
      jewelry: 'Perhiasan & Aksesoris',
      furniture: 'Furniture & Interior',
      pet_shop: 'Pet Shop',
      florist: 'Florist & Tanaman',
      sporting_goods: 'Peralatan Olahraga',
      toy_store: 'Toko Mainan',
      // Services
      salon_beauty: 'Salon & Kecantikan',
      spa_wellness: 'Spa & Wellness',
      automotive: 'Bengkel & Otomotif',
      laundry: 'Laundry & Dry Cleaning',
      printing: 'Percetakan & Digital Printing',
      photography: 'Studio Foto & Video',
      travel_agency: 'Travel Agent & Tour',
      rental: 'Rental & Persewaan',
      tailor: 'Penjahit / Tailor',
      // Health
      clinic: 'Klinik Kesehatan',
      dental_clinic: 'Klinik Gigi',
      therapy: 'Terapi & Rehabilitasi',
      optical: 'Optik',
      // Education
      school: 'Sekolah & Bimbel',
      training_center: 'Training Center & Kursus',
      daycare: 'Daycare & Penitipan Anak',
      // Hospitality
      hotel: 'Hotel & Penginapan',
      kost: 'Kos-kosan & Guest House',
      coworking: 'Co-working Space',
      event_venue: 'Venue & Event Organizer',
      // Distribution
      distributor: 'Distributor',
      wholesale: 'Grosir / Wholesaler',
      supplier: 'Supplier Bahan Baku',
      // Manufacturing
      manufacturing: 'Manufaktur Umum',
      food_manufacturing: 'Manufaktur Makanan',
      garment: 'Garment & Konveksi',
      workshop: 'Workshop & Kerajinan',
      // Agriculture
      agriculture: 'Pertanian & Perkebunan',
      livestock: 'Peternakan',
      fishery: 'Perikanan',
      // Digital
      software_house: 'Software House / IT Services',
      digital_agency: 'Digital Agency & Marketing',
      ecommerce: 'E-Commerce / Online Store',
      // Other
      construction: 'Konstruksi & Kontraktor',
      logistics: 'Logistik & Ekspedisi',
      cleaning_service: 'Cleaning Service',
      professional_services: 'Jasa Profesional',
      other: 'Lainnya',
      // Legacy codes
      retail: 'Retail',
      fnb: 'Food & Beverage',
      hybrid: 'Hybrid',
      bengkel: 'Bengkel & Otomotif',
      salon: 'Salon & Kecantikan',
    };

    const [businessType] = await db.BusinessType.findOrCreate({
      where: { code: businessTypeCode },
      defaults: {
        code: businessTypeCode,
        name: businessTypeNames[businessTypeCode] || businessTypeCode,
        description: `Jenis bisnis: ${businessTypeNames[businessTypeCode] || businessTypeCode}`,
        isActive: true,
      }
    });

    console.log('[Create Tenant] BusinessType:', businessType.code, businessType.id);

    // Generate unique tenant code from business name
    const baseCode = businessName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);
    const uniqueSuffix = Date.now().toString(36).toUpperCase().slice(-4);
    const tenantCode = `${baseCode || 'TNT'}-${uniqueSuffix}`;

    // Create tenant
    // status must be one of: 'active','inactive','suspended','trial' (DB ENUM)
    // onboardingStep must be INTEGER (DB column is int4)
    // code is NOT NULL in DB
    const tenant = await db.Tenant.create({
      businessName,
      businessTypeId: businessType.id,
      name: businessName,
      code: tenantCode,
      status: 'trial',
      isActive: true,
      setupCompleted: false,
      businessStructure: 'single_outlet',
      isHq: false,
      onboardingStep: 1
    });

    // Update user with tenant
    await existingUser.update({
      tenantId: tenant.id
    });

    // Create initial KYB application
    await db.KybApplication.create({
      userId,
      tenantId: tenant.id,
      status: 'draft',
      currentStep: 1,
      completionPercentage: 0
    });

    return res.status(200).json({
      success: true,
      message: 'Tenant created successfully',
      data: {
        tenantId: tenant.id,
        businessName: tenant.businessName
      }
    });
  } catch (error: any) {
    console.error('Create tenant error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create tenant'
    });
  }
}
