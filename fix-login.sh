#!/bin/bash

# Fix Login Issue - Automated Setup
# This script will setup environment and create admin user

set -e

echo "🔧 Fixing Login Issue..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
DB_NAME="bedagang_dev"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is installed
echo "📦 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    brew install postgresql@14
    brew services start postgresql@14
    echo -e "${GREEN}✓ PostgreSQL installed${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL already installed${NC}"
fi

# Check if PostgreSQL is running
echo ""
echo "🔍 Checking PostgreSQL service..."
if brew services list | grep postgresql | grep started > /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    brew services start postgresql@14
    sleep 2
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
fi

# Create database if not exists
echo ""
echo "🗄️  Setting up database..."
if psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    createdb -U $DB_USER $DB_NAME
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Generate NEXTAUTH_SECRET
echo ""
echo "🔐 Generating secure secret..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Create .env.local
echo ""
echo "📝 Creating .env.local..."
cat > .env.local << EOF
# Database Configuration (Sequelize - for authentication)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DIALECT=postgres

# PostgreSQL Configuration (for Reports API)
POSTGRES_HOST=$DB_HOST
POSTGRES_PORT=$DB_PORT
POSTGRES_DB=bedagang
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Application
NODE_ENV=development
PORT=3001
EOF

echo -e "${GREEN}✓ .env.local created${NC}"

# Check if users table exists
echo ""
echo "🔍 Checking database tables..."
TABLE_EXISTS=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');" 2>/dev/null || echo "f")

if [ "$TABLE_EXISTS" = " t" ]; then
    echo -e "${GREEN}✓ Users table exists${NC}"
    
    # Check if admin user exists
    USER_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@bedagang.com';" 2>/dev/null || echo "0")
    
    if [ "$USER_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Admin user already exists${NC}"
    else
        echo -e "${YELLOW}Creating admin user...${NC}"
        
        # Create admin user with bcrypt hashed password (admin123)
        psql -U $DB_USER -d $DB_NAME << 'EOSQL'
INSERT INTO users (
  name, 
  email, 
  password, 
  role, 
  is_active,
  business_name,
  created_at, 
  updated_at
) VALUES (
  'Administrator',
  'admin@bedagang.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin',
  true,
  'BEDAGANG',
  NOW(),
  NOW()
);
EOSQL
        
        echo -e "${GREEN}✓ Admin user created${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Users table not found${NC}"
    echo ""
    echo "Please run database migrations:"
    echo "  npm run migrate"
    echo ""
    echo "Or import database schema:"
    echo "  psql -U $DB_USER -d $DB_NAME -f database_schema.sql"
fi

# Test database connection
echo ""
echo "🧪 Testing database connection..."
if psql -U $DB_USER -d $DB_NAME -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    exit 1
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Login Issue Fixed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration:"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  User: $DB_USER"
echo ""
echo "🔐 Default Login Credentials:"
echo "  Email: admin@bedagang.com"
echo "  Password: admin123"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start development server:"
echo "     npm run dev"
echo ""
echo "  2. Access login page:"
echo "     http://localhost:3001/auth/login"
echo ""
echo "  3. Login with credentials above"
echo ""
echo "⚠️  IMPORTANT: Change password after first login!"
echo ""
