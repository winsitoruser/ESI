#!/usr/bin/env bash
# Setup Hermes Agent for ESI ERP (PT Ekosistem Satwa Indonesia) + SumoPod AI
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
SKILLS_DIR="$PROJECT_ROOT/hermes/skills"
CONFIG="$HERMES_HOME/config.yaml"

echo "🦅 Setup Hermes Agent — ESI ERP"
echo "   Project: $PROJECT_ROOT"
echo "   Hermes:  $HERMES_HOME"
echo ""

if ! command -v hermes &>/dev/null; then
  echo "❌ Hermes belum terinstall."
  echo "   Install: curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
  exit 1
fi

ENV_FILE="$HERMES_HOME/.env"
if [[ -f "$ENV_FILE" ]] && grep -q "SUMOPOD_AI_API_KEY" "$ENV_FILE" 2>/dev/null; then
  echo "✅ SumoPod API key ditemukan di ~/.hermes/.env"
else
  echo "⚠️  SUMOPOD_AI_API_KEY belum ada di ~/.hermes/.env"
  echo "   Salin dari hermes/env.example dan isi API key dari https://ai.sumopod.com"
fi

python3 << PYEOF
import os, sys

config_path = os.path.expanduser("$CONFIG")
skills_dir = "$SKILLS_DIR"
project_root = "$PROJECT_ROOT"

try:
    import yaml
except ImportError:
    print("⚠️  PyYAML tidak terinstall — install: pip3 install pyyaml")
    sys.exit(0)

if not os.path.exists(config_path):
    print(f"❌ Config tidak ditemukan: {config_path}")
    print("   Jalankan: hermes setup")
    sys.exit(1)

with open(config_path) as f:
    cfg = yaml.safe_load(f) or {}

cfg.setdefault("model", {})
cfg["model"]["provider"] = "custom:sumopod"
cfg["model"]["base_url"] = "https://ai.sumopod.com/v1"
if not cfg["model"].get("default"):
    cfg["model"]["default"] = "deepseek-v4-flash"

cfg.setdefault("terminal", {})
cfg["terminal"]["cwd"] = project_root

cfg.setdefault("skills", {})
dirs = cfg["skills"].get("external_dirs") or []
if skills_dir not in dirs:
    dirs.append(skills_dir)
cfg["skills"]["external_dirs"] = dirs

cfg.setdefault("agent", {})
existing = cfg["agent"].get("custom_instructions") or ""
marker = "ESI ERP"
if marker not in existing:
    addition = (
        "Kamu mengembangkan ESI ERP untuk PT Ekosistem Satwa Indonesia. "
        "Baca AGENTS.md. Gunakan /esi-develop, /esi-hq, /esi-cto. "
        "Tidak ada PoS, cabang, DMS, manufaktur. Port dev: 3010."
    )
    cfg["agent"]["custom_instructions"] = (existing + "\n" + addition).strip() if existing else addition

with open(config_path, "w") as f:
    yaml.dump(cfg, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

print("✅ ~/.hermes/config.yaml diperbarui untuk ESI ERP")
print(f"   provider: custom:sumopod")
print(f"   model: {cfg['model'].get('default')}")
print(f"   terminal.cwd: {project_root}")
PYEOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Setup ESI selesai!"
echo ""
echo "Langkah berikutnya:"
echo "  npm run hermes:team     # buat profil tim + kanban"
echo ""
echo "Mulai develop:"
echo "  cd \"$PROJECT_ROOT\""
echo "  hermes"
echo "  /esi-develop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
