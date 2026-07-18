# Humanify — Payroll fiscal sign-off checklist

> Engine: `lib/hris/pph21-calc.ts` · Smoke: `npm run smoke:payroll-fiscal`  
> **Bukan** sertifikasi DJP e-Bupot. Tanda tangan finance wajib sebelum klaim “fiscal GA”.

## Checklist finance (tanda tangan)

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | PTKP TK/0–K/3 sesuai UU HPP yang dipakai perusahaan | Finance | ☐ |
| 2 | Tarif progresif PPh21 (5/15/25/30/35) diverifikasi vs kebijakan internal | Finance | ☐ |
| 3 | BPJS Kesehatan & TK: rate & ceiling vs aturan terkini | Finance / HR | ☐ |
| 4 | THR PP 36/2021: rumus & cut-off masa kerja | HR | ☐ |
| 5 | Sample 3 karyawan: hitung manual vs Humanify ± Rp 1 | Finance | ☐ |
| 6 | Audit trail approve → paid tercatat (`payroll_audit_events`) | Tech | ☐ |
| 7 | Payslip release: karyawan bisa lihat di ESS/portal | HR | ☐ |
| 8 | Export CSV/PDF sample disimpan di folder compliance | Finance | ☐ |

## Verifikasi teknis

```bash
npm run smoke:payroll-fiscal
SMOKE_BASE_URL=https://humanify.id npm run smoke:payroll-depth
# API (session HR):
# GET /api/humanify/payroll?action=fiscal-signoff
# GET /api/humanify/payroll?action=payroll-audit&limit=20
```

## Catatan rilis

- Setelah finance menandatangani, set env opsional `HUMANIFY_FISCAL_SIGNED_OFF=true` di VPS (muncul di fiscal-signoff API).
- Tanggal sign-off & nama penandatangan dicatat di ticket/Notion — bukan di kode.
