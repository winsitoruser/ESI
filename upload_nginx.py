#!/usr/bin/env python3
"""Upload hardened nginx config to server via base64, then replace, test, reload."""
import base64
import subprocess
import sys

HOST = "root@202.10.36.37"
KEY = "~/.ssh/id_ed25519"
LOCAL_CONF = "/tmp/bedagang-nginx-hardened.conf"

def ssh(cmd):
    full = f"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i {KEY} {HOST} {cmd!r}"
    return subprocess.run(full, shell=True, capture_output=True, text=True)

def main():
    # 1. Backup current config
    print("=== Step 1: Backup current config ===")
    r = ssh("sudo cp /etc/nginx/conf.d/bedagang.conf /etc/nginx/conf.d/bedagang.conf.bak")
    print(r.stdout or r.stderr)
    if r.returncode != 0:
        print("ERROR backup:", r.stderr)
        sys.exit(1)

    # 2. Upload via base64
    print("=== Step 2: Upload hardened config ===")
    with open(LOCAL_CONF, "rb") as f:
        b64data = base64.b64encode(f.read()).decode()

    r = ssh(f'echo "{b64data}" | base64 -d > /tmp/bedagang.conf.new')
    print(r.stdout or r.stderr)
    if r.returncode != 0:
        print("ERROR upload:", r.stderr)
        sys.exit(1)
    print("Uploaded to /tmp/bedagang.conf.new")

    # 3. Move to final location
    print("=== Step 3: Move to /etc/nginx/conf.d/ ===")
    r = ssh("sudo cp /tmp/bedagang.conf.new /etc/nginx/conf.d/bedagang.conf")
    print(r.stdout or r.stderr)
    if r.returncode != 0:
        print("ERROR move:", r.stderr)
        sys.exit(1)
    print("Config replaced")

    # 4. Test nginx config
    print("=== Step 4: Test nginx config ===")
    r = ssh("sudo nginx -t")
    print(r.stdout, r.stderr)
    if r.returncode != 0:
        print("ERROR nginx test failed!")
        print("Restoring backup...")
        ssh("sudo cp /etc/nginx/conf.d/bedagang.conf.bak /etc/nginx/conf.d/bedagang.conf")
        sys.exit(1)
    print("Nginx config test PASSED")

    # 5. Reload nginx
    print("=== Step 5: Reload nginx ===")
    r = ssh("sudo systemctl reload nginx || sudo nginx -s reload")
    print(r.stdout or r.stderr)
    if r.returncode != 0:
        print("ERROR reload:", r.stderr)
        sys.exit(1)
    print("Nginx reloaded successfully")

    # 6. Verify
    print("=== Step 6: Verify ===")
    r = ssh("sudo nginx -t && echo '---' && curl -sI http://localhost:80 | head -20")
    print(r.stdout or r.stderr)

    print("\n=== ALL DONE ===")

if __name__ == "__main__":
    main()
