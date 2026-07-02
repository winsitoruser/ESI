#!/usr/bin/env node
// Part 2: FMS, TMS, CRM, Marketing, Loyalty, Kitchen, POS, SFA, Org
const { Pool } = require('pg');
const crypto = require('crypto');
const pool = new Pool({ connectionString: 'postgresql://postgres:jakarta123@localhost:5432/bedagang_dev' });
const uuid = () => crypto.randomUUID();
const TID = '0eccef1b-0e4f-48a7-80de-e384d51051a5';
const B1 = '8b566edf-70d1-4615-822b-857ce1298752';
const B2 = 'ace037d0-20b9-4dfc-bc4f-528940c6a2e8';
const B3 = 'ba0da7ec-1d51-438f-a1c5-a2cbedd29d08';

async function run(c, name, fn) {
  try {
    await c.query(`SAVEPOINT ${name}`);
    await fn();
    await c.query(`RELEASE SAVEPOINT ${name}`);
    console.log(`  [OK] ${name}`);
  } catch (e) {
    await c.query(`ROLLBACK TO SAVEPOINT ${name}`);
    console.error(`  [FAIL] ${name}: ${e.message.slice(0, 200)}`);
  }
}

async function seed() {
  const c = await pool.connect();
  await c.query('BEGIN');
  console.log('=== SEED PART 2 ===\n');

  // FMS VEHICLES & DRIVERS
  const vIds = [], dIds = [];
  await run(c, 'fms_vehicles', async () => {
    const vd=[['B1234ABC','Toyota','Avanza',2022,'van'],['B5678DEF','Mitsubishi','L300',2021,'truck'],['B9012GHI','Suzuki','Carry',2023,'pickup'],['D3456JKL','Isuzu','Elf',2020,'truck'],['B7890MNO','Daihatsu','GranMax',2022,'van'],['D1122PQR','Hino','Dutro',2021,'truck']];
    for (const [p,b,m,y,t] of vd) {
      const id=uuid();vIds.push(id);
      await c.query(`INSERT INTO fms_vehicles (id,tenant_id,vehicle_code,license_plate,vehicle_type,brand,model,year,fuel_type,status,current_odometer_km,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'gasoline','available',$9,true,NOW(),NOW())`,
        [id,TID,`V-${p.slice(0,4)}`,p,t,b,m,y,Math.floor(Math.random()*100000)+10000]);
    }
  });

  await run(c, 'fms_drivers', async () => {
    const dd=[['Joko Widodo','0812-1234-0001','SIM-A-001','A'],['Suparman','0813-1234-0002','SIM-B1-001','B1'],['Agung Setiawan','0857-1234-0003','SIM-B2-001','B2'],['Bambang Hermanto','0821-1234-0004','SIM-A-002','A']];
    for (const [n,ph,lic,lt] of dd) {
      const id=uuid();dIds.push(id);
      await c.query(`INSERT INTO fms_drivers (id,tenant_id,driver_code,full_name,phone,license_number,license_type,license_expiry_date,status,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'2027-12-31','active',true,NOW(),NOW())`,
        [id,TID,`DRV-${lic.slice(-3)}`,n,ph,lic,lt]);
    }
  });

  await run(c, 'fms_fuel', async () => {
    for (let i=0;i<20;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*3);const qty=Math.floor(Math.random()*30)+20;
      await c.query(`INSERT INTO fms_fuel_records (id,tenant_id,vehicle_id,driver_id,fill_date,fuel_type,quantity_liters,price_per_liter,total_cost,odometer_reading,station_name,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'pertamax',$6,13500,$7,$8,$9,NOW(),NOW())`,
        [uuid(),TID,vIds[i%vIds.length]||vIds[0],dIds[i%dIds.length]||dIds[0],dt,qty,qty*13500,Math.floor(Math.random()*100000)+10000,['Shell Sudirman','Pertamina Gatot','BP Diponegoro','Shell Braga'][i%4]]);
    }
  });

  await run(c, 'fms_maintenance', async () => {
    for (let i=0;i<10;i++) {
      await c.query(`INSERT INTO fms_maintenance_records (id,tenant_id,vehicle_id,work_order_number,maintenance_type,category,description,total_cost,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'completed',NOW(),NOW())`,
        [uuid(),TID,vIds[i%vIds.length]||vIds[0],`WO-${i+1}`,['preventive','corrective'][i%2],['engine','tires','brakes','general','electrical'][i%5],['Ganti oli','Rotasi ban','Inspeksi rem','Servis umum','Cek kelistrikan'][i%5],Math.floor(Math.random()*3e6)+500000]);
    }
  });

  await run(c, 'fms_inspections', async () => {
    for (let i=0;i<8;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*10);
      await c.query(`INSERT INTO fms_inspections (id,tenant_id,vehicle_id,inspection_type,inspection_date,overall_status,overall_score,items_checked,items_passed,items_failed,inspector_name,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'pass',$6,20,$7,$8,$9,NOW(),NOW())`,
        [uuid(),TID,vIds[i%vIds.length]||vIds[0],['daily','weekly','monthly'][i%3],dt,Math.floor(Math.random()*20)+80,18+i%3,Math.max(0,2-i%3),['Ahmad Wijaya','Budi Santoso','Eko Prasetyo'][i%3]]);
    }
  });

  await run(c, 'fms_incidents', async () => {
    for (let i=0;i<4;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*25);
      await c.query(`INSERT INTO fms_incidents (id,tenant_id,incident_number,vehicle_id,driver_id,incident_type,severity,incident_date,location,description,repair_cost,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
        [uuid(),TID,`INC-${i+1}`,vIds[i%vIds.length]||vIds[0],dIds[i%dIds.length]||dIds[0],['collision','tire_blowout','engine_failure','fender_bender'][i],['low','medium','high','low'][i],dt,['Jl. Sudirman','Tol Cipularang','Jl. Gatot Subroto','Parkiran Mall'][i],['Goresan bumper','Ban pecah tol','Mesin overheat','Senggolan parkir'][i],[500000,2e6,5e6,300000][i],['resolved','resolved','in_progress','resolved'][i]]);
    }
  });

  // TMS
  const carIds=[], whIds=[], znIds=[], routeIds=[], shipIds=[];
  await run(c, 'tms_carriers', async () => {
    for (const [n,cd] of [['JNE Express','JNE'],['J&T Express','JNT'],['SiCepat','SCE'],['Anteraja','ANT'],['Internal Fleet','INT']]) {
      const id=uuid();carIds.push(id);
      await c.query(`INSERT INTO tms_carriers (id,tenant_id,carrier_code,carrier_name,carrier_type,phone,email,rating,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,'express','021-1234567',$5,$6,true,NOW(),NOW())`,
        [id,TID,cd,n,`${cd.toLowerCase()}@carrier.id`,(Math.random()*2+3).toFixed(1)]);
    }
  });

  await run(c, 'tms_warehouses', async () => {
    for (const [n,cd,ci,pr] of [['Gudang Bandung','WHBDG','Bandung','Jawa Barat'],['Gudang Jakarta','WHJKT','Jakarta','DKI Jakarta'],['Gudang Surabaya','WHSBY','Surabaya','Jawa Timur']]) {
      const id=uuid();whIds.push(id);
      await c.query(`INSERT INTO tms_warehouses (id,tenant_id,warehouse_code,warehouse_name,warehouse_type,city,province,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,'distribution',$5,$6,true,NOW(),NOW())`,
        [id,TID,cd,n,ci,pr]);
    }
  });

  await run(c, 'tms_zones', async () => {
    for (const [n,cd] of [['Jawa Barat','JABAR'],['DKI Jakarta','DKI'],['Jawa Timur','JATIM'],['Jawa Tengah','JATENG'],['Bali','BALI']]) {
      const id=uuid();znIds.push(id);
      await c.query(`INSERT INTO tms_zones (id,tenant_id,zone_code,zone_name,zone_type,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,'province',true,NOW(),NOW())`,
        [id,TID,cd,n]);
    }
  });

  await run(c, 'tms_routes', async () => {
    for (const [cd,o,d,km,h] of [['BDGJKT','Bandung','Jakarta',150,3],['JKTSBY','Jakarta','Surabaya',750,12],['BDGSMG','Bandung','Semarang',440,8],['JKTBDG','Jakarta','Bandung',150,3],['SBYBALI','Surabaya','Bali',420,10],['SMGJKT','Semarang','Jakarta',450,8]]) {
      const id=uuid();routeIds.push(id);
      await c.query(`INSERT INTO tms_routes (id,tenant_id,route_code,route_name,origin_name,destination_name,distance_km,estimated_duration_hours,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())`,
        [id,TID,cd,`Rute ${o}-${d}`,o,d,km,h]);
    }
  });

  await run(c, 'tms_shipments', async () => {
    for (let i=0;i<15;i++) {
      const id=uuid();shipIds.push(id);
      const dt=new Date();dt.setDate(dt.getDate()-i*4);
      const eta=new Date(dt);eta.setDate(eta.getDate()+Math.floor(Math.random()*5)+1);
      await c.query(`INSERT INTO tms_shipments (id,tenant_id,shipment_number,shipment_type,order_date,required_delivery_date,shipper_name,consignee_name,consignee_phone,consignee_address,origin_name,destination_name,total_weight_kg,total_pieces,goods_description,freight_charge,total_charge,carrier_id,route_id,priority,status,created_at,updated_at) VALUES ($1,$2,$3,'delivery',$4,$5,'Toko Sejahtera',$6,$7,$8,$9,$10,$11,$12,'Barang dagangan',$13,$13,$14,$15,$16,$17,NOW(),NOW())`,
        [id,TID,`SHP-${String(i+1).padStart(4,'0')}`,dt,eta,['PT Maju','CV Berkah','Toko Makmur','UD Sejahtera','Ibu Siti'][i%5],`0812-${5670+i}`,`Jl. Tujuan No.${i+1}`,['Bandung','Jakarta','Surabaya','Semarang','Bali'][i%5],['Jakarta','Surabaya','Semarang','Bandung','Bali'][(i+1)%5],Math.floor(Math.random()*500)+10,Math.floor(Math.random()*20)+1,Math.floor(Math.random()*2e6)+100000,carIds[i%carIds.length]||carIds[0],routeIds[i%routeIds.length]||routeIds[0],['normal','high','urgent','normal','high'][i%5],['pending','in_transit','delivered','in_transit','delivered'][i%5]]);
    }
  });

  await run(c, 'tms_tracking', async () => {
    const sts=['picked_up','in_transit','out_for_delivery','delivered'];
    for (let i=0;i<shipIds.length;i++) {
      for (let s=0;s<Math.min(Math.floor(Math.random()*4)+1,4);s++) {
        await c.query(`INSERT INTO tms_shipment_tracking (id,tenant_id,shipment_id,status,location,description,is_customer_visible,created_at) VALUES ($1,$2,$3,$4,$5,$6,true,NOW())`,
          [uuid(),TID,shipIds[i],sts[s],['Gudang BDG','Hub JKT','Sortir SBY','Delivered'][s],'Update pengiriman']);
      }
    }
  });

  await run(c, 'tms_rates', async () => {
    for (let i=0;i<10;i++) {
      await c.query(`INSERT INTO tms_rate_cards (id,tenant_id,rate_name,origin_zone_id,destination_zone_id,service_type,rate_type,min_weight_kg,max_weight_kg,base_rate,per_unit_rate,min_charge,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'express','per_kg',0,$6,$7,$8,$9,true,NOW(),NOW())`,
        [uuid(),TID,`Rate ${['JABAR-DKI','DKI-JATIM','JATIM-JATENG','JATENG-BALI','BALI-JABAR','JABAR-JATIM','DKI-JATENG','JATIM-BALI','JATENG-JABAR','BALI-DKI'][i]}`,znIds[i%znIds.length]||znIds[0],znIds[(i+1)%znIds.length]||znIds[0],[10,25,50,100,200][i%5],[25000,20000,15000,12000,10000][i%5],[15000,12000,10000,8000,6000][i%5],[25000,20000,15000,12000,10000][i%5]]);
    }
  });

  // CRM
  let crmCustId, contactIds=[];
  await run(c, 'crm_data', async () => {
    crmCustId=uuid();
    await c.query(`INSERT INTO crm_customers (id,tenant_id,company_name,industry,status,customer_type,source,health_score,lifetime_value,created_at,updated_at) VALUES ($1,$2,'PT Maju Bersama','retail','active','enterprise','referral',85,500000000,NOW(),NOW())`,[crmCustId,TID]);

    for (const [fn,ln,em,ph] of [['Rudi','Hartono','rudi@company.com','0812-1111-0001'],['Linda','Susanti','linda@corp.co.id','0813-2222-0002'],['Hadi','Wijaya','hadi@gmail.com','0857-3333-0003'],['Nia','Ramadhani','nia@yahoo.com','0821-4444-0004'],['Fajar','Nugroho','fajar@outlook.com','0856-5555-0005']]) {
      const id=uuid();contactIds.push(id);
      await c.query(`INSERT INTO crm_contacts (id,tenant_id,customer_id,first_name,last_name,email,phone,is_primary,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())`,
        [id,TID,crmCustId,fn,ln,em,ph,contactIds.length===1]);
    }

    for (let i=0;i<15;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*3);
      await c.query(`INSERT INTO crm_interactions (id,tenant_id,customer_id,contact_id,interaction_type,direction,subject,description,interaction_date,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [uuid(),TID,crmCustId,contactIds[i%5],['call','email','meeting','call','email'][i%5],['outbound','inbound'][i%2],['Follow up penawaran','Diskusi harga','Meeting review','Konfirmasi order','Negosiasi'][i%5],'Interaksi pelanggan',dt]);
    }

    for (let i=0;i<8;i++) {
      await c.query(`INSERT INTO crm_tickets (id,tenant_id,ticket_number,customer_id,subject,description,category,priority,status,source_channel,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [uuid(),TID,`TKT-${i+1}`,crmCustId,['Keluhan pengiriman','Retur produk','Tanya harga','Komplain kualitas','Request diskon','Delay delivery','Wrong item','Billing issue'][i],'Detail tiket pelanggan',['delivery','product','pricing','quality','pricing','delivery','product','billing'][i],['high','medium','low','high','medium','low','high','medium'][i],['open','in_progress','resolved','open','in_progress','resolved','open','closed'][i],['email','phone','whatsapp','email','phone','whatsapp','email','phone'][i]]);
    }

    for (let i=0;i<5;i++) {
      await c.query(`INSERT INTO crm_customer_segments (id,tenant_id,name,description,segment_type,customer_count,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,'dynamic',$5,true,NOW(),NOW())`,
        [uuid(),TID,['VIP Customers','Regular B2B','New Customers','Dormant','High Value Retail'][i],['Transaksi >100jt/bulan','Pelanggan bisnis reguler','Pelanggan baru <3 bulan','Tidak aktif >6 bulan','Retail spending tinggi'][i],[50,120,45,30,85][i]]);
    }

    for (let i=0;i<12;i++) {
      const dt=new Date();dt.setDate(dt.getDate()+(i*3)-15);
      await c.query(`INSERT INTO crm_follow_ups (id,tenant_id,customer_id,contact_id,title,follow_up_type,priority,status,due_date,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [uuid(),TID,crmCustId,contactIds[i%5],['Follow up proposal','Reminder pembayaran','Kunjungan rutin','Penawaran baru','Review kontrak'][i%5],['call','email','visit','call','email'][i%5],['high','medium','low'][i%3],dt<new Date()?'completed':'scheduled',dt]);
    }
  });

  // MARKETING
  await run(c, 'mkt_budgets', async () => {
    for (let i=0;i<4;i++) {
      await c.query(`INSERT INTO mkt_budgets (id,tenant_id,name,period_type,period,total_budget,allocated,spent,remaining,status,created_at,updated_at) VALUES ($1,$2,$3,'quarterly','Q1-2025',$4,$5,$6,$7,'active',NOW(),NOW())`,
        [uuid(),TID,['Budget Digital','Budget Event','Budget Promo','Budget Content'][i],[30e6,20e6,15e6,10e6][i],[28e6,18e6,14e6,9e6][i],[18e6,12e6,8e6,6e6][i],[12e6,8e6,7e6,4e6][i]]);
    }
  });

  await run(c, 'mkt_content', async () => {
    for (let i=0;i<10;i++) {
      await c.query(`INSERT INTO mkt_content_assets (id,tenant_id,title,asset_type,description,status,created_at,updated_at) VALUES ($1,$2,$3,$4,'Konten marketing',$5,NOW(),NOW())`,
        [uuid(),TID,['Banner Promo Lebaran','Video Produk Baru','Post Instagram','Flyer Diskon','Email Newsletter','Story WhatsApp','Banner Website','Poster Outlet','Konten TikTok','Artikel Blog'][i],['image','video','social','print','email','social','image','print','video','article'][i],['published','draft','published','published','scheduled','published','published','draft','published','draft'][i]]);
    }
  });

  // LOYALTY
  let lpId;
  await run(c, 'loyalty', async () => {
    lpId=uuid();
    await c.query(`INSERT INTO loyalty_programs (id,"programName",description,"isActive","pointsPerRupiah","minimumPurchase","pointsExpiry","autoEnroll","startDate","createdAt","updatedAt") VALUES ($1,'Program Poin Sejahtera','Program loyalitas pelanggan setia',true,1,10000,365,true,'2025-01-01',NOW(),NOW())`,[lpId]);

    for (const [n,lv,ms,pm,dp] of [['Bronze',1,0,1,0],['Silver',2,500000,1.5,5],['Gold',3,2000000,2,10],['Platinum',4,5000000,3,15]]) {
      await c.query(`INSERT INTO loyalty_tiers ("programId","tierName","tierLevel","minSpending","pointMultiplier","discountPercentage",benefits,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())`,
        [lpId,n,lv,ms,pm,dp,JSON.stringify({discount:dp,free_delivery:dp>=10})]);
    }

    for (const [n,rt,pts,rv] of [['Diskon 10%','discount',100,10000],['Free Delivery','shipping',200,0],['Voucher 50rb','voucher',500,50000],['Gift Merchandise','product',1000,100000]]) {
      await c.query(`INSERT INTO loyalty_rewards ("programId","rewardName",description,"pointsRequired","rewardType","rewardValue","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())`,
        [lpId,n,`Reward: ${n}`,pts,rt,rv]);
    }
  });

  // KITCHEN
  await run(c, 'kitchen', async () => {
    const koIds=[];
    for (let i=0;i<10;i++) {
      const id=uuid();koIds.push(id);
      await c.query(`INSERT INTO kitchen_orders (id,tenant_id,order_number,table_number,order_type,status,priority,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'Order dapur',NOW(),NOW())`,
        [id,TID,`KO-${1000+i}`,`T${(i%10)+1}`,['dine-in','takeaway','delivery'][i%3],['new','preparing','ready','served','new','preparing','ready','served','preparing','ready'][i],['normal','urgent','normal','urgent','normal'][i%5]]);
    }
    for (let i=0;i<koIds.length;i++) {
      for (let j=0;j<2;j++) {
        await c.query(`INSERT INTO kitchen_order_items (id,kitchen_order_id,name,quantity,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
          [uuid(),koIds[i],['Nasi Goreng Spesial','Mie Goreng','Ayam Bakar','Soto Ayam','Es Teh Manis','Kopi Susu','Roti Bakar'][(i+j)%7],Math.floor(Math.random()*3)+1,['pending','preparing','ready'][j%3]]);
    }}
  });

  // POS TRANSACTIONS
  await run(c, 'pos', async () => {
    for (let i=0;i<20;i++) {
      const txId=uuid();
      const dt=new Date();dt.setDate(dt.getDate()-i);
      const sub=Math.floor(Math.random()*500000)+50000;
      const tax=Math.floor(sub*0.11);
      await c.query(`INSERT INTO pos_transactions (id,transaction_number,cashier_id,transaction_date,subtotal,tax_amount,discount_amount,service_charge,total_amount,payment_method,payment_status,table_number,order_type,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,0,0,$7,$8,'paid',$9,$10,'closed','Transaksi POS',$4,$4)`,
        [txId,`TRX-${String(i+1).padStart(5,'0')}`,uuid(),dt,sub,tax,sub+tax,['cash','card','transfer','ewallet','cash'][i%5],`T${(i%10)+1}`,['dine-in','takeaway','delivery'][i%3]]);
      for (let j=0;j<Math.floor(Math.random()*3)+1;j++) {
        const up=[15000,25000,30000,22000,18000,8000,35000][j%7];const qty=Math.floor(Math.random()*3)+1;
        await c.query(`INSERT INTO pos_transaction_items (id,pos_transaction_id,product_id,product_name,quantity,unit_price,total_price,discount_amount,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,0,NOW(),NOW())`,
          [uuid(),txId,uuid(),['Roti Tawar','Kue Brownies','Nasi Goreng','Mie Goreng','Kopi Susu','Es Teh','Ayam Bakar'][j%7],qty,up,qty*up]);
      }
    }
  });

  // ORG STRUCTURES
  await run(c, 'org', async () => {
    const oIds=[];
    for (const [n,cd,pi,lv] of [['Direksi','BOD',null,1],['Operasional','OPS',0,2],['Keuangan','FIN',0,2],['SDM','HR',0,2],['Marketing','MKT',0,2],['Produksi','PRD',1,3],['Gudang','WH',1,3]]) {
      const id=uuid();oIds.push(id);
      await c.query(`INSERT INTO org_structures (id,tenant_id,name,code,parent_id,level,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,true,NOW(),NOW())`,
        [id,TID,n,cd,pi!==null?oIds[pi]:null,lv]);
    }
  });

  // SFA
  await run(c, 'sfa_activities', async () => {
    for (let i=0;i<15;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*2);
      await c.query(`INSERT INTO sfa_activities (id,tenant_id,activity_type,subject,description,activity_date,status,contact_name,created_at,updated_at) VALUES ($1,$2,$3,$4,'Aktivitas sales force',$5,$6,$7,NOW(),NOW())`,
        [uuid(),TID,['visit','call','email','meeting','demo'][i%5],['Kunjungan outlet','Follow up call','Email penawaran','Meeting review','Demo produk'][i%5],dt,i<5?'completed':'planned',['Ahmad Wijaya','Siti Rahayu','Budi Santoso','Dewi Lestari','Eko Prasetyo'][i%5]]);
    }
  });

  await run(c, 'sfa_quotations', async () => {
    for (let i=0;i<8;i++) {
      const qid=uuid();
      const vu=new Date();vu.setDate(vu.getDate()+30-i*7);
      const amt=Math.floor(Math.random()*50e6)+5e6;
      await c.query(`INSERT INTO sfa_quotations (id,tenant_id,quotation_number,customer_name,status,valid_until,total,currency,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'IDR',NOW(),NOW())`,
        [qid,TID,`QUO-${i+1}`,['PT Maju Bersama','CV Berkah Sentosa','Toko Makmur Jaya','UD Sejahtera Abadi'][i%4],['draft','sent','accepted','rejected','draft','sent','accepted','sent'][i],vu,amt]);
      for (let j=0;j<3;j++) {
        const up=[15000,25000,12000][j];const qty=Math.floor(Math.random()*100)+10;
        await c.query(`INSERT INTO sfa_quotation_items (id,quotation_id,product_name,quantity,unit_price,subtotal,created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
          [uuid(),qid,['Roti Tawar Premium','Kue Brownies Coklat','Tepung Terigu Premium'][j],qty,up,qty*up]);
      }
    }
  });

  await run(c, 'sfa_routes', async () => {
    for (let i=0;i<6;i++) {
      await c.query(`INSERT INTO sfa_route_plans (id,tenant_id,name,day_of_week,frequency,total_stops,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,'weekly',$5,true,NOW(),NOW())`,
        [uuid(),TID,`Rute ${['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][i]} - ${['Bandung Utara','Bandung Selatan','Jakarta Barat','Jakarta Timur','Surabaya','Semarang'][i]}`,i+1,Math.floor(Math.random()*5)+3]);
    }
  });

  // USER PREFERENCES
  await run(c, 'user_prefs', async () => {
    for (const uid of [3,4,5,7]) {
      for (const [k,v] of [['theme','light'],['language','id'],['notifications','true'],['dashboard_layout','default']]) {
        await c.query(`INSERT INTO user_preferences (user_id,key,value,created_at,updated_at) VALUES ($1,$2,$3,NOW(),NOW())`, [uid,k,v]);
      }
    }
  });

  // SYNC LOGS
  await run(c, 'sync_logs', async () => {
    for (let i=0;i<10;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i);
      await c.query(`INSERT INTO sync_logs (tenant_id,branch_id,sync_type,direction,status,items_synced,total_items,started_at,completed_at,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,NOW(),NOW())`,
        [TID,[B1,B2,B3][i%3],['products','prices','promotions','settings','inventory','full'][i%6],['hq_to_branch','branch_to_hq'][i%2],i<8?'completed':'failed',Math.floor(Math.random()*500)+50,dt,i<8?dt:null]);
    }
  });

  // CUSTOMER LOYALTY
  await run(c, 'customer_loyalty', async () => {
    const names=['PT Maju Bersama','Ibu Siti Aminah','Bapak Hendra','CV Berkah Sentosa','Toko Makmur Jaya','Ny. Ratna Dewi','Bapak Andi','UD Sejahtera Abadi'];
    const phones=['021-5551234','0812-3456789','0813-9876543','031-7771234','022-4441234','0857-1234567','0821-5678123','024-6661234'];
    const emails=['maju@bersama.co.id','siti@gmail.com','hendra@yahoo.com','berkah@sentosa.id','makmur@jaya.co.id','ratna@gmail.com','andi@outlook.com','sejahtera@abadi.co.id'];
    const tiers=['Gold','Silver','Bronze','Gold','Platinum','Silver','Bronze','Gold'];
    const pts=[1250,450,180,2300,4500,280,120,1800];
    const spent=[125e6,45e6,18e6,230e6,450e6,28e6,12e6,180e6];
    for (let i=0;i<8;i++) {
      await c.query(`INSERT INTO customer_loyalty (id,tenant_id,customer_name,phone,email,tier,total_points,redeemed_points,total_spent,visit_count,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',NOW(),NOW())`,
        [uuid(),TID,names[i],phones[i],emails[i],tiers[i],pts[i],[200,50,0,500,1000,30,0,300][i],spent[i],[45,23,12,67,98,15,8,54][i]]);
    }
  });

  await c.query('COMMIT');
  c.release();
  await pool.end();
  console.log('\n=== PART 2 COMPLETE ===');
}
seed().catch(e=>{console.error(e);process.exit(1)});
