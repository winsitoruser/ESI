# Humanify QC Sign-off Template (Wave-82 QC-82-1)

**Release SHA:** ________________  
**Build ID (prod):** ________________  
**Date (UTC):** ________________  
**Signer (QC):** ________________  
**Artifact folder:** `artifacts/release-<sha>-…/`

## Gate checklist

| Gate | Evidence path | Pass? |
|---|---|---|
| A — health / availability | `health.code` / `health.json` | ☐ |
| B — security / isolation | `B-hq-auth-lint.log` · `B-wave81.log` · scorecard (if run) | ☐ |
| C — business integrity | `C-payroll-golden.log` · `C-claim-proof.log` · wave79/80 | ☐ |
| D — journeys / UI | `D-sidebar-persona.log` · `D-ga-journey.log` | ☐ |
| E — ops / rollback | `E-ops-checklist.md` completed | ☐ |

## Satisfaction (Gate D optional — Wave-83)

- [ ] NPS/CSAT sample ≥ N **or** waiver: ________________

## Do not sign if

- Midtrans missing-signature harden still open **and** claiming “security complete” without disclosure  
- Soft RLS sold as FORCE prod RLS  
- Secret-skip-as-pass counted as green  

## Sign-off

QC: ________________  Date: ________  
CTO acknowledge: ________________  Date: ________  

Store signed copy under `docs/releases/` or ops drive; link from HANDOFF.
