# Humanify SSO — Customer IdP Onboarding Runbook

> D-012 · Enterprise SAML · last updated 18 Jul 2026

## Prerequisite

- Tenant plan: **enterprise** or **trial** (feature `sso`)
- SP already live:
  - ACS: `https://humanify.id/api/humanify/sso/acs`
  - Metadata: `https://humanify.id/api/humanify/sso/metadata?slug=<tenant-slug>`
  - Login init: `https://humanify.id/api/humanify/sso/login?slug=<tenant-slug>`
- Synthetic e2e gate (CI/regression): `npm run smoke:sso-acs`

## Synthetic gate (no customer IdP)

```bash
npm run smoke:sso-acs
SMOKE_BASE_URL=https://humanify.id npm run smoke:sso-idp-checklist
```

## Customer setup (Okta / Azure AD / Google Workspace)

1. Customer opens **Humanify → SSO** (`/humanify/sso`) and copies **SP Entity ID**, **ACS URL**, **Metadata URL**.
2. In IdP console, create a SAML app:
   - ACS / Reply URL = SP ACS
   - Audience / Entity ID = SP Entity ID
   - NameID = email (persistent or emailAddress)
   - Attribute: `email` (or standard claim email)
3. Customer pastes into Humanify SSO form:
   - IdP Entity ID
   - SSO Entry Point (HTTP-Redirect or POST URL)
   - X.509 certificate (PEM, without private key)
   - Optional email domain allowlist
4. Enable SSO → Save.
5. QC: open `/api/humanify/sso/login?slug=<slug>` (incognito) → IdP login → redirect back with `ssoToken` → session.

## Internal QC checklist

| Step | Expected |
|---|---|
| Metadata XML reachable | 200, contains EntityDescriptor |
| Config saved | `GET /api/humanify/sso?action=config` → enabled |
| Login init | 302 to IdP |
| ACS with valid assertion | 302 to `/humanify/login?ssoToken=…` |
| Handoff | NextAuth `sso` provider creates session |
| Starter plan | `FEATURE_NOT_IN_PLAN` on SSO config |

## Failure modes

| Symptom | Check |
|---|---|
| RelayState hilang | IdP must echo RelayState = tenant slug |
| Cert invalid | PEM one cert only; no bag attributes |
| Email kosong | Map NameID / email attribute |
| Loop login | Clock skew; ACS clock UTC; re-mint handoff |

## Ops notes

- Do **not** require customer IdP for every release — `smoke:sso-acs` (self-signed) is the gate.
- Real IdP QC: one staging/QC tenant per major IdP family before GA enterprise deals.
- After completing real IdP QC for a family, record on VPS: `HUMANIFY_SSO_IDP_QC_DONE=okta,azure` (comma list) — informational only, not a hard gate.
- Disable: uncheck Enabled on `/humanify/sso` (credentials login remains).

## Synthetic QC report

```bash
SMOKE_BASE_URL=https://humanify.id npm run smoke:sso-idp-checklist
# prints QC_REPORT_JSON=… with metadata/ACS/login/health/runbook checks
```
