# Humanify — Incident, HOLD, and rollback (GATE-26 draft)

**WQ-050** · 9 September 2026 · draft for Eng + Product sign-off (bukan wewenang named sampai WQ-006).

## Severity

| Level | Definisi | Respon |
|---|---|---|
| SEV1 | Cross-tenant leak, auth bypass, duplicate/wrong charge, payroll totals salah, data corrupt, restore gagal, error-rate tak terkendali pada login/clock/payroll | HOLD traffic + rollback atau kill switch segera |
| SEV2 | Modul GA rusak dengan workaround; Midtrans pending lama; email transactional down | Mitigasi 4 jam; jangan scale campaign |
| SEV3 | Cosmetic, lab/non-GA, browser tunggal | Antri hypercare |

## Wewenang (isi nama di WQ-006)

| Keputusan | Siapa | Catatan |
|---|---|---|
| HOLD launch / pause campaign | Product Owner **atau** Eng Lead | Satu orang cukup; jangan menunggu rapat |
| Rollback app ke artifact sebelumnya | DevOps on-call | Runbook backup + `pm2` |
| Kill switch checkout / Snap | Finance + DevOps | Matikan Midtrans client key / feature flag billing |
| Disable AIMAN / lab URL | Eng | Flag sudah fail-closed |

Sampai nama diisi, default: **Eng Lead** boleh HOLD; **jangan GO**.

## Kill switch billing

1. Ops: `/platform/billing` — jangan sync pending massal saat insiden.
2. VPS: unset / rotate `MIDTRANS_CLIENT_KEY` (checkout berhenti; webhook signature tetap wajib).
3. Jangan auto Iris payout (`HUMANIFY_PARTNER_AUTO_PAYOUT` tetap off).
4. Setelah pulih: uji WQ-100 sandbox lalu WQ-101 Rp kecil.

## Rollback app

Ikuti `docs/humanify-backup-restore-runbook.md`. Urutan:

1. `pm2 stop humanify` (atau maintenance)
2. Kembali ke artifact RC sebelumnya (WQ-032 harus sudah di-drill)
3. Jika data: restore dump ke prosedur runbook, **bukan** tebak SQL
4. `curl -s https://humanify.id/api/health?deep=1`
5. `SMOKE_BASE_URL=https://humanify.id npm run smoke:ga-journey`

## Trigger rollback (bukan “monitor dulu”)

- Satu cross-tenant read/write
- Session/auth bypass
- Duplicate payment atau entitlement dobel
- Payroll golden mismatch tanpa rounding yang sudah di-sign
- Restore/RTO melewati freeze (24 jam / 2 jam)

## Hypercare T0–T+7

Synthetic harian: health deep + login + satu clock/leave read (WQ-130). Roster WQ-131.
