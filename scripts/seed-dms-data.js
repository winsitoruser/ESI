'use strict';
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');
const sequelize = new Sequelize(
  config.development.database,
  config.development.username,
  config.development.password,
  { host: config.development.host, port: config.development.port, dialect: config.development.dialect, logging: false }
);
const crypto = require('crypto');

async function main() {
  const models = {
    DmsFile: require('../models/DmsFile'),
    DmsFolder: require('../models/DmsFolder'),
    DmsMataElangShare: require('../models/DmsMataElangShare'),
    DmsLetter: require('../models/DmsLetter'),
    DmsSignature: require('../models/DmsSignature'),
    DmsPpidRequest: require('../models/DmsPpidRequest'),
    DmsDisposalBatch: require('../models/DmsDisposalBatch'),
    DmsDisposition: require('../models/DmsDisposition'),
    DmsAccessLog: require('../models/DmsAccessLog'),
    DmsHierarchyNode: require('../models/DmsHierarchyNode'),
    DmsKnowledgeEdge: require('../models/DmsKnowledgeEdge'),
    DmsOpenDataset: require('../models/DmsOpenDataset'),
    DmsRecordsClassification: require('../models/DmsRecordsClassification'),
    DmsRetentionPolicy: require('../models/DmsRetentionPolicy'),
    TransactionBlock: require('../models/TransactionBlock'),
    AuditReceipt: require('../models/AuditReceipt'),
    ChainVerificationLog: require('../models/ChainVerificationLog'),
  };

  // ── Seed Hierarki Nasional ──
  const hierNodes = [
    { code: '00',     name: 'Pusat HQ Bedagang',      level: 'pusat',       parentId: null, region: 'id-jk', filesCount: 0, lettersCount: 0, storageQuotaTb: 500 },
    { code: '31',     name: 'DKI Jakarta',             level: 'provinsi',    region: 'id-jk', filesCount: 0, lettersCount: 0, storageQuotaTb: 100 },
    { code: '32',     name: 'Jawa Barat',              level: 'provinsi',    region: 'id-jb', filesCount: 0, lettersCount: 0, storageQuotaTb: 120 },
    { code: '33',     name: 'Jawa Tengah',             level: 'provinsi',    region: 'id-jt', filesCount: 0, lettersCount: 0, storageQuotaTb: 100 },
    { code: '35',     name: 'Jawa Timur',              level: 'provinsi',    region: 'id-ji', filesCount: 0, lettersCount: 0, storageQuotaTb: 100 },
    { code: '12',     name: 'Sumatera Utara',          level: 'provinsi',    region: 'id-su', filesCount: 0, lettersCount: 0, storageQuotaTb: 80 },
    { code: '73',     name: 'Sulawesi Selatan',        level: 'provinsi',    region: 'id-sn', filesCount: 0, lettersCount: 0, storageQuotaTb: 60 },
    { code: '94',     name: 'Papua',                   level: 'provinsi',    region: 'id-pa', filesCount: 0, lettersCount: 0, storageQuotaTb: 40 },
    { code: '31.71',  name: 'Kota Jakarta Pusat',      level: 'kota',        region: 'id-jk', filesCount: 0, lettersCount: 0, storageQuotaTb: 30 },
    { code: '32.73',  name: 'Kota Bandung',            level: 'kota',        region: 'id-jb', filesCount: 0, lettersCount: 0, storageQuotaTb: 30 },
    { code: '35.78',  name: 'Kota Surabaya',           level: 'kota',        region: 'id-ji', filesCount: 0, lettersCount: 0, storageQuotaTb: 30 },
  ];
  for (const n of hierNodes) {
    await models.DmsHierarchyNode.findOrCreate({ where: { code: n.code }, defaults: n });
  }
  console.log('OK: Hierarchy seeded (' + hierNodes.length + ' nodes)');

  // ── Seed PKAD / Records Classification ──
  const pkad = [
    { code: 'KU',       name: 'Keuangan',              level: 1, parentId: null, finalDisposition: 'review' },
    { code: 'KU.01',    name: 'Anggaran',              level: 2, finalDisposition: 'destroy', activePeriodYears: 2, inactivePeriodYears: 5, legalBasis: 'UU KUP' },
    { code: 'KU.04',    name: 'Pajak',                 level: 2, finalDisposition: 'destroy', activePeriodYears: 2, inactivePeriodYears: 8, legalBasis: 'UU KUP - 10 tahun' },
    { code: 'KP',       name: 'Kepegawaian',           level: 1, parentId: null, finalDisposition: 'review' },
    { code: 'KP.04',    name: 'Pensiun',               level: 2, finalDisposition: 'permanent', activePeriodYears: 2, inactivePeriodYears: 75 },
    { code: 'HK',       name: 'Hukum',                 level: 1, parentId: null, finalDisposition: 'review' },
    { code: 'HK.03',    name: 'Litigasi',              level: 2, finalDisposition: 'permanent', activePeriodYears: 10, inactivePeriodYears: 20 },
    { code: 'OT',       name: 'Organisasi & Tata Laksana', level: 1, parentId: null, finalDisposition: 'review' },
    { code: 'TI',       name: 'Teknologi Informasi',   level: 1, parentId: null, finalDisposition: 'review' },
    { code: 'TI.02',    name: 'Keamanan Informasi',    level: 2, finalDisposition: 'permanent', activePeriodYears: 5, inactivePeriodYears: 10, legalBasis: 'UU PDP 27/2022' },
  ];
  for (const c of pkad) {
    await models.DmsRecordsClassification.findOrCreate({ where: { code: c.code }, defaults: c });
  }
  console.log('OK: Records Classification seeded (' + pkad.length + ' codes)');

  // ── Seed Retention Policies ──
  const policies = [
    { name: 'Dokumen Pajak (10 thn)', hotToWarmDays: 60, warmToColdDays: 365, destroyAfterDays: 3650, legalBasis: 'UU KUP / UU PDP 27/2022', isActive: true },
    { name: 'Slip Gaji (5 thn)', hotToWarmDays: 30, warmToColdDays: 180, destroyAfterDays: 1825, legalBasis: 'UU Ketenagakerjaan', isActive: true },
    { name: 'Marketing Asset (3 thn)', hotToWarmDays: 90, warmToColdDays: 365, destroyAfterDays: 1095, legalBasis: 'Internal Policy', isActive: true },
    { name: 'Top Secret WORM (vault forever)', hotToWarmDays: 0, warmToColdDays: 0, destroyAfterDays: 0, legalBasis: 'Direksi Resolusi 2025-08', isActive: true },
    { name: 'Email Arsip (7 thn)', hotToWarmDays: 30, warmToColdDays: 180, destroyAfterDays: 2555, legalBasis: 'UU ITE / UU PDP', isActive: true },
  ];
  for (const p of policies) {
    await models.DmsRetentionPolicy.findOrCreate({ where: { name: p.name }, defaults: p });
  }
  console.log('OK: Retention Policies seeded (' + policies.length + ' policies)');

  // ── Seed DMS Folders ──
  const folders = [
    { name: 'Keuangan', path: '/Keuangan', classification: 'confidential' },
    { name: 'SDM / HR', path: '/SDM', classification: 'confidential' },
    { name: 'Legal', path: '/Legal', classification: 'top_secret' },
    { name: 'Marketing', path: '/Marketing', classification: 'public' },
    { name: 'Operasional', path: '/Operasional', classification: 'internal' },
    { name: 'Backup IT', path: '/IT/Backup', classification: 'internal' },
  ];
  for (const f of folders) {
    await models.DmsFolder.findOrCreate({ where: { name: f.name, path: f.path }, defaults: f });
  }
  console.log('OK: Folders seeded (' + folders.length + ' folders)');

  // ── Seed DMS Files ──
  const existingFiles = await models.DmsFile.count();
  if (existingFiles === 0) {
    const fileData = [
      { name: 'Laporan_Q1_Konsolidasi.pdf', mimeType: 'application/pdf', sizeBytes: 4823120, classification: 'confidential', storageTier: 'hot', tags: ['finance', 'q1'] },
      { name: 'Strategi_Ekspansi_2026.xlsx', mimeType: 'application/vnd.ms-excel', sizeBytes: 1120400, classification: 'top_secret', storageTier: 'hot', tags: ['strategy'] },
      { name: 'Video_Profil_Korporasi_2026.mp4', mimeType: 'video/mp4', sizeBytes: 412300000, classification: 'public', storageTier: 'hot', tags: ['marketing'] },
      { name: 'Foto_Cabang_Bandung.zip', mimeType: 'application/zip', sizeBytes: 84200000, classification: 'internal', storageTier: 'warm', tags: ['photos'] },
      { name: 'NDA_Vendor_Telkom.pdf', mimeType: 'application/pdf', sizeBytes: 482000, classification: 'top_secret', storageTier: 'vault', tags: ['legal', 'nda'] },
    ];
    for (const d of fileData) {
      await models.DmsFile.create({ ...d, status: 'active' });
    }
    console.log('OK: Files seeded (' + fileData.length + ' files)');
  } else {
    console.log('SKIP: Files already exist (' + existingFiles + ')');
  }

  // ── Seed PPID Requests ──
  const existingPpid = await models.DmsPpidRequest.count();
  if (existingPpid === 0) {
    const ppidData = [
      { ticketNumber: 'PPID-2026-00128', requesterName: 'Andi Saputra', category: 'IPSB', subject: 'Realisasi anggaran perjalanan dinas Q1 2026', channel: 'online', status: 'in_review', receivedAt: new Date() },
      { ticketNumber: 'PPID-2026-00129', requesterName: 'Maya Putri', category: 'IPBM', subject: 'LAKIN HQ tahun 2025', channel: 'email', status: 'granted', receivedAt: new Date() },
      { ticketNumber: 'PPID-2026-00130', requesterName: 'KontraS Jakarta', category: 'IPSB', subject: 'Daftar pengadaan diatas Rp 100 juta', channel: 'walk_in', status: 'partially_granted', receivedAt: new Date() },
    ];
    for (const d of ppidData) {
      await models.DmsPpidRequest.create({ ...d, dueAt: new Date(Date.now() + 14 * 86400000) });
    }
    console.log('OK: PPID requests seeded (' + ppidData.length + ')');
  }

  // ── Seed Blockchain Genesis Block ──
  const existingBlocks = await models.TransactionBlock.count();
  if (existingBlocks === 0) {
    const genesisHash = crypto.createHash('sha256').update('Bedagang Brankas Digital Genesis 2026').digest('hex');
    const block = await models.TransactionBlock.create({
      tenantId: null,
      blockNumber: 1,
      previousBlockHash: null,
      blockHash: genesisHash,
      transactionCount: 0,
      isGenesis: true,
      timestamp: new Date('2026-01-01'),
    });
    await models.ChainVerificationLog.create({
      tenantId: null,
      verificationType: 'full',
      blocksVerified: 1,
      isValid: true,
      triggeredBy: 'system',
    });
    await models.AuditReceipt.create({
      tenantId: null,
      receiptNumber: 'GENESIS-2026-001',
      reportType: 'chain_verification',
      documentHash: genesisHash,
      storageProvider: 'local',
      includedInBlockNumber: 1,
      generatedAt: new Date('2026-01-01'),
    });
    console.log('OK: Blockchain genesis block + audit receipt seeded');
  }

  console.log('\n✅ ALL DMS SEED DATA COMPLETE');
  await sequelize.close();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
