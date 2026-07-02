#!/bin/bash

# ============================================
# PostgreSQL Setup Script for Bedagang
# ============================================

echo "🐘 PostgreSQL Setup untuk Bedagang"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}⚠️  Homebrew belum terinstall${NC}"
    echo ""
    echo "Silakan install Homebrew terlebih dahulu:"
    echo ""
    echo -e "${GREEN}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
    echo ""
    echo "Setelah install Homebrew, jalankan script ini lagi."
    exit 1
fi

echo -e "${GREEN}✅ Homebrew terinstall${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PostgreSQL...${NC}"
    brew install postgresql@15
    
    # Start PostgreSQL service
    echo -e "${YELLOW}🚀 Starting PostgreSQL service...${NC}"
    brew services start postgresql@15
    
    # Add to PATH
    echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
    source ~/.zshrc
    
    echo -e "${GREEN}✅ PostgreSQL installed and started${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL sudah terinstall${NC}"
    
    # Make sure it's running
    brew services start postgresql@15 2>/dev/null || true
fi

echo ""
echo -e "${YELLOW}🗄️  Creating database 'bedagang'...${NC}"

# Create database
createdb bedagang 2>/dev/null && echo -e "${GREEN}✅ Database 'bedagang' created${NC}" || echo -e "${YELLOW}ℹ️  Database 'bedagang' already exists${NC}"

echo ""
echo -e "${YELLOW}📝 Creating .env.local file...${NC}"

# Create .env.local
cat > .env.local << 'EOF'
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=bedagang-secret-key-2026-change-in-production

# Application
NODE_ENV=development
PORT=3001
EOF

echo -e "${GREEN}✅ .env.local created${NC}"

echo ""
echo -e "${YELLOW}📊 Importing database schema...${NC}"

# Import database schema
if [ -f "DATABASE_EXPORT_COMPLETE.sql" ]; then
    psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database schema imported successfully${NC}"
    else
        echo -e "${RED}❌ Failed to import database schema${NC}"
        echo "Please run manually: psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql"
    fi
else
    echo -e "${RED}❌ DATABASE_EXPORT_COMPLETE.sql not found${NC}"
fi

echo ""
echo -e "${YELLOW}🔍 Verifying setup...${NC}"

# Verify tables
TABLE_COUNT=$(psql -d bedagang -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

if [ ! -z "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Database has $TABLE_COUNT tables${NC}"
    
    # Check Finance Settings tables
    PM_COUNT=$(psql -d bedagang -t -c "SELECT COUNT(*) FROM payment_methods;" 2>/dev/null | xargs)
    BA_COUNT=$(psql -d bedagang -t -c "SELECT COUNT(*) FROM bank_accounts;" 2>/dev/null | xargs)
    FC_COUNT=$(psql -d bedagang -t -c "SELECT COUNT(*) FROM finance_categories;" 2>/dev/null | xargs)
    
    echo -e "${GREEN}✅ Payment Methods: $PM_COUNT records${NC}"
    echo -e "${GREEN}✅ Bank Accounts: $BA_COUNT records${NC}"
    echo -e "${GREEN}✅ Finance Categories: $FC_COUNT records${NC}"
else
    echo -e "${YELLOW}⚠️  No tables found. Please import DATABASE_EXPORT_COMPLETE.sql manually${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Start development server: npm run dev"
echo "2. Access Finance Settings: http://localhost:3001/finance/settings"
echo ""
echo "If you encounter any issues, check POSTGRESQL_SETUP.md"
echo ""
