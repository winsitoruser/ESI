# DMS — Model Field Mapping

Sequelize camelCase ↔ DB snake_case.  
**Gunakan nama JS (kiri) di frontend, bukan nama DB (kanan).**

## DmsFolder (`dms_folders`)

| JS property | DB column | Tipe | Default |
|---|---|---|---|
| `id` | `id` | UUID | auto |
| `tenantId` | `tenant_id` | UUID | null |
| `parentId` | `parent_id` | UUID | null |
| `name` | `name` | STRING(255) | required |
| `path` | `path` | STRING(1024) | null |
| `description` | `description` | TEXT | null |
| `classification` | `classification` | STRING(20) | `'internal'` |
| `ownerId` | `owner_id` | INTEGER | null |
| `branchId` | `branch_id` | UUID | null |
| `department` | `department` | STRING(120) | null |
| **`filesCount`** | `files_count` | INTEGER | 0 |
| `totalSizeBytes` | `total_size_bytes` | BIGINT | 0 |
| `isLocked` | `is_locked` | BOOLEAN | false |
| `permissions` | `permissions` | JSONB | `{read:[], write:[], admin:[]}` |
| `createdBy` | `created_by` | INTEGER | null |
| `createdAt` | `created_at` | DATE | auto |
| `updatedAt` | `updated_at` | DATE | auto |

> ⚠️ **Pitfall:** `filesCount` BUKAN `files`. Jangan pakai `fo.files` — itu undefined → crash `.toLocaleString()`.

## DmsFile (`dms_files`)

| JS property | DB column | Tipe | Default |
|---|---|---|---|
| `id` | `id` | UUID | auto |
| `tenantId` | `tenant_id` | UUID | null |
| `parentFolderId` | `parent_folder_id` | UUID | null |
| `name` | `name` | STRING(500) | required |
| `fileType` | `file_type` | STRING(20) | `'document'` |
| `mimeType` | `mime_type` | STRING(150) | null |
| `extension` | `extension` | STRING(20) | null |
| `sizeBytes` | `size_bytes` | BIGINT | 0 |
| `checksumSha256` | `checksum_sha256` | STRING(64) | null |
| `classification` | `classification` | STRING(20) | `'internal'` |
| `storageTier` | `storage_tier` | STRING(20) | `'hot'` |
| `storageRegion` | `storage_region` | STRING(20) | `'id-jk'` |
| `storageKey` | `storage_key` | STRING(500) | null |
| `replicationRegions` | `replication_regions` | JSONB | `[]` |
| `encryptionEnvelope` | `encryption_envelope` | JSONB | null |
| `status` | `status` | STRING(20) | `'active'` |
| `tags` | `tags` | JSONB | `[]` |
| `ownerName` | `owner_name` | STRING(120) | null |
| `createdAt` | `created_at` | DATE | auto |
| `updatedAt` | `updated_at` | DATE | auto |

## DmsMataElangShare (`dms_mata_elang_shares`)

| JS property | DB column | Notes |
|---|---|---|
| `id` | `id` | UUID |
| `shareCode` | `share_code` | Format: `ME-XXXX-XXXX` |
| `magicLink` | `magic_link` | `https://brankas.bedagang.id/me/{code}` |
| `destructMode` | `destruct_mode` | `cipher_burn`, `glitch`, `vapor`, `honeypot` |
| `windowSeconds` | `window_seconds` | Durasi akses dalam detik |
| `maxOpens` | `max_opens` | 0 = unlimited |
| `status` | `status` | `armed`, `active`, `destroyed`, `revoked` |
| `opensCount` | `opens_count` | Counter pembukaan |
| `expiresAt` | `expires_at` | Kalkulasi: `createdAt + windowSeconds` |
| `destroyedAt` | `destroyed_at` | Timestamp destruksi |
| `destroyedReason` | `destroyed_reason` | `manual`, `timer`, `max_opens`, `revoked` |
