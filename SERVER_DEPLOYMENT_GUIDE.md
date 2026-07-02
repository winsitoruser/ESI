# Server Deployment Guide - Quick Update

## 🚀 Deploy Latest Changes to Server

### Method 1: Automated Script (Recommended)

**Step 1: Connect to Server**
```bash
ssh root@103.253.212.64
# Password: winner123
```

**Step 2: Download and Run Deploy Script**
```bash
cd /var/www/bedagang
curl -O https://raw.githubusercontent.com/winsitoruser/bedagang/main/DEPLOY_TO_SERVER.sh
chmod +x DEPLOY_TO_SERVER.sh
./DEPLOY_TO_SERVER.sh
```

---

### Method 2: Manual Commands

**Connect to server:**
```bash
ssh root@103.253.212.64
```

**Run these commands:**
```bash
# Navigate to app directory
cd /var/www/bedagang

# Pull latest changes
git pull origin main

# Install dependencies
npm install --legacy-peer-deps

# Run migrations
npm run migrate

# Create admin user (if not exists)
node scripts/create-default-user.js

# Build application
npm run build

# Restart application
pm2 restart bedagang

# Check status
pm2 status
pm2 logs bedagang --lines 30
```

---

## 🔐 Default Login Credentials

After deployment, login with:
- **Email:** admin@bedagang.com
- **Password:** admin123
- **Role:** admin

---

## ✅ Verify Deployment

### 1. Check Application Status
```bash
pm2 status bedagang
```

Should show: **status: online**

### 2. Check Logs
```bash
pm2 logs bedagang --lines 50
```

Should show no errors

### 3. Test Authentication
```bash
node scripts/test-auth.js
```

Should show admin user exists

### 4. Access Application
- Open browser: http://103.253.212.64:3000
- Go to login page
- Enter credentials above
- Should redirect to dashboard

---

## 🐛 Troubleshooting

### If Authentication Still Fails:

**1. Check if user exists:**
```bash
node scripts/test-auth.js
```

**2. Create user if not exists:**
```bash
node scripts/create-default-user.js
```

**3. Check database:**
```bash
sudo -u postgres psql -d bedagang_production -c "SELECT email, role, \"isActive\" FROM users;"
```

**4. Check environment variables:**
```bash
cat .env | grep -E "DATABASE_URL|NEXTAUTH"
```

**5. Restart application:**
```bash
pm2 restart bedagang
pm2 logs bedagang
```

---

## 📋 Quick Commands

```bash
# Update code
cd /var/www/bedagang && git pull origin main

# Install dependencies
npm install --legacy-peer-deps

# Build
npm run build

# Restart
pm2 restart bedagang

# View logs
pm2 logs bedagang

# Check status
pm2 status

# Create user
node scripts/create-default-user.js

# Test auth
node scripts/test-auth.js
```

---

## 🎯 What Was Updated

Latest deployment includes:
- ✅ Authentication troubleshooting tools
- ✅ Default admin user creation script
- ✅ Authentication testing script
- ✅ Comprehensive troubleshooting guide
- ✅ Password reset capabilities
- ✅ User management tools

---

## 📞 Need Help?

**Check logs:**
```bash
pm2 logs bedagang --lines 100
```

**Check authentication:**
```bash
node scripts/test-auth.js
```

**View documentation:**
- AUTH_TROUBLESHOOTING.md
- MANUAL_SETUP_COMMANDS.md
- SERVER_SETUP_GUIDE.md

---

**Server:** 103.253.212.64  
**Last Updated:** February 10, 2026  
**Version:** 1.0.0
