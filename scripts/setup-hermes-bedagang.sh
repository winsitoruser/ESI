#!/usr/bin/env bash
# Setup Hermes Agent for Bedagang ERP development with SumoPod AI
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
SKILLS_DIR="$PROJECT_ROOT/hermes/skills"
CONFIG="$HERMES_HOME/config.yaml"

echo "🚀 Setup Hermes Agent — Bedagang ERP"
echo "   Project: $PROJECT_ROOT"
echo "   Hermes:  $HERMES_HOME"
echo ""

if ! command -v hermes &>/dev/null; then
  echo "❌ Hermes belum terinstall."
  echo "   Install: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi

# Ensure SumoPod env vars documented
ENV_FILE="$HERMES_HOME/.env"
if [[ -f "$ENV_FILE" ]] && grep -q "SUMOPOD_AI_API_KEY" "$ENV_FILE" 2>/dev/null; then
  echo "✅ SumoPod API key ditemukan di ~/.hermes/.env"
else
  echo "⚠️  SUMOPOD_AI_API_KEY belum ada di ~/.hermes/.env"
  echo "   Salin dari hermes/env.example dan isi API key dari https://ai.sumopod.com"
fi

# Update config.yaml with Python (yaml safe)
python3 << PYEOF
import os, sys

config_path = os.path.expanduser("$CONFIG")
skills_dir = "$SKILLS_DIR"
project_root = "$PROJECT_ROOT"

try:
    import yaml
except ImportError:
    print("⚠️  PyYAML tidak terinstall — install manual:")
    print(f"   skills.external_dirs: [{skills_dir}]")
    print(f"   terminal.cwd: {project_root}")
    print(f"   model.provider: custom:sumopod")
    print(f"   model.base_url: https://ai.sumopod.com/v1")
    sys.exit(0)

if not os.path.exists(config_path):
    print(f"❌ Config tidak ditemukan: {config_path}")
    print("   Jalankan: hermes setup")
    sys.exit(1)

with open(config_path) as f:
    cfg = yaml.safe_load(f) or {}

# Model — SumoPod
cfg.setdefault("model", {})
cfg["model"]["provider"] = "custom:sumopod"
cfg["model"]["base_url"] = "https://ai.sumopod.com/v1"
if not cfg["model"].get("default"):
    cfg["model"]["default"] = "deepseek-v4-flash"

# Terminal cwd
cfg.setdefault("terminal", {})
cfg["terminal"]["cwd"] = project_root

# External skills
cfg.setdefault("skills", {})
dirs = cfg["skills"].get("external_dirs") or []
if skills_dir not in dirs:
    dirs.append(skills_dir)
cfg["skills"]["external_dirs"] = dirs

# Custom instructions
cfg.setdefault("agent", {})
existing = cfg["agent"].get("custom_instructions") or ""
marker = "Bedagang ERP"
if marker not in existing:
    addition = (
        "Kamu mengembangkan Bedagang ERP. Baca AGENTS.md di project root. "
        "Gunakan /bedagang-develop dan /bedagang-hq. Minimize scope, ikuti konvensi existing."
    )
    cfg["agent"]["custom_instructions"] = (existing + "\n" + addition).strip() if existing else addition

with open(config_path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

print("✅ ~/.hermes/config.yaml diperbarui")
print(f"   provider: custom:sumopod")
print(f"   model: {cfg['model'].get('default')}")
print(f"   terminal.cwd: {project_root}")
print(f"   skills.external_dirs: +{skills_dir}")
PYEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup selesai!"
echo ""
echo "Mulai develop:"
echo "  cd \"$PROJECT_ROOT\""
echo "  hermes"
echo ""
echo "Di Hermes CLI:"
echo "  /bedagang-develop"
echo "  /model sumopod:deepseek-v4-flash"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
