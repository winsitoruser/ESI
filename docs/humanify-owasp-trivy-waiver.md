# Humanify — OWASP / Trivy note (Wave-82 QA-82-3)

**Status:** Deferred with QC waiver until next security sprint.  
**Date:** 1 Aug 2026  

## Why deferred

- No fresh green OWASP ZAP / Trivy artifact attached to this Track A close.
- Compensating controls shipped Wave-79–81: webhook fail-closed, claim HMAC harden, ESS GUC, MFA API lock, entitlement fail-closed, Finance SoD.

## Required before claiming “full OWASP green”

1. Run configured OWASP pack against staging; store JSON under `artifacts/release-<sha>/`.
2. Run Trivy filesystem/image scan; store report same folder.
3. QC signs Gate B with those paths.

## Waiver

QC may sign Track A Gate B on Wave-81 smokes + IDOR scorecard history **with this waiver noted**, not as substitute for OWASP forever.
