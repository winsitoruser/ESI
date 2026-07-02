# POS Integration dengan Reservasi & Table Management

## 📋 Overview

Dokumen ini menjelaskan implementasi integrasi antara POS System dengan Reservation Management dan Table Management untuk mencatat booking, reservasi, dan pembayaran secara terintegrasi.

## 🎯 Tujuan Integrasi

1. **Table Selection di POS** - Kasir dapat memilih meja saat transaksi
2. **Reservation Lookup** - Kasir dapat mencari dan link reservasi ke transaksi
3. **Payment Recording** - Pembayaran tercatat dengan table dan reservation
4. **Table Status Update** - Status meja otomatis update saat transaksi
5. **Reservation Status Update** - Status reservasi otomatis update saat payment

## 🔄 Flow Integrasi

### Flow 1: Walk-in Customer dengan Table
```
Customer datang → Kasir pilih meja → Tambah item → Checkout → 
Pembayaran → Update table status (occupied → available) → 
Cetak struk dengan info meja
```

### Flow 2: Customer dengan Reservasi
```
Customer datang dengan reservasi → Kasir cari reservasi → 
Auto-assign table dari reservasi → Tambah item → Checkout → 
Pembayaran → Update reservation status (confirmed → completed) → 
Update table status → Cetak struk dengan info reservasi
```

### Flow 3: Deposit Payment untuk Reservasi
```
Customer booking reservasi → Bayar deposit di kasir → 
Kasir pilih "Deposit Payment" → Link ke reservasi → 
Record deposit → Update reservation (pending → confirmed)
```

## 📊 Database Schema Updates

### 1. Update Transaction Model

Tambahkan field baru ke tabel `transactions`:

```javascript
// Add to Transaction model
{
  tableId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tables',
      key: 'id'
    }
  },
  reservationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'reservations',
      key: 'id'
    }
  },
  transactionType: {
    type: DataTypes.ENUM('sale', 'deposit', 'refund'),
    defaultValue: 'sale'
  },
  tableNumber: DataTypes.STRING, // Denormalized for quick access
  reservationNumber: DataTypes.STRING, // Denormalized for quick access
  guestCount: DataTypes.INTEGER, // Number of guests at table
  serviceCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  serviceChargePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  }
}
```

### 2. Migration Script

```javascript
// migrations/YYYYMMDD-add-table-reservation-to-transactions.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('transactions', 'tableId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'tables',
        key: 'id'
      }
    });
    
    await queryInterface.addColumn('transactions', 'reservationId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'reservations',
        key: 'id'
      }
    });
    
    await queryInterface.addColumn('transactions', 'transactionType', {
      type: Sequelize.ENUM('sale', 'deposit', 'refund'),
      defaultValue: 'sale'
    });
    
    await queryInterface.addColumn('transactions', 'tableNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'reservationNumber', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'guestCount', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    
    await queryInterface.addColumn('transactions', 'serviceCharge', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0
    });
    
    await queryInterface.addColumn('transactions', 'serviceChargePercentage', {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('transactions', 'tableId');
    await queryInterface.removeColumn('transactions', 'reservationId');
    await queryInterface.removeColumn('transactions', 'transactionType');
    await queryInterface.removeColumn('transactions', 'tableNumber');
    await queryInterface.removeColumn('transactions', 'reservationNumber');
    await queryInterface.removeColumn('transactions', 'guestCount');
    await queryInterface.removeColumn('transactions', 'serviceCharge');
    await queryInterface.removeColumn('transactions', 'serviceChargePercentage');
  }
};
```

## 🎨 UI/UX Changes - POS Cashier Page

### 1. Header Section - Add Table & Reservation Info

```tsx
{/* Table & Reservation Info Bar */}
<div className="bg-white border-b border-gray-200 px-6 py-3">
  <div className="flex items-center justify-between">
    {/* Selected Table */}
    <div className="flex items-center gap-4">
      {selectedTable ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          <MdTableRestaurant className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs text-gray-600">Meja</p>
            <p className="font-semibold text-green-700">{selectedTable.tableNumber}</p>
          </div>
          <button onClick={() => setSelectedTable(null)} className="ml-2">
            <FaTimes className="w-3 h-3 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowTableModal(true)}
          className="flex items-center gap-2 border-2 border-dashed border-gray-300 px-3 py-2 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
        >
          <MdTableRestaurant className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Pilih Meja</span>
        </button>
      )}
      
      {/* Selected Reservation */}
      {selectedReservation ? (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
          <FaCalendar className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-600">Reservasi</p>
            <p className="font-semibold text-blue-700">{selectedReservation.reservationNumber}</p>
            <p className="text-xs text-gray-500">{selectedReservation.customerName}</p>
          </div>
          <button onClick={() => setSelectedReservation(null)} className="ml-2">
            <FaTimes className="w-3 h-3 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowReservationModal(true)}
          className="flex items-center gap-2 border-2 border-dashed border-gray-300 px-3 py-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <FaCalendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Link Reservasi</span>
        </button>
      )}
    </div>
    
    {/* Guest Count */}
    {(selectedTable || selectedReservation) && (
      <div className="flex items-center gap-2">
        <FaUsers className="w-4 h-4 text-gray-400" />
        <input
          type="number"
          value={guestCount}
          onChange={(e) => setGuestCount(parseInt(e.target.value))}
          min="1"
          max="20"
          className="w-16 px-2 py-1 border rounded text-center"
        />
        <span className="text-sm text-gray-600">Tamu</span>
      </div>
    )}
  </div>
</div>
```

### 2. Table Selection Modal

```tsx
{/* Table Selection Modal */}
{showTableModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Pilih Meja</h2>
        <button onClick={() => setShowTableModal(false)}>
          <FaTimes className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      
      <div className="p-6">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={tableFilterFloor}
            onChange={(e) => setTableFilterFloor(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">Semua Lantai</option>
            <option value="1">Lantai 1</option>
            <option value="2">Lantai 2</option>
            <option value="3">Lantai 3</option>
          </select>
          
          <select
            value={tableFilterArea}
            onChange={(e) => setTableFilterArea(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">Semua Area</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="vip">VIP</option>
          </select>
          
          <select
            value={tableFilterStatus}
            onChange={(e) => setTableFilterStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="available">Available Only</option>
            <option value="all">Semua Status</option>
          </select>
        </div>
        
        {/* Tables Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <button
              key={table.id}
              onClick={() => {
                if (table.status === 'available') {
                  setSelectedTable(table);
                  setShowTableModal(false);
                }
              }}
              disabled={table.status !== 'available'}
              className={`p-4 rounded-lg border-2 transition-all ${
                table.status === 'available'
                  ? 'border-green-300 hover:border-green-500 hover:bg-green-50 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                  table.status === 'available' ? 'bg-green-500' : 'bg-gray-400'
                }`}>
                  <MdTableRestaurant className="w-8 h-8 text-white" />
                </div>
                <p className="font-bold text-lg">{table.tableNumber}</p>
                <p className="text-xs text-gray-600">
                  <FaChair className="inline w-3 h-3 mr-1" />
                  {table.capacity} kursi
                </p>
                <p className="text-xs text-gray-500">{table.area} - Lt.{table.floor}</p>
                <span className={`text-xs px-2 py-1 rounded mt-2 ${
                  table.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {table.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
```

### 3. Reservation Lookup Modal

```tsx
{/* Reservation Lookup Modal */}
{showReservationModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Cari Reservasi</h2>
        <button onClick={() => setShowReservationModal(false)}>
          <FaTimes className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      
      <div className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={reservationSearch}
              onChange={(e) => setReservationSearch(e.target.value)}
              placeholder="Cari nomor reservasi, nama, atau telepon..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg"
            />
          </div>
        </div>
        
        {/* Filter by Date */}
        <div className="flex gap-4 mb-6">
          <input
            type="date"
            value={reservationFilterDate}
            onChange={(e) => setReservationFilterDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
          
          <select
            value={reservationFilterStatus}
            onChange={(e) => setReservationFilterStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="confirmed">Confirmed</option>
            <option value="seated">Seated</option>
            <option value="all">Semua Status</option>
          </select>
        </div>
        
        {/* Reservations List */}
        <div className="space-y-3">
          {filteredReservations.map((reservation) => (
            <button
              key={reservation.id}
              onClick={() => {
                setSelectedReservation(reservation);
                if (reservation.table) {
                  setSelectedTable(reservation.table);
                }
                setGuestCount(reservation.guestCount);
                setShowReservationModal(false);
              }}
              className="w-full p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg">{reservation.reservationNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      reservation.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {reservation.status}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{reservation.customerName}</p>
                  <p className="text-sm text-gray-600">{reservation.customerPhone}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>
                      <FaCalendar className="inline w-3 h-3 mr-1" />
                      {new Date(reservation.reservationDate).toLocaleDateString('id-ID')}
                    </span>
                    <span>
                      <FaClock className="inline w-3 h-3 mr-1" />
                      {reservation.reservationTime}
                    </span>
                    <span>
                      <FaUsers className="inline w-3 h-3 mr-1" />
                      {reservation.guestCount} tamu
                    </span>
                    {reservation.tableNumber && (
                      <span>
                        <MdTableRestaurant className="inline w-3 h-3 mr-1" />
                        Meja {reservation.tableNumber}
                      </span>
                    )}
                  </div>
                  {reservation.depositAmount > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      Deposit: {formatCurrency(reservation.depositAmount)}
                    </p>
                  )}
                </div>
                <FaChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
```

### 4. Updated Cart Summary with Service Charge

```tsx
{/* Cart Summary */}
<div className="border-t pt-4 space-y-2">
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">Subtotal:</span>
    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
  </div>
  
  {calculateDiscount() > 0 && (
    <div className="flex justify-between text-sm text-green-600">
      <span>Diskon:</span>
      <span>- {formatCurrency(calculateDiscount())}</span>
    </div>
  )}
  
  {/* Service Charge (if table selected) */}
  {selectedTable && serviceChargePercentage > 0 && (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">Service Charge ({serviceChargePercentage}%):</span>
      <span className="font-medium">{formatCurrency(calculateServiceCharge())}</span>
    </div>
  )}
  
  <div className="flex justify-between text-lg font-bold border-t pt-2">
    <span>Total:</span>
    <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
  </div>
  
  {/* Table & Guest Info */}
  {selectedTable && (
    <div className="text-xs text-gray-500 pt-2 border-t">
      <p>Meja: {selectedTable.tableNumber} ({selectedTable.area})</p>
      {guestCount > 0 && <p>Jumlah Tamu: {guestCount} orang</p>}
    </div>
  )}
  
  {selectedReservation && (
    <div className="text-xs text-blue-600 pt-2 border-t">
      <p>Reservasi: {selectedReservation.reservationNumber}</p>
      <p>{selectedReservation.customerName}</p>
    </div>
  )}
</div>
```

## 🔧 Backend API Updates

### 1. Update Checkout API

```typescript
// pages/api/pos/cashier/checkout.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    cart,
    paymentMethod,
    cashReceived,
    customerType,
    selectedMember,
    selectedVoucher,
    selectedTable,
    selectedReservation,
    guestCount,
    serviceChargePercentage,
    transactionType = 'sale'
  } = req.body;

  try {
    const { Transaction, Table, Reservation } = db;
    
    // Calculate amounts
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    
    if (customerType === 'member' && selectedMember) {
      discount += (subtotal * selectedMember.discount) / 100;
    }
    
    if (selectedVoucher) {
      if (subtotal >= selectedVoucher.minPurchase) {
        if (selectedVoucher.type === 'percentage') {
          discount += (subtotal * selectedVoucher.value) / 100;
        } else {
          discount += selectedVoucher.value;
        }
      }
    }
    
    // Calculate service charge if table selected
    const serviceCharge = selectedTable && serviceChargePercentage 
      ? ((subtotal - discount) * serviceChargePercentage) / 100 
      : 0;
    
    const total = subtotal - discount + serviceCharge;
    
    // Create transaction
    const transaction = await Transaction.create({
      transactionNumber: `TRX-${Date.now()}`,
      transactionType,
      subtotal,
      discount,
      serviceCharge,
      serviceChargePercentage,
      total,
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : total,
      change: paymentMethod === 'cash' ? parseFloat(cashReceived) - total : 0,
      customerType,
      customerId: selectedMember?.id,
      voucherId: selectedVoucher?.id,
      tableId: selectedTable?.id,
      tableNumber: selectedTable?.tableNumber,
      reservationId: selectedReservation?.id,
      reservationNumber: selectedReservation?.reservationNumber,
      guestCount,
      items: cart,
      status: 'completed'
    });
    
    // Update table status if table selected
    if (selectedTable) {
      await Table.update(
        { status: 'occupied' },
        { where: { id: selectedTable.id } }
      );
      
      // Create table session
      await db.TableSession.create({
        tableId: selectedTable.id,
        transactionId: transaction.id,
        startTime: new Date(),
        guestCount,
        status: 'active'
      });
    }
    
    // Update reservation status if reservation linked
    if (selectedReservation) {
      await Reservation.update(
        { 
          status: 'seated',
          actualArrivalTime: new Date()
        },
        { where: { id: selectedReservation.id } }
      );
    }
    
    // Update product stock
    for (const item of cart) {
      await db.Product.decrement('stock', {
        by: item.quantity,
        where: { id: item.id }
      });
    }
    
    return res.status(200).json({
      success: true,
      receipt: transaction,
      message: 'Transaction completed successfully'
    });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process transaction'
    });
  }
}
```

### 2. Complete Transaction API (untuk close table)

```typescript
// pages/api/pos/transactions/[id]/complete.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { Transaction, Table, Reservation, TableSession } = db;
    
    const transaction = await Transaction.findByPk(id);
    
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }
    
    // Update table status to available
    if (transaction.tableId) {
      await Table.update(
        { status: 'available' },
        { where: { id: transaction.tableId } }
      );
      
      // Close table session
      await TableSession.update(
        { 
          endTime: new Date(),
          status: 'completed'
        },
        { where: { transactionId: transaction.id } }
      );
    }
    
    // Update reservation status to completed
    if (transaction.reservationId) {
      await Reservation.update(
        { 
          status: 'completed',
          completedAt: new Date()
        },
        { where: { id: transaction.reservationId } }
      );
    }
    
    return res.status(200).json({
      success: true,
      message: 'Transaction completed and table released'
    });
    
  } catch (error) {
    console.error('Complete transaction error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete transaction'
    });
  }
}
```

### 3. Get Available Tables API

```typescript
// pages/api/pos/tables/available.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { Table } = db;
    const { floor, area, minCapacity } = req.query;
    
    const where: any = {
      isActive: true,
      status: 'available'
    };
    
    if (floor) where.floor = parseInt(floor as string);
    if (area) where.area = area;
    if (minCapacity) {
      where.capacity = {
        [db.Sequelize.Op.gte]: parseInt(minCapacity as string)
      };
    }
    
    const tables = await Table.findAll({
      where,
      order: [['tableNumber', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: tables
    });
    
  } catch (error) {
    console.error('Get available tables error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch available tables'
    });
  }
}
```

### 4. Search Reservations API

```typescript
// pages/api/pos/reservations/search.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { Reservation, Table } = db;
    const { search, date, status } = req.query;
    
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status;
    } else {
      where.status = {
        [db.Sequelize.Op.in]: ['confirmed', 'seated']
      };
    }
    
    if (date) {
      where.reservationDate = date;
    } else {
      // Default to today
      where.reservationDate = new Date().toISOString().split('T')[0];
    }
    
    if (search) {
      where[db.Sequelize.Op.or] = [
        { reservationNumber: { [db.Sequelize.Op.like]: `%${search}%` } },
        { customerName: { [db.Sequelize.Op.like]: `%${search}%` } },
        { customerPhone: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }
    
    const reservations = await Reservation.findAll({
      where,
      include: [{ model: Table, as: 'table' }],
      order: [['reservationTime', 'ASC']]
    });
    
    return res.status(200).json({
      success: true,
      data: reservations
    });
    
  } catch (error) {
    console.error('Search reservations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search reservations'
    });
  }
}
```

## 📝 Receipt/Struk Updates

### Updated Receipt Template

```tsx
// Receipt dengan info table dan reservation
const receiptTemplate = `
========================================
        ${businessInfo.name}
========================================
${businessInfo.address}
Tel: ${businessInfo.phone}

----------------------------------------
No. Transaksi: ${transaction.transactionNumber}
Tanggal: ${new Date().toLocaleString('id-ID')}
Kasir: ${cashier.name}

${transaction.tableNumber ? `
Meja: ${transaction.tableNumber}
Jumlah Tamu: ${transaction.guestCount} orang
` : ''}

${transaction.reservationNumber ? `
Reservasi: ${transaction.reservationNumber}
Atas Nama: ${transaction.customerName}
` : ''}

----------------------------------------
ITEM                    QTY    SUBTOTAL
----------------------------------------
${transaction.items.map(item => `
${item.name.padEnd(20)} ${item.quantity.toString().padStart(3)} ${formatCurrency(item.subtotal).padStart(12)}
`).join('')}
----------------------------------------
Subtotal:              ${formatCurrency(transaction.subtotal).padStart(12)}
${transaction.discount > 0 ? `Diskon:                ${formatCurrency(transaction.discount).padStart(12)}` : ''}
${transaction.serviceCharge > 0 ? `Service (${transaction.serviceChargePercentage}%):        ${formatCurrency(transaction.serviceCharge).padStart(12)}` : ''}
----------------------------------------
TOTAL:                 ${formatCurrency(transaction.total).padStart(12)}

Pembayaran: ${transaction.paymentMethod.toUpperCase()}
${transaction.paymentMethod === 'cash' ? `
Tunai:                 ${formatCurrency(transaction.cashReceived).padStart(12)}
Kembali:               ${formatCurrency(transaction.change).padStart(12)}
` : ''}

========================================
      Terima Kasih Atas Kunjungan
           Anda! Sampai Jumpa
========================================
`;
```

## 🧪 Testing Scenarios

### Test 1: Walk-in dengan Table Selection
1. Buka POS Cashier
2. Klik "Pilih Meja" → Pilih meja yang available
3. Tambah produk ke cart
4. Checkout → Bayar
5. Verify: Table status berubah ke "occupied"
6. Verify: Transaction tercatat dengan tableId
7. Verify: Struk menampilkan info meja

### Test 2: Customer dengan Reservasi
1. Buka POS Cashier
2. Klik "Link Reservasi" → Cari reservasi hari ini
3. Pilih reservasi → Auto-assign table
4. Tambah produk ke cart
5. Checkout → Bayar
6. Verify: Reservation status berubah ke "seated" lalu "completed"
7. Verify: Table status update
8. Verify: Transaction link ke reservation

### Test 3: Deposit Payment
1. Customer booking reservasi via halaman Reservations
2. Customer datang bayar deposit
3. Kasir buka POS → Pilih "Deposit Payment"
4. Link ke reservasi
5. Input jumlah deposit
6. Process payment
7. Verify: Reservation status update ke "confirmed"
8. Verify: Deposit amount tercatat

### Test 4: Service Charge Calculation
1. Pilih meja
2. Tambah produk (subtotal: Rp 100,000)
3. Apply member discount 10% (discount: Rp 10,000)
4. Service charge 10% (dari Rp 90,000 = Rp 9,000)
5. Total: Rp 99,000
6. Verify calculation correct

## 📊 Reports Integration

### Sales by Table Report
```sql
SELECT 
  t.tableNumber,
  t.area,
  t.floor,
  COUNT(tr.id) as totalTransactions,
  SUM(tr.total) as totalSales,
  AVG(tr.total) as avgTransactionValue,
  SUM(tr.guestCount) as totalGuests
FROM transactions tr
JOIN tables t ON tr.tableId = t.id
WHERE tr.createdAt BETWEEN :startDate AND :endDate
GROUP BY t.id
ORDER BY totalSales DESC;
```

### Reservation Conversion Report
```sql
SELECT 
  r.reservationNumber,
  r.customerName,
  r.reservationDate,
  r.status,
  r.depositAmount,
  tr.transactionNumber,
  tr.total as finalAmount,
  (tr.total - r.depositAmount) as remainingPayment
FROM reservations r
LEFT JOIN transactions tr ON r.id = tr.reservationId
WHERE r.reservationDate BETWEEN :startDate AND :endDate
ORDER BY r.reservationDate DESC;
```

## 🎯 Next Steps

1. **Implement Database Migration** - Run migration untuk add fields
2. **Update Transaction Model** - Add associations dan methods
3. **Update POS UI** - Implement table & reservation selection
4. **Update Checkout API** - Handle table & reservation logic
5. **Test Integration** - Test all scenarios
6. **Update Reports** - Add table & reservation analytics
7. **Train Staff** - Document dan training untuk kasir

## 📚 Related Documentation

- `IMPLEMENTATION_SUMMARY.md` - Table & Reservation implementation
- `API_ENDPOINTS_COMPLETE.md` - API documentation
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full system overview

---

**Status:** Ready for Implementation
**Priority:** High
**Estimated Time:** 2-3 days for full implementation
