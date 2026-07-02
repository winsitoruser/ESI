/**
 * Marketplace Integration System — Database Migration
 * Creates all tables needed for production-grade marketplace integration:
 * - marketplace_channels (store connections)
 * - marketplace_credentials (encrypted OAuth tokens)
 * - marketplace_product_mappings (ERP ↔ marketplace product linking)
 * - marketplace_variant_mappings (variant-level mapping)
 * - marketplace_orders (orders from marketplaces)
 * - marketplace_order_items (order line items)
 * - marketplace_sync_logs (API request/response logging)
 * - marketplace_sync_jobs (background job tracking)
 * - marketplace_webhooks (webhook event log with idempotency)
 * - marketplace_settings (per-tenant config: buffer stock, auto-sync)
 */
require('dotenv').config({ path: '.env.development' });
const sequelize = require('../lib/sequelize');

async function migrate() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  MARKETPLACE INTEGRATION — DATABASE MIGRATION     ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════
  // 1. marketplace_channels — Store connections
  // ═══════════════════════════════════════════════
  console.log('1/10 Creating marketplace_channels...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_channels (
      id SERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      platform VARCHAR(50) NOT NULL,
      shop_id VARCHAR(100),
      shop_name VARCHAR(255),
      shop_url VARCHAR(500),
      status VARCHAR(30) DEFAULT 'disconnected',
      is_active BOOLEAN DEFAULT true,
      auto_sync_stock BOOLEAN DEFAULT true,
      auto_sync_price BOOLEAN DEFAULT true,
      auto_sync_order BOOLEAN DEFAULT true,
      auto_accept_order BOOLEAN DEFAULT false,
      sync_interval_minutes INTEGER DEFAULT 15,
      buffer_stock INTEGER DEFAULT 0,
      last_sync_products_at TIMESTAMP WITH TIME ZONE,
      last_sync_stock_at TIMESTAMP WITH TIME ZONE,
      last_sync_orders_at TIMESTAMP WITH TIME ZONE,
      last_sync_price_at TIMESTAMP WITH TIME ZONE,
      connected_at TIMESTAMP WITH TIME ZONE,
      disconnected_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tenant_id, platform, shop_id)
    )
  `);
  console.log('   ✓ marketplace_channels');

  // ═══════════════════════════════════════════════
  // 2. marketplace_credentials — Encrypted OAuth tokens
  // ═══════════════════════════════════════════════
  console.log('2/10 Creating marketplace_credentials...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_credentials (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER NOT NULL REFERENCES marketplace_channels(id) ON DELETE CASCADE,
      credential_type VARCHAR(30) DEFAULT 'oauth2',
      access_token TEXT,
      refresh_token TEXT,
      token_type VARCHAR(30) DEFAULT 'Bearer',
      access_token_expires_at TIMESTAMP WITH TIME ZONE,
      refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
      app_key VARCHAR(255),
      app_secret VARCHAR(255),
      authorization_code TEXT,
      scope TEXT,
      extra_data JSONB DEFAULT '{}',
      last_refreshed_at TIMESTAMP WITH TIME ZONE,
      refresh_failure_count INTEGER DEFAULT 0,
      is_valid BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(channel_id)
    )
  `);
  console.log('   ✓ marketplace_credentials');

  // ═══════════════════════════════════════════════
  // 3. marketplace_product_mappings — ERP ↔ Marketplace product linking
  // ═══════════════════════════════════════════════
  console.log('3/10 Creating marketplace_product_mappings...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_product_mappings (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER NOT NULL REFERENCES marketplace_channels(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      marketplace_product_id VARCHAR(100),
      marketplace_sku VARCHAR(100),
      marketplace_product_name VARCHAR(500),
      marketplace_product_url VARCHAR(500),
      marketplace_category_id VARCHAR(100),
      marketplace_category_name VARCHAR(255),
      status VARCHAR(30) DEFAULT 'mapped',
      sync_status VARCHAR(30) DEFAULT 'pending',
      last_synced_at TIMESTAMP WITH TIME ZONE,
      last_sync_error TEXT,
      price_override DECIMAL(15,2),
      stock_override INTEGER,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(channel_id, product_id),
      UNIQUE(channel_id, marketplace_product_id)
    )
  `);
  console.log('   ✓ marketplace_product_mappings');

  // ═══════════════════════════════════════════════
  // 4. marketplace_variant_mappings — Variant-level mapping
  // ═══════════════════════════════════════════════
  console.log('4/10 Creating marketplace_variant_mappings...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_variant_mappings (
      id SERIAL PRIMARY KEY,
      mapping_id INTEGER NOT NULL REFERENCES marketplace_product_mappings(id) ON DELETE CASCADE,
      product_variant_id INTEGER,
      marketplace_variant_id VARCHAR(100),
      marketplace_variant_sku VARCHAR(100),
      marketplace_variant_name VARCHAR(255),
      variant_attributes JSONB DEFAULT '{}',
      price_override DECIMAL(15,2),
      stock_override INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(mapping_id, marketplace_variant_id)
    )
  `);
  console.log('   ✓ marketplace_variant_mappings');

  // ═══════════════════════════════════════════════
  // 5. marketplace_orders — Orders received from marketplaces
  // ═══════════════════════════════════════════════
  console.log('5/10 Creating marketplace_orders...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_orders (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER NOT NULL REFERENCES marketplace_channels(id),
      tenant_id UUID NOT NULL,
      marketplace_order_id VARCHAR(100) NOT NULL,
      marketplace_order_sn VARCHAR(100),
      erp_order_id INTEGER,
      order_status VARCHAR(50) DEFAULT 'new',
      marketplace_status VARCHAR(100),
      payment_status VARCHAR(50) DEFAULT 'pending',
      payment_method VARCHAR(100),
      buyer_name VARCHAR(255),
      buyer_phone VARCHAR(50),
      buyer_email VARCHAR(255),
      shipping_address TEXT,
      shipping_city VARCHAR(100),
      shipping_province VARCHAR(100),
      shipping_postal_code VARCHAR(20),
      shipping_courier VARCHAR(100),
      shipping_service VARCHAR(100),
      tracking_number VARCHAR(100),
      airway_bill_url TEXT,
      subtotal DECIMAL(15,2) DEFAULT 0,
      shipping_cost DECIMAL(15,2) DEFAULT 0,
      insurance_cost DECIMAL(15,2) DEFAULT 0,
      marketplace_discount DECIMAL(15,2) DEFAULT 0,
      seller_discount DECIMAL(15,2) DEFAULT 0,
      platform_fee DECIMAL(15,2) DEFAULT 0,
      total_amount DECIMAL(15,2) DEFAULT 0,
      seller_payout DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IDR',
      notes TEXT,
      order_placed_at TIMESTAMP WITH TIME ZONE,
      payment_at TIMESTAMP WITH TIME ZONE,
      ship_by_date TIMESTAMP WITH TIME ZONE,
      shipped_at TIMESTAMP WITH TIME ZONE,
      delivered_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      cancel_reason TEXT,
      raw_data JSONB DEFAULT '{}',
      stock_deducted BOOLEAN DEFAULT false,
      erp_synced BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(channel_id, marketplace_order_id)
    )
  `);
  console.log('   ✓ marketplace_orders');

  // ═══════════════════════════════════════════════
  // 6. marketplace_order_items — Order line items
  // ═══════════════════════════════════════════════
  console.log('6/10 Creating marketplace_order_items...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
      product_id INTEGER,
      variant_id INTEGER,
      marketplace_item_id VARCHAR(100),
      marketplace_product_id VARCHAR(100),
      marketplace_sku VARCHAR(100),
      product_name VARCHAR(500),
      variant_name VARCHAR(255),
      quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(15,2) DEFAULT 0,
      discount DECIMAL(15,2) DEFAULT 0,
      subtotal DECIMAL(15,2) DEFAULT 0,
      weight DECIMAL(10,2),
      image_url VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log('   ✓ marketplace_order_items');

  // ═══════════════════════════════════════════════
  // 7. marketplace_sync_logs — API request/response logging
  // ═══════════════════════════════════════════════
  console.log('7/10 Creating marketplace_sync_logs...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_sync_logs (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER REFERENCES marketplace_channels(id),
      tenant_id UUID,
      sync_type VARCHAR(50) NOT NULL,
      direction VARCHAR(10) DEFAULT 'outbound',
      api_endpoint VARCHAR(500),
      http_method VARCHAR(10),
      request_payload JSONB,
      response_payload JSONB,
      http_status INTEGER,
      is_success BOOLEAN DEFAULT false,
      error_message TEXT,
      error_code VARCHAR(50),
      duration_ms INTEGER,
      items_processed INTEGER DEFAULT 0,
      items_success INTEGER DEFAULT 0,
      items_failed INTEGER DEFAULT 0,
      batch_id VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_sync_logs_channel ON marketplace_sync_logs(channel_id, created_at DESC)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_sync_logs_type ON marketplace_sync_logs(sync_type, created_at DESC)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_sync_logs_batch ON marketplace_sync_logs(batch_id)`);
  console.log('   ✓ marketplace_sync_logs (+ 3 indexes)');

  // ═══════════════════════════════════════════════
  // 8. marketplace_sync_jobs — Background job tracking
  // ═══════════════════════════════════════════════
  console.log('8/10 Creating marketplace_sync_jobs...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_sync_jobs (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER REFERENCES marketplace_channels(id),
      tenant_id UUID,
      job_type VARCHAR(50) NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      priority INTEGER DEFAULT 5,
      total_items INTEGER DEFAULT 0,
      processed_items INTEGER DEFAULT 0,
      success_items INTEGER DEFAULT 0,
      failed_items INTEGER DEFAULT 0,
      progress_percent DECIMAL(5,2) DEFAULT 0,
      error_message TEXT,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_jobs_status ON marketplace_sync_jobs(status, scheduled_at)`);
  console.log('   ✓ marketplace_sync_jobs (+ index)');

  // ═══════════════════════════════════════════════
  // 9. marketplace_webhooks — Webhook event log with idempotency
  // ═══════════════════════════════════════════════
  console.log('9/10 Creating marketplace_webhooks...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_webhooks (
      id SERIAL PRIMARY KEY,
      channel_id INTEGER REFERENCES marketplace_channels(id),
      platform VARCHAR(50) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      event_id VARCHAR(255),
      idempotency_key VARCHAR(255),
      payload JSONB NOT NULL DEFAULT '{}',
      http_status_sent INTEGER DEFAULT 200,
      processing_status VARCHAR(30) DEFAULT 'received',
      processed_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      source_ip VARCHAR(50),
      headers JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(platform, idempotency_key)
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_webhooks_event ON marketplace_webhooks(platform, event_type, created_at DESC)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_webhooks_idem ON marketplace_webhooks(idempotency_key)`);
  console.log('   ✓ marketplace_webhooks (+ 2 indexes)');

  // ═══════════════════════════════════════════════
  // 10. marketplace_settings — Per-tenant config
  // ═══════════════════════════════════════════════
  console.log('10/10 Creating marketplace_settings...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_settings (
      id SERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL UNIQUE,
      default_buffer_stock INTEGER DEFAULT 2,
      global_auto_sync BOOLEAN DEFAULT true,
      sync_interval_minutes INTEGER DEFAULT 15,
      auto_accept_orders BOOLEAN DEFAULT false,
      auto_deduct_stock BOOLEAN DEFAULT true,
      auto_push_price BOOLEAN DEFAULT true,
      auto_push_stock BOOLEAN DEFAULT true,
      stock_sync_mode VARCHAR(20) DEFAULT 'realtime',
      price_sync_mode VARCHAR(20) DEFAULT 'manual',
      order_prefix VARCHAR(20) DEFAULT 'MP',
      notification_email VARCHAR(255),
      notification_webhook_url VARCHAR(500),
      rate_limit_per_second INTEGER DEFAULT 5,
      max_retry_attempts INTEGER DEFAULT 3,
      product_name_max_length INTEGER DEFAULT 255,
      product_desc_max_length INTEGER DEFAULT 3000,
      image_max_size_kb INTEGER DEFAULT 2048,
      image_min_width INTEGER DEFAULT 500,
      image_min_height INTEGER DEFAULT 500,
      image_max_width INTEGER DEFAULT 4000,
      image_max_height INTEGER DEFAULT 4000,
      allowed_image_formats JSONB DEFAULT '["jpg","jpeg","png"]',
      webhook_secret VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  console.log('   ✓ marketplace_settings');

  // ═══════════════════════════════════════════════
  // SEED: Marketplace Platform Reference Data
  // ═══════════════════════════════════════════════
  console.log('\n--- Seeding marketplace platform data into integration_providers ---');
  
  const platforms = [
    { code: 'tokopedia', name: 'Tokopedia', color: '#42b549', icon: '🟢', apiBase: 'https://fs.tokopedia.net', docUrl: 'https://developer.tokopedia.com' },
    { code: 'shopee', name: 'Shopee', color: '#ee4d2d', icon: '🟠', apiBase: 'https://partner.shopeemobile.com', docUrl: 'https://open.shopee.com' },
    { code: 'lazada', name: 'Lazada', color: '#0f146d', icon: '🔵', apiBase: 'https://api.lazada.co.id', docUrl: 'https://open.lazada.com' },
    { code: 'bukalapak', name: 'Bukalapak', color: '#e31e52', icon: '🔴', apiBase: 'https://api.bukalapak.com', docUrl: 'https://developer.bukalapak.com' },
    { code: 'tiktok_shop', name: 'TikTok Shop', color: '#000000', icon: '⚫', apiBase: 'https://open-api.tiktokglobalshop.com', docUrl: 'https://partner.tiktokshop.com' },
    { code: 'blibli', name: 'Blibli', color: '#0095da', icon: '🔷', apiBase: 'https://api.blibli.com', docUrl: 'https://seller-api.blibli.com' },
  ];

  for (const p of platforms) {
    try {
      await sequelize.query(`
        INSERT INTO integration_providers (id, code, name, category, description, api_base_url, documentation_url, webhook_supported, is_active, sort_order, features, required_credentials, created_at, updated_at)
        VALUES (gen_random_uuid(), :code, :name, 'marketplace', :desc, :apiBase, :docUrl, true, true, :sort,
          :features::jsonb, :creds::jsonb, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name, api_base_url = EXCLUDED.api_base_url, 
          documentation_url = EXCLUDED.documentation_url, features = EXCLUDED.features,
          required_credentials = EXCLUDED.required_credentials, updated_at = NOW()
      `, {
        replacements: {
          code: p.code,
          name: p.name,
          desc: `Integrasi ${p.name} marketplace untuk sinkronisasi produk, stok, harga, dan pesanan`,
          apiBase: p.apiBase,
          docUrl: p.docUrl,
          sort: platforms.indexOf(p) + 1,
          features: JSON.stringify(['product_sync', 'stock_sync', 'price_sync', 'order_sync', 'webhook', 'shipping_label']),
          creds: JSON.stringify([
            { key: 'app_key', label: 'App Key / Client ID', type: 'text', required: true, encrypted: false },
            { key: 'app_secret', label: 'App Secret / Client Secret', type: 'password', required: true, encrypted: true },
          ])
        }
      });
      console.log(`   ✓ ${p.name}`);
    } catch (e) {
      console.log(`   ⚠ ${p.name}: ${e.message.substring(0, 80)}`);
    }
  }

  // Seed default settings for existing tenants
  console.log('\n--- Seeding default marketplace settings ---');
  try {
    await sequelize.query(`
      INSERT INTO marketplace_settings (tenant_id)
      SELECT id FROM tenants WHERE is_active = true
      ON CONFLICT (tenant_id) DO NOTHING
    `);
    console.log('   ✓ Default settings seeded');
  } catch (e) {
    console.log('   ⚠ Settings seed:', e.message.substring(0, 80));
  }

  // ═══════════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════════
  console.log('\n--- Verification ---');
  const tables = [
    'marketplace_channels', 'marketplace_credentials', 'marketplace_product_mappings',
    'marketplace_variant_mappings', 'marketplace_orders', 'marketplace_order_items',
    'marketplace_sync_logs', 'marketplace_sync_jobs', 'marketplace_webhooks', 'marketplace_settings'
  ];
  for (const t of tables) {
    const [r] = await sequelize.query(`SELECT COUNT(*)::int as c FROM ${t}`);
    console.log(`   ${t}: ${r[0].c} rows`);
  }

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  MIGRATION COMPLETE — 10 tables created           ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  await sequelize.close();
}

migrate().catch(e => {
  console.error('MIGRATION FAILED:', e);
  sequelize.close();
  process.exit(1);
});
