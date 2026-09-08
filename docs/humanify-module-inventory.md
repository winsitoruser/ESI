# Humanify — Inventaris modul, halaman, fungsi, dan komponen

**Produk:** Humanify HRIS SaaS (`humanify.id`)  
**Cutoff kode:** 8 September 2026  

**Ekspor:** [Excel](./humanify-module-inventory.xlsx) · [PDF](./pdf/humanify-module-inventory.pdf) — `npm run docs:humanify-inventory` 
**Sumber kanonik UI:** `config/humanify-sidebar.config.ts` · `pages/humanify/index.tsx` · `components/humanify/PlatformOpsNav.tsx`  
**Bukan SIMESI / ESI ERP.**

Dokumen ini menginventarisir permukaan produk yang ada di kode. Status mengikuti GA scope (`docs/humanify-ga-scope.md`) dan hire-to-retire (`docs/humanify-hire-to-retire-status.md`), bukan klaim penjualan.

## Ringkasan kuantitas

| Permukaan | Jumlah file halaman | Catatan |
|---|---|---|
| HQ tenant `/humanify/*` | 100 | Termasuk auth, LMS lanjut, alias |
| Admin Total `/platform/*` | 24 | Control plane operator Naincode |
| Portal karyawan `/employee/*` | 8 | ESS + deep-link training/payslip |
| Portal karir `/careers/*` | 2 | Publik, tenant-scoped lowongan |
| API `/api/humanify/*` | 122 | Tenant HRIS + billing + LMS |
| API `/api/platform/*` | 6 | Ops observabilitas, banner, email |
| API publik `/api/v1/*` | 6 | Enterprise API keys |
| Komponen `components/humanify` | 76 | Layout, chrome modul, form, AIMAN |
| Komponen `components/employee` | 20 | Portal ESS/MSS lapangan |

Paket paket (`lib/saas/plan-entitlements.ts`):

| Paket | Fitur |
|---|---|
| Trial (14 hari) | Semua fitur |
| Starter | Core + absensi + rekrutmen |
| Growth | Starter + payroll + analitik |
| Enterprise | Growth + LMS + AIMAN + API + white-label + SSO |

---

## 1. Empat permukaan produk

| Permukaan | Siapa | Host / path | Layout |
|---|---|---|---|
| **Publik & auth** | Calon klien, kandidat, partner | `humanify.id/humanify/welcome`, login, blog, karir | Marketing shell / auth shell |
| **HQ tenant** | HR admin, owner, finance | `/humanify/*` | `HumanifyLayout` + sidebar |
| **ESS / MSS** | Karyawan & manajer | `/employee` (+ `/humanify/ess`, `/humanify/mss` konfigurasi) | `EmployeePortal` |
| **Admin Total** | Operator Naincode | `/platform/*` (ops host) | `OpsLayout` + `PlatformOpsNav` |

Isolasi data: `tenant_id` + `scopedWhere` + RLS (produksi: soft request-bound; strict di staging). Switcher multi-perusahaan: `CompanySwitcher` (owner/admin). Impersonate hanya di `/platform`.

---

## 2. Halaman publik & otentikasi

| Route | Fungsi | Penjelasan |
|---|---|---|
| `/humanify/welcome` | Landing marketing | **Canonical di humanify.id:** `/` (rewrite ke halaman welcome). `/humanify/welcome` 307 ke `/`. Hero, FAQ CMS, banner, CTA signup. Redirect ke app jika sudah login. |
| `/humanify/login` | Login tenant | Credentials NextAuth. Form: `HumanifyLoginForm`. |
| `/humanify/admin-login` | Alias login ops | Arahkan operator ke host Admin Total. |
| `/humanify/signup` | Daftar tenant baru | Buat akun + tenant trial. `HumanifySignupForm`. |
| `/humanify/setup` | Wizard onboarding SaaS | Perusahaan, paket, karyawan pertama. `SaasSetupWizard`. |
| `/humanify/forgot-password` | Minta reset sandi | Email tautan reset. |
| `/humanify/reset-password` | Setel sandi baru | Token dari email. |
| `/humanify/verify-email` | Verifikasi email pemilik | Wajib sebelum beberapa aksi billing. |
| `/humanify/join` | Terima undangan tim | Token `invitations-accept`. |
| `/humanify/blog` | Daftar artikel | CMS publik dari Admin Total. |
| `/humanify/blog/[slug]` | Artikel | Draft→publish di `/platform/content?tab=blog`. |
| `/humanify/pricing/roi-calculator` | Kalkulator ROI | `HumanifyRoiCalculator` — input headcount vs paket. |
| `/humanify/partners` | Halaman partner | Channel referral / lead. |
| `/humanify/partners/status` | Status lead partner | Cek progress pendaftaran. |
| `/careers` | Portal karir publik | Lowongan tenant yang dipublish. |
| `/careers/[slug]` | Detail lowongan + apply | Form kandidat ke pipeline rekrutmen. |

---

## 3. Modul HQ tenant (sidebar)

Grup mengikuti `humanifySidebarConfig`. **Fungsi** = aksi utama di halaman. **Status** = visibilitas penjualan/IA.

### 3.1 Utama

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Beranda | `/humanify` | KPI, inbox aksi, grid modul | Dasbor operasional: karyawan, absensi hari ini, antrian MSS, alert trial/dokumen. | GA |
| Kalender HR | `/humanify/calendar` | Lihat event cuti/shift/gajian | Kalender terpadu cuti, shift, payroll, pengumuman. | GA |
| Pengumuman | `/humanify/announcements` | Broadcast ke karyawan | Tulis & kirim pengumuman ke portal ESS. | GA |
| Tentang Humanify | `/humanify/welcome` | Landing (hidden di sidebar jika login) | Item sidebar `hidden`. | Publik |

### 3.2 Karyawan

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Database Karyawan | `/humanify/employees` | CRUD, dokumen, genealogy | Master data, status aktif, dokumen KTP/kontrak, panel silsilah. | GA |
| Impor Karyawan | `/humanify/employees-import` | CSV/XLSX bulk | Mapping kolom, validasi, undo bulk. | GA |
| Struktur Organisasi | `/humanify/organization` | Unit, bagan, jabatan | Org chart (`OrgChartTree`), sinkron departemen. | GA |
| Onboarding | `/humanify/onboarding` | Checklist masuk + issue aset | Alur karyawan baru, tugas, aset. | GA |
| Offboarding | `/humanify/offboarding` | Clearance, settlement, exit | Pengembalian aset, settlement gaji. | GA |
| Kontrak & Reminder | `/humanify/contracts` | Masa berlaku + notifikasi | Reminder 30 hari, perpanjangan. | GA |
| Manajemen Aset | `/humanify/assets` | Issue / return inventori | Laptop, HP, ID card terikat karyawan. | GA |
| E-Sign | `/humanify/esign` | Tanda tangan digital Privy | UI opt-in `ESIGN_UI_ENABLED`. API ada. | Hidden / lab |

### 3.3 Kehadiran & cuti

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Dasbor Absensi | `/humanify/attendance` | Ringkasan hadir/telat/alpha | Clock-in GPS/face, koreksi, import. | GA |
| Jadwal & Shift | `/humanify/attendance-management` | Pola shift, roster | Assign shift, libur, overtime policy. | GA |
| Rekap Harian | `/humanify/attendance/daily` | Grid harian per orang | Rekap untuk payroll. | GA |
| Perangkat Absensi | `/humanify/attendance/devices` | Mesin fingerprint / device-sync | Idempotent sync. Alias: `/humanify/devices`. | GA |
| Pengaturan Absensi | `/humanify/attendance/settings` | Geofence, toleransi telat | Kebijakan kerja, radius GPS. | GA |
| Manajemen Cuti | `/humanify/leave` | Jenis, saldo, approve, bulk cancel | Workflow atasan + HR. | GA |

### 3.4 Kinerja

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| OKR Perusahaan | `/humanify/okr` | Cascade objective | Alignment perusahaan → individu. | GA Growth+ |
| KPI Karyawan | `/humanify/kpi` | Target, skor, periode | Input skor, template. | GA Growth+ |
| Pengaturan KPI | `/humanify/kpi-settings` | Template, bobot, siklus | Master indikator. | GA Growth+ |
| Penilaian Kinerja | `/humanify/performance` | Review cycle, 360, 9-box | `NineBoxMatrix`, performance-360. | GA Growth+ |
| Keterlibatan & Budaya | `/humanify/engagement` | Survei budaya | Sidebar `hidden`. Jangan jual. | Hidden IA |

### 3.5 Payroll

Paket **Growth+**. Approve/paid memakai pemisahan tugas finance (`payroll-finance-sod`).

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Dasbor Payroll | `/humanify/payroll` | Hub run & status | Chrome modul, tautan sub-halaman. | GA |
| Proses Gaji | `/humanify/payroll/main` | Generate run, bulk upload | Komponen: `PayrollInputPage`. | GA |
| Slip Gaji | `/humanify/payroll/slip-gaji` | Distribusi & audit | ESS bisa unduh. | GA |
| THR | `/humanify/payroll/thr` | Hitung THR | Proporsional masa kerja. | GA |
| PPh 21 | `/humanify/payroll/pph21` | TER / progresif, SPT masa | `lib/hris/pph21-calc.ts`. | GA |
| BPJS | `/humanify/payroll/bpjs` | Iuran Kes + TK | Employer/employee share. | GA |
| Lembur | `/humanify/payroll/lembur` | Rekap ke payroll | Multiplier weekday/weekend/holiday. | GA |
| Bonus & Insentif | `/humanify/payroll/bonus` | Input bonus → run | Proyek / kinerja. | GA |
| Kasbon | `/humanify/payroll/cash-advance` | Advance + potong gaji | Saldo outstanding. | GA |
| Pinjaman Karyawan | `/humanify/payroll/loan` | Cicilan otomatis | Jadwal potongan. | GA |
| Laporan Gaji | `/humanify/payroll/laporan` | Rekap & analisis | Export. | GA |
| Transfer Bank | `/humanify/payroll/disbursement` | File transfer / status | Bukan auto-payout Midtrans. | GA |
| Reimbursement | `/humanify/reimbursement` | Klaim + bukti privat | OCR struk, gallery bukti. | GA |
| Tenaga Harian | `/humanify/casual-workforce` | Upah harian / borongan | Bukan karyawan tetap. | GA |

### 3.6 Talent & belajar

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Rekrutmen | `/humanify/recruitment` | Lowongan, kandidat, pipeline | Publish ke `/careers`, webhook ATS. | GA |
| Portal Karir | `/careers` | Situs lowongan publik | Buka di tab baru dari sidebar. | GA |
| Dasbor LMS | `/humanify/lms` | Ringkasan kursus/tes | Core LMS **Enterprise**. | GA Ent. |
| Kursus & Learning Path | `/humanify/lms/courses` | CRUD kursus, player | Detail: `/humanify/lms/courses/[id]`. | GA Ent. |
| Tes & Ujian | `/humanify/lms/tests` | Jadwal ujian | Detail: `/humanify/lms/tests/[id]`. | GA Ent. |
| Bank Soal | `/humanify/lms/question-bank` | Item soal, blueprint | Dipakai tes. | GA Ent. |
| Penilaian | `/humanify/lms/grading` | Nilai & kelulusan | Manual + otomatis. | GA Ent. |
| Kompetensi & Sertifikat | `/humanify/lms/competency` | Skill map + issue sertifikat | Registry juga di halaman sertifikat. | GA Ent. |
| Analitik L&D | `/humanify/lms/analytics` | Completion, skor | Laporan L&D. | GA Ent. |
| Proctoring | `/humanify/lms/proctoring` | Pengawasan ujian | `HUMANIFY_LMS_LAB`. | Lab |
| Psikometrik | `/humanify/lms/psychometric` | Tes kepribadian | Lab. Reports: `lms/psychometric-reports`. | Lab |
| Academy | `/humanify/lms/academy` | Katalog academy | Lab. | Lab |
| Program Pelatihan | `/humanify/training` | Batch pelatihan operasional | Bukan full LMS. | GA |
| L&D / kurikulum | `/humanify/training-development` | Kurikulum, outsourcing | URL lanjut, tidak selalu di sidebar. | Partial |
| Skor Training | `/humanify/training-scoring` | Competency scoring | URL lanjut. | Partial |
| Registri Sertifikat | `/humanify/certificates` | Lisensi kedaluwarsa | Reminder 30 hari. | GA |

URL LMS lanjut (tidak semua di sidebar): `lms/access`, `lms/ai-assistant`, `lms/blueprints`, `lms/schedules`, `lms/integrations`, `lms/reports`.

### 3.7 Operasional HR

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Tim Internal | `/humanify/team-members` | Staf HR / roster tim | Detail: `/humanify/team-members/[id]`. | GA |
| Tugas Tim | `/humanify/tasks` | Task list HR | Assign & status. | GA |
| Aktivitas HR | `/humanify/activities` | Timeline & audit ringan | Jejak aksi kepegawaian. | GA |
| Mutasi & Penugasan | `/humanify/mutations` | Pindah unit/jabatan | Approval MSS. | GA |
| Perjalanan Dinas | `/humanify/travel-expense` | SPD, itinerary, klaim | `TravelItineraryEditor`. | GA Growth+ |
| Proyek HR | `/humanify/project-management` | Proyek, timesheet, dokumen | Sidebar hidden. Tab: Projects, Workers, Timesheets, Payroll, Documents, Templates. | Hidden IA |
| Hubungan Industrial | `/humanify/industrial-relations` | Kasus HI, mediasi | Catatan sengketa. | GA |
| Surat Disiplin | `/humanify/disciplinary-letters` | Draft SP, letterhead, SOP | Render PDF, Privy opsional. | GA |

### 3.8 AIMAN

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| AIMAN · Confirm | `/humanify/ai` | Copilot HR, wajib konfirmasi | Bukan otonom payroll. Flag `isHumanifyAiUiEnabled()`. Chat mengambang: `AimanFloatingChat`. | Partial / flag |

### 3.9 Laporan & analitik

Paket **Growth+** (analitik), laporan inti tersedia lebih luas.

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Dasbor Analitik HR | `/humanify/hr-analytics` | KPI tenaga kerja | Headcount, attrition, mix. | GA Growth+ |
| Laporan HRIS | `/humanify/reports` | Pusat export | Kepegawaian, KPI, absensi, payroll. | GA |
| Analitik Tenaga Kerja | `/humanify/workforce-analytics` | Prediktif / tren | `predictive-analytics` API. | GA Growth+ |

### 3.10 Platform & akses (tenant)

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Buka Portal Karyawan | `/employee` | Deep-link ESS | Bukan halaman HQ. | GA |
| Konfigurasi ESS | `/humanify/ess` | Toggle tab portal, klaim, kebijakan | `ESS_PORTAL_MODULES`. | GA |
| Persetujuan HR (MSS) | `/humanify/mss` | Inbox approve cuti/klaim/lembur/mutasi | Inbox manajer + HR. | GA |
| Pengaturan Organisasi | `/humanify/org-settings` | Policy, workflow, master | Policy engine. | GA |
| Tim & Undangan | `/humanify/users` | Invite user HQ | Multi-role. | GA |
| Role & Akses | `/humanify/users/roles` | Matriks permission tenant | Bukan desk CS platform. | GA |
| Keamanan (2FA) | `/humanify/security` | MFA enroll / policy | `lib/saas/mfa.ts`. | GA |
| SSO (SAML) | `/humanify/sso` | Metadata, ACS | `sso/login`, `sso/acs`, `sso/metadata`. | GA Ent. |
| Enterprise (API & Brand) | `/humanify/enterprise` | API keys, webhooks, white-label | `/api/v1/*`. | GA Ent. |
| Billing & Upgrade | `/humanify/billing` | Paket, Midtrans, voucher | Webhook idempotent. | GA |
| Go-live Checklist | `/humanify/go-live` | Kesiapan hari pertama | `GaOnboardingChecklist`. | GA |

### 3.11 Bantuan

| Halaman | Route | Fungsi utama | Penjelasan | Status |
|---|---|---|---|---|
| Pusat Pengetahuan | `/humanify/knowledge-base` | Artikel bantuan in-app | Seed KB. | GA |
| Tiket Support | `/humanify/support` | Buat tiket ke platform | Masuk antrean `/platform/support`. | GA |

---

## 4. Portal karyawan (ESS) & manajer (MSS)

**App:** `/employee` — `components/employee/EmployeePortal.tsx`  
**Login:** `/employee/login`  
**Deep-link:** `/employee/attendance`, `/employee/leave`, `/employee/payslip`, `/employee/training`, `/employee/training/course/[id]`, `/employee/training/exam/[id]`

Tab portal (dapat dimatikan per tenant di `/humanify/ess`):

| Tab | Fungsi | Penjelasan |
|---|---|---|
| Beranda | Ringkasan, pengumuman, KPI card | HomeTab + `EssKpiCard` |
| Absensi | Clock in/out GPS + wajah | Geofence, liveness (`FaceLivenessCapture`) |
| Cuti | Ajukan, lihat saldo | Jenis cuti tenant |
| Manajer | Approve tim (jika role manajer) | `ManagerHubTab` — cuti/klaim/lembur |
| KPI | Lihat pencapaian | Karyawan biasa / manajer |
| My Files | Unggah KTP, KK, ijazah | Dokumen pribadi |
| Slip gaji | Unduh payslip | PDF print helper |
| Surat SP | Lihat surat disiplin | Request SP (manajer) |
| Survei | Engagement pulse | `SurveysTab` |
| Training & LMS | Kursus & ujian | Bridge ke LMS |
| Klaim | Reimbursement + struk | Upload bukti privat |
| Lembur | Ajukan & rekap | Multiplier hari |
| Perjalanan | SPD karyawan | Itinerary |
| Kunjungan lapangan | SFA check-in foto | Multifinance / sales field (`MultifinanceFieldTab`) |
| Profil | Data akun | Face enrollment gate |

Konfigurasi HR untuk ESS ada di `/humanify/ess` (overview, config modul, klaim proxy, ack kebijakan, reminder). MSS operasional HR di `/humanify/mss` (inbox klaim, mutasi, lembur, tim).

---

## 5. Admin Total (`/platform`)

Operator Naincode. Bukan UI klien. Nav: `PlatformOpsNav`.

### Primer

| Halaman | Route | Fungsi | Penjelasan |
|---|---|---|---|
| Ringkasan | `/platform` | KPI & chart | Filter periode (hari ini / 7h / 30h / kuartal / YTD). |
| Klien | `/platform/clients` | Daftar tenant | Lifecycle trial→paid. Detail: `/platform/tenants/[id]`. |
| Billing | `/platform/billing` | Order Midtrans, voucher | Idempotency webhook. |
| Partner | `/platform/partners` | Referral & ledger payout | Payout manual CSV, bukan auto Midtrans. |
| Support | `/platform/support` | Antrean + tiket CS | Trial habis, unpaid, at-risk, unverified. |
| Observability | `/platform/observability` | Health, alerts | Internal monitoring (Sentry.io deferred). |
| Audit | `/platform/audit` | Jejak operator | `admin-audit`. |

### Commercial

| Halaman | Route | Fungsi | Penjelasan |
|---|---|---|---|
| Langganan | `/platform/subscriptions` | Upgrade, +14 hari trial, churn | Kontrol paket tenant. |
| Produk | `/platform/products` | Katalog paket | Harga kanonik. |
| Finance | `/platform/finance` | Transaksi, revenue, refund | Refund besar butuh `/platform/approvals`. |

### Growth

| Halaman | Route | Fungsi | Penjelasan |
|---|---|---|---|
| CRM | `/platform/crm` | Kanban lead New→Won/Lost | Form lead. |
| Marketing | `/platform/marketing` | Campaign + funnel | Tautan voucher. |
| Konten | `/platform/content` | FAQ + blog CMS | Publish ke landing & `/humanify/blog`. |
| Banner | `/platform/banners` | Carousel landing/dashboard | Upload aset. |
| Analytics | `/platform/analytics` | KPI platform + CSV | Tanggal custom. |
| Insight | `/platform/insights` | Forecast MRR 30/90 hari | Rekomendasi, jejak operator. Bukan LLM. |

### Admin

| Halaman | Route | Fungsi | Penjelasan |
|---|---|---|---|
| Pengguna | `/platform/users` | Activate/deactivate | Super admin & staf. |
| Roles | `/platform/roles` | Desk CS/Finance/Sales | Matriks + assign. Super Admin tetap penuh. |
| Approval | `/platform/approvals` | Setujui/tolak refund besar | Gate keuangan. |
| Sistem | `/platform/system` | Scorecard SMTP/Redis/RLS/Midtrans | Health checks. |
| Demo | `/platform/demo-checklist` | Skrip demo 15 menit | Sales enablement. |
| Email | `/platform/email-preview` | Preview template | Tanpa kirim massal asal. |
| Login ops | `/platform/login` | Auth host ops | `OpsLoginForm`. |

---

## 6. API (fungsi backend)

Prefix tenant: `/api/humanify/*` (session + `tenant_id`). Prefix ops: `/api/platform/*`. Publik enterprise: `/api/v1/*` (API key).

### 6.1 Inti HRIS

| Endpoint | Fungsi |
|---|---|
| `dashboard.ts` | KPI beranda HQ |
| `employees.ts` / `employees-bulk.ts` / `employees-import.ts` / `employees-export.ts` | CRUD & bulk karyawan |
| `employee-profile.ts` / `employee-documents.ts` | Profil & dokumen |
| `organization.ts` / `master-data.ts` | Org unit, master |
| `lifecycle.ts` | Onboarding/offboarding |
| `offboarding-settlement.ts` | Settlement exit |
| `assets.ts` | Inventori aset |
| `calendar.ts` / `announcements` via notifications | Kalender & siaran |
| `leave.ts` / `leave-management.ts` / `leave-bulk.ts` | Cuti |
| `attendance.ts` / `attendance-management.ts` / `attendance-bulk.ts` | Absensi |
| `attendance/devices.ts` / `attendance/device-sync.ts` / `attendance/settings.ts` | Perangkat & kebijakan |
| `overtime.ts` | Lembur |
| `payroll.ts` / `payroll-inputs.ts` / `payroll-bulk.ts` / `disbursement.ts` | Penggajian |
| `kpi.ts` / `kpi-settings.ts` / `kpi-templates.ts` / `kpi-scoring.ts` | KPI |
| `okr.ts` | OKR |
| `performance.ts` / `performance-360.ts` / `nine-box.ts` | Kinerja |
| `recruitment.ts` / `webhooks/recruitment.ts` | Rekrutmen |
| `training.ts` / `training-development.ts` / `training-scoring.ts` / `certificates.ts` | Pelatihan |
| `workflow.ts` | MSS approvals |
| `travel-expense.ts` | Perjalanan dinas |
| `casual-workforce.ts` | Tenaga harian |
| `mutations` via workflow / `team-members.ts` / `team-tasks.ts` / `activities.ts` | Ops HR |
| `industrial-relations.ts` / `disciplinary-letters.ts` | HI & SP |
| `esign.ts` / `webhooks/privy.ts` | E-sign |
| `engagement.ts` / `satisfaction.ts` | Budaya (hidden IA) |
| `project-management.ts` / `project-documents.ts` | Proyek HR (hidden) |
| `hr-analytics.ts` / `workforce-analytics.ts` / `predictive-analytics.ts` / `reports-hub.ts` / `export.ts` | Laporan |
| `ess-config.ts` | Toggle tab ESS |
| `search.ts` | Pencarian global ⌘K |
| `companies.ts` | List/switch/create tenant membership |
| `account.ts` / `invitations.ts` / `invitations-accept.ts` / `mfa.ts` / `sso.ts` | Akses |
| `billing.ts` / `billing/webhook.ts` | Midtrans |
| `enterprise.ts` / `webhooks.ts` / `integrations.ts` | Enterprise |
| `support.ts` / `knowledge-base.ts` / `go-live.ts` | Bantuan |
| `ai-hub.ts` / `ai-insights.ts` / `aiman-public.ts` | AIMAN |
| `saas-onboarding.ts` / `signup.ts` / `password-reset.ts` / `email-verify.ts` | Lifecycle akun |
| `banners.ts` / `articles.ts` / `faqs.ts` | CMS publik (baca) |
| `roi-stats.ts` | Angka kalkulator ROI |
| `receipt-ocr.ts` / `upload-claim.ts` / `claim-file.ts` | Klaim |
| `roles/index.ts` / `roles/[id].ts` / `roles/audit.ts` / `me/permissions.ts` | RBAC tenant |
| `notifications.ts` / `notifications/stream.ts` / `alerts.ts` / `alert-digest.ts` | Realtime |
| `policies.ts` | Ack kebijakan |

### 6.2 LMS

`lms/index.ts`, `lms/courses.ts`, `lms/blueprints.ts`, `lms/analytics.ts`, `lms/academy.ts`, `lms/integrations.ts`, `lms/sync.ts`, `lms/ai.ts`.

### 6.3 Platform & v1

`/api/platform/index.ts` (modul ops), `observability.ts`, `obs-alerts.ts`, `banner-upload.ts`, `email-preview.ts`, `sentry-probe.ts`.

`/api/v1/employees`, `departments`, `leaves`, `attendance/summary`, `webhooks`, `openapi`.

---

## 7. Komponen UI (shared)

### 7.1 Shell & chrome

| Komponen | Peran |
|---|---|
| `HumanifyLayout` | Sidebar + header HQ, `CompanySwitcher`, AIMAN banner |
| `OpsLayout` / `PlatformOpsNav` | Chrome Admin Total |
| `PublicAuthShell` / `HumanifyMarketingShell` | Login/signup/landing |
| `EnterprisePageHeader` / `OpsPageChrome` / `PayrollModuleChrome` / `PerformanceModuleChrome` / `TalentModuleChrome` | Header modul konsisten |
| `PlatformAccessNav` | Shell halaman akses (ESS config, SSO, billing) |
| `DashboardModuleGrid` | Grid modul di beranda |
| `QuickActionsDock` / `OpsCommandPalette` | Aksi cepat / ⌘K |
| `FirstRunTour` / `GaOnboardingChecklist` / `SaasSetupWizard` | Onboarding |
| `HumanifyErrorBoundary` / `HumanifyBrandLoader` / `HumanifySeoHead` / `HumanifyLogo` / `NaincodeFooter` | Branding & error |

### 7.2 Data & form HR

| Komponen | Peran |
|---|---|
| `EmployeePicker` / `EmployeeAvatar` / `DepartmentSelect` / `OrgUnitSuggestField` | Pilih orang/unit |
| `EmployeeDocumentsPanel` / `EmployeeDocumentModal` / `EmployeeGenealogyPanel` | Dokumen & silsilah |
| `OrgChartTree` | Bagan organisasi |
| `AttendanceBulkImportModal` | Import absensi |
| `PayrollInputPage` | Input komponen gaji |
| `ClaimReceiptGallery` | Preview bukti klaim |
| `TravelItineraryEditor` | Itinerary SPD |
| `NineBoxMatrix` | Talent 9-box |
| `DataSourceBadge` / `HrisEmptyState` / `HRStatCard` / `HrisHeroMetricCard` / `EssKpiCard` | Status data & KPI |
| `CompanySwitcher` | Ganti perusahaan (multi-tenant membership) |

### 7.3 Disiplin, LMS, proyek, AIMAN, marketing

| Komponen | Peran |
|---|---|
| `disciplinary/*` | Editor SP, letterhead, SOP |
| `lms/ContentPlayer` | Player materi kursus |
| `TrainingLmsBridge` | Jembatan training ↔ LMS |
| `project-management/*` | Tab proyek (hidden IA) |
| `AimanFloatingChat` / `AimanAppFloatingChat` / `AimanSidebarBanner` | Copilot confirm-required |
| `MarketingBannerCarousel` | Banner CMS |
| `HumanifyWelcomePage` / `HumanifyLoginForm` / `HumanifySignupForm` / `HumanifyRoiCalculator*` | Akuisisi |
| `SatisfactionPulse` | Pulse engagement |

### 7.4 Portal karyawan (`components/employee`)

`EmployeePortal`, tab Home/Attendance/Leave, `PayslipTab`, `TrainingTab`, `SurveysTab`, `MyFilesTab`, `DisciplinaryTab`, `ManagerHubTab`, `MultifinanceFieldTab`, face capture (`FaceSelfieCapture`, `FaceLivenessCapture`, `FaceEnrollmentGate`), `TeamMemberDetailSheet`, `VisitDetailModal`.

---

## 8. Fungsi domain di `lib/` (logika, bukan halaman)

Kelompok file yang menjalankan aturan bisnis. Bukan daftar setiap helper.

| Domain | Path | Fungsi bisnis |
|---|---|---|
| Tenancy | `lib/saas/tenant-scope.ts`, `tenant-row-guard.ts`, `company-membership.ts` | Isolasi + switch perusahaan |
| Paket | `lib/saas/plan-entitlements.ts`, `seat-metering.ts` | Fitur per plan, kuota |
| Billing | `lib/saas/humanify-billing.ts`, `midtrans.ts`, `billing-webhook-idempotency.ts` | Order & webhook |
| Payroll | `lib/hris/pph21-calc.ts`, `payroll-disbursement.ts`, `payroll-finance-sod.ts` | Pajak, transfer, SoD |
| Absensi | `lib/hris/attendance-store.ts`, `geofence-utils.ts`, `face-match.ts`, `face-liveness.ts` | Clock + wajah + GPS |
| Cuti | `lib/saas/humanify-leaves.ts`, `leave-approver-auth.ts`, `leave-bulk-cancel.ts` | Saldo & approval |
| Klaim | `lib/hris/claim-receipt.ts`, `claim-storage.ts`, `receipt-ocr.ts` | Bukti privat + OCR |
| LMS | `lib/hris/lms/*` | Kursus, proctor, sertifikat, psikometrik |
| AIMAN | `lib/hris/ai-service.ts`, `ai-copilot.ts`, `aiman-agent-tools.ts` | Confirm-required tools |
| E-sign | `lib/hris/esign-service.ts`, `privy-client.ts` | Privy (UI hidden) |
| ESS | `lib/hris/ess-portal-config.ts` | Toggle modul portal |
| Platform ops | `lib/saas/platform-ops-modules.ts`, `platform-desks.ts`, `cms-content.ts` | Admin Total |
| SSO / MFA | `lib/saas/sso-saml.ts`, `mfa.ts` | Enterprise access |
| Export / go-live | `lib/saas/humanify-export.ts`, `go-live.ts` | Laporan & checklist |

---

## 9. Halaman yang sengaja tidak dijual / tidak di IA

| Item | Alasan |
|---|---|
| E-Sign Privy | Menunggu checklist provider (`docs/humanify-esign-privy-ga.md`) |
| LMS advanced (proctoring, psikometrik, academy) | Gate `HUMANIFY_LMS_LAB` |
| Engagement & Proyek HR | `hidden: true` di sidebar |
| AIMAN otonom | Hanya copilot dengan konfirmasi manusia |
| Auto-payout komisi partner via Midtrans | Ledger/CSV manual |
| Sentry.io | Observability internal `/platform/observability` |

---

## 10. Cara merawat inventaris ini

1. Sidebar berubah → update bagian 3 dan `config/humanify-sidebar.config.ts`.
2. Modul baru di Admin Total → update bagian 5 dan `PlatformOpsNav.tsx`.
3. Tab ESS baru → update `ESS_PORTAL_MODULES` dan bagian 4.
4. Status GA/lab/hidden → `docs/humanify-ga-scope.md` + hire-to-retire.
5. Jangan menyamakan “file halaman ada” dengan “fitur GA” — cek flag env dan `hidden` di sidebar.
