# Humanify — Break-glass Admin (SEC-IAM-017)

## Purpose

Emergency access when normal SSO/MFA/admin paths fail (outage, locked MFA, SEV1).

## Rules

1. **Separate account** — never the day-to-day `superadmin@…` used for product work.
2. Credentials in offline password manager + sealed envelope (ops lead + CTO).
3. Hardware MFA preferred; backup codes in sealed storage.
4. Every use: open IR ticket, log in `saas_admin_audit` (`auth.break_glass`), rotate password after.
5. Break-glass must **not** share the same mailbox as marketing/support.

## Suggested identities

| Env | Account | Role |
|---|---|---|
| Prod | `breakglass@humanify.id` | `platform_admin` |
| Staging | `breakglass-staging@humanify.id` | `platform_admin` |

## Procedure

1. Confirm SEV1 / lockout with second person.
2. Retrieve credentials from sealed store.
3. Login via ops host only (`ops.humanify.id` / `admin.humanify.id`).
4. Fix issue; document timeline.
5. Rotate password + MFA; re-seal.

## Code hooks

- Platform MFA enroll gate still applies — break-glass must keep MFA enrolled.
- Audit: use `/platform` actions which already call `logAdminAction`.
