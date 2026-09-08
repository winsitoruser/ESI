# Humanify — Partner Channel (BD-3)

Program mitra implementasi untuk konsultan payroll, BPJS, dan payroll outsourcing lokal.

## Untuk siapa

| Partner | Nilai |
|---|---|
| Konsultan PPh 21 / BPJS | Onboarding tenant + fiscal sign-off + training HR |
| Kantor akuntan UMKM | Paket Starter/Growth + white-label portal karyawan |
| Vendor mesin absensi | Device-sync + Idempotency-Key (ZKTeco / generic webhook) |

## Co-brand onboarding (GA path)

1. Partner daftar di sales → tenant demo `partner-{slug}`  
2. Seed QA / demo: `npm run seed:demo-tenant`  
3. Walkthrough 15 menit: `docs/humanify-sales-demo-15min.md`  
4. Go-live checklist di `/humanify` + Billing  
5. Optional Privy e-sign: `docs/humanify-esign-privy-ga.md`

## Margin & referral (usulan)

| Tier | Komisi referral (tahun 1) | Syarat |
|---|---|---|
| Registered | 10% ARR tahun 1 | ≥1 deal closed |
| Certified | 15% ARR tahun 1 | 3 deal + fiscal workshop |
| Premier | 20% + co-marketing | 10 deal / regional lead |

*Angka usulan — finalisasi di kontrak legal.*

## Enablement

- Positioning: `docs/humanify-positioning.md`  
- ROI: `/humanify/pricing/roi-calculator`  
- Support: Discord/ops webhook + `/platform/observability`  
- Kontak: `partners@humanify.id` (atau sales Naincode)

## Checklist

- [x] Dokumen channel + link di Billing  
- [x] Portal self-serve partner (lead form) — `/humanify/partners`  
- [x] Inbox lead di `/platform` (`?action=partner-leads`) + triage status  
- [x] Commission **calc stub** — `estimatePartnerCommission` / `?action=commission-preview`  
- [x] Snapshot komisi di `saas_billing_orders` + kolom UI tenant detail  
- [x] Export CSV partner leads (`?action=partner-leads-export`)  
- [x] Export CSV komisi paid (`?action=partner-commission-export`) + filter `billing-orders?partnerCode=`  
- [x] Filter tanggal CSV komisi (`from` / `to`) + ringkasan bulanan di `/platform`  
- [x] Partner stabil `DEMO` (10%) — `npm run ensure:demo-partner` (deploy auto)  
- [x] Ops payout ledger + CSV + partner status portal — **manual mark-paid** (D-015b)  
- [ ] Revenue share / disbursement **otomatis Midtrans** — **won't-do** until D-015 reopen (Track B)

## Payout honesty (BD-83-1)

| Apa yang GA | Apa yang bukan |
|---|---|
| Ledger `saas_partner_payouts` + mark-paid di `/platform` | Auto Midtrans transfer ke rekening partner |
| CSV export + status di `/humanify/partners/status` | Janji “payout realtime” di sales deck |

Sales sheet: `docs/humanify-sales-feature-status.md` · ADR: D-015 / D-015b.