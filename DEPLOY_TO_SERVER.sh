#!/bin/bash

# ============================================================================
# Deploy to Server Script
# ============================================================================
# Run this script ON THE SERVER after connecting via SSH
# ============================================================================

echo "============================================"
echo "Bedagang Deployment to Server"
echo "============================================"
echo ""

# Step 1: Clone or update repository
echo "Step 1: Updating repository..."
cd /var/www/bedagang

if [ -d ".git" ]; then
    echo "→ Pulling latest changes..."
    git pull origin main
else
    echo "→ Cloning repository..."
    git clone https://github.com/winsitoruser/bedagang.git .
fi

# Step 2: Install dependencies
echo ""
echo "Step 2: Installing dependencies..."
npm install --legacy-peer-deps

# Step 3: Create .env if not exists
echo ""
echo "Step 3: Checking .env file..."
if [ ! -f ".env" ]; then
    echo "→ Creating .env file..."
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
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

# Step 4: Run migrations
echo ""
echo "Step 4: Running database migrations..."
npm run migrate || echo "⚠ Migrations may need manual setup"

# Step 5: Create default admin user
echo ""
echo "Step 5: Creating default admin user..."
node scripts/create-default-user.js

# Step 6: Build application
echo ""
echo "Step 6: Building application..."
npm run build

# Step 7: Restart PM2
echo ""
echo "Step 7: Restarting application..."
pm2 restart bedagang || pm2 start npm --name bedagang -- start
pm2 save

# Step 8: Show status
echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""
echo "Application Status:"
pm2 status bedagang
echo ""
echo "Recent Logs:"
pm2 logs bedagang --lines 20 --nostream
echo ""
echo "============================================"
echo "Login Credentials:"
echo "============================================"
echo "Email: admin@bedagang.com"
echo "Password: admin123"
echo ""
echo "Access at:"
echo "  → http://103.253.212.64:3000"
echo "  → http://103.253.212.64"
echo ""
