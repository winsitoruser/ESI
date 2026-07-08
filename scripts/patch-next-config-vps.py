#!/usr/bin/env python3
"""Patch next.config.mjs for VPS production build (low memory, no standalone)."""
import re
import sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else 'next.config.mjs')
text = path.read_text()

if 'cpus: 1' not in text:
    text = text.replace(
        'const nextConfig = {',
        'const nextConfig = {\n  experimental: { workerThreads: false, cpus: 1 },',
    )

text = re.sub(
    r"\.\.\.\(process\.env\.NODE_ENV === ['\"]production['\"] \? \{ output: ['\"]standalone['\"] \} : \{\}\),",
    '// standalone disabled for VPS (use next start)',
    text,
)

path.write_text(text)
print(f'Patched {path}')
