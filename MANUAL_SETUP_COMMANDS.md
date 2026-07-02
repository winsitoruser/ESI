# Manual Setup Commands for Server 103.253.212.64

## ✅ Status Saat Ini:
- Server: **103.253.212.64** (claw.pdagang.com)
- Node.js: **v22.22.0** ✅
- npm: **10.9.4** ✅
- PM2: **6.0.14** ✅
- Directory: **/var/www/bedagang** ✅

---

## 🚀 Langkah Setup (Copy-Paste ke Terminal Server)

### 1. Connect ke Server
```bash
ssh root@103.253.212.64
# Password: winner123
```

### 2. Clone Repository
```bash
cd /var/www/bedagang
git clone https://github.com/winsitoruser/bedagang.git .
```

Jika sudah ada, update:
```bash
cd /var/www/bedagang
git pull origin main
```

### 3. Install Dependencies
```bash
cd /var/www/bedagang
npm install
```

### 4. Create .env File
```bash
cd /var/www/bedagang
cat > .env << 'EOF'
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
NEXTAUTH_SECRET=bedagang-secret-key-production-2026
SESSION_SECRET=bedagang-session-secret-production-2026
EOF
```

### 5. Install PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 6. Setup Database
```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE bedagang_production;
CREATE USER bedagang_user WITH PASSWORD 'winner123';
GRANT ALL PRIVILEGES ON DATABASE bedagang_production TO bedagang_user;
ALTER DATABASE bedagang_production OWNER TO bedagang_user;
\q
EOF
```

### 7. Run Database Migrations
```bash
cd /var/www/bedagang
npm run migrate
```

Jika error, coba manual:
```bash
cd /var/www/bedagang
npx sequelize-cli db:migrate
```

### 8. Build Application
```bash
cd /var/www/bedagang
npm run build
```

### 9. Setup Firewall
```bash
ufw allow 22/tcp
ufw allow 3000/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

### 10. Start Application with PM2
```bash
cd /var/www/bedagang
pm2 delete bedagang 2>/dev/null || true
pm2 start npm --name bedagang -- start
pm2 save
pm2 startup
```

Copy dan jalankan command yang muncul dari `pm2 startup`

### 11. Install Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 12. Configure Nginx
```bash
cat > /etc/nginx/sites-available/bedagang << 'EOF'
server {
    listen 80;
    server_name 103.253.212.64 claw.pdagang.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bedagang /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 13. Check Status
```bash
pm2 status
pm2 logs bedagang --lines 30
```

### 14. Test Application
```bash
curl http://localhost:3000
netstat -tulpn | grep :3000
```

---

## 🔍 Troubleshooting Commands

### Check if App is Running
```bash
pm2 status
pm2 logs bedagang
```

### Restart App
```bash
pm2 restart bedagang
```

### Check Port 3000
```bash
netstat -tulpn | grep :3000
ss -tulpn | grep :3000
```

### Check Nginx
```bash
systemctl status nginx
nginx -t
```

### Check Database
```bash
sudo -u postgres psql -l
sudo -u postgres psql -d bedagang_production -c "\dt"
```

### View Logs
```bash
pm2 logs bedagang --lines 50
tail -f /var/log/nginx/error.log
```

---

## ✅ Success Indicators

Jika berhasil, Anda akan melihat:
- ✅ `pm2 status` menunjukkan "online"
- ✅ `netstat -tulpn | grep :3000` menunjukkan LISTEN
- ✅ `curl http://localhost:3000` mengembalikan HTML
- ✅ Browser bisa akses http://103.253.212.64

---

## 🌐 Access URLs

Setelah setup selesai:
- **Direct:** http://103.253.212.64:3000
- **Via Nginx:** http://103.253.212.64
- **Domain:** http://claw.pdagang.com (jika DNS sudah diatur)

---

## 📝 Quick Commands

```bash
# Status
pm2 status

# Logs
pm2 logs bedagang

# Restart
pm2 restart bedagang

# Stop
pm2 stop bedagang

# Monitor
pm2 monit
```

---

**Server:** 103.253.212.64 (claw.pdagang.com)  
**User:** root  
**Password:** winner123  
**Last Updated:** February 10, 2026
