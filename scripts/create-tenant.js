const db = require('../models');
const { v4: uuidv4 } = require('uuid');

async function createTenant() {
  try {
    // Get user
    const user = await db.User.findOne({
      where: { email: 'winsitoruser@gmail.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    // Create tenant
    const tenant = await db.Tenant.create({
      id: uuidv4(),
      businessName: 'F&B Business',
      businessAddress: 'Jakarta, Indonesia',
      businessPhone: '+628123456789',
      businessEmail: 'winsitoruser@gmail.com',
      setupCompleted: true,
      onboardingStep: 'completed'
    });

    // Update user with tenant
    await user.update({ tenantId: tenant.id });

    console.log('✅ Tenant created successfully!');
    console.log('Tenant ID:', tenant.id);
    console.log('User updated with tenant ID');

  } catch (error) {
    console.error('Error creating tenant:', error);
  } finally {
    process.exit();
  }
}

createTenant();
