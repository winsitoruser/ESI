'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get first partner for sample data
    const partners = await queryInterface.sequelize.query(
      `SELECT id FROM partners LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (partners.length === 0) {
      console.log('No partners found. Skipping integration seeding.');
      return;
    }

    const partnerId = partners[0].id;

    // Sample integrations
    const integrations = [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        partner_id: partnerId,
        integration_type: 'payment_gateway',
        provider: 'midtrans',
        is_active: true,
        test_mode: true,
        configuration: JSON.stringify({
          serverKey: 'SB-Mid-server-xxxxxxxxxx',
          clientKey: 'SB-Mid-client-xxxxxxxxxx',
          merchantId: 'G123456789'
        }),
        last_test_status: 'success',
        last_tested_at: new Date(),
        last_test_message: 'Connection successful',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        partner_id: partnerId,
        integration_type: 'payment_gateway',
        provider: 'xendit',
        is_active: false,
        test_mode: true,
        configuration: JSON.stringify({
          apiKey: 'xnd_development_xxxxxxxxxx',
          webhookToken: 'webhook_token_xxx'
        }),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        partner_id: partnerId,
        integration_type: 'whatsapp',
        provider: 'twilio',
        is_active: true,
        test_mode: false,
        configuration: JSON.stringify({
          accountSid: 'ACxxxxxxxxxxxxxxxx',
          authToken: 'your_auth_token',
          phoneNumber: '+62812345678'
        }),
        last_test_status: 'success',
        last_tested_at: new Date(Date.now() - 86400000), // 1 day ago
        last_test_message: 'WhatsApp connection verified',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        partner_id: partnerId,
        integration_type: 'email_smtp',
        provider: 'smtp',
        is_active: true,
        test_mode: false,
        configuration: JSON.stringify({
          host: 'smtp.gmail.com',
          port: 587,
          username: 'noreply@bedagang.com',
          password: 'app_password_xxx',
          fromEmail: 'noreply@bedagang.com',
          fromName: 'Bedagang POS'
        }),
        last_test_status: 'success',
        last_tested_at: new Date(Date.now() - 3600000), // 1 hour ago
        last_test_message: 'SMTP connection successful',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('partner_integrations', integrations);
    console.log('✅ Sample integrations created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('partner_integrations', null, {});
  }
};
