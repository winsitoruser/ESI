# Driver / Armada Portal — Analisis & Implementasi

Portal self-service untuk supir / kru armada Bedagang ERP.
Mengikuti pola arsitektur `pages/employee/index.tsx` (mobile-first, single-page, tabbed)
dan terintegrasi dengan subsistem HRIS, Fleet Management (FMS),
Transportation Management (TMS), dan GIS berbasis peta.

---

## 1. Tujuan Bisnis

| Stakeholder | Kebutuhan utama |
|---|---|
| **Driver** | Terima penugasan trip, lihat rute & titik antar, start/stop trip, catat BBM, laporkan insiden, lihat slip HR (absensi, cuti, klaim). |
| **Operasional / Dispatcher** | Posisi driver real-time di peta, status trip, jejak GPS (polyline), dan audit kegiatan lapangan. |
| **HR** | Data kehadiran / jam kerja driver terekam otomatis saat `start-trip` / `complete-trip` sehingga HRIS dan FMS konsisten. |
| **Finance / Keuangan** | Konsumsi BBM, odometer, biaya tol, dan insiden untuk alokasi biaya operasional per kendaraan. |

## 2. Peta Integrasi Antar-Sistem

```
 ┌──────────────────────── HRIS ────────────────────────┐
 │ users, employees, employee_attendances, leave_requests,│
 │ employee_claims                                       │
 └────────────┬──────────────────────────────────────────┘
              │  clock-in / clock-out / hr-summary
              ▼
 ┌──────────────────────── DRIVER PORTAL ─────────────────────────┐
 │ /pages/driver/index.tsx                                        │
 │ /pages/api/driver/dashboard.ts  (single-entry action router)   │
 │ /components/driver/DriverMap.tsx (Leaflet, SSR-safe)           │
 └─────┬──────────────┬──────────────────────────────┬────────────┘
       │ profile/     │ start-trip/complete-trip/    │ push-gps,
       │ vehicle/     │ submit-fuel/report-incident  │ gps-history
       ▼              ▼                              ▼
 ┌── FMS ──┐   ┌──── TMS ───────────┐   ┌──── GIS ────────────┐
 │ drivers │   │ routes             │   │ fleet_gps_locations │
 │ vehicles│   │ route_assignments  │   │  lat/lng/heading/   │
 │ fuel_tx │   │ (trip = assignment)│   │  speed/timestamp    │
 │ maint.  │   └────────────────────┘   └─────────────────────┘
 └─────────┘
```

## 3. Arsitektur API

Single endpoint bergaya **action-router** sesuai dengan pola portal karyawan.

- `GET  /api/driver/dashboard?action=<name>`
- `POST /api/driver/dashboard?action=<name>`

### 3.1 Actions

| Method | Action | Deskripsi |
|---|---|---|
| GET | `profile` | Profil driver + cabang + kendaraan aktif |
| GET | `summary` | KPI hari ini & bulan (trips, jarak, BBM, safety) |
| GET | `today-trip` | Trip / route-assignment untuk hari ini |
| GET | `trips` | Riwayat trip per bulan + rekap |
| GET | `vehicle` | Detail kendaraan yang di-assign (dokumen, odometer) |
| GET | `fuel-log` | Log transaksi BBM & efisiensi km/liter |
| GET | `maintenance` | Jadwal servis kendaraan |
| GET | `performance` | Skor on-time %, safety, rating pelanggan |
| GET | `gps-history` | Trail GPS untuk polyline rute actual |
| GET | `hr-summary` | Attendance, sisa cuti, klaim bulanan |
| GET | `notifications` | Notifikasi driver (mock fallback) |
| POST | `clock-in` / `clock-out` | Absensi HRIS manual |
| POST | `start-trip` | Mulai trip + GPS awal + odometer awal |
| POST | `pause-trip` | Istirahat sementara |
| POST | `complete-trip` | Selesaikan trip + GPS akhir + odometer akhir |
| POST | `push-gps` | Ping GPS berkala (lat, lng, speed, heading) |
| POST | `submit-fuel` | Catat transaksi BBM (liter, harga, odometer) |
| POST | `report-incident` | Laporan insiden / kerusakan |

Fallback aman ke **mock data** jika Sequelize belum siap di environment dev sehingga
UI tetap bisa di-preview tanpa migrasi database.

## 4. Model Data yang Digunakan

| Domain | Tabel / Model | Kolom kunci yang dikonsumsi |
|---|---|---|
| HRIS | `users`, `employees`, `employee_attendances`, `leave_requests`, `employee_claims` | `user_id`, `employee_id`, `date`, `check_in`, `check_out` |
| FMS | `fleet_drivers`, `fleet_vehicles`, `fleet_fuel_transactions`, `fleet_maintenance_schedules` | `assigned_driver_id`, `current_odometer_km`, `registration_expiry`, `insurance_expiry` |
| TMS | `fleet_routes`, `fleet_route_assignments` | `status`, `scheduled_date`, `actual_start_time`, `actual_end_time`, `stops` |
| GIS | `fleet_gps_locations` | `latitude`, `longitude`, `speed_kmh`, `heading`, `recorded_at`, `is_moving`, `is_idle` |

## 5. Komponen Peta — `components/driver/DriverMap.tsx`

- **Leaflet** di-load dinamis (`import('leaflet')`) agar aman SSR (Next.js).
- Render:
  - Marker posisi driver (biru, dengan arrow heading).
  - Polyline trail dari `trail[]` (warna gradient dari tua ke muda).
  - Marker stop (start/flag hijau, end/flag merah, waypoint kuning).
  - Auto-fit bounds bila `autoFit` aktif.
- Komponen benar-benar self-contained: tidak butuh `react-leaflet` — cukup CDN CSS di `_document` atau import CSS global.

## 6. Halaman Portal — `pages/driver/index.tsx`

Tabs mobile-first dengan ikon lucide-react:

| Tab | Isi |
|---|---|
| **Beranda** | Salam + cuaca kerja, KPI hari ini, trip aktif, shortcut aksi cepat |
| **Trip** | Daftar trip bulan berjalan, tombol start / complete, modal catat BBM |
| **Peta** | Peta Leaflet real-time: titik driver, trail, stop rute |
| **Armada** | Detail kendaraan: plat, odometer, STNK/KIR/asuransi, maintenance |
| **HR** | Absensi, sisa cuti, klaim, pengajuan cepat |
| **Profil** | Data pribadi, SIM & masa berlaku, performa, sign out |

### GPS tracking

`navigator.geolocation.watchPosition` aktif saat `status === 'in_progress'`,
ping setiap 15 detik ke `POST /api/driver/dashboard?action=push-gps` untuk menulis
ke tabel `fleet_gps_locations` sekaligus meng-update cache UI (trail).

## 7. Alur Bisnis Utama

### 7.1 Memulai trip
1. Driver buka tab **Trip** → pilih trip berstatus `scheduled`.
2. Tekan **Mulai Trip**, konfirmasi odometer awal → `POST start-trip`.
3. API:
   - Update `fleet_route_assignments.status = in_progress` + `actual_start_time = NOW()`.
   - `INSERT employee_attendances.check_in` (jika belum).
   - Simpan ping GPS awal ke `fleet_gps_locations`.
4. UI otomatis mengaktifkan `watchPosition` GPS.

### 7.2 Menyelesaikan trip
1. Tekan **Selesai Trip**, input odometer akhir & catatan.
2. `POST complete-trip`:
   - `status = completed`, `actual_end_time = NOW()`, hitung `total_distance_km`.
   - `employee_attendances.check_out = NOW()`.
   - GPS akhir disimpan.

### 7.3 Catat BBM
- `POST submit-fuel` dengan `liters`, `price_per_liter`, `odometer_km`.
- Insert ke `fleet_fuel_transactions`, update `fleet_vehicles.current_odometer_km`.
- UI menampilkan efisiensi km/liter otomatis.

### 7.4 Laporkan insiden
- Modal: tipe (kecelakaan / kerusakan / lain), deskripsi, severity, lokasi.
- API menyimpan ke tabel insiden + notifikasi supervisor.

## 8. UX & Aksesibilitas

- Mobile-first (desain 390 × 844); desktop tetap enak dengan max-width `md`.
- Dark-on-light, kontras AA, tombol utama ≥ 48 px (sentuh).
- Toast `react-hot-toast` untuk feedback aksi.
- Optimistic UI pada start/complete trip.

## 9. Keamanan

- Semua endpoint mengharuskan `getServerSession(authOptions)`.
- `driver` diresolve lewat `user_id` atau email → mencegah spoofing.
- `tenant_id` di-filter pada semua query.
- Body action divalidasi (tipe angka & string); error fallback `500` dibalut log.

## 10. Pengujian (rekomendasi)

- Unit / integration untuk action router (`jest` + `supertest`).
- Playwright scenario: login driver → start-trip → push-gps → complete-trip.
- Manual QA di perangkat Android untuk `watchPosition` background.

## 11. Pengembangan Batch 2 (sudah diimplementasikan)

Rilis tambahan ini menambah 7 kapabilitas besar:

### 11.1 Pre-Trip Vehicle Inspection (K3 wajib)
- Tabel baru `fleet_vehicle_inspections` dengan JSONB `checklist` + `issues_found`.
- 12 item standar: ban, lampu, rem, spion, oli, radiator, wiper, klakson,
  sabuk, ban serep, toolkit, dokumen.
- Tombol **Mulai Trip** sekarang di-gate: kalau belum ada inspeksi `pass` hari ini,
  sistem otomatis membuka modal inspeksi dulu.
- Overall status otomatis: `pass` / `pass_with_notes` / `fail`. Kalau `fail`,
  trip tidak bisa dimulai → driver diminta hubungi workshop.

### 11.2 Proof of Delivery (POD)
- Tabel `fleet_delivery_proofs` berisi nama penerima, no HP, role, no surat jalan,
  `signature_data` (base64 PNG dari canvas), foto, status, lokasi GPS.
- Canvas tanda tangan native (mouse + touch) + tombol clear.
- POD bisa disimpan per stop atau per trip; dipicu dari tab Trip atau tombol cepat.

### 11.3 Driver Expense / Reimbursement
- Tabel `fleet_driver_expenses` (tol / parkir / makan / penginapan / reparasi / lain).
- Status `submitted → approved/rejected → paid`, siap di-approve HR/Finance.
- Rangkuman total bulan + breakdown per kategori langsung di modal.

### 11.4 Offline GPS Queue (IndexedDB)
- Library `lib/driver/offlineGpsQueue.ts`:
  - `pushGps()` → coba kirim, fallback queue IndexedDB
  - `flush()`   → batch upload lewat `action=push-gps-batch`
  - `startAutoFlush()` → listener `online` + poll 60 dtk
- Header portal menampilkan indikator `Online/Offline (N)` dengan badge
  jumlah ping yang tertahan.

### 11.5 Auto HRIS Attendance
- `startTrip` → `INSERT employee_attendances.check_in` (idempotent `ON CONFLICT`).
- `completeTrip` → update `check_out` bila masih NULL.
- Driver tidak perlu manual clock-in/out.

### 11.6 Navigasi Turn-by-turn (Deep-link)
- Tombol **Arah / Navigasi** di setiap trip card → buka Google Maps Directions
  (`/maps/dir/?api=1&destination=...&travelmode=driving`).
- Juga tersedia dari halaman HQ Live Fleet → Google Maps coordinate lookup.

### 11.7 HQ Live Fleet Dashboard
- Halaman baru `/hq/fleet/live` dengan polling 10 dtk.
- Endpoint `GET /api/hq/fleet/live`:
  - `DISTINCT ON (driver_id)` GPS terakhir per driver (24 jam terakhir)
  - Join driver + vehicle + route_assignment hari ini
  - Summary: total / on-duty / bergerak / idle / tracked
- Komponen `LiveFleetMap` (Leaflet multi-marker) + sidebar daftar driver
  + panel detail driver terpilih (rating, safety, trip aktif, hotline HP).

## 12. Pengembangan Batch 3 (sudah diimplementasikan)

Fokus: ekosistem approval & gamifikasi HQ + hardening security.

| Fitur | Detail |
|---|---|
| **Photo upload** | Endpoint `POST /api/driver/upload?kind=inspection|pod|expense|incident`. Disimpan ke `public/uploads/driver/<kind>/`, disaring hanya image, max 8MB/file, max 8 file. `PhotoUploader` reusable di modal POD/Inspection/Expense dengan preview + tombol Kamera (`capture=environment`) dan Galeri. |
| **HQ Expense Approval** | Halaman `/hq/fleet/expenses` (filter status/kategori/bulan + search, summary cards, breakdown kategori). Single & bulk approve / reject (dengan reason) / mark-paid. API: `GET/POST /api/hq/fleet/expenses`, `PATCH /api/hq/fleet/expenses/:id`. |
| **Leaderboard Driver** | Halaman `/hq/fleet/leaderboard` dengan podium top-3 + tabel peringkat 4 ke bawah. Ranking bulanan multi-metric (overall, trips, distance, safety, rating, POD). API: `GET /api/hq/fleet/leaderboard`. Skor tertimbang (on-time 30%, trips 20%, distance 15%, safety 15%, rating 15%, POD 5%) − penalti insiden. |
| **Planned vs Actual Route Overlay** | `LiveFleetMap` menerima prop `route` berisi `plannedStops` (polyline biru dashed) + `actualPath` (polyline hijau solid dari GPS). Pin start (S, hijau), stops (angka, oranye), end (E, merah). Toggle overlay on/off di header peta. API: `GET /api/hq/fleet/driver-route?driver_id=...`. |
| **Role Guard** | Middleware membatasi `/driver/*` hanya untuk role driver/fleet_driver/armada (admin tetap diperbolehkan untuk support). Role driver diredirect dari `/hq/*` ke `/driver`. Role non-admin diredirect dari `/admin/*`. |
| **Shift & Hours Summary** | Action baru `GET /api/driver/dashboard?action=shift-summary&month=YYYY-MM` menghitung jam kerja (`total_hours`, `regular_hours`, `overtime_hours`, `avg_hours_per_day`) dari `employee_attendances`, plus agregasi trip, distance, POD, dan status klaim (approved/paid/pending). Ditampilkan di tab HR portal driver. |

## 13. Roadmap Lanjutan (belum)

- [ ] Push notification (FCM) untuk assignment baru.
- [ ] Storage S3 / R2 untuk foto upload (sekarang file lokal `public/uploads/`).
- [ ] OSRM / Mapbox Directions API (rencana berbelok mengikuti jalan, bukan garis lurus antar stop).
- [ ] Geofence alert (masuk/keluar area terlarang atau tujuan).
- [ ] QR / Barcode scan pada POD (verifikasi paket).
- [ ] Export laporan leaderboard / expense ke Excel.
- [ ] Approval workflow expense multi-level (supervisor → finance).

---

## 14. File yang Ditambahkan / Diubah

### Driver-side
| Path | Peran |
|---|---|
| `pages/api/driver/dashboard.ts` | API action router (15 GET + 11 POST, termasuk `shift-summary`) |
| `pages/api/driver/upload.ts` | Upload endpoint foto (inspection / POD / expense / incident) |
| `components/driver/DriverMap.tsx` | Komponen peta Leaflet (SSR-safe) |
| `pages/driver/index.tsx` | Portal driver (tabs, modal, GPS loop, POD canvas, PhotoUploader, shift panel) |
| `lib/driver/offlineGpsQueue.ts` | Wrapper IndexedDB + auto-flush GPS |

### HQ-side
| Path | Peran |
|---|---|
| `pages/hq/fleet/live.tsx` | Dashboard live tracking + overlay rute planned/actual |
| `pages/hq/fleet/expenses.tsx` | Dashboard approval expense (filter, bulk, reject reason, mark-paid) |
| `pages/hq/fleet/leaderboard.tsx` | Podium + tabel ranking driver (multi-metric) |
| `pages/api/hq/fleet/live.ts` | API aggregator driver + GPS + trip |
| `pages/api/hq/fleet/driver-route.ts` | API planned stops + actual GPS path per driver |
| `pages/api/hq/fleet/expenses/index.ts` | API list + bulk approve/reject/mark-paid |
| `pages/api/hq/fleet/expenses/[id].ts` | API detail + single approve/reject/mark-paid |
| `pages/api/hq/fleet/leaderboard.ts` | API ranking driver (on-time, trip, safety, rating, POD) |
| `components/hq/fleet/LiveFleetMap.tsx` | Peta multi-marker Leaflet + overlay polyline planned/actual |

### Security & Navigasi
| Path | Peran |
|---|---|
| `middleware.ts` | Role guard: driver-only untuk `/driver/*`, blokir driver ke `/hq/*` & `/admin/*` |
| `config/sidebar.config.ts` | Tambah link Live Tracking, Expense Driver, Leaderboard Driver |

### Database
| Path | Peran |
|---|---|
| `migrations/20260417000002-driver-portal-tables.js` | 3 tabel baru (inspections / PODs / expenses) |
| `models/FleetVehicleInspection.js` | Model inspeksi kendaraan |
| `models/FleetDeliveryProof.js` | Model POD |
| `models/FleetDriverExpense.js` | Model expense driver |

### Dokumentasi
| Path | Peran |
|---|---|
| `DRIVER_PORTAL_ANALYSIS.md` | Dokumen analisis ini |
