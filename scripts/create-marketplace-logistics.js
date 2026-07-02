/**
 * Migration: Marketplace Logistics System
 * Adds shipping state machine, AWB management, tracking, and courier-specific columns
 */
const sequelize = require('../lib/sequelize');

async function migrate() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  MARKETPLACE LOGISTICS MIGRATION                  ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════
  // 1. Add logistics columns to marketplace_orders
  // ═══════════════════════════════════════════════
  console.log('1/4 Adding logistics columns to marketplace_orders...');
  const columns = [
    { name: 'shipping_method', type: 'VARCHAR(50)', comment: 'pickup / dropoff / cod' },
    { name: 'shipping_provider', type: 'VARCHAR(100)', comment: 'Actual 3PL name (SPX, JNE, AnterAja, etc.)' },
    { name: 'shipping_provider_code', type: 'VARCHAR(50)', comment: 'Platform-specific provider code' },
    { name: 'booking_code', type: 'VARCHAR(100)', comment: 'Marketplace booking/reference code' },
    { name: 'awb_document_url', type: 'TEXT', comment: 'Cached URL to AWB PDF' },
    { name: 'awb_document_base64', type: 'TEXT', comment: 'Base64 AWB for Lazada-style responses' },
    { name: 'awb_document_type', type: 'VARCHAR(20) DEFAULT \'pdf\'', comment: 'pdf / html / image' },
    { name: 'awb_fetched_at', type: 'TIMESTAMP WITH TIME ZONE', comment: 'When AWB was last fetched' },
    { name: 'shipping_state', type: 'VARCHAR(50) DEFAULT \'pending\'', comment: 'State machine: pending → param_checked → arranged → label_ready → picked_up → in_transit → delivered' },
    { name: 'shipping_params', type: 'JSONB DEFAULT \'{}\'', comment: 'Cached shipping parameter from marketplace (pickup/dropoff options, addresses, time slots)' },
    { name: 'pickup_address', type: 'TEXT', comment: 'Seller pickup address' },
    { name: 'pickup_time_slot', type: 'JSONB', comment: '{date, from, to} for scheduled pickup' },
    { name: 'dropoff_info', type: 'JSONB', comment: '{branch_id, counter_name, address} for dropoff' },
    { name: 'estimated_delivery', type: 'TIMESTAMP WITH TIME ZONE', comment: 'Estimated delivery date' },
    { name: 'actual_weight_kg', type: 'DECIMAL(10,2)', comment: 'Actual package weight' },
    { name: 'package_dimensions', type: 'JSONB', comment: '{length, width, height} in cm' },
    { name: 'ship_by_deadline', type: 'TIMESTAMP WITH TIME ZONE', comment: 'Must ship before this time' },
    { name: 'buyer_address_masked', type: 'BOOLEAN DEFAULT false', comment: 'Whether address is redacted by marketplace' },
    { name: 'buyer_phone_masked', type: 'BOOLEAN DEFAULT false', comment: 'Whether phone is redacted by marketplace' },
    { name: 'buyer_address_raw', type: 'TEXT', comment: 'Original (possibly masked) address from marketplace' },
    { name: 'buyer_phone_raw', type: 'VARCHAR(100)', comment: 'Original (possibly masked) phone from marketplace' },
  ];

  for (const col of columns) {
    try {
      await sequelize.query(`ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    } catch (e) { /* column might exist */ }
  }
  console.log(`   ✓ ${columns.length} logistics columns added/verified`);

  // ═══════════════════════════════════════════════
  // 2. Create marketplace_shipment_tracking table
  // ═══════════════════════════════════════════════
  console.log('2/4 Creating marketplace_shipment_tracking...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_shipment_tracking (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
      channel_id INTEGER NOT NULL REFERENCES marketplace_channels(id),
      tenant_id UUID NOT NULL,
      tracking_number VARCHAR(100),
      platform VARCHAR(50) NOT NULL,
      courier VARCHAR(100),
      
      -- Tracking events (array of checkpoints)
      tracking_events JSONB DEFAULT '[]',
      last_event_description TEXT,
      last_event_time TIMESTAMP WITH TIME ZONE,
      last_event_location VARCHAR(255),
      
      -- Status
      logistics_status VARCHAR(50) DEFAULT 'pending',
      -- pending → pickup_scheduled → picked_up → in_transit → out_for_delivery → delivered → returned
      
      -- Pickup info
      pickup_done BOOLEAN DEFAULT false,
      pickup_time TIMESTAMP WITH TIME ZONE,
      
      -- Delivery info
      delivered_time TIMESTAMP WITH TIME ZONE,
      receiver_name VARCHAR(255),
      
      -- POD (Proof of Delivery)
      pod_signature_url TEXT,
      pod_photo_url TEXT,
      
      -- Sync metadata
      last_sync_at TIMESTAMP WITH TIME ZONE,
      sync_count INTEGER DEFAULT 0,
      raw_tracking_data JSONB DEFAULT '{}',
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_tracking_order ON marketplace_shipment_tracking(order_id)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_tracking_number ON marketplace_shipment_tracking(tracking_number)`);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_tracking_status ON marketplace_shipment_tracking(logistics_status)`);
  console.log('   ✓ marketplace_shipment_tracking (+ 3 indexes)');

  // ═══════════════════════════════════════════════
  // 3. Create marketplace_awb_cache table
  // ═══════════════════════════════════════════════
  console.log('3/4 Creating marketplace_awb_cache...');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS marketplace_awb_cache (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
      channel_id INTEGER NOT NULL REFERENCES marketplace_channels(id),
      tenant_id UUID NOT NULL,
      marketplace_order_id VARCHAR(100) NOT NULL,
      tracking_number VARCHAR(100),
      platform VARCHAR(50) NOT NULL,
      
      -- Document data
      document_type VARCHAR(20) DEFAULT 'pdf',
      document_data BYTEA,
      document_base64 TEXT,
      document_url TEXT,
      document_html TEXT,
      
      -- Label format
      label_size VARCHAR(20) DEFAULT '10x15',
      label_format VARCHAR(20) DEFAULT 'thermal',
      
      -- Courier info on label
      courier_name VARCHAR(100),
      courier_code VARCHAR(50),
      sender_name VARCHAR(255),
      sender_address TEXT,
      receiver_name VARCHAR(255),
      receiver_address TEXT,
      
      -- Status
      is_valid BOOLEAN DEFAULT true,
      fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE,
      
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_mp_awb_order ON marketplace_awb_cache(order_id)`);
  await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_awb_unique ON marketplace_awb_cache(order_id, tracking_number) WHERE tracking_number IS NOT NULL`);
  console.log('   ✓ marketplace_awb_cache (+ 2 indexes)');

  // ═══════════════════════════════════════════════
  // 4. Add logistics-related settings
  // ═══════════════════════════════════════════════
  console.log('4/4 Adding logistics settings columns...');
  const settingsCols = [
    { name: 'default_shipping_method', type: 'VARCHAR(50) DEFAULT \'pickup\'' },
    { name: 'auto_arrange_shipment', type: 'BOOLEAN DEFAULT false' },
    { name: 'auto_print_awb', type: 'BOOLEAN DEFAULT false' },
    { name: 'awb_label_size', type: 'VARCHAR(20) DEFAULT \'10x15\'' },
    { name: 'awb_label_format', type: 'VARCHAR(20) DEFAULT \'thermal\'' },
    { name: 'tracking_sync_interval_minutes', type: 'INTEGER DEFAULT 30' },
    { name: 'auto_update_erp_on_delivered', type: 'BOOLEAN DEFAULT true' },
    { name: 'pickup_address_default', type: 'TEXT' },
    { name: 'enable_data_redaction_display', type: 'BOOLEAN DEFAULT true' },
  ];
  for (const col of settingsCols) {
    try {
      await sequelize.query(`ALTER TABLE marketplace_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    } catch (e) { /* column might exist */ }
  }
  console.log(`   ✓ ${settingsCols.length} logistics settings added`);

  // ═══════════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════════
  console.log('\n--- Verification ---');
  for (const t of ['marketplace_shipment_tracking', 'marketplace_awb_cache']) {
    const [r] = await sequelize.query(`SELECT COUNT(*)::int as c FROM ${t}`);
    console.log(`   ${t}: ${r[0].c} rows`);
  }
  const [orderCols] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'marketplace_orders' AND column_name LIKE 'shipping_%' OR column_name LIKE 'awb_%' OR column_name LIKE 'buyer_%_masked' ORDER BY ordinal_position`);
  console.log(`   marketplace_orders logistics columns: ${orderCols.length}`);

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║  LOGISTICS MIGRATION COMPLETE                     ║');
  console.log('║  2 tables created + 30 columns added              ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  await sequelize.close();
}

migrate().catch(e => {
  console.error('MIGRATION FAILED:', e);
  sequelize.close();
  process.exit(1);
});
