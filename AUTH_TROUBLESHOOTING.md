# Authentication Troubleshooting Guide

## 🚨 Problem: Authentication Always Fails

### Common Causes:
1. No users in database
2. Wrong password
3. User not active
4. Database connection error
5. Missing environment variables
6. Password hashing mismatch

---

## 🔍 Diagnosis Steps

### Step 1: Test Authentication System

**Local (Development):**
```bash
node scripts/test-auth.js
```

**Server (Production):**
```bash
ssh root@103.253.212.64
cd /var/www/bedagang
node scripts/test-auth.js
```

This will check:
- ✅ Database connection
- ✅ Users table exists
- ✅ User count
- ✅ List all users
- ✅ Password hashing
- ✅ Admin user credentials

---

## ✅ Solution 1: Create Default User

### Local:
```bash
node scripts/create-default-user.js
```

### Server:
```bash
ssh root@103.253.212.64
cd /var/www/bedagang
node scripts/create-default-user.js
```

**Default Credentials:**
- Email: `admin@bedagang.com`
- Password: `admin123`
- Role: `admin`

---

## ✅ Solution 2: Create User Manually via Database

### Connect to Database:

**Local:**
```bash
psql -U bedagang_user -d bedagang_development
```

**Server:**
```bash
ssh root@103.253.212.64
sudo -u postgres psql -d bedagang_production
```

### Create User SQL:
```sql
-- Check if users table exists
\dt users

-- Count existing users
SELECT COUNT(*) FROM users;

-- List all users
SELECT id, name, email, role, "isActive" FROM users;

-- Create admin user with hashed password
-- Password: admin123
-- Hash: $2a$10$YourHashedPasswordHere
INSERT INTO users (name, email, password, role, "isActive", "businessName", "createdAt", "updatedAt")
VALUES (
  'Administrator',
  'admin@bedagang.com',
  '$2a$10$rOZJQGKqXm5Y6YxqYvH0XeKGmxvvKJ8vKqxqYvH0XeKGmxvvKJ8vK',
  'admin',
  true,
  'Bedagang POS',
  NOW(),
  NOW()
);

-- Verify user created
SELECT * FROM users WHERE email = 'admin@bedagang.com';
```

---

## ✅ Solution 3: Reset User Password

### Using Script:

Create file `scripts/reset-password.js`:
```javascript
const bcrypt = require('bcryptjs');
const db = require('../models');

async function resetPassword() {
  try {
    const email = 'admin@bedagang.com';
    const newPassword = 'admin123';
    
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword, isActive: true });
    
    console.log('✓ Password reset successfully!');
    console.log('Email:', email);
    console.log('New Password:', newPassword);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.sequelize.close();
  }
}

resetPassword();
```

Run:
```bash
node scripts/reset-password.js
```

---

## ✅ Solution 4: Check Environment Variables

### Verify .env file:

**Local:**
```bash
cat .env | grep -E "DATABASE_URL|NEXTAUTH"
```

**Server:**
```bash
ssh root@103.253.212.64
cat /var/www/bedagang/.env | grep -E "DATABASE_URL|NEXTAUTH"
```

**Required variables:**
```env
DATABASE_URL=postgresql://bedagang_user:winner123@localhost:5432/bedagang_production
NEXTAUTH_URL=http://103.253.212.64:3000
NEXTAUTH_SECRET=bedagang-secret-key-production-2026
SESSION_SECRET=bedagang-session-secret-production-2026
```

---

## ✅ Solution 5: Check Database Connection

### Test connection:

**Local:**
```bash
psql -U bedagang_user -d bedagang_development -c "SELECT version();"
```

**Server:**
```bash
ssh root@103.253.212.64
sudo -u postgres psql -d bedagang_production -c "SELECT version();"
```

### Check if database exists:
```bash
sudo -u postgres psql -c "\l" | grep bedagang
```

### Check if user exists:
```bash
sudo -u postgres psql -c "\du" | grep bedagang_user
```

---

## ✅ Solution 6: Run Migrations

### Ensure all tables are created:

**Local:**
```bash
npm run migrate
```

**Server:**
```bash
ssh root@103.253.212.64
cd /var/www/bedagang
npm run migrate
```

Or manually:
```bash
npx sequelize-cli db:migrate
```

---

## 🔧 Common Issues & Fixes

### Issue 1: "Email atau password salah"

**Cause:** User doesn't exist or wrong password

**Fix:**
```bash
# Check if user exists
node scripts/test-auth.js

# Create user if not exists
node scripts/create-default-user.js

# Or reset password
node scripts/reset-password.js
```

### Issue 2: "Akun Anda tidak aktif"

**Cause:** User's `isActive` is false

**Fix:**
```sql
-- Activate user
UPDATE users SET "isActive" = true WHERE email = 'admin@bedagang.com';
```

Or via script:
```bash
node -e "const db = require('./models'); (async () => { await db.User.update({ isActive: true }, { where: { email: 'admin@bedagang.com' } }); await db.sequelize.close(); })()"
```

### Issue 3: Database connection error

**Cause:** Wrong DATABASE_URL or database not running

**Fix:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Check connection
psql -U bedagang_user -d bedagang_production -c "SELECT 1;"
```

### Issue 4: NextAuth error

**Cause:** Missing NEXTAUTH_SECRET

**Fix:**
```bash
# Add to .env
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env
```

---

## 📋 Quick Checklist

Before testing login, ensure:

- [ ] Database is running
- [ ] Database `bedagang_production` exists
- [ ] User `bedagang_user` has access
- [ ] Migrations have been run
- [ ] Users table exists
- [ ] At least one user exists
- [ ] User is active (`isActive = true`)
- [ ] Password is correctly hashed
- [ ] `.env` file has all required variables
- [ ] `NEXTAUTH_SECRET` is set
- [ ] Application is running

---

## 🧪 Test Login

### Via Browser:
1. Go to http://103.253.212.64:3000/auth/login
2. Enter credentials:
   - Email: `admin@bedagang.com`
   - Password: `admin123`
3. Click Login

### Via API (curl):
```bash
curl -X POST http://103.253.212.64:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bedagang.com",
    "password": "admin123",
    "callbackUrl": "http://103.253.212.64:3000/dashboard"
  }'
```

---

## 📊 Debug Mode

### Enable NextAuth debug:

Edit `.env`:
```env
NODE_ENV=development
NEXTAUTH_DEBUG=true
```

Restart application:
```bash
pm2 restart bedagang
pm2 logs bedagang
```

Check logs for detailed error messages.

---

## 🔐 Create Additional Users

### Via Script:

Create `scripts/create-user.js`:
```javascript
const bcrypt = require('bcryptjs');
const db = require('../models');

async function createUser(name, email, password, role = 'staff') {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await db.User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      businessName: 'Bedagang POS'
    });
    
    console.log('✓ User created:', user.email);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.sequelize.close();
  }
}

// Usage: node scripts/create-user.js
const [name, email, password, role] = process.argv.slice(2);
createUser(name, email, password, role);
```

Run:
```bash
node scripts/create-user.js "John Doe" "john@example.com" "password123" "cashier"
```

---

## 📞 Still Not Working?

### Check Application Logs:

**Server:**
```bash
ssh root@103.253.212.64
pm2 logs bedagang --lines 100
```

**Look for:**
- Database connection errors
- Authentication errors
- Missing environment variables
- Password comparison failures

### Check Browser Console:

Open browser DevTools (F12) and check:
- Network tab for API errors
- Console tab for JavaScript errors

### Common Error Messages:

| Error | Cause | Solution |
|-------|-------|----------|
| "Email atau password salah" | Wrong credentials | Check user exists and password is correct |
| "Akun tidak aktif" | User inactive | Set `isActive = true` |
| "Database connection error" | DB not running | Start PostgreSQL |
| "NEXTAUTH_SECRET not set" | Missing env var | Add to .env |
| "User not found" | No users in DB | Create default user |

---

## ✅ Success Indicators

After fixing, you should see:
- ✅ Login page loads
- ✅ Can submit login form
- ✅ Redirected to dashboard after login
- ✅ User session persists
- ✅ Can access protected pages

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0
