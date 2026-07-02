# 🚀 DEPLOYMENT GUIDE - Reports System

**Project:** Bedagang Retail Platform  
**Module:** Reports System  
**Version:** 1.0.0  
**Date:** February 12, 2026

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **1. Environment Setup**
- [ ] PostgreSQL 14+ installed
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git repository access
- [ ] Environment variables configured

### **2. Database Requirements**
- [ ] PostgreSQL database created
- [ ] Database schema imported
- [ ] Sample data loaded (optional)
- [ ] Database user with proper permissions
- [ ] Connection string tested

### **3. Application Requirements**
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (`.env.local`)
- [ ] NextAuth configured
- [ ] Build successful (`npm run build`)
- [ ] Tests passing (if available)

---

## 🔧 **STEP-BY-STEP DEPLOYMENT**

### **Step 1: Clone Repository**

```bash
# Clone the repository
git clone https://github.com/winsitoruser/bedagang.git
cd bedagang

# Checkout main branch
git checkout main
git pull origin main
```

### **Step 2: Install Dependencies**

```bash
# Install all dependencies
npm install

# Or using yarn
yarn install
```

### **Step 3: Setup PostgreSQL Database**

#### **Option A: Automated Setup (Recommended)**
```bash
# Make script executable
chmod +x setup-postgres.sh

# Run automated setup
./setup-postgres.sh
```

#### **Option B: Manual Setup**
```bash
# Create database
createdb bedagang

# Import schema
psql -d bedagang -f DATABASE_EXPORT_COMPLETE.sql

# Verify tables
psql -d bedagang -c "\dt"
```

### **Step 4: Configure Environment Variables**

Create `.env.local` file in project root:

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bedagang
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

# Alternative: Single connection string
DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/bedagang

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-super-secret-key-min-32-characters

# Application
NODE_ENV=development
PORT=3001

# Optional: Redis (for caching)
REDIS_URL=redis://localhost:6379
```

### **Step 5: Verify Database Connection**

```bash
# Test database connection
npm run db:test

# Or manually test
psql -d bedagang -c "SELECT COUNT(*) FROM pos_transactions;"
psql -d bedagang -c "SELECT COUNT(*) FROM finance_transactions;"
psql -d bedagang -c "SELECT COUNT(*) FROM customers;"
```

### **Step 6: Build Application**

```bash
# Development build
npm run dev

# Production build
npm run build
npm run start
```

### **Step 7: Verify Reports APIs**

Test each API endpoint:

```bash
# POS Reports
curl -X GET "http://localhost:3001/api/pos/reports?reportType=sales-summary&period=today"

# Finance Reports
curl -X GET "http://localhost:3001/api/finance/reports?reportType=income-statement&period=month"

# Inventory Reports
curl -X GET "http://localhost:3001/api/inventory/reports?reportType=stock-value&period=month"

# Customer Reports
curl -X GET "http://localhost:3001/api/customers/reports?reportType=overview&period=month"
```

### **Step 8: Access Frontend**

Open browser and navigate to:
- Main Dashboard: `http://localhost:3001`
- POS Reports: `http://localhost:3001/pos/reports`
- Finance Reports: `http://localhost:3001/finance/reports`
- Inventory Reports: `http://localhost:3001/inventory/reports`
- Customer Reports: `http://localhost:3001/customers/reports`

---

## 🌐 **PRODUCTION DEPLOYMENT**

### **Deployment Options**

#### **Option 1: Vercel (Recommended for Next.js)**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# - POSTGRES_HOST
# - POSTGRES_PORT
# - POSTGRES_DB
# - POSTGRES_USER
# - POSTGRES_PASSWORD
# - NEXTAUTH_URL
# - NEXTAUTH_SECRET
```

#### **Option 2: Docker**

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: bedagang
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/bedagang
      NEXTAUTH_URL: http://localhost:3001
      NEXTAUTH_SECRET: your-secret-key
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Deploy with Docker:
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

#### **Option 3: Traditional Server (VPS/Dedicated)**

```bash
# Install Node.js and PostgreSQL on server
# Clone repository
git clone https://github.com/winsitoruser/bedagang.git
cd bedagang

# Install dependencies
npm ci --only=production

# Build
npm run build

# Use PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start npm --name "bedagang" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 🔒 **SECURITY CONFIGURATION**

### **1. Environment Variables Security**

```bash
# Never commit .env.local to git
echo ".env.local" >> .gitignore

# Use strong passwords
# Minimum 32 characters for NEXTAUTH_SECRET
openssl rand -base64 32

# Restrict database user permissions
psql -d bedagang -c "REVOKE ALL ON DATABASE bedagang FROM PUBLIC;"
psql -d bedagang -c "GRANT CONNECT ON DATABASE bedagang TO bedagang_user;"
```

### **2. Database Security**

```sql
-- Create dedicated user for application
CREATE USER bedagang_app WITH PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE bedagang TO bedagang_app;
GRANT USAGE ON SCHEMA public TO bedagang_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO bedagang_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bedagang_app;

-- Revoke dangerous permissions
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM bedagang_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM bedagang_app;
```

### **3. API Security**

All API endpoints are protected with:
- ✅ NextAuth authentication
- ✅ Session validation
- ✅ Input validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting (recommended to add)

Add rate limiting middleware:
```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});
```

---

## 📊 **DATABASE OPTIMIZATION**

### **Required Indexes**

```sql
-- POS Reports Indexes
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date_status 
  ON pos_transactions(transaction_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer 
  ON pos_transactions(customer_id, status, transaction_date);
CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_product 
  ON pos_transaction_items(product_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_transaction 
  ON pos_transaction_items(transaction_id);

-- Finance Reports Indexes
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date_status 
  ON finance_transactions(transaction_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category 
  ON finance_transactions(category_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_categories_type 
  ON finance_categories(type, is_active);

-- Inventory Reports Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product 
  ON inventory_stock(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_products_category_active 
  ON products(category_id, is_active);

-- Customer Reports Indexes
CREATE INDEX IF NOT EXISTS idx_customers_active 
  ON customers(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_customers_type 
  ON customers(customer_type, is_active);

-- Analyze tables for query optimization
ANALYZE pos_transactions;
ANALYZE finance_transactions;
ANALYZE inventory_stock;
ANALYZE customers;
```

### **Database Maintenance**

```sql
-- Regular maintenance script
-- Run weekly or monthly

-- Vacuum and analyze
VACUUM ANALYZE pos_transactions;
VACUUM ANALYZE finance_transactions;
VACUUM ANALYZE inventory_stock;
VACUUM ANALYZE customers;

-- Reindex if needed
REINDEX TABLE pos_transactions;
REINDEX TABLE finance_transactions;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚀 **PERFORMANCE OPTIMIZATION**

### **1. Connection Pooling**

Already configured in `lib/db.ts`:
```typescript
const pool = new Pool({
  max: 20,                      // Maximum connections
  idleTimeoutMillis: 30000,     // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
});
```

### **2. Caching Strategy (Optional)**

Install Redis:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

Implement caching:
```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedReport(key: string) {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCachedReport(key: string, data: any, ttl: number = 300) {
  await redis.setex(key, ttl, JSON.stringify(data));
}

// Usage in API
const cacheKey = `report:${reportType}:${period}`;
let data = await getCachedReport(cacheKey);
if (!data) {
  data = await fetchFromDatabase();
  await setCachedReport(cacheKey, data, 300); // 5 minutes
}
```

### **3. Query Optimization**

Monitor slow queries:
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- View slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 📈 **MONITORING & LOGGING**

### **1. Application Logging**

Already implemented with `logger-factory`:
```typescript
import { createLogger } from '@/lib/logger-factory';
const logger = createLogger('api-name');

logger.info('Request processed', { userId, reportType });
logger.error('Database error', { error: error.message });
```

### **2. Database Monitoring**

```sql
-- Monitor active connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '5 seconds'
ORDER BY duration DESC;

-- Kill long-running query if needed
SELECT pg_terminate_backend(pid);
```

### **3. Health Check Endpoint**

Create health check:
```typescript
// pages/api/health.ts
export default async function handler(req, res) {
  try {
    // Check database
    const result = await pool.query('SELECT 1');
    
    return res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
}
```

---

## 🔄 **BACKUP & RECOVERY**

### **Database Backup**

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/bedagang"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U postgres bedagang > $BACKUP_DIR/bedagang_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/bedagang_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: bedagang_$DATE.sql.gz"
```

### **Database Restore**

```bash
# Restore from backup
gunzip bedagang_20260212.sql.gz
psql -U postgres -d bedagang < bedagang_20260212.sql
```

### **Automated Backups**

Add to crontab:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

---

## 🧪 **TESTING IN PRODUCTION**

### **Smoke Tests**

```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="https://your-domain.com"

echo "Testing POS Reports API..."
curl -s "$BASE_URL/api/pos/reports?reportType=sales-summary&period=today" | jq .success

echo "Testing Finance Reports API..."
curl -s "$BASE_URL/api/finance/reports?reportType=income-statement&period=month" | jq .success

echo "Testing Customer Reports API..."
curl -s "$BASE_URL/api/customers/reports?reportType=overview&period=month" | jq .success

echo "Testing Health Check..."
curl -s "$BASE_URL/api/health" | jq .status
```

### **Load Testing**

Using Apache Bench:
```bash
# Test API endpoint
ab -n 1000 -c 10 "http://localhost:3001/api/pos/reports?reportType=sales-summary&period=today"

# Expected: < 500ms response time
```

---

## 🐛 **TROUBLESHOOTING**

### **Common Issues**

#### **1. Database Connection Failed**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check connection
psql -U postgres -d bedagang -c "SELECT 1"
```

#### **2. Authentication Error**
```
Error: Unauthorized. Please login.
```

**Solution:**
- Verify NEXTAUTH_URL is correct
- Check NEXTAUTH_SECRET is set
- Clear browser cookies
- Check session configuration

#### **3. Mock Data Displayed**
```
Warning: Using mock data
```

**Solution:**
- Verify database connection
- Check database has data
- Review API logs for errors
- Test database queries manually

#### **4. Slow Query Performance**
```
Query takes > 5 seconds
```

**Solution:**
```sql
-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Add recommended indexes (see Database Optimization section)

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM pos_transactions WHERE ...;
```

---

## 📞 **SUPPORT & MAINTENANCE**

### **Regular Maintenance Tasks**

**Daily:**
- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Verify backups completed

**Weekly:**
- [ ] Review slow queries
- [ ] Check disk space
- [ ] Update dependencies (security patches)
- [ ] Review user feedback

**Monthly:**
- [ ] Database vacuum and analyze
- [ ] Review and optimize indexes
- [ ] Update documentation
- [ ] Performance review

### **Contact Information**

- **Documentation:** See `/docs` folder
- **Issues:** GitHub Issues
- **Email:** support@bedagang.com

---

## 🎯 **POST-DEPLOYMENT CHECKLIST**

- [ ] All API endpoints responding
- [ ] Frontend pages loading correctly
- [ ] Database queries performing well
- [ ] Backups configured and tested
- [ ] Monitoring and logging active
- [ ] Security measures in place
- [ ] SSL/TLS certificate installed
- [ ] Domain configured correctly
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Rollback plan prepared

---

## 🎉 **SUCCESS INDICATORS**

Your deployment is successful when:

✅ All API endpoints return `success: true`  
✅ Frontend displays real data (not mock)  
✅ Response times < 500ms  
✅ No errors in logs  
✅ Database queries optimized  
✅ Backups running automatically  
✅ Users can access all reports  
✅ Export functionality works  
✅ Authentication working correctly  
✅ Mobile responsive  

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** February 12, 2026  
**Status:** Production Ready  

---

*For additional support, refer to other documentation files:*
- `REPORTS_SYSTEM_COMPLETE.md` - Complete system overview
- `POSTGRESQL_SETUP.md` - Database setup guide
- `REPORTS_ANALYSIS_COMPLETE.md` - Architecture details
