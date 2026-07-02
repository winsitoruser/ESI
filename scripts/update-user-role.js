const db = require('../models');

async function updateSuperAdmin() {
  try {
    // Update user winsitoruser@gmail.com to super_admin role
    const result = await db.User.update(
      { role: 'super_admin' },
      { 
        where: { email: 'winsitoruser@gmail.com' }
      }
    );

    if (result[0] > 0) {
      console.log('✅ User winsitoruser@gmail.com has been updated to super_admin role');
      
      // Verify the update
      const user = await db.User.findOne({
        where: { email: 'winsitoruser@gmail.com' },
        attributes: ['id', 'name', 'email', 'role', 'isActive']
      });
      
      console.log('User details:', {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      });
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    process.exit();
  }
}

updateSuperAdmin();
