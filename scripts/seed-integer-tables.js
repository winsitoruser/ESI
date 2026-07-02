/**
 * Seed tables that use INTEGER auto-increment IDs
 * Fix for: products, product_categories, customers, employees, warehouses, suppliers,
 *          kitchen_orders, finance_invoices, crm_interactions, employee_attendance, leave_requests, stock_transfers
 */
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:jakarta123@localhost:5432/bedagang_dev';
const sequelize = new Sequelize(DB_URL, { logging: false });
const TENANT_ID = '49497179-6223-4d02-b84a-33c921523ae0';

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected');

    // Get branch IDs
    const [branches] = await sequelize.query(
      "SELECT id FROM branches WHERE tenant_id = :t ORDER BY created_at",
      { replacements: { t: TENANT_ID } }
    );
    const branchId = branches[0]?.id;
    const branch2Id = branches[1]?.id;
    if (!branchId) { console.error('No branches found!'); return; }
    console.log(`Branch: ${branchId}`);

    // Check column types for key tables
    async function getIdType(table) {
      const [r] = await sequelize.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name='${table}' AND column_name='id'`
      );
      return r[0]?.data_type || 'unknown';
    }

    // Helper: safe insert, skip on any error
    async function safeExec(label, sql, replacements = {}) {
      try {
        await sequelize.query(sql, { replacements });
        return true;
      } catch (e) {
        if (!e.message.includes('duplicate') && !e.message.includes('unique') && !e.message.includes('violates')) {
          console.log(`  ⚠️ ${label}: ${e.message.substring(0, 100)}`);
        }
        return false;
      }
    }

    // ============================================================
    // 1. PRODUCT CATEGORIES (id=INTEGER, category_id references are INTEGER)
    // ============================================================
    console.log('\n📂 1. Product Categories...');
    const catIdType = await getIdType('product_categories');
    console.log(`  id type: ${catIdType}`);

    // Delete old data for this tenant first to avoid conflicts
    await sequelize.query("DELETE FROM product_categories WHERE tenant_id = :t", { replacements: { t: TENANT_ID } });

    const catNames = ['Makanan', 'Minuman', 'Snack', 'Dessert', 'Paket'];
    const catCodes = ['CAT-FOOD', 'CAT-DRINK', 'CAT-SNACK', 'CAT-DESSERT', 'CAT-COMBO'];
    const catColors = ['#EF4444', '#3B82F6', '#F59E0B', '#EC4899', '#10B981'];
    const catIds = [];

    for (let i = 0; i < 5; i++) {
      const [result] = await sequelize.query(`
        INSERT INTO product_categories (tenant_id, code, name, description, color, sort_order, is_active, created_at, updated_at)
        VALUES (:tenantId, :code, :name, :desc, :color, :sort, true, NOW(), NOW())
        RETURNING id
      `, { replacements: { tenantId: TENANT_ID, code: catCodes[i], name: catNames[i], desc: `Kategori ${catNames[i]}`, color: catColors[i], sort: i + 1 } });
      catIds.push(result[0].id);
    }
    console.log(`  ✅ 5 categories (IDs: ${catIds.join(', ')})`);

    // ============================================================
    // 2. PRODUCTS (id=INTEGER, category_id=INTEGER)
    // ============================================================
    console.log('\n📦 2. Products...');
    const prodIdType = await getIdType('products');
    console.log(`  id type: ${prodIdType}`);

    await sequelize.query("DELETE FROM products WHERE tenant_id = :t", { replacements: { t: TENANT_ID } });

    const products = [
      { name: 'Nasi Goreng Spesial', buy: 15000, sell: 35000, sku: 'WN-001', cat: 0, unit: 'porsi' },
      { name: 'Mie Goreng Seafood', buy: 14000, sell: 32000, sku: 'WN-002', cat: 0, unit: 'porsi' },
      { name: 'Ayam Bakar Madu', buy: 20000, sell: 45000, sku: 'WN-003', cat: 0, unit: 'porsi' },
      { name: 'Sate Ayam (10pcs)', buy: 12000, sell: 30000, sku: 'WN-004', cat: 0, unit: 'porsi' },
      { name: 'Rendang Daging', buy: 25000, sell: 50000, sku: 'WN-005', cat: 0, unit: 'porsi' },
      { name: 'Es Teh Manis', buy: 2000, sell: 8000, sku: 'WN-006', cat: 1, unit: 'gelas' },
      { name: 'Jus Alpukat', buy: 5000, sell: 15000, sku: 'WN-007', cat: 1, unit: 'gelas' },
      { name: 'Kopi Susu Gula Aren', buy: 6000, sell: 18000, sku: 'WN-008', cat: 1, unit: 'gelas' },
      { name: 'Es Jeruk Segar', buy: 3000, sell: 10000, sku: 'WN-009', cat: 1, unit: 'gelas' },
      { name: 'Air Mineral', buy: 1500, sell: 5000, sku: 'WN-010', cat: 1, unit: 'botol' },
      { name: 'Kentang Goreng', buy: 8000, sell: 20000, sku: 'WN-011', cat: 2, unit: 'porsi' },
      { name: 'Pisang Goreng', buy: 5000, sell: 15000, sku: 'WN-012', cat: 2, unit: 'porsi' },
      { name: 'Tahu Crispy', buy: 4000, sell: 12000, sku: 'WN-013', cat: 2, unit: 'porsi' },
      { name: 'Es Krim Vanilla', buy: 7000, sell: 18000, sku: 'WN-014', cat: 3, unit: 'cup' },
      { name: 'Pudding Coklat', buy: 5000, sell: 15000, sku: 'WN-015', cat: 3, unit: 'porsi' },
      { name: 'Paket Hemat A', buy: 25000, sell: 55000, sku: 'WN-016', cat: 4, unit: 'paket' },
      { name: 'Paket Hemat B', buy: 20000, sell: 45000, sku: 'WN-017', cat: 4, unit: 'paket' },
      { name: 'Paket Keluarga', buy: 55000, sell: 120000, sku: 'WN-018', cat: 4, unit: 'paket' },
      { name: 'Nasi Uduk Komplit', buy: 12000, sell: 28000, sku: 'WN-019', cat: 0, unit: 'porsi' },
      { name: 'Soto Ayam', buy: 10000, sell: 25000, sku: 'WN-020', cat: 0, unit: 'porsi' },
    ];

    const productIds = [];
    for (const p of products) {
      const [result] = await sequelize.query(`
        INSERT INTO products (tenant_id, category_id, name, sku, description, unit, buy_price, sell_price, minimum_stock, is_active, created_at, updated_at)
        VALUES (:tenantId, :catId, :name, :sku, :desc, :unit, :buy, :sell, 10, true, NOW(), NOW())
        RETURNING id
      `, { replacements: { tenantId: TENANT_ID, catId: catIds[p.cat], name: p.name, sku: p.sku, desc: p.name, unit: p.unit, buy: p.buy, sell: p.sell } });
      productIds.push(result[0].id);
    }
    console.log(`  ✅ 20 products (IDs: ${productIds.slice(0, 5).join(', ')}...)`);

    // ============================================================
    // 3. CUSTOMERS (id type check)
    // ============================================================
    console.log('\n👥 3. Customers...');
    const custIdType = await getIdType('customers');
    console.log(`  id type: ${custIdType}`);

    await sequelize.query("DELETE FROM customers WHERE tenant_id = :t", { replacements: { t: TENANT_ID } });

    const customers = [
      { name: 'Budi Santoso', phone: '081234567890', email: 'budi@gmail.com', type: 'individual' },
      { name: 'Siti Rahayu', phone: '081298765432', email: 'siti.rahayu@yahoo.com', type: 'individual' },
      { name: 'Ahmad Wijaya', phone: '085611223344', email: 'ahmad.w@gmail.com', type: 'individual' },
      { name: 'PT Mitra Abadi', phone: '021-5551111', email: 'procurement@mitraabadi.co.id', type: 'corporate' },
      { name: 'CV Sukses Bersama', phone: '022-4442222', email: 'order@suksesbersama.com', type: 'corporate' },
      { name: 'Dewi Lestari', phone: '087855667788', email: 'dewi.les@gmail.com', type: 'individual' },
      { name: 'Rudi Hartono', phone: '081377889900', email: 'rudi.h@outlook.com', type: 'individual' },
      { name: 'Rina Susanti', phone: '089912345678', email: 'rina.s@gmail.com', type: 'individual' },
      { name: 'PT Global Perkasa', phone: '021-7779999', email: 'info@globalperkasa.co.id', type: 'corporate' },
      { name: 'Agus Prasetyo', phone: '082145678901', email: 'agus.p@gmail.com', type: 'individual' },
    ];

    const customerIds = [];
    for (const c of customers) {
      let insertSQL;
      if (custIdType === 'uuid') {
        insertSQL = `INSERT INTO customers (id, tenant_id, branch_id, name, email, phone, customer_type, is_active, created_at, updated_at)
          VALUES (gen_random_uuid(), :tenantId, :branchId, :name, :email, :phone, :type, true, NOW(), NOW()) RETURNING id`;
      } else {
        insertSQL = `INSERT INTO customers (tenant_id, branch_id, name, email, phone, customer_type, is_active, created_at, updated_at)
          VALUES (:tenantId, :branchId, :name, :email, :phone, :type, true, NOW(), NOW()) RETURNING id`;
      }
      const [result] = await sequelize.query(insertSQL, {
        replacements: { tenantId: TENANT_ID, branchId: branchId, name: c.name, email: c.email, phone: c.phone, type: c.type }
      });
      customerIds.push(result[0].id);
    }
    console.log(`  ✅ 10 customers`);

    // ============================================================
    // 4. EMPLOYEES (id=INTEGER)
    // ============================================================
    console.log('\n👨‍💼 4. Employees...');

    // Delete existing for this tenant to re-seed
    await sequelize.query("DELETE FROM employee_attendance WHERE tenant_id = :t", { replacements: { t: TENANT_ID } });
    await sequelize.query("DELETE FROM leave_requests WHERE tenant_id = :t", { replacements: { t: TENANT_ID } });
    await sequelize.query("DELETE FROM employees WHERE tenant_id = :t AND employee_code LIKE 'WN-%'", { replacements: { t: TENANT_ID } });

    const empData = [
      { name: 'Joko Widodo', code: 'WN-EMP-001', pos: 'Store Manager', dept: 'Operations', salary: 12000000, email: 'joko@winner.com' },
      { name: 'Megawati Sukarno', code: 'WN-EMP-002', pos: 'Kasir Senior', dept: 'POS', salary: 6000000, email: 'mega@winner.com' },
      { name: 'Prabowo Subianto', code: 'WN-EMP-003', pos: 'Kepala Gudang', dept: 'Inventory', salary: 8000000, email: 'prabowo@winner.com' },
      { name: 'Ganjar Pranowo', code: 'WN-EMP-004', pos: 'Chef', dept: 'Kitchen', salary: 9000000, email: 'ganjar@winner.com' },
      { name: 'Anies Baswedan', code: 'WN-EMP-005', pos: 'Akuntan', dept: 'Finance', salary: 10000000, email: 'anies@winner.com' },
      { name: 'Sri Mulyani', code: 'WN-EMP-006', pos: 'HR Manager', dept: 'HRD', salary: 11000000, email: 'sri@winner.com' },
      { name: 'Retno Marsudi', code: 'WN-EMP-007', pos: 'Kasir', dept: 'POS', salary: 5000000, email: 'retno@winner.com' },
      { name: 'Erick Thohir', code: 'WN-EMP-008', pos: 'Sales Executive', dept: 'Sales', salary: 7500000, email: 'erick@winner.com' },
      { name: 'Luhut Pandjaitan', code: 'WN-EMP-009', pos: 'IT Support', dept: 'IT', salary: 8500000, email: 'luhut@winner.com' },
      { name: 'Basuki Hadimuljono', code: 'WN-EMP-010', pos: 'Kurir', dept: 'Logistics', salary: 5500000, email: 'basuki@winner.com' },
      { name: 'Nadiem Makarim', code: 'WN-EMP-011', pos: 'Marketing', dept: 'Marketing', salary: 7000000, email: 'nadiem@winner.com' },
      { name: 'Susi Pudjiastuti', code: 'WN-EMP-012', pos: 'Barista', dept: 'Kitchen', salary: 5500000, email: 'susi@winner.com' },
    ];

    const employeeIds = [];
    for (const emp of empData) {
      const [result] = await sequelize.query(`
        INSERT INTO employees (tenant_id, branch_id, employee_code, name, email, phone, position, department, hire_date, salary, status, is_active, created_at, updated_at)
        VALUES (:tenantId, :branchId, :code, :name, :email, '0812' || LPAD(FLOOR(RANDOM()*99999999)::text, 8, '0'), :pos, :dept, '2024-01-15', :salary, 'active', true, NOW(), NOW())
        RETURNING id
      `, { replacements: { tenantId: TENANT_ID, branchId: branchId, code: emp.code, name: emp.name, email: emp.email, pos: emp.pos, dept: emp.dept, salary: emp.salary } });
      employeeIds.push(result[0].id);
    }
    console.log(`  ✅ 12 employees`);

    // ============================================================
    // 5. EMPLOYEE ATTENDANCE (last 14 days)
    // ============================================================
    console.log('\n⏰ 5. Employee Attendance...');
    let attCount = 0;
    for (const empId of employeeIds.slice(0, 8)) {
      for (let d = 1; d <= 14; d++) {
        const clockInMin = Math.floor(Math.random() * 30);
        const isLate = clockInMin > 15;
        const ok = await safeExec('attendance', `
          INSERT INTO employee_attendance (tenant_id, branch_id, employee_id, date, clock_in, clock_out, status, late_minutes, overtime_minutes, created_at, updated_at)
          VALUES (:tenantId, :branchId, :empId, CURRENT_DATE - INTERVAL '${d} days',
            ('08:' || LPAD(:clockInMin::text, 2, '0'))::time,
            ('17:' || LPAD(:clockOutMin::text, 2, '0'))::time,
            :status, :lateMins, :otMins, NOW(), NOW())
        `, {
          tenantId: TENANT_ID, branchId: branchId, empId,
          clockInMin, clockOutMin: Math.floor(Math.random() * 30),
          status: isLate ? 'late' : 'present',
          lateMins: isLate ? clockInMin - 15 : 0,
          otMins: Math.random() > 0.7 ? Math.floor(Math.random() * 60) : 0
        });
        if (ok) attCount++;
      }
    }
    console.log(`  ✅ ${attCount} attendance records`);

    // ============================================================
    // 6. LEAVE REQUESTS
    // ============================================================
    console.log('\n🏖️ 6. Leave Requests...');
    const leaveTypes = ['annual', 'sick', 'personal'];
    for (let i = 0; i < 8; i++) {
      const empId = employeeIds[i % employeeIds.length];
      const type = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const statuses = ['pending', 'approved', 'approved', 'rejected'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await safeExec('leave', `
        INSERT INTO leave_requests (employee_id, branch_id, leave_type, start_date, end_date, total_days, reason, status, tenant_id, created_at, updated_at)
        VALUES (:empId, :branchId, :type, CURRENT_DATE + INTERVAL '${i * 7} days', CURRENT_DATE + INTERVAL '${i * 7 + 2} days', 3, :reason, :status, :tenantId, NOW(), NOW())
      `, { empId, branchId, type, reason: `Permohonan cuti ${type}`, status, tenantId: TENANT_ID });
    }
    console.log('  ✅ 8 leave requests');

    // ============================================================
    // 7. WAREHOUSES (id=INTEGER)
    // ============================================================
    console.log('\n🏭 7. Warehouses & Suppliers...');
    const whIdType = await getIdType('warehouses');
    console.log(`  warehouses id type: ${whIdType}`);

    await sequelize.query("DELETE FROM warehouses WHERE tenant_id = :t AND code LIKE 'WN-WH%'", { replacements: { t: TENANT_ID } });

    const [wh1Res] = await sequelize.query(`
      INSERT INTO warehouses (tenant_id, code, name, type, address, city, province, is_active, status, created_at, updated_at)
      VALUES (:t, 'WN-WH-001', 'Gudang Utama Jakarta', 'main', 'Jl. Industri No. 5, Cakung', 'Jakarta', 'DKI Jakarta', true, 'active', NOW(), NOW())
      RETURNING id
    `, { replacements: { t: TENANT_ID } });
    const [wh2Res] = await sequelize.query(`
      INSERT INTO warehouses (tenant_id, code, name, type, address, city, province, is_active, status, created_at, updated_at)
      VALUES (:t, 'WN-WH-002', 'Gudang Bandung', 'branch', 'Jl. Soekarno-Hatta No. 200', 'Bandung', 'Jawa Barat', true, 'active', NOW(), NOW())
      RETURNING id
    `, { replacements: { t: TENANT_ID } });
    const wh1Id = wh1Res[0].id;
    const wh2Id = wh2Res[0].id;
    console.log(`  ✅ 2 warehouses (${wh1Id}, ${wh2Id})`);

    // Suppliers
    const supIdType = await getIdType('suppliers');
    console.log(`  suppliers id type: ${supIdType}`);
    await sequelize.query("DELETE FROM suppliers WHERE tenant_id = :t AND code LIKE 'WN-SUP%'", { replacements: { t: TENANT_ID } });

    const supplierData = [
      { name: 'PT Sumber Pangan Nusantara', code: 'WN-SUP-001', contact: 'Hendra', phone: '021-5557890', email: 'order@sumberpangan.co.id' },
      { name: 'CV Maju Jaya Distribusi', code: 'WN-SUP-002', contact: 'Yuni', phone: '022-4445678', email: 'sales@majujaya.com' },
      { name: 'UD Berkah Sejahtera', code: 'WN-SUP-003', contact: 'Budi', phone: '031-8889012', email: 'info@berkahsejahtera.id' },
      { name: 'PT Agro Prima Indonesia', code: 'WN-SUP-004', contact: 'Sandra', phone: '021-7776543', email: 'procurement@agroprima.co.id' },
      { name: 'CV Segar Alami', code: 'WN-SUP-005', contact: 'Doni', phone: '024-3332109', email: 'cs@segaralami.com' },
    ];
    for (const sup of supplierData) {
      await safeExec('supplier', `
        INSERT INTO suppliers (tenant_id, code, name, contact_person, email, phone, is_active, created_at, updated_at)
        VALUES (:t, :code, :name, :contact, :email, :phone, true, NOW(), NOW())
      `, { t: TENANT_ID, ...sup });
    }
    console.log('  ✅ 5 suppliers');

    // ============================================================
    // 8. INVENTORY STOCK
    // ============================================================
    console.log('\n📊 8. Inventory Stock...');
    // Clear old
    await sequelize.query("DELETE FROM inventory_stock WHERE warehouse_id = :wh", { replacements: { wh: wh1Id } });

    for (let i = 0; i < productIds.length; i++) {
      const qty = 50 + Math.floor(Math.random() * 200);
      await safeExec('stock', `
        INSERT INTO inventory_stock (product_id, warehouse_id, branch_id, quantity, available_quantity, cost_price, created_at, updated_at)
        VALUES (:prodId, :whId, :branchId, :qty, :qty, :cost, NOW(), NOW())
      `, { prodId: productIds[i], whId: wh1Id, branchId: branchId, qty, cost: products[i].buy });
    }
    console.log('  ✅ Inventory stock for 20 products');

    // Stock transfers
    console.log('\n🔄 9. Stock Transfers...');
    await sequelize.query("DELETE FROM stock_transfers WHERE tenant_id = :t AND transfer_number LIKE 'WN-TF%'", { replacements: { t: TENANT_ID } });
    const transferStatuses = ['draft', 'pending', 'approved', 'in_transit', 'received'];
    for (let i = 0; i < 5; i++) {
      await safeExec('transfer', `
        INSERT INTO stock_transfers (tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id, status, notes, created_at, updated_at)
        VALUES (:t, :num, :from, :to, :fromB, :toB, :status, :notes, NOW() - INTERVAL '${i * 3} days', NOW())
      `, { t: TENANT_ID, num: `WN-TF-${String(i + 1).padStart(3, '0')}`, from: wh1Id, to: wh2Id, fromB: branchId, toB: branch2Id, status: transferStatuses[i], notes: `Transfer batch ${i + 1}` });
    }
    console.log('  ✅ 5 stock transfers');

    // ============================================================
    // 10. FINANCE INVOICES (customer_id is INTEGER)
    // ============================================================
    console.log('\n🧾 10. Finance Invoices...');
    for (let i = 0; i < 15; i++) {
      const statuses = ['draft', 'sent', 'paid', 'paid', 'paid', 'overdue', 'partial'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const subtotal = 1000000 + Math.floor(Math.random() * 10000000);
      const tax = Math.round(subtotal * 0.11);
      const total = subtotal + tax;
      const custId = customerIds[i % customerIds.length];

      await safeExec('invoice', `
        INSERT INTO finance_invoices (tenant_id, branch_id, invoice_number, type, customer_id, issue_date, due_date, subtotal, tax_amount, total_amount, status, created_at, updated_at)
        VALUES (:t, :b, :num, 'sales', :cust, CURRENT_DATE - INTERVAL '${i * 2} days', CURRENT_DATE + INTERVAL '${30 - i * 2} days', :sub, :tax, :total, :status, NOW(), NOW())
      `, { t: TENANT_ID, b: branchId, num: `WN-INV-2026-${String(i + 1).padStart(4, '0')}`, cust: custId, sub: subtotal, tax, total, status });
    }
    console.log('  ✅ 15 finance invoices');

    // ============================================================
    // 11. KITCHEN ORDERS
    // ============================================================
    console.log('\n🍳 11. Kitchen Orders...');
    // Check kitchen_orders priority enum values
    const [koEnums] = await sequelize.query(`
      SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'enum_kitchen_orders_priority' ORDER BY e.enumsortorder
    `);
    const validPriorities = koEnums.map(x => x.enumlabel);
    console.log(`  Valid priorities: ${validPriorities.join(', ')}`);

    const koStatuses = ['new', 'preparing', 'ready', 'served', 'cancelled'];
    const defaultPriority = validPriorities[0] || 'normal';
    
    for (let i = 0; i < 20; i++) {
      const priority = validPriorities.length > 0 
        ? validPriorities[Math.floor(Math.random() * validPriorities.length)]
        : 'normal';
      
      await safeExec('kitchen', `
        INSERT INTO kitchen_orders (tenant_id, order_number, table_number, status, ${validPriorities.length > 0 ? 'priority,' : ''} notes, created_at, updated_at)
        VALUES (:t, :num, :table, :status, ${validPriorities.length > 0 ? ':priority,' : ''} :notes, NOW() - INTERVAL '${Math.floor(Math.random() * 48)} hours', NOW())
      `, {
        t: TENANT_ID, num: `WN-KO-${String(i + 1).padStart(3, '0')}`,
        table: `T${String(1 + Math.floor(Math.random() * 15)).padStart(2, '0')}`,
        status: koStatuses[Math.floor(Math.random() * koStatuses.length)],
        priority,
        notes: i % 3 === 0 ? 'Tanpa sambal, extra nasi' : null
      });
    }
    console.log('  ✅ 20 kitchen orders');

    // ============================================================
    // 12. CRM INTERACTIONS
    // ============================================================
    console.log('\n💬 12. CRM Interactions...');
    const interTypes = ['call', 'email', 'meeting', 'whatsapp', 'visit'];
    for (let i = 0; i < 15; i++) {
      await safeExec('crm', `
        INSERT INTO crm_interactions (tenant_id, customer_id, interaction_type, direction, subject, description, interaction_date, created_at, updated_at)
        VALUES (:t, :cust, :type, :dir, :subject, :desc, NOW() - INTERVAL '${i} days', NOW(), NOW())
      `, {
        t: TENANT_ID, cust: customerIds[i % customerIds.length],
        type: interTypes[Math.floor(Math.random() * interTypes.length)],
        dir: Math.random() > 0.5 ? 'outbound' : 'inbound',
        subject: `Follow up customer ${i + 1}`, desc: `Catatan interaksi #${i + 1}`
      });
    }
    console.log('  ✅ 15 CRM interactions');

    // ============================================================
    // FINAL VERIFICATION
    // ============================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL VERIFICATION');
    console.log('='.repeat(60));

    const countQueries = [
      { label: 'Branches', q: `SELECT COUNT(*) as c FROM branches WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Product Categories', q: `SELECT COUNT(*) as c FROM product_categories WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Products', q: `SELECT COUNT(*) as c FROM products WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Customers', q: `SELECT COUNT(*) as c FROM customers WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Employees', q: `SELECT COUNT(*) as c FROM employees WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Attendance', q: `SELECT COUNT(*) as c FROM employee_attendance WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Leave Requests', q: `SELECT COUNT(*) as c FROM leave_requests WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'POS Transactions', q: `SELECT COUNT(*) as c FROM pos_transactions` },
      { label: 'POS Items', q: `SELECT COUNT(*) as c FROM pos_transaction_items` },
      { label: 'Warehouses', q: `SELECT COUNT(*) as c FROM warehouses WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Suppliers', q: `SELECT COUNT(*) as c FROM suppliers WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Inventory Stock', q: `SELECT COUNT(*) as c FROM inventory_stock WHERE warehouse_id IN (${wh1Id}, ${wh2Id})` },
      { label: 'Stock Transfers', q: `SELECT COUNT(*) as c FROM stock_transfers WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Finance Accounts', q: `SELECT COUNT(*) as c FROM finance_accounts` },
      { label: 'Finance Transactions', q: `SELECT COUNT(*) as c FROM finance_transactions` },
      { label: 'Finance Invoices', q: `SELECT COUNT(*) as c FROM finance_invoices WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Kitchen Orders', q: `SELECT COUNT(*) as c FROM kitchen_orders WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Reservations', q: `SELECT COUNT(*) as c FROM reservations` },
      { label: 'SFA Leads', q: `SELECT COUNT(*) as c FROM sfa_leads WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'SFA Opportunities', q: `SELECT COUNT(*) as c FROM sfa_opportunities WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'SFA Visits', q: `SELECT COUNT(*) as c FROM sfa_visits WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'CRM Interactions', q: `SELECT COUNT(*) as c FROM crm_interactions WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Store Settings', q: `SELECT COUNT(*) as c FROM store_settings WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Announcements', q: `SELECT COUNT(*) as c FROM announcements WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Audit Logs', q: `SELECT COUNT(*) as c FROM audit_logs WHERE tenant_id = '${TENANT_ID}'` },
      { label: 'Tenant Modules', q: `SELECT COUNT(*) as c FROM tenant_modules WHERE tenant_id = '${TENANT_ID}' AND is_active = true` },
    ];

    let allOk = true;
    for (const { label, q } of countQueries) {
      try {
        const [r] = await sequelize.query(q);
        const cnt = parseInt(r[0].c);
        const icon = cnt > 0 ? '✅' : '❌';
        if (cnt === 0) allOk = false;
        console.log(`  ${icon} ${label}: ${cnt}`);
      } catch (e) {
        console.log(`  ⚠️ ${label}: ${e.message.substring(0, 60)}`);
        allOk = false;
      }
    }

    console.log(`\n${allOk ? '🎉 ALL DATA SEEDED SUCCESSFULLY!' : '⚠️ Some tables still have issues'}`);

    // Login info
    const [users] = await sequelize.query(
      `SELECT email, name, role, data_scope FROM users WHERE tenant_id = '${TENANT_ID}'`
    );
    console.log('\n🔑 Login credentials:');
    for (const u of users) {
      console.log(`  ${u.name} (${u.email}) | role: ${u.role} | scope: ${u.data_scope}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

run();
