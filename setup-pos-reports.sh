#!/bin/bash

# Setup POS Reports with Real Data
# This script will setup PostgreSQL database and configure environment

set -e

echo "🚀 Setting up POS Reports with Real Data..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
echo "📦 Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing via Homebrew...${NC}"
    brew install postgresql@14
    brew services start postgresql@14
    echo -e "${GREEN}✓ PostgreSQL installed and started${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL already installed${NC}"
fi

# Check if PostgreSQL is running
echo ""
echo "🔍 Checking PostgreSQL service..."
if brew services list | grep postgresql | grep started > /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}Starting PostgreSQL service...${NC}"
    brew services start postgresql@14
    sleep 2
    echo -e "${GREEN}✓ PostgreSQL started${NC}"
fi

# Database configuration
DB_NAME="bedagang"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Check if database exists
echo ""
echo "🗄️  Checking database..."
if psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
else
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    createdb -U $DB_USER $DB_NAME
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Create .env.local file
echo ""
echo "📝 Creating .env.local file..."
cat > .env.local << EOF
# Database Configuration
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# PostgreSQL Configuration
POSTGRES_HOST=$DB_HOST
POSTGRES_PORT=$DB_PORT
POSTGRES_DB=$DB_NAME
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Application
NODE_ENV=development
PORT=3001
EOF

echo -e "${GREEN}✓ .env.local created${NC}"

# Check if tables exist
echo ""
echo "🔍 Checking database tables..."
TABLE_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('pos_transactions', 'pos_transaction_items', 'products', 'payment_methods');" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt 4 ]; then
    echo -e "${YELLOW}⚠️  Required tables not found${NC}"
    echo ""
    echo "Please import your database schema:"
    echo "  psql -U $DB_USER -d $DB_NAME -f DATABASE_EXPORT_COMPLETE.sql"
    echo ""
    echo "Or create tables manually using the schema in docs/"
else
    echo -e "${GREEN}✓ Required tables exist${NC}"
    
    # Check if there's data
    echo ""
    echo "📊 Checking for transaction data..."
    TRANSACTION_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pos_transactions WHERE status = 'completed';" 2>/dev/null || echo "0")
    
    if [ "$TRANSACTION_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No transaction data found${NC}"
        echo ""
        echo "Would you like to insert sample data? (y/n)"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo "Inserting sample data..."
            
            psql -U $DB_USER -d $DB_NAME << 'EOSQL'
-- Insert sample payment methods if not exist
INSERT INTO payment_methods (id, name, code, is_active, created_at)
VALUES 
  (1, 'Cash', 'CASH', true, NOW()),
  (2, 'Debit Card', 'DEBIT', true, NOW()),
  (3, 'QRIS', 'QRIS', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample products if not exist
INSERT INTO products (id, name, sku, price, cost, stock, is_active, created_at)
VALUES 
  (1, 'Product A', 'PRD-001', 75000, 60000, 100, true, NOW()),
  (2, 'Product B', 'PRD-002', 50000, 40000, 150, true, NOW()),
  (3, 'Product C', 'PRD-003', 60000, 48000, 120, true, NOW()),
  (4, 'Product D', 'PRD-004', 70000, 56000, 80, true, NOW()),
  (5, 'Product E', 'PRD-005', 85000, 68000, 90, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample transactions
INSERT INTO pos_transactions (transaction_number, transaction_date, total_amount, payment_method_id, status, created_at)
VALUES 
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '1 hour', 150000, 1, 'completed', NOW() - INTERVAL '1 hour'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '2 hours', 250000, 1, 'completed', NOW() - INTERVAL '2 hours'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '3 hours', 180000, 2, 'completed', NOW() - INTERVAL '3 hours'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '4 hours', 320000, 1, 'completed', NOW() - INTERVAL '4 hours'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '5 hours', 420000, 3, 'completed', NOW() - INTERVAL '5 hours'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '6 hours', 280000, 2, 'completed', NOW() - INTERVAL '6 hours'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '7 hours', 195000, 1, 'completed', NOW() - INTERVAL '7 hours'),
  ('TRX-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 5, '0'), NOW() - INTERVAL '8 hours', 340000, 3, 'completed', NOW() - INTERVAL '8 hours');

-- Insert sample transaction items
DO $$
DECLARE
  trx_id INT;
BEGIN
  FOR trx_id IN SELECT id FROM pos_transactions ORDER BY id DESC LIMIT 8
  LOOP
    INSERT INTO pos_transaction_items (transaction_id, product_id, quantity, unit_price, subtotal, created_at)
    VALUES 
      (trx_id, FLOOR(RANDOM() * 5 + 1)::INT, FLOOR(RANDOM() * 3 + 1)::INT, 75000, 150000, NOW()),
      (trx_id, FLOOR(RANDOM() * 5 + 1)::INT, FLOOR(RANDOM() * 2 + 1)::INT, 50000, 100000, NOW());
  END LOOP;
END $$;

EOSQL
            
            echo -e "${GREEN}✓ Sample data inserted${NC}"
        fi
    else
        echo -e "${GREEN}✓ Found $TRANSACTION_COUNT completed transactions${NC}"
    fi
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
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration:"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  User: $DB_USER"
echo ""
echo "🚀 Next Steps:"
echo "  1. Start development server:"
echo "     npm run dev"
echo ""
echo "  2. Access POS Reports:"
echo "     http://localhost:3001/pos/reports"
echo ""
echo "  3. Test API endpoint:"
echo "     curl 'http://localhost:3001/api/pos/reports?reportType=sales-summary&period=today'"
echo ""
echo "✨ Data should now be REAL (not mock)!"
echo ""
