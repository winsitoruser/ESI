---
name: bedagang-hq
description: Pengembangan modul HQ Bedagang — DMS, BUMDes, Finance, HRIS, Brankas Digital, blockchain, dan dashboard pusat.
---

# Bedagang HQ Module Workflow

## Lokasi kode
```
pages/hq/              # UI pages
pages/api/hq/          # API routes — often one file per modul (e.g. dms.ts with ?action=)
components/hq/         # Shared HQ components
lib/hq/                # HQ utilities (jika ada)
```

## Modul HQ populer
| Modul | Path | API file |
|---|---|---|
| DMS / PPID / Brankas Digital | `pages/hq/dms/` | `pages/api/hq/dms.ts` |
| BUMDes | `pages/hq/bumdes/` | `pages/api/hq/bumdes.ts` |
| Finance | `pages/hq/finance/` | `pages/api/hq/finance/` |
| HRIS | `pages/hq/hris/` | `pages/api/hq/hris/` |
| Brankas Digital | `pages/hq/brankas-digital/` | — |
| Integrations | `pages/hq/settings/integrations/` | — |

## Pola HQ page
```tsx
import HQLayout from '@/components/hq/HQLayout';
import { useTranslation } from '@/lib/i18n';

export default function MyPage() {
  const { t } = useTranslation();
  return (
    <HQLayout title={t('...')} subtitle={t('...')}>
      {/* content */}
    </HQLayout>
  );
}
```

## ═══════════════════════════════════════
## DMS MODULE DEVELOPMENT WORKFLOW
## ═══════════════════════════════════════

### Arsitektur DMS

Brankas Digital Nasional terdiri dari 14 sub-modul, masing-masing dengan page sendiri di `pages/hq/dms/`:

| Sub-modul | Path | DB Table | Model |
|---|---|---|---|
| Dashboard | `index.tsx` | — | — |
| File Explorer | `files.tsx` | `dms_files` | DmsFile |
| Mata Elang | `mata-elang.tsx` | `dms_mata_elang_shares` | DmsMataElangShare |
| Records Mgmt | `records-management.tsx` | `dms_records_classifications` | DmsRecordsClassification |
| Persuratan | `persuratan.tsx` | `dms_letters` | DmsLetter |
| Disposisi | (inline) | `dms_dispositions` | DmsDisposition |
| Tanda Tangan | `esign.tsx` | `dms_signatures` | DmsSignature |
| PPID | `ppid.tsx` | `dms_ppid_requests` | DmsPpidRequest |
| Knowledge Graph | `knowledge-graph.tsx` | `dms_knowledge_edges` | DmsKnowledgeEdge |
| Hierarki | `hierarchy.tsx` | `dms_hierarchy_nodes` | DmsHierarchyNode |
| Pemusnahan | `disposal.tsx` | `dms_disposal_batches` | DmsDisposalBatch |
| Open Data | `open-data.tsx` | `dms_open_datasets` | DmsOpenDataset |
| Scan Studio | `scan-studio.tsx` | — | — |
| Shares | `shares.tsx` | `dms_mata_elang_shares` | DmsMataElangShare |
| Vault | `vault.tsx` | `dms_files` (tier=vault) | DmsFile |
| Archives | `archives.tsx` | `dms_files` (tier=cold) | DmsFile |
| Policies | `policies.tsx` | `dms_retention_policies` | DmsRetentionPolicy |
| Audit | `audit.tsx` | `dms_access_logs` | DmsAccessLog |

### Bawaan: Mock Data → Wajib Migrasi ke DB

Semua page DMS sudah punya UI lengkap dengan **mock data di API** (`pages/api/hq/dms.ts`).
Flow migrasi mock→DB:

```
1. Cek apakah DB table sudah ada
   → node -e "const { Sequelize } = require('sequelize'); ... query information_schema.tables"

2. Create table via Sequelize sync (model.sync())
   → Buat script sync-dms-tables.js yang load semua model DMS & blockchain, lalu sync()

3. Rewrite API handler di pages/api/hq/dms.ts:
   a. Import model: const DmsFile = require('@/models/DmsFile');
   b. Ganti `return res.json({ success: true, files: MOCK_FILES })`
      menjadi `const files = await DmsFile.findAll({ where, order, limit }); return res.json({ success: true, files })`
   c. Semua POST action: gunakan Model.create() dari req.body
   d. DELETE action: gunakan Model.update({ status: 'destroyed' })
   e. Bungkus handler dalam try/catch global → error 500 dengan pesan

4. Seed data awal via scripts/seed-dms-data.js:
   - Pakai findOrCreate() untuk idempotent
   - Hierarki, PKAD records, policies, folders, files, PPID requests

5. Test setiap page: pastikan tidak React error boundary crash
   - Error paling umum: API response field name mismatch
   - Cek apakah frontend expect `stats.totalRecords` tapi API return `stats.total`
   - Bedakan: mock API punya field names sesuai UI, DB API punya field names sesuai model (camelCase)
   - ⚠️ Pitfall: `records-stats` harus return field2 yg diexpect UI: `totalRecords`, `active`, `inactive`, `static`, `destroyed`, `pendingReview`, `alertingExpiry30d`, `legalHoldCount`, `lifecycle`
```

### Database Table Creation Strategy

**Jangan paksakan Sequelize CLI migrations** jika chain 140+ migration sudah rusak (SequelizeMeta tidak sinkron). Gunakan pendekatan langsung:

```bash
# 1. Buat script sync-once yang load model lalu sync()
node -e "
const model = require('./models/DmsFile');
await model.sync({ alter: false, force: false });
// alter:false = CREATE TABLE IF NOT EXISTS (tidak modif existing)
// force:false = jangan DROP TABLE
"

# 2. Register migration sebagai done di SequelizeMeta
INSERT INTO "SequelizeMeta" ("name") VALUES ('nama-file-migration.js') ON CONFLICT DO NOTHING;

# 3. Untuk blockchain tables: pastikan drop simplified tables dulu baru re-sync
```

### ⚠️ Pitfall: API Response Field Mismatch
Semua page DMS dibangun dengan mock data dulu. Mock data punya field names tertentu. Saat konversi ke DB, field names berubah. Contoh nyata:

| Frontend expects | Old mock returns | New DB API returns | Fix |
|---|---|---|---|
| `stats.totalRecords` | `1_842_300` | `total` dari DB count | API harus transform ke format yg sama |
| `stats.alertingExpiry30d` | `1_140` | tidak dihitung | API return dummy/estimasi |
| `stats.lifecycle` | array of objects | tidak ada | API return `[]` |
| `grouped[0].parent` | `null`/`'KU'` | `null`/parentId (UUID) | page filter pake `.code` |

**Aturan:** Setelah rewrite API, selalu cek browser console untuk error. Error typenya biasanya `Cannot read properties of undefined (reading 'toLocaleString')` atau React crash karena map di null.

## ═══════════════════════════════════════
## BLOCKCHAIN MODULE
## ═══════════════════════════════════════

### Model Blockchain
| Tabel | Model | Tujuan |
|---|---|---|
| `transaction_blocks` | TransactionBlock | Rantai blok (hash chain) |
| `chain_verification_logs` | ChainVerificationLog | Verifikasi integritas rantai |
| `audit_receipts` | AuditReceipt | Tanda terima audit dengan hash |

### API Endpoints Blockchain
- `GET ?action=blockchain-status` — status terkini chain (total blocks, last hash, verification)
- `POST ?action=blockchain-mine` — tambah blok baru ke chain (auto-increment blockNumber, SHA-256 hashing)

### Genesis Block
```javascript
const genesisHash = crypto.createHash('sha256')
  .update('Bedagang Brankas Digital Genesis 2026').digest('hex');
await TransactionBlock.create({
  tenantId: '00000000-0000-0000-0000-000000000000',
  blockNumber: 1, previousBlockHash: null, blockHash: genesisHash,
  transactionCount: 0, isGenesis: true, timestamp: new Date('2026-01-01'),
});
```

### ⚠️ Pitfall: tenantId NOT NULL
`TransactionBlock.tenantId` punya constraint NOT NULL tanpa default. Jangan insert dengan `null` — gunakan default tenant UUID `00000000-0000-0000-0000-000000000000`.

## ═══════════════════════════════════════
## API HQ
## ═══════════════════════════════════════

- Auth: session NextAuth, role `super_admin` / `owner` / `manager`
- Filter `tenant_id` dari session — semua query harus filter `where.tenantId`
- DMS API endpoint tunggal di `pages/api/hq/dms.ts` (switch by `?action=`)

### Daftar Action DMS API
**GET actions:**
`overview`, `files`, `folders`, `shares`, `mata-elang`, `audit`, `storage`, `analytics`, `policies`, `records-classification`, `records-stats`, `letters`, `dispositions`, `signatures`, `ppid-requests`, `ppid-public-info`, `knowledge-graph`, `ediscovery-search`, `hierarchy`, `disposal-batches`, `open-datasets`, `scan-studio`, `blockchain-status`

**POST actions:**
`upload`, `mata-elang`, `mata-elang/open`, `detonate`, `move-tier`, `policy`, `letter`, `disposition`, `sign-request`, `sign-execute`, `ppid-respond`, `disposal-batch`, `open-dataset`, `scan-ingest`, `classify-record`, `blockchain-mine`

**DELETE actions:**
`destroy`

## Pitfall: Sequelize field naming
DB column `snake_case` → Sequelize JS property **camelCase**.

| DB column | Sequelize model field | ❌ Salah | ✅ Benar |
|---|---|---|---|
| `files_count` | `filesCount` | `fo.files` | `fo.filesCount ?? 0` |
| `parent_folder_id` | `parentFolderId` | — | `f.parentFolderId` |
| `storage_tier` | `storageTier` | — | `f.storageTier` |
| `total_size_bytes` | `totalSizeBytes` | — | `fo.totalSizeBytes` |

**Aturan:** Sebelum render properti dari API response, selalu cek model di `models/` — jangan tebak nama field dari DB atau dari mock data.

## i18n: Semua label display WAJIB translation key
Jangan hardcode string display di komponen:
- ❌ `{ label: '30 dtk', s: 30 }` — hardcode
- ✅ `{ labelKey: 'dms.mataElang.presetWindow.30s', s: 30 }` + `t(p.labelKey)`

## Verifikasi End-to-End
1. Login `superadmin@bedagang.com` / `superadmin123`
2. Buka route HQ yang diubah
3. Cek browser console untuk **zero JS errors**
4. Cek Network tab: pastikan API response `{ success: true, ... }`
5. Untuk error `.toLocaleString` — cek apakah field API response sesuai nama Sequelize model (camelCase)
