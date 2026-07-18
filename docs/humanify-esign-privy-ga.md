# Humanify — Privy e-sign GA path (HRS-4)

Alur produksi tanda tangan elektronik untuk kontrak / SP / offer letter.

## Mode

| Mode | Kondisi | Perilaku |
|---|---|---|
| `disabled` | Tidak ada `PRIVY_API_KEY` + secret | Simulasi lokal (`hris_esign_documents`) |
| `sandbox` | Kredensial + URL staging | Panggil Privy B2B staging |
| `live` | Kredensial + URL production | Panggil Privy live |

Kode: `lib/hris/privy-client.ts`, `lib/hris/esign-service.ts`, UI `/humanify/esign`.

## Env (VPS — jangan commit)

```bash
PRIVY_API_KEY=...
PRIVY_API_SECRET=...
PRIVY_API_URL=https://api-b2b.privy.id          # atau staging: api-b2b-stg.privy.io
# alias diterima: PRIVY_MERCHANT_KEY / PRIVY_API_KEY_SECRET
```

Setelah set: `pm2 restart humanify --update-env`. Badge di UI harus menunjukkan `Privy sandbox` atau `Privy live`.

## GA checklist

1. [ ] Akun Privy B2B aktif + merchant verified  
2. [ ] Sandbox: buat dokumen PKWT → kirim signer → status `pending` / `partially_signed`  
3. [ ] Sandbox: tanda tangan kedua pihak → `completed` + `privy_doc_token` terisi  
4. [ ] Merge fields surat (`{{employee_name}}`, dll.) di draft SP / kontrak — lihat `lib/hris/letter-merge-fields.ts`  
5. [ ] Live cut-over: ganti `PRIVY_API_URL` ke production, smoke 1 dokumen non-prod employee  
6. [ ] Audit: simpan token Privy + timestamp di `hris_esign_documents`  
7. [ ] Rollback: kosongkan kredensial → kembali ke simulasi lokal tanpa downtime UI  

## Merge fields (template teks)

Gunakan di body / subject / closing draft:

```
Dengan hormat, {{employee_name}} ({{employee_code}}),
Jabatan: {{position}} — {{department}}
Nomor: {{letter_number}} tanggal {{letter_date}}
```

Preview digabung di `GET /api/humanify/disciplinary-letters?action=letter-data&id=…` → `mergedTexts`.

## Batasan Wave-11

- Belum ada UI template editor visual (pakai draft existing).  
- PDF generate tetap lewat `DocumentExportButton` / lib documents.  

## Webhook Privy (Wave-12)

```
POST https://humanify.id/api/humanify/webhooks/privy
Headers: x-webhook-secret: <PRIVY_WEBHOOK_SECRET>   # opsional jika unset = open
         Idempotency-Key: <unique>
Body: { "doc_token": "...", "status": "completed", "signer_email": "a@b.com" }
```

Status dipetakan ke `hris_esign_documents.status`. Duplikat event diabaikan (idempotent).
