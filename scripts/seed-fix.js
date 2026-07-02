#!/usr/bin/env node
// Fix script for sections that failed in Part 1
const { Pool } = require('pg');
const crypto = require('crypto');
const pool = new Pool({ connectionString: 'postgresql://postgres:jakarta123@localhost:5432/bedagang_dev' });
const uuid = () => crypto.randomUUID();
const TID = '0eccef1b-0e4f-48a7-80de-e384d51051a5';
const B2 = 'ace037d0-20b9-4dfc-bc4f-528940c6a2e8';

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
  console.log('=== SEED FIXES ===\n');

  // FIX: CUSTOMERS - need explicit UUID id
  await run(c, 'customers', async () => {
    const n=['PT Maju Bersama','Ibu Siti Aminah','Bapak Hendra','CV Berkah Sentosa','Toko Makmur Jaya','Ny. Ratna Dewi','Bapak Andi','UD Sejahtera Abadi','PT Global Mandiri','Koperasi Harapan'];
    const e=['maju@bersama.co.id','siti@gmail.com','hendra@yahoo.com','berkah@sentosa.id','makmur@jaya.co.id','ratna@gmail.com','andi@outlook.com','sejahtera@abadi.co.id','global@mandiri.co.id','koperasi@harapan.id'];
    const p=['021-5551234','0812-3456789','0813-9876543','031-7771234','022-4441234','0857-1234567','0821-5678123','024-6661234','021-8881234','0274-5551234'];
    const ci=['Jakarta','Bandung','Surabaya','Semarang','Bandung','Jakarta','Yogyakarta','Semarang','Jakarta','Yogyakarta'];
    const pr=['DKI Jakarta','Jawa Barat','Jawa Timur','Jawa Tengah','Jawa Barat','DKI Jakarta','DI Yogyakarta','Jawa Tengah','DKI Jakarta','DI Yogyakarta'];
    const ml=['Gold','Silver','Bronze','Gold','Platinum','Silver','Bronze','Gold','Platinum','Silver'];
    const sp=[125e6,45e6,18e6,230e6,450e6,28e6,12e6,180e6,320e6,52e6];
    for (let i=0;i<10;i++) {
      await c.query(`INSERT INTO customers (id,name,phone,email,address,city,province,"postalCode",type,"customerType",status,"membershipLevel",points,discount,"totalPurchases","totalSpent","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$12,$13,$14,$15,true,NOW(),NOW())`,
        [uuid(),n[i],p[i],e[i],`Jl. Contoh No.${i+1}`,ci[i],pr[i],`${10220+i*100}`,['vip','member','walk-in','vip','vip','member','walk-in','vip','vip','member'][i],i<5?'corporate':'individual',ml[i],[1250,450,180,2300,4500,280,120,1800,3200,600][i],[10,5,0,10,15,5,0,10,15,5][i],[45,23,12,67,98,15,8,54,72,18][i],sp[i]]);
    }
  });

  // FIX: FINANCE INVOICES - need explicit UUID id
  await run(c, 'fin_invoices', async () => {
    for (let i=1;i<=15;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-(i*7));
      const due=new Date(dt);due.setDate(due.getDate()+30);
      const amt=Math.floor(Math.random()*50e6)+5e6;
      const pd=[0,amt,Math.floor(amt*0.5),0,amt][i%5];
      await c.query(`INSERT INTO finance_invoices (id,"invoiceNumber",type,"customerName","supplierName","invoiceDate","dueDate","totalAmount","paidAmount","remainingAmount","paymentStatus",status,notes,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,NOW(),NOW())`,
        [uuid(),`INV-2025-${String(i).padStart(4,'0')}`,i%2===0?'customer':'supplier',i%2===0?['PT Maju','CV Berkah','Toko Makmur','UD Sejahtera','Siti'][i%5]:null,i%2!==0?['PT Supplier','CV Bahan','Toko Material'][i%3]:null,dt,due,amt,pd,amt-pd,['unpaid','paid','partial','unpaid','paid'][i%5],['pending','received','delivered','pending','received'][i%5],'Invoice dummy']);
    }
  });

  // FIX: FINANCE TRANSACTIONS - need explicit UUID id
  await run(c, 'fin_transactions', async () => {
    const cats=['Penjualan','Pembelian Bahan','Gaji','Sewa','Utilitas','Marketing','Transport','Maintenance'];
    for (let i=0;i<30;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*3);
      const amt=Math.floor(Math.random()*20e6)+1e6;
      await c.query(`INSERT INTO finance_transactions (id,"transactionNumber","transactionDate","transactionType",category,amount,description,status,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,'completed',true,$3,NOW())`,
        [uuid(),`TRX-${1000+i}`,dt,['income','expense','transfer'][i%3],cats[i%8],amt,`${['income','expense','transfer'][i%3]} - ${cats[i%8]}`]);
    }
  });

  // FIX: FINANCE BUDGETS - need explicit UUID id
  await run(c, 'fin_budgets', async () => {
    for (let i=0;i<5;i++) {
      const ba=[100e6,50e6,30e6,80e6,120e6][i],sa=[65e6,32e6,18e6,45e6,78e6][i];
      await c.query(`INSERT INTO finance_budgets (id,"budgetName","budgetPeriod","startDate","endDate",category,"budgetAmount","spentAmount","remainingAmount",status,"isActive","createdAt","updatedAt") VALUES ($1,$2,'quarterly',$3,$4,$5,$6,$7,$8,'active',true,NOW(),NOW())`,
        [uuid(),['Budget Ops Q1','Budget Mkt Q1','Budget IT Q1','Budget HR Q1','Budget Prod Q1'][i],'2025-01-01','2025-03-31',['operations','marketing','it','hr','production'][i],ba,sa,ba-sa]);
    }
  });

  // FIX: FINANCE PAYABLES - need explicit UUID id
  await run(c, 'fin_payables', async () => {
    for (let i=0;i<8;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*10);
      const due=new Date(dt);due.setDate(due.getDate()+30);
      const amt=Math.floor(Math.random()*30e6)+5e6;const pd=i%3===0?amt:0;
      await c.query(`INSERT INTO finance_payables (id,"supplierName","invoiceNumber","invoiceDate","dueDate","totalAmount","paidAmount","remainingAmount",status,notes,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$4,NOW())`,
        [uuid(),['PT Supplier Jaya','CV Bahan Baku','Toko Material','PT Logistik','UD Packaging'][i%5],`AP-${i+1}`,dt,due,amt,pd,amt-pd,pd>0?'paid':'unpaid','Hutang usaha']);
    }
  });

  // FIX: FINANCE RECEIVABLES - need explicit UUID id
  await run(c, 'fin_receivables', async () => {
    for (let i=0;i<8;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*8);
      const due=new Date(dt);due.setDate(due.getDate()+45);
      const amt=Math.floor(Math.random()*40e6)+10e6;const pd=i%4===0?amt:0;
      await c.query(`INSERT INTO finance_receivables (id,"customerName","invoiceNumber","invoiceDate","dueDate","totalAmount","paidAmount","remainingAmount",status,notes,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$4,NOW())`,
        [uuid(),['PT Maju','CV Berkah','Toko Makmur','UD Sejahtera','Siti'][i%5],`AR-${i+1}`,dt,due,amt,pd,amt-pd,pd>0?'paid':'unpaid','Piutang usaha']);
    }
  });

  // FIX: LEAVE DATA - leave_type_id is UUID
  await run(c, 'leave_data', async () => {
    // Get actual leave type IDs
    const lt = await c.query('SELECT id FROM leave_types LIMIT 7');
    const ltIds = lt.rows.map(r => r.id);
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO leave_balances (tenant_id,employee_id,leave_type_id,year,entitled_days,used_days,pending_days,created_at,updated_at) VALUES ($1,$2,$3,2025,12,$4,0,NOW(),NOW())`,
        [TID,emp,ltIds[0],Math.floor(Math.random()*5)]);
    }
    for (let i=0;i<10;i++) {
      const s=new Date();s.setDate(s.getDate()+(i*5)-20);
      const e=new Date(s);e.setDate(e.getDate()+Math.floor(Math.random()*3)+1);
      await c.query(`INSERT INTO leave_requests (tenant_id,employee_id,branch_id,leave_type,start_date,end_date,total_days,reason,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [TID,(i%5)+1,B2,['annual','sick','personal','annual','sick'][i%5],s,e,Math.floor(Math.random()*3)+1,['Cuti Tahunan','Sakit','Keperluan Keluarga','Liburan','Pribadi'][i%5],['pending','approved','approved','rejected','approved'][i%5]]);
    }
  });

  // FIX: PERFORMANCE REVIEWS - strengths/areas_for_improvement/goals are JSONB
  await run(c, 'perf_reviews', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO performance_reviews (id,tenant_id,employee_id,reviewer_id,period,overall_score,status,strengths,areas_for_improvement,goals,created_at,updated_at) VALUES ($1,$2,$3,$4,'Q4-2024',$5,'completed',$6,$7,$8,NOW(),NOW())`,
        [uuid(),TID,emp,emp===1?2:1,[85,90,78,82,88][emp-1],
         JSON.stringify(["Kinerja baik","Tepat waktu","Inisiatif tinggi"]),
         JSON.stringify(["Komunikasi tim perlu ditingkatkan","Time management"]),
         JSON.stringify(["Target penjualan Q1 2025","Meningkatkan customer satisfaction"])]);
    }
  });

  await c.query('COMMIT');
  c.release();
  await pool.end();
  console.log('\n=== FIXES COMPLETE ===');
}
seed().catch(e=>{console.error(e);process.exit(1)});
