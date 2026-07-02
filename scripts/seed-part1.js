#!/usr/bin/env node
// Part 1: Customers, Finance, Employee/HRIS data
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:jakarta123@localhost:5432/bedagang_dev' });
const TID = '0eccef1b-0e4f-48a7-80de-e384d51051a5';
const B2 = 'ace037d0-20b9-4dfc-bc4f-528940c6a2e8';
const B1 = '8b566edf-70d1-4615-822b-857ce1298752';

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
  console.log('=== SEED PART 1 ===\n');

  // CUSTOMERS
  await run(c, 'customers', async () => {
    const n=['PT Maju Bersama','Ibu Siti Aminah','Bapak Hendra','CV Berkah Sentosa','Toko Makmur Jaya','Ny. Ratna Dewi','Bapak Andi','UD Sejahtera Abadi','PT Global Mandiri','Koperasi Harapan'];
    const e=['maju@bersama.co.id','siti@gmail.com','hendra@yahoo.com','berkah@sentosa.id','makmur@jaya.co.id','ratna@gmail.com','andi@outlook.com','sejahtera@abadi.co.id','global@mandiri.co.id','koperasi@harapan.id'];
    const p=['021-5551234','0812-3456789','0813-9876543','031-7771234','022-4441234','0857-1234567','0821-5678123','024-6661234','021-8881234','0274-5551234'];
    const ci=['Jakarta','Bandung','Surabaya','Semarang','Bandung','Jakarta','Yogyakarta','Semarang','Jakarta','Yogyakarta'];
    const pr=['DKI Jakarta','Jawa Barat','Jawa Timur','Jawa Tengah','Jawa Barat','DKI Jakarta','DI Yogyakarta','Jawa Tengah','DKI Jakarta','DI Yogyakarta'];
    const ml=['Gold','Silver','Bronze','Gold','Platinum','Silver','Bronze','Gold','Platinum','Silver'];
    const sp=[125e6,45e6,18e6,230e6,450e6,28e6,12e6,180e6,320e6,52e6];
    const tp=[45,23,12,67,98,15,8,54,72,18];
    const pt=[1250,450,180,2300,4500,280,120,1800,3200,600];
    for (let i=0;i<10;i++) {
      await c.query(`INSERT INTO customers (name,phone,email,address,city,province,"postalCode",type,"customerType",status,"membershipLevel",points,discount,"totalPurchases","totalSpent","isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13,$14,true,NOW(),NOW())`,
        [n[i],p[i],e[i],`Jl. Contoh No.${i+1}`,ci[i],pr[i],`${10220+i*100}`,['vip','member','walk-in','vip','vip','member','walk-in','vip','vip','member'][i],i<5?'corporate':'individual',ml[i],pt[i],[10,5,0,10,15,5,0,10,15,5][i],tp[i],sp[i]]);
    }
  });

  // FINANCE INVOICES
  await run(c, 'fin_invoices', async () => {
    for (let i=1;i<=15;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-(i*7));
      const due=new Date(dt);due.setDate(due.getDate()+30);
      const amt=Math.floor(Math.random()*50e6)+5e6;
      const pd=[0,amt,Math.floor(amt*0.5),0,amt][i%5];
      await c.query(`INSERT INTO finance_invoices ("invoiceNumber",type,"customerName","supplierName","invoiceDate","dueDate","totalAmount","paidAmount","remainingAmount","paymentStatus",status,notes,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),NOW())`,
        [`INV-2025-${String(i).padStart(4,'0')}`,i%2===0?'customer':'supplier',i%2===0?['PT Maju','CV Berkah','Toko Makmur','UD Sejahtera','Siti'][i%5]:null,i%2!==0?['PT Supplier','CV Bahan','Toko Material'][i%3]:null,dt,due,amt,pd,amt-pd,['unpaid','paid','partial','unpaid','paid'][i%5],['pending','received','delivered','pending','received'][i%5],'Invoice dummy']);
    }
  });

  // FINANCE TRANSACTIONS
  await run(c, 'fin_transactions', async () => {
    const cats=['Penjualan','Pembelian Bahan','Gaji','Sewa','Utilitas','Marketing','Transport','Maintenance'];
    for (let i=0;i<30;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*3);
      const amt=Math.floor(Math.random()*20e6)+1e6;
      await c.query(`INSERT INTO finance_transactions ("transactionNumber","transactionDate","transactionType",category,amount,description,status,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,'completed',true,$2,NOW())`,
        [`TRX-${1000+i}`,dt,['income','expense','transfer'][i%3],cats[i%8],amt,`${['income','expense','transfer'][i%3]} - ${cats[i%8]}`]);
    }
  });

  // FINANCE BUDGETS
  await run(c, 'fin_budgets', async () => {
    for (let i=0;i<5;i++) {
      const ba=[100e6,50e6,30e6,80e6,120e6][i],sa=[65e6,32e6,18e6,45e6,78e6][i];
      await c.query(`INSERT INTO finance_budgets ("budgetName","budgetPeriod","startDate","endDate",category,"budgetAmount","spentAmount","remainingAmount",status,"isActive","createdAt","updatedAt") VALUES ($1,'quarterly',$2,$3,$4,$5,$6,$7,'active',true,NOW(),NOW())`,
        [['Budget Ops Q1','Budget Mkt Q1','Budget IT Q1','Budget HR Q1','Budget Prod Q1'][i],'2025-01-01','2025-03-31',['operations','marketing','it','hr','production'][i],ba,sa,ba-sa]);
    }
  });

  // FINANCE PAYABLES
  await run(c, 'fin_payables', async () => {
    for (let i=0;i<8;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*10);
      const due=new Date(dt);due.setDate(due.getDate()+30);
      const amt=Math.floor(Math.random()*30e6)+5e6;const pd=i%3===0?amt:0;
      await c.query(`INSERT INTO finance_payables ("supplierName","invoiceNumber","invoiceDate","dueDate","totalAmount","paidAmount","remainingAmount",status,notes,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$3,NOW())`,
        [['PT Supplier Jaya','CV Bahan Baku','Toko Material','PT Logistik','UD Packaging'][i%5],`AP-${i+1}`,dt,due,amt,pd,amt-pd,pd>0?'paid':'unpaid','Hutang usaha']);
    }
  });

  // FINANCE RECEIVABLES
  await run(c, 'fin_receivables', async () => {
    for (let i=0;i<8;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*8);
      const due=new Date(dt);due.setDate(due.getDate()+45);
      const amt=Math.floor(Math.random()*40e6)+10e6;const pd=i%4===0?amt:0;
      await c.query(`INSERT INTO finance_receivables ("customerName","invoiceNumber","invoiceDate","dueDate","totalAmount","paidAmount","remainingAmount",status,notes,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$3,NOW())`,
        [['PT Maju','CV Berkah','Toko Makmur','UD Sejahtera','Siti'][i%5],`AR-${i+1}`,dt,due,amt,pd,amt-pd,pd>0?'paid':'unpaid','Piutang usaha']);
    }
  });

  // EMPLOYEE ATTENDANCES
  await run(c, 'emp_attendance', async () => {
    for (let emp=1;emp<=5;emp++) {
      for (let d=0;d<30;d++) {
        const dt=new Date();dt.setDate(dt.getDate()-d);
        if(dt.getDay()===0||dt.getDay()===6) continue;
        const ci=new Date(dt);ci.setHours(8,Math.floor(Math.random()*30),0);
        const co=new Date(dt);co.setHours(17,Math.floor(Math.random()*30),0);
        const st=Math.random()>0.1?'present':(Math.random()>0.5?'late':'absent');
        await c.query(`INSERT INTO employee_attendances (tenant_id,employee_id,branch_id,attendance_date,check_in,check_out,status,late_minutes,overtime_minutes,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
          [TID,emp,B2,dt,st!=='absent'?ci:null,st!=='absent'?co:null,st,st==='late'?15:0,Math.random()>0.7?60:0,st==='late'?'Terlambat':'']);
      }
    }
  });

  // EMPLOYEE SALARIES
  await run(c, 'emp_salaries', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_salaries (tenant_id,employee_id,pay_type,base_salary,bank_name,bank_account_number,bank_account_name,tax_status,is_active,start_date,created_at,updated_at) VALUES ($1,$2,'monthly',$3,$4,$5,$6,'TK/0',true,'2024-01-01',NOW(),NOW())`,
        [TID,emp,[8e6,7.5e6,6e6,7e6,6.5e6][emp-1],['BCA','Mandiri','BNI','BRI','CIMB'][emp-1],`${1234567890+emp}`,['Ahmad Wijaya','Siti Rahayu','Budi Santoso','Dewi Lestari','Eko Prasetyo'][emp-1]]);
    }
  });

  // EMPLOYEE CONTRACTS
  await run(c, 'emp_contracts', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_contracts (tenant_id,employee_id,contract_type,contract_number,start_date,end_date,status,salary,position,department,branch_id,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,'2024-01-01',$5,'active',$6,$7,$8,$9,'Kontrak kerja',NOW(),NOW())`,
        [TID,emp,emp<=2?'permanent':'contract',`CTR-${emp}`,emp<=2?null:'2025-12-31',[8e6,7.5e6,6e6,7e6,6.5e6][emp-1],['Manager','Supervisor','Kasir','Staff Gudang','Marketing'][emp-1],['Operations','Operations','Sales','Warehouse','Marketing'][emp-1],B2]);
    }
  });

  // LEAVE
  await run(c, 'leave_data', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO leave_balances (tenant_id,employee_id,leave_type_id,year,entitled_days,used_days,pending_days,created_at,updated_at) VALUES ($1,$2,1,2025,12,$3,0,NOW(),NOW())`,
        [TID,emp,Math.floor(Math.random()*5)]);
    }
    for (let i=0;i<10;i++) {
      const s=new Date();s.setDate(s.getDate()+(i*5)-20);
      const e=new Date(s);e.setDate(e.getDate()+Math.floor(Math.random()*3)+1);
      await c.query(`INSERT INTO leave_requests (tenant_id,employee_id,branch_id,leave_type,start_date,end_date,total_days,reason,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [TID,(i%5)+1,B2,['annual','sick','personal','annual','sick'][i%5],s,e,Math.floor(Math.random()*3)+1,['Cuti Tahunan','Sakit','Keperluan Keluarga','Liburan','Pribadi'][i%5],['pending','approved','approved','rejected','approved'][i%5]]);
    }
  });

  // PAYROLL
  await run(c, 'payroll', async () => {
    for (let m=1;m<=3;m++) {
      await c.query(`INSERT INTO payroll_runs (tenant_id,run_code,name,period_start,period_end,pay_date,pay_type,status,total_gross,total_deductions,total_net,employee_count,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'monthly',$7,35000000,5250000,29750000,5,NOW(),NOW())`,
        [TID,`PR-2025-${m}`,`Payroll ${['Jan','Feb','Mar'][m-1]} 2025`,`2025-${String(m).padStart(2,'0')}-01`,`2025-${String(m).padStart(2,'0')}-28`,`2025-${String(m).padStart(2,'0')}-25`,m<=2?'completed':'processing']);
    }
  });

  // PERFORMANCE REVIEWS
  await run(c, 'perf_reviews', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO performance_reviews (tenant_id,employee_id,reviewer_id,period,overall_score,status,strengths,areas_for_improvement,goals,created_at,updated_at) VALUES ($1,$2,$3,'Q4-2024',$4,'completed','Kinerja baik, tepat waktu, inisiatif tinggi','Komunikasi tim perlu ditingkatkan','Target penjualan Q1 2025',NOW(),NOW())`,
        [TID,emp,emp===1?2:1,[85,90,78,82,88][emp-1]]);
    }
  });

  // EMPLOYEE EXTENDED
  await run(c, 'emp_skills', async () => {
    const sk=['Microsoft Office','POS System','Inventory Mgmt','Customer Service','Leadership','Food Safety','Accounting','Digital Mkt'];
    for (let emp=1;emp<=5;emp++) {
      for (let s=0;s<3;s++) {
        await c.query(`INSERT INTO employee_skills (tenant_id,employee_id,name,category,proficiency_level,created_at,updated_at) VALUES ($1,$2,$3,'professional',$4,NOW(),NOW())`,
          [TID,emp,sk[(emp+s)%8],['beginner','intermediate','advanced','expert'][Math.floor(Math.random()*4)]]);
      }
    }
  });

  await run(c, 'emp_edu', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_educations (tenant_id,employee_id,level,institution,major,start_year,end_year,is_highest,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,2015,2019,true,NOW(),NOW())`,
        [TID,emp,['S1','S1','D3','S1','S1'][emp-1],['Unpad','ITB','UI','UGM','ITS'][emp-1],['Manajemen','Teknik Informatika','Akuntansi','Teknik Industri','Teknik Mesin'][emp-1]]);
    }
  });

  await run(c, 'emp_family', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_families (tenant_id,employee_id,name,relationship,gender,date_of_birth,occupation,is_emergency_contact,is_dependent,created_at,updated_at) VALUES ($1,$2,$3,'spouse','female','1995-05-15',$4,true,true,NOW(),NOW())`,
        [TID,emp,['Ratna Sari','Dewi A','Siti N','Maya S','Putri H'][emp-1],['Guru','Dokter','Wiraswasta','PNS','IRT'][emp-1]]);
    }
  });

  await run(c, 'emp_certs', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_certifications (tenant_id,employee_id,name,issuing_organization,issue_date,expiry_date,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,'2024-01-15','2026-01-15',true,NOW(),NOW())`,
        [TID,emp,['Food Safety','First Aid','HACCP','Fire Safety','K3'][emp-1],['BPOM','PMI','SGS','Damkar','Kemnaker'][emp-1]]);
    }
  });

  await run(c, 'emp_kpis', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_kpis (tenant_id,employee_id,branch_id,period,metric_name,category,target,actual,unit,weight,status,created_at,updated_at) VALUES ($1,$2,$3,'2025-02','Target Penjualan','sales',100,$4,'%',30,'active',NOW(),NOW())`,
        [TID,emp,B2,Math.floor(Math.random()*30)+70]);
    }
  });

  await run(c, 'emp_work_exp', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_work_experiences (tenant_id,employee_id,company_name,position,department,start_date,end_date,is_current,description,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'2019-01-01','2023-12-31',false,'Pengalaman kerja sebelumnya',NOW(),NOW())`,
        [TID,emp,['PT ABC','CV XYZ','Toko 123','PT DEF','UD GHI'][emp-1],['Staff','Kasir','Admin','Operator','Sales'][emp-1],['Sales','Retail','Admin','Production','Marketing'][emp-1]]);
    }
  });

  await run(c, 'emp_docs', async () => {
    for (let emp=1;emp<=5;emp++) {
      await c.query(`INSERT INTO employee_documents (tenant_id,employee_id,document_type,document_number,title,description,is_active,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'Dokumen karyawan',true,'verified',NOW(),NOW())`,
        [TID,emp,['ktp','npwp','bpjs','sim','ijazah'][emp-1],`DOC-${emp}`,['KTP','NPWP','BPJS','SIM','Ijazah'][emp-1]]);
    }
  });

  await run(c, 'emp_claims', async () => {
    for (let i=0;i<8;i++) {
      const dt=new Date();dt.setDate(dt.getDate()-i*7);
      await c.query(`INSERT INTO employee_claims (tenant_id,employee_id,claim_number,claim_type,amount,claim_date,description,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
        [TID,(i%5)+1,`CLM-${i+1}`,['transport','medical','meal','training'][i%4],[150000,500000,75000,1200000,200000,350000,100000,800000][i],dt,['Klaim transport','Klaim kesehatan','Klaim makan','Klaim training'][i%4],['approved','pending','approved','rejected'][i%4]]);
    }
  });

  await run(c, 'emp_mutations', async () => {
    await c.query(`INSERT INTO employee_mutations (tenant_id,employee_id,mutation_type,mutation_number,effective_date,status,from_branch_id,from_department,from_position,to_branch_id,to_department,to_position,reason,created_at,updated_at) VALUES ($1,3,'transfer','MUT-001','2025-02-01','approved',$2,'Sales','Kasir',$3,'Operations','Supervisor','Promosi jabatan',NOW(),NOW())`, [TID,B2,B1]);
  });

  // HRIS
  await run(c, 'hris_training', async () => {
    for (let i=0;i<4;i++) {
      await c.query(`INSERT INTO hris_training_programs (tenant_id,title,category,training_type,status,start_date,end_date,max_participants,current_participants,description,created_at,updated_at) VALUES ($1,$2,$3,'workshop',$4,$5,$6,$7,$8,'Program pelatihan',NOW(),NOW())`,
        [TID,['Keselamatan Kerja','Workshop Leadership','Sertifikasi Food Safety','Customer Service'][i],['safety','leadership','certification','soft_skill'][i],i<3?'ongoing':'planned',['2025-03-01','2025-02-15','2025-04-01','2025-05-01'][i],['2025-03-02','2025-02-16','2025-04-03','2025-05-02'][i],[20,10,15,25][i],[15,8,0,0][i]]);
    }
  });

  await run(c, 'hris_jobs', async () => {
    for (let i=0;i<4;i++) {
      await c.query(`INSERT INTO hris_job_openings (tenant_id,branch_id,title,department,location,employment_type,status,priority,salary_min,salary_max,applicants,description,created_at,updated_at) VALUES ($1,$2,$3,$4,'Bandung','full_time','open','medium',$5,$6,$7,'Lowongan kerja',NOW(),NOW())`,
        [TID,B2,['Kasir','Staff Gudang','Supervisor','Marketing Staff'][i],['operations','warehouse','management','marketing'][i],[4e6,4.5e6,7e6,5e6][i],[6e6,6.5e6,10e6,7.5e6][i],[12,8,5,10][i]]);
    }
  });

  await run(c, 'hris_candidates', async () => {
    const cn=[['Rina Marlina','rina@gmail.com'],['Dedi Kurniawan','dedi@yahoo.com'],['Maya Sari','maya@gmail.com'],['Agus Hermawan','agus@outlook.com'],['Fitri Handayani','fitri@gmail.com']];
    for (let i=0;i<5;i++) {
      await c.query(`INSERT INTO hris_candidates (tenant_id,full_name,email,phone,current_stage,status,source,applied_date,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,'website',NOW(),NOW(),NOW())`,
        [TID,cn[i][0],cn[i][1],`0812-${String(1111*(i+1))}`,['applied','screening','interview','offered','applied'][i],['new','in_review','shortlisted','offered','new'][i]]);
    }
  });

  await c.query('COMMIT');
  c.release();
  await pool.end();
  console.log('\n=== PART 1 COMPLETE ===');
}
seed().catch(e=>{console.error(e);process.exit(1)});
