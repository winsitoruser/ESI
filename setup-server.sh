#!/bin/bash

# ============================================================================
# Complete Server Setup Script
# ============================================================================
# Server: 103.253.212.64
# User: root
# Password: winner123
# ============================================================================

set -e

SERVER_IP="103.253.212.64"
SERVER_USER="root"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_header "Bedagang Server Setup"
echo "Server: ${SERVER_IP}"
echo "User: ${SERVER_USER}"
echo ""
print_info "You will be prompted for password: winner123"
echo ""

# Execute setup on server
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e
    
    echo "============================================"
    echo "STEP 1: System Update"
    echo "============================================"
    sudo apt update
    echo "✓ System updated"
    
    echo ""
    echo "============================================"
    echo "STEP 2: Install Node.js"
    echo "============================================"
    if ! command -v node &> /dev/null; then
        echo "→ Installing Node.js 18.x..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
        echo "✓ Node.js installed: $(node --version)"
    else
        echo "✓ Node.js already installed: $(node --version)"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 3: Install PM2"
    echo "============================================"
    if ! command -v pm2 &> /dev/null; then
        echo "→ Installing PM2..."
        sudo npm install -g pm2
        echo "✓ PM2 installed: $(pm2 --version)"
    else
        echo "✓ PM2 already installed: $(pm2 --version)"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 4: Install PostgreSQL"
    echo "============================================"
    if ! command -v psql &> /dev/null; then
        echo "→ Installing PostgreSQL..."
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        echo "✓ PostgreSQL installed"
    else
        echo "✓ PostgreSQL already installed"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 5: Install Nginx"
    echo "============================================"
    if ! command -v nginx &> /dev/null; then
        echo "→ Installing Nginx..."
        sudo apt install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
        echo "✓ Nginx installed"
    else
        echo "✓ Nginx already installed"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 6: Setup Application Directory"
    echo "============================================"
    if [ ! -d "/var/www/bedagang" ]; then
        echo "→ Creating directory..."
        sudo mkdir -p /var/www/bedagang
        sudo chown -R $USER:$USER /var/www/bedagang
        echo "✓ Directory created"
    else
        echo "✓ Directory already exists"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 7: Clone Repository"
    echo "============================================"
    cd /var/www/bedagang
    if [ ! -d ".git" ]; then
        echo "→ Cloning repository..."
        git clone https://github.com/winsitoruser/bedagang.git .
        echo "✓ Repository cloned"
    else
        echo "✓ Repository already cloned"
        echo "→ Pulling latest changes..."
        git pull origin main || echo "Already up to date"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 8: Install Dependencies"
    echo "============================================"
    echo "→ Installing npm packages..."
    npm install
    echo "✓ Dependencies installed"
    
    echo ""
    echo "============================================"
    echo "STEP 9: Setup Environment Variables"
    echo "============================================"
    if [ ! -f ".env" ]; then
        echo "→ Creating .env file..."
        cat > .env << 'ENVEOF'
# Database Configuration
DATABASE_URL=postgresql://bedagang_user:winner123@localhost:5432/bedagang_production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bedagang_production
DB_USER=bedagang_user
DB_PASSWORD=winner123

# Application
NODE_ENV=production
PORT=3000
APP_URL=http://103.253.212.64:3000

# NextAuth
NEXTAUTH_URL=http://103.253.212.64:3000
NEXTAUTH_SECRET=bedagang-secret-key-2026-production

# Session
SESSION_SECRET=bedagang-session-secret-2026
ENVEOF
        echo "✓ .env file created"
    else
        echo "✓ .env file already exists"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 10: Setup Database"
    echo "============================================"
    echo "→ Creating database and user..."
    sudo -u postgres psql << 'DBEOF' || echo "Database may already exist"
CREATE DATABASE bedagang_production;
CREATE USER bedagang_user WITH PASSWORD 'winner123';
GRANT ALL PRIVILEGES ON DATABASE bedagang_production TO bedagang_user;
ALTER DATABASE bedagang_production OWNER TO bedagang_user;
DBEOF
    echo "✓ Database setup complete"
    
    echo ""
    echo "============================================"
    echo "STEP 11: Run Database Migrations"
    echo "============================================"
    echo "→ Running migrations..."
    npm run migrate || echo "⚠ Migrations may have issues, continuing..."
    
    echo ""
    echo "============================================"
    echo "STEP 12: Build Application"
    echo "============================================"
    echo "→ Building Next.js application..."
    npm run build
    echo "✓ Build complete"
    
    echo ""
    echo "============================================"
    echo "STEP 13: Configure Firewall"
    echo "============================================"
    if command -v ufw &> /dev/null; then
        echo "→ Configuring UFW firewall..."
        sudo ufw allow 22/tcp
        sudo ufw allow 3000/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        echo "✓ Firewall configured"
    else
        echo "→ Installing UFW..."
        sudo apt install -y ufw
        sudo ufw allow 22/tcp
        sudo ufw allow 3000/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        echo "✓ Firewall installed and configured"
    fi
    
    echo ""
    echo "============================================"
    echo "STEP 14: Start Application with PM2"
    echo "============================================"
    echo "→ Starting application..."
    pm2 delete bedagang 2>/dev/null || true
    pm2 start npm --name "bedagang" -- start
    pm2 save
    pm2 startup | tail -1 | bash || true
    echo "✓ Application started"
    
    echo ""
    echo "============================================"
    echo "STEP 15: Configure Nginx Reverse Proxy"
    echo "============================================"
    echo "→ Creating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/bedagang > /dev/null << 'NGINXEOF'
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
NGINXEOF
    
    sudo ln -sf /etc/nginx/sites-available/bedagang /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx
    echo "✓ Nginx configured"
    
    echo ""
    echo "============================================"
    echo "SETUP COMPLETE!"
    echo "============================================"
    echo ""
    echo "Application Status:"
    pm2 status
    echo ""
    echo "Access your application at:"
    echo "  → http://103.253.212.64:3000 (direct)"
    echo "  → http://103.253.212.64 (via Nginx)"
    echo ""
    echo "Useful commands:"
    echo "  → View logs: pm2 logs bedagang"
    echo "  → Restart: pm2 restart bedagang"
    echo "  → Status: pm2 status"
    echo ""
ENDSSH

if [ $? -eq 0 ]; then
    print_success "Server setup completed successfully!"
    echo ""
    print_info "Your application should now be accessible at:"
    echo "  → http://103.253.212.64:3000"
    echo "  → http://103.253.212.64"
else
    print_error "Setup failed. Please check the output above."
    exit 1
fi
