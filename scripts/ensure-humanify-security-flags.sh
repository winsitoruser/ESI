#!/usr/bin/env bash
# Upsert Humanify security opt-in flags into ENV_FILE (default /root/humanify/.env)
# Usage: ENV_FILE=/root/humanify/.env bash scripts/ensure-humanify-security-flags.sh
set -euo pipefail
ENV_FILE="${ENV_FILE:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[XX] ENV_FILE missing: $ENV_FILE"
  exit 1
fi

upsert() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # portable in-place without backup noise
    sed -i.bak -E "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    rm -f "${ENV_FILE}.bak"
    echo "  ~ $key"
  else
    printf '\n%s=%s\n' "$key" "$val" >> "$ENV_FILE"
    echo "  + $key"
  fi
}

echo "[i] Security flags → $ENV_FILE"

upsert HUMANIFY_STEP_UP_REQUIRED true
upsert HUMANIFY_SALARY_MAKER_CHECKER true
upsert HUMANIFY_ATTENDANCE_NONCE true
upsert HUMANIFY_CLAIM_DUP_BLOCK true
upsert HUMANIFY_PLATFORM_MFA_REQUIRED true
upsert HUMANIFY_LOGIN_NOTIFY true

# Backup GPG — generate once if missing
if ! grep -qE '^BACKUP_GPG_PASSPHRASE=.' "$ENV_FILE"; then
  PASS="$(openssl rand -base64 32 | tr -d '\n')"
  upsert BACKUP_GPG_PASSPHRASE "$PASS"
  SEAL="/root/humanify-backup-gpg-passphrase.txt"
  umask 077
  printf 'BACKUP_GPG_PASSPHRASE (store offline; rotate annually)\nGenerated: %s\n%s\n' "$(date -u +%Y-%m-%dT%H:%MZ)" "$PASS" > "$SEAL"
  chmod 600 "$SEAL"
  echo "  ! Backup GPG passphrase written to $SEAL (root-only) — copy to password manager"
else
  echo "  = BACKUP_GPG_PASSPHRASE already set"
fi

chmod 600 "$ENV_FILE"
echo "[OK] Security flags ensured"
