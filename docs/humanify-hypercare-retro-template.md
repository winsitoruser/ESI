# Humanify — hypercare retro template (WQ-132)

Isi satu salinan per hari T0–T+7, lalu ringkas di T+7. Jangan tempel PII (payslip, NIK, rekening, token).

**Period:** T+____ (date: ________)  
**On-call:** ________ (WQ-131)  
**HOLD authority:** ________ (WQ-006)

## Funnel (Growth)

| Metric | Yesterday | Today | Delta | Note |
|---|---:|---:|---:|---|
| Signup started | | | | |
| Email verified | | | | |
| Setup complete | | | | |
| Checkout opened | | | | |
| Paid orders (after WQ-010) | | | | **0 until Midtrans live** |
| Partner leads | | | | |

Source ideas: `/platform` funnel, `activation_funnel` events, Midtrans dashboard (Finance only).

## Support (CS)

| Item | Count | SEV | Owner |
|---|---:|---|---|
| New tickets | | | |
| Login / MFA | | | |
| Clock / leave | | | |
| Payslip / payroll | | | |
| Billing / invoice | | | |
| Escalated to Eng | | | |

## Error budget (Eng)

| Probe | Result | Budget |
|---|---|---|
| `npm run smoke:hypercare` | __ / 7 | Must stay 7/0 or SEV owned |
| `GET /api/health?deep=1` dbLatencyMs | ____ ms | Watch vs SLO (200 ms freeze / 400 ms draft) |
| PM2 `humanify` restarts | | |
| `humanify_obs_events` 5xx (internal obs) | | |
| Cross-tenant / IDOR incident | none / describe | SEV1 → HOLD |

## Actions

1. 
2. 
3. 

**Carry to T+1:**  
**Needs HOLD?** No / Yes — reason:
