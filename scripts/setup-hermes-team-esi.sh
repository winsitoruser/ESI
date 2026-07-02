#!/usr/bin/env bash
# Setup Hermes Viking Division team profiles + kanban for ESI ERP / Sobatpaws
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
BOARD_SLUG="esi-erp"

echo "⚔️  Setup Hermes Viking Division — ERP Sobatpaws"
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
  local enable_kanban="${5:-false}"

  if hermes profile show "$name" &>/dev/null; then
    echo "  ✓ Profile exists: $name"
  else
    hermes profile create "$name" --clone-from "$clone_from" --description "$description" --no-alias 2>/dev/null || \
    hermes profile create "$name" --clone --description "$description" --no-alias
    echo "  ✅ Created: $name"
  fi

  local cfg="$HERMES_HOME/profiles/$name/config.yaml"
  if [[ -f "$cfg" ]]; then
    python3 - "$cfg" "$model" "$PROJECT_ROOT" "$enable_kanban" <<'PY'
import sys, yaml
path, model, cwd, enable_kanban = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == "true"
skills_dir = f"{cwd}/hermes/skills"
with open(path) as f:
    cfg = yaml.safe_load(f) or {}
cfg.setdefault("model", {})
cfg["model"]["provider"] = "custom:sumopod"
cfg["model"]["base_url"] = "https://ai.sumopod.com/v1"
cfg["model"]["default"] = model
term = cfg.setdefault("terminal", {})
term["cwd"] = cwd
term["backend"] = "local"
skills = cfg.setdefault("skills", {})
dirs = skills.get("external_dirs") or []
if skills_dir not in dirs:
    dirs.append(skills_dir)
skills["external_dirs"] = dirs
if enable_kanban:
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

echo "👑 HIGH COMMAND"
create_profile "esi-king" "wins" \
  "KING — CTO Viking Division. Arah teknologi ERP Sobatpaws, arsitektur tinggi, gatekeeper merge." \
  "deepseek-v4-flash" "true"
create_profile "esi-queen" "wins" \
  "QUEEN — VP Engineering. Code governance, routing task ke pasukan dev & QA." \
  "deepseek-v4-flash" "false"

echo ""
echo "🛡️  WARRIOR FLOCKS — Backend (Engine Room)"
for i in 1 2; do
  create_profile "esi-backend-sr-$i" "backend" \
    "Backend Senior #$i — arsitektur DB/API, keamanan finance, integrasi." \
    "seed-2-0-pro"
done
for i in 1 2; do
  create_profile "esi-backend-mid-$i" "backend" \
    "Backend Mid #$i — fitur core ERP, optimasi query, sinkronisasi data." \
    "seed-2-0-code"
done
create_profile "esi-backend-jr-1" "backend" \
  "Backend Junior — bug fix, unit test, API sederhana." \
  "deepseek-v4-flash"

echo ""
echo "🛡️  WARRIOR FLOCKS — Frontend (Shield Wall)"
for i in 1 2; do
  create_profile "esi-frontend-sr-$i" "frontend" \
    "Frontend Senior #$i — state management, arsitektur UI, performa web." \
    "seed-2-0-pro"
done
for i in 1 2; do
  create_profile "esi-frontend-mid-$i" "frontend" \
    "Frontend Mid #$i — UI/UX ke komponen, integrasi API." \
    "seed-2-0-code"
done
create_profile "esi-frontend-jr-1" "frontend" \
  "Frontend Junior — slicing UI, minor bug, kompatibilitas browser." \
  "deepseek-v4-flash"

echo ""
echo "🛡️  WARRIOR FLOCKS — Mobile (Scouts)"
create_profile "esi-mobile-sr" "frontend" \
  "Mobile Senior — arsitektur Android/iOS, offline-first." \
  "seed-2-0-pro"
create_profile "esi-mobile-mid" "frontend" \
  "Mobile Mid — fitur mobile, GPS/kamera operasional." \
  "seed-2-0-code"
create_profile "esi-mobile-jr" "frontend" \
  "Mobile Junior — maintenance, update library, crash log." \
  "deepseek-v4-flash"

echo ""
echo "🛡️  WARRIOR FLOCKS — QA (Valkyries)"
create_profile "esi-qa-lead" "backend" \
  "QA Lead — strategi testing manual & automation, beban kerja ERP." \
  "deepseek-v4-flash"
create_profile "esi-qa-eng" "backend" \
  "QA Engineer — uji fungsional per modul ERP." \
  "deepseek-v4-flash"
create_profile "esi-qa-auto" "backend" \
  "Automation Tester — skrip regression test sebelum deploy." \
  "deepseek-v4-flash"

echo ""
echo "🧭 NAVIGATORS"
create_profile "esi-product" "wins" \
  "The Seers — VP Product. Roadmap, requirement, alur digital Sobatpaws." \
  "deepseek-v4-flash"
create_profile "esi-oracle" "architect" \
  "The Oracle — Head of AI & Data. Prediksi bisnis, data pipeline, dashboard." \
  "seed-2-0-pro"
create_profile "esi-fort" "devops" \
  "The Fort Builders — DevOps/Security. CI/CD, uptime 24/7, keamanan data." \
  "deepseek-v4-flash"
create_profile "esi-skalds" "wins" \
  "The Skalds — PMO. Timeline, budget, ritual Agile." \
  "deepseek-v4-flash"
create_profile "esi-architect-1" "architect" \
  "Royal Advisor — schema, API contracts, integrasi single-org." \
  "seed-2-0-pro"

echo ""
echo "🔄 LEGACY PROFILES (backward compat)"
create_profile "esi-cto" "wins" \
  "LEGACY alias KING — CTO orchestrator, kanban esi-erp." \
  "deepseek-v4-flash" "true"
create_profile "esi-pm" "wins" \
  "LEGACY alias Skalds — backlog & prioritas modul." \
  "deepseek-v4-flash"
for i in 1 2; do
  create_profile "esi-backend-$i" "backend" \
    "LEGACY Backend #$i — API routes, Sequelize, PostgreSQL." \
    "seed-2-0-code"
done
for i in 1 2; do
  create_profile "esi-frontend-$i" "frontend" \
    "LEGACY Frontend #$i — HQ UI, esi-sidebar, HQLayout." \
    "seed-2-0-code"
done
create_profile "esi-qa-1" "backend" \
  "LEGACY QA — build verify, smoke test, integration-check." \
  "deepseek-v4-flash"

echo ""
echo "📋 Setting up kanban board..."

if hermes kanban boards list 2>/dev/null | grep -q "$BOARD_SLUG"; then
  echo "  ✓ Board exists: $BOARD_SLUG"
else
  hermes kanban boards create "$BOARD_SLUG" \
    --name "ERP Sobatpaws — Viking Division" \
    --description "Pengembangan ERP Sobatpaws PT. ESI dengan Hermes AI" \
    --icon "⚔️" \
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
cfg["kanban"]["orchestrator_profile"] = "esi-king"
cfg["kanban"]["dispatch_in_gateway"] = True
with open(path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
print("  ✅ Orchestrator: esi-king (KING / CTO)")
PYEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚔️  Viking Division Hermes Team Ready"
echo ""
echo "HIGH COMMAND:  esi-king, esi-queen"
echo "BACKEND:       esi-backend-sr-1/2, esi-backend-mid-1/2, esi-backend-jr-1"
echo "FRONTEND:      esi-frontend-sr-1/2, esi-frontend-mid-1/2, esi-frontend-jr-1"
echo "MOBILE:        esi-mobile-sr, esi-mobile-mid, esi-mobile-jr"
echo "QA:            esi-qa-lead, esi-qa-eng, esi-qa-auto"
echo "NAVIGATORS:    esi-product, esi-oracle, esi-fort, esi-skalds, esi-architect-1"
echo ""
echo "Mulai sebagai KING:"
echo "  hermes --profile esi-king"
echo "  /esi-cto"
echo ""
echo "  hermes kanban --board $BOARD_SLUG watch"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
