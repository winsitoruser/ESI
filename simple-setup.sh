#!/bin/bash

# Simple setup script - run each command manually
SERVER="root@103.253.212.64"

echo "============================================"
echo "Bedagang Simple Setup"
echo "============================================"
echo ""
echo "Copy and paste these commands one by one:"
echo ""

cat << 'EOF'
# 1. Connect to server
ssh root@103.253.212.64

# 2. Create directory
mkdir -p /var/www/bedagang
cd /var/www/bedagang

# 3. Clone repository
git clone https://github.com/winsitoruser/bedagang.git . || git pull origin main

# 4. Install dependencies
npm install

# 5. Create .env file
cat > .env << 'ENVEOF'
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
NEXTAUTH_SECRET=bedagang-secret-2026-prod
SESSION_SECRET=bedagang-session-2026-prod
ENVEOF

# 6. Install PostgreSQL
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# 7. Setup database
sudo -u postgres psql << 'DBEOF'
CREATE DATABASE bedagang_production;
CREATE USER bedagang_user WITH PASSWORD 'winner123';
GRANT ALL PRIVILEGES ON DATABASE bedagang_production TO bedagang_user;
ALTER DATABASE bedagang_production OWNER TO bedagang_user;
\q
DBEOF

# 8. Run migrations
npm run migrate || echo "Migrations may need manual setup"

# 9. Build application
npm run build

# 10. Setup firewall
ufw allow 22/tcp
ufw allow 3000/tcp
ufw allow 80/tcp
ufw --force enable

# 11. Start with PM2
pm2 delete bedagang 2>/dev/null || true
pm2 start npm --name bedagang -- start
pm2 save
pm2 startup

# 12. Install and configure Nginx
apt install -y nginx

cat > /etc/nginx/sites-available/bedagang << 'NGINXEOF'
server {
    listen 80;
    server_name 103.253.212.64;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/bedagang /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 13. Check status
pm2 status
pm2 logs bedagang --lines 20

# 14. Test
curl http://localhost:3000

EOF

echo ""
echo "============================================"
echo "After setup, access at:"
echo "  → http://103.253.212.64:3000"
echo "  → http://103.253.212.64"
echo "============================================"
