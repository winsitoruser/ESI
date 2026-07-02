/**
 * Script untuk menambahkan dummy produk ke stocktake
 * 
 * Cara penggunaan:
 * 1. Buka halaman stocktake di browser: http://localhost:7071/inventory/stocktake
 * 2. Buka konsol developer (F12 atau klik kanan -> Inspect -> Console)
 * 3. Copy-paste kode ini di konsol atau jalankan dengan menambahkan tag script
 */

(function() {
  console.log('🔶 Menambahkan produk dummy ke Stock Opname...');
  
  // Data produk dummy dengan informasi lengkap
  const dummyProducts = [
    {
      id: 'dummy-1',
      productId: '5', // Amoksisilin 500mg
      productName: 'Amoksisilin 500mg',
      sku: 'MED005',
      unit: 'Kapsul',
      systemStock: 185,
      physicalStock: 180,
      variance: -5,
      hasVariance: true,
      reason: 'damage',
      locationId: 'warehouse',
      locationName: 'Gudang Utama',
      categoryId: '3',
      categoryName: 'Obat Keras',
      batchNumber: 'BX123456',
      expiryDate: new Date('2025-09-15'),
      notes: 'Beberapa kemasan rusak saat penyimpanan'
    },
    {
      id: 'dummy-2',
      productId: '8', // Vitamin C 1000mg
      productName: 'Vitamin C 1000mg',
      sku: 'SUP001',
      unit: 'Tablet',
      systemStock: 250,
      physicalStock: 250,
      variance: 0,
      hasVariance: false,
      locationId: 'display',
      locationName: 'Rak Display',
      categoryId: '4',
      categoryName: 'Suplemen',
      batchNumber: 'BX789012',
      expiryDate: new Date('2026-02-28')
    },
    {
      id: 'dummy-3',
      productId: '2', // Ambroxol Sirup
      productName: 'Ambroxol Sirup',
      sku: 'MED002',
      unit: 'Botol',
      systemStock: 120,
      physicalStock: 118,
      variance: -2,
      hasVariance: true,
      reason: 'expired',
      locationId: 'display',
      locationName: 'Rak Display',
      categoryId: '2',
      categoryName: 'Obat Bebas Terbatas',
      batchNumber: 'BX345678',
      expiryDate: new Date('2024-12-10'),
      notes: 'Dua botol kedaluwarsa ditemukan dan dipisahkan'
    },
    {
      id: 'dummy-4',
      productId: '10', // Antasida Suspensi
      productName: 'Antasida Suspensi',
      sku: 'MED010',
      unit: 'Botol',
      systemStock: 75,
      physicalStock: 77,
      variance: 2,
      hasVariance: true,
      reason: 'admin_error',
      locationId: 'pharmacy',
      locationName: 'Area Farmasi',
      categoryId: '1',
      categoryName: 'Obat Bebas',
      batchNumber: 'BX567890',
      expiryDate: new Date('2025-08-20'),
      notes: 'Kesalahan input saat penerimaan barang'
    },
    {
      id: 'dummy-5',
      productId: '15', // Masker N95
      productName: 'Masker N95',
      sku: 'AID001',
      unit: 'Kotak',
      systemStock: 50,
      physicalStock: 45,
      variance: -5,
      hasVariance: true,
      reason: 'theft',
      locationId: 'warehouse',
      locationName: 'Gudang Utama',
      categoryId: '5',
      categoryName: 'Alat Kesehatan',
      batchNumber: 'BX901234',
      expiryDate: new Date('2027-05-15'),
      notes: 'Dicurigai hilang saat pemindahan barang'
    },
    {
      id: 'dummy-6',
      productId: '4', // Cetirizine 10mg
      productName: 'Cetirizine 10mg',
      sku: 'MED004',
      unit: 'Strip',
      systemStock: 80,
      physicalStock: 80,
      variance: 0,
      hasVariance: false,
      locationId: 'display',
      locationName: 'Rak Display',
      categoryId: '2',
      categoryName: 'Obat Bebas Terbatas',
      batchNumber: 'BX234567',
      expiryDate: new Date('2025-11-30')
    },
    {
      id: 'dummy-7',
      productId: '13', // Losartan 50mg
      productName: 'Losartan 50mg',
      sku: 'MED013',
      unit: 'Tablet',
      systemStock: 300,
      physicalStock: 310,
      variance: 10,
      hasVariance: true,
      reason: 'admin_error',
      locationId: 'pharmacy',
      locationName: 'Area Farmasi',
      categoryId: '3',
      categoryName: 'Obat Keras',
      batchNumber: 'BX678901',
      expiryDate: new Date('2026-03-25'),
      notes: 'Kesalahan pencatatan pada pengurangan stok'
    },
    {
      id: 'dummy-8',
      productId: '16', // Plester Luka
      productName: 'Plester Luka',
      sku: 'AID003',
      unit: 'Kotak',
      systemStock: 100,
      physicalStock: 100,
      variance: 0,
      hasVariance: false,
      locationId: 'display',
      locationName: 'Rak Display',
      categoryId: '5',
      categoryName: 'Alat Kesehatan',
      batchNumber: 'BX123789',
      expiryDate: new Date('2026-12-31')
    },
    {
      id: 'dummy-9',
      productId: '7', // Metformin 500mg
      productName: 'Metformin 500mg',
      sku: 'MED007',
      unit: 'Tablet',
      systemStock: 450,
      physicalStock: 445,
      variance: -5,
      hasVariance: true,
      reason: 'damage',
      locationId: 'warehouse',
      locationName: 'Gudang Utama',
      categoryId: '3',
      categoryName: 'Obat Keras',
      batchNumber: 'BX456123',
      expiryDate: new Date('2025-10-15'),
      notes: 'Sebagian tablet hancur karena kelembaban'
    },
    {
      id: 'dummy-10',
      productId: '12', // Simvastatin 20mg
      productName: 'Simvastatin 20mg',
      sku: 'MED012',
      unit: 'Tablet',
      systemStock: 200,
      physicalStock: 200,
      variance: 0,
      hasVariance: false,
      locationId: 'pharmacy',
      locationName: 'Area Farmasi',
      categoryId: '3',
      categoryName: 'Obat Keras',
      batchNumber: 'BX789456',
      expiryDate: new Date('2026-01-15')
    }
  ];
  
  // Fungsi untuk menambahkan produk ke stocktake
  function addProductsToStocktake() {
    // Periksa apakah kita berada di halaman stocktake
    if (!window.location.pathname.includes('/inventory/stocktake')) {
      console.error('❌ Script harus dijalankan di halaman stocktake!');
      return;
    }
    
    // Coba akses state React komponen
    // Mengasumsikan state untuk stocktake items disimpan dalam React state
    let reactRoot;
    let reactInstance;
    
    try {
      // Coba mengambil komponen stocktake dengan querySelector
      const stocktakeElem = document.querySelector('#stocktake-container, [data-testid="stocktake-container"], main');
      
      if (!stocktakeElem) {
        throw new Error('Elemen stocktake tidak ditemukan');
      }
      
      // Update UI: Tambahkan produk langsung ke DOM
      const existingItems = document.querySelectorAll('table tr');
      const hasExistingItems = existingItems.length > 1; // Lebih dari header
      
      // Tampilkan toast sukses menggunakan UI framework yang ada
      function showSuccessToast(message) {
        // Cek jika component toast sudah ada
        const existingToastContainer = document.querySelector('[role="status"], .toast-container');
        
        if (existingToastContainer) {
          // Gunakan toast yang sudah ada
          const toastDiv = document.createElement('div');
          toastDiv.className = 'bg-green-50 text-green-800 rounded-md p-4 mb-3 flex items-center shadow-md border border-green-200';
          toastDiv.innerHTML = `
            <svg class="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <p>${message}</p>
          `;
          
          existingToastContainer.appendChild(toastDiv);
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            toastDiv.remove();
          }, 3000);
        } else {
          // Buat toast baru jika tidak ada container
          const toastContainer = document.createElement('div');
          toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col items-end';
          toastContainer.setAttribute('role', 'status');
          
          const toast = document.createElement('div');
          toast.className = 'bg-green-50 text-green-800 rounded-md p-4 shadow-md border border-green-200';
          toast.innerHTML = `
            <div class="flex">
              <svg class="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              <p>${message}</p>
            </div>
          `;
          
          toastContainer.appendChild(toast);
          document.body.appendChild(toastContainer);
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            document.body.removeChild(toastContainer);
          }, 3000);
        }
      }
      
      // Fungsi untuk menambahkan produk ke tabel
      function insertProductRow(item, tableBody) {
        const row = document.createElement('tr');
        const varianceClass = item.variance > 0 
          ? 'text-green-600' 
          : item.variance < 0 
            ? 'text-red-600' 
            : '';
            
        const varianceStatusBg = item.variance > 0 
          ? 'bg-green-100' 
          : item.variance < 0 
            ? 'bg-red-100' 
            : 'bg-blue-100';
            
        const varianceStatusText = item.variance > 0 
          ? 'text-green-800' 
          : item.variance < 0 
            ? 'text-red-800' 
            : 'text-blue-800';
            
        // Set row styling
        row.className = 'hover:bg-gray-50';
        row.setAttribute('data-product-id', item.productId);
        
        // Row content
        row.innerHTML = `
          <td class="px-4 py-2 text-sm">${item.productName}</td>
          <td class="px-4 py-2 text-sm text-gray-600">${item.sku}</td>
          <td class="px-4 py-2 text-sm">${item.unit}</td>
          <td class="px-4 py-2 text-sm">${item.locationName || 'N/A'}</td>
          <td class="px-4 py-2 text-sm">${item.systemStock}</td>
          <td class="px-4 py-2 text-sm">${item.physicalStock}</td>
          <td class="px-4 py-2 text-sm ${varianceClass} font-medium">
            <span class="px-2 py-1 rounded-full text-xs ${varianceStatusBg} ${varianceStatusText}">
              ${item.variance > 0 ? '+' : ''}${item.variance}
            </span>
          </td>
          <td class="px-4 py-2 text-sm">
            ${item.reason ? item.reason.replace('_', ' ') : '-'}
          </td>
          <td class="px-4 py-2 text-sm">${item.batchNumber || '-'}</td>
          <td class="px-4 py-2 text-sm">${item.expiryDate ? item.expiryDate.toLocaleDateString('id-ID') : '-'}</td>
          <td class="px-4 py-2 text-sm text-right">
            <button class="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </td>
        `;
        
        tableBody.appendChild(row);
      }
      
      // Cari tabel stocktake
      const stocktakeTable = document.querySelector('table tbody');
      
      if (stocktakeTable) {
        // Clean tabel jika diminta
        if (hasExistingItems && confirm('Hapus data stocktake yang sudah ada?')) {
          // Simpan header
          const header = stocktakeTable.querySelector('tr:first-child');
          stocktakeTable.innerHTML = '';
          if (header) {
            stocktakeTable.appendChild(header);
          }
        }
        
        // Tambahkan produk ke tabel
        let addedCount = 0;
        
        dummyProducts.forEach((item, index) => {
          setTimeout(() => {
            insertProductRow(item, stocktakeTable);
            addedCount++;
            
            console.log(`✅ Menambahkan produk: ${item.productName}`);
            
            if (addedCount === dummyProducts.length) {
              console.log('✨ Semua produk dummy berhasil ditambahkan!');
              showSuccessToast(`${dummyProducts.length} produk berhasil ditambahkan ke Stock Opname`);
              
              // Update summary box jika ada
              const variantCount = dummyProducts.filter(p => p.hasVariance).length;
              const summaryBox = document.querySelector('.stock-summary, [data-testid="stock-summary"]');
              
              if (summaryBox) {
                const totalEl = summaryBox.querySelector('[data-summary="total"]');
                const variantEl = summaryBox.querySelector('[data-summary="variant"]');
                
                if (totalEl) totalEl.textContent = dummyProducts.length.toString();
                if (variantEl) variantEl.textContent = variantCount.toString();
              }
            }
          }, index * 100); // Delay setiap penambahan untuk efek visual
        });
      } else {
        console.error('❌ Tabel stocktake tidak ditemukan!');
        alert('Tabel stocktake tidak ditemukan! Pastikan Anda berada di halaman yang benar.');
      }
      
    } catch (error) {
      console.error('❌ Error saat menambahkan produk dummy:', error);
      alert('Error saat menambahkan produk dummy: ' + error.message);
    }
  }

  // Jalankan fungsi utama
  addProductsToStocktake();
})();
