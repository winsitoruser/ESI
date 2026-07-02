class BluetoothPrinter {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;

  async connect(deviceId: string): Promise<boolean> {
    try {
      // Request the Bluetooth device
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['generic_access'] }],
        optionalServices: ['battery_service']
      });

      // Connect to the GATT server
      this.server = await this.device.gatt?.connect();
      
      if (!this.server) {
        throw new Error('Failed to connect to GATT server');
      }

      return true;
    } catch (error: any) {
      console.error('Bluetooth connection error:', error);
      throw new Error(`Failed to connect: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.server && this.server.connected) {
      await this.server.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  async print(data: string): Promise<void> {
    if (!this.server || !this.server.connected) {
      throw new Error('Printer not connected');
    }

    try {
      // For thermal printers, we typically need to find the right service/characteristic
      // This is a simplified example - actual implementation depends on printer protocol
      
      // Convert string to bytes
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      
      // For many thermal printers, they use a specific UUID for printing
      // This would need to be adjusted based on the actual printer model
      const serviceUuid = '000018f0-0000-1000-8000-00805f9b34fb'; // Example service UUID
      const characteristicUuid = '00002af1-0000-1000-8000-00805f9b34fb'; // Example characteristic UUID
      
      const service = await this.server.getPrimaryService(serviceUuid);
      this.characteristic = await service.getCharacteristic(characteristicUuid);
      
      // Write the data to the printer
      await this.characteristic.writeValue(bytes);
      
    } catch (error: any) {
      console.error('Print error:', error);
      throw new Error(`Failed to print: ${error.message}`);
    }
  }

  async printReceipt(receiptData: {
    transactionNumber: string;
    date: Date;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    cashReceived?: number;
    change?: number;
    cashier: string;
  }): Promise<void> {
    // ESC/POS commands for thermal printer
    const esc = '\x1B';
    const cut = esc + '\x69';
    const boldOn = esc + '\x45\x01';
    const boldOff = esc + '\x45\x00';
    const center = esc + '\x61\x01';
    const left = esc + '\x61\x00';
    const lineBreak = '\n';

    let receipt = '';
    
    // Header
    receipt += center + boldOn + 'BEDAGANG POS' + boldOff + lineBreak;
    receipt += 'Jl. Contoh No. 123' + lineBreak;
    receipt += 'Jakarta, Indonesia' + lineBreak;
    receipt += lineBreak;
    
    // Transaction info
    receipt += left + 'No: ' + receiptData.transactionNumber + lineBreak;
    receipt += 'Tanggal: ' + receiptData.date.toLocaleString('id-ID') + lineBreak;
    receipt += 'Kasir: ' + receiptData.cashier + lineBreak;
    receipt += '------------------------' + lineBreak;
    
    // Items
    receipt += boldOn + 'DETAIL PEMBELIAN' + boldOff + lineBreak;
    receipt += lineBreak;
    
    receiptData.items.forEach(item => {
      receipt += item.name + lineBreak;
      receipt += `  ${item.quantity} x Rp ${item.price.toLocaleString('id-ID')}` + lineBreak;
      receipt += `  = Rp ${item.subtotal.toLocaleString('id-ID')}` + lineBreak;
    });
    
    receipt += '------------------------' + lineBreak;
    
    // Totals
    receipt += 'Subtotal: Rp ' + receiptData.subtotal.toLocaleString('id-ID') + lineBreak;
    if (receiptData.discount > 0) {
      receipt += 'Diskon: Rp ' + receiptData.discount.toLocaleString('id-ID') + lineBreak;
    }
    receipt += boldOn + 'TOTAL: Rp ' + receiptData.total.toLocaleString('id-ID') + boldOff + lineBreak;
    receipt += lineBreak;
    
    // Payment
    receipt += 'Bayar: ' + receiptData.paymentMethod.toUpperCase() + lineBreak;
    if (receiptData.paymentMethod === 'cash' && receiptData.cashReceived) {
      receipt += 'Tunai: Rp ' + receiptData.cashReceived.toLocaleString('id-ID') + lineBreak;
      receipt += 'Kembali: Rp ' + (receiptData.change || 0).toLocaleString('id-ID') + lineBreak;
    }
    
    receipt += lineBreak;
    receipt += center + 'TERIMA KASIH' + lineBreak;
    receipt += 'SELAMAT BERBELANJA KEMBALI' + lineBreak;
    receipt += lineBreak + lineBreak + lineBreak;
    
    // Cut command
    receipt += cut;
    
    await this.print(receipt);
  }

  isConnected(): boolean {
    return this.server?.connected || false;
  }
}

export default BluetoothPrinter;
