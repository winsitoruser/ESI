# Server Setup Guide - Production Deployment

## 🖥️ Server Information

**Server IP:** 103.253.212.64  
**Environment:** Production  
**Application:** Bedagang POS System

---

## 🔐 SSH Connection Setup

### Prerequisites
- SSH client installed (Terminal on Mac/Linux, PuTTY on Windows)
- SSH key pair (recommended) or password authentication
- Server access credentials

### 1. Generate SSH Key (if not exists)

```bash
# Generate new SSH key pair
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Default location: ~/.ssh/id_rsa
# Press Enter to accept default location
# Enter passphrase (optional but recommended)
```

### 2. Copy SSH Key to Server

```bash
# Method 1: Using ssh-copy-id (recommended)
ssh-copy-id -i ~/.ssh/id_rsa.pub root@103.253.212.64

# Method 2: Manual copy
cat ~/.ssh/id_rsa.pub | ssh root@103.253.212.64 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Create SSH Config File

Create or edit `~/.ssh/config`:

```bash
# Edit SSH config
nano ~/.ssh/config
```

Add this configuration:

```
# Bedagang Production Server
Host bedagang-prod
    HostName 103.253.212.64
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    
# Alternative with different user
Host bedagang-prod-user
    HostName 103.253.212.64
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/id_rsa
```

### 4. Set Correct Permissions

```bash
# Set permissions for SSH directory and files
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
chmod 600 ~/.ssh/config
```

### 5. Connect to Server

```bash
# Using SSH config alias
ssh bedagang-prod

# Or direct connection
ssh root@103.253.212.64

# With specific key
ssh -i ~/.ssh/id_rsa root@103.253.212.64

# With specific port
ssh -p 22 root@103.253.212.64
```

---

## 🛠️ Server Initial Setup

### 1. Update System

```bash
# Connect to server
ssh bedagang-prod

# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git vim htop
```

### 2. Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 for process management
sudo npm install -g pm2
```

### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### 4. Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE bedagang_production;
CREATE USER bedagang_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bedagang_production TO bedagang_user;
\q
```

### 5. Configure Firewall

```bash
# Install UFW if not installed
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow PostgreSQL (only if needed externally)
sudo ufw allow 5432/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 6. Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## 📦 Application Deployment

### 1. Create Application Directory

```bash
# Create directory for application
sudo mkdir -p /var/www/bedagang
sudo chown -R $USER:$USER /var/www/bedagang

# Navigate to directory
cd /var/www/bedagang
```

### 2. Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/winsitoruser/bedagang.git .

# Or if using SSH
git clone git@github.com:winsitoruser/bedagang.git .
```

### 3. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install production dependencies only
npm install --production
```

### 4. Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add production environment variables:

```env
# Database
DATABASE_URL=postgresql://bedagang_user:your_secure_password@localhost:5432/bedagang_production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_production
DB_USER=bedagang_user
DB_PASSWORD=your_secure_password

# NextAuth
NEXTAUTH_URL=http://103.253.212.64:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Application
NODE_ENV=production
PORT=3000

# Session
SESSION_SECRET=your_session_secret_here

# API Keys (if any)
# Add your API keys here
```

### 5. Run Database Migrations

```bash
# Run migrations
npm run migrate

# Or if using Sequelize CLI
npx sequelize-cli db:migrate

# Seed initial data (optional)
npm run seed
```

### 6. Build Application

```bash
# Build Next.js application
npm run build

# Test production build locally
npm start
```

### 7. Setup PM2 Process Manager

```bash
# Start application with PM2
pm2 start npm --name "bedagang" -- start

# Or with ecosystem file
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command output instructions

# Check status
pm2 status

# View logs
pm2 logs bedagang

# Monitor
pm2 monit
```

### 8. Configure Nginx Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bedagang
```

Add this configuration:

```nginx
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
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/bedagang /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Security Hardening

### 1. Disable Root Login

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change these settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH service
sudo systemctl restart sshd
```

### 2. Setup Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

# Start Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

### 3. Setup SSL Certificate (Optional)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain name)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 Monitoring & Maintenance

### PM2 Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs bedagang

# View specific log
pm2 logs bedagang --lines 100

# Monitor resources
pm2 monit

# Restart application
pm2 restart bedagang

# Stop application
pm2 stop bedagang

# Delete process
pm2 delete bedagang

# Reload (zero-downtime)
pm2 reload bedagang
```

### System Monitoring

```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
htop

# Check running processes
ps aux | grep node

# Check network connections
netstat -tulpn | grep LISTEN

# Check logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Backup

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database
pg_dump -U bedagang_user bedagang_production > ~/backups/bedagang_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U bedagang_user bedagang_production < ~/backups/bedagang_20260210_120000.sql

# Automated backup (cron)
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * pg_dump -U bedagang_user bedagang_production > ~/backups/bedagang_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

---

## 🚀 Deployment Workflow

### Manual Deployment

```bash
# 1. Connect to server
ssh bedagang-prod

# 2. Navigate to application directory
cd /var/www/bedagang

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies
npm install

# 5. Run migrations
npm run migrate

# 6. Build application
npm run build

# 7. Restart PM2
pm2 restart bedagang

# 8. Check status
pm2 status
pm2 logs bedagang --lines 50
```

### Automated Deployment Script

See `deploy.sh` script in the repository.

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs bedagang

# Check Node.js version
node --version

# Check if port is in use
sudo lsof -i :3000

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Test connection
psql -U bedagang_user -d bedagang_production -h localhost
```

### Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📝 Quick Reference

### Essential Commands

```bash
# SSH Connection
ssh bedagang-prod

# Application Management
pm2 status
pm2 restart bedagang
pm2 logs bedagang

# System Status
sudo systemctl status nginx
sudo systemctl status postgresql

# View Logs
pm2 logs bedagang
sudo tail -f /var/log/nginx/error.log

# Database Access
psql -U bedagang_user bedagang_production
```

---

## 📞 Support

**Server IP:** 103.253.212.64  
**Application Port:** 3000  
**Database Port:** 5432  
**Web Access:** http://103.253.212.64

**Repository:** https://github.com/winsitoruser/bedagang

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0
