# Humanify — Privy / LMS commercialization (PR-050)

**Decision (launch):** both remain **lab / non-GA**.

| Item | GA? | Gate | Exit to sell |
|---|---|---|---|
| E-Sign Privy | No | `NEXT_PUBLIC_ESIGN_UI_ENABLED=true` + Privy live keys + legal | `docs/humanify-esign-privy-ga.md` checklist complete |
| LMS advanced (proctoring, bank soal, psikometrik, academy) | No | `HUMANIFY_LMS_LAB=true` | Product memo + lab APIs no longer 403 when LMS add-on is on |

LMS **core** (hub, courses, tests, competency, analytics, training, certificate registry) is a **paid add-on** (`addons.lms`), not a bundled Enterprise feature. Trial (14 hari) tetap full access. AIMAN Copilot adalah add-on terpisah (`addons.ai`), confirm-required.

Do not list Privy or LMS lab modules on the sales feature sheet as GA. Do not tell customers Enterprise includes LMS or AIMAN.
