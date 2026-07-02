#!/usr/bin/env bash
# Setup Hermes team profiles + kanban board for Bedagang PoS (soul.md V3)
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
BOARD_SLUG="bedagang-nainerp"

echo "🏢 Setup Hermes Team — Bedagang PoS (soul.md V3)"
echo "   Project: $PROJECT_ROOT"
echo "   Board:   $BOARD_SLUG"
echo ""

if ! command -v hermes &>/dev/null; then
  echo "❌ Hermes belum terinstall."
  exit 1
fi

# Run base project setup first
bash "$PROJECT_ROOT/scripts/setup-hermes-bedagang.sh"

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

  # Update model + cwd in profile config
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
# CTO gets kanban toolset
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

echo "👥 Creating team profiles..."

# CTO
create_profile "bedagang-cto" "wins" \
  "CTO orchestrator Bedagang PoS. Analisis arsitektur, decompose tiket kanban, assign tim, gatekeeper merge." \
  "deepseek-v4-flash"

# Product
create_profile "bedagang-po-1" "wins" "Product Owner #1 — BRD, prioritas fitur F&B/Retail/Finance." "deepseek-v4-flash"
create_profile "bedagang-po-2" "wins" "Product Owner #2 — BRD, prioritas fitur AI bisnis." "deepseek-v4-flash"
create_profile "bedagang-pm" "wins" "Product Manager — User Stories, Sprint Planning, backlog." "deepseek-v4-flash"

# Architecture & DevOps
create_profile "bedagang-architect-1" "architect" "System Architect #1 — DB schema, API contracts, EDA design." "seed-2-0-pro"
create_profile "bedagang-architect-2" "architect" "System Architect #2 — modularitas, technical design on tickets." "seed-2-0-pro"
create_profile "bedagang-devops-1" "devops" "DevOps #1 — CI/CD, monitoring, deployment pipelines." "deepseek-v4-flash"
create_profile "bedagang-devops-2" "devops" "DevOps #2 — zero-downtime deploy, model ops." "deepseek-v4-flash"

# Backend ×5
for i in 1 2 3 4 5; do
  create_profile "bedagang-backend-$i" "backend" \
    "Backend Developer #$i — API routes, Sequelize/Prisma, PostgreSQL, payment gateway." \
    "seed-2-0-code"
done

# Frontend ×5
for i in 1 2 3 4 5; do
  create_profile "bedagang-frontend-$i" "frontend" \
    "Frontend Developer #$i — HQ dashboard, React/Next.js, Tailwind UI." \
    "seed-2-0-code"
done

# Mobile ×2
for i in 1 2; do
  create_profile "bedagang-mobile-$i" "frontend" \
    "Mobile Developer #$i — Mobile POS, offline-first, PWA sync." \
    "seed-2-0-code"
done

# QA ×3
for i in 1 2 3; do
  create_profile "bedagang-qa-$i" "backend" \
    "QA Engineer #$i — Jest/Cypress E2E, load testing, AI validation." \
    "deepseek-v4-flash"
done

echo ""
echo "📋 Setting up kanban board..."

if hermes kanban boards list 2>/dev/null | grep -q "$BOARD_SLUG"; then
  echo "  ✓ Board exists: $BOARD_SLUG"
else
  hermes kanban boards create "$BOARD_SLUG" \
    --name "Bedagang PoS — New-Backend-Nainerp" \
    --description "Ticket-driven development per soul.md V3" \
    --icon "🏪" \
    --color "#10b981" \
    --default-workdir "$PROJECT_ROOT" \
    --switch
  echo "  ✅ Created board: $BOARD_SLUG"
fi

hermes kanban boards switch "$BOARD_SLUG" 2>/dev/null || true

# Set orchestrator in global config
python3 << PYEOF
import yaml, os
path = os.path.expanduser("$HERMES_HOME/config.yaml")
with open(path) as f:
    cfg = yaml.safe_load(f) or {}
cfg.setdefault("kanban", {})
cfg["kanban"]["orchestrator_profile"] = "bedagang-cto"
cfg["kanban"]["dispatch_in_gateway"] = True
with open(path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
print("  ✅ Orchestrator: bedagang-cto")
PYEOF

# Create initial CTO tasks if board is empty
TASK_COUNT=$(hermes kanban --board "$BOARD_SLUG" list 2>/dev/null | grep -cE '^t_' || true)
TASK_COUNT=${TASK_COUNT:-0}
if [[ "$TASK_COUNT" -eq 0 ]]; then
  echo ""
  echo "📝 Creating initial CTO analysis tasks..."
  hermes kanban --board "$BOARD_SLUG" create \
    "[CTO] Audit infrastruktur backend & database PostgreSQL" \
    --assignee bedagang-cto \
    --workspace "dir:$PROJECT_ROOT"
  hermes kanban --board "$BOARD_SLUG" create \
    "[Architect] Review schema Sequelize/Prisma & API contracts pages/api/hq/" \
    --assignee bedagang-architect-1 \
    --workspace "dir:$PROJECT_ROOT"
  hermes kanban --board "$BOARD_SLUG" create \
    "[DevOps] Review CI/CD pipeline & deployment strategy" \
    --assignee bedagang-devops-1 \
    --workspace "dir:$PROJECT_ROOT"
  hermes kanban --board "$BOARD_SLUG" create \
    "[QA] Baseline test coverage audit (Jest/Cypress)" \
    --assignee bedagang-qa-1 \
    --workspace "dir:$PROJECT_ROOT"
  echo "  ✅ 4 initial tasks created"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Hermes Team Setup Complete (soul.md V3)"
echo ""
echo "Tim: 22 agent profiles"
echo "  CTO: bedagang-cto (orchestrator)"
echo "  PO×2, PM×1, Architect×2, DevOps×2"
echo "  Backend×5, Frontend×5, Mobile×2, QA×3"
echo ""
echo "Kanban board: $BOARD_SLUG"
echo ""
echo "Mulai orkestrasi:"
echo "  hermes --profile bedagang-cto"
echo "  /bedagang-cto"
echo ""
echo "Lihat board:"
echo "  hermes kanban --board $BOARD_SLUG list"
echo "  hermes kanban --board $BOARD_SLUG watch"
echo ""
echo "Dashboard: http://127.0.0.1:9120"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
