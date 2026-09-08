# Humanify / SIMESI — Project Design Context

Use this file **together with** `SKILL.md` and `components.md` when building UI in this monorepo. Prefer existing product chrome over inventing a new look.

## Product surfaces

| Surface | Routes / area | Preset | Notes |
|---------|---------------|--------|--------|
| **Humanify Ops (HRIS)** | `/humanify`, `/platform` | Modern SaaS → Enterprise for dense tables | Brand violet is intentional (not generic AI purple) |
| **Employee ESS / MSS** | employee portal, `/humanify/ess`, `/humanify/mss` | Modern SaaS | Teal accent (`--ep-accent`), distinct from ops violet |
| **Marketing / auth** | login, signup, welcome, ROI | Modern SaaS | Use `HumanifyMarketingShell` / `PublicAuthShell` |
| **SIMESI HQ (ESI ERP)** | `/hq` | Enterprise / Corporate | Pet ecosystem B2B — do not mix Humanify brand tokens |

## Tokens & chrome (must reuse)

- Design tokens: `styles/humanify-tokens.css` (`--hf-*`, `--ep-*`)
- Layout: `components/humanify/HumanifyLayout.tsx`, `EnterprisePageHeader.tsx`
- Stats / empty: `HRStatCard.tsx`, `HrisEmptyState.tsx`
- Cards / buttons: `.hf-card`, `.hf-btn-primary`, `.hf-btn-secondary`
- Sidebar IA: `config/humanify-sidebar.config.ts` (Humanify) · `config/esi-sidebar.config.ts` (SIMESI)
- Portal UI primitives: `components/employee/portal-ui.tsx`

## Brand rules for this repo

1. **Humanify ops accent** = violet (`--hf-brand` / `--hf-brand-600`). Keep it; do not replace with indigo/purple gradients or a second brand color.
2. **ESS portal accent** = teal (`--ep-accent`). Keep ops and ESS visually distinct.
3. Surfaces stay quiet: white / slate muted backgrounds, slate ink, thin borders, soft shadows from tokens.
4. Radius from tokens (`--hf-radius*`) — do not invent new corner scales.
5. Prefer composing existing Humanify components before adding one-off card grids or new design systems.
6. Indonesian product copy is fine; keep labels verb-first and scannable (tables, forms, empty states).

## UX defaults for HRIS screens

- Dense data (payroll, attendance, leave, KPI): **Enterprise / Data Dashboard** density, sticky table headers, clear primary action per page.
- Onboarding / first-run: progressive disclosure; reuse `FirstRunTour`, `GaOnboardingChecklist` patterns.
- Empty states: helpful headline + one CTA (`HrisEmptyState`), not decorative illustrations alone.
- Loading: skeleton matching layout; avoid full-page spinners for known chrome.
- Modals for short confirmations; drawers/pages for multi-step HR workflows (mutations, payroll input).
- Always preserve tenant isolation affordances already in APIs — UI must not imply cross-tenant data.

## Anti-patterns specific to this codebase

- Do not invent a parallel Tailwind color palette when `--hf-*` exists.
- Do not restyle `/hq` with Humanify violet (SIMESI is a separate product).
- Do not add marketing hero clutter inside authenticated ops dashboards.
- Do not use rainbow status badges; map statuses to `--hf-success` / `--hf-warning` / `--hf-danger` / `--hf-info`.
