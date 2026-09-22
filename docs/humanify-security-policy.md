# Humanify Security Policy (baseline)

**Owner (akuntable):** CTO / Head of Engineering — tunjuk nama di IR contact tree.  
**Berlaku untuk:** produk Humanify SaaS (`humanify.id`), platform ops, VPS, CI/CD, dan vendor terkait.

## 1. Access control
- Default-deny authorization; akses hanya setelah auth + role/permission check server-side.
- Tenant isolation wajib: jangan percaya `tenant_id` dari client.
- Platform ops terpisah dari akun kerja harian; least privilege.

## 2. Password & MFA
- Password di-hash (bcrypt); tidak pernah plaintext.
- MFA (TOTP) wajib untuk platform super_admin / platform_admin (enroll gate).
- Tenant dapat mewajibkan MFA via `requireMfa`.
- Reset password: token single-use, hashed, ≤1 jam; session lama diinvalidasi setelah reset.

## 3. Secure development
- Review untuk perubahan auth, payment, payroll, export, upload, privilege.
- Secrets hanya di env / secret store; tidak di git.
- Dependency scan (Trivy) + secret scan (gitleaks) di CI.

## 4. Data handling
- Ikuti klasifikasi di `docs/humanify-data-classification.md`.
- Highly Sensitive (NIK, rekening, gaji, pajak, dokumen kesehatan) — minimize, audit, encrypt in transit.
- Export massal di-audit.

## 5. Incident response
- Ikuti `docs/humanify-incident-rollback.md` (SEV1–3).
- Laporkan ke `ops@humanify.id` / `security.txt`.

## 6. Backup
- Automated dump + retention sesuai `docs/humanify-backup-restore-runbook.md`.
- RPO ≤ 24 jam, RTO ≤ 2 jam.

## 7. Vendor management
- Midtrans, Cloudflare, SumoPod, SMTP, Redis — kunci server-side; review akses berkala.

## 8. Employee security
- Jangan bagikan kredensial; gunakan password manager.
- Laporkan phishing / kebocoran segera.

**Referensi checklist:** `docs/humanify-security-defense-master-checklist.txt`
