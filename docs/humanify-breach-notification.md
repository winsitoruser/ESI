# Humanify — Breach Notification Workflow (SEC-IR-009)

## Triggers

- Confirmed unauthorized access to Highly Sensitive data
- Ransomware / backup integrity failure
- Midtrans / credential leak affecting customers

## Timeline (UU PDP / contract)

| Step | SLA |
|---|---|
| Detect & contain | ASAP |
| Internal IR bridge | ≤ 4 jam |
| Notify affected tenants (enterprise) | sesuai kontrak (target ≤ 72 jam) |
| Regulator (bila wajib) | sesuai UU PDP |

## Channels

1. Email tenant owner + security contact
2. In-app banner `/humanify/security`
3. Ops status note (internal)

## Template

Subject: `[Humanify] Pemberitahuan Insiden Keamanan`

Isi: waktu deteksi, data terdampak (kelas, bukan raw PII), tindakan, saran (reset password / MFA), kontak `security@humanify.id`.

## Log

Catat di IR ticket + `saas_admin_audit` action `security.breach_notice`.
