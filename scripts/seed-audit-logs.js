const sequelize = require('../lib/sequelize');

async function seed() {
  try {
    const [tenants] = await sequelize.query("SELECT id FROM tenants LIMIT 1");
    if (!tenants.length) { console.error('No tenants'); process.exit(1); }
    const tid = tenants[0].id;

    const [users] = await sequelize.query("SELECT id, name, role FROM users ORDER BY id LIMIT 5");
    if (!users.length) { console.error('No users'); process.exit(1); }

    console.log(`Tenant: ${tid}, Users: ${users.map(u => u.name).join(', ')}`);

    // Clear existing
    await sequelize.query("DELETE FROM audit_logs WHERE tenant_id = :tid", { replacements: { tid } });
    console.log('Cleared existing audit logs');

    const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'EXPORT', 'IMPORT', 'LOCK', 'VOID'];
    const entities = [
      'product', 'user', 'branch', 'session', 'transaction', 'product_price',
      'global_settings', 'internal_requisition', 'inventory', 'stock_transfer',
      'crm_customer', 'crm_contact', 'crm_task', 'crm_ticket', 'crm_communication',
      'sfa_lead', 'sfa_opportunity', 'sfa_visit', 'sfa_territory',
      'employee', 'payroll_run', 'leave_request', 'warehouse', 'category',
    ];
    const ips = ['192.168.1.1', '192.168.1.10', '192.168.1.15', '10.0.0.5', '172.16.0.22'];
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const sampleOldNew = {
      product: [{ price: 25000, stock: 100 }, { price: 28000, stock: 95 }],
      user: [null, { name: 'New User', role: 'staff' }],
      crm_customer: [{ status: 'prospect' }, { status: 'customer', lifecycle_stage: 'customer' }],
      sfa_lead: [{ status: 'new' }, { status: 'contacted', priority: 'high' }],
      transaction: [{ status: 'completed', total: 150000 }, { status: 'voided' }],
      branch: [null, { name: 'Cabang Baru', code: 'BR-NEW' }],
      global_settings: [{ ppn_rate: 10 }, { ppn_rate: 11 }],
      leave_request: [{ status: 'pending' }, { status: 'approved' }],
      payroll_run: [{ status: 'draft' }, { status: 'calculated', total: 25000000 }],
      employee: [{ department: 'Sales' }, { department: 'Marketing', position: 'Manager' }],
    };

    const metaSamples = [
      { branchName: 'Cabang Jakarta Pusat' },
      { branchName: 'Cabang Bandung' },
      { branchName: 'Cabang Surabaya' },
      { module: 'SFA' },
      { module: 'CRM' },
      { module: 'HRIS' },
      { module: 'Inventory' },
      {},
    ];

    let count = 0;
    // Generate 200 audit logs spread across last 60 days
    for (let i = 0; i < 200; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entity = entities[Math.floor(Math.random() * entities.length)];
      const ip = ips[Math.floor(Math.random() * ips.length)];
      const meta = metaSamples[Math.floor(Math.random() * metaSamples.length)];

      // Random time in last 60 days
      const daysAgo = Math.floor(Math.random() * 60);
      const hoursAgo = Math.floor(Math.random() * 24);
      const minutesAgo = Math.floor(Math.random() * 60);

      const oldNew = sampleOldNew[entity] || [null, null];
      const oldVal = action === 'CREATE' ? null : (oldNew[0] || { value: 'old' });
      const newVal = action === 'DELETE' ? null : (oldNew[1] || { value: 'new' });

      const entityId = entity === 'session' ? `sess-${1000 + i}` :
        entity === 'transaction' ? `TRX-${2602 + Math.floor(i/30)}-${String(i).padStart(4,'0')}` :
        String(Math.floor(Math.random() * 100) + 1);

      await sequelize.query(`
        INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, metadata, created_at)
        VALUES (:tid, :uid, :uname, :action, :et, :eid, :old, :new, :ip, :ua, :meta,
          NOW() - :days * INTERVAL '1 day' - :hours * INTERVAL '1 hour' - :mins * INTERVAL '1 minute')
      `, { replacements: {
        tid, uid: user.id, uname: user.name,
        action, et: entity, eid: entityId,
        old: oldVal ? JSON.stringify(oldVal) : null,
        new: newVal ? JSON.stringify(newVal) : null,
        ip, ua,
        meta: JSON.stringify({ ...meta, userName: user.name }),
        days: daysAgo, hours: hoursAgo, mins: minutesAgo,
      }});
      count++;
    }

    console.log(`✅ Seeded ${count} audit log entries`);

    // Verify
    const [verify] = await sequelize.query("SELECT COUNT(*)::int as c FROM audit_logs WHERE tenant_id = :tid", { replacements: { tid } });
    console.log(`Total in DB: ${verify[0].c}`);

    const [sample] = await sequelize.query("SELECT action, entity_type, user_name, created_at FROM audit_logs WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 5", { replacements: { tid } });
    sample.forEach(r => console.log(`  ${r.action} ${r.entity_type} by ${r.user_name} at ${r.created_at}`));

  } catch(e) { console.error(e); }
  process.exit();
}
seed();
