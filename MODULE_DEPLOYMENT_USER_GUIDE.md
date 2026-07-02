# 📘 Module Deployment - User Guide

## 🎯 Overview

**Module Deployment** adalah fitur sophisticated untuk mengelola deployment modul ke HQ (Parent) dan Branch secara terpusat. Dengan fitur ini, Anda dapat:

- ✅ Deploy modul ke HQ atau Branch dengan mudah
- ✅ Pilih target deployment (HQ Only, All Branches, atau Selected Branches)
- ✅ Bulk deployment untuk multiple modules sekaligus
- ✅ Monitor status deployment secara real-time
- ✅ Visual coverage per modul di setiap branch

---

## 🚀 Cara Mengakses

1. Login sebagai **Super Admin**, **Owner**, atau **HQ Admin**
2. Navigasi ke: **HQ → Settings → Module Deployment**
3. URL: `http://localhost:3001/hq/settings/module-deployment`

---

## 📊 Dashboard Overview

### **Summary Cards**

Dashboard menampilkan 5 kartu summary:

| Card | Deskripsi |
|------|-----------|
| **Total Modul** | Jumlah total modul yang tersedia |
| **Total Branch** | Jumlah branch yang terdaftar |
| **Full Deploy** | Modul yang sudah di-deploy ke semua branch |
| **Partial** | Modul yang hanya di-deploy ke sebagian branch |
| **Not Deploy** | Modul yang belum di-deploy sama sekali |

### **Deployment Status**

Setiap modul memiliki 3 status deployment:

- 🟢 **Full Deployment** - Modul aktif di semua branch (100% coverage)
- 🟡 **Partial Deployment** - Modul aktif di sebagian branch (1-99% coverage)
- ⚪ **Not Deployed** - Modul belum aktif di branch manapun (0% coverage)

---

## 🎨 Fitur Utama

### **1. Search & Filter**

**Search Bar:**
- Cari modul berdasarkan nama atau kode
- Real-time filtering

**Status Filter:**
- Semua Status
- Full Deployment
- Partial Deployment
- Not Deployed

**View Mode:**
- 📊 **Grid View** - Tampilan kartu dengan detail lengkap
- 📋 **List View** - Tampilan tabel yang compact

### **2. Module Selection**

**Single Selection:**
- Klik checkbox pada modul yang ingin di-deploy
- Lihat detail coverage per modul

**Bulk Selection:**
- Klik "Pilih Semua" untuk select semua modul
- Bulk actions akan muncul di bagian atas

### **3. Deployment Actions**

#### **Deploy Single Module:**

1. Pilih modul yang ingin di-deploy
2. Klik tombol **"Deploy"** (hijau) atau **"Undeploy"** (merah)
3. Dialog deployment akan muncul
4. Pilih target deployment
5. Klik **"Deploy Module"**

#### **Bulk Deployment:**

1. Select multiple modules (centang checkbox)
2. Banner "X modul dipilih" akan muncul
3. Klik **"Deploy Selected"** atau **"Undeploy Selected"**
4. Pilih target dan options
5. Konfirmasi deployment

---

## 🎯 Deployment Targets

### **1. HQ Only**

Deploy modul hanya di tingkat HQ/Parent.

**Use Case:**
- Modul yang hanya digunakan di kantor pusat
- Testing modul baru sebelum deploy ke branch
- Modul administratif (e.g., Master Data Management)

**Contoh:**
```
✓ HQ: Finance Module (enabled)
✗ Branch A: Finance Module (not deployed)
✗ Branch B: Finance Module (not deployed)
```

### **2. All Branches**

Deploy modul ke semua branch yang aktif.

**Use Case:**
- Modul core yang wajib ada di semua branch
- Rollout fitur baru ke seluruh organisasi
- Standard operating modules

**Contoh:**
```
✓ HQ: POS Module (enabled)
✓ Branch A: POS Module (enabled)
✓ Branch B: POS Module (enabled)
✓ Branch C: POS Module (enabled)
```

**Impact:**
- Semua branch aktif akan mendapat modul
- Branch baru otomatis mendapat modul (jika option enabled)

### **3. Selected Branches**

Deploy modul hanya ke branch tertentu.

**Use Case:**
- Pilot program di branch tertentu
- Modul khusus untuk tipe branch tertentu (e.g., Kitchen Display untuk F&B)
- Regional rollout

**Contoh:**
```
✓ HQ: Kitchen Display (enabled)
✓ Branch A (Restaurant): Kitchen Display (enabled)
✓ Branch B (Restaurant): Kitchen Display (enabled)
✗ Branch C (Retail): Kitchen Display (not deployed)
```

**Cara Pilih Branch:**
1. Pilih "Selected Branches"
2. Checklist akan muncul dengan daftar branch
3. Centang branch yang diinginkan
4. Lihat preview jumlah branch yang akan terpengaruh

---

## ⚙️ Deployment Options

### **1. Apply to existing branches**
- ✅ **Enabled**: Deploy ke branch yang sudah ada
- ❌ **Disabled**: Hanya apply ke branch baru

### **2. Apply to future branches automatically**
- ✅ **Enabled**: Branch baru otomatis mendapat modul ini
- ❌ **Disabled**: Branch baru harus di-deploy manual

### **3. Override existing settings**
- ✅ **Enabled**: Timpa konfigurasi yang sudah ada
- ❌ **Disabled**: Skip branch yang sudah dikonfigurasi

---

## 📋 Step-by-Step Tutorials

### **Tutorial 1: Deploy Modul ke Semua Branch**

**Scenario:** Deploy modul "Inventory" ke semua branch

1. **Cari Modul**
   - Ketik "Inventory" di search bar
   - Atau scroll untuk menemukan modul

2. **Pilih Modul**
   - Centang checkbox modul "Inventory"
   - Atau klik tombol "Deploy" langsung

3. **Buka Dialog Deployment**
   - Klik "Deploy Selected" atau tombol "Deploy" pada modul

4. **Pilih Target**
   - Pilih radio button **"All Branches"**
   - Lihat jumlah branch yang akan terpengaruh

5. **Set Options**
   - ✅ Apply to existing branches
   - ✅ Apply to future branches automatically
   - ❌ Override existing settings (optional)

6. **Review Impact**
   - Baca impact preview
   - Pastikan jumlah branch sudah benar

7. **Deploy**
   - Klik tombol **"Deploy Module"**
   - Tunggu proses selesai
   - Success notification akan muncul

8. **Verify**
   - Refresh halaman
   - Cek coverage modul sudah 100%
   - Status berubah menjadi "Full Deployment"

---

### **Tutorial 2: Deploy Modul ke Branch Tertentu**

**Scenario:** Deploy "Kitchen Display" hanya ke branch restaurant

1. **Pilih Modul**
   - Centang "Kitchen Display"

2. **Buka Dialog**
   - Klik "Deploy"

3. **Pilih Target**
   - Pilih **"Selected Branches"**

4. **Pilih Branch**
   - Checklist branch akan muncul
   - Centang branch restaurant:
     - ✅ Branch A - Jakarta Pusat (Restaurant)
     - ✅ Branch B - Jakarta Selatan (Restaurant)
     - ❌ Branch C - Bandung (Retail)

5. **Set Options**
   - ✅ Apply to existing branches
   - ❌ Apply to future branches (karena tidak semua branch butuh)
   - ❌ Override existing settings

6. **Deploy**
   - Klik "Deploy Module"
   - 2 branch akan mendapat modul

7. **Verify**
   - Coverage: 2/3 (66%)
   - Status: Partial Deployment

---

### **Tutorial 3: Bulk Deployment Multiple Modules**

**Scenario:** Deploy 3 modul core ke semua branch baru

1. **Select Multiple Modules**
   - ✅ POS
   - ✅ Inventory
   - ✅ Finance

2. **Bulk Action**
   - Banner "3 modul dipilih" muncul
   - Klik **"Deploy Selected"**

3. **Configure Deployment**
   - Target: **All Branches**
   - Options:
     - ✅ Apply to existing branches
     - ✅ Apply to future branches automatically
     - ✅ Override existing settings

4. **Deploy**
   - Klik "Deploy Module"
   - Progress akan ditampilkan

5. **Review Results**
   - Success: 15 operations (3 modul × 5 branch)
   - Failed: 0
   - Skipped: 0

---

### **Tutorial 4: Undeploy Modul dari Branch**

**Scenario:** Nonaktifkan modul "HRIS" dari branch retail

1. **Pilih Modul**
   - Centang "HRIS"

2. **Undeploy Action**
   - Klik tombol **"Undeploy"** (merah)

3. **Pilih Target**
   - Selected Branches
   - Pilih branch retail yang ingin di-undeploy

4. **Confirm**
   - Review impact
   - Klik "Undeploy Module"

5. **Verify**
   - Coverage berkurang
   - Status berubah ke Partial atau None

---

## 📈 Monitoring & Reporting

### **Coverage Metrics**

Setiap modul menampilkan:
- **Percentage Bar** - Visual coverage (0-100%)
- **Fraction** - Enabled/Total (e.g., 8/10)
- **Color Coding**:
  - 🟢 Green: 100% coverage
  - 🟡 Yellow: 1-99% coverage
  - ⚪ Gray: 0% coverage

### **Branch List**

Klik modul untuk melihat detail branch:
- Branch name
- Enabled status
- Enabled date
- Quick actions

---

## ⚠️ Best Practices

### **DO's ✅**

1. **Test First**
   - Deploy ke HQ atau 1-2 branch dulu
   - Verify functionality
   - Baru deploy ke semua branch

2. **Use Templates**
   - Buat template untuk tipe branch tertentu
   - Restaurant: POS + Kitchen + Table
   - Retail: POS + Inventory
   - Warehouse: Inventory + Fleet

3. **Monitor Coverage**
   - Cek deployment status secara berkala
   - Pastikan modul core 100% deployed
   - Follow up partial deployments

4. **Document Changes**
   - Catat alasan deployment
   - Track deployment history
   - Communicate dengan team

### **DON'Ts ❌**

1. **Jangan Deploy Tanpa Testing**
   - Modul baru harus di-test dulu
   - Jangan langsung deploy ke production

2. **Jangan Override Tanpa Alasan**
   - Override existing settings dengan hati-hati
   - Bisa menghilangkan konfigurasi custom

3. **Jangan Deploy Modul yang Tidak Dibutuhkan**
   - Sesuaikan dengan kebutuhan branch
   - Retail tidak butuh Kitchen Display

4. **Jangan Lupa Enable Auto-Deploy**
   - Branch baru harus dapat modul core
   - Set "Apply to future branches" untuk modul wajib

---

## 🔧 Troubleshooting

### **Problem: Deployment Gagal**

**Symptoms:**
- Error message muncul
- Modul tidak aktif di branch

**Solutions:**
1. Cek koneksi database
2. Verify user permissions
3. Cek dependency modul
4. Lihat error log di console

### **Problem: Coverage Tidak Update**

**Symptoms:**
- Deployment success tapi coverage tetap

**Solutions:**
1. Refresh halaman (F5)
2. Clear browser cache
3. Cek di branch langsung
4. Verify di database

### **Problem: Branch Tidak Muncul di List**

**Symptoms:**
- Branch tidak ada di selected branches

**Solutions:**
1. Cek status branch (harus active)
2. Verify branch belongs to tenant
3. Refresh deployment status
4. Contact admin

### **Problem: Cannot Select Branches**

**Symptoms:**
- Checkbox disabled atau tidak bisa diklik

**Solutions:**
1. Pilih "Selected Branches" dulu
2. Pastikan ada branch yang tersedia
3. Cek permissions
4. Reload page

---

## 📞 Support & Help

### **Need Help?**

1. **Documentation**
   - Baca `MODULE_DEPLOYMENT_ARCHITECTURE.md`
   - Check API documentation

2. **Contact Support**
   - Email: support@bedagang.com
   - Phone: 021-XXXXXXX

3. **Report Issues**
   - GitHub Issues
   - Support ticket system

---

## 🎓 Advanced Features (Coming Soon)

- 📋 **Deployment Templates** - Save & reuse configurations
- 📊 **Deployment History** - Track all deployments
- 🔔 **Notifications** - Alert on deployment status
- 📈 **Analytics** - Deployment success rate
- 🔄 **Rollback** - Undo deployments
- 📅 **Scheduled Deployment** - Deploy at specific time
- 🎯 **Smart Recommendations** - AI-suggested deployments

---

## ✅ Checklist: Module Deployment

### **Before Deployment:**
- [ ] Modul sudah di-test di development
- [ ] Dependencies sudah di-check
- [ ] Target branches sudah ditentukan
- [ ] Backup configuration (jika override)
- [ ] Team sudah di-inform

### **During Deployment:**
- [ ] Pilih target yang benar
- [ ] Set options sesuai kebutuhan
- [ ] Review impact preview
- [ ] Monitor deployment progress
- [ ] Verify success message

### **After Deployment:**
- [ ] Verify coverage metrics
- [ ] Test modul di branch
- [ ] Check for errors
- [ ] Update documentation
- [ ] Inform stakeholders

---

## 🎉 Success!

Anda sekarang sudah menguasai **Module Deployment**!

**Key Takeaways:**
- ✅ Deploy modul dengan 3 target options
- ✅ Bulk operations untuk efisiensi
- ✅ Monitor coverage secara real-time
- ✅ Flexible deployment options
- ✅ Best practices untuk production

**Happy Deploying! 🚀**
