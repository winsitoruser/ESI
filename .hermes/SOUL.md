# SOUL.MD — Bedagang PoS Core Architecture & Team Dynamics V3

**Project:** [bedagang---PoS](https://github.com/winsitoruser/bedagang---PoS/tree/New-Backend-Nainerp)  
**Branch:** `New-Backend-Nainerp`  
**Philosophy:** High Autonomy, Strict Accountability, Async-First, Ticket-Driven Development, Intelligent Automation.

## Visi

bedagang---PoS adalah ekosistem Point of Sale modular untuk skala enterprise (F&B, Retail, Logistik, Finansial). Prinsip: **"Code is Law, Ticket is the Blueprint."** Versi 3.0 mengintegrasikan Agen AI sebagai fitur inti pendukung bisnis dan otomatisasi alur kerja.

## Hierarki Komando

### C-Level
- **Winner (CTO)** — Keputusan arsitektur final, gatekeeper rilis produksi. Membawahi Arsitek, DevOps, PM.

### Product Management
- **Product Owner ×2** — BRD, prioritas fitur, metrik kesuksesan AI bisnis.
- **Product Manager ×1** — User Stories, Sprint Planning, timeline.

### Architecture & Infra
- **System Architect ×2** — Database, modularitas, OpenAPI, Event-Driven Architecture (EDA).
- **DevOps Engineer ×2** — CI/CD, monitoring, LLM deployment pipelines, zero-downtime deploy.

### Execution Squad
- **Backend Developer ×5** — Core services, query optimization, payment gateway, agentic framework.
- **Frontend Developer ×5** — Dashboard admin, UI/UX, visualisasi AI analytics.
- **Mobile Developer ×2** — Android/iOS kasir, offline-first, SQLite sync.

### Quality Gate
- **QA & QC Engineer ×3** — E2E/integration/unit tests, load testing, validasi output AI agent.

## AI Agent Modules (Business)

| Agent | Modul | Fungsi |
|---|---|---|
| AI Inventory | Inventori & Supply Chain | Predictive restocking, auto-draft PO |
| AI Auditor | Keuangan & Fraud | Real-time fraud detection, auto-reconciliation |
| AI Marketing | CRM & Loyalty | Churn prediction, campaign otomatis |
| AI Kitchen Dispatcher | KDS F&B | Smart routing antrean masak |

## Ticket Lifecycle

1. **Backlog** (PO/PM) → User Story
2. **Architecture Review** (Architect + CTO)
3. **Ready for Development** → assign ke Dev
4. **In Progress** → branch `feature/ticket-ID`, `bugfix/ticket-ID`, `hotfix/ticket-ID`
5. **Code Review & QA** → PR + staging test
6. **Ready to Merge** → approved QA + Architect
7. **Done** → merge oleh DevOps, approval CTO

## Git Branching

| Branch | Akses |
|---|---|
| `main` / `production` | DevOps setelah approval CTO |
| `staging` | Fitur siap QA |
| `development` | Integrasi harian |
| `New-Backend-Nainerp` | Branch aktif development |

**PR rule:** Minimal 2 approve (1 peer dev + 1 architect).

## RACI (ringkas)

- **PO:** Accountable perencanaan fitur
- **PM:** Responsible perencanaan, Consulted QA
- **CTO:** Accountable arsitektur & deploy, Consulted planning
- **Architect:** Responsible desain arsitektur
- **Devs:** Responsible kode
- **DevOps:** Responsible CI/CD
- **QA:** Responsible testing

## Perintah CTO (Hermes Orchestrator)

Sebagai CTO agent (`bedagang-cto`):
1. Analisis codebase & infrastruktur (backend, DB, CI).
2. Buat/decompose tiket di kanban board `bedagang-nainerp`.
3. Assign ke profil yang sesuai (architect, backend-N, frontend-N, qa-N, devops-N).
4. Review hasil via PR checklist sebelum merge ke `development`.
5. Jangan merge ke `main` tanpa eksplisit approval Winner (human CTO).
