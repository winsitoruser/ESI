# Deployment Guide - Store/Branch Settings

## 📋 Prerequisites

Before deploying the Store/Branch Settings feature, ensure:
- ✅ PostgreSQL database is running
- ✅ Application is running (npm run dev or pm2)
- ✅ User is authenticated

---

## 🚀 Deployment Steps

### Step 1: Run Database Migrations

**On Development (Local):**
```bash
# If you have PostgreSQL installed locally
psql -U bedagang_user -d bedagang_development -f migrations/create-branches-table.sql
psql -U bedagang_user -d bedagang_development -f migrations/create-store-settings-table.sql
```

**On Production (Server):**
```bash
# Connect to server
ssh root@103.253.212.64

# Navigate to app directory
cd /var/www/bedagang

# Run migrations
sudo -u postgres psql -d bedagang_production -f migrations/create-branches-table.sql
sudo -u postgres psql -d bedagang_production -f migrations/create-store-settings-table.sql

# Verify tables created
sudo -u postgres psql -d bedagang_production -c "\dt branches"
sudo -u postgres psql -d bedagang_production -c "\dt store_settings"
```

**Alternative: Using Node.js Script**
```bash
# Run migration script
node scripts/run-migrations.js
```

---

### Step 2: Verify Models

```bash
# Test model loading
node -e "const db = require('./models'); console.log('Store:', !!db.Store); console.log('Branch:', !!db.Branch); console.log('StoreSetting:', !!db.StoreSetting);"
```

Expected output:
```
Store: true
Branch: true
StoreSetting: true
```

---

### Step 3: Test API Endpoints

**Test Store Settings API:**
```bash
# Get store settings
curl http://localhost:3001/api/settings/store

# Expected: 200 OK with store data
```

**Test Branches API:**
```bash
# Get all branches
curl http://localhost:3001/api/settings/store/branches

# Expected: 200 OK with branches array
```

**Test Settings API:**
```bash
# Get settings
curl http://localhost:3001/api/settings/store/settings

# Expected: 200 OK with settings object
```

**Or use test script:**
```bash
node scripts/test-store-api.js
```

---

### Step 4: Access Frontend Pages

**Open in browser:**
```
http://localhost:3001/settings/store
http://localhost:3001/settings/store/branches
```

**Verify:**
- ✅ Store settings page loads
- ✅ Can view/edit store information
- ✅ Can view/edit operating hours
- ✅ Can navigate to branches page
- ✅ Can create/edit/delete branches

---

### Step 5: Test Complete Workflow

**1. Create a Branch:**
- Go to http://localhost:3001/settings/store/branches
- Click "Tambah Cabang"
- Fill in branch details
- Save

**2. Verify Branch Created:**
- Check branch appears in list
- Verify branch data is correct
- Test edit and delete functions

**3. Test Settings:**
- Go to http://localhost:3001/settings/store
- Verify branch count shows in tab
- Test navigation between tabs

---

## 🔧 Troubleshooting

### Issue: Tables Not Created

**Symptom:** API returns "relation does not exist"

**Solution:**
```bash
# Check if tables exist
sudo -u postgres psql -d bedagang_production -c "\dt"

# If not, run migrations again
sudo -u postgres psql -d bedagang_production -f migrations/create-branches-table.sql
sudo -u postgres psql -d bedagang_production -f migrations/create-store-settings-table.sql
```

### Issue: UUID Extension Error

**Symptom:** "function uuid_generate_v4() does not exist"

**Solution:**
```bash
# Enable UUID extension
sudo -u postgres psql -d bedagang_production -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Issue: Foreign Key Constraint Error

**Symptom:** "violates foreign key constraint"

**Solution:**
```bash
# Ensure stores table exists
sudo -u postgres psql -d bedagang_production -c "CREATE TABLE IF NOT EXISTS stores (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255));"

# Or create a default store
sudo -u postgres psql -d bedagang_production -c "INSERT INTO stores (name) VALUES ('Default Store') ON CONFLICT DO NOTHING;"
```

### Issue: Models Not Loading

**Symptom:** "db.Branch is not a function"

**Solution:**
- Verify models/index.js includes Branch and StoreSetting
- Restart application
- Check for syntax errors in model files

### Issue: API Returns 401 Unauthorized

**Symptom:** All API calls return 401

**Solution:**
- Ensure you're logged in
- Check NextAuth session
- Verify NEXTAUTH_SECRET in .env

---

## 📊 Verification Checklist

After deployment, verify:

### Database
- [ ] branches table exists
- [ ] store_settings table exists
- [ ] UUID extension is enabled
- [ ] Indexes are created
- [ ] Triggers are working
- [ ] Default data is inserted

### Backend
- [ ] Store model loads correctly
- [ ] Branch model loads correctly
- [ ] StoreSetting model loads correctly
- [ ] Model associations work
- [ ] API endpoints respond

### Frontend
- [ ] Store settings page loads
- [ ] Branches page loads
- [ ] Forms work correctly
- [ ] Data displays properly
- [ ] CRUD operations work

### Integration
- [ ] Can create branches
- [ ] Can edit branches
- [ ] Can delete branches
- [ ] Can toggle branch status
- [ ] Settings save correctly
- [ ] Operating hours save correctly

---

## 🔄 Rollback Plan

If deployment fails:

**1. Drop Tables:**
```bash
sudo -u postgres psql -d bedagang_production -c "DROP TABLE IF EXISTS store_settings CASCADE;"
sudo -u postgres psql -d bedagang_production -c "DROP TABLE IF EXISTS branches CASCADE;"
```

**2. Revert Code:**
```bash
git revert HEAD
git push origin main
```

**3. Restart Application:**
```bash
pm2 restart bedagang
```

---

## 📈 Performance Monitoring

After deployment, monitor:

**Database Queries:**
```bash
# Check slow queries
sudo -u postgres psql -d bedagang_production -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

**API Response Times:**
- Monitor /api/settings/store response time
- Monitor /api/settings/store/branches response time
- Should be < 200ms for most queries

**Frontend Load Times:**
- Store settings page should load < 1s
- Branches page should load < 1s

---

## 🎯 Post-Deployment Tasks

### Immediate
1. ✅ Verify all tables created
2. ✅ Test all API endpoints
3. ✅ Test all frontend pages
4. ✅ Create at least one test branch
5. ✅ Verify data persistence

### Short Term
1. ⏳ Integrate BranchSelector with POS module
2. ⏳ Integrate BranchSelector with Inventory module
3. ⏳ Integrate BranchSelector with Finance module
4. ⏳ Integrate BranchSelector with Employee module
5. ⏳ Integrate BranchSelector with Reports module

### Long Term
1. ⏳ Add branch-to-branch transfers
2. ⏳ Add branch performance analytics
3. ⏳ Add branch-specific pricing
4. ⏳ Add branch-specific promotions
5. ⏳ Add consolidated multi-branch reports

---

## 📞 Support

If you encounter issues:

1. Check application logs: `pm2 logs bedagang`
2. Check database logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`
3. Check browser console for frontend errors
4. Review documentation files:
   - STORE_SETTINGS_INTEGRATION_ANALYSIS.md
   - STORE_SETTINGS_IMPLEMENTATION_SUMMARY.md

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ All database tables created
2. ✅ All models load without errors
3. ✅ All API endpoints return 200 OK
4. ✅ All frontend pages load correctly
5. ✅ Can create/edit/delete branches
6. ✅ Can update store settings
7. ✅ Data persists across page reloads
8. ✅ No console errors
9. ✅ No database errors
10. ✅ Performance is acceptable

---

**Deployment Date:** February 10, 2026  
**Version:** 1.0.0  
**Status:** Ready for Production
