# Brankas Digital Nasional — Sistem Manajemen Arsip, Dokumen & Data Nasional

> Sistem Manajemen File, Arsip, Surat, Tanda Tangan Digital, PPID dan Open Data Skala Nasional
> dengan **Mata Elang Self-Destruct Sharing** (mode "James Bond")

---

## 1. Tujuan Modul

Modul `dms` (Digital Management System) adalah **sistem manajemen arsip, dokumen
& data tingkat nasional** Bedagang yang memenuhi standar ANRI, PSrE, SPBE,
PPID, dan PDP. Cakupan:

1. **File & Big Data** — dokumen, gambar, video, arsip, dan binary apa pun
   dalam skala lintas pulau (7 region datacenter Indonesia).
2. **Records Management ANRI** — Pola Klasifikasi Arsip Dinamis (PKAD), Jadwal
   Retensi Arsip (JRA) sesuai **UU 43/2009** & Perka ANRI 06/2021.
3. **e-Office / Persuratan** — agenda surat masuk/keluar, disposisi
   berjenjang, penomoran otomatis sesuai tata naskah dinas Indonesia.
4. **Tanda Tangan Digital** — integrasi PSrE BSrE BSSN, Peruri Sign, Privy ID,
   GoSign, dengan eMaterai 10.000 (UU 8/2024).
5. **PPID & Keterbukaan Informasi** — sesuai **UU 14/2008**, dengan SLA 10+7
   hari kerja & kategori IPSB/IPBM/IPSM/IDP.
6. **Knowledge Graph & e-Discovery** — graf relasi dokumen ↔ regulasi ↔ kasus
   ↔ entitas dengan ekstraksi PII (NIK, NPWP).
7. **Hirarki Nasional** — Pusat → Kementerian → Provinsi → Kab/Kota →
   Kecamatan → Desa, dengan rollup laporan otomatis.
8. **Pemusnahan Arsip** — JRA execution dengan Berita Acara, saksi, & sertifikat
   penghancuran kriptografis.
9. **Open Data SPBE** — katalog dataset terbuka sesuai **Perpres 95/2018 SPBE**
   & **Perpres 39/2019 Satu Data Indonesia**, dengan API publik.
10. **Mata Elang** — berbagi file dengan timer penghancur otomatis ala film
   James Bond: file akan rusak, lenyap, atau diganti file tipuan.

Memenuhi: UU PDP 27/2022 · UU 43/2009 · UU 14/2008 · UU 11/2008 jo. UU 19/2016 ITE
· UU 8/2024 Bea Materai · ISO 27001 · GDPR · audit BPK.

---

## 2. Arsitektur Tingkat Tinggi

```
                ┌──────────────────────────────────────┐
                │         HQ Brankas Digital UI         │
                │  /hq/dms/{index, files, mata-elang…}  │
                └───────────────────┬───────────────────┘
                                    │ fetch
                ┌───────────────────▼───────────────────┐
                │   /api/hq/dms?action=…  (Next.js API) │
                └───────────────────┬───────────────────┘
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  Sequelize models            Self-Destruct Engine        Storage Tiers
  (PostgreSQL)               (lib/dms/self-destruct.ts)  (lib/dms/storage-tiers.ts)
  · DmsFile                   · AES-256-GCM envelope     · hot / warm / cold / vault
  · DmsFolder                 · cipher_burn              · 7 region Indonesia
  · DmsMataElangShare         · glitch / vapor /         · auto-tiering & cost calc
  · DmsAccessLog               honeypot
  · DmsRetentionPolicy        · timer + geo + ip + mfa
                              · device fingerprint binding
```

### Penyimpanan biner

Konten file disimpan di **object store eksternal** (S3 compatible). Tabel
`dms_files` hanya menyimpan **metadata** + envelope key. Strategi `vault`
menggunakan bucket WORM/Object-Lock dengan retention immutable.

### Sharding nasional

7 region datacenter Indonesia di-mapping melalui
`lib/dms/storage-tiers.ts` (`REGIONS`): Jakarta, Surabaya, Medan,
Makassar, Manado, Pontianak, Jayapura. Replikasi default Jakarta + region
terdekat user (haversine distance).

---

## 3. Mata Elang — Cara Kerja Self-Destruct

### Envelope Encryption

```
┌────────┐                     ┌──────────┐      ┌──────────┐
│  File  │ ──AES-256-GCM─▶    │ Cipher-  │      │ Wrapped  │
│ plain  │   ←   DEK (acak)   │ text     │      │  DEK     │
└────────┘                     └──────────┘      └────┬─────┘
                                                      │
                                       wrapped by KEK │
                                       (KMS / HSM)    ▼
                                              dms_mata_elang_shares.wrapped_dek
```

Setiap penerima mendapat **baris share** dengan **`wrapped_dek` terpisah**
sehingga akses dapat dicabut per-recipient tanpa menyentuh file lain.

### 4 Moda Penghancuran

| Mode | Yang Terjadi | Use case |
|---|---|---|
| **`cipher_burn`** | `wrapped_dek` di-`NULL`-kan. Ciphertext jadi gibberish abadi. | Default, paling cepat & aman (crypto-shred). |
| **`glitch`** | Byte ciphertext dipermutasi → file korup, gambar pixelated, video glitch. | Pesan visual: "EXPIRED" — tetap menyisakan jejak. |
| **`vapor`** | Object + replica dihapus permanen di semua region. | Kepatuhan UU PDP: hak dihapus permanen. |
| **`honeypot`** | Konten diganti file tipuan ("EXPIRED" decoy). | Mendeteksi attacker yang masih mencoba mengakses. |

### Trigger Penghancuran

- Timer `windowSeconds` habis (mulai dari pembukaan pertama)
- `opensCount` mencapai `maxOpens`
- Akses dari luar `geofence`
- IP tidak masuk `ipAllowlist`
- MFA gagal (`requireMfa`)
- Device fingerprint tidak cocok (`bindDeviceFingerprint`)
- Detonasi manual via tombol UI

### Validasi Konteks Akses

Lihat `checkAccessConstraints()` di `lib/dms/self-destruct.ts`.
Mengembalikan `geo | ip | device | mfa | null` (null = lolos).

---

## 4. Struktur File

```
lib/
  dms/
    self-destruct.ts        # AES-GCM envelope, cipher_burn / glitch / vapor / honeypot
    storage-tiers.ts        # Tiering & 7-region Indonesia mapping
  translations/
    hq-dms.ts               # i18n id/en (ja/zh stub)

models/
  DmsFile.js                # metadata file
  DmsFolder.js              # hierarki folder
  DmsMataElangShare.js      # share self-destruct
  DmsAccessLog.js           # audit hash-chained
  DmsRetentionPolicy.js     # lifecycle / UU PDP

migrations/
  20260502-create-dms-brankas-digital-tables.js

pages/
  api/hq/dms.ts             # API tunggal (action-based)
  hq/dms/
    index.tsx               # Dashboard hub (KPI · region map · live ticker)
    files.tsx               # File explorer (tier/classification filter)
    mata-elang.tsx          # ✦ Mata Elang wizard + countdown table
    shares.tsx              # Share standar + permanen
    vault.tsx               # WORM vault top-secret
    archives.tsx            # Tier visualisasi & region replikasi
    policies.tsx            # Retensi & lifecycle (UU PDP / GDPR)
    audit.tsx               # Audit immutable hash-chained
    analytics.tsx           # Big-data analytics (chart 30 hari, file-type mix)
    compliance.tsx          # Skor framework (UU PDP, ISO 27001, GDPR, BPK…)
    settings.tsx            # Pengaturan enkripsi, KMS, region, default Mata Elang

config/sidebar.config.ts    # Group baru "Brankas Digital Nasional"
```

---

## 5. API

Endpoint tunggal `pages/api/hq/dms.ts` dengan routing berbasis `action`.

### GET

| `action` | Output |
|---|---|
| `overview` | KPI dashboard (total file, ukuran TB, share aktif, dst.) |
| `files` | Daftar file mock (dengan klasifikasi, tier, region) |
| `folders` | Pohon folder utama |
| `shares` | Share standar/permanen/Mata Elang |
| `mata-elang` | Daftar Mata Elang share |
| `audit` | Audit log immutable |
| `storage` | Distribusi tier + region |
| `analytics` | Time series 30 hari + komposisi tipe file |
| `policies` | Daftar kebijakan retensi |

### POST

| `action` | Body | Output |
|---|---|---|
| `upload` | metadata + envelope | rekam baru `dms_files` |
| `share` | `{fileId, recipients, expires}` | share standar |
| `mata-elang` | `MataElangConfig` | armed share + magic link |
| `mata-elang/open` | `{shareId, …context}` | advance timer |
| `detonate` | `{shareId}` | crypto-shred manual |
| `move-tier` | `{fileId, tier}` | tiering manual |
| `policy` | retention policy | retention CRUD |

### DELETE

`?action=destroy` — vapor mode, hapus permanen lintas region.

---

## 6. Database Schema (ringkas)

`dms_files` (metadata):
- `id`, `tenant_id`, `parent_folder_id`
- `name`, `mime_type`, `size_bytes`, `checksum_sha256`
- `classification` (`public|internal|confidential|top_secret`)
- `storage_tier` (`hot|warm|cold|vault`), `storage_region`, `storage_key`
- `replication_regions` `JSONB[]`
- `encryption_envelope` `JSONB` ({wrappedDek, iv, tag, kekVersion})
- `tags` `JSONB[]`, `ocr_text`, `ai_category`, `ai_confidence`
- `retention_until`, `legal_hold`
- `status`, `destroyed_at`, `destroyed_reason`

`dms_mata_elang_shares` (share self-destruct):
- `share_code` (mis. `ME-7K3X-92AC`), `magic_link`
- `recipient_*` (type/identifier/name/channel)
- `destruct_mode` (cipher_burn/glitch/vapor/honeypot)
- `window_seconds`, `max_opens`, `opens_count`
- `geofence`, `ip_allowlist`, `require_mfa`, `watermark`,
  `bind_device_fingerprint`, `bound_fingerprint`
- `wrapped_dek` (akan di-NULL saat cipher_burn), `envelope_meta`
- `first_opened_at`, `expires_at`
- `status`, `destroyed_at`, `destroyed_reason`, `final_message`
- `last_ip`, `last_region`, `last_user_agent`, `last_opened_at`

`dms_access_logs` (audit hash-chained):
- `action`, `actor_*`, `ip_address`, `region`, `user_agent`,
  `device_fingerprint`, `result`, `reason`, `metadata`,
  `prev_hash`, `hash` (SHA-256 chain).

`dms_retention_policies`:
- `applies_to` `JSONB`, `hot_to_warm_days`, `warm_to_cold_days`,
  `destroy_after_days`, `legal_basis`, `requires_approval_to_delete`.

---

## 7. Cara Menjalankan Migration

```bash
npm run db:migrate
# kemudian seeding opsional bila tersedia
```

Migration file: `migrations/20260502-create-dms-brankas-digital-tables.js`.

---

## 8. Akses Sidebar

Group baru "Brankas Digital Nasional" pada `hqSidebarConfig`:

```
Brankas Digital  (FolderLock)
├── Dasbor Brankas      /hq/dms
├── Penjelajah File     /hq/dms/files
├── Mata Elang          /hq/dms/mata-elang   ★ flagship feature
├── Berbagi & Akses     /hq/dms/shares
├── Vault Top Secret    /hq/dms/vault
├── Arsip & Big Data    /hq/dms/archives
├── Kebijakan Retensi   /hq/dms/policies
├── Audit & Forensik    /hq/dms/audit
├── Analitik Big Data   /hq/dms/analytics
├── Kepatuhan           /hq/dms/compliance
└── Pengaturan          /hq/dms/settings
```

---

## 9. Highlight UI

### Hub `/hq/dms`
Banner gradient gelap dengan badge "Mata Elang" + ticker live, 8 kartu KPI
(total file, ukuran TB, encryption coverage, MFA coverage), donut storage
tier, peta 7-region replikasi, panel **Mata Elang Live** dengan animasi
status, recent activity feed, dan grid 9 modul.

### Mata Elang `/hq/dms/mata-elang`
- Wizard 3 langkah (file → moda → guardrails)
- Pilihan moda visual (4 destructor + deskripsi)
- Pemilih region geofence (chip multi-select), IP CIDR list
- Toggle MFA, watermark, device-binding
- Tabel daftar Mata Elang dengan **countdown timer real-time**
  (1 detik tick, danger ketika <60 detik)
- Tombol detonasi manual (cipher_burn) per baris

### File Explorer `/hq/dms/files`
- Folder tiles dengan badge klasifikasi
- Tabel + filter tier & klasifikasi
- Aksi cepat: pratinjau, unduh, "buat Mata Elang dari file ini"

### Lainnya
- Audit (log immutable + filter result)
- Analytics (time-series 30 hari + komposisi tipe file)
- Compliance (skor framework UU PDP, ISO, GDPR, BPK)
- Settings (KMS provider, KEK rotation, region default, Mata Elang default)

---

## 9.b. Modul Tingkat Nasional (Records, Persuratan, PPID, Open Data)

| Halaman                                | Fitur Utama |
|----------------------------------------|-------------|
| `/hq/dms/records-management`           | Pohon PKAD 3-tingkat (KU/KP/HK/OT/PR/HM/HI/PL/PW/TI) · JRA aktif/inaktif/penyusutan akhir · KPI lifecycle 4 fase · alert *retention 30 hari* |
| `/hq/dms/persuratan`                    | Agenda surat masuk/keluar (no. otomatis `AGD-YYYY-NNNNNN`) · klasifikasi `KU.01.01` · disposisi berjenjang dengan instruksi standar · tenggat & status (open/in_progress/answered/overdue) |
| `/hq/dms/esign`                         | Workflow TTD sequential / parallel · 5 PSrE: BSrE BSSN, Peruri, Privy, DigiSign, GoSign · eMaterai 10.000 · sertifikat X.509 + hash SHA-256 |
| `/hq/dms/ppid`                          | Permintaan IPSB/IPBM/IPSM/IDP · SLA 10+7 hari kerja · status received → in_review → granted/denied/extended/objection/appealed · Daftar Informasi Publik (DIP) |
| `/hq/dms/knowledge-graph`               | Graf semantik dokumen ↔ regulasi ↔ kasus ↔ entitas dengan 8 tipe relasi (cites/supersedes/contradicts/follows_up/references/mentions/derived_from/related_to) · pencarian e-Discovery dengan score |
| `/hq/dms/hierarchy`                     | Tree Pusat → Kementerian → Provinsi → Kab/Kota → Kecamatan → Desa (kode BPS) · kuota & pemakaian per node · rollup ke pusat |
| `/hq/dms/disposal`                      | Batch pemusnahan dengan 4 tipe (destroy/transfer ANRI/transfer LKD/retain permanent) · 5 metode penghancuran (crypto_shred, shredder DIN 66399, incinerate, DoD 5220, degauss) · Berita Acara + saksi |
| `/hq/dms/open-data`                     | Katalog dataset terbuka SPBE/Satu Data Indonesia · format CSV/JSON/XLSX/Parquet/XML/RDF · API REST publik dengan rate limit & API key · DCAT-AP metadata |
| `/hq/dms/scan-studio`                   | Antrian batch scan + OCR + AI classify + PII detect (NIK, NPWP, telp, email) · auto-routing ke folder PKAD · 5-step pipeline view |

### Library tambahan

`lib/dms/records-management.ts`
- `DEFAULT_PKAD_TREE` — pohon klasifikasi standar (10 primer × sekunder × tersier)
- `buildLetterNumber()` & `buildAgendaNumber()` — penomoran agenda otomatis
- `lifecyclePhase()` & `daysUntilPhaseChange()` — kalkulasi siklus aktif/inaktif/statis
- `extractEntities()` — ekstraksi PII (NIK 16 digit dengan validasi kode provinsi 11–95, NPWP, phone +62, email)
- `maskPii()` — masking untuk tampilan PPID publik
- `ppidDueDate()` — kalkulasi SLA UU 14/2008 (10 hari + perpanjangan 7 hari kerja)

### Database tambahan (migration `20260503-create-dms-national-archive-tables.js`)

```
dms_records_classifications  — PKAD + JRA per kode klasifikasi
dms_letters                  — agenda surat masuk/keluar
dms_dispositions             — disposisi berjenjang
dms_signatures               — TTD digital ber-PSrE
dms_ppid_requests            — permintaan info publik (UU KIP)
dms_knowledge_edges          — edge knowledge graph
dms_disposal_batches         — batch pemusnahan + berita acara
dms_hierarchy_nodes          — Pusat → Provinsi → Desa
dms_open_datasets            — katalog SPBE / Satu Data
```

---

## 10. Catatan Implementasi Produksi

1. **KMS / HSM** – Ganti `getKEK()` di `lib/dms/self-destruct.ts` dengan
   integrasi AWS KMS / Vault / GCP KMS / Azure Key Vault. Tambahkan kolom
   `kek_version` ke `encryption_envelope` untuk mendukung rotasi tanpa
   re-enkripsi seluruh data.
2. **Object store** – Pasangkan `storage_key` ke S3-compatible bucket
   (per-region). Untuk `vault` aktifkan **Object Lock (compliance mode)**.
3. **Worker / Cron self-destruct** – Buat cron job (`bullmq` / `agenda`)
   yang setiap 30 detik scan `dms_mata_elang_shares` dengan
   `expires_at < now()` lalu menjalankan `cipherBurn`/`vaporize` /
   `glitchTransform` sesuai `destruct_mode`.
4. **Hash chain audit** – Saat insert ke `dms_access_logs`, hitung
   `hash = sha256(prev_hash || canonical(JSON))`. Verifikasi periodik.
5. **OCR & AI klasifikasi** – Hubungkan ke pipeline OCR (Tesseract /
   Azure Vision) untuk mengisi `ocr_text` dan model klasifikasi PII.
6. **Geofence** – Resolve IP → region pakai layanan IP geolocation
   (MaxMind / IPinfo).  Region Indonesia menggunakan kode ISO 3166-2.
7. **Quota & rate limit** – Tambahkan tabel `dms_tenant_quota` dan middleware
   untuk batasi unggah per tenant.
8. **Forward-secrecy magic link** – Magic link sebaiknya berisi token
   ber-tanda HMAC dan kedaluwarsa cepat; tukar dengan session ber-MFA
   di server saat dibuka.

---

## 11. Roadmap

### Sudah dikerjakan ✓
- [x] Mata Elang self-destruct (4 mode)
- [x] Encryption envelope AES-256-GCM
- [x] 7 region datacenter Indonesia + tier hot/warm/cold/vault
- [x] Records Management ANRI (PKAD + JRA)
- [x] Persuratan & Disposisi e-Office
- [x] Tanda Tangan Digital (5 PSrE) + eMaterai
- [x] PPID UU 14/2008 + Daftar Informasi Publik
- [x] Knowledge Graph + e-Discovery
- [x] Hirarki nasional Pusat → Desa
- [x] Pemusnahan + berita acara
- [x] Open Data SPBE / Satu Data Indonesia
- [x] Scan Studio + AI Pipeline + PII detection (regex Indonesia)

### Dalam roadmap berikutnya
- [ ] Worker self-destruct + redis lock (BullMQ)
- [ ] OCR pipeline produksi (Tesseract + PaddleOCR + Layout-LM)
- [ ] AI klasifikasi otomatis ke PKAD (fine-tuned BERT/IndoBERT)
- [ ] Mobile viewer dengan watermark dinamis (canvas)
- [ ] Mata Elang via WhatsApp Business API + magic link OTP
- [ ] Integrasi BUM Desa / HRIS / Finance untuk pengarsipan otomatis
- [ ] Forensic timeline visualizer (graph akses)
- [ ] Integrasi langsung ke API ANRI SIKN/JIKN (Sistem Informasi Kearsipan Nasional)
- [ ] Sertifikasi PSrE penuh untuk validasi sertifikat real BSrE
- [ ] Quantum-safe envelope (Kyber/Dilithium PQC)
- [ ] Sengketa & banding PPID (hubungan ke Komisi Informasi)

---

> "This file will self-destruct in five seconds. Good luck, agent." 🕶️
