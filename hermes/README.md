# Hermes Agent — ESI ERP

[Hermes Agent](https://github.com/NousResearch/hermes-agent) sebagai **AI developer** untuk **PT Ekosistem Satwa Indonesia**, dengan model dari **[SumoPod AI](https://ai.sumopod.com)**.

## Prasyarat

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc
hermes doctor
```

API key di `~/.hermes/.env`:

```bash
SUMOPOD_AI_API_KEY=sk-...
SUMOPOD_AI_BASE_URL=https://ai.sumopod.com/v1
```

Salin template: `cp hermes/env.example ~/.hermes/.env` (lalu isi key).

## Setup project ESI

```bash
cd "/Users/winnerharry/Bedagang ERP/esi-erp"
npm run hermes:setup    # skills + cwd + SumoPod
npm run hermes:team     # profil tim + kanban board esi-erp
```

## Mulai develop (solo)

```bash
cd "/Users/winnerharry/Bedagang ERP/esi-erp"
hermes
```

Di Hermes CLI:

```
/esi-develop
Implementasikan halaman manajemen proyek konservasi di pages/hq/project-management/
```

```
/model sumopod:deepseek-v4-flash
```

## Mulai sebagai CTO (tim AI)

```bash
hermes --profile esi-cto
/esi-cto
hermes kanban --board esi-erp watch
```

## Skills

| Skill | Fungsi |
|---|---|
| `/esi-develop` | Workflow coding ESI ERP |
| `/esi-hq` | Modul HQ & konservasi |
| `/esi-cto` | Orkestrasi tim & kanban |

## File penting

| File | Fungsi |
|---|---|
| `AGENTS.md` | Instruksi utama untuk Hermes |
| `.hermes/DECISIONS.md` | Keputusan arsitektur ESI |
| `.hermes/HANDOFF.md` | Handoff antar sesi |
| `hermes/skills/` | Skills ESI |
| `config/esi-sidebar.config.ts` | Menu navigasi |

## Dashboard

```bash
npm run hermes:dashboard   # http://127.0.0.1:9120
```

## Model rekomendasi

| Model | Use case |
|---|---|
| `deepseek-v4-flash` | Iterasi cepat |
| `seed-2-0-code` | Backend/frontend multi-file |
| `claude-sonnet-4-6` | Review arsitektur |
