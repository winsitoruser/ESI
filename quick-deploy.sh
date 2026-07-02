#!/bin/bash

# ============================================================================
# Quick Deploy Script for Bedagang
# ============================================================================
# Server: 103.253.212.64 (claw.pdagang.com)
# User: root
# ============================================================================

SERVER="root@103.253.212.64"

echo "============================================"
echo "Bedagang Quick Deploy"
echo "============================================"
echo "Server: 103.253.212.64"
echo ""
echo "This script will execute commands one by one."
echo "You will need to enter password: winner123"
echo ""

# Function to run command on server
run_cmd() {
    echo ""
    echo "→ $1"
    ssh -o StrictHostKeyChecking=no $SERVER "$2"
}

echo "Step 1: Checking system..."
run_cmd "System info" "hostname && uptime"

echo ""
echo "Step 2: Installing Node.js..."
run_cmd "Install Node.js" "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install -y nodejs"

echo ""
echo "Step 3: Installing PM2..."
run_cmd "Install PM2" "npm install -g pm2"

echo ""
echo "Step 4: Installing PostgreSQL..."
run_cmd "Install PostgreSQL" "apt install -y postgresql postgresql-contrib && systemctl start postgresql && systemctl enable postgresql"

echo ""
echo "Step 5: Installing Nginx..."
run_cmd "Install Nginx" "apt install -y nginx && systemctl start nginx && systemctl enable nginx"

echo ""
echo "Step 6: Creating app directory..."
run_cmd "Create directory" "mkdir -p /var/www/bedagang && chown -R root:root /var/www/bedagang"

echo ""
echo "Step 7: Cloning repository..."
run_cmd "Clone repo" "cd /var/www/bedagang && git clone https://github.com/winsitoruser/bedagang.git . || git pull origin main"

echo ""
echo "Step 8: Installing dependencies..."
run_cmd "Install deps" "cd /var/www/bedagang && npm install"

echo ""
echo "Step 9: Creating .env file..."
ssh -o StrictHostKeyChecking=no $SERVER 'cat > /var/www/bedagang/.env << "EOF"
DATABASE_URL=postgresql://bedagang_user:winner123@localhost:5432/bedagang_production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_production
DB_USER=bedagang_user
DB_PASSWORD=winner123
NODE_ENV=production
PORT=3000
APP_URL=http://103.253.212.64:3000
NEXTAUTH_URL=http://103.253.212.64:3000
NEXTAUTH_SECRET=bedagang-secret-2026
SESSION_SECRET=bedagang-session-2026
EOF
echo ".env file created"'

echo ""
echo "Step 10: Setting up database..."
run_cmd "Setup DB" "sudo -u postgres psql -c \"CREATE DATABASE bedagang_production;\" || true && sudo -u postgres psql -c \"CREATE USER bedagang_user WITH PASSWORD 'winner123';\" || true && sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE bedagang_production TO bedagang_user;\" || true"

echo ""
echo "Step 11: Building application..."
run_cmd "Build app" "cd /var/www/bedagang && npm run build"

echo ""
echo "Step 12: Configuring firewall..."
run_cmd "Setup firewall" "ufw allow 22/tcp && ufw allow 3000/tcp && ufw allow 80/tcp && ufw --force enable"

echo ""
echo "Step 13: Starting application..."
run_cmd "Start app" "cd /var/www/bedagang && pm2 delete bedagang || true && pm2 start npm --name bedagang -- start && pm2 save"

echo ""
echo "Step 14: Configuring Nginx..."
ssh -o StrictHostKeyChecking=no $SERVER 'cat > /etc/nginx/sites-available/bedagang << "EOF"
server {
    listen 80;
    server_name 103.253.212.64;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
ln -sf /etc/nginx/sites-available/bedagang /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configured"'

echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
run_cmd "Application status" "pm2 status bedagang"

echo ""
echo "Access your application at:"
echo "  → http://103.253.212.64:3000"
echo "  → http://103.253.212.64"
echo ""
