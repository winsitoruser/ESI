# Settings Module - Deployment Guide

## 🚀 **PRODUCTION DEPLOYMENT GUIDE**

**Date:** February 4, 2026  
**Module:** Settings Module  
**Version:** 1.0.0

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **1. Code Review**
- [ ] All 36 files reviewed
- [ ] No console.log in production code
- [ ] No hardcoded credentials
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Validation implemented

### **2. Testing**
- [ ] All critical tests passed
- [ ] Integration tests passed
- [ ] Security tests passed
- [ ] Performance tests passed
- [ ] Responsive design verified

### **3. Documentation**
- [ ] API documentation complete
- [ ] User guide created
- [ ] Admin guide created
- [ ] Testing checklist complete

---

## 🗄️ **DATABASE DEPLOYMENT**

### **Step 1: Backup Current Database**
```bash
# Create backup before migration
pg_dump -U postgres -d bedagang_pos > backup_before_settings_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_before_settings_*.sql
```

### **Step 2: Run Migration**
```bash
# Connect to database
psql -U postgres -d bedagang_pos

# Run migration script
\i migrations/settings_module_tables.sql

# Verify tables created
\dt

# Check table counts
SELECT 'stores' as table_name, COUNT(*) FROM stores
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'units', COUNT(*) FROM units;
```

### **Step 3: Verify Migration**
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'stores', 'roles', 'audit_logs', 'system_backups', 
    'units', 'printer_configs', 'notification_settings'
);

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN (
    'stores', 'roles', 'audit_logs', 'system_backups', 
    'units', 'printer_configs', 'notification_settings'
);

-- Check default data
SELECT * FROM roles;
SELECT * FROM units;
```

---

## 📦 **APPLICATION DEPLOYMENT**

### **Step 1: Install Dependencies**
```bash
# Navigate to project directory
cd /path/to/bedagang

# Install dependencies (if any new)
npm install

# Or with yarn
yarn install
```

### **Step 2: Environment Variables**
```bash
# Add to .env.local (if needed)
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/bedagang_pos

# SMTP Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=BEDAGANG POS
```

### **Step 3: Build Application**
```bash
# Build Next.js application
npm run build

# Or with yarn
yarn build

# Verify build successful
ls -la .next/
```

### **Step 4: Start Application**
```bash
# Development
npm run dev

# Production
npm run start

# Or with PM2 (recommended for production)
pm2 start npm --name "bedagang-pos" -- start
pm2 save
pm2 startup
```

---

## 🔧 **POST-DEPLOYMENT CONFIGURATION**

### **Step 1: Initial Store Setup**
1. Login as admin
2. Navigate to `/settings/store`
3. Fill in store information:
   - Store name
   - Address
   - Contact details
   - Tax ID (NPWP)
   - Operating hours
4. Save settings

### **Step 2: User Management**
1. Navigate to `/settings/users`
2. Create admin users
3. Create manager users
4. Create staff users
5. Assign roles appropriately

### **Step 3: Security Configuration**
1. Navigate to `/settings/security`
2. Enable 2FA for admin users
3. Review audit log settings
4. Set password policies

### **Step 4: Backup Configuration**
1. Navigate to `/settings/backup`
2. Create initial backup
3. Enable scheduled backups
4. Test restore functionality

### **Step 5: Inventory Setup**
1. Navigate to `/settings/inventory`
2. Add product categories
3. Add suppliers
4. Add units/measurements
5. Add warehouses

### **Step 6: Hardware Setup**
1. Navigate to `/settings/hardware`
2. Add printer configurations
3. Test printer connectivity
4. Set default printer

### **Step 7: Notifications Setup**
1. Navigate to `/settings/notifications`
2. Configure SMTP settings
3. Enable desired notifications
4. Test email sending

---

## 🔐 **SECURITY HARDENING**

### **1. Database Security**
```sql
-- Create read-only user for reports
CREATE USER reports_user WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reports_user;

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```

### **2. Application Security**
```bash
# Set secure file permissions
chmod 600 .env.local
chmod 755 pages/
chmod 755 public/

# Disable directory listing
# Add to .htaccess or nginx config
```

### **3. Network Security**
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Restrict database access
- [ ] Enable rate limiting
- [ ] Configure CORS properly

---

## 📊 **MONITORING SETUP**

### **1. Application Monitoring**
```bash
# Install monitoring tools
npm install @sentry/nextjs

# Configure Sentry (optional)
# Add to next.config.js
```

### **2. Database Monitoring**
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

-- Monitor slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### **3. Server Monitoring**
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Monitor logs
pm2 logs bedagang-pos

# Monitor metrics
pm2 monit
```

---

## 🔄 **BACKUP STRATEGY**

### **1. Automated Backups**
```bash
# Create backup script
cat > /opt/backups/backup_bedagang.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/bedagang"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U postgres bedagang_pos | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /path/to/bedagang/public/uploads

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/backups/backup_bedagang.sh

# Schedule with cron
crontab -e
# Add: 0 2 * * * /opt/backups/backup_bedagang.sh
```

### **2. Backup Verification**
```bash
# Test restore procedure
gunzip -c db_backup.sql.gz | psql -U postgres bedagang_pos_test
```

---

## 🚨 **ROLLBACK PROCEDURE**

### **If Deployment Fails:**

**Step 1: Stop Application**
```bash
pm2 stop bedagang-pos
```

**Step 2: Restore Database**
```bash
# Drop new tables
psql -U postgres -d bedagang_pos -c "
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS printer_configs CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS system_backups CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
"

# Restore from backup
psql -U postgres -d bedagang_pos < backup_before_settings_YYYYMMDD_HHMMSS.sql
```

**Step 3: Revert Code**
```bash
git checkout HEAD~1
npm run build
pm2 restart bedagang-pos
```

---

## ✅ **DEPLOYMENT VERIFICATION**

### **1. Smoke Tests**
```bash
# Check application is running
curl http://localhost:3001/api/health

# Check database connection
psql -U postgres -d bedagang_pos -c "SELECT 1;"

# Check all settings pages
curl -I http://localhost:3001/settings
curl -I http://localhost:3001/settings/store
curl -I http://localhost:3001/settings/users
curl -I http://localhost:3001/settings/security
curl -I http://localhost:3001/settings/backup
curl -I http://localhost:3001/settings/inventory
curl -I http://localhost:3001/settings/hardware
curl -I http://localhost:3001/settings/notifications
```

### **2. Functional Tests**
- [ ] Can login successfully
- [ ] Can access all settings pages
- [ ] Can create/update store settings
- [ ] Can manage users
- [ ] Can change password
- [ ] Can create backup
- [ ] Can manage inventory settings
- [ ] Can configure printer
- [ ] Can set notifications

### **3. Performance Tests**
```bash
# Load test with Apache Bench
ab -n 1000 -c 10 http://localhost:3001/settings

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/settings
```

---

## 📱 **USER COMMUNICATION**

### **Announcement Template**
```
Subject: New Settings Module Available

Dear Team,

We're excited to announce the new Settings Module is now available!

New Features:
✅ Store Settings - Manage store information
✅ User Management - Add/edit team members
✅ Security - Enhanced security features
✅ Backup & Restore - Protect your data
✅ Inventory Settings - Manage categories, suppliers, units
✅ Hardware - Configure printers
✅ Notifications - Customize alerts

Access: http://localhost:3001/settings

Training materials available in the documentation folder.

Questions? Contact IT support.

Best regards,
IT Team
```

---

## 📚 **TRAINING MATERIALS**

### **Quick Start Guide**
1. **Store Setup** (5 min)
   - Navigate to Settings > Store
   - Fill in basic information
   - Set operating hours

2. **User Management** (10 min)
   - Navigate to Settings > Users
   - Add team members
   - Assign roles

3. **Daily Operations** (ongoing)
   - Regular backups
   - Monitor audit logs
   - Update settings as needed

---

## 🔧 **TROUBLESHOOTING**

### **Common Issues:**

**Issue: Tables not created**
```bash
# Check PostgreSQL version
psql --version

# Check user permissions
psql -U postgres -c "\du"

# Re-run migration with verbose
psql -U postgres -d bedagang_pos -f migrations/settings_module_tables.sql -v ON_ERROR_STOP=1
```

**Issue: Application won't start**
```bash
# Check logs
pm2 logs bedagang-pos --lines 100

# Check port availability
lsof -i :3001

# Restart application
pm2 restart bedagang-pos
```

**Issue: Cannot access settings pages**
```bash
# Check authentication
# Verify session is valid
# Check user permissions
# Clear browser cache
```

---

## 📊 **SUCCESS METRICS**

### **Week 1:**
- [ ] All users can login
- [ ] Store settings configured
- [ ] Users created and assigned roles
- [ ] First backup completed

### **Week 2:**
- [ ] Inventory settings populated
- [ ] Printer configured and tested
- [ ] Notifications working
- [ ] No critical bugs reported

### **Month 1:**
- [ ] All features in regular use
- [ ] Backup/restore tested
- [ ] Security audit passed
- [ ] User feedback collected

---

## 🎯 **NEXT STEPS**

### **Phase 3 (Optional):**
1. Integrations Settings
2. Billing & License
3. Appearance Customization

### **Enhancements:**
1. Implement actual 2FA with QR codes
2. Implement actual backup/restore logic
3. Implement actual printer commands
4. Add more notification channels
5. Add role-based permissions middleware

---

## 📞 **SUPPORT**

**Technical Support:**
- Email: support@bedagang.com
- Phone: (021) 1234-5678
- Hours: Mon-Fri 9AM-5PM

**Documentation:**
- User Guide: `/docs/user-guide.pdf`
- Admin Guide: `/docs/admin-guide.pdf`
- API Docs: `/docs/api-documentation.md`

---

## ✅ **DEPLOYMENT SIGN-OFF**

**Deployed By:** _______________  
**Date:** _______________  
**Version:** 1.0.0  
**Status:** [ ] Success [ ] Failed  
**Notes:** _______________

**Approved By:** _______________  
**Date:** _______________

---

**🎉 Settings Module Deployment Complete!**

