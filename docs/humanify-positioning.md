# Humanify — Positioning (vs Mekari Talenta & generic HRIS)

> BD-2 · last updated 19 Jul 2026

## For whom

- **B2B operators** yang butuh HRIS multi-tenant modern (HR Admin + Manager + ESS) tanpa vendor lock-in berat.
- **Tim yang sudah punya domain pet / layanan lapangan** dan ingin satu platform operasional + HR (bukan HRIS “kantor saja”).

## Why switch

| Pain | Humanify |
|---|---|
| Modul banyak tapi journey harian kabur | Action inbox + GA journey (import → absensi → cuti → payroll → ESS) |
| Dokumen & absensi rawan hilang di deploy | Storage durable + signed download + backup runbook |
| Payroll “hitam box” | Fiscal engine + sign-off checklist + audit trail |
| Enterprise SSO mahal / terlambat | SAML ACS e2e gate + IdP runbook |
| Demo sales sulit | Seed `demo` / `qa-golden` + skrip 15 menit |

## Why not just Mekari/Talenta

- **Multi-tenant SaaS first-class** (entitlement, billing Midtrans, invite roles) — bukan instalasi on-prem per klien.
- **Observability internal** (Discord/health) + security scorecard IDOR mingguan.
- **USP roadmap**: AI/AIMAN & ekosistem pet sebagai diferensiator produk, bukan fitur HR generik saja.

## ROI (pitch 60 detik)

1. Hemat waktu HR: bulk edit/export/import + action inbox.
2. Kurangi risiko compliance: policy acknowledgment + dokumen completeness.
3. Time-to-value: trial → seed demo → live payroll fiscal path.

Lihat juga: `docs/humanify-sales-demo-15min.md` · `/humanify/billing` · `/humanify/pricing/roi-calculator`
