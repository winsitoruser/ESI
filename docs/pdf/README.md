# Humanify PDF exports

Generated from Markdown sources in `docs/` on 30 Jul 2026.

| File | Source |
|---|---|
| `humanify-documentation-pack.pdf` | Combined pack (all parts) |
| `humanify-documentation-index.pdf` | Index |
| `humanify-business-plan.pdf` | Business plan + executive summary |
| `humanify-prd-v2.pdf` | PRD / business requirements |
| `humanify-technical-architecture.pdf` | Technical architecture |
| `humanify-quality-assurance.pdf` | QA / release strategy |
| `humanify-investment-memo.pdf` | Investment memo |
| `humanify-module-inventory.pdf` | Inventaris halaman, modul, fungsi, komponen (8 Sep 2026) |

Excel: [`../humanify-module-inventory.xlsx`](../humanify-module-inventory.xlsx)

Regenerate inventory exports:

```bash
npm run docs:humanify-inventory
```

Regenerate:

```bash
npx md-to-pdf docs/humanify-business-plan.md --stylesheet /path/to/css
```
