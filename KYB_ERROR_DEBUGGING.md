# 🔍 KYB FORM - ERROR DEBUGGING GUIDE

## ⚠️ Error: "Gagal Menyimpan Data"

Jika masih muncul error "gagal menyimpan data", ikuti langkah debugging berikut:

---

## 📋 LANGKAH DEBUGGING

### **1. Buka Browser Console**
```
Tekan F12 atau Cmd+Option+I (Mac)
→ Pilih tab "Console"
→ Refresh halaman KYB
→ Coba save data
→ Lihat error yang muncul
```

### **2. Cek Error Message di Console**

Error yang mungkin muncul:

#### **A. Network Error**
```
Save error: Failed to fetch
```
**Penyebab:** Server tidak running atau network issue
**Solusi:** 
- Pastikan server running (`npm run dev`)
- Cek koneksi internet

#### **B. 401 Unauthorized**
```
Save error response: 401
```
**Penyebab:** Session expired atau tidak login
**Solusi:**
- Logout dan login ulang
- Clear cookies dan login lagi

#### **C. 400 Bad Request**
```
Save error response: 400
Tenant not found. Please complete welcome step first.
```
**Penyebab:** Tenant belum dibuat
**Solusi:**
- Kembali ke `/onboarding/welcome`
- Buat tenant terlebih dahulu

#### **D. 404 Not Found**
```
Save error response: 404
KYB application not found
```
**Penyebab:** KYB record belum dibuat
**Solusi:**
- Refresh halaman (akan auto-create)
- Atau logout/login ulang

#### **E. 500 Server Error**
```
Save error response: 500
Failed to update KYB data
```
**Penyebab:** Database error atau server issue
**Solusi:**
- Cek server logs
- Pastikan database running
- Cek tabel kyb_applications ada

---

## 🛠️ PERBAIKAN YANG SUDAH DILAKUKAN

### **Enhanced Error Handling:**

```typescript
// Sekarang menampilkan error detail
const saveProgress = async (nextStep?: number) => {
  try {
    const res = await fetch('/api/onboarding/kyb', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        currentStep: nextStep || currentStep,
      }),
    });
    
    // Check HTTP status
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Save error response:', errorText);
      toast.error(`Gagal menyimpan data: ${res.status}`);
      return false;
    }
    
    // Check response success
    const json = await res.json();
    if (!json.success) {
      console.error('Save failed:', json);
      toast.error(json.message || 'Gagal menyimpan data');
      return false;
    }
    
    console.log('Data saved successfully');
    return true;
  } catch (error: any) {
    console.error('Save error:', error);
    toast.error(`Gagal menyimpan data: ${error.message}`);
    return false;
  }
};
```

**Benefits:**
- ✅ Menampilkan HTTP status code
- ✅ Menampilkan error message dari server
- ✅ Logging detail di console
- ✅ Return value untuk handle success/failure

---

## 🔍 CEK DATABASE

### **Verify Tables Exist:**
```bash
node -e "const db = require('./models'); (async () => { 
  const count = await db.KybApplication.count(); 
  console.log('KYB records:', count); 
  process.exit(0); 
})();"
```

**Expected Output:**
```
KYB records: 1 (or more)
```

**If Error:**
```
Error: relation "kyb_applications" does not exist
```
**Solusi:** Run `node scripts/create-kyb-tables.js`

---

## 📊 COMMON ISSUES & SOLUTIONS

### **Issue 1: Session Expired**
**Symptom:** 401 error
**Solution:**
```
1. Logout
2. Login ulang
3. Coba save lagi
```

### **Issue 2: Tenant Not Found**
**Symptom:** 400 error "Tenant not found"
**Solution:**
```
1. Go to /onboarding/welcome
2. Create tenant
3. Return to /onboarding/kyb
```

### **Issue 3: Database Connection**
**Symptom:** 500 error
**Solution:**
```
1. Check PostgreSQL running
2. Check database credentials in .env
3. Restart server
```

### **Issue 4: Invalid Data Format**
**Symptom:** Save fails silently
**Solution:**
```
1. Check console for validation errors
2. Ensure all required fields filled
3. Check data types match schema
```

---

## 🧪 TESTING STEPS

### **1. Test Save Functionality:**
```
1. Open /onboarding/kyb
2. Open browser console (F12)
3. Fill Step 1 fields
4. Click "Selanjutnya"
5. Check console for:
   - "Data saved successfully" ✅
   - OR error message ❌
```

### **2. Test API Directly:**
```bash
# Test GET endpoint
curl http://localhost:3001/api/onboarding/kyb \
  -H "Cookie: your-session-cookie"

# Test PUT endpoint
curl -X PUT http://localhost:3001/api/onboarding/kyb \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"businessName":"Test","currentStep":1}'
```

---

## 📝 WHAT TO REPORT

Jika masih error setelah debugging, berikan info:

1. **Error message di console** (screenshot atau copy text)
2. **HTTP status code** (401, 404, 500, etc)
3. **Network tab** di browser DevTools
4. **Step berapa** saat error terjadi
5. **Data apa yang diisi** di form

---

## ✅ VERIFICATION CHECKLIST

Sebelum report error, pastikan:

- [ ] Server running (`npm run dev`)
- [ ] Database running (PostgreSQL)
- [ ] Tables exist (`kyb_applications`, `kyb_documents`)
- [ ] User logged in (valid session)
- [ ] Tenant created (via `/onboarding/welcome`)
- [ ] Browser console open (F12)
- [ ] Network tab recording

---

*Debugging Guide - Updated: 2026-02-27*
