# Humanify — Business Plan

**Versi:** 1.0  
**Tanggal:** 30 Juli 2026  
**Perusahaan:** Naincode Inti Teknologi  
**Produk:** Humanify HRIS SaaS (`humanify.id`)  
**Status:** Living document — grounded on implementation & repository evidence  
**Pendamping:** [Documentation Index](./humanify-documentation-index.md) · [Investment Memo](./humanify-investment-memo.md) · [PRD v2](./humanify-prd-v2.md)

> **Aturan kejujuran:** dokumen ini **tidak mengarang** TAM/SAM/SOM, jumlah paying customer, ARR, CAC, LTV, runway, atau valuasi. Bagian yang membutuhkan data eksternal ditandai **[DATA REQUIRED]**.

---

## 0. Executive Summary

### Ringkasan satu halaman

**Humanify** adalah produk SaaS HRIS multi-tenant untuk perusahaan Indonesia, dibangun dan dioperasikan oleh **Naincode Inti Teknologi**. Produk mencakup siklus hire-to-retire: data karyawan, absensi, cuti, payroll (PPh 21 / BPJS / THR), klaim, ESS/MSS, rekrutmen, analitik, billing, dan control plane platform.

**Masalah:** HR Indonesia sering mengelola orang, waktu, cuti, klaim, dan payroll lewat spreadsheet atau sistem terpisah — sehingga lambat, sulit diaudit, dan rawan salah hitung pajak/tunjangan.

**Solusi:** satu cloud HRIS dengan isolasi tenant, self-service karyawan/manajer, payroll Indonesia yang dapat diaudit, serta monetisasi berbasis paket (Trial / Starter / Growth / Enterprise) via Midtrans.

**Status produk saat ini:** *GA core ready with caveats* — journey inti sudah live dan diuji secara berulang; beberapa kemampuan (e-sign Privy, LMS advanced, RLS strict di production, auto-payout partner) sengaja ditahan dan tidak boleh dijual sebagai GA penuh.

**Model bisnis:**

| Paket | Harga list / bulan | Fokus |
|---|---:|---|
| Trial | Rp0 (14 hari) | Evaluasi full feature |
| Starter | Rp499.000 | Core + absensi + rekrutmen |
| Growth | Rp1.499.000 | + payroll + analytics |
| Enterprise | Rp4.999.000 | + LMS, AIMAN, API, white-label, SSO |

Annual: diskon 20% dari monthly × 12. PPN 11% inclusive.

**Go-to-market:** self-serve signup + sales-assisted enterprise + channel partner (konsultan PPh/BPJS, akuntan UMKM, vendor mesin absensi) dengan komisi referral (usulan 10–20% ARR tahun 1).

**Keunggulan yang sudah terbukti di kode/ops:**

1. Kedalaman compliance Indonesia (bukan HR generik saja).
2. Multi-tenant SaaS first-class (plan, entitlement, invite, billing, platform ops).
3. ESS/MSS mengurangi beban admin.
4. Disiplin QA/security (smoke, IDOR scorecard, staging strict RLS).
5. Kejujuran scope (ceiling ADR tidak disembunyikan).

**Risiko utama yang harus dikelola:**

1. Belum ada bukti traction komersial yang diekspor dari production ke dokumentasi.
2. Harga list kanonis (Trial/Starter/Growth/Enterprise) — lihat `docs/humanify-price-book.md`.
3. Production masih soft RLS (strict sudah terbukti di staging).
4. Konsentrasi infrastruktur (single VPS / single process).
5. Over-selling modul lab/hidden (e-sign, LMS advanced, AI autonomous).

**Kesimpulan eksekutif:** Humanify sudah cukup kuat sebagai **product & operating company story**. Belum cukup sebagai **growth / valuation story** tanpa export cohort paying tenant, paid-order MRR/ARR, dan unit economics. Prioritas 90 hari: satukan price book, export metrik komersial, dan perketat disiplin release/artifact.

### Keputusan yang diminta dari pembaca dokumen

| Pembaca | Keputusan yang diharapkan |
|---|---|
| Founder / CEO | Setuju price book kanonis + prioritas GTM 90 hari |
| Board / investor | Terima framing “product-ready, traction TBD” + daftar data diligence |
| Sales / Partner | Pakai GA scope saja; jangan jual fitur deferred |
| CTO / Product | Lanjutkan P0 pricing truth + QA artifact + security narrative |

---

## 1. Company Overview

### 1.1 Identitas

| Field | Value |
|---|---|
| Legal entity | Naincode Inti Teknologi |
| Product brand | Humanify |
| Product type | HRIS System (SaaS multi-tenant) |
| Domain | https://humanify.id |
| Parent / ecosystem | Naincode (web, mobile, cloud, cybersecurity, digital transformation) |
| Kontak | hello@naincode.com · +62 877-8814-1650 |
| Alamat | Jl. Tanah Abang II No.74A, Jakarta Pusat 10160 |

### 1.2 Positioning dalam portofolio Naincode

Humanify adalah **produk SaaS berulang (recurring revenue)** di dalam portofolio Naincode yang juga melayani project-based digital transformation. Ini memungkinkan:

- Cross-sell dari jasa implementasi ke produk berlangganan.
- Case study industri (SME / enterprise) yang memperkuat pipeline.
- Shared engineering discipline (security, DevOps, QA).

**Bukan produk yang sama dengan SIMESI** (ERP pet ecosystem B2B). Monorepo dual-product harus dijaga agar diligence dan sales tidak mencampur klaim.

### 1.3 Visi & misi produk

**Visi:** menjadi HRIS cloud pilihan bagi perusahaan Indonesia yang membutuhkan compliance, self-service, dan operasional yang transparan tanpa kompleksitas ERP penuh.

**Misi:**

1. Digitalisasi hire-to-retire dalam satu tenant yang aman.
2. Membuat payroll & statutory lebih akurat dan dapat diaudit.
3. Mengurangi beban HR lewat ESS/MSS dan antrean aksi.
4. Memungkinkan monetisasi seat/plan + channel partner yang sehat.

---

## 2. Market Opportunity

### 2.1 Masalah pasar (validated by product design)

- Fragmentasi tools: absensi, cuti, payroll, klaim, dan dokumen terpisah.
- Risiko compliance: PPh 21, PTKP, BPJS, THR, cuti sesuai UU Ketenagakerjaan.
- Ketergantungan pada admin HR untuk tugas rutin karyawan.
- Vendor HRIS tradisional yang mahal, lambat di-onboard, atau kurang multi-tenant.
- Kebutuhan enterprise: SSO, API, audit, isolasi data antar perusahaan.

### 2.2 Segmen target

| Segmen | Karakter | Paket tipikal | Catatan |
|---|---|---|---|
| SME kecil | ≤50 karyawan, HR lean | Starter / Trial→Starter | Time-to-value penting |
| Growing mid-market | 50–500 karyawan, butuh payroll | Growth | Core revenue engine |
| Enterprise / multi-lokasi | 500–10.000 karyawan, IT mature | Enterprise | SSO, API, white-label |
| Channel partner | Konsultan pajak/BPJS, akuntan, device vendor | Referral → Starter–Enterprise | Margin tahun 1 |

### 2.3 Market sizing — kerangka saja

**[DATA REQUIRED — jangan isi tanpa sumber bertanggal]**

| Layer | Definisi kerja | Sumber yang dibutuhkan |
|---|---|---|
| TAM | Total spend HRIS/payroll cloud + on-prem di Indonesia (atau ASEAN jika relevan) | BPS, asosiasi, analyst report |
| SAM | Perusahaan Indonesia yang butuh cloud HRIS + compliance ID, ukuran X–Y karyawan | Filter TAM by company size & buyer readiness |
| SOM | Kapasitas sales × win rate × ACV 3–5 tahun | Pipeline internal + capacity plan |

Hingga data di atas ada, **jangan cantumkan angka pasar di pitch eksternal**.

### 2.4 Timing

Faktor yang mendukung:

- Digitalisasi HR pasca-pandemi berlanjut.
- Tekanan compliance & auditabilitas payroll.
- Preferensi SaaS vs instalasi on-prem per klien.
- Kematangan Midtrans / payment rail lokal.

Faktor yang menahan:

- Persaingan vendor mapan (Talenta/Mekari dan sejenis).
- Buying cycle enterprise yang panjang.
- Kepercayaan keamanan multi-tenant.

---

## 3. Product & Value Proposition

### 3.1 Value proposition (60 detik)

> Humanify adalah HRIS cloud multi-tenant untuk perusahaan Indonesia: karyawan, absensi, cuti, payroll PPh 21/BPJS/THR, klaim, ESS/MSS, dan billing — dengan isolasi tenant, audit payroll, dan go-live yang terukur.

### 3.2 Differentiator vs generic HRIS / Talenta-class

| Pain | Humanify response |
|---|---|
| Journey harian kabur | Action inbox + GA journey (import → absensi → cuti → payroll → ESS) |
| Dokumen & bukti rawan hilang | Private storage + signed/session download + backup runbook |
| Payroll “black box” | Engine + fiscal checklist + audit approve→paid |
| SSO mahal / terlambat | SAML ACS e2e gate + IdP runbook |
| Demo sulit | Seed demo/QA + skrip 15 menit |

### 3.3 Matriks fitur — apa yang boleh dijual

| Area | Status penjualan | Bukti |
|---|---|---|
| Employees, org, onboarding/offboarding, kontrak, aset | **Jual (GA)** | Sidebar + lifecycle smoke |
| Absensi, shift, leave, OT→payroll | **Jual (GA)** | payroll-golden |
| Payroll, slip, THR, PPh21, BPJS, loan, kasbon, disbursement | **Jual (GA)** | payroll modules + golden |
| Claims / reimbursement + bukti private | **Jual (GA)** | claim-proof |
| ESS / MSS | **Jual (GA)** | portal + persona smoke |
| Rekrutmen + careers | **Jual (GA)** | dengan caveat konektor eksternal bervariasi |
| LMS core | **Jual hati-hati** | advanced = lab |
| AIMAN | **Jual sebagai assist, bukan autonomous** | Trial/Enterprise entitlement |
| Analytics | **Jual (Growth+)** | entitlement gate |
| SSO / API / white-label | **Jual (Enterprise)** | foundation live; IdP nyata = onboarding |
| E-Sign Privy | **Jangan jual sebagai GA** | UI hidden |
| Partner auto-payout | **Jangan janjikan** | manual CSV/ledger |

### 3.4 Personas & jobs-to-be-done

| Persona | Job utama | Surface |
|---|---|---|
| Owner / HRD | Compliance + biaya + laporan | Billing, reports, go-live |
| HR Admin | Operasikan hire-to-retire | `/humanify/*` |
| Finance/Payroll | Hitung, approve, bayar, audit | Payroll modules |
| Manager | Approve leave/OT/claim/mutasi | MSS / Manager Hub |
| Karyawan | Absensi, cuti, slip, klaim | `/employee` |
| Platform ops | Tenant, obs, partner, support | `/platform` |

---

## 4. Business Model

### 4.1 Revenue streams

1. **Subscription SaaS** (primer) — monthly/annual plan.
2. **Enterprise upsell** — SSO, API, white-label, AI, LMS.
3. **Partner-attributed deals** — referral dengan komisi.
4. **Professional services** (opsional, di luar core SaaS) — onboarding, migrasi data, workshop fiscal **[policy commercial TBD]**.

### 4.2 Pricing (kanonis)

Sumber kebenaran: `lib/saas/plan-entitlements.ts`

| Plan | Monthly (IDR) | Users max | Employees max | Features |
|---|---:|---:|---:|---|
| Trial | 0 | 25 | 100 | Full (14 hari) |
| Starter | 499.000 | 10 | 50 | core, attendance, recruitment |
| Growth | 1.499.000 | 50 | 500 | + payroll, analytics |
| Enterprise | 4.999.000 | 500 | 10.000 | + lms, ai, api, white_label, sso |

**Annual:** `monthly × 12 × 0.8`  
**Tax:** PPN 11% inclusive  
**Seat model:** hard cap per plan; upgrade path (bukan overage fee)

### 4.3 Canonical price book (closed)

ROI calculator, billing, and sales sheet share `HUMANIFY_CANONICAL_PRICES_IDR`.
See `docs/humanify-price-book.md`. Custom Enterprise quotes discount from this list; they do not publish a second book.

### 4.4 Unit economics — kerangka

**Input yang sudah ada di kode:**

- List ARPU per plan.
- Diskon annual 20%.
- Komisi partner default 10% order (tier usulan 10/15/20% ARR Y1).
- ROI assumptions internal: efisiensi waktu 80%, error payroll 2%, dsb. (untuk pitch value, bukan P&L).

**Input yang belum ada [DATA REQUIRED]:**

| Metrik | Mengapa penting |
|---|---|
| CAC by channel | Payback & channel mix |
| Gross margin | Setelah Midtrans MDR + infra + support |
| Logo / revenue churn | Retention health |
| NRR / GRR | Growth quality |
| Implementation cost | Services vs SaaS margin |
| Support cost / tenant | Scalability of CS |
| Midtrans MDR & settlement | COGS payment |
| Paid MRR (cash) vs list MRR | Hindari overstatement |

### 4.5 Contoh ilustratif (bukan forecast)

Untuk perencanaan internal, gunakan skenario **hipotesis** yang jelas ditandai:

> Contoh: 100 paying Growth @ Rp1.499.000 = ~Rp149,9jt list MRR sebelum diskon/churn/PPN treatment.  
> Angka ini **bukan** revenue aktual — hanya alat sensitivitas.

Jangan gunakan contoh ini di deck eksternal tanpa mengganti dengan paid-order export.

---

## 5. Go-to-Market Strategy

### 5.1 Motion

| Motion | Deskripsi | Status |
|---|---|---|
| Product-led / self-serve | Signup → trial → setup wizard → go-live | Live |
| Sales-assisted | Demo 15 menit + seed tenant + billing | Live (playbook) |
| Partner-led | Lead form + referral attribution + commission ledger | Partial (payout manual) |
| Outbound / content | Positioning, ROI calculator, Naincode cross-sell | Partial **[DATA REQUIRED]** |

### 5.2 Funnel target (definisi operasional)

1. Visit / partner lead  
2. Signup + email verified  
3. Setup wizard complete  
4. First employee created  
5. Go-live ready (≥3/4 core checklist)  
6. First payroll run (Growth+)  
7. Paid conversion  
8. Expansion / renewal  

KPI produk yang sudah didefinisikan:

- Time-to-first-employee < 1 hari  
- Time-to-first-payroll < 14 hari  

### 5.3 Sales enablement

- Demo script: `docs/humanify-sales-demo-15min.md`
- Positioning: `docs/humanify-positioning.md`
- GA scope: `docs/humanify-ga-scope.md`
- Isolation FAQ: `docs/humanify-tenant-isolation-faq.md`
- Partner program: `docs/humanify-partner-channel.md`

**Aturan sales:**

- Jangan demo / janjikan: FORCE RLS prod, Sentry.io, Midtrans auto-payout, Privy e-sign GA, LMS advanced penuh.
- AIMAN = assist + human confirm, bukan pengganti keputusan HR/legal/pajak.

### 5.4 Partner program (usulan komersial)

| Tier | Komisi Y1 | Syarat |
|---|---|---|
| Registered | 10% ARR | ≥1 deal closed |
| Certified | 15% ARR | 3 deals + fiscal workshop |
| Premier | 20% + co-marketing | 10 deals / regional lead |

*Angka usulan — finalisasi kontrak legal.*  
Ops saat ini: snapshot komisi + CSV + mark-paid manual.

### 5.5 Pricing & packaging GTM notes

- Trial full-feature mempercepat evaluasi tetapi menaikkan ekspektasi Enterprise.
- Unknown/null plan saat ini default ke Enterprise di kode — **risiko komersial**; harus diputuskan (legacy grandfather vs force choose plan).

---

## 6. Competitive Landscape

### 6.1 Competitor classes

| Kelas | Contoh (indikatif) | Humanify angle |
|---|---|---|
| HRIS lokal mapan | Mekari Talenta & sejenis | Multi-tenant SaaS + observability + channel + AI assist |
| Payroll-only / absensi-only | Banyak vendor niche | Integrasi hire-to-retire + audit |
| ERP berat | SAP SuccessFactors-class / on-prem | Time-to-value & harga mid-market |
| Spreadsheet | Internal Excel | Compliance + ESS + audit |

**[DATA REQUIRED]** matriks harga kompetitor bertanggal, win/loss, dan case migration.

### 6.2 Competitive thesis (honest)

Humanify bersaing pada **kedalaman Indonesia + SaaS controls + operasional/security discipline**, bukan pada klaim “lebih banyak modul daripada siapa pun”. Modul lab yang disembunyikan justru melindungi trust.

---

## 7. Operations & Technology (ringkas untuk business plan)

### 7.1 Delivery model

- Produk cloud multi-tenant shared DB + `tenant_id`.
- App: Next.js (Pages) + PostgreSQL + PM2.
- Prod: `humanify.id` :3020 · Staging: `staging.humanify.id` :3021 (strict RLS).
- Billing: Midtrans Snap + webhook idempotency.
- Observability: internal (bukan Sentry.io).

### 7.2 Operating principles

1. Empty tenant = empty UI (no fake prod data).  
2. Session `tenant_id` = trust boundary.  
3. Mutating SQL via `withHQAuth` / tenant context.  
4. Hidden ≠ deleted; jangan jual.  
5. Payroll changes butuh golden + fiscal checklist.

### 7.3 Capacity & scale posture

Saat ini cocok early-stage controlled SaaS. Sebelum scale agresif:

- Redis shared untuk rate-limit multi-instance.
- Build artifact di CI, bukan hanya on-host.
- Load/capacity baseline.
- Object storage migration policy.
- Strict prod RLS evaluasi setelah gate hijau.

Detail teknis: `docs/humanify-technical-architecture.md`.

---

## 8. Organization & Execution

### 8.1 Roles yang dibutuhkan untuk menjalankan bisnis (bukan headcount aktual)

| Fungsi | Tanggung jawab |
|---|---|
| Product / PM | Scope GA, pricing truth, roadmap |
| Engineering | Delivery, security, reliability |
| QA/QC | Gate A–E, artifacts, regression |
| Sales / CS | Demo, onboarding, retention |
| Partner manager | Channel, commission, enablement |
| Finance / Fiscal | Sign-off payroll, revenue recognition |
| Platform ops | Tenants, observability, support impersonation |

**[DATA REQUIRED]** struktur tim aktual, burn, dan hiring plan.

### 8.2 Cadence operasional

- Release: Gate A–E + HANDOFF note.  
- Security: weekly IDOR scorecard.  
- Commercial: monthly pack (trials, paid, churn, expansion, partner).  
- Fiscal: checklist update tiap perubahan engine material.

---

## 9. Financial Plan Framework

### 9.1 Apa yang boleh diklaim sekarang

- Price book list (Starter/Growth/Enterprise).  
- Annual discount policy (20%).  
- PPN inclusive handling di invoice path.  
- Partner commission stub & ledger.  
- Platform metrics *code path* untuk list MRR vs paid-order MRR.

### 9.2 Apa yang belum boleh diklaim

- ARR/MRR aktual.  
- Jumlah paying logos.  
- Growth rate.  
- Unit economics lengkap.  
- Valuation / raise amount berbasis multiple industri tanpa comps.

### 9.3 Model 12–36 bulan (template)

Isi setelah export data:

| Line | M1 | … | M12 | Y2 | Y3 |
|---|---|---|---|---|---|
| Trial starts |  |  |  |  |  |
| Paid conversions |  |  |  |  |  |
| Paying tenants EoP |  |  |  |  |  |
| Mix Starter/Growth/Enterprise |  |  |  |  |  |
| Paid MRR |  |  |  |  |  |
| Annual prepay attach % |  |  |  |  |  |
| Gross churn % |  |  |  |  |  |
| Expansion MRR |  |  |  |  |  |
| Partner-attributed % |  |  |  |  |  |
| Commission expense |  |  |  |  |  |
| COGS (infra+payment+support) |  |  |  |  |  |
| Gross profit |  |  |  |  |  |
| Sales & marketing |  |  |  |  |  |
| R&D |  |  |  |  |  |
| G&A |  |  |  |  |  |
| Operating income |  |  |  |  |  |
| Cash / runway |  |  |  |  |  |

### 9.4 Sensitivitas yang harus diuji

1. Conversion trial→paid 5% vs 15% vs 25%.  
2. Mix Growth-heavy vs Starter-heavy.  
3. Annual attach 20% vs 50%.  
4. Partner share 0% vs 30% of new logos.  
5. Churn 2%/mo vs 5%/mo.  
6. Enterprise discounting depth.

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Pricing book conflict | High | Putuskan kanonis dalam 14 hari; update ROI/sales |
| Traction tidak terdokumentasi | High | Export paid-order + cohort bulanan |
| Soft RLS prod ditolak enterprise | Medium–High | FAQ jujur + roadmap flip + staging proof |
| Overselling lab features | High | Sales checklist + GA scope di setiap proposal |
| Infra concentration | Medium | CI artifact, monitoring, restore drill, scale plan |
| Partner payout unfinished | Medium | Manual ledger OK short-term; set expectation |
| Fiscal sign-off incomplete | Medium | Checklist finance sebelum claim “compliance-ready” |
| Dual-product confusion (SIMESI) | Medium | Scope statement di setiap deck |
| AI hallucination / liability | Medium | Rule-first + human confirm + audit log |
| Legacy null plan → Enterprise access | Medium | Policy grandfather / force plan selection |

---

## 11. Roadmap & Milestones

### 11.1 0–30 hari (truth & commercial spine)

1. Keputusan price book kanonis.  
2. Export paying tenants + paid MRR/ARR.  
3. Feature-status one-pager untuk sales.  
4. Release artifact policy (immutable smoke/E2E).  
5. Rekonsiliasi default plan Enterprise untuk legacy.

### 11.2 31–90 hari (GTM & retention)

1. Monthly commercial pack live.  
2. 3–5 case study / reference **[DATA REQUIRED]**.  
3. Partner MSA draft + commission schedule.  
4. Capacity/load baseline pertama.  
5. ESS mobile critical journey QA formal.

### 11.3 90–180 hari (enterprise readiness)

1. Evaluasi prod strict RLS (jika gate hijau).  
2. Keputusan Privy e-sign GA / tetap deferred.  
3. Object storage / multi-instance readiness plan.  
4. Channel Premier pilot.  
5. Forecast 12 bulan berbasis data aktual.

### 11.4 Milestone produk (non-financial)

| Milestone | Definisi selesai |
|---|---|
| GA Day-1 | Go-live ready + ≥1 karyawan + ga-journey green |
| Payroll trust | payroll-golden green + fiscal checklist signed |
| Security narrative | scorecard hijau + FAQ soft RLS + roadmap |
| Enterprise attach | ≥1 tenant pakai SSO atau API di production **[DATA REQUIRED]** |

---

## 12. Funding / Capital Use (opsional)

Bagini hanya relevan jika Naincode mencari external capital untuk Humanify.

**[DATA REQUIRED]** sebelum menulis raise:

- Ask amount & instrument.  
- Cap table.  
- Use of funds (product, sales, infra, compliance).  
- 18-month runway target.  
- Milestone yang dibeli investor.

Tanpa itu, bagian ini **sengaja dikosongkan** agar tidak spekulatif.

---

## 13. Governance & Documentation Cadence

| Dokumen | Owner | Update |
|---|---|---|
| Business Plan (ini) | CEO / PM | Quarterly atau saat price/GTM berubah |
| PRD / GA scope | PM | Per wave material |
| Architecture | CTO | Per ADR |
| QA strategy | QA lead | Per release process change |
| Investment memo | CEO / Finance | Saat diligence / board |
| HANDOFF | Eng lead | Per wave |

Hierarki bukti: runtime → DECISIONS → HANDOFF → sidebar/entitlements → docs pack → marketing.

---

## 14. Appendices

### A. Canonical document map

- Index: `docs/humanify-documentation-index.md`
- PRD: `docs/humanify-prd-v2.md`
- Architecture: `docs/humanify-technical-architecture.md`
- QA: `docs/humanify-quality-assurance.md`
- Investment memo: `docs/humanify-investment-memo.md`
- GA scope: `docs/humanify-ga-scope.md`
- Partner: `docs/humanify-partner-channel.md`
- Decisions: `.hermes/DECISIONS.md`
- Handoff: `.hermes/HANDOFF.md`

### B. Declared ADR ceilings (jangan dihapus dari narasi)

1. Production soft RLS (strict deferred).  
2. Sentry.io deferred (internal obs).  
3. Midtrans partner auto-payout won’t-do (manual ledger).  
4. Privy e-sign UI hidden.

### C. Diligence checklist cepat

- [ ] Price book tunggal  
- [ ] Paid-order export  
- [ ] Cohort retention  
- [ ] CAC / channel mix  
- [ ] Gross margin estimate  
- [ ] Customer references  
- [ ] Fiscal sign-off  
- [ ] Security FAQ + RLS roadmap  
- [ ] Release artifacts  
- [ ] Partner contracts  

### D. Contact

- Product / sales: via Naincode · `hello@naincode.com`  
- Partners: `partners@humanify.id` (atau sales Naincode)  
- Billing: `billing@humanify.id` (seller identity di invoice path)

---

## 15. Bottom line

Humanify sudah melewati tahap “apakah produknya nyata?” — **ya, GA core nyata dan operasional**.  

Pertanyaan bisnis berikutnya adalah:

1. **Berapa yang membayar, berapa yang bertahan, berapa yang ekspansi?**  
2. **Price book mana yang resmi?**  
3. **Channel mana yang CAC-nya masuk akal?**  

Jawab tiga pertanyaan itu dengan data production/finance, maka business plan ini berubah dari *product plan* menjadi *investor-grade operating plan*.
