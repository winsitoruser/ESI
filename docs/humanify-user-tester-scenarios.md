# Humanify — Skenario User Tester (semua modul, fitur, fungsi)

**Produk:** Humanify HRIS SaaS (`https://humanify.id`)  
**Bukan:** SIMESI / ESI ERP  
**Cutoff:** 9 September 2026 · sumber kanonik: [inventaris modul](./humanify-module-inventory.md), [GA scope](./humanify-ga-scope.md), [UAT bisnis](../artifacts/gsheet-live-readiness/33_UAT_Scenarios.csv)

Dokumen ini adalah **checklist manusia**. Setiap baris = satu skenario yang tester jalankan di UI (bukan tes otomatis). Tandai Pass / Fail / Blocked + lampirkan bukti (screenshot atau rekaman singkat).

## Cara pakai

1. Siapkan tenant **trial** (semua fitur 14 hari) atau Growth+ dengan add-on LMS/AIMAN sesuai paket yang diuji.
2. Pakai **data sintetis**. Jangan unggah KTP/gaji karyawan nyata.
3. Uji **desktop** untuk HQ; uji **desktop + mobile** untuk ESS (`/employee`).
4. Setiap Fail wajib catat: URL, peran, langkah keberapa, hasil aktual, screenshot.
5. Fitur **Lab / Hidden** (E-Sign, proctoring, psikometrik, engagement, proyek HR) **bukan** yang dijual — tester hanya memastikan tidak muncul di menu GA.

### Akun minimum

| Peran | Dipakai untuk | Catatan |
|---|---|---|
| Calon klien (belum punya akun) | Landing, signup, ROI, partner | Browser tanpa session |
| Owner / Tenant Admin | Setup, billing, undangan, RBAC | Email terverifikasi |
| HR Admin | Master karyawan, absensi, cuti, rekrutmen | Boleh sama dengan owner di tenant kecil |
| Payroll Operator | Generate payroll, **tanpa** approve/paid | SoD finance |
| Finance | Approve payroll, disbursement, billing | Bukan orang yang generate run |
| Manajer | Inbox MSS, KPI tim | Punya 2+ bawahan |
| Karyawan A (bawahan manajer) | ESS sendiri | Face/GPS jika diuji absensi |
| Karyawan B (bukan tim manajer) | Isolasi MSS | Tidak boleh terlihat di inbox manajer |
| Kandidat (anonim) | Apply `/careers` | Email dummy |
| Operator platform (Naincode) | `/platform/*` | Hanya jika tester ops; bukan klien |

Login klien: `https://humanify.id/humanify/login` · ESS: `https://humanify.id/employee/login` · Ops: host Admin Total.

### Urutan hari (disarankan)

| Hari | Paket | Fokus |
|---|---|---|
| Hari 1 | A + B + E (inti) | Akuisisi, karyawan, ESS login/clock/cuti |
| Hari 2 | C + D | Absensi lengkap + payroll SME |
| Hari 3 | F + G | Rekrutmen, LMS, kinerja, ops HR |
| Hari 4 | H + J | Billing, RBAC, isolasi, gate non-GA |
| Hari 5 | I (ops) + regresi | Admin Total + ulang P0 yang Fail |

---

## A. Publik, akuisisi, akun

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-A01 | Tamu | `/` | Landing hidup | Buka humanify.id. Baca hero, FAQ, banner, harga. Klik CTA daftar. | Halaman utuh, harga 10k/9.5k/9k + add-on LMS/AIMAN, CTA ke signup. | P0 |
| UT-A02 | Tamu | `/humanify/pricing/roi-calculator` | Kalkulator ROI | Isi headcount, bandingkan paket. | Angka masuk akal, tidak error. | P1 |
| UT-A03 | Tamu | `/humanify/blog` | Blog CMS | Buka daftar + satu artikel terbit. | Artikel tampil; draft tidak publik. | P2 |
| UT-A04 | Tamu | `/humanify/partners` | Partner lead | Isi form partner; cek `/partners/status`. | Lead tersimpan; status bisa dicek. | P2 |
| UT-A05 | Calon klien | `/humanify/signup` | Daftar tenant | Daftar email baru, isi perusahaan. | Akun + tenant trial terbuat; email verifikasi terkirim. | P0 |
| UT-A06 | Calon klien | `/humanify/verify-email` | Verifikasi email | Buka tautan di inbox. | Status terverifikasi; billing tidak diblokir karena unverified. | P0 |
| UT-A07 | Calon klien | `/humanify/setup` | Wizard setup | Isi perusahaan, pilih trial, tambah karyawan pertama, selesai. | Landas di `/humanify`; checklist go-live terlihat. | P0 |
| UT-A08 | Semua | `/humanify/login` | Login benar | Email + sandi valid. | Masuk HQ. Session bertahan refresh. | P0 |
| UT-A09 | Semua | `/humanify/login` | Login salah | Sandi salah 3×. | Ditolak; pesan jelas; tidak bocor apakah email terdaftar berlebihan. | P0 |
| UT-A10 | Semua | Login | Logout | Logout, lalu buka `/humanify` dan `/employee`. | Redirect ke login; tidak bisa akses data lama. | P0 |
| UT-A11 | Semua | `/humanify/forgot-password` | Reset sandi | Minta reset, buka email, set sandi baru, login. | Sandi lama mati; sandi baru jalan. Token sekali pakai. | P0 |
| UT-A12 | Tamu | `/humanify/join` | Terima undangan | HR undang user baru; buka tautan join. | User masuk tenant yang benar, role sesuai undangan. | P0 |
| UT-A13 | Owner multi-perusahaan | Header HQ | Ganti perusahaan | Switcher perusahaan A → B. | Data, sidebar, billing mengikuti B; tidak campur A. | P0 |

---

## B. Karyawan, organisasi, siklus hidup

Paket: semua.

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-B01 | HR | `/humanify` | Beranda HQ | Login HR. Lihat KPI, inbox, grid modul, alert trial. | Angka masuk akal; modul GA bisa diklik; lab tidak dijual di grid. | P0 |
| UT-B02 | HR | `/humanify` ⌘K | Cari global | Cari nama karyawan tenant sendiri. | Hasil hanya tenant sendiri. | P0 |
| UT-B03 | HR | `/humanify/employees` | Tambah karyawan | Buat karyawan lengkap (NIK dummy, unit, atasan, tanggal masuk). | Tersimpan; muncul di list; bisa dibuka detail. | P0 |
| UT-B04 | HR | `/humanify/employees` | Edit & nonaktif | Ubah jabatan; set status nonaktif. | Perubahan terlihat; karyawan nonaktif tidak clock/cuti sesuai kebijakan. | P0 |
| UT-B05 | HR | `/humanify/employees` | Validasi wajib | Simpan tanpa nama/email. | Ditolak; field bertanda. | P1 |
| UT-B06 | HR | `/humanify/employees-import` | Impor CSV | Unduh template, isi 5 baris valid + 1 baris rusak, impor. | Valid masuk; rusak ditolak dengan alasan; ada undo bulk. | P0 |
| UT-B07 | HR | `/humanify/employees` | Ekspor | Export sample. | File berisi karyawan tenant ini saja. | P0 |
| UT-B08 | HR | Detail karyawan | Unggah dokumen | Unggah PDF KTP dummy, unduh, hapus. Coba `.exe` / HTML. | PDF OK; `.exe`/HTML ditolak. File privat. | P0 |
| UT-B09 | HR | Detail karyawan | Silsilah | Isi panel genealogy jika ada. | Data tampil di panel; tidak merusak master. | P2 |
| UT-B10 | HR | `/humanify/organization` | Struktur org | Buat unit, jabatan, assign karyawan, lihat bagan. | Bagan & reporting line konsisten dengan database karyawan. | P1 |
| UT-B11 | HR | `/humanify/onboarding` | Onboarding | Mulai checklist karyawan baru, tugas, issue aset. | Tugas muncul; aset terikat karyawan; ESS bisa login setelah effective date. | P1 |
| UT-B12 | HR | `/humanify/assets` | Aset issue/return | Issue laptop ke karyawan; return. | Status inventori berubah; tidak double-issue. | P1 |
| UT-B13 | HR | `/humanify/contracts` | Reminder kontrak | Buat kontrak hampir kedaluwarsa (≤30 hari). | Reminder/alert terlihat di halaman kontrak / beranda. | P1 |
| UT-B14 | HR | `/humanify/offboarding` | Offboard | Exit karyawan aktif: tanggal efektif, clearance aset, settlement. | ESS putus setelah efektif; riwayat tetap untuk HR; aset kembali. | P0 |
| UT-B15 | HR | `/humanify/calendar` | Kalender HR | Lihat event cuti/shift/gajian. | Event sesuai data modul sumber. | P1 |
| UT-B16 | HR | `/humanify/announcements` | Pengumuman | Tulis & kirim. Buka ESS karyawan. | Pengumuman tampil di portal; HTML berbahaya di-strip. | P1 |
| UT-B17 | HR | `/humanify/go-live` | Checklist hari pertama | Centang item go-live. | Progress tersimpan; jelas apa yang belum. | P1 |

---

## C. Absensi & cuti

Paket: semua. Clock pakai zona **Asia/Jakarta**.

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-C01 | HR | `/humanify/attendance/settings` | Kebijakan absensi | Set jam kerja, toleransi telat, geofence, `allowOutsideGeofence` = false. | Tersimpan; ESS mengikuti kebijakan. | P0 |
| UT-C02 | HR | `/humanify/attendance-management` | Shift & roster | Buat pola shift, assign ke Karyawan A. | Roster terlihat; rekap harian memakai shift ini. | P1 |
| UT-C03 | Karyawan | `/employee` Absensi | Clock-in di dalam geofence | Di lokasi kantor (atau GPS mock dalam radius), clock-in. | Tercatat sekali; waktu Jakarta benar. | P0 |
| UT-C04 | Karyawan | `/employee` Absensi | Clock-in di luar geofence | Di luar radius. | Ditolak jika kebijakan tidak mengizinkan. | P0 |
| UT-C05 | Karyawan | `/employee` Absensi | Clock-out | Clock-out hari yang sama. | Pasangan in/out lengkap; tidak dobel clock-in. | P0 |
| UT-C06 | Karyawan | Absensi | Clock malam (23:59 / 00:00) | Clock dekat ganti hari. | Tanggal bisnis Jakarta, bukan bergeser UTC. | P0 |
| UT-C07 | Karyawan | Absensi | Wajah / liveness | Jika face enrollment wajib: daftar wajah, clock dengan liveness. | Clock tanpa wajah ditolak jika kebijakan wajib. | P1 |
| UT-C08 | HR | `/humanify/attendance` | Dasbor absensi | Lihat hadir/telat/alpha hari ini. | Sesuai clock ESS; karyawan lain tenant tidak campur. | P0 |
| UT-C09 | HR | `/humanify/attendance` | Koreksi | Koreksi satu record (izin HR). | Jejak perubahan; rekap berubah. | P1 |
| UT-C10 | HR | `/humanify/attendance` | Impor absensi | Impor file bulk. | Baris valid masuk; duplikat ditolak/idempotent. | P1 |
| UT-C11 | HR | `/humanify/attendance/daily` | Rekap harian | Buka grid harian periode tes. | Siap jadi input payroll; filter orang/unit jalan. | P0 |
| UT-C12 | HR | `/humanify/attendance/devices` | Perangkat | Daftarkan device dummy / lihat sync. | Halaman hidup; sync tidak menduplikasi punch. | P2 |
| UT-C13 | HR | `/humanify/leave` | Master jenis cuti | Buat/ubah jenis, kuota, syarat. | Saldo karyawan mengikuti jenis. | P0 |
| UT-C14 | Karyawan | `/employee` Cuti | Ajukan cuti valid | Cek saldo, ajukan rentang kerja, kirim. | Status pending; saldo belum terpotong penuh sampai approve (sesuai kebijakan). | P0 |
| UT-C15 | Karyawan | Cuti | Ajukan melebihi saldo | Ajukan lebih dari sisa. | Ditolak. | P1 |
| UT-C16 | Manajer | ESS/MSS | Approve cuti | Approve permintaan bawahan; reject satu dengan alasan. | Karyawan lihat status akhir; HR lihat jejak. | P0 |
| UT-C17 | HR | `/humanify/leave` | Bulk cancel | Batalkan beberapa pengajuan. | Status konsisten di HQ + ESS. | P1 |
| UT-C18 | Manajer | MSS | Isolasi tim | Coba lihat/approve cuti Karyawan B (bukan tim). | Tidak terlihat / ditolak. | P0 |

---

## D. Payroll, klaim, perjalanan, tenaga harian

Paket: **Growth+** (trial = semua fitur). Finance ≠ payroll operator.

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-D01 | Payroll | `/humanify/payroll` | Hub payroll | Buka dasbor, tautan sub-halaman. | Semua sub-menu Growth terbuka. | P0 |
| UT-D02 | Payroll | `/humanify/payroll/main` | Generate run gaji normal | Karyawan gaji tetap + BPJS + PPh; generate periode. | Gross / potongan / pajak / BPJS / net sesuai vektor yang disepakati. | P0 |
| UT-D03 | Payroll | Proses gaji | Join mid-month | Karyawan masuk di tengah periode. | Prorata sesuai kebijakan. | P0 |
| UT-D04 | Payroll | Proses gaji | Resign mid-month | Karyawan exit di periode. | Prorata + settlement tidak dobel bayar. | P0 |
| UT-D05 | Payroll | Proses gaji | Unpaid leave | Ada cuti tidak dibayar approved. | Potongan sesuai hari. | P0 |
| UT-D06 | Payroll | `/humanify/payroll/lembur` | Lembur | Masukkan lembur weekday/weekend yang sudah di-approve. | Masuk gaji **sekali**; multiplier benar. | P0 |
| UT-D07 | Payroll | `/humanify/payroll/bonus` | Bonus | Input bonus. | Masuk komponen run. | P1 |
| UT-D08 | Payroll | `/humanify/payroll/cash-advance` | Kasbon | Buat kasbon, pastikan potongan gaji. | Saldo outstanding berkurang setelah run. | P1 |
| UT-D09 | Payroll | `/humanify/payroll/loan` | Pinjaman | Buat cicilan. | Potongan sesuai jadwal. | P1 |
| UT-D10 | Payroll | `/humanify/payroll/thr` | THR | Hitung THR karyawan eligible. | Proporsional masa kerja; pajak sesuai kebijakan. | P0 |
| UT-D11 | Payroll | `/humanify/payroll/pph21` | PPh 21 | Cek TER/progresif sampel, termasuk dekat ambang. | Pembulatan sesuai aturan; SPT masa bisa dibuka. | P0 |
| UT-D12 | Payroll | `/humanify/payroll/bpjs` | BPJS | Cek iuran Kes + TK employer/employee. | Share sesuai master. | P0 |
| UT-D13 | Payroll | `/humanify/payroll/slip-gaji` | Terbit slip | Setelah run, terbitkan slip. | Karyawan A unduh milik sendiri di ESS. | P0 |
| UT-D14 | Karyawan | ESS Slip | Isolasi slip | Tebak URL slip karyawan lain. | Ditolak (403). | P0 |
| UT-D15 | Payroll | Lock run | Kunci periode | Finalize/lock; coba edit komponen. | Terkunci; reopen hanya jalur resmi + audit. | P0 |
| UT-D16 | Finance | `/humanify/payroll` approve | SoD approve | Finance approve run yang dibuat operator. Operator coba self-approve. | Finance bisa; operator tidak. | P0 |
| UT-D17 | Finance | `/humanify/payroll/disbursement` | File transfer | Generate file bank, rekonsiliasi total. | Total = net payroll; **bukan** auto-payout Midtrans. | P0 |
| UT-D18 | Payroll | `/humanify/payroll/laporan` | Laporan gaji | Export rekap. | Angka = run terkunci; hanya tenant sendiri. | P0 |
| UT-D19 | Karyawan | ESS Klaim | Ajukan reimbursement | Upload struk JPG/PDF, jumlah, kirim. | Pending; bukti hanya untuk pemilik + approver. | P1 |
| UT-D20 | Karyawan | Klaim | File berbahaya | Upload `.exe` / SVG/HTML. | Ditolak. | P0 |
| UT-D21 | Manajer | MSS | Approve klaim | Approve satu, reject satu. | Status & jumlah benar di ESS + HR. | P1 |
| UT-D22 | HR | `/humanify/reimbursement` | Gallery bukti | Buka bukti di HQ. | Preview privat; URL tebakan gagal. | P1 |
| UT-D23 | Karyawan | ESS Perjalanan | SPD | Buat itinerary, klaim biaya. | Alur sampai approve; data tidak hilang. | P1 |
| UT-D24 | HR | `/humanify/travel-expense` | SPD HR | Lihat/proses SPD tim. | Sesuai pengajuan ESS. | P1 |
| UT-D25 | HR | `/humanify/casual-workforce` | Tenaga harian | Input upah harian/borongan. | Bukan karyawan tetap; bisa masuk komponen bayar jika didesain. | P2 |
| UT-D26 | Payroll | Bulk upload | Upload komponen | Bulk allowance/deduction. | Mapping benar; baris rusak ditolak. | P1 |

---

## E. Portal karyawan (ESS) & manajer (MSS)

Uji tab yang diaktifkan di `/humanify/ess`.

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-E01 | Karyawan | `/employee/login` | Login ESS | Login akun karyawan. | Masuk portal; bukan HQ admin. | P0 |
| UT-E02 | Karyawan | `/employee` | Hanya data sendiri | Buka profil, absensi, cuti, slip, file. | Tidak ada data orang lain. | P0 |
| UT-E03 | HR | `/humanify/ess` | Matikan tab | Matikan tab Klaim; login ulang ESS. | Tab klaim hilang; URL langsung klaim ditolak/tersembunyi. | P1 |
| UT-E04 | HR | `/humanify/ess` | Face enrollment | Wajibkan face. Karyawan baru tanpa wajah. | Clock diblokir sampai enroll. | P1 |
| UT-E05 | Karyawan | ESS Beranda | Home | Lihat pengumuman, KPI card. | Konten tenant sendiri. | P1 |
| UT-E06 | Karyawan | ESS My Files | Unggah dokumen pribadi | Unggah ijazah dummy. | Tersimpan; HR bisa lihat di panel dokumen. | P1 |
| UT-E07 | Karyawan | ESS KPI | Lihat KPI | Buka tab KPI. | Hanya target/skor sendiri. | P1 |
| UT-E08 | Karyawan | ESS Lembur | Ajukan lembur | Ajukan jam lembur. | Masuk inbox manajer. | P1 |
| UT-E09 | Karyawan | ESS Training | Buka kursus assigned | Mulai materi, selesaikan. | Progress tercatat (butuh add-on LMS). | P1 |
| UT-E10 | Karyawan | ESS Surat SP | Lihat SP | Jika ada SP terbit. | Karyawan lihat surat sendiri. | P1 |
| UT-E11 | Karyawan | ESS Survei | Isi pulse | Kirim survei. | Tersimpan; tidak mengubah data HR lain. | P2 |
| UT-E12 | Karyawan | ESS Kunjungan | Check-in lapangan | Foto + lokasi (jika modul on). | Visit tercatat. | P2 |
| UT-E13 | Karyawan | ESS Profil | Profil akun | Ubah data yang diizinkan. | Field terlarang (gaji, NIK kebijakan) tidak bisa diubah sembarang. | P1 |
| UT-E14 | Manajer | ESS Manajer / `/humanify/mss` | Inbox approve | Lihat cuti/klaim/lembur/mutasi tim. | Hanya tim; aksi approve/reject jalan. | P0 |
| UT-E15 | HR | `/humanify/mss` | Inbox HR | Proses item yang eskalasi ke HR. | Status sampai karyawan. | P1 |
| UT-E16 | Karyawan | Mobile | ESS HP | Ulang UT-E01, C03, C14 di viewport HP. | Layout dipakai; clock/cuti tidak rusak. | P0 |
| UT-E17 | Tamu | `/employee` | Tanpa login | Buka `/employee` logout. | Redirect login. | P0 |

---

## F. Talent: rekrutmen, kinerja, LMS

Rekrutmen: semua paket. KPI/OKR/analitik: **Growth+**. LMS: **add-on** atau trial.

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-F01 | Recruiter | `/humanify/recruitment` | Buat lowongan | Buat job, draft dulu. | Tidak tampil di `/careers`. | P1 |
| UT-F02 | Recruiter | Rekrutmen | Publish | Publish job. Buka `/careers` & `/careers/[slug]` anonim. | Lowongan publik; apply form jalan. | P0 |
| UT-F03 | Kandidat | `/careers/[slug]` | Apply | Isi form, kirim CV PDF. | Kandidat masuk pipeline tenant yang benar. | P0 |
| UT-F04 | Recruiter | Pipeline | Geser stage | Pindah stage, tutup/unpublish. | Publik hilang setelah unpublish; data kandidat tetap di HQ. | P1 |
| UT-F05 | HR | `/humanify/kpi-settings` | Template KPI | Buat indikator, bobot, siklus. | Template siap dipakai. | P1 |
| UT-F06 | Manajer | `/humanify/kpi` | Set target | Set target bawahan, skor, submit. | Karyawan lihat di ESS; orang luar tim tidak. | P1 |
| UT-F07 | HR | `/humanify/okr` | OKR cascade | Buat objective perusahaan → unit → individu. | Alignment terlihat. | P1 |
| UT-F08 | HR | `/humanify/performance` | Siklus review | Buka cycle, 360, 9-box. | Matriks terisi dari skor; bukan data tenant lain. | P1 |
| UT-F09 | HR | `/humanify/lms` | Dasbor LMS | Buka hub (tenant ber-add-on). | Ringkasan kursus/tes. Tanpa add-on: gated. | P0 |
| UT-F10 | HR | `/humanify/lms/courses` | CRUD kursus | Buat kursus, materi, assign karyawan. | Player bisa diputar di HQ/ESS. | P1 |
| UT-F11 | HR | `/humanify/lms/question-bank` | Bank soal | Tambah soal. | Dipakai tes. | P1 |
| UT-F12 | HR | `/humanify/lms/tests` | Ujian | Jadwalkan tes, karyawan kerjakan. | Nilai masuk grading. | P1 |
| UT-F13 | HR | `/humanify/lms/grading` | Penilaian | Nilai manual + otomatis. | Kelulusan sesuai passing score. | P1 |
| UT-F14 | HR | `/humanify/lms/competency` | Sertifikat | Issue sertifikat kompetensi. | Muncul di registri. | P1 |
| UT-F15 | HR | `/humanify/certificates` | Reminder lisensi | Sertifikat hampir expired. | Reminder 30 hari. | P1 |
| UT-F16 | HR | `/humanify/lms/analytics` | Analitik L&D | Buka completion/skor. | Angka = data kursus tenant. | P2 |
| UT-F17 | HR | `/humanify/training` | Program pelatihan | Buat batch operasional. | Bridge ke LMS jika assigned. | P1 |
| UT-F18 | Karyawan | `/employee/training/course/[id]` | Deep-link kursus | Buka tautan kursus. | Hanya kursus assigned; ID orang lain ditolak. | P1 |
| UT-F19 | HR | Starter plan | LMS tanpa add-on | Login tenant Starter tanpa LMS. | Menu LMS tidak dijual / upgrade wall. | P0 |

---

## G. Operasional HR, AIMAN, laporan

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-G01 | HR | `/humanify/team-members` | Tim internal | CRUD staf HR, buka detail. | Data tersimpan. | P2 |
| UT-G02 | HR | `/humanify/tasks` | Tugas tim | Assign tugas, ubah status. | Status terlihat assignee. | P2 |
| UT-G03 | HR | `/humanify/activities` | Timeline | Lakukan aksi karyawan, buka aktivitas. | Jejak muncul. | P2 |
| UT-G04 | HR | `/humanify/mutations` | Mutasi | Ajukan pindah unit; manajer approve. | Assignment org berubah setelah approve. | P1 |
| UT-G05 | HR | `/humanify/industrial-relations` | Kasus HI | Catat kasus, status. | Tersimpan privat di tenant. | P1 |
| UT-G06 | HR | `/humanify/disciplinary-letters` | Surat SP | Draft SP, preview PDF, terbitkan. | Karyawan lihat di ESS; letterhead benar. | P1 |
| UT-G07 | HR | `/humanify/ai` | AIMAN copilot | Tanya copilot; **konfirmasi** sebelum aksi tulis. | Tidak ada aksi gaji/hapus tanpa konfirmasi. Tanpa add-on: gated. | P0 |
| UT-G08 | HR | AIMAN | Tanpa tenant | Jika chat mengambang. | Fail-closed jika konteks tenant hilang. | P0 |
| UT-G09 | HR | `/humanify/hr-analytics` | Analitik HR | Bandingkan headcount vs database. | Angka rekonsiliasi. | P1 |
| UT-G10 | HR | `/humanify/reports` | Pusat laporan | Export kepegawaian/absensi/payroll sample. | Isi = sumber; tenant sendiri. | P0 |
| UT-G11 | HR | `/humanify/workforce-analytics` | Tren tenaga kerja | Buka prediktif/tren. | Tidak error; tidak klaim akurasi berlebih. | P2 |
| UT-G12 | HR | `/humanify/knowledge-base` | KB | Buka artikel bantuan. | Artikel tampil. | P2 |
| UT-G13 | HR | `/humanify/support` | Tiket | Buat tiket. | Masuk antrean; tidak bocor ke tenant lain. | P1 |

---

## H. Akses, keamanan tenant, billing, enterprise

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-H01 | Admin | `/humanify/users` | Undang user | Undang HR/Manager/Employee, assign role. | Masing-masing hanya melihat menu yang diizinkan. | P0 |
| UT-H02 | Admin | `/humanify/users/roles` | Matriks role | Cabut permission sensitif (payroll). Login ulang user. | API langsung juga 403, bukan hanya UI. | P0 |
| UT-H03 | Employee | URL HQ | Privilege | Karyawan buka `/humanify/payroll`. | Ditolak. | P0 |
| UT-H04 | Admin | `/humanify/security` | MFA | Enroll 2FA, logout, login dengan OTP. | Tanpa OTP gagal. | P1 |
| UT-H05 | Admin Ent. | `/humanify/sso` | SSO SAML | Hanya jika ada IdP tes. Metadata + ACS. | Login SSO atau skip + catat Blocked (WQ-037). | P1 |
| UT-H06 | Admin Ent. | `/humanify/enterprise` | API key | Buat key, panggil `/api/v1/employees`. | Data tenant sendiri; key lain/tenant lain ditolak. | P1 |
| UT-H07 | Admin Ent. | Enterprise | White-label | Ubah brand jika tersedia. | Tampil di shell tenant; tidak mengubah tenant lain. | P2 |
| UT-H08 | Admin | `/humanify/billing` | Lihat paket | Buka billing. | Plan, kursi, add-on sesuai aktual. | P0 |
| UT-H09 | Admin | Billing | Checkout | Mulai pembayaran tes (sandbox/prosedur aman). | Order tercatat; status menunggu. | P0 |
| UT-H10 | Admin | Billing | Setelah bayar | Selesaikan pembayaran tes; refresh billing. | Langganan aktif; **tidak dobel** charge. | P0 |
| UT-H11 | Admin | Starter | Entitlement | Di Starter: buka payroll & analitik. | Upgrade wall; data tidak bocor. | P0 |
| UT-H12 | Admin | Growth | Tanpa LMS | Growth tanpa add-on LMS. | LMS gated. | P0 |
| UT-H13 | Admin | `/humanify/org-settings` | Policy | Ubah policy/workflow master. | ESS/MSS mengikuti. | P1 |
| UT-H14 | Admin | `/humanify/ess` | Ack kebijakan | Publish kebijakan; karyawan ack. | Completion terhitung; ack tidak bisa dipalsukan. | P1 |

---

## I. Admin Total (operator Naincode)

Bukan UI klien. Skip jika tester bukan ops.

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-I01 | Ops | `/platform/login` | Login ops | Login operator. | Masuk `/platform`; bukan tenant HQ. | P0 |
| UT-I02 | Ops | `/platform` | Ringkasan | Filter periode. | KPI platform, bukan data HR satu klien mentah berlebih. | P1 |
| UT-I03 | Ops | `/platform/clients` | Daftar klien | Buka tenant tes, detail. | Lifecycle trial/paid terlihat. | P1 |
| UT-I04 | Ops | `/platform/billing` | Order | Lihat order Midtrans. | Idempoten; tidak ada double fulfill. | P0 |
| UT-I05 | Ops | `/platform/subscriptions` | +14 hari trial | Perpanjang trial tenant tes. | Tanggal berubah; audit. | P1 |
| UT-I06 | Ops | `/platform/products` | Katalog harga | Bandingkan harga vs landing. | Sama dengan price book. | P0 |
| UT-I07 | Ops | `/platform/partners` | Partner ledger | Lihat referral; export CSV. | **Bukan** auto-payout Midtrans. | P2 |
| UT-I08 | Ops | `/platform/support` | Antrean tiket | Buka tiket dari UT-G13. | Konteks cukup; tidak ada data tenant lain di tiket ini. | P1 |
| UT-I09 | Ops | `/platform/observability` | Health | Buka monitoring internal. | Status DB/app; bukan Sentry.io. | P0 |
| UT-I10 | Ops | `/platform/system` | Scorecard | Cek SMTP/Redis/RLS/Midtrans. | Merah/hijau sesuai nyata. | P0 |
| UT-I11 | Ops | `/platform/audit` | Jejak operator | Lakukan aksi, cek audit. | Actor + aksi + waktu. | P1 |
| UT-I12 | Ops | `/platform/crm` | Lead kanban | Geser lead New→Won. | Tersimpan. | P2 |
| UT-I13 | Ops | `/platform/marketing` | Campaign | Buat campaign + UTM. | Signup UT-A05 menyimpan UTM. | P1 |
| UT-I14 | Ops | `/platform/content` | Blog/FAQ | Publish FAQ + artikel. | Muncul di landing/blog. | P1 |
| UT-I15 | Ops | `/platform/banners` | Banner | Upload banner. | Carousel landing/dashboard. | P2 |
| UT-I16 | Ops | `/platform/finance` | Refund | Ajukan refund besar. | Masuk `/platform/approvals`; maker ≠ checker. | P1 |
| UT-I17 | Finance Ops | `/platform/approvals` | Approve refund | Setujui/tolak. | Ledger berubah sesuai keputusan + audit. | P1 |
| UT-I18 | Ops | `/platform/users` | User ops | Activate/deactivate staf. | Deactivated tidak login. | P1 |
| UT-I19 | Ops | `/platform/roles` | Desk CS/Sales | Assign desk terbatas; coba aksi finance. | Ditolak. Super admin tetap penuh. | P0 |
| UT-I20 | Ops | `/platform/email-preview` | Preview email | Preview template. | Tidak kirim massal. | P2 |
| UT-I21 | Ops | `/platform/demo-checklist` | Skrip demo | Jalankan checklist 15 menit. | Tidak ada modul non-GA yang disarankan dijual. | P1 |
| UT-I22 | Ops | Impersonate | Impersonate tenant | Jika ada, masuk tenant lalu keluar. | Session kembali ops; tidak nyangkut sebagai klien. | P0 |

---

## J. Gate non-GA, isolasi, regresi silang

| ID | Peran | Route | Skenario | Langkah | Hasil yang diharapkan | P |
|---|---|---|---|---|---|---|
| UT-J01 | HR | Sidebar | E-Sign tidak dijual | Cari E-Sign / Privy di menu GA. | Hidden kecuali flag internal. | P0 |
| UT-J02 | HR | `/humanify/lms/proctoring` | LMS lab | Buka URL proctoring/psikometrik/academy langsung. | Lab gate; bukan fitur GA. | P0 |
| UT-J03 | HR | Sidebar | Engagement / Proyek HR | Cari di menu. | Hidden; jangan ada klaim penjualan. | P0 |
| UT-J04 | HR | AIMAN | Otonom payroll | Minta AIMAN “bayar gaji semua”. | Tidak mengeksekusi; butuh konfirmasi manusia / ditolak. | P0 |
| UT-J05 | HR tenant A | API/UI | Isolasi tenant | Catat ID karyawan A; login tenant B; buka ID itu. | 404/403; tidak ada data A. | P0 |
| UT-J06 | HR | Export | Export scoped | Export karyawan/payroll. | Hanya tenant sesi. | P0 |
| UT-J07 | HR | XSS | Nama berbahaya | Isi nama karyawan `<script>alert(1)</script>`. | Tampil teks biasa; tidak eksekusi. | P0 |
| UT-J08 | HR | Pengumuman | HTML inject | Pengumuman berisi HTML/script. | Di-strip. | P0 |
| UT-J09 | Semua | 404 | Halaman salah | Buka `/humanify/tidak-ada`. | Error branded; tanpa stack/secret. | P2 |
| UT-J10 | Owner | Starter vs Growth | Matriks paket | Bandingkan akses modul vs tabel GA. | Sesuai [GA scope](./humanify-ga-scope.md). | P0 |

---

## Ringkasan jumlah

| Paket | ID | Jumlah | P0 (kira-kira) |
|---|---|---:|---:|
| A Publik & akun | UT-A01–A13 | 13 | 9 |
| B Karyawan & siklus | UT-B01–B17 | 17 | 7 |
| C Absensi & cuti | UT-C01–C18 | 18 | 10 |
| D Payroll & klaim | UT-D01–D26 | 26 | 16 |
| E ESS / MSS | UT-E01–E17 | 17 | 6 |
| F Talent & LMS | UT-F01–F19 | 19 | 4 |
| G Ops HR & laporan | UT-G01–G13 | 13 | 3 |
| H Akses & billing | UT-H01–H14 | 14 | 8 |
| I Admin Total | UT-I01–I22 | 22 | 6 |
| J Gate & isolasi | UT-J01–J10 | 10 | 9 |
| **Total** | | **169** | **~78** |

Sign-off bisnis ringkas (40 item role-based) tetap di `artifacts/gsheet-live-readiness/33_UAT_Scenarios.csv`. Dokumen ini adalah **perluasan fungsional** agar tester tidak melewatkan halaman/fungsi.

## Kriteria selesai per tester

- Semua **P0** di peran yang ditugaskan = Pass atau defect P0 tercatat.
- ESS mobile (UT-E16) Pass untuk clock + cuti + login.
- Payroll: minimal UT-D02, D13, D14, D15, D16 Pass (plus vektor SME D03–D12 jika tester payroll).
- Isolasi: UT-J05, D14, C18, E02 Pass.
- Non-GA: UT-J01–J04 Pass.
