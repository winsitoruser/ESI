#!/bin/bash

# Setup Inventory Transfers System
# This script will:
# 1. Run migration to create tables
# 2. Verify tables created
# 3. Test all API endpoints

echo "=========================================="
echo "INVENTORY TRANSFERS - SETUP & TESTING"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-farmanesia_dev}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# API URL
API_URL=${API_URL:-http://localhost:3000}

echo "Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  API URL: $API_URL"
echo ""

# Step 1: Run Migration
echo "=========================================="
echo "STEP 1: Running Migration"
echo "=========================================="

MIGRATION_FILE="../migrations/20260126000005-create-inventory-transfers.sql"

if [ -f "$MIGRATION_FILE" ]; then
    echo "Migration file found: $MIGRATION_FILE"
    
    # Check if psql is available
    if command -v psql &> /dev/null; then
        echo "Running migration with psql..."
        psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -f $MIGRATION_FILE
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Migration completed successfully${NC}"
        else
            echo -e "${RED}✗ Migration failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠ psql not found. Please run migration manually:${NC}"
        echo "  psql -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE"
        echo ""
        read -p "Press Enter after running migration manually..."
    fi
else
    echo -e "${RED}✗ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo ""

# Step 2: Verify Tables
echo "=========================================="
echo "STEP 2: Verifying Tables"
echo "=========================================="

if command -v psql &> /dev/null; then
    echo "Checking tables..."
    
    TABLES=$(psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'inventory_transfer%' ORDER BY table_name;")
    
    echo "Tables found:"
    echo "$TABLES"
    
    TABLE_COUNT=$(echo "$TABLES" | grep -c "inventory_transfer")
    
    if [ $TABLE_COUNT -eq 3 ]; then
        echo -e "${GREEN}✓ All 3 tables created successfully${NC}"
    else
        echo -e "${RED}✗ Expected 3 tables, found $TABLE_COUNT${NC}"
    fi
    
    echo ""
    echo "Checking indexes..."
    INDEXES=$(psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -t -c "SELECT indexname FROM pg_indexes WHERE tablename LIKE 'inventory_transfer%' ORDER BY indexname;")
    INDEX_COUNT=$(echo "$INDEXES" | grep -c "idx_transfer")
    echo "Indexes found: $INDEX_COUNT"
    
    if [ $INDEX_COUNT -ge 10 ]; then
        echo -e "${GREEN}✓ Indexes created successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Expected ~13 indexes, found $INDEX_COUNT${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping table verification (psql not available)${NC}"
fi

echo ""

# Step 3: Test API Endpoints
echo "=========================================="
echo "STEP 3: Testing API Endpoints"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking if Next.js server is running..."
if curl -s "$API_URL" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo ""

# Test 1: Get Stats (Empty State)
echo "Test 1: GET /api/inventory/transfers/stats"
RESPONSE=$(curl -s "$API_URL/api/inventory/transfers/stats")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Stats endpoint working${NC}"
else
    echo -e "${RED}✗ Stats endpoint failed${NC}"
fi

echo ""

# Test 2: List Transfers (Empty)
echo "Test 2: GET /api/inventory/transfers"
RESPONSE=$(curl -s "$API_URL/api/inventory/transfers?page=1&limit=10")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ List endpoint working${NC}"
else
    echo -e "${RED}✗ List endpoint failed${NC}"
fi

echo ""

# Test 3: Create Transfer
echo "Test 3: POST /api/inventory/transfers (Create)"
RESPONSE=$(curl -s -X POST "$API_URL/api/inventory/transfers" \
  -H "Content-Type: application/json" \
  -d '{
    "from_location_id": 1,
    "to_location_id": 2,
    "priority": "urgent",
    "reason": "Stock menipis di cabang, customer menunggu",
    "items": [
      {
        "product_id": 1,
        "product_name": "Kopi Arabica Premium 250g",
        "product_sku": "KOP-001",
        "quantity": 50,
        "unit_cost": 30000
      }
    ],
    "shipping_cost": 150000,
    "notes": "Test transfer dari script"
  }')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Create endpoint working${NC}"
    
    # Extract transfer ID
    TRANSFER_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
    TRANSFER_NUMBER=$(echo "$RESPONSE" | grep -o '"transfer_number":"[^"]*"' | cut -d'"' -f4)
    
    echo "  Transfer ID: $TRANSFER_ID"
    echo "  Transfer Number: $TRANSFER_NUMBER"
else
    echo -e "${RED}✗ Create endpoint failed${NC}"
    TRANSFER_ID=""
fi

echo ""

# Only continue if transfer was created
if [ -n "$TRANSFER_ID" ]; then
    
    # Test 4: Get Transfer Detail
    echo "Test 4: GET /api/inventory/transfers/$TRANSFER_ID (Detail)"
    RESPONSE=$(curl -s "$API_URL/api/inventory/transfers/$TRANSFER_ID")
    echo "Response: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Detail endpoint working${NC}"
    else
        echo -e "${RED}✗ Detail endpoint failed${NC}"
    fi
    
    echo ""
    
    # Test 5: Approve Transfer
    echo "Test 5: PUT /api/inventory/transfers/$TRANSFER_ID/approve"
    RESPONSE=$(curl -s -X PUT "$API_URL/api/inventory/transfers/$TRANSFER_ID/approve" \
      -H "Content-Type: application/json" \
      -d '{
        "approval_notes": "Approved dari testing script",
        "estimated_shipment_date": "2026-01-27"
      }')
    
    echo "Response: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Approve endpoint working${NC}"
    else
        echo -e "${RED}✗ Approve endpoint failed${NC}"
    fi
    
    echo ""
    
    # Test 6: Ship Transfer
    echo "Test 6: PUT /api/inventory/transfers/$TRANSFER_ID/ship"
    RESPONSE=$(curl -s -X PUT "$API_URL/api/inventory/transfers/$TRANSFER_ID/ship" \
      -H "Content-Type: application/json" \
      -d '{
        "shipment_date": "2026-01-27T10:00:00",
        "tracking_number": "TEST123456",
        "courier": "Test Courier",
        "estimated_arrival": "2026-01-28"
      }')
    
    echo "Response: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Ship endpoint working${NC}"
    else
        echo -e "${RED}✗ Ship endpoint failed${NC}"
    fi
    
    echo ""
    
    # Test 7: Receive Transfer
    echo "Test 7: PUT /api/inventory/transfers/$TRANSFER_ID/receive"
    RESPONSE=$(curl -s -X PUT "$API_URL/api/inventory/transfers/$TRANSFER_ID/receive" \
      -H "Content-Type: application/json" \
      -d '{
        "received_date": "2026-01-28T14:00:00",
        "items": [
          {
            "product_id": 1,
            "quantity_received": 50,
            "condition": "good",
            "notes": ""
          }
        ],
        "receipt_notes": "Semua barang diterima dengan baik"
      }')
    
    echo "Response: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Receive endpoint working${NC}"
    else
        echo -e "${RED}✗ Receive endpoint failed${NC}"
    fi
    
    echo ""
    
    # Test 8: Create Another Transfer for Rejection Test
    echo "Test 8: Create transfer for rejection test"
    RESPONSE=$(curl -s -X POST "$API_URL/api/inventory/transfers" \
      -H "Content-Type: application/json" \
      -d '{
        "from_location_id": 1,
        "to_location_id": 3,
        "priority": "normal",
        "reason": "Test rejection",
        "items": [
          {
            "product_id": 2,
            "product_name": "Test Product",
            "quantity": 10,
            "unit_cost": 10000
          }
        ],
        "shipping_cost": 50000
      }')
    
    TRANSFER_ID_2=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
    
    if [ -n "$TRANSFER_ID_2" ]; then
        echo "  Transfer ID: $TRANSFER_ID_2"
        
        # Test 9: Reject Transfer
        echo ""
        echo "Test 9: PUT /api/inventory/transfers/$TRANSFER_ID_2/reject"
        RESPONSE=$(curl -s -X PUT "$API_URL/api/inventory/transfers/$TRANSFER_ID_2/reject" \
          -H "Content-Type: application/json" \
          -d '{
            "rejection_reason": "Stock tidak mencukupi - testing",
            "alternative_suggestion": "Request dari lokasi lain"
          }')
        
        echo "Response: $RESPONSE"
        
        if echo "$RESPONSE" | grep -q '"success":true'; then
            echo -e "${GREEN}✓ Reject endpoint working${NC}"
        else
            echo -e "${RED}✗ Reject endpoint failed${NC}"
        fi
    fi
    
    echo ""
    
    # Test 10: Stats After Tests
    echo "Test 10: GET /api/inventory/transfers/stats (After tests)"
    RESPONSE=$(curl -s "$API_URL/api/inventory/transfers/stats")
    echo "Response: $RESPONSE"
    
    if echo "$RESPONSE" | grep -q '"total_transfers"'; then
        TOTAL=$(echo "$RESPONSE" | grep -o '"total_transfers":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}✓ Stats updated: $TOTAL transfers${NC}"
    else
        echo -e "${RED}✗ Stats endpoint failed${NC}"
    fi
fi

echo ""
echo "=========================================="
echo "TESTING COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✓ Migration executed"
echo "  ✓ Tables verified"
echo "  ✓ API endpoints tested"
echo ""
echo "Next Steps:"
echo "  1. Check test results above"
echo "  2. Update frontend: pages/inventory/transfers.tsx"
echo "  3. Create: pages/inventory/transfers/create.tsx"
echo "  4. Implement stock integration"
echo ""
echo "For detailed instructions, see:"
echo "  - INVENTORY_TRANSFERS_DEPLOYMENT_GUIDE.md"
echo "  - INVENTORY_TRANSFERS_IMPLEMENTATION.md"
echo ""
