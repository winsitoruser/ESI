# Humanify — Launch constraint freeze (WAVE-0)

**Tanggal freeze eksekusi:** 9 September 2026  
**Sifat:** default kerja QA/Eng sampai Product/Finance memberi tanda tangan basah. Bukan SLA pelanggan.

Dipakai WAVE-5 (perf) dan GATE-07/18/21/26. Nama on-call (WQ-006) **belum** diisi — GATE-24/26 tetap Open.

| ID | Parameter | Nilai freeze | Sumber | Ack manusia |
|---|---|---|---|---|
| WQ-001 | Health p95 | &lt; 200 ms | Target siklus 4. **Ukur:** p97.5 = 329 ms — GATE-18 Partial. Draft WQ-087: naikkan ke p95 &lt; 400 ms **atau** nginx health. Runbook: `docs/humanify-wave5-perf-runbook.md` | Pending Eng Lead |
| WQ-001 | Login p95 | &lt; 800 ms | Siklus 4 Pass (p97.5 434 ms) | Pending Eng Lead |
| WQ-001 | Error rate load | &lt; 1% | PERF sheet | Pending Eng Lead |
| WQ-002 | RPO | ≤ 24 jam | `docs/humanify-backup-restore-runbook.md` | Pending Eng + Finance |
| WQ-002 | RTO | ≤ 2 jam | Runbook yang sama | Pending Eng + Finance |
| WQ-003 | Harga | Price-book 9 Sep (`seat-pricing-core.ts`) | Landing/ROI/checkout memakai `DEFAULT_SEAT_PRICING` | Kode aligned |
| WQ-004 | LMS / AIMAN | Add-on, bukan bundled Enterprise | `plan-entitlements.ts` + `docs/humanify-ga-scope.md` | Docs aligned 9 Sep |
| WQ-005 | Browser | Chrome, Edge, Firefox, Safari + Pixel 5 | Riset + e2e ESS | Pending QA Lead |
| WQ-006 | On-call / HOLD authority | *Belum named* | — | **Open** |
| WQ-007 | Peak model | 50 tenant aktif; login 200 VU; clock-in 1000 req/min | PERF-003 / PERF-007 sampai GTM angka lain | Pending Growth |
| WQ-008 | Data uji security/perf | Tenant sintetis saja; **jangan** PII produksi | UU PDP + plan §3 | Eng default |

## WQ-008 — checklist env

- [ ] Staging/security/perf tidak restore dump produksi yang berisi PII karyawan nyata tanpa masking
- [ ] Load test memakai tenant sintetis
- [ ] Live payment (WQ-101) hanya order kecil yang disetujui Finance, bukan data gaji
- [ ] Evidence log disanitasi (tanpa token, payslip, nomor rekening)

## Tidak di-freeze di sini

- Tanggal T0 launch — tetap T-relative
- Key Midtrans VPS — WQ-010 (ops)
- SSO GA — tetap “tidak GA tanpa IdP QC” (WQ-037); draft insiden: `docs/humanify-incident-rollback.md`
