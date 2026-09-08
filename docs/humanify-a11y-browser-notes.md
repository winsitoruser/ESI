# Humanify — A11y & browser notes (Wave-84 FE-84-1 / FE-84-2)

**Date:** 2 Aug 2026  
**Scope:** Track A polish — not a full WCAG certification claim.

## Accessibility (axe) — critical surfaces

Run locally (with authenticated session where needed):

| Surface | URL | Expected |
|---|---|---|
| Login | `/humanify/login` | No critical axe violations on form labels |
| ESS home | `/humanify/ess` (or employee portal) | NPS buttons keyboard-reachable; icons have `aria-label` on header actions |
| Payroll | `/humanify/payroll` | Tables have headers; primary CTAs named |
| Leave | `/humanify/leave` | Form fields labeled |

**Track A DoD:** checklist reviewed; critical unlabeled icon buttons on ESS header already use `aria-label` (Refresh / Notifikasi). Fresh axe JSON may be attached under `artifacts/release-<sha>/` when Gate A–E network run includes browser tooling.

## Browsers

| Browser | Status |
|---|---|
| Chromium (Playwright default) | Primary CI / smoke |
| Firefox / WebKit / Pixel 5 | Enable with `HUMANIFY_E2E_BROWSERS=all` in `playwright.config.ts` |

```bash
HUMANIFY_E2E_BROWSERS=all npx playwright test e2e/humanify-welcome-login.spec.ts
HUMANIFY_E2E_BROWSERS=all npx playwright test e2e/humanify-a11y-public.spec.ts
```
