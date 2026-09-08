# Humanify — Recruitment connector capability matrix (PR-043)

Source: `lib/hris/recruitment-integrations.ts`  
Rule: do not sell a portal as native unless credentials + webhook secret are live.

| Portal | Capability | Native when | Fallback |
|---|---|---|---|
| LinkedIn | partial | `LINKEDIN_*` + webhook secret | Careers URL / share |
| Indeed | partial | publisher id + token | Apply URL syndication |
| Dealls | partial | API key + company id | Manual multi-post |
| Google for Jobs | outbound | JobPosting JSON-LD on careers | SEO only |
| Jobstreet | partial | API key + webhook | Manual post |
| Kalibrr | partial | API key + webhook | Manual post |
| Glints | partial | API key + webhook | Manual post |
| WhatsApp Recruiter | outbound | phone / business token | 1-click wa.me |
| Portal Karir Humanify | native | always (public apply) | — |

**Capability legend**

- **native** — create/sync inside Humanify without a second admin UI
- **partial** — publish + inbound webhook; portal console still required for ads/boost
- **outbound** — Humanify emits URL/schema; no inbound applicant API
- **manual** — CS copies the careers URL into the portal

Production status is `pending` until env secrets exist (`getPortalCredentialStatus`).
