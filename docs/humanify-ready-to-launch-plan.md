# Humanify Ready-to-Launch — rencana uji & rilis (dikembangkan)

**Sumber:** [Deep Research Test & Release Readiness Plan](https://docs.google.com/document/d/1tb0doXHBu21MnmD9TdPgCC8hOORG9BuI/edit) (9 Sep 2026)  
**Workbook uji:** [humanify-comprehensive-testing-live-readiness](https://docs.google.com/spreadsheets/d/1GdoYZEoH9oYYDRBfaIa_PCJDlgCsTzzh/edit)  
**Tracker produk:** [Humanify_Product_Readiness_Tracker](https://docs.google.com/spreadsheets/d/1hkuiPd5G7livbJfdIlP3nzHdmJ7jXwMa/edit)  
**Cutoff analisis ini:** 9 September 2026  
**Keputusan:** **HOLD** — untested ≠ passed; P0 gate tanpa evidence tetap HOLD.

Antrian kerja executable: [`humanify-launch-work-queue.md`](./humanify-launch-work-queue.md) · CSV [`artifacts/gsheet-live-readiness/launch-work-queue.csv`](../artifacts/gsheet-live-readiness/launch-work-queue.csv)

---

## 1. Apa yang diubah dari dokumen riset

Dokumen asli benar pada prinsip: GO hanya jika **isolation, correctness, recoverability, capacity, commercial truth** terbukti. Pengembangan ini menambahkan tiga hal yang dokumen asli belum punya:

1. **Overlay evidence** siklus live 8–9 Sep (bukan sheet masih “Not Started”).
2. **Freeze constraint** yang di dokumen asli “tidak dispesifikasikan”, diisi dari runbook/repo sebagai **usulan sign-off** (bukan SLA final sampai Product/Eng menandatangani).
3. **Delta produk 9 Sep** yang harus masuk regresi P0: harga per kursi, LMS/AIMAN add-on, multi-company setup tanpa JWT switch, serve logo surat, pie kehadiran dashboard.

Angka 794 task (284 P0 / 420 P1 / 90 P2, ~1.070 jam) adalah model planning. Inventory executable di sheet adalah **749 HT-*** (254 P0 / 495 P1 / 0 P2). Jangan mengejar 794 baris secara literal. Eksekusi memakai **work queue WQ-*** di bawah — setiap item memetakan ke GATE + HT/SEC/PERF yang relevan.

---

## 2. Surface yang harus diuji (inventory 9 Sep)

| Permukaan | Jumlah | Implikasi |
|---|---|---|
| Halaman UI | 136 | Route + workflow, bukan click-only |
| HQ tenant | 87 halaman / 100 file | Persona, entitlement, HR |
| Admin Total | 24 | Privilege platform, impersonate |
| ESS/MSS | 8 | Ownership karyawan + pohon manajer |
| Publik/auth/karir | 17 | Signup → activate |
| API Humanify + platform + ESS + v1 | 143 | Kontrak, auth, tenant scope |
| Tenant-scoped | 121 | Cross-tenant wajib |
| Form | 100 | Positif, negatif, file, concurrency |
| Sidebar hidden/lab | 14 | Direct URL/API deny |

Pola uji per modul (tetap dari dokumen asli):

positif → required negatif → boundary → role terlarang → tenant salah → transisi state → concurrency → audit → dampak hilir → entitlement paket → regresi.

---

## 3. Constraint yang diusulkan untuk di-sign-off (WAVE-0)

Dokumen asli menahan banyak parameter. Nilai berikut **sudah ada di repo** atau diukur di produksi; tetap butuh tanda tangan Product/Eng/Finance sebelum sertifikasi.

| Parameter | Usulan freeze | Sumber | Status |
|---|---|---|---|
| T0 launch | Tetap T-relative; ilustrasi T0 = 23 Sep **bukan komitmen** | Dokumen asli | Open |
| RPO | ≤ 24 jam | `docs/humanify-backup-restore-runbook.md` | Usulan — terima WAVE-0 |
| RTO | ≤ 2 jam | Runbook yang sama | Usulan — terima WAVE-0 |
| Health p95 | < 200 ms | Target siklus 4 GATE-18 | **Gagal ukur:** p97.5 = 329 ms |
| Login p95 | < 800 ms | Siklus 4 | Pass (p97.5 434 ms) |
| Error rate load | < 1% | PERF sheet | Usulan |
| Clock-in spike | 0→1000 req/min | PERF-007 | Belum diuji |
| Browser | Chrome, Edge, Firefox, Safari + Pixel 5 | Rekomendasi dokumen + e2e Pixel 5 Pass | Usulan |
| Harga | Rp 10.000/karyawan; 251+ 9.500; 1.001+ 9.000; LMS +1.500/orang; AIMAN +65.000/bulan; trial 14 hari | `docs/humanify-price-book.md` 9 Sep | Kode + landing prod aligned (WQ-003) |
| LMS / AIMAN | Add-on, **bukan** bundled Enterprise | `plan-entitlements.ts` + price-book | `docs/humanify-ga-scope.md` aligned 9 Sep (WQ-004) |
| RLS prod | Soft request-bound; FORCE strict = staging | `docs/humanify-production-rls-truth.md` | Known — bukan P0 leak jika scopedWhere + IDOR Pass |
| Midtrans live | Production Snap + webhook `/api/humanify/billing/webhook` | HANDOFF 9 Sep | **Key tidak ada di VPS** |
| Auto Iris payout | Off | `HUMANIFY_PARTNER_AUTO_PAYOUT` | Jangan dijual |
| AIMAN otonom | Off; confirm-required | GATE-22 | Jangan dijual |
| Invite return token | Off di prod | `HUMANIFY_INVITE_RETURN_TOKEN` | Bukan bug |

ASVS Level 2 tetap target praktis (bukan sertifikasi). Metodologi OWASP / k6 / WCAG 2.2 / NIST / Midtrans webhook tidak diubah.

---

## 4. Aturan GO / HOLD / ROLLBACK (tetap)

**GO** = semua P0 gate PASS ∧ P0 defect open = 0 ∧ rollback terbukti ∧ production smoke PASS ∧ known P1/P2 accepted.

**HOLD** = satu P0 gate tanpa evidence, atau Failed/Blocked.

**ROLLBACK setelah T0:** cross-tenant, auth bypass, duplikasi/salah hitung finansial, inkonsistensi data destruktif, error-rate tak terkendali, atau restore gagal — langsung disable/rollback, bukan “monitor dulu”.

---

## 5. 30 gate — status evidence 9 Sep

Legenda: **Pass\*** = smoke/drill ada, sheet belum di-update. **Partial** = baseline ada, kriteria GO belum. **Blocked** = tidak bisa lanjut. **Open** = belum ada evidence layak gate.

| Gate | Keputusan | Evidence | Sisa untuk PASS |
|---|---|---|---|
| GATE-01 Isolation | Pass\* | `smoke:tenant-isolation`, `smoke:idor` (94), `smoke:payslip-idor` | Matrix object tersisa (export/search cache) di WAVE-4 |
| GATE-02 RBAC | Partial | deny-matrix, IDOR, multi-role (invite token off = expected) | Desk Admin Total per-action; role×API penuh |
| GATE-03 Auth | Partial | login, forgot-password, join, lockout smokes | Reset token reuse, session fixation, logout replay |
| GATE-04 MFA/SSO | Open | `smoke:phase19-mfa`, `smoke:sso-acs` ada; IdP pelanggan tidak QC | Explicit gate “tidak dijual GA tanpa IdP QC” **atau** bukti SSO |
| GATE-05 Build/migrasi | Partial | Deploy 8 Sep + health 200 | Rehearsal migrasi di copy dump; checksum artifact |
| GATE-06 Rollback | Open | Runbook ada | Drill app/config pada RC |
| GATE-07 Backup/DR | Pass\* | Freshness 15.4 jam; restore scratch 206 tabel | Sign-off RPO/RTO; investigasi dump kecil |
| GATE-08 Billing idempotency | Pass\* | `smoke:billing-idempotency` (tanpa Snap) | Replay/out-of-order + sandbox status matrix |
| GATE-09 Entitlement | Pass\* | wave79, deny-matrix, phase2 | Regresi add-on LMS/AIMAN 9 Sep |
| GATE-10 Employee | Pass\* | employees-uat 48/0, CRUD, docs, import smokes | UAT SME manusia |
| GATE-11 Attendance | Partial | device-sync 405; device-sync idempotency smoke | GPS/face/cutoff/concurrency clock |
| GATE-12 Leave | Pass\* | ess-leave, hr-wave-uat | Concurrency saldo + SME |
| GATE-13 Payroll hitung | Pass\* | golden + fiscal + depth | Tanda tangan SME manusia (`HUMANIFY_FISCAL_SIGNED_OFF`) |
| GATE-14 Export/payslip | Pass\* | payslip-gate | Bank file reconcile SME |
| GATE-15 ESS/MSS | Pass\* | ESS mobile login Pixel 5; portal smokes | UAT manajer pohon + payslip milik sendiri (sudah IDOR) |
| GATE-16 Admin Total | Pass\* | ops-host 8/8, admin-host 8/8 | Desk RBAC sisa (P1 produk, P0 jika privilege bocor) |
| GATE-17 Observability | Partial | deep health Pass; Discord/Sentry deferred | Alert paging drill; golden signals lengkap |
| GATE-18 Performance | Partial | autocannon health/login 15s | k6 load/stress/spike/soak; p95 health |
| GATE-19 Funnel | Pass\* | ga-journey, welcome, signup smokes | UTM utuh sampai CRM (pindah GATE-20) |
| GATE-20 Attribution | Open | — | UTM → event → CRM |
| GATE-21 Pricing truth | Partial | price-book 9 Sep | Crawl landing/demo/checkout/ROI vs kode |
| GATE-22 Non-GA | Pass\* | lms-lab-gate, wave85 | Pastikan sales/ga-scope tidak mengklaim LMS bundled |
| GATE-23 Demo/CRM | Open | `/platform/crm` ada | Demo tenant + lead routing dry-run |
| GATE-24 Support | Open | `/platform/support` ada | Eskalasi P0 named owner |
| GATE-25 Prod smoke | Pass\* | page-crawl, module-pages, product-readiness | Ulang setelah setiap deploy |
| GATE-26 Incident authority | Open | — | Nama yang boleh HOLD/ROLLBACK |
| GATE-27 Campaign CTA | Open | — | Semua CTA hidup |
| GATE-28 Live payment | **Blocked** | Key Snap **tidak ada** di `.env` VPS | Ops/finance pasang key; uji Rp kecil |
| GATE-29 0 P0 open | Open | Midtrans + SLO + rollback + UAT manusia | Tidak bisa PASS sebelum blocker tutup |
| GATE-30 Known issues | Open | BUG-LR-001–009; sheet defect kosong | Register + risk acceptance |

Hitungan kasar: **14 Pass\***, **6 Partial**, **1 Blocked**, **9 Open**. Keputusan sheet 42 tetap HOLD.

---

## 6. Coverage vs 749 HT — jangan eksekusi buta

| Keluarga | Jumlah di sheet | Sudah ada harness kuat | Celah |
|---|---|---|---|
| Functional (HT ~0036–0400-an) | 352 cycle Functional | CRUD, employees, leave, payroll, LMS, billing | Banyak negatif/boundary/state masih template |
| API Regression | 112 | Kontrak parsial lewat smoke modul | OpenAPI formal tidak ada; inventory = kontrak |
| Security | 30 HT + 40 SEC | IDOR, tenant, webhook signature, files | XSS/CSRF/SSRF/mass-assignment/session |
| Performance | 26 HT + 25 PERF | autocannon 15s | k6 + soak |
| Resilience/DR | 24 + backup | Restore scratch | Rollback, chaos, cache outage |
| Compatibility | 70 | Pixel 5 ESS | Desktop matrix 4 browser |
| Accessibility | 8 | — | Keyboard login/ESS |
| UAT | 5 | Smoke “UAT” otomatis | Sign-off manusia |
| Smoke | 35 | Banyak `npm run smoke:*` | Freeze checklist GATE-25 |
| GTM | 15 | ga-journey | Attribution, live pay, demo/support |

**Aturan eksekusi:** P0 GATE dulu. Template HT “8 kombinasi per halaman” hanya dijalankan untuk domain P0 (employee, attendance, leave, payroll, billing, ESS, tenancy). Domain P1 (KPI, recruitment, LMS lab, analytics) tidak menahan GO kecuali entitlement/gating.

---

## 7. Delta produk 9 Sep yang dokumen riset belum cover

Harus masuk WAVE-2 sebelum freeze GTM:

| Perubahan | Risiko bila tidak diuji | Gate |
|---|---|---|
| Harga per karyawan + volume break | Quote ≠ checkout ≠ landing | 21, 08 |
| LMS + AIMAN add-on (bukan Enterprise bundle) | Starter/Growth/Enterprise salah jual | 09, 21, 22 |
| Multi-company + setup `?companyId=` tanpa `session.update` | Hang onboarding; tenant drift | 03, 01, 19 |
| Logo surat via `/api/humanify/public-upload` | 404 di `next start`; jangan buka employee-docs | 01 |
| Pie kehadiran `monthPresence` | Dashboard menampilkan data tenant salah | 01, 25 |
| KPI Midtrans Live disembunyikan | Klaim “Live” di ops vs kenyataan key kosong | 21, 28 |

Konflik dokumen GA-scope vs price-book: **ditutup 9 Sep (WQ-004)**. LMS/AIMAN = add-on.

---

## 8. Gelombang eksekusi (T-relative)

Overlap sengaja: security/perf/DR tidak menunggu functional 100%.

| Wave | Fase | Fokus | Exit |
|---|---|---|---|
| 0 | T-14 | Sign-off constraint + product truth freeze | SLO/RPO/harga/GA tertulis |
| 1 | T-14 | Ops blocker (Midtrans, dump, sheet) | GATE-28 unblocked atau explicit no-pay launch (tidak disarankan) |
| 2 | T-13 | Regresi delta 9 Sep | Harga/add-on/multi-company/logo Pass |
| 3 | T-12→T-8 | Sisa P0 gate Open/Partial | 05/06/03/04/11/20/23/24/26 |
| 4 | T-10→T-6 | Security sisa P0 | 0 cross-tenant/authz High |
| 5 | T-8→T-4 | k6 load/stress/spike/soak | Envelope kapasitas diketahui |
| 6 | T-6→T-3 | UAT SME + a11y critical | Tanda tangan HR/Payroll/Finance |
| 7 | T-4→T-2 | GTM + live payment | GATE-28/20/21/23/24 |
| 8 | T-3→T-1 | Regresi smoke pack | GATE-25 100% |
| 9 | T-1 | Sertifikasi | GATE-29/30 |
| 10 | T0→T+7 | Hypercare | Tidak ada SEV1 tak berowner |

Resource minimum dokumen asli (1 QA lead, 3–5 QA, 1–2 SDET, security, SRE, DevOps, SME) tetap valid. Effort 1.070 jam **tidak** dibagi rata untuk dapat tanggal kalender.

---

## 9. Mitigasi P0 (tidak berubah, dipetakan ke WQ)

| P0 | Mitigasi | Task |
|---|---|---|
| Tenant leak | IDOR + RLS + object matrix | WQ-110, WQ-069 |
| Privilege | Server RBAC + desk | WQ-044, WQ-066 |
| Account takeover | Reset/session/MFA | WQ-035–037, WQ-060 |
| File PII | Signed URL + traversal | WQ-024, WQ-065 |
| Duplicate pay | Signature + idempotency | WQ-008, WQ-101 |
| Entitlement leak | Matrix UI=API | WQ-021, WQ-027 |
| Payroll salah | Golden + SME | WQ-042, WQ-092 |
| Attendance | Clock uniqueness | WQ-038–040 |
| Leave saldo | Atomic + state | WQ-041 |
| Migrasi/rollback | Rehearsal | WQ-031, WQ-032 |
| Backup teori | Restore sudah; RPO sign-off | WQ-002, WQ-011 |
| Capacity | k6 envelope | WAVE-5 |
| Klaim salah | Crawl GTM | WQ-003, WQ-103 |
| Non-GA | Flag + deny URL | WQ-033, WQ-004 |
| Tanpa on-call | Named owner | WQ-006, WQ-048 |

---

## 10. Checklist GO (evidence, bukan feeling)

Centang hanya jika ada tautan bukti.

- [ ] 100% P0 WQ/GATE dieksekusi; 0 Failed/Blocked P0
- [ ] Cross-tenant matrix Pass
- [ ] RBAC tenant + Admin Total server-side Pass
- [ ] Login/reset/session/MFA-or-gated Pass
- [ ] Config prod tanpa sandbox (termasuk Midtrans)
- [ ] Migrasi rehearsal + rollback drill
- [ ] Restore nyata + RPO/RTO accepted
- [ ] Employee / attendance / leave / payroll / payslip Pass + SME
- [ ] Billing sandbox + live payment reconcile
- [ ] Entitlement = price book 9 Sep
- [ ] ESS/MSS ownership Pass
- [ ] Observability actionable
- [ ] Load/stress/spike accepted; soak tanpa leak
- [ ] GTM claim = produksi
- [ ] Funnel + attribution
- [ ] Demo + support escalation
- [ ] Production smoke 100%
- [ ] Incident authority named
- [ ] P1/P2 residual owned
- [ ] Hypercare roster T+7

Sampai item di atas ber-evidence, keputusan resmi: **HOLD**.
