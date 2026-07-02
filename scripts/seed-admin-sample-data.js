/**
 * Seed Sample Data for Admin Panel Testing
 * This script creates sample partners, outlets, and activation requests
 */

const db = require('../models');
const { Partner, SubscriptionPackage, PartnerOutlet, ActivationRequest } = db;

async function seedSampleData() {
  try {
    console.log('🌱 Starting to seed sample data for Admin Panel...\n');

    // Get subscription packages
    const packages = await SubscriptionPackage.findAll();
    console.log(`✓ Found ${packages.length} subscription packages\n`);

    // Sample partners data (using camelCase for Sequelize)
    const samplePartners = [
      {
        businessName: 'Apotek Sehat Sentosa',
        businessType: 'pharmacy',
        ownerName: 'Budi Santoso',
        email: 'budi@apoteksehat.com',
        phone: '081234567890',
        address: 'Jl. Sudirman No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12190',
        taxId: '01.234.567.8-901.000',
        status: 'active',
        activationStatus: 'approved',
        activationRequestedAt: new Date('2025-12-01'),
        activationApprovedAt: new Date('2025-12-02'),
        website: 'https://apoteksehat.com'
      },
      {
        businessName: 'Toko Retail Jaya Abadi',
        businessType: 'retail',
        ownerName: 'Siti Nurhaliza',
        email: 'siti@retailjaya.com',
        phone: '082345678901',
        address: 'Jl. Asia Afrika No. 45',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40111',
        taxId: '02.345.678.9-012.000',
        status: 'active',
        activationStatus: 'approved',
        activationRequestedAt: new Date('2025-11-15'),
        activationApprovedAt: new Date('2025-11-16'),
        website: 'https://retailjaya.com'
      },
      {
        businessName: 'Warung Makan Sederhana',
        businessType: 'restaurant',
        ownerName: 'Ahmad Dahlan',
        email: 'ahmad@warungsederhana.com',
        phone: '083456789012',
        address: 'Jl. Malioboro No. 78',
        city: 'Yogyakarta',
        province: 'DI Yogyakarta',
        postalCode: '55271',
        taxId: '03.456.789.0-123.000',
        status: 'pending',
        activationStatus: 'pending',
        activationRequestedAt: new Date()
      },
      {
        businessName: 'Minimarket Berkah',
        businessType: 'retail',
        ownerName: 'Rina Wijaya',
        email: 'rina@minimarketberkah.com',
        phone: '084567890123',
        address: 'Jl. Gatot Subroto No. 234',
        city: 'Surabaya',
        province: 'Jawa Timur',
        postalCode: '60275',
        taxId: '04.567.890.1-234.000',
        status: 'pending',
        activationStatus: 'pending',
        activationRequestedAt: new Date()
      },
      {
        businessName: 'Klinik Sehat Bersama',
        businessType: 'pharmacy',
        ownerName: 'Dr. Hendra Kusuma',
        email: 'hendra@kliniksehat.com',
        phone: '085678901234',
        address: 'Jl. Diponegoro No. 56',
        city: 'Semarang',
        province: 'Jawa Tengah',
        postalCode: '50241',
        taxId: '05.678.901.2-345.000',
        status: 'inactive',
        activationStatus: 'approved',
        activationRequestedAt: new Date('2025-10-01'),
        activationApprovedAt: new Date('2025-10-02')
      }
    ];

    console.log('Creating sample partners...');
    const createdPartners = [];
    
    for (const partnerData of samplePartners) {
      const partner = await Partner.create(partnerData);
      createdPartners.push(partner);
      console.log(`✓ Created partner: ${partner.business_name} (${partner.city})`);
    }

    console.log(`\n✓ Created ${createdPartners.length} partners\n`);

    // Create outlets for active partners
    console.log('Creating sample outlets for active partners...');
    
    const activePartners = createdPartners.filter(p => p.status === 'active');
    let outletCount = 0;

    for (const partner of activePartners) {
      // Create 1-3 outlets per active partner
      const numOutlets = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 1; i <= numOutlets; i++) {
        const outlet = await PartnerOutlet.create({
          partnerId: partner.id,
          outletName: `${partner.businessName} Cabang ${i}`,
          outletCode: `${partner.businessName.substring(0, 3).toUpperCase()}${String(i).padStart(3, '0')}`,
          address: `${partner.address} - Cabang ${i}`,
          city: partner.city,
          province: partner.province,
          phone: partner.phone,
          managerName: `Manager ${i}`,
          isActive: true,
          posDeviceId: `POS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          lastSyncAt: new Date(Date.now() - Math.random() * 3600000) // Random time within last hour
        });
        
        outletCount++;
        console.log(`  ✓ Created outlet: ${outlet.outletName} (${outlet.outletCode})`);
      }
    }

    console.log(`\n✓ Created ${outletCount} outlets\n`);

    // Create activation requests for pending partners
    console.log('Creating activation requests for pending partners...');
    
    const pendingPartners = createdPartners.filter(p => p.activationStatus === 'pending');
    
    for (const partner of pendingPartners) {
      // Randomly assign a package
      const randomPackage = packages[Math.floor(Math.random() * packages.length)];
      
      const activationRequest = await ActivationRequest.create({
        partnerId: partner.id,
        packageId: randomPackage.id,
        businessDocuments: {
          ktp: 'KTP_' + partner.taxId + '.pdf',
          npwp: 'NPWP_' + partner.taxId + '.pdf',
          siup: 'SIUP_' + partner.taxId + '.pdf'
        },
        notes: 'Mohon diproses segera',
        status: 'pending'
      });
      
      console.log(`✓ Created activation request for: ${partner.businessName} (${randomPackage.name} package)`);
    }

    console.log(`\n✓ Created ${pendingPartners.length} activation requests\n`);

    // Summary
    console.log('========================================');
    console.log('✅ Sample data seeding completed!');
    console.log('========================================');
    console.log(`Partners created: ${createdPartners.length}`);
    console.log(`  - Active: ${createdPartners.filter(p => p.status === 'active').length}`);
    console.log(`  - Pending: ${createdPartners.filter(p => p.status === 'pending').length}`);
    console.log(`  - Inactive: ${createdPartners.filter(p => p.status === 'inactive').length}`);
    console.log(`Outlets created: ${outletCount}`);
    console.log(`Activation requests: ${pendingPartners.length}`);
    console.log('========================================\n');

    console.log('You can now access the admin panel at:');
    console.log('  http://localhost:3001/admin\n');

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  }
}

// Run the seed function
seedSampleData()
  .then(() => {
    console.log('✓ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  });
