#!/usr/bin/env bash
# Setup Hermes team profiles + kanban for ESI ERP
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
BOARD_SLUG="esi-erp"

echo "🦅 Setup Hermes Team — ESI ERP"
echo "   Project: $PROJECT_ROOT"
echo "   Board:   $BOARD_SLUG"
echo ""

if ! command -v hermes &>/dev/null; then
  echo "❌ Hermes belum terinstall."
  exit 1
fi

bash "$PROJECT_ROOT/scripts/setup-hermes-esi.sh"

create_profile() {
  local name="$1"
  local clone_from="$2"
  local description="$3"
  local model="$4"

  if hermes profile show "$name" &>/dev/null; then
    echo "  ✓ Profile exists: $name"
  else
    hermes profile create "$name" --clone-from "$clone_from" --description "$description" --no-alias 2>/dev/null || \
    hermes profile create "$name" --clone --description "$description" --no-alias
    echo "  ✅ Created: $name"
  fi

  local cfg="$HERMES_HOME/profiles/$name/config.yaml"
  if [[ -f "$cfg" ]]; then
    python3 - "$cfg" "$model" "$PROJECT_ROOT" <<'PY'
import sys, yaml
path, model, cwd = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    cfg = yaml.safe_load(f) or {}
cfg.setdefault("model", {})
cfg["model"]["provider"] = "custom:sumopod"
cfg["model"]["base_url"] = "https://ai.sumopod.com/v1"
cfg["model"]["default"] = model
term = cfg.setdefault("terminal", {})
term["cwd"] = cwd
term["backend"] = "local"
if "cto" in path:
    ts = cfg.get("toolsets") or []
    if "kanban" not in ts:
        ts.append("kanban")
    cfg["toolsets"] = ts
with open(path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
PY
  fi

  hermes profile describe "$name" --text "$description" 2>/dev/null || true
}

echo "👥 Creating ESI team profiles..."

create_profile "esi-cto" "wins" \
  "CTO ESI ERP. Orkestrasi tim konservasi, kanban esi-erp, gatekeeper merge." \
  "deepseek-v4-flash"

create_profile "esi-pm" "wins" \
  "PM ESI — backlog modul konservasi, proyek, aset, grant." \
  "deepseek-v4-flash"

create_profile "esi-architect-1" "architect" \
  "Architect ESI — schema, API, integrasi single-org." \
  "seed-2-0-pro"

for i in 1 2; do
  create_profile "esi-backend-$i" "backend" \
    "Backend ESI #$i — API routes, Sequelize, stub branches." \
    "seed-2-0-code"
done

for i in 1 2; do
  create_profile "esi-frontend-$i" "frontend" \
    "Frontend ESI #$i — HQ UI, esi-sidebar, HQLayout." \
    "seed-2-0-code"
done

create_profile "esi-qa-1" "backend" \
  "QA ESI — npm run build, smoke routes, integration-check." \
  "deepseek-v4-flash"

echo ""
echo "📋 Setting up kanban board..."

if hermes kanban boards list 2>/dev/null | grep -q "$BOARD_SLUG"; then
  echo "  ✓ Board exists: $BOARD_SLUG"
else
  hermes kanban boards create "$BOARD_SLUG" \
    --name "ESI ERP — PT Ekosistem Satwa Indonesia" \
    --description "Pengembangan ERP konservasi dengan Hermes AI" \
    --icon "🦅" \
    --color "#059669" \
    --default-workdir "$PROJECT_ROOT" \
    --switch
  echo "  ✅ Created board: $BOARD_SLUG"
fi

hermes kanban boards switch "$BOARD_SLUG" 2>/dev/null || true

python3 << PYEOF
import yaml, os
path = os.path.expanduser("$HERMES_HOME/config.yaml")
with open(path) as f:
    cfg = yaml.safe_load(f) or {}
cfg.setdefault("kanban", {})
cfg["kanban"]["orchestrator_profile"] = "esi-cto"
cfg["kanban"]["dispatch_in_gateway"] = True
with open(path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
print("  ✅ Orchestrator: esi-cto")
PYEOF

TASK_COUNT=$(hermes kanban --board "$BOARD_SLUG" list 2>/dev/null | grep -cE '^t_' || true)
TASK_COUNT=${TASK_COUNT:-0}
if [[ "$TASK_COUNT" -eq 0 ]]; then
  echo ""
  echo "📝 Creating initial ESI tasks..."
  hermes kanban --board "$BOARD_SLUG" create \
    "[CTO] Verifikasi integrasi modul ESI (sidebar, API stub, build)" \
    --assignee esi-cto \
    --workspace "dir:$PROJECT_ROOT"
  hermes kanban --board "$BOARD_SLUG" create \
    "[Backend] Manajemen Proyek Konservasi — API + halaman" \
    --assignee esi-backend-1 \
    --workspace "dir:$PROJECT_ROOT"
  hermes kanban --board "$BOARD_SLUG" create \
    "[Frontend] Manajemen Aset lapangan — UI HQ" \
    --assignee esi-frontend-1 \
    --workspace "dir:$PROJECT_ROOT"
  hermes kanban --board "$BOARD_SLUG" create \
    "[QA] Smoke test localhost:3010 + integration-check" \
    --assignee esi-qa-1 \
    --workspace "dir:$PROJECT_ROOT"
  echo "  ✅ 4 initial tasks created"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Hermes Team ESI Ready"
echo ""
echo "Tim: esi-cto, esi-pm, esi-architect-1"
echo "     esi-backend-1/2, esi-frontend-1/2, esi-qa-1"
echo ""
echo "Mulai:"
echo "  hermes --profile esi-cto"
echo "  /esi-cto"
echo ""
echo "  hermes kanban --board $BOARD_SLUG watch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
