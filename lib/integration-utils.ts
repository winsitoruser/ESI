/**
 * integration-utils.ts
 * 
 * Utilitas untuk memastikan integrasi yang mulus antar modul FARMAX
 * Memfasilitasi komunikasi antar modul tanpa dependensi ketat
 */

import { useRouter } from 'next/router';

// Type untuk message yang dikirim antar module
export interface ModuleMessage {
  source: string;
  target: string;
  action: string;
  payload: any;
  timestamp: number;
}

// Tipe module yang ada dalam sistem
export type ModuleType = 
  | 'pos' 
  | 'inventory' 
  | 'purchasing' 
  | 'finance' 
  | 'customer' 
  | 'reports' 
  | 'scheduler'
  | 'staff'
  | 'billing';

// Queue pesan untuk komunikasi antar modul
let messageQueue: ModuleMessage[] = [];
const subscribers: Record<string, ((message: ModuleMessage) => void)[]> = {};

/**
 * Mengirim pesan dari satu modul ke modul lain
 */
export const sendModuleMessage = (
  source: ModuleType,
  target: ModuleType,
  action: string,
  payload: any
): void => {
  const message: ModuleMessage = {
    source,
    target,
    action,
    payload,
    timestamp: Date.now()
  };
  
  messageQueue.push(message);
  
  // Notifikasi subscriber jika ada
  if (subscribers[target]) {
    subscribers[target].forEach(callback => callback(message));
  }
  
  // Log untuk debugging
  console.log(`[Module Integration] Message sent from ${source} to ${target}: ${action}`);
};

/**
 * Subscribe ke pesan untuk modul tertentu
 */
export const subscribeToMessages = (
  module: ModuleType,
  callback: (message: ModuleMessage) => void
): () => void => {
  if (!subscribers[module]) {
    subscribers[module] = [];
  }
  
  subscribers[module].push(callback);
  
  // Return unsubscribe function
  return () => {
    if (subscribers[module]) {
      subscribers[module] = subscribers[module].filter(cb => cb !== callback);
    }
  };
};

/**
 * Hook untuk navigasi dengan context antar modul
 */
export const useModuleNavigation = () => {
  const router = useRouter();
  
  const navigateWithContext = (
    targetModule: ModuleType, 
    path: string, 
    context?: Record<string, any>
  ) => {
    // Simpan context di sessionStorage untuk diambil oleh modul target
    if (context) {
      sessionStorage.setItem(`${targetModule}_context`, JSON.stringify({
        source: router.pathname.split('/')[1] as ModuleType,
        timestamp: Date.now(),
        data: context
      }));
    }
    
    // Navigasi ke path target
    router.push(path);
  };
  
  const getNavigationContext = () => {
    const currentModule = router.pathname.split('/')[1] as ModuleType;
    const contextData = sessionStorage.getItem(`${currentModule}_context`);
    
    if (contextData) {
      try {
        return JSON.parse(contextData);
      } catch (e) {
        console.error('Error parsing navigation context', e);
        return null;
      }
    }
    
    return null;
  };
  
  return {
    navigateWithContext,
    getNavigationContext
  };
};

/**
 * Fungsi bantuan untuk integrasi data produk antara inventory dan POS
 */
export const syncProductData = async (productId: string): Promise<void> => {
  try {
    // Simulasi sinkronisasi data produk antara inventory dan POS
    console.log(`[Integration] Syncing product data for ID: ${productId}`);
    // Actual implementation would involve fetching from API/database
    
    // Notify relevant modules
    sendModuleMessage('inventory', 'pos', 'PRODUCT_UPDATED', { productId });
    
  } catch (error) {
    console.error('[Integration] Error syncing product data:', error);
  }
};

/**
 * Fungsi bantuan untuk integrasi transaksi POS dengan finance/billing
 */
export const syncTransactionData = async (transactionId: string): Promise<void> => {
  try {
    console.log(`[Integration] Syncing transaction data for ID: ${transactionId}`);
    // Actual implementation would involve fetching from API/database
    
    // Notify relevant modules
    sendModuleMessage('pos', 'finance', 'TRANSACTION_COMPLETED', { transactionId });
    
  } catch (error) {
    console.error('[Integration] Error syncing transaction data:', error);
  }
};

/**
 * Fungsi bantuan untuk integrasi purchasing order dengan inventory
 */
export const syncPurchaseOrderWithInventory = async (orderId: string): Promise<void> => {
  try {
    console.log(`[Integration] Syncing purchase order data for ID: ${orderId}`);
    // Actual implementation would involve fetching from API/database
    
    // Notify relevant modules
    sendModuleMessage('purchasing', 'inventory', 'PURCHASE_ORDER_RECEIVED', { orderId });
    
  } catch (error) {
    console.error('[Integration] Error syncing purchase order data:', error);
  }
};

// Fungsi memastikan konsistensi ID penting dalam sistem
export const getConsistentId = (entityType: string, customPrefix?: string): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const prefix = customPrefix || entityType.substring(0, 3).toUpperCase();
  
  return `${prefix}-${timestamp}-${random}`;
};
