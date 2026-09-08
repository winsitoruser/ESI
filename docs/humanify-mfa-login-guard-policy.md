# Humanify — MFA & login-guard policy (PR-024)

**Approved risk policy (launch):**

| Control | Infra error behavior | Why |
|---|---|---|
| Login lockout / rate limit | **Fail-open** (allow login, log warning) | Availability: Redis blip must not lock every tenant out |
| Tenant MFA policy check | **Fail-closed in production** (`mustFailClosed()`) | Skipping MFA would widen access |
| Seat metering (invite / employee create) | **Fail-closed in production** | Missing meter must not exceed plan caps |
| Missing payment/webhook secrets | **Fail-closed** | Unsigned Midtrans / webhooks rejected |

Implementation:

- `lib/saas/fail-closed.ts`
- `lib/saas/login-guard.ts` remains non-throwing for lockout storage errors (documented here)
- `pages/api/auth/[...nextauth].ts` MFA infra errors deny login on production hosts
- Multi-instance lockout requires `REDIS_URL` (PR-047)

```bash
npm run smoke:product-readiness
```
