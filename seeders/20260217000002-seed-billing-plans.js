'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('📦 Seeding billing plans...');

    // Create plans
    const plans = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Starter',
        description: 'Perfect for small businesses just getting started',
        price: 299000,
        billing_interval: 'monthly',
        currency: 'IDR',
        trial_days: 14,
        features: {
          pos: true,
          inventory: true,
          kitchen: false,
          tables: false,
          reservations: false,
          finance: false,
          reports: true,
          admin: false,
          support: 'email'
        },
        metadata: {
          badge: 'Popular',
          isPopular: true,
          targetAudience: 'Small Business'
        },
        sort_order: 1,
        max_users: 3,
        max_branches: 1,
        max_products: 100,
        max_transactions: 500
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Professional',
        description: 'Great for growing businesses with multiple locations',
        price: 799000,
        billing_interval: 'monthly',
        currency: 'IDR',
        trial_days: 14,
        features: {
          pos: true,
          inventory: true,
          kitchen: true,
          tables: true,
          reservations: true,
          finance: true,
          reports: true,
          admin: false,
          support: 'priority'
        },
        metadata: {
          badge: 'Best Value',
          isPopular: true,
          targetAudience: 'Growing Business'
        },
        sort_order: 2,
        max_users: 10,
        max_branches: 3,
        max_products: 1000,
        max_transactions: 5000
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Enterprise',
        description: 'Complete solution for large businesses and franchises',
        price: 1999000,
        billing_interval: 'monthly',
        currency: 'IDR',
        trial_days: 30,
        features: {
          pos: true,
          inventory: true,
          kitchen: true,
          tables: true,
          reservations: true,
          finance: true,
          reports: true,
          admin: true,
          support: '24/7',
          api: true,
          custom_branding: true
        },
        metadata: {
          badge: 'Premium',
          isPopular: false,
          targetAudience: 'Enterprise'
        },
        sort_order: 3,
        max_users: -1, // Unlimited
        max_branches: -1, // Unlimited
        max_products: -1, // Unlimited
        max_transactions: -1 // Unlimited
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Starter Annual',
        description: 'Save 20% with annual billing',
        price: 2870400,
        billing_interval: 'yearly',
        currency: 'IDR',
        trial_days: 14,
        features: {
          pos: true,
          inventory: true,
          kitchen: false,
          tables: false,
          reservations: false,
          finance: false,
          reports: true,
          admin: false,
          support: 'email'
        },
        metadata: {
          badge: 'Save 20%',
          isPopular: false,
          targetAudience: 'Small Business',
          savings: 20
        },
        sort_order: 4,
        max_users: 3,
        max_branches: 1,
        max_products: 100,
        max_transactions: 500
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Professional Annual',
        description: 'Save 20% with annual billing',
        price: 7670400,
        billing_interval: 'yearly',
        currency: 'IDR',
        trial_days: 14,
        features: {
          pos: true,
          inventory: true,
          kitchen: true,
          tables: true,
          reservations: true,
          finance: true,
          reports: true,
          admin: false,
          support: 'priority'
        },
        metadata: {
          badge: 'Save 20%',
          isPopular: false,
          targetAudience: 'Growing Business',
          savings: 20
        },
        sort_order: 5,
        max_users: 10,
        max_branches: 3,
        max_products: 1000,
        max_transactions: 5000
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Enterprise Annual',
        description: 'Save 20% with annual billing',
        price: 19190400,
        billing_interval: 'yearly',
        currency: 'IDR',
        trial_days: 30,
        features: {
          pos: true,
          inventory: true,
          kitchen: true,
          tables: true,
          reservations: true,
          finance: true,
          reports: true,
          admin: true,
          support: '24/7',
          api: true,
          custom_branding: true
        },
        metadata: {
          badge: 'Save 20%',
          isPopular: false,
          targetAudience: 'Enterprise',
          savings: 20
        },
        sort_order: 6,
        max_users: -1,
        max_branches: -1,
        max_products: -1,
        max_transactions: -1
      }
    ];

    // Insert plans
    await queryInterface.bulkInsert('plans', plans.map(plan => ({
      ...plan,
      created_at: new Date(),
      updated_at: new Date()
    })));

    // Create plan limits
    const planLimits = [
      // Starter limits
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        plan_id: '550e8400-e29b-41d4-a716-446655440001',
        metric_name: 'users',
        max_value: 3,
        unit: 'users',
        is_soft_limit: false,
        overage_rate: 99000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        plan_id: '550e8400-e29b-41d4-a716-446655440001',
        metric_name: 'branches',
        max_value: 1,
        unit: 'branches',
        is_soft_limit: false,
        overage_rate: 199000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        plan_id: '550e8400-e29b-41d4-a716-446655440001',
        metric_name: 'products',
        max_value: 100,
        unit: 'products',
        is_soft_limit: true,
        overage_rate: 1000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        plan_id: '550e8400-e29b-41d4-a716-446655440001',
        metric_name: 'transactions',
        max_value: 500,
        unit: 'transactions/month',
        is_soft_limit: true,
        overage_rate: 500
      },

      // Professional limits
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        plan_id: '550e8400-e29b-41d4-a716-446655440002',
        metric_name: 'users',
        max_value: 10,
        unit: 'users',
        is_soft_limit: true,
        overage_rate: 79000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440006',
        plan_id: '550e8400-e29b-41d4-a716-446655440002',
        metric_name: 'branches',
        max_value: 3,
        unit: 'branches',
        is_soft_limit: true,
        overage_rate: 249000
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440007',
        plan_id: '550e8400-e29b-41d4-a716-446655440002',
        metric_name: 'products',
        max_value: 1000,
        unit: 'products',
        is_soft_limit: true,
        overage_rate: 500
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440008',
        plan_id: '550e8400-e29b-41d4-a716-446655440002',
        metric_name: 'transactions',
        max_value: 5000,
        unit: 'transactions/month',
        is_soft_limit: true,
        overage_rate: 200
      },

      // Enterprise limits (unlimited)
      {
        id: '660e8400-e29b-41d4-a716-446655440009',
        plan_id: '550e8400-e29b-41d4-a716-446655440003',
        metric_name: 'users',
        max_value: -1, // Unlimited
        unit: 'users',
        is_soft_limit: false,
        overage_rate: null
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440010',
        plan_id: '550e8400-e29b-41d4-a716-446655440003',
        metric_name: 'branches',
        max_value: -1, // Unlimited
        unit: 'branches',
        is_soft_limit: false,
        overage_rate: null
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440011',
        plan_id: '550e8400-e29b-41d4-a716-446655440003',
        metric_name: 'products',
        max_value: -1, // Unlimited
        unit: 'products',
        is_soft_limit: false,
        overage_rate: null
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440012',
        plan_id: '550e8400-e29b-41d4-a716-446655440003',
        metric_name: 'transactions',
        max_value: -1, // Unlimited
        unit: 'transactions/month',
        is_soft_limit: false,
        overage_rate: null
      }
    ];

    // Insert plan limits
    await queryInterface.bulkInsert('plan_limits', planLimits.map(limit => ({
      ...limit,
      created_at: new Date(),
      updated_at: new Date()
    })));

    console.log('✅ Billing plans seeded successfully!');
    console.log('   Plans created:', plans.length);
    console.log('   Plan limits created:', planLimits.length);
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️ Removing billing plans...');
    
    await queryInterface.bulkDelete('plan_limits', {
      plan_id: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005',
        '550e8400-e29b-41d4-a716-446655440006'
      ]
    });

    await queryInterface.bulkDelete('plans', {
      id: [
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005',
        '550e8400-e29b-41d4-a716-446655440006'
      ]
    });

    console.log('✅ Billing plans removed successfully!');
  }
};
