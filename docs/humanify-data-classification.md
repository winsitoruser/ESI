# Humanify Data Classification

| Level | Contoh | Kontrol |
|---|---|---|
| **Public** | Landing, harga list, blog | CDN OK; tidak ada PII |
| **Internal** | Metrik ops agregat, runbook non-rahasia | Auth staff |
| **Confidential** | Data karyawan non-finansial, cuti, absensi, ATS kandidat | Tenant-scoped + RBAC |
| **Highly Sensitive** | NIK/KTP, rekening bank, gaji, slip, PPh/BPJS, dokumen kesehatan, credentials/API keys, token AIMAN COGS | Minimize; TLS; audit before/after; maker-checker untuk mutasi gaji/rekening; jangan ke LLM mentah |

## Penanganan Highly Sensitive
1. Jangan log nilai penuh (mask rekening/NIK).
2. Jangan kirim ke SumoPod/AIMAN tanpa redaksi (`lib/hris/ai-prompt-redact.ts`).
3. Perubahan gaji/rekening → pending maker-checker (SEC-ABU-016).
4. Export → permission + `saas_admin_audit`.

## Retensi
Lihat `docs/humanify-doc-retention.md` dan offboarding tenant.
