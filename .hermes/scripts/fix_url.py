#!/usr/bin/env python3
p = '/Users/winnerharry/Bedagang ERP/bedagang---PoS/.hermes/scripts/setup_teknovillage.sh'

with open(p) as f:
    content = f.read()

# Use string concatenation to ensure different strings
# The file has :***@localhost — we need :${DB_PASSWORD}@localhost
target = ':' + ('*' * 3) + '@localhost'  # builds :***@localhost
fix = ':' + '${DB_PASSWORD}' + '@localhost'  # builds :${DB_PASSWORD}@localhost

print(f"target ({len(target)} chars): {repr(target)}")
print(f"fix ({len(fix)} chars): {repr(fix)}")

count = content.count(target)
print(f"Found {count} occurrences of target")

if count > 0:
    content = content.replace(target, fix)
    with open(p, 'w') as f:
        f.write(content)
    print("WRITTEN OK")
else:
    # Debug: show actual chars around the problematic area
    idx = content.find('DATABASE_URL=postgresql')
    if idx >= 0:
        chunk = content[idx:idx+80]
        print(f"Debug chunk: {repr(chunk)}")
        # Check if the three stars are actually special unicode
        for ch in content[idx:idx+80]:
            if ch == '*':
                print(f"  Found literal * at offset {content[idx:idx+80].find('*')}")
