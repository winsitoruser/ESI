# Humanify — Build off the production VPS (PR-048)

**Launch state:** production VPS may still compile (`npm run build`) when `DEPLOY_SKIP_BUILD` is unset.  
**Target:** CI produces the immutable `.next` artifact; VPS only unpacks and restarts.

## Promote path

1. GitHub Actions `build` job on SHA `abc123`.
2. Upload `.next/` + `package-lock.json` as `humanify-build-abc123` (90-day retention).
3. Deploy:

```bash
DEPLOY_SKIP_BUILD=true \
  # unpack artifact to /root/humanify/.next
  bash scripts/deploy-humanify-vps.sh
```

`DEPLOY_SKIP_BUILD=true` is already supported by `scripts/deploy-humanify-vps.sh`.

## Why it matters

On-host Next builds starve the 2–4 GB box (see `docs/humanify-capacity-baseline.md`). Capacity tests must not overlap a remote build.

## Exit

PR-048 is **done for launch** when at least one production promote uses `DEPLOY_SKIP_BUILD=true` with a CI artifact named by SHA. Until then the code path exists; ops should prefer it for the next release.
