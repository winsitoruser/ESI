#!/usr/bin/env bash
# SSO QC helper — print SP metadata & login URLs for a tenant slug.
# Usage: TENANT=pt-naincode BASE=https://humanify.id bash scripts/setup-sso-qc-tenant.sh
set -euo pipefail
TENANT="${TENANT:-pt-naincode}"
BASE="${BASE:-https://humanify.id}"

echo "=== Humanify SSO QC — tenant: $TENANT ==="
echo ""
echo "1. SP Metadata (register in IdP):"
echo "   ${BASE}/api/humanify/sso/metadata?tenant=${TENANT}"
echo ""
echo "2. Login initiation:"
echo "   ${BASE}/api/humanify/sso/login?tenant=${TENANT}"
echo ""
echo "3. ACS URL (Assertion Consumer):"
echo "   ${BASE}/api/humanify/sso/acs"
echo ""
echo "4. Configure IdP in Humanify admin:"
echo "   ${BASE}/humanify/sso  (tenant admin, Enterprise plan)"
echo "   Required: entryPoint, idpEntityId, X.509 cert, optional emailDomain"
echo ""
echo "5. Verify metadata XML:"
curl -sS "${BASE}/api/humanify/sso/metadata?tenant=${TENANT}" | head -c 600; echo
echo ""
echo "6. After IdP config, test login → should redirect to /humanify with session"
