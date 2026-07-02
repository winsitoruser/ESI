# Quick Fix Guide - ERR_CONNECTION_REFUSED

## 🚨 Problem: Cannot Access http://103.253.212.64

**Error:** ERR_CONNECTION_REFUSED

---

## ⚡ Quick Solutions

### Solution 1: Run Troubleshooting Script (RECOMMENDED)

```bash
# Run interactive troubleshooting
./troubleshoot.sh

# Or quick fix
./troubleshoot.sh fix

# Or full diagnostics
./troubleshoot.sh diagnose
```

### Solution 2: Manual Quick Fix

```bash
# Connect to server
ssh root@103.253.212.64

# Navigate to app directory
cd /var/www/bedagang

# Start application with PM2
pm2 start npm --name "bedagang" -- start

# Or restart if already exists
pm2 restart bedagang

# Check status
pm2 status

# View logs
pm2 logs bedagang
```

### Solution 3: Check if Application is Running

```bash
# From your local machine
ssh root@103.253.212.64 "pm2 status"

# Check if port 3000 is listening
ssh root@103.253.212.64 "netstat -tulpn | grep :3000"
```

### Solution 4: Open Firewall Ports

```bash
# Connect to server
ssh root@103.253.212.64

# Allow port 3000 (application)
sudo ufw allow 3000/tcp

# Allow port 80 (HTTP)
sudo ufw allow 80/tcp

# Check firewall status
sudo ufw status
```

---

## 🔍 Common Causes & Solutions

### 1. Application Not Deployed Yet

**Symptoms:**
- Directory `/var/www/bedagang` doesn't exist
- No application files on server

**Solution:**
```bash
# Connect to server
ssh root@103.253.212.64

# Create directory
sudo mkdir -p /var/www/bedagang
sudo chown -R $USER:$USER /var/www/bedagang

# Clone repository
cd /var/www/bedagang
git clone https://github.com/winsitoruser/bedagang.git .

# Install dependencies
npm install

# Create .env file
nano .env
# (Copy from .env.production.template and fill values)

# Build application
npm run build

# Start with PM2
pm2 start npm --name "bedagang" -- start
pm2 save
```

### 2. Application Not Running

**Symptoms:**
- PM2 shows no processes
- Port 3000 not listening

**Solution:**
```bash
ssh root@103.253.212.64 "cd /var/www/bedagang && pm2 start npm --name bedagang -- start"
```

### 3. Application Crashed

**Symptoms:**
- PM2 shows "errored" or "stopped" status
- Logs show errors

**Solution:**
```bash
# View logs to identify error
ssh root@103.253.212.64 "pm2 logs bedagang --lines 50"

# Common fixes:
# - Missing .env file
# - Database connection error
# - Port already in use

# Restart application
ssh root@103.253.212.64 "pm2 restart bedagang"
```

### 4. Firewall Blocking Connection

**Symptoms:**
- Application running but cannot access from browser
- Port 3000 listening but connection refused

**Solution:**
```bash
ssh root@103.253.212.64 << 'EOF'
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
EOF
```

### 5. Wrong Port or URL

**Try these URLs:**
- http://103.253.212.64:3000 (with port 3000)
- http://103.253.212.64 (if Nginx configured)

### 6. Node.js Not Installed

**Solution:**
```bash
ssh root@103.253.212.64 << 'EOF'
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
EOF
```

### 7. PM2 Not Installed

**Solution:**
```bash
ssh root@103.253.212.64 "sudo npm install -g pm2"
```

### 8. Missing Environment Variables

**Solution:**
```bash
ssh root@103.253.212.64 << 'EOF'
cd /var/www/bedagang
# Create .env file
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://bedagang_user:password@localhost:5432/bedagang_production
NEXTAUTH_URL=http://103.253.212.64:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
PORT=3000
ENVEOF
pm2 restart bedagang
EOF
```

---

## 📋 Step-by-Step First Time Setup

### Step 1: Connect to Server
```bash
ssh root@103.253.212.64
```

### Step 2: Install Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (optional)
sudo apt install -y nginx
```

### Step 3: Setup Database
```bash
sudo -u postgres psql << 'EOF'
CREATE DATABASE bedagang_production;
CREATE USER bedagang_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bedagang_production TO bedagang_user;
\q
EOF
```

### Step 4: Deploy Application
```bash
# Create directory
sudo mkdir -p /var/www/bedagang
sudo chown -R $USER:$USER /var/www/bedagang

# Clone repository
cd /var/www/bedagang
git clone https://github.com/winsitoruser/bedagang.git .

# Install dependencies
npm install

# Create .env file
nano .env
# Copy from .env.production.template and fill in values

# Run migrations
npm run migrate

# Build application
npm run build

# Start with PM2
pm2 start npm --name "bedagang" -- start
pm2 save
pm2 startup
```

### Step 5: Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw enable
```

### Step 6: Test
```bash
# Check if running
pm2 status

# Check port
netstat -tulpn | grep :3000

# Test locally on server
curl http://localhost:3000

# Access from browser
# http://103.253.212.64:3000
```

---

## 🛠️ Useful Commands

### Check Application Status
```bash
ssh root@103.253.212.64 "pm2 status"
```

### View Logs
```bash
ssh root@103.253.212.64 "pm2 logs bedagang --lines 50"
```

### Restart Application
```bash
ssh root@103.253.212.64 "pm2 restart bedagang"
```

### Stop Application
```bash
ssh root@103.253.212.64 "pm2 stop bedagang"
```

### Check Port Usage
```bash
ssh root@103.253.212.64 "netstat -tulpn | grep :3000"
```

### Check Firewall
```bash
ssh root@103.253.212.64 "sudo ufw status"
```

### Test Connection from Server
```bash
ssh root@103.253.212.64 "curl http://localhost:3000"
```

---

## 🔧 Advanced Troubleshooting

### Check All Listening Ports
```bash
ssh root@103.253.212.64 "sudo netstat -tulpn | grep LISTEN"
```

### Check Running Node Processes
```bash
ssh root@103.253.212.64 "ps aux | grep node"
```

### Kill Process on Port 3000
```bash
ssh root@103.253.212.64 "sudo kill -9 \$(sudo lsof -t -i:3000)"
```

### Check System Resources
```bash
ssh root@103.253.212.64 "free -h && df -h"
```

### View System Logs
```bash
ssh root@103.253.212.64 "sudo journalctl -u nginx -n 50"
```

---

## 📞 Still Not Working?

### Run Full Diagnostics
```bash
./troubleshoot.sh
# Select option 1: Run Full Diagnostics
```

### Check These:
1. ✅ Server is accessible (ping 103.253.212.64)
2. ✅ SSH connection works
3. ✅ Application directory exists
4. ✅ Node.js is installed
5. ✅ PM2 is installed
6. ✅ Application is running (pm2 status)
7. ✅ Port 3000 is listening
8. ✅ Firewall allows port 3000
9. ✅ .env file exists and configured
10. ✅ Database is running

### Get Help
- Check logs: `./troubleshoot.sh` → option 5
- View full guide: `SERVER_SETUP_GUIDE.md`
- Run diagnostics: `./troubleshoot.sh diagnose`

---

## ✅ Success Checklist

After fixing, you should see:
- ✅ `pm2 status` shows "online"
- ✅ `netstat -tulpn | grep :3000` shows LISTEN
- ✅ Browser can access http://103.253.212.64:3000
- ✅ No errors in `pm2 logs bedagang`

---

**Last Updated:** February 10, 2026  
**Server:** 103.253.212.64  
**Application:** Bedagang POS System
