# Email / DNS Phishing Controls (SEC-PHI-002…006) — Ops checklist

Kontrol ini **DNS/registrar** — dikerjakan di Cloudflare / email provider, bukan app code.

- [ ] SPF: `v=spf1 include:… ~all` untuk humanify.id
- [ ] DKIM: kunci aktif di SMTP provider
- [ ] DMARC: mulai `p=none` → `quarantine` → `reject`
- [ ] Registrar MFA + change alerts
- [ ] DNS change restricted ke role Engineering Lead

App side: login notify + security.txt + MFA sudah live.
