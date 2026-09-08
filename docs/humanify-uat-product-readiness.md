# Humanify — Daftar UAT Product Readiness

**Tanggal:** 1 September 2026  
**Target:** https://humanify.id  
**Ops:** https://ops.humanify.id  
**Acuan:** Launch Exit Criteria + sheet Product Readiness (PR-001…PR-050)  
**Dokumen terkait:** `docs/humanify-product-readiness.md` · `docs/humanify-price-book.md` · `docs/humanify-ga-scope.md`

Isi kolom **Hasil** dengan `PASS` / `FAIL` / `N/A`. Jangan tandai launch ready jika ada FAIL di blok **P0 / Launch blocker**.

| Field | Nilai |
|---|---|
| Tester | |
| Build / deploy | 1 Sep 2026 · PM2 `humanify` online |
| Health | `GET /api/health?deep=1` → 200 |
| Lingkungan | Production (tenant uji, bukan tenant pelanggan live jika memungkinkan) |

**Login uji**

| Peran | URL | Akun |
|---|---|---|
| HR / Owner (superadmin) | `/humanify/login` | `superadmin@humanify.id` |
| Karyawan ESS | `/employee` | akun employee tenant uji |
| Manajer MSS | `/employee` (hub manajer) | akun manager dengan tim |
| Starter (opsional) | tenant paket Starter | tanpa payroll/LMS/AIMAN |

---

## 0. Gate otomatis (jalankan dulu)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://humanify.id/api/health
SMOKE_BASE_URL=https://humanify.id npm run smoke:product-readiness
SMOKE_BASE_URL=https://humanify.id npm run uat:humanify
```

| ID | Cek | Hasil | Catatan |
|---|---|---|---|
| UAT-00 | `/api/health` 200, `service=humanify` | ☐ | |
| UAT-00b | `smoke:product-readiness` hijau | ☐ | |

---

## 1. Launch blockers (P0) — wajib PASS

### A. Signup → setup → first employee → go-live

| ID | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UAT-01 | Buka `/humanify/signup`, daftar tenant **baru** | Akun dibuat, arahkan ke `/humanify/setup` | ☐ |
| UAT-02 | Verifikasi email | Login berhasil setelah verify | ☐ |
| UAT-03 | Wizard: perusahaan (provinsi/kota) | Lanjut tanpa error | ☐ |
| UAT-04 | Wizard: organisasi (departemen) | Departemen tersimpan | ☐ |
| UAT-05 | Wizard: kebijakan (hari kerja + shift) | Lanjut | ☐ |
| UAT-06 | Wizard: **karyawan pertama** (nama, email, jabatan, dept) | Karyawan terbuat; duplikat email tidak menggantung wizard | ☐ |
| UAT-07 | Wizard: Go Live | Masuk dashboard Humanify | ☐ |
| UAT-08 | `/humanify/go-live` | Item email, setup, first employee tercentang / bisa diselesaikan | ☐ |
| UAT-09 | Banner trial | Trial 14 hari terlihat, bukan paket Enterprise | ☐ |

### B. Pricing & scope truth

| ID | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UAT-10 | Billing / ROI / halaman paket | Harga: Starter **Rp499.000** · Growth **Rp1.499.000** · Enterprise **Rp4.999.000** · Trial Rp0 | ☐ |
| UAT-11 | Sidebar tenant GA | **Tidak** ada: E-Sign, Proctoring, Bank Soal, Psikometrik, Academy, Keterlibatan, Proyek HR | ☐ |
| UAT-12 | Buka URL lab `/humanify/esign` | Halaman tidak tersedia / gated, bukan dijual sebagai GA | ☐ |
| UAT-13 | URL LMS lab (`/humanify/lms/academy` dll.) | Redirect / 403 lab, bukan modul GA | ☐ |

### C. Payroll, absensi, cuti, klaim

Gunakan tenant **Growth/Enterprise/Trial** yang sudah punya karyawan.

| ID | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UAT-14 | Generate / hitung payroll run | Perhitungan selesai, net pay tampil | ☐ |
| UAT-15 | Approve run (Finance) | Status approved; HR non-finance ditolak jika SoD aktif | ☐ |
| UAT-16 | Mark **paid** | Status paid; audit trail ada | ☐ |
| UAT-17 | Slip gaji ESS karyawan yang sama | Slip miliknya tampil setelah paid | ☐ |
| UAT-18 | ESS: coba `employeeId` orang lain (query/API) | 403 / data kosong, bukan slip rekan | ☐ |
| UAT-19 | Absensi clock-in → overtime → masuk komponen gaji | Jam OT tercermin di payroll | ☐ |
| UAT-20 | Ajukan cuti ESS → approve manajer | Saldo berkurang; manajer hanya tim sendiri | ☐ |
| UAT-21 | Klaim + unggah bukti → approve | Bukti privat; user lain 403 | ☐ |

### D. ESS / MSS (desktop + HP)

Viewport HP: 390×844 atau device toolbar.

| ID | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UAT-22 | ESS mobile: clock in/out | Berhasil, tidak putus layout | ☐ |
| UAT-23 | ESS mobile: ajukan cuti | Form + submit OK | ☐ |
| UAT-24 | ESS mobile: klaim + payslip | Bisa dibuka; payslip hanya milik sendiri | ☐ |
| UAT-25 | MSS: daftar pending tim | Hanya anggota tim | ☐ |
| UAT-26 | MSS: coba approve item di luar tim | Ditolak | ☐ |

### E. Security / data production

| ID | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UAT-27 | Tenant baru / kosong: dashboard, karyawan, payroll, ESS | Empty state, **bukan** Budi Santoso / KPI 87 / mock | ☐ |
| UAT-28 | Login tenant A, buka data tenant B (URL/ID) | 403/404/kosong | ☐ |
| UAT-29 | Paket Starter: buka `/humanify/payroll` dan AIMAN | Redirect upgrade / 403, bukan data full | ☐ |
| UAT-30 | AIMAN: aksi tulis (buat pengumuman/dll.) | Wajib tombol konfirmasi; tanpa konfirmasi tidak jalan | ☐ |
| UAT-31 | AIMAN: tanya angka gaji/PPh/BPJS | Angka dari data/aturan, bukan karangan LLM | ☐ |

### F. Release / recovery (ops)

| ID | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| UAT-32 | Login + critical page setelah deploy | `/humanify/login` 200, dashboard load | ☐ |
| UAT-33 | Ops: backup freshness diketahui | Dump terbaru ada / Gate E | ☐ |
| UAT-34 | Ops: BUILD_ID / PM2 previous diketahui untuk rollback | Tercatat di sign-off | ☐ |

---

## 2. P1 — penting, bukan launch blocker

| ID | Area | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|---|
| UAT-35 | Import | `/humanify/employees-import` file valid + 1 baris rusak | Error per-baris jelas; baris valid masuk | ☐ |
| UAT-36 | A11y login | Tab keyboard di `/humanify/login` | Label Email/Password, tombol Masuk terfokus | ☐ |
| UAT-37 | Browser | Journey login di Firefox atau Safari | Sama dengan Chrome | ☐ |
| UAT-38 | API key | `/humanify/enterprise` create → pakai → revoke | Revoke menolak request berikutnya | ☐ |
| UAT-39 | SSO | Checklist IdP (`docs/humanify-sso-idp-runbook.md`) | ACS synthetic hijau; IdP nyata N/A jika belum | ☐ |
| UAT-40 | Impersonasi | Ops impersonate tenant | Hanya platform role, banner terlihat, audit log | ☐ |
| UAT-41 | CS runbook | Ikuti `docs/humanify-cs-implementation-runbook.md` Trial | Bisa diselesaikan tanpa engineering | ☐ |
| UAT-42 | Connector | Matriks rekrutmen vs UI | Portal native/partial/manual sesuai sheet | ☐ |

---

## 3. P2 — post-launch (catat, jangan blokir)

| ID | Area | Cek | Hasil |
|---|---|---|---|
| UAT-43 | FORCE RLS prod | Tidak dijual sebagai GA; lab staging | ☐ |
| UAT-44 | Redis | Rate-limit / lockout tetap jalan multi-instance | ☐ |
| UAT-45 | Build off-VPS | N/A sampai CI artifact dipakai | ☐ |
| UAT-46 | Object storage | Upload dokumen masih lokal / dual-read jika S3 | ☐ |
| UAT-47 | Privy / LMS lab | Tetap non-GA | ☐ |

---

## 4. Matriks peran (smoke UI)

| Halaman | HR Admin | Finance | Manager | Employee |
|---|---|---|---|---|
| `/humanify` dashboard | ☐ | ☐ | ☐ | N/A |
| Karyawan CRUD | ☐ | N/A | lihat tim | N/A |
| Payroll run / paid | lihat | ☐ approve/paid | N/A | N/A |
| `/employee` home | N/A | N/A | ☐ | ☐ |
| Leave approve | ☐ | N/A | ☐ tim saja | ajukan |
| Claim approve | ☐ | opsional | ☐ tim saja | ajukan |
| Payslip | HQ | HQ | N/A | milik sendiri |

---

## 5. Kriteria lulus UAT (launch)

**PASS launch** hanya jika:

1. Semua item **UAT-01…UAT-34** PASS atau N/A beralasan (bukan FAIL).
2. Tidak ada kebocoran lintas-tenant / mock di production.
3. Harga dan modul lab sesuai GA sheet.
4. Payroll approve→paid→payslip dan claim-proof hijau.
5. ESS HP + MSS tim-scope hijau.

**FAIL launch** jika satu saja: leak tenant, mock data, lab dijual sebagai GA, payroll salah hitung, payslip IDOR, wizard tidak bisa karyawan pertama.

---

## 6. Sign-off

| Peran | Nama | Tanggal | Keputusan |
|---|---|---|---|
| QA / UAT | | | PASS / FAIL |
| Product | | | |
| Finance (payroll) | | | |
| CTO / Ops | | | |

Salin hasil ke `docs/releases/QC-SIGNOFF-TEMPLATE.md` setelah Gate A–E.

```bash
SMOKE_BASE_URL=https://humanify.id bash scripts/run-humanify-gate-ae.sh
```
