/**
 * Seed SFA/CRM/Marketing Demo Data
 * Run: node scripts/seed-sfa-demo.js
 */
const sequelize = require('../lib/sequelize');

const TID = '0eccef1b-0e4f-48a7-80de-e384d51051a5'; // Toko Sejahtera
const UID = 10; // Owner Toko Sejahtera

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✓ DB connected\n');

    // Sync only SFA/CRM/Marketing/AI models to create tables
    console.log('⏳ Syncing SFA/CRM/MKT/AI models (creating tables)...');
    const models = require('../models');
    const prefixes = ['Sfa', 'Crm', 'Mkt', 'Ai', 'Audit', 'Notification', 'Lookup', 'Hris'];
    const modelNames = Object.keys(models).filter(k => prefixes.some(p => k.startsWith(p)));
    for (const name of modelNames) {
      try { await models[name].sync(); } catch (e) { console.warn(`  SKIP sync ${name}: ${e.message.slice(0, 60)}`); }
    }
    console.log(`✓ ${modelNames.length} models synced\n`);

    const q = async (sql, r) => {
      try { await sequelize.query(sql, { replacements: r }); return true; }
      catch (e) { console.warn('  SKIP:', e.message.slice(0, 80)); return false; }
    };

    // ════════════════════════════════════════════
    // 1. SFA CORE: Territories
    // ════════════════════════════════════════════
    console.log('📍 Seeding Territories...');
    await q(`INSERT INTO sfa_territories (tenant_id, code, name, description, territory_type, parent_id, manager_id, is_active, created_by) VALUES
      (:tid, 'TER-JKT', 'Jakarta', 'Wilayah DKI Jakarta', 'city', NULL, :uid, true, :uid),
      (:tid, 'TER-BDG', 'Bandung', 'Wilayah Bandung Raya', 'city', NULL, :uid, true, :uid),
      (:tid, 'TER-SBY', 'Surabaya', 'Wilayah Surabaya', 'city', NULL, :uid, true, :uid),
      (:tid, 'TER-JKT-S', 'Jakarta Selatan', 'Sub-wilayah Jaksel', 'district', NULL, :uid, true, :uid),
      (:tid, 'TER-JKT-U', 'Jakarta Utara', 'Sub-wilayah Jakut', 'district', NULL, :uid, true, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 2. SFA CORE: Leads
    // ════════════════════════════════════════════
    console.log('🎯 Seeding Leads...');
    const leads = [
      ['LD-20260001', 'PT Maju Bersama', 'Jl. Sudirman No. 45', 'Budi Hartono', '08123456001', 'budi@majubersama.com', 'new', 'hot', 'B2B'],
      ['LD-20260002', 'CV Sinar Jaya', 'Jl. Gatot Subroto 12', 'Siti Rahayu', '08123456002', 'siti@sinarjaya.com', 'contacted', 'warm', 'B2B'],
      ['LD-20260003', 'Toko Makmur', 'Jl. Thamrin No. 8', 'Ahmad Fauzi', '08123456003', 'ahmad@tokomakmur.com', 'qualified', 'hot', 'B2C'],
      ['LD-20260004', 'PT Global Teknik', 'Jl. Kuningan 33', 'Dewi Lestari', '08123456004', 'dewi@globaltek.com', 'proposal', 'warm', 'B2B'],
      ['LD-20260005', 'Koperasi Mandiri', 'Jl. Merdeka 21', 'Hendra Wijaya', '08123456005', 'hendra@kopmandiri.com', 'new', 'cold', 'B2B'],
      ['LD-20260006', 'PT Nusantara Food', 'Jl. Rasuna Said 56', 'Rina Susanti', '08123456006', 'rina@nusafood.com', 'contacted', 'hot', 'B2B'],
      ['LD-20260007', 'Warung Bu Sari', 'Jl. Kemang Raya 17', 'Bu Sari', '08123456007', 'sari@gmail.com', 'qualified', 'warm', 'B2C'],
      ['LD-20260008', 'PT Berkah Sentosa', 'Jl. Casablanca 89', 'Agus Pratama', '08123456008', 'agus@berkah.com', 'new', 'cold', 'B2B'],
      ['LD-20260009', 'UD Sejahtera', 'Jl. Panglima Polim 44', 'Yanti Kurnia', '08123456009', 'yanti@udsejahtera.com', 'contacted', 'warm', 'B2C'],
      ['LD-20260010', 'PT Indo Prima', 'Jl. HR Rasuna Said 100', 'Bambang Suharto', '08123456010', 'bambang@indoprima.com', 'proposal', 'hot', 'B2B'],
    ];
    for (const l of leads) {
      await q(`INSERT INTO sfa_leads (tenant_id, lead_number, company_name, address, contact_name, phone, email, status, temperature, lead_type, source, created_by) VALUES (:tid, :num, :company, :addr, :contact, :phone, :email, :status, :temp, :type, 'referral', :uid) ON CONFLICT DO NOTHING`,
        { tid: TID, num: l[0], company: l[1], addr: l[2], contact: l[3], phone: l[4], email: l[5], status: l[6], temp: l[7], type: l[8], uid: UID });
    }

    // ════════════════════════════════════════════
    // 3. SFA CORE: Opportunities (Pipeline)
    // ════════════════════════════════════════════
    console.log('💰 Seeding Opportunities...');
    const opps = [
      ['OPP-20260001', 'Kontrak Supply Tahunan', 'qualification', 250000000, 30, 'PT Maju Bersama'],
      ['OPP-20260002', 'Project Catering Kantor', 'proposal', 85000000, 60, 'CV Sinar Jaya'],
      ['OPP-20260003', 'Distribusi Produk Baru', 'negotiation', 450000000, 75, 'PT Global Teknik'],
      ['OPP-20260004', 'Kerjasama Retail', 'qualification', 120000000, 25, 'Toko Makmur'],
      ['OPP-20260005', 'Supply Bahan Baku', 'proposal', 320000000, 50, 'PT Nusantara Food'],
      ['OPP-20260006', 'Franchise Partnership', 'negotiation', 500000000, 80, 'PT Berkah Sentosa'],
      ['OPP-20260007', 'Supply Agreement Q2', 'closed_won', 180000000, 100, 'UD Sejahtera'],
      ['OPP-20260008', 'Bulk Purchase Deal', 'closed_won', 95000000, 100, 'Warung Bu Sari'],
      ['OPP-20260009', 'Annual Contract Renewal', 'proposal', 275000000, 55, 'PT Indo Prima'],
      ['OPP-20260010', 'New Product Launch', 'qualification', 150000000, 20, 'Koperasi Mandiri'],
    ];
    for (const o of opps) {
      await q(`INSERT INTO sfa_opportunities (tenant_id, opportunity_number, name, stage, estimated_value, probability, company_name, source, expected_close_date, actual_value, status, created_by) VALUES (:tid, :num, :name, :stage, :val, :prob, :company, 'direct', :ecd, :aval, :st, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, num: o[0], name: o[1], stage: o[2], val: o[3], prob: o[4], company: o[5],
        ecd: new Date(Date.now() + Math.random() * 90 * 86400000).toISOString().slice(0, 10),
        aval: o[2].startsWith('closed') ? o[3] : 0,
        st: o[2].startsWith('closed') ? 'won' : 'open',
        uid: UID
      });
    }

    // ════════════════════════════════════════════
    // 4. SFA CORE: Visits
    // ════════════════════════════════════════════
    console.log('🚗 Seeding Visits...');
    const customers = ['PT Maju Bersama', 'CV Sinar Jaya', 'Toko Makmur', 'PT Global Teknik', 'PT Nusantara Food', 'Warung Bu Sari', 'PT Berkah Sentosa', 'UD Sejahtera'];
    const visitStatuses = ['completed', 'completed', 'completed', 'planned', 'in_progress', 'completed', 'completed', 'planned'];
    for (let i = 0; i < 15; i++) {
      const ci = i % customers.length;
      const vdate = new Date(Date.now() - (i * 2 * 86400000));
      await q(`INSERT INTO sfa_visits (tenant_id, visit_number, customer_name, customer_address, salesperson_id, visit_date, check_in_time, check_out_time, status, visit_type, purpose, notes, order_taken, lat, lng, created_by) VALUES (:tid, :num, :cname, :addr, :uid, :vdate, :ci, :co, :st, 'regular', 'sales_visit', :notes, :ot, :lat, :lng, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, num: `VST-2026${String(i + 1).padStart(4, '0')}`,
        cname: customers[ci], addr: `Jl. Sample No. ${i + 1}`, uid: UID,
        vdate: vdate.toISOString().slice(0, 10),
        ci: visitStatuses[ci] === 'completed' ? vdate.toISOString() : null,
        co: visitStatuses[ci] === 'completed' ? new Date(vdate.getTime() + 3600000).toISOString() : null,
        st: visitStatuses[ci],
        notes: `Kunjungan rutin ke ${customers[ci]}`,
        ot: visitStatuses[ci] === 'completed' && Math.random() > 0.4,
        lat: -6.2 + Math.random() * 0.1, lng: 106.8 + Math.random() * 0.1
      });
    }

    // ════════════════════════════════════════════
    // 5. SFA ENHANCED: Teams
    // ════════════════════════════════════════════
    console.log('👥 Seeding Teams...');
    await q(`INSERT INTO sfa_teams (tenant_id, code, name, description, team_type, max_members, is_active, created_by) VALUES
      (:tid, 'TM-JKT-01', 'Team Jakarta Alpha', 'Tim sales utama Jakarta', 'field_force', 10, true, :uid),
      (:tid, 'TM-JKT-02', 'Team Jakarta Beta', 'Tim sales kedua Jakarta', 'field_force', 10, true, :uid),
      (:tid, 'TM-BDG-01', 'Team Bandung', 'Tim sales Bandung', 'field_force', 8, true, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 6. SFA ENHANCED: Target Groups & Achievements
    // ════════════════════════════════════════════
    console.log('🎯 Seeding Target Groups & Achievements...');
    await q(`INSERT INTO sfa_target_groups (tenant_id, code, name, description, group_type, period_type, period, year, total_target_value, status, created_by) VALUES
      (:tid, 'TG-2026-Q1', 'Target Q1 2026', 'Target kuartal 1 tahun 2026', 'quarterly', 'quarterly', 'Q1', 2026, 1500000000, 'active', :uid),
      (:tid, 'TG-2026-MAR', 'Target Maret 2026', 'Target bulanan Maret 2026', 'monthly', 'monthly', '03', 2026, 500000000, 'active', :uid),
      (:tid, 'TG-2026-FEB', 'Target Februari 2026', 'Target bulanan Februari 2026', 'monthly', 'monthly', '02', 2026, 450000000, 'published', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    await q(`INSERT INTO sfa_achievements (tenant_id, user_id, period, year, total_revenue, total_visits, completed_visits, effective_calls, new_customers, total_orders, revenue_pct, visit_pct, new_customer_pct, effective_call_pct, weighted_pct, rating) VALUES
      (:tid, :uid, '03', 2026, 180000000, 25, 22, 18, 3, 15, 72.00, 88.00, 75.00, 90.00, 78.50, 'average'),
      (:tid, :uid, '02', 2026, 210000000, 28, 26, 20, 5, 18, 84.00, 92.00, 100.00, 83.33, 87.25, 'good')
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 7. SFA ENHANCED: Incentive Schemes
    // ════════════════════════════════════════════
    console.log('💵 Seeding Incentive Schemes...');
    await q(`INSERT INTO sfa_incentive_schemes (tenant_id, code, name, description, scheme_type, calculation_basis, period_type, base_amount, min_achievement_pct, max_cap, overachievement_multiplier, status, effective_from, created_by) VALUES
      (:tid, 'INC-STD-2026', 'Standar Sales 2026', 'Skema insentif standar untuk tim sales', 'progressive', 'achievement_pct', 'monthly', 3000000, 60, 15000000, 1.5, 'active', '2026-01-01', :uid),
      (:tid, 'INC-SPL-Q1', 'Bonus Spesial Q1', 'Bonus tambahan kuartal 1', 'flat', 'revenue', 'quarterly', 5000000, 80, 20000000, 2.0, 'active', '2026-01-01', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 8. SFA ENHANCED: Plafon
    // ════════════════════════════════════════════
    console.log('💳 Seeding Plafon...');
    await q(`INSERT INTO sfa_plafon (tenant_id, plafon_type, customer_name, credit_limit, available_amount, used_amount, payment_terms, risk_level, status, created_by) VALUES
      (:tid, 'customer', 'PT Maju Bersama', 100000000, 65000000, 35000000, 30, 'low', 'active', :uid),
      (:tid, 'customer', 'CV Sinar Jaya', 50000000, 42000000, 8000000, 14, 'low', 'active', :uid),
      (:tid, 'customer', 'PT Global Teknik', 200000000, 80000000, 120000000, 45, 'medium', 'active', :uid),
      (:tid, 'customer', 'PT Nusantara Food', 150000000, 20000000, 130000000, 30, 'high', 'active', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 9. SFA ENHANCED: Parameters
    // ════════════════════════════════════════════
    console.log('⚙️  Seeding Parameters...');
    await q(`INSERT INTO sfa_parameters (tenant_id, category, param_key, param_value, display_name, description, data_type, display_order) VALUES
      (:tid, 'target', 'weight_revenue', '40', 'Bobot Revenue', 'Bobot pencapaian revenue dalam %', 'number', 1),
      (:tid, 'target', 'weight_volume', '25', 'Bobot Volume', 'Bobot pencapaian volume dalam %', 'number', 2),
      (:tid, 'target', 'weight_visit', '15', 'Bobot Kunjungan', 'Bobot pencapaian kunjungan dalam %', 'number', 3),
      (:tid, 'target', 'weight_new_customer', '10', 'Bobot New Customer', 'Bobot pencapaian pelanggan baru dalam %', 'number', 4),
      (:tid, 'target', 'weight_effective_call', '10', 'Bobot Effective Call', 'Bobot pencapaian effective call dalam %', 'number', 5),
      (:tid, 'achievement', 'rating_excellent_min', '120', 'Minimum Excellent', 'Minimum % untuk rating Excellent', 'number', 1),
      (:tid, 'achievement', 'rating_good_min', '100', 'Minimum Good', 'Minimum % untuk rating Good', 'number', 2),
      (:tid, 'achievement', 'rating_average_min', '80', 'Minimum Average', 'Minimum % untuk rating Average', 'number', 3),
      (:tid, 'achievement', 'rating_below_min', '60', 'Minimum Below Avg', 'Minimum % untuk rating Below Average', 'number', 4),
      (:tid, 'general', 'max_visit_radius', '500', 'Max Radius Kunjungan (m)', 'Radius maksimal check-in dari lokasi customer', 'number', 1),
      (:tid, 'general', 'min_visit_duration', '15', 'Min Durasi Kunjungan (mnt)', 'Durasi minimum kunjungan valid', 'number', 2)
    ON CONFLICT DO NOTHING`, { tid: TID });

    // ════════════════════════════════════════════
    // 10. SFA ADVANCED: Coverage Plans & Assignments
    // ════════════════════════════════════════════
    console.log('🗺️  Seeding Coverage Plans...');
    await q(`INSERT INTO sfa_coverage_plans (tenant_id, code, name, description, customer_class, visit_frequency, visits_per_period, min_visit_duration, is_active, created_by) VALUES
      (:tid, 'CVG-GOLD', 'Gold Customer Coverage', 'Kunjungan rutin customer gold', 'gold', 'weekly', 4, 30, true, :uid),
      (:tid, 'CVG-SILVER', 'Silver Customer Coverage', 'Kunjungan rutin customer silver', 'silver', 'biweekly', 2, 20, true, :uid),
      (:tid, 'CVG-BRONZE', 'Bronze Customer Coverage', 'Kunjungan rutin customer bronze', 'bronze', 'monthly', 1, 15, true, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    console.log('📋 Seeding Coverage Assignments...');
    for (let i = 0; i < 8; i++) {
      const nextVisit = new Date(Date.now() + (i - 3) * 86400000).toISOString().slice(0, 10);
      await q(`INSERT INTO sfa_coverage_assignments (tenant_id, customer_name, customer_class, assigned_to, visit_frequency, next_planned_visit, total_visits_planned, total_visits_actual, status, created_at) VALUES (:tid, :cname, :cc, :uid, :vf, :nv, :tp, :ta, 'active', NOW()) ON CONFLICT DO NOTHING`, {
        tid: TID, cname: customers[i], cc: i < 3 ? 'gold' : i < 6 ? 'silver' : 'bronze',
        uid: UID, vf: i < 3 ? 'weekly' : 'biweekly', nv: nextVisit,
        tp: 4 + Math.floor(Math.random() * 4), ta: Math.floor(Math.random() * 6)
      });
    }

    // ════════════════════════════════════════════
    // 11. SFA ADVANCED: Field Orders
    // ════════════════════════════════════════════
    console.log('📦 Seeding Field Orders...');
    const foStatuses = ['pending', 'approved', 'approved', 'processing', 'delivered', 'pending'];
    for (let i = 0; i < 6; i++) {
      const total = (50000 + Math.floor(Math.random() * 200000)) * 100;
      await q(`INSERT INTO sfa_field_orders (tenant_id, order_number, customer_name, customer_address, salesperson_id, order_date, payment_method, subtotal, tax_amount, total, status, created_by) VALUES (:tid, :num, :cname, :addr, :uid, :odate, 'credit', :sub, :tax, :total, :st, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, num: `FO-202603${String(i + 1).padStart(4, '0')}`,
        cname: customers[i], addr: `Jl. Sample No. ${i + 10}`, uid: UID,
        odate: new Date(Date.now() - i * 3 * 86400000).toISOString().slice(0, 10),
        sub: total, tax: Math.round(total * 0.11), total: Math.round(total * 1.11), st: foStatuses[i]
      });
    }

    // ════════════════════════════════════════════
    // 12. SFA ADVANCED: Display Audits (Merchandising)
    // ════════════════════════════════════════════
    console.log('🏪 Seeding Display Audits...');
    for (let i = 0; i < 5; i++) {
      await q(`INSERT INTO sfa_display_audits (tenant_id, customer_name, salesperson_id, audit_date, store_type, total_items, compliant_items, overall_score, compliance_pct, created_by) VALUES (:tid, :cname, :uid, :adate, :stype, :ti, :ci, :os, :cp, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, cname: customers[i], uid: UID,
        adate: new Date(Date.now() - i * 5 * 86400000).toISOString().slice(0, 10),
        stype: i % 2 === 0 ? 'minimarket' : 'supermarket',
        ti: 10, ci: 6 + i, os: 60 + i * 8, cp: 60 + i * 8
      });
    }

    // ════════════════════════════════════════════
    // 13. SFA ADVANCED: Competitor Activities
    // ════════════════════════════════════════════
    console.log('🏢 Seeding Competitor Activities...');
    const competitors = ['PT Indofood', 'Mayora Group', 'Wings Group', 'Unilever', 'Nestle'];
    for (let i = 0; i < 5; i++) {
      await q(`INSERT INTO sfa_competitor_activities (tenant_id, customer_name, salesperson_id, reported_date, competitor_name, competitor_brand, activity_type, description, impact_level, resolved, created_by) VALUES (:tid, :cname, :uid, :rdate, :cn, :cb, :at, :desc, :il, :resolved, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, cname: customers[i], uid: UID,
        rdate: new Date(Date.now() - i * 7 * 86400000).toISOString().slice(0, 10),
        cn: competitors[i], cb: competitors[i] + ' Brand',
        at: ['promotion', 'new_product', 'price_war', 'display', 'sampling'][i],
        desc: `${competitors[i]} melakukan ${['promo besar-besaran', 'peluncuran produk baru', 'perang harga', 'display agresif', 'sampling gratis'][i]} di area ${customers[i]}`,
        il: ['high', 'medium', 'high', 'low', 'medium'][i],
        resolved: i > 2
      });
    }

    // ════════════════════════════════════════════
    // 14. SFA ADVANCED: Survey Templates & Responses
    // ════════════════════════════════════════════
    console.log('📝 Seeding Surveys...');
    await q(`INSERT INTO sfa_survey_templates (tenant_id, code, title, description, survey_type, target_audience, question_count, status, created_by) VALUES
      (:tid, 'SRV-CSAT', 'Customer Satisfaction Survey', 'Survey kepuasan pelanggan', 'satisfaction', 'customer', 5, 'active', :uid),
      (:tid, 'SRV-NPS', 'Net Promoter Score', 'NPS survey untuk pelanggan', 'nps', 'customer', 3, 'active', :uid),
      (:tid, 'SRV-STORE', 'Store Audit Survey', 'Survey audit toko', 'audit', 'internal', 8, 'active', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    for (let i = 0; i < 8; i++) {
      await q(`INSERT INTO sfa_survey_responses (tenant_id, customer_name, respondent_id, response_date, answers, score, completion_pct, duration_seconds) VALUES (:tid, :cname, :uid, :rdate, :answers, :score, 100, :dur) ON CONFLICT DO NOTHING`, {
        tid: TID, cname: customers[i], uid: UID,
        rdate: new Date(Date.now() - i * 4 * 86400000).toISOString().slice(0, 10),
        answers: JSON.stringify({ q1: 4 + Math.floor(Math.random() * 2), q2: 'Baik', q3: 'Cukup puas' }),
        score: 60 + Math.floor(Math.random() * 40),
        dur: 120 + Math.floor(Math.random() * 180)
      });
    }

    // ════════════════════════════════════════════
    // 15. SFA ADVANCED: Approval Workflows
    // ════════════════════════════════════════════
    console.log('✅ Seeding Approval Workflows...');
    await q(`INSERT INTO sfa_approval_workflows (tenant_id, code, name, description, entity_type, total_steps, is_active, created_by) VALUES
      (:tid, 'APR-FO', 'Approval Field Order', 'Workflow approval untuk field order', 'field_order', 2, true, :uid),
      (:tid, 'APR-DISC', 'Approval Diskon Besar', 'Approval untuk diskon > 15%', 'discount', 3, true, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    await q(`INSERT INTO sfa_approval_requests (tenant_id, entity_type, entity_number, entity_summary, requested_by, current_step, total_steps, status, amount, priority) VALUES
      (:tid, 'field_order', 'FO-20260301', 'Field Order dari PT Maju Bersama', :uid, 1, 2, 'pending', 15000000, 'high'),
      (:tid, 'discount', 'DISC-001', 'Diskon 20% untuk PT Global Teknik', :uid, 1, 3, 'pending', 5000000, 'normal'),
      (:tid, 'field_order', 'FO-20260295', 'Field Order dari CV Sinar Jaya', :uid, 2, 2, 'approved', 8500000, 'normal')
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 16. SFA ADVANCED: Geofences
    // ════════════════════════════════════════════
    console.log('📍 Seeding Geofences...');
    await q(`INSERT INTO sfa_geofences (tenant_id, name, description, fence_type, center_lat, center_lng, radius_meters, is_active, alert_on_enter, alert_on_exit, created_by) VALUES
      (:tid, 'Area Toko Sejahtera', 'Geofence area toko utama', 'circle', -6.2088, 106.8456, 200, true, true, false, :uid),
      (:tid, 'Area Gudang Pusat', 'Geofence gudang pusat', 'circle', -6.2250, 106.8600, 300, true, true, true, :uid),
      (:tid, 'Area Jakarta Selatan', 'Coverage Jakarta Selatan', 'circle', -6.2615, 106.8106, 5000, true, false, false, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 17. SFA ADVANCED: Product Commissions
    // ════════════════════════════════════════════
    console.log('💰 Seeding Product Commissions...');
    await q(`INSERT INTO sfa_product_commissions (tenant_id, product_name, product_sku, category_name, commission_type, commission_rate, min_quantity, is_active, created_by) VALUES
      (:tid, 'Kopi Premium 250g', 'KP-250', 'Beverages', 'percentage', 5.0, 10, true, :uid),
      (:tid, 'Gula Pasir 1kg', 'GP-1000', 'Bahan Pokok', 'percentage', 3.0, 20, true, :uid),
      (:tid, 'Minyak Goreng 2L', 'MG-2000', 'Bahan Pokok', 'percentage', 2.5, 15, true, :uid),
      (:tid, 'Snack Box Premium', 'SB-PRE', 'Snacks', 'flat', 0, 5, true, :uid),
      (:tid, 'Teh Celup 25s', 'TC-25', 'Beverages', 'percentage', 4.0, 10, true, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 18. CRM: Customers
    // ════════════════════════════════════════════
    console.log('👤 Seeding CRM Customers...');
    const crmCustomers = [
      ['CUS-20260001', 'PT Maju Bersama', 'corporate', 'gold', 'active', 'Budi Hartono', '08123456001', 'budi@majubersama.com'],
      ['CUS-20260002', 'CV Sinar Jaya', 'corporate', 'silver', 'active', 'Siti Rahayu', '08123456002', 'siti@sinarjaya.com'],
      ['CUS-20260003', 'Toko Makmur', 'retail', 'gold', 'active', 'Ahmad Fauzi', '08123456003', 'ahmad@tokomakmur.com'],
      ['CUS-20260004', 'PT Global Teknik', 'corporate', 'platinum', 'active', 'Dewi Lestari', '08123456004', 'dewi@globaltek.com'],
      ['CUS-20260005', 'Koperasi Mandiri', 'cooperative', 'silver', 'active', 'Hendra Wijaya', '08123456005', 'hendra@kopmandiri.com'],
      ['CUS-20260006', 'PT Nusantara Food', 'corporate', 'platinum', 'active', 'Rina Susanti', '08123456006', 'rina@nusafood.com'],
      ['CUS-20260007', 'Warung Bu Sari', 'retail', 'bronze', 'active', 'Bu Sari', '08123456007', 'sari@gmail.com'],
      ['CUS-20260008', 'PT Berkah Sentosa', 'corporate', 'gold', 'inactive', 'Agus Pratama', '08123456008', 'agus@berkah.com'],
    ];
    for (const c of crmCustomers) {
      await q(`INSERT INTO crm_customers (tenant_id, customer_number, company_name, customer_type, tier, status, primary_contact_name, phone, email, total_revenue, total_orders, avg_order_value, created_by) VALUES (:tid, :num, :name, :type, :tier, :st, :contact, :phone, :email, :rev, :orders, :aov, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, num: c[0], name: c[1], type: c[2], tier: c[3], st: c[4], contact: c[5], phone: c[6], email: c[7],
        rev: Math.floor(50000000 + Math.random() * 400000000),
        orders: Math.floor(10 + Math.random() * 90),
        aov: Math.floor(2000000 + Math.random() * 8000000),
        uid: UID
      });
    }

    // ════════════════════════════════════════════
    // 19. CRM: Contacts
    // ════════════════════════════════════════════
    console.log('📇 Seeding CRM Contacts...');
    const contacts = [
      ['Budi Hartono', 'Director', '08123456001', 'budi@majubersama.com'],
      ['Siti Rahayu', 'Purchasing Manager', '08123456002', 'siti@sinarjaya.com'],
      ['Ahmad Fauzi', 'Owner', '08123456003', 'ahmad@tokomakmur.com'],
      ['Dewi Lestari', 'Procurement Head', '08123456004', 'dewi@globaltek.com'],
      ['Rina Susanti', 'VP Operations', '08123456006', 'rina@nusafood.com'],
    ];
    for (let i = 0; i < contacts.length; i++) {
      await q(`INSERT INTO crm_contacts (tenant_id, full_name, job_title, phone, email, is_primary, created_by) VALUES (:tid, :name, :job, :phone, :email, true, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, name: contacts[i][0], job: contacts[i][1], phone: contacts[i][2], email: contacts[i][3], uid: UID
      });
    }

    // ════════════════════════════════════════════
    // 20. CRM: Communications
    // ════════════════════════════════════════════
    console.log('📧 Seeding CRM Communications...');
    const commTypes = ['email', 'phone', 'whatsapp', 'meeting', 'email'];
    for (let i = 0; i < 10; i++) {
      await q(`INSERT INTO crm_communications (tenant_id, comm_type, direction, subject, body, status, priority, created_by) VALUES (:tid, :type, :dir, :subj, :body, :st, :pri, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, type: commTypes[i % 5],
        dir: i % 2 === 0 ? 'outbound' : 'inbound',
        subj: `${['Follow up order', 'Konfirmasi pembayaran', 'Penawaran baru', 'Meeting jadwal', 'Update pengiriman'][i % 5]} - ${customers[i % customers.length]}`,
        body: `Komunikasi terkait ${customers[i % customers.length]}`,
        st: i < 7 ? 'completed' : 'pending',
        pri: i < 3 ? 'high' : 'medium',
        uid: UID
      });
    }

    // ════════════════════════════════════════════
    // 21. CRM: Tasks
    // ════════════════════════════════════════════
    console.log('✅ Seeding CRM Tasks...');
    const taskTitles = ['Follow up proposal', 'Kirim quotation', 'Jadwalkan meeting', 'Review kontrak', 'Collect payment', 'Product demo', 'Negosiasi harga', 'Survey kebutuhan'];
    for (let i = 0; i < 8; i++) {
      const due = new Date(Date.now() + (i - 3) * 86400000);
      await q(`INSERT INTO crm_tasks (tenant_id, title, description, task_type, priority, status, due_date, assigned_to, created_by) VALUES (:tid, :title, :desc, :type, :pri, :st, :due, :uid, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, title: `${taskTitles[i]} - ${customers[i % customers.length]}`,
        desc: `Task untuk ${customers[i % customers.length]}`,
        type: ['follow_up', 'call', 'meeting', 'review', 'collection', 'demo', 'negotiation', 'survey'][i],
        pri: i < 3 ? 'high' : i < 6 ? 'medium' : 'low',
        st: i < 3 ? 'completed' : i < 6 ? 'in_progress' : 'pending',
        due: due.toISOString().slice(0, 10), uid: UID
      });
    }

    // ════════════════════════════════════════════
    // 22. CRM: Tickets
    // ════════════════════════════════════════════
    console.log('🎫 Seeding CRM Tickets...');
    const ticketSubjects = ['Produk rusak dalam pengiriman', 'Keterlambatan pengiriman', 'Salah kirim barang', 'Request refund', 'Pertanyaan tentang garansi'];
    for (let i = 0; i < 5; i++) {
      await q(`INSERT INTO crm_tickets (tenant_id, ticket_number, subject, description, category, priority, status, source, created_by) VALUES (:tid, :num, :subj, :desc, :cat, :pri, :st, :src, :uid) ON CONFLICT DO NOTHING`, {
        tid: TID, num: `TKT-2026${String(i + 1).padStart(4, '0')}`,
        subj: ticketSubjects[i], desc: `Detail: ${ticketSubjects[i]}`,
        cat: ['quality', 'delivery', 'shipping', 'refund', 'warranty'][i],
        pri: i < 2 ? 'high' : 'medium',
        st: i === 0 ? 'resolved' : i < 3 ? 'in_progress' : 'open',
        src: ['email', 'phone', 'whatsapp', 'email', 'phone'][i],
        uid: UID
      });
    }

    // ════════════════════════════════════════════
    // 23. CRM: Forecasts & Deal Scores
    // ════════════════════════════════════════════
    console.log('📊 Seeding Forecasts & Deal Scores...');
    await q(`INSERT INTO crm_forecasts (tenant_id, forecast_period, forecast_type, total_pipeline, weighted_pipeline, committed, best_case, closed_won, target, achievement_pct, created_by) VALUES
      (:tid, '2026-03', 'monthly', 1500000000, 850000000, 400000000, 600000000, 275000000, 500000000, 55.00, :uid),
      (:tid, '2026-02', 'monthly', 1200000000, 720000000, 500000000, 650000000, 480000000, 450000000, 106.67, :uid),
      (:tid, '2026-Q1', 'quarterly', 2000000000, 1100000000, 900000000, 1200000000, 755000000, 1500000000, 50.33, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 24. CRM: Automation Rules
    // ════════════════════════════════════════════
    console.log('🤖 Seeding Automation Rules...');
    await q(`INSERT INTO crm_automation_rules (tenant_id, name, description, trigger_type, trigger_conditions, action_type, action_config, is_active, execution_count, created_by) VALUES
      (:tid, 'Auto Follow-up Lead Baru', 'Kirim email follow-up otomatis untuk lead baru', 'event', '{"event":"lead_created"}', 'send_email', '{"template":"welcome_lead"}', true, 45, :uid),
      (:tid, 'Eskalasi Tiket Overdue', 'Eskalasi tiket yang belum direspon > 24 jam', 'schedule', '{"cron":"0 */6 * * *"}', 'escalate', '{"priority":"high"}', true, 12, :uid),
      (:tid, 'Notifikasi Deal Besar', 'Notifikasi manager untuk deal > 100jt', 'event', '{"event":"opportunity_updated","condition":"value>100000000"}', 'notify', '{"role":"manager"}', true, 8, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 25. MARKETING: Campaigns
    // ════════════════════════════════════════════
    console.log('📢 Seeding Marketing Campaigns...');
    await q(`INSERT INTO mkt_campaigns (tenant_id, campaign_number, name, description, objective, campaign_type, status, priority, start_date, end_date, budget, spent, target_reach, actual_reach, target_conversions, actual_conversions, roi, created_by) VALUES
      (:tid, 'CMP-20260001', 'Promo Ramadan 2026', 'Campaign promo spesial Ramadan', 'sales_conversion', 'multi_channel', 'active', 'high', '2026-02-28', '2026-04-01', 50000000, 28000000, 100000, 65000, 5000, 3200, 15.5, :uid),
      (:tid, 'CMP-20260002', 'Launching Produk Baru', 'Campaign peluncuran produk terbaru', 'brand_awareness', 'social_media', 'active', 'high', '2026-03-01', '2026-03-31', 30000000, 12000000, 50000, 28000, 2000, 800, 8.2, :uid),
      (:tid, 'CMP-20260003', 'Customer Loyalty Q1', 'Program loyalitas pelanggan Q1', 'retention', 'email', 'completed', 'medium', '2026-01-01', '2026-02-28', 15000000, 14500000, 20000, 18500, 3000, 2800, 22.3, :uid),
      (:tid, 'CMP-20260004', 'Flash Sale Weekend', 'Promo flash sale akhir pekan', 'sales_conversion', 'multi_channel', 'draft', 'medium', '2026-03-15', '2026-03-16', 10000000, 0, 30000, 0, 1500, 0, 0, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 26. MARKETING: Segments
    // ════════════════════════════════════════════
    console.log('🎯 Seeding Marketing Segments...');
    await q(`INSERT INTO mkt_segments (tenant_id, code, name, description, segment_type, customer_count, auto_refresh, created_by) VALUES
      (:tid, 'SEG-VIP', 'VIP Customers', 'Pelanggan dengan total transaksi > 50jt', 'dynamic', 45, true, :uid),
      (:tid, 'SEG-NEW', 'New Customers', 'Pelanggan baru 30 hari terakhir', 'dynamic', 128, true, :uid),
      (:tid, 'SEG-DORMANT', 'Dormant Customers', 'Pelanggan tidak aktif > 90 hari', 'dynamic', 67, false, :uid),
      (:tid, 'SEG-B2B', 'B2B Partners', 'Pelanggan tipe korporat/B2B', 'static', 32, false, :uid),
      (:tid, 'SEG-HIGH-FREQ', 'High Frequency Buyers', 'Pelanggan dengan frekuensi belanja tinggi', 'dynamic', 89, true, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 27. MARKETING: Promotions
    // ════════════════════════════════════════════
    console.log('🏷️  Seeding Promotions...');
    await q(`INSERT INTO mkt_promotions (tenant_id, promo_code, name, description, promo_type, discount_type, discount_value, min_purchase, max_discount, status, start_date, end_date, usage_limit, usage_count, per_customer_limit, created_by) VALUES
      (:tid, 'RAMADAN25', 'Diskon Ramadan 25%', 'Diskon 25% untuk semua produk', 'percentage', 'percentage', 25, 100000, 500000, 'active', '2026-02-28', '2026-04-01', 1000, 342, 3, :uid),
      (:tid, 'NEWCUST10', 'Welcome 10% Off', 'Diskon 10% untuk pelanggan baru', 'percentage', 'percentage', 10, 50000, 200000, 'active', '2026-01-01', '2026-12-31', 5000, 856, 1, :uid),
      (:tid, 'FREESHIP', 'Free Shipping', 'Gratis ongkir min. pembelian 200rb', 'free_shipping', 'flat', 30000, 200000, 30000, 'active', '2026-03-01', '2026-03-31', 500, 123, 5, :uid),
      (:tid, 'BOGO2026', 'Buy 1 Get 1', 'Beli 1 gratis 1 untuk produk tertentu', 'buy_x_get_y', 'percentage', 100, 0, 0, 'active', '2026-03-01', '2026-03-15', 200, 89, 2, :uid),
      (:tid, 'FLASH50', 'Flash Sale 50%', 'Diskon 50% flash sale', 'percentage', 'percentage', 50, 150000, 1000000, 'expired', '2026-02-01', '2026-02-28', 300, 300, 1, :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 28. MARKETING: Budgets
    // ════════════════════════════════════════════
    console.log('💰 Seeding Marketing Budgets...');
    await q(`INSERT INTO mkt_budgets (tenant_id, name, period_type, period, total_budget, allocated, spent, remaining, status, created_by) VALUES
      (:tid, 'Budget Marketing Q1 2026', 'quarterly', '2026-Q1', 150000000, 95000000, 54500000, 95500000, 'active', :uid),
      (:tid, 'Budget Marketing Maret', 'monthly', '2026-03', 50000000, 40000000, 18000000, 32000000, 'active', :uid),
      (:tid, 'Budget Marketing Februari', 'monthly', '2026-02', 45000000, 45000000, 42000000, 3000000, 'active', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 29. MARKETING: Content Assets
    // ════════════════════════════════════════════
    console.log('🖼️  Seeding Content Assets...');
    await q(`INSERT INTO mkt_content_assets (tenant_id, title, asset_type, description, tags, created_by) VALUES
      (:tid, 'Banner Promo Ramadan', 'image', 'Banner utama promo Ramadan 2026', '["ramadan","promo","banner"]', :uid),
      (:tid, 'Video Produk Baru', 'video', 'Video launching produk terbaru', '["product","launch","video"]', :uid),
      (:tid, 'Email Template Welcome', 'template', 'Template email welcome customer baru', '["email","template","welcome"]', :uid),
      (:tid, 'Social Media Kit Maret', 'document', 'Paket konten sosial media bulan Maret', '["social","content","march"]', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 30. AI Workflow: Models & Workflows
    // ════════════════════════════════════════════
    console.log('🤖 Seeding AI Models & Workflows...');
    await q(`INSERT INTO ai_models (tenant_id, name, provider, model_id, capabilities, is_active, status, created_by) VALUES
      (:tid, 'GPT-4o', 'openai', 'gpt-4o', '["text","analysis","code"]', true, 'active', :uid),
      (:tid, 'Claude Sonnet 4', 'anthropic', 'claude-sonnet-4-20250514', '["text","analysis","reasoning"]', true, 'active', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    await q(`INSERT INTO ai_workflows (tenant_id, name, description, workflow_type, status, created_by) VALUES
      (:tid, 'Lead Scoring', 'Scoring otomatis untuk lead baru berdasarkan data historis', 'lead_scoring', 'active', :uid),
      (:tid, 'Customer Segmentation', 'Segmentasi pelanggan otomatis menggunakan AI', 'customer_segmentation', 'active', :uid),
      (:tid, 'Sales Forecasting', 'Prediksi penjualan berdasarkan tren dan data historis', 'sales_forecasting', 'active', :uid)
    ON CONFLICT DO NOTHING`, { tid: TID, uid: UID });

    // ════════════════════════════════════════════
    // 31. Audit Logs
    // ════════════════════════════════════════════
    console.log('📜 Seeding Audit Logs...');
    const actions = ['create', 'update', 'delete', 'status_change'];
    const entities = ['sfa_lead', 'sfa_opportunity', 'crm_customer', 'crm_task', 'crm_ticket'];
    for (let i = 0; i < 20; i++) {
      await q(`INSERT INTO audit_logs (tenant_id, user_id, user_name, action, entity_type, entity_id, new_values, ip_address, created_at) VALUES (:tid, :uid, 'Owner Toko Sejahtera', :act, :et, :eid, :nv, '127.0.0.1', :cat) ON CONFLICT DO NOTHING`, {
        tid: TID, uid: UID,
        act: actions[i % actions.length],
        et: entities[i % entities.length],
        eid: String(i + 1),
        nv: JSON.stringify({ action: actions[i % actions.length] }),
        cat: new Date(Date.now() - i * 3600000 * 4).toISOString()
      });
    }

    // ════════════════════════════════════════════
    // 32. Lookup Options
    // ════════════════════════════════════════════
    console.log('📋 Seeding Lookup Options...');
    const lookups = [
      ['lead_source', 'Referral', 'referral'], ['lead_source', 'Website', 'website'], ['lead_source', 'Social Media', 'social_media'],
      ['lead_source', 'Cold Call', 'cold_call'], ['lead_source', 'Exhibition', 'exhibition'],
      ['industry', 'F&B', 'fnb'], ['industry', 'Retail', 'retail'], ['industry', 'Manufacturing', 'manufacturing'],
      ['ticket_category', 'Quality', 'quality'], ['ticket_category', 'Delivery', 'delivery'], ['ticket_category', 'Refund', 'refund'],
    ];
    for (const l of lookups) {
      await q(`INSERT INTO lookup_options (tenant_id, category, label, value, is_active, sort_order) VALUES (:tid, :cat, :label, :val, true, 0) ON CONFLICT DO NOTHING`, {
        tid: TID, cat: l[0], label: l[1], val: l[2]
      });
    }

    // ════════════════════════════════════════════
    // 33. Notifications
    // ════════════════════════════════════════════
    console.log('🔔 Seeding Notifications...');
    const notifTitles = ['Lead baru ditambahkan', 'Tiket #TKT-20260001 diperbarui', 'Target Maret telah dipublikasi', 'Approval pending: Field Order', 'Kunjungan overdue: PT Maju Bersama'];
    for (let i = 0; i < 5; i++) {
      await q(`INSERT INTO notifications (tenant_id, user_id, title, message, type, is_read, created_at) VALUES (:tid, :uid, :title, :msg, :type, :read, :cat) ON CONFLICT DO NOTHING`, {
        tid: TID, uid: UID, title: notifTitles[i],
        msg: `Detail: ${notifTitles[i]}`,
        type: ['info', 'warning', 'info', 'action', 'warning'][i],
        read: i > 2,
        cat: new Date(Date.now() - i * 7200000).toISOString()
      });
    }

    // ════════════════════════════════════════════
    // 34. HRIS Employees (for HRIS sync tab)
    // ════════════════════════════════════════════
    console.log('👨‍💼 Seeding HRIS Employees...');
    const hrisEmps = [
      ['EMP-001', 'Budi Santoso', 'Sales', 'Sales Executive', 'active'],
      ['EMP-002', 'Siti Nurhaliza', 'Sales', 'Sales Manager', 'active'],
      ['EMP-003', 'Ahmad Dahlan', 'Marketing', 'Marketing Exec', 'active'],
      ['EMP-004', 'Dewi Sartika', 'Sales', 'Sales Executive', 'active'],
      ['EMP-005', 'Rudi Hartono', 'Operations', 'Field Supervisor', 'active'],
    ];
    for (const e of hrisEmps) {
      await q(`INSERT INTO hris_employees ("tenantId", "employeeCode", "fullName", department, position, status, "joinDate") VALUES (:tid, :code, :name, :dept, :pos, :st, '2025-01-15') ON CONFLICT DO NOTHING`, {
        tid: TID, code: e[0], name: e[1], dept: e[2], pos: e[3], st: e[4]
      });
    }

    console.log('\n════════════════════════════════════════════');
    console.log('✅ ALL DEMO DATA SEEDED SUCCESSFULLY!');
    console.log('════════════════════════════════════════════');
    console.log(`Tenant: Toko Sejahtera (${TID})`);
    console.log(`User: Owner Toko Sejahtera (ID: ${UID})`);
    console.log('Login: owner@tokosejahtera.com');
    console.log('════════════════════════════════════════════\n');

  } catch (e) {
    console.error('❌ FATAL:', e);
  }
  process.exit();
}

run();
