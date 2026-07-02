# BEDAGANG - Promo, Voucher & Loyalty Program Guide

## Overview
Panduan lengkap untuk mengelola Promo, Voucher, dan Loyalty Program di aplikasi BEDAGANG Cloud POS.

---

## 🎫 Promo & Voucher Management

### Fitur Utama

#### 1. **Promo Management**
- Buat dan kelola promo dengan kode unik
- Tipe diskon: Persentase atau Fixed Amount
- Atur periode aktif promo
- Set minimum pembelian dan maksimum diskon
- Batasi jumlah penggunaan
- Track penggunaan real-time

#### 2. **Voucher Management**
- Kelola voucher untuk berbagai kategori:
  - Welcome Voucher (untuk member baru)
  - Member Voucher (untuk member aktif)
  - Birthday Voucher (untuk ulang tahun)
  - Special Event Voucher
- Unlimited atau limited usage
- Minimum purchase requirement
- Expiry date management

### Halaman: `/promo-voucher`

**Statistik Dashboard:**
- Total Promo Aktif
- Total Voucher Aktif
- Penggunaan Bulan Ini
- Total Diskon Diberikan

**Fitur Promo Tab:**
- Daftar semua promo dengan detail lengkap
- Filter berdasarkan status (aktif/nonaktif)
- Search promo by name atau code
- Copy kode promo dengan 1 klik
- Progress bar penggunaan
- Edit dan delete promo
- Export data promo

**Fitur Voucher Tab:**
- Daftar semua voucher dengan kategori
- Filter berdasarkan kategori dan status
- Search voucher by code
- Copy kode voucher
- Track penggunaan (used/limit)
- Edit dan delete voucher
- Export data voucher

### API Endpoints

#### GET `/api/promo-voucher`
**Query Parameters:**
- `type`: 'promo' | 'voucher' | 'all'
- `status`: 'active' | 'inactive'
- `search`: string

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Diskon Akhir Tahun",
      "code": "NEWYEAR2026",
      "type": "percentage",
      "value": 20,
      "minPurchase": 100000,
      "maxDiscount": 50000,
      "startDate": "2026-01-01",
      "endDate": "2026-01-31",
      "used": 45,
      "limit": 100,
      "status": "active"
    }
  ]
}
```

#### POST `/api/promo-voucher`
**Request Body:**
```json
{
  "code": "NEWPROMO",
  "name": "New Promo",
  "type": "percentage",
  "value": 15,
  "minPurchase": 50000,
  "maxDiscount": 25000,
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "limit": 200
}
```

---

## 🏆 Loyalty Program

### Fitur Utama

#### 1. **Tier System**
- **Bronze Tier** (0-999 poin)
  - Diskon 5%
  - Poin 1x per transaksi
  
- **Silver Tier** (1,000-4,999 poin)
  - Diskon 10%
  - Poin 1.5x per transaksi
  - Free Shipping
  
- **Gold Tier** (5,000-9,999 poin)
  - Diskon 15%
  - Poin 2x per transaksi
  - Free Shipping
  - Priority Support
  
- **Platinum Tier** (10,000+ poin)
  - Diskon 20%
  - Poin 3x per transaksi
  - Free Shipping
  - Priority Support
  - Exclusive Deals

#### 2. **Points System**
- Earn points dari setiap transaksi
- Point multiplier berdasarkan tier
- Point expiry management
- Point redemption untuk rewards

#### 3. **Rewards Catalog**
- Voucher rewards (berbagai nominal)
- Product samples
- Exclusive merchandise
- Special experiences

#### 4. **Member Management**
- Track member activity
- View member tier dan points
- Monitor total spending
- Transaction history

### Halaman: `/loyalty-program`

**Statistik Dashboard:**
- Total Member
- Poin Ditukar Bulan Ini
- Reward Diklaim
- Engagement Rate

**Overview Tab:**
- Distribusi Member per Tier (dengan progress bar)
- Top 5 Member (ranking berdasarkan poin)
- Visual tier distribution

**Tiers Tab:**
- Card view untuk setiap tier
- Detail benefit per tier
- Total member per tier
- Edit dan delete tier
- Add new tier

**Rewards Tab:**
- Katalog lengkap rewards
- Filter by type (voucher/product/merchandise)
- Points required per reward
- Stock management
- Claimed tracking dengan progress bar
- Add, edit, delete rewards

**Members Tab:**
- Daftar lengkap member program
- Search member by name/email
- View tier, points, dan spending
- Transaction count
- Edit member details

### API Endpoints

#### GET `/api/loyalty`
**Query Parameters:**
- `type`: 'tiers' | 'members' | 'rewards' | 'all'

**Response:**
```json
{
  "success": true,
  "data": {
    "tiers": [...],
    "members": [...],
    "rewards": [...]
  }
}
```

#### POST `/api/loyalty`
**Request Body (Add Reward):**
```json
{
  "name": "Voucher Rp 50.000",
  "points": 500,
  "stock": 100,
  "type": "voucher"
}
```

---

## 🎨 Design & Color Scheme

### Promo & Voucher
- **Primary Color**: Purple (`from-purple-500 to-purple-600`)
- **Icons**: FaTicketAlt, FaTag, FaPercentage
- **Accent**: Purple gradients untuk active states

### Loyalty Program
- **Primary Color**: Orange (`from-orange-500 to-orange-600`)
- **Icons**: FaStar, FaTrophy, FaGift, FaMedal, FaCrown
- **Tier Colors**:
  - Bronze: `bg-orange-600`
  - Silver: `bg-gray-400`
  - Gold: `bg-yellow-500`
  - Platinum: `bg-purple-600`

---

## 📊 Integration Points

### POS Integration
1. **Apply Promo/Voucher at Checkout**
   - Validate promo code
   - Calculate discount
   - Update usage count
   - Apply to transaction

2. **Earn Loyalty Points**
   - Calculate points based on transaction amount
   - Apply tier multiplier
   - Update member points
   - Check tier upgrade

3. **Redeem Rewards**
   - Deduct points from member
   - Apply reward to transaction
   - Update reward claimed count

### Customer Integration
1. **Member Profile**
   - Display current tier
   - Show available points
   - List available rewards
   - Transaction history

2. **Notifications**
   - Tier upgrade notifications
   - Points earned notifications
   - Reward availability
   - Promo/voucher notifications

---

## 🔄 User Flows

### Flow 1: Create Promo
1. Navigate to `/promo-voucher`
2. Click "Buat Promo/Voucher"
3. Fill form (code, type, value, dates, limits)
4. Save promo
5. Promo appears in active list

### Flow 2: Apply Voucher at POS
1. Customer provides voucher code
2. Cashier enters code at checkout
3. System validates code and requirements
4. Discount applied automatically
5. Usage count updated

### Flow 3: Member Earns Points
1. Member makes purchase
2. System calculates points (amount × tier multiplier)
3. Points added to member account
4. Check if tier upgrade needed
5. Notify member of points earned

### Flow 4: Redeem Reward
1. Member views available rewards
2. Select reward to redeem
3. Confirm points deduction
4. Reward voucher generated
5. Member can use at next purchase

---

## 📱 Navigation

### Main Menu
- **Promo & Voucher** → `/promo-voucher`
- **Loyalty Program** → `/loyalty-program`

### Quick Access
- Dashboard → View stats
- POS → Apply promo/voucher
- Customers → View member loyalty info
- Reports → Promo/loyalty analytics

---

## 🎯 Best Practices

### Promo Management
1. **Clear Naming**: Use descriptive names
2. **Unique Codes**: Easy to remember, hard to guess
3. **Reasonable Limits**: Balance between usage and budget
4. **Time-bound**: Set clear start and end dates
5. **Track Performance**: Monitor usage and ROI

### Voucher Strategy
1. **Welcome Vouchers**: Encourage first purchase
2. **Birthday Vouchers**: Personal touch, increase loyalty
3. **Member Vouchers**: Reward regular customers
4. **Limited Time**: Create urgency

### Loyalty Program
1. **Clear Tiers**: Easy to understand progression
2. **Achievable Goals**: Keep members motivated
3. **Valuable Rewards**: Make points worth earning
4. **Regular Communication**: Keep members engaged
5. **Fair Expiry**: Balance between urgency and fairness

---

## 📈 Metrics to Track

### Promo/Voucher Metrics
- Redemption rate
- Average discount per transaction
- ROI per promo
- Most popular promos
- Customer acquisition cost

### Loyalty Metrics
- Member growth rate
- Tier distribution
- Points earned vs redeemed
- Reward redemption rate
- Member lifetime value
- Engagement rate by tier

---

## 🚀 Future Enhancements

### Planned Features
1. **Automated Promo Generation**
   - AI-based promo suggestions
   - Seasonal auto-promos
   
2. **Advanced Loyalty Features**
   - Referral program
   - Social media integration
   - Gamification elements
   
3. **Personalization**
   - Personalized promo recommendations
   - Custom reward suggestions
   - Behavior-based offers

4. **Analytics Dashboard**
   - Detailed promo performance
   - Loyalty program ROI
   - Member segmentation
   - Predictive analytics

---

## 📞 Support

For questions or issues:
- Check documentation
- Contact support team
- Submit feature requests

---

**Last Updated**: January 19, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
