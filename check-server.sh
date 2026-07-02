#!/bin/bash

# ============================================================================
# Quick Server Check Script
# ============================================================================
# Server: 103.253.212.64
# User: root
# ============================================================================

SERVER_IP="103.253.212.64"
SERVER_USER="root"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo "Checking Server: ${SERVER_IP}"
echo "============================================"
echo ""

# Test ping
echo "→ Testing server connectivity..."
if ping -c 2 ${SERVER_IP} > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is reachable${NC}"
else
    echo -e "${RED}✗ Server is NOT reachable${NC}"
    exit 1
fi

echo ""
echo "→ Attempting SSH connection..."
echo "   (You will be prompted for password: winner123)"
echo ""

# Try to connect and run diagnostics
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    echo "============================================"
    echo "SERVER DIAGNOSTICS"
    echo "============================================"
    
    echo ""
    echo "1. System Information:"
    echo "   Hostname: $(hostname)"
    echo "   Uptime: $(uptime -p)"
    echo "   OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    
    echo ""
    echo "2. Checking Node.js:"
    if command -v node &> /dev/null; then
        echo "   ✓ Node.js installed: $(node --version)"
        echo "   ✓ NPM installed: $(npm --version)"
    else
        echo "   ✗ Node.js NOT installed"
        echo "   → Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    echo ""
    echo "3. Checking PM2:"
    if command -v pm2 &> /dev/null; then
        echo "   ✓ PM2 installed: $(pm2 --version)"
    else
        echo "   ✗ PM2 NOT installed"
        echo "   → Installing PM2..."
        sudo npm install -g pm2
    fi
    
    echo ""
    echo "4. Checking Application Directory:"
    if [ -d "/var/www/bedagang" ]; then
        echo "   ✓ Directory exists: /var/www/bedagang"
        echo "   Files: $(ls -la /var/www/bedagang 2>/dev/null | wc -l) items"
    else
        echo "   ✗ Directory NOT found: /var/www/bedagang"
        echo "   → Creating directory..."
        sudo mkdir -p /var/www/bedagang
        sudo chown -R $USER:$USER /var/www/bedagang
        echo "   ✓ Directory created"
    fi
    
    echo ""
    echo "5. Checking PM2 Processes:"
    pm2 list 2>/dev/null || echo "   No PM2 processes running"
    
    echo ""
    echo "6. Checking Port 3000:"
    if netstat -tulpn 2>/dev/null | grep ":3000" > /dev/null || ss -tulpn 2>/dev/null | grep ":3000" > /dev/null; then
        echo "   ✓ Port 3000 is in use"
        netstat -tulpn 2>/dev/null | grep ":3000" || ss -tulpn 2>/dev/null | grep ":3000"
    else
        echo "   ✗ Port 3000 is NOT in use"
        echo "   → Application is not running"
    fi
    
    echo ""
    echo "7. Checking Firewall:"
    if command -v ufw &> /dev/null; then
        sudo ufw status | head -20
    else
        echo "   UFW not installed"
    fi
    
    echo ""
    echo "8. Checking PostgreSQL:"
    if command -v psql &> /dev/null; then
        echo "   ✓ PostgreSQL installed: $(psql --version)"
        sudo systemctl status postgresql --no-pager | head -5
    else
        echo "   ✗ PostgreSQL NOT installed"
    fi
    
    echo ""
    echo "============================================"
    echo "RECOMMENDATIONS:"
    echo "============================================"
    
    if [ ! -d "/var/www/bedagang/.git" ]; then
        echo "→ Application not deployed yet"
        echo "   Run: cd /var/www/bedagang && git clone https://github.com/winsitoruser/bedagang.git ."
    fi
    
    if ! pm2 list 2>/dev/null | grep -q "bedagang"; then
        echo "→ Application not running in PM2"
        echo "   Run: cd /var/www/bedagang && pm2 start npm --name bedagang -- start"
    fi
    
    if ! netstat -tulpn 2>/dev/null | grep -q ":3000" && ! ss -tulpn 2>/dev/null | grep -q ":3000"; then
        echo "→ Port 3000 not listening"
        echo "   Application needs to be started"
    fi
    
    echo ""
    echo "============================================"
ENDSSH

echo ""
echo "============================================"
echo "Check complete!"
echo "============================================"
