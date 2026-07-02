const seq = require('../lib/sequelize');
const TID = '0eccef1b-0e4f-48a7-80de-e384d51051a5';

async function run() {
  const currencies = [
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', dp: 0, ts: '.', ds: ',', sp: 'before', def: true, so: 0 },
    { code: 'USD', name: 'US Dollar', symbol: '$', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 1 },
    { code: 'EUR', name: 'Euro', symbol: '€', dp: 2, ts: '.', ds: ',', sp: 'before', def: false, so: 2 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 3 },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 4 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', dp: 0, ts: ',', ds: '.', sp: 'before', def: false, so: 5 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 6 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 7 },
    { code: 'GBP', name: 'British Pound', symbol: '£', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 8 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', dp: 2, ts: ',', ds: '.', sp: 'before', def: false, so: 9 },
  ];
  for (const c of currencies) {
    await seq.query('INSERT INTO sfa_currencies (id,tenant_id,code,name,symbol,decimal_places,thousand_separator,decimal_separator,symbol_position,is_default,sort_order) VALUES (gen_random_uuid(),:tid,:code,:name,:sym,:dp,:ts,:ds,:sp,:def,:so)', { replacements: { tid: TID, code: c.code, name: c.name, sym: c.symbol, dp: c.dp, ts: c.ts, ds: c.ds, sp: c.sp, def: c.def, so: c.so } });
  }
  console.log('✓ ' + currencies.length + ' currencies seeded');

  const rates = [
    { from: 'USD', to: 'IDR', rate: 16250.00 },
    { from: 'EUR', to: 'IDR', rate: 17500.00 },
    { from: 'SGD', to: 'IDR', rate: 12100.00 },
    { from: 'MYR', to: 'IDR', rate: 3650.00 },
    { from: 'JPY', to: 'IDR', rate: 107.50 },
    { from: 'GBP', to: 'IDR', rate: 20500.00 },
    { from: 'AUD', to: 'IDR', rate: 10500.00 },
    { from: 'CNY', to: 'IDR', rate: 2240.00 },
    { from: 'THB', to: 'IDR', rate: 465.00 },
  ];
  for (const r of rates) {
    await seq.query('INSERT INTO sfa_exchange_rates (id,tenant_id,from_currency,to_currency,rate,effective_date,source) VALUES (gen_random_uuid(),:tid,:from,:to,:rate,CURRENT_DATE,:src)', { replacements: { tid: TID, from: r.from, to: r.to, rate: r.rate, src: 'manual' } });
  }
  console.log('✓ ' + rates.length + ' exchange rates seeded');

  const taxes = [
    { code: 'PPN', name: 'PPN (Pajak Pertambahan Nilai)', type: 'vat', rate: 11, incl: false, def: true },
    { code: 'PPH21', name: 'PPh 21 (Pajak Penghasilan)', type: 'income', rate: 5, incl: false, def: false },
    { code: 'PPH23', name: 'PPh 23 (Jasa)', type: 'withholding', rate: 2, incl: false, def: false },
    { code: 'PB1', name: 'Pajak Restoran / PB1', type: 'service', rate: 10, incl: true, def: false },
    { code: 'TAX_FREE', name: 'Bebas Pajak', type: 'vat', rate: 0, incl: false, def: false },
  ];
  for (let i = 0; i < taxes.length; i++) {
    const t = taxes[i];
    await seq.query('INSERT INTO sfa_tax_settings (id,tenant_id,code,name,tax_type,rate,is_inclusive,is_default,sort_order) VALUES (gen_random_uuid(),:tid,:code,:name,:type,:rate,:incl,:def,:so)', { replacements: { tid: TID, code: t.code, name: t.name, type: t.type, rate: t.rate, incl: t.incl, def: t.def, so: i } });
  }
  console.log('✓ ' + taxes.length + ' tax settings seeded');

  const nums = [
    { et: 'quotation', prefix: 'QT', df: 'YYYYMM', cl: 4, sample: 'QT-202603-0001' },
    { et: 'field_order', prefix: 'FO', df: 'YYYYMM', cl: 4, sample: 'FO-202603-0001' },
    { et: 'invoice', prefix: 'INV', df: 'YYYYMM', cl: 5, sample: 'INV-202603-00001' },
    { et: 'lead', prefix: 'LD', df: 'YYMM', cl: 4, sample: 'LD-2603-0001' },
    { et: 'visit', prefix: 'VST', df: 'YYYYMM', cl: 4, sample: 'VST-202603-0001' },
    { et: 'ticket', prefix: 'TKT', df: 'YYYYMM', cl: 5, sample: 'TKT-202603-00001' },
  ];
  for (const n of nums) {
    await seq.query('INSERT INTO sfa_numbering_formats (id,tenant_id,entity_type,prefix,separator,date_format,counter_length,sample_output,reset_period) VALUES (gen_random_uuid(),:tid,:et,:prefix,:sep,:df,:cl,:sample,:rp)', { replacements: { tid: TID, et: n.et, prefix: n.prefix, sep: '-', df: n.df, cl: n.cl, sample: n.sample, rp: 'monthly' } });
  }
  console.log('✓ ' + nums.length + ' numbering formats seeded');

  const pts = [
    { code: 'COD', name: 'Cash On Delivery', desc: 'Bayar saat barang diterima', dd: 0, disc_d: 0, disc_p: 0, lft: 'none', lfv: 0, def: true },
    { code: 'CBD', name: 'Cash Before Delivery', desc: 'Bayar sebelum pengiriman', dd: 0, disc_d: 0, disc_p: 0, lft: 'none', lfv: 0, def: false },
    { code: 'NET7', name: 'Net 7 Hari', desc: 'Jatuh tempo 7 hari setelah invoice', dd: 7, disc_d: 0, disc_p: 0, lft: 'percentage', lfv: 2, def: false },
    { code: 'NET14', name: 'Net 14 Hari', desc: 'Jatuh tempo 14 hari setelah invoice', dd: 14, disc_d: 0, disc_p: 0, lft: 'percentage', lfv: 2, def: false },
    { code: 'NET30', name: 'Net 30 Hari', desc: 'Jatuh tempo 30 hari setelah invoice', dd: 30, disc_d: 7, disc_p: 2, lft: 'percentage', lfv: 1.5, def: false },
    { code: 'NET60', name: 'Net 60 Hari', desc: 'Jatuh tempo 60 hari setelah invoice', dd: 60, disc_d: 14, disc_p: 3, lft: 'percentage', lfv: 1.5, def: false },
    { code: '2/10NET30', name: '2/10 Net 30', desc: 'Diskon 2% jika bayar dalam 10 hari, jatuh tempo 30 hari', dd: 30, disc_d: 10, disc_p: 2, lft: 'percentage', lfv: 1.5, def: false },
  ];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    await seq.query('INSERT INTO sfa_payment_terms (id,tenant_id,code,name,description,days_due,discount_days,discount_percentage,late_fee_type,late_fee_value,is_default,sort_order) VALUES (gen_random_uuid(),:tid,:code,:name,:desc,:dd,:disc_d,:disc_p,:lft,:lfv,:def,:so)', { replacements: { tid: TID, code: p.code, name: p.name, desc: p.desc, dd: p.dd, disc_d: p.disc_d, disc_p: p.disc_p, lft: p.lft, lfv: p.lfv, def: p.def, so: i } });
  }
  console.log('✓ ' + pts.length + ' payment terms seeded');

  const bs = [
    { cat: 'general', key: 'company_name', val: 'Bedagang Demo', type: 'string', label: 'Nama Perusahaan' },
    { cat: 'general', key: 'default_currency', val: 'IDR', type: 'string', label: 'Mata Uang Default' },
    { cat: 'general', key: 'timezone', val: 'Asia/Jakarta', type: 'string', label: 'Zona Waktu' },
    { cat: 'general', key: 'date_format', val: 'DD/MM/YYYY', type: 'string', label: 'Format Tanggal' },
    { cat: 'general', key: 'fiscal_year_start', val: '01', type: 'string', label: 'Awal Tahun Fiskal (Bulan)' },
    { cat: 'sales', key: 'auto_approve_order', val: 'false', type: 'boolean', label: 'Auto Approve Order' },
    { cat: 'sales', key: 'require_visit_photo', val: 'true', type: 'boolean', label: 'Wajib Foto saat Kunjungan' },
    { cat: 'sales', key: 'min_visit_duration_minutes', val: '15', type: 'number', label: 'Durasi Minimum Kunjungan (menit)' },
    { cat: 'sales', key: 'max_discount_percentage', val: '25', type: 'number', label: 'Diskon Maksimum (%)' },
    { cat: 'sales', key: 'allow_negative_stock', val: 'false', type: 'boolean', label: 'Izinkan Stok Negatif' },
    { cat: 'commission', key: 'commission_calculation_period', val: 'monthly', type: 'string', label: 'Periode Kalkulasi Komisi' },
    { cat: 'commission', key: 'commission_payout_delay_days', val: '15', type: 'number', label: 'Delay Pembayaran Komisi (hari)' },
    { cat: 'commission', key: 'min_target_achievement_for_bonus', val: '80', type: 'number', label: 'Min. Achievement untuk Bonus (%)' },
    { cat: 'notification', key: 'notify_overdue_invoice', val: 'true', type: 'boolean', label: 'Notifikasi Invoice Jatuh Tempo' },
    { cat: 'notification', key: 'notify_visit_reminder', val: 'true', type: 'boolean', label: 'Pengingat Kunjungan' },
    { cat: 'notification', key: 'notify_target_warning_threshold', val: '70', type: 'number', label: 'Threshold Peringatan Target (%)' },
    { cat: 'approval', key: 'order_approval_min_amount', val: '5000000', type: 'number', label: 'Min. Amount untuk Approval Order (Rp)' },
    { cat: 'approval', key: 'discount_approval_threshold', val: '10', type: 'number', label: 'Threshold Diskon Butuh Approval (%)' },
  ];
  for (const s of bs) {
    await seq.query('INSERT INTO sfa_business_settings (id,tenant_id,category,setting_key,setting_value,setting_type,label) VALUES (gen_random_uuid(),:tid,:cat,:key,:val,:type,:label)', { replacements: { tid: TID, cat: s.cat, key: s.key, val: s.val, type: s.type, label: s.label } });
  }
  console.log('✓ ' + bs.length + ' business settings seeded');

  console.log('\n✅ All settings seed data created!');
  process.exit();
}

run().catch(e => { console.error(e.message); process.exit(1); });
