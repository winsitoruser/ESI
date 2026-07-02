/**
 * POS Offline Cache System
 * 
 * This module provides comprehensive caching mechanisms for the POS module
 * to ensure continuous operation during offline periods. It implements:
 * 
 * 1. IndexedDB-based persistent caching for product data, customer info, and transactions
 * 2. Transaction queue system for offline sales to be synced when back online
 * 3. Periodic background sync when connectivity is restored
 * 4. Conflict resolution strategies for data reconciliation
 */

import { v4 as uuidv4 } from 'uuid';
import { openDB, IDBPDatabase } from 'idb';

// Define cache schema and versions
const DB_NAME = 'farmanesia-pos-offline';
const DB_VERSION = 1;

// Cache store names
const STORES = {
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  TRANSACTIONS: 'transactions',
  SYNC_QUEUE: 'syncQueue',
  SETTINGS: 'settings',
  META: 'meta'
};

// Offline transaction status values
export enum OfflineTransactionStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

// Interface definitions
export interface OfflineTransaction {
  id: string;
  data: any;
  createdAt: number;
  syncedAt?: number;
  status: OfflineTransactionStatus;
  retryCount: number;
  error?: string;
}

export interface CacheMetadata {
  lastUpdated: number;
  version: number;
  source: string;
}

export interface CachedProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
  metadata: CacheMetadata;
}

export interface CachedCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  points?: number;
  metadata: CacheMetadata;
}

// Main cache service class
export class POSOfflineCache {
  private db: IDBPDatabase | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkStatus: boolean = navigator.onLine;
  
  // Singleton instance
  private static instance: POSOfflineCache;
  
  private constructor() {
    // Private constructor to enforce singleton
    this.attachNetworkListeners();
  }
  
  public static getInstance(): POSOfflineCache {
    if (!POSOfflineCache.instance) {
      POSOfflineCache.instance = new POSOfflineCache();
    }
    return POSOfflineCache.instance;
  }
  
  /**
   * Initialize the offline cache system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.isInitializing) return this.initPromise as Promise<void>;
    
    this.isInitializing = true;
    this.initPromise = this.initializeDB();
    
    try {
      await this.initPromise;
      this.isInitialized = true;
      this.isInitializing = false;
      
      // Start background sync if online
      if (this.networkStatus) {
        this.startPeriodicSync();
      }
      
      console.log('POS offline cache initialized successfully');
    } catch (error) {
      this.isInitializing = false;
      console.error('Failed to initialize POS offline cache:', error);
      throw error;
    }
    
    return this.initPromise;
  }
  
  /**
   * Initialize the IndexedDB database
   */
  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object stores if they don't exist
          
          // Products store
          if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
            const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
            productStore.createIndex('barcode', 'barcode', { unique: false });
            productStore.createIndex('category', 'category', { unique: false });
            productStore.createIndex('name', 'name', { unique: false });
            productStore.createIndex('updatedAt', 'metadata.lastUpdated', { unique: false });
          }
          
          // Customers store
          if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
            const customerStore = db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
            customerStore.createIndex('phone', 'phone', { unique: false });
            customerStore.createIndex('email', 'email', { unique: false });
            customerStore.createIndex('name', 'name', { unique: false });
            customerStore.createIndex('updatedAt', 'metadata.lastUpdated', { unique: false });
          }
          
          // Transactions store
          if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
            const transactionStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
            transactionStore.createIndex('createdAt', 'createdAt', { unique: false });
            transactionStore.createIndex('customerId', 'customerId', { unique: false });
            transactionStore.createIndex('status', 'status', { unique: false });
          }
          
          // Sync queue store
          if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
            const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
            syncQueueStore.createIndex('status', 'status', { unique: false });
            syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          
          // Settings store
          if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
          }
          
          // Metadata store
          if (!db.objectStoreNames.contains(STORES.META)) {
            db.createObjectStore(STORES.META, { keyPath: 'key' });
          }
        }
      });
      
      // Initialize metadata if needed
      await this.initMeta();
      
    } catch (error) {
      console.error('Error initializing IndexedDB:', error);
      throw new Error('Failed to initialize offline cache database');
    }
  }
  
  /**
   * Initialize metadata for the cache
   */
  private async initMeta(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Check if metadata exists
      const meta = await this.db.get(STORES.META, 'cacheInfo');
      
      if (!meta) {
        // Create initial metadata
        await this.db.put(STORES.META, {
          key: 'cacheInfo',
          created: Date.now(),
          lastSync: null,
          version: DB_VERSION,
          productCount: 0,
          customerCount: 0,
          transactionCount: 0,
          pendingSync: 0
        });
      }
    } catch (error) {
      console.error('Error initializing metadata:', error);
    }
  }
  
  /**
   * Network status listeners
   */
  private attachNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }
  
  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('Network connection restored');
    this.networkStatus = true;
    this.startPeriodicSync();
    
    // Notify application that we're back online
    this.dispatchNetworkEvent('online');
  }
  
  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('Network connection lost, switching to offline mode');
    this.networkStatus = false;
    this.stopPeriodicSync();
    
    // Notify application that we're offline
    this.dispatchNetworkEvent('offline');
  }
  
  /**
   * Dispatch network status change events
   */
  private dispatchNetworkEvent(status: 'online' | 'offline'): void {
    window.dispatchEvent(new CustomEvent('pos-network-status', { 
      detail: { status, timestamp: Date.now() }
    }));
  }
  
  /**
   * Start periodic background sync
   */
  public startPeriodicSync(intervalMs: number = 60000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      if (this.networkStatus) {
        this.syncPendingTransactions().catch(console.error);
      }
    }, intervalMs);
    
    // Also trigger an immediate sync
    if (this.networkStatus) {
      this.syncPendingTransactions().catch(console.error);
    }
  }
  
  /**
   * Stop periodic background sync
   */
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Sync pending offline transactions to the server
   */
  public async syncPendingTransactions(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    remaining: number;
  }> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    if (!this.networkStatus) {
      return { success: false, synced: 0, failed: 0, remaining: 0 };
    }
    
    try {
      // Get all pending transactions
      const tx = this.db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const pendingTransactions = await tx.store.index('status').getAll(OfflineTransactionStatus.PENDING);
      
      let synced = 0;
      let failed = 0;
      
      // Process each pending transaction
      for (const transaction of pendingTransactions) {
        try {
          // Mark as syncing
          transaction.status = OfflineTransactionStatus.SYNCING;
          await tx.store.put(transaction);
          
          // Attempt to send to server
          const result = await this.sendTransactionToServer(transaction);
          
          if (result.success) {
            // Update as synced
            transaction.status = OfflineTransactionStatus.SYNCED;
            transaction.syncedAt = Date.now();
            await tx.store.put(transaction);
            synced++;
          } else {
            // Mark as failed
            transaction.status = OfflineTransactionStatus.FAILED;
            transaction.retryCount += 1;
            transaction.error = result.error;
            await tx.store.put(transaction);
            failed++;
          }
        } catch (error) {
          console.error('Error syncing transaction:', error);
          // Update error status
          transaction.status = OfflineTransactionStatus.FAILED;
          transaction.retryCount += 1;
          transaction.error = error instanceof Error ? error.message : 'Unknown error';
          await tx.store.put(transaction);
          failed++;
        }
      }
      
      // Get remaining count
      const remainingTransactions = await tx.store.index('status').count(OfflineTransactionStatus.PENDING);
      
      // Update metadata
      const meta = await this.db.get(STORES.META, 'cacheInfo');
      if (meta) {
        meta.lastSync = Date.now();
        meta.pendingSync = remainingTransactions;
        await this.db.put(STORES.META, meta);
      }
      
      return {
        success: true,
        synced,
        failed,
        remaining: remainingTransactions
      };
    } catch (error) {
      console.error('Error during sync process:', error);
      return { success: false, synced: 0, failed: 0, remaining: 0 };
    }
  }
  
  /**
   * Send a transaction to the server
   */
  private async sendTransactionToServer(transaction: OfflineTransaction): Promise<{ 
    success: boolean; 
    error?: string;
  }> {
    try {
      // Implementation depends on the API structure
      const response = await fetch('/api/pos/transactions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: transaction.data,
          offlineId: transaction.id,
          createdAt: transaction.createdAt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: errorData.message || `Server responded with ${response.status}`
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed'
      };
    }
  }
  
  /**
   * Add a transaction to the sync queue
   */
  public async queueTransaction(transactionData: any): Promise<string> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const transactionId = uuidv4();
    
    const offlineTransaction: OfflineTransaction = {
      id: transactionId,
      data: transactionData,
      createdAt: Date.now(),
      status: OfflineTransactionStatus.PENDING,
      retryCount: 0
    };
    
    // Store in sync queue
    await this.db.put(STORES.SYNC_QUEUE, offlineTransaction);
    
    // Store the transaction itself
    await this.db.put(STORES.TRANSACTIONS, {
      ...transactionData,
      id: transactionId,
      createdAt: Date.now(),
      isOffline: true
    });
    
    // Update metadata
    const meta = await this.db.get(STORES.META, 'cacheInfo');
    if (meta) {
      meta.transactionCount = (meta.transactionCount || 0) + 1;
      meta.pendingSync = (meta.pendingSync || 0) + 1;
      await this.db.put(STORES.META, meta);
    }
    
    // If we're online, trigger a sync
    if (this.networkStatus) {
      this.syncPendingTransactions().catch(console.error);
    }
    
    return transactionId;
  }
  
  /**
   * Cache products for offline use
   */
  public async cacheProducts(products: Array<Partial<CachedProduct>>): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction(STORES.PRODUCTS, 'readwrite');
    const now = Date.now();
    
    let count = 0;
    
    for (const product of products) {
      // Ensure the product has all required fields
      if (!product.id) continue;
      
      // Get existing product if any
      const existingProduct = await tx.store.get(product.id);
      
      const metadata: CacheMetadata = {
        lastUpdated: now,
        version: existingProduct?.metadata?.version ? existingProduct.metadata.version + 1 : 1,
        source: 'api'
      };
      
      // Merge with existing or create new
      const updatedProduct: CachedProduct = {
        ...(existingProduct || {}),
        ...product,
        metadata
      } as CachedProduct;
      
      await tx.store.put(updatedProduct);
      count++;
    }
    
    // Update metadata
    const meta = await this.db.get(STORES.META, 'cacheInfo');
    if (meta) {
      meta.productCount = await tx.store.count();
      await this.db.put(STORES.META, meta);
    }
    
    console.log(`Cached ${count} products for offline use`);
  }
  
  /**
   * Get cached products
   */
  public async getCachedProducts(options: {
    search?: string;
    category?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  } = {}): Promise<CachedProduct[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      let products: CachedProduct[] = [];
      
      if (options.search) {
        // Do a search across multiple indices
        const searchTerm = options.search.toLowerCase();
        
        // Get all products and filter in memory
        // This is not efficient for large datasets but works for POS with limited products
        const allProducts = await this.db.getAll(STORES.PRODUCTS);
        products = allProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm) || 
          (product.barcode && product.barcode.toLowerCase().includes(searchTerm))
        );
        
        if (options.category) {
          products = products.filter(p => p.category === options.category);
        }
      } else if (options.category) {
        // Get by category
        const categoryIndex = this.db.transaction(STORES.PRODUCTS).store.index('category');
        products = await categoryIndex.getAll(options.category);
      } else {
        // Get all products
        products = await this.db.getAll(STORES.PRODUCTS);
      }
      
      // Sort products if requested
      if (options.sortBy) {
        products.sort((a: any, b: any) => {
          const aVal = a[options.sortBy as keyof CachedProduct];
          const bVal = b[options.sortBy as keyof CachedProduct];
          
          if (aVal < bVal) return options.sortDirection === 'desc' ? 1 : -1;
          if (aVal > bVal) return options.sortDirection === 'desc' ? -1 : 1;
          return 0;
        });
      }
      
      // Apply pagination
      if (options.limit !== undefined) {
        const offset = options.offset || 0;
        products = products.slice(offset, offset + options.limit);
      }
      
      return products;
    } catch (error) {
      console.error('Error fetching cached products:', error);
      return [];
    }
  }
  
  /**
   * Cache customers for offline use
   */
  public async cacheCustomers(customers: Array<Partial<CachedCustomer>>): Promise<void> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction(STORES.CUSTOMERS, 'readwrite');
    const now = Date.now();
    
    let count = 0;
    
    for (const customer of customers) {
      // Ensure the customer has all required fields
      if (!customer.id) continue;
      
      // Get existing customer if any
      const existingCustomer = await tx.store.get(customer.id);
      
      const metadata: CacheMetadata = {
        lastUpdated: now,
        version: existingCustomer?.metadata?.version ? existingCustomer.metadata.version + 1 : 1,
        source: 'api'
      };
      
      // Merge with existing or create new
      const updatedCustomer: CachedCustomer = {
        ...(existingCustomer || {}),
        ...customer,
        metadata
      } as CachedCustomer;
      
      await tx.store.put(updatedCustomer);
      count++;
    }
    
    // Update metadata
    const meta = await this.db.get(STORES.META, 'cacheInfo');
    if (meta) {
      meta.customerCount = await tx.store.count();
      await this.db.put(STORES.META, meta);
    }
    
    console.log(`Cached ${count} customers for offline use`);
  }
  
  /**
   * Search cached customers
   */
  public async searchCustomers(searchTerm: string): Promise<CachedCustomer[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Get all customers and filter in memory
      // This is not efficient for large datasets but works for POS with limited customers
      const allCustomers = await this.db.getAll(STORES.CUSTOMERS);
      const searchTermLower = searchTerm.toLowerCase();
      
      return allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(searchTermLower) || 
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(searchTermLower))
      );
    } catch (error) {
      console.error('Error searching cached customers:', error);
      return [];
    }
  }
  
  /**
   * Get offline transactions
   */
  public async getOfflineTransactions(options: {
    status?: OfflineTransactionStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<OfflineTransaction[]> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      let transactions: OfflineTransaction[];
      
      if (options.status) {
        // Get by status
        transactions = await this.db.transaction(STORES.SYNC_QUEUE).store.index('status').getAll(options.status);
      } else {
        // Get all
        transactions = await this.db.getAll(STORES.SYNC_QUEUE);
      }
      
      // Sort by creation date (newest first)
      transactions.sort((a, b) => b.createdAt - a.createdAt);
      
      // Apply pagination
      if (options.limit !== undefined) {
        const offset = options.offset || 0;
        transactions = transactions.slice(offset, offset + options.limit);
      }
      
      return transactions;
    } catch (error) {
      console.error('Error fetching offline transactions:', error);
      return [];
    }
  }
  
  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    productCount: number;
    customerCount: number;
    transactionCount: number;
    pendingSync: number;
    lastSync: number | null;
    lastUpdated: number;
    offlineCapable: boolean;
  }> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const meta = await this.db.get(STORES.META, 'cacheInfo');
      const pendingCount = await this.db.transaction(STORES.SYNC_QUEUE).store.index('status').count(OfflineTransactionStatus.PENDING);
      
      return {
        productCount: await this.db.count(STORES.PRODUCTS),
        customerCount: await this.db.count(STORES.CUSTOMERS),
        transactionCount: await this.db.count(STORES.TRANSACTIONS),
        pendingSync: pendingCount,
        lastSync: meta?.lastSync || null,
        lastUpdated: meta?.lastUpdated || Date.now(),
        offlineCapable: (await this.db.count(STORES.PRODUCTS)) > 0
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        productCount: 0,
        customerCount: 0,
        transactionCount: 0,
        pendingSync: 0,
        lastSync: null,
        lastUpdated: Date.now(),
        offlineCapable: false
      };
    }
  }
  
  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<boolean> {
    if (!this.db) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Only clear products and customers, keep transactions and queue for sync
      const tx = this.db.transaction([STORES.PRODUCTS, STORES.CUSTOMERS, STORES.META], 'readwrite');
      
      await tx.objectStore(STORES.PRODUCTS).clear();
      await tx.objectStore(STORES.CUSTOMERS).clear();
      
      // Update metadata
      const meta = await this.db.get(STORES.META, 'cacheInfo');
      if (meta) {
        meta.productCount = 0;
        meta.customerCount = 0;
        meta.lastUpdated = Date.now();
        await tx.objectStore(STORES.META).put(meta);
      }
      
      await tx.done;
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }
}

// Export the singleton instance
export const posOfflineCache = POSOfflineCache.getInstance();
