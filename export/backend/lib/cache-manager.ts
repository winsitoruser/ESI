/**
 * Cache Manager untuk API Endpoints
 * 
 * Menyediakan fungsi caching untuk mengurangi panggilan database yang berulang
 * dengan dukungan untuk invalidasi cache dan expiry otomatis
 */

import NodeCache from 'node-cache';
import logger from './logger';

// Cache duration dalam menit untuk berbagai endpoint
const cacheDurations: Record<string, { expiryMinutes: number, criticalData: boolean }> = {
  '/api/inventory/products': { expiryMinutes: 15, criticalData: true },
  '/api/inventory/products/toling': { expiryMinutes: 15, criticalData: true },
  '/api/inventory/expiry': { expiryMinutes: 30, criticalData: false },
  '/api/inventory/expiry/item': { expiryMinutes: 30, criticalData: false },
  '/api/inventory/expiry/history': { expiryMinutes: 60, criticalData: false },
  '/api/inventory/receipts': { expiryMinutes: 60, criticalData: false },
  '/api/inventory/returns': { expiryMinutes: 60, criticalData: false },
  '/api/inventory/documents': { expiryMinutes: 60, criticalData: false },
  '/api/inventory/stock': { expiryMinutes: 10, criticalData: true },
  '/api/inventory/stock/search': { expiryMinutes: 10, criticalData: true },
  '/api/inventory/stock/item': { expiryMinutes: 10, criticalData: true },
  '/api/inventory/movements': { expiryMinutes: 15, criticalData: true },
};

// Buat instance NodeCache
const nodeCache = new NodeCache({
  stdTTL: 900, // default 15 menit
  checkperiod: 120, // check cleanup setiap 2 menit
  useClones: false // untuk performa lebih baik - tapi pastikan data tidak dimutasi
});

// Format key dengan param untuk variasi cache
const getCacheKey = (endpoint: string, params: Record<string, any> = {}): string => {
  // Urutkan params agar urutan parameter tidak mempengaruhi key cache
  const sortedParams = Object.keys(params).sort().reduce((result: Record<string, any>, key) => {
    result[key] = params[key];
    return result;
  }, {});
  
  return `${endpoint}_${JSON.stringify(sortedParams)}`;
};

// Mengambil data dari cache jika ada, atau mengambil dari sumber (callback) jika tidak ada
export const getCachedData = async <T>(
  endpoint: string,
  params: Record<string, any> = {},
  fetchCallback: () => Promise<T>
): Promise<{ data: T, isFromCache: boolean }> => {
  const cacheKey = getCacheKey(endpoint, params);
  const cacheDuration = cacheDurations[endpoint] || { expiryMinutes: 30, criticalData: false };
  
  try {
    // Coba ambil dari cache
    const cacheData = nodeCache.get<T>(cacheKey);
    
    if (cacheData) {
      logger.info(`Cache hit for ${endpoint}`, { params });
      return { data: cacheData, isFromCache: true };
    }
    
    // Cache miss, ambil data dari sumber
    logger.info(`Cache miss for ${endpoint}, fetching fresh data`, { params });
    const freshData = await fetchCallback();
    
    // Simpan ke cache
    if (freshData) {
      const ttl = cacheDuration.expiryMinutes * 60; // konversi ke detik
      nodeCache.set(cacheKey, freshData, ttl);
    }
    
    return { data: freshData, isFromCache: false };
  } catch (error) {
    // Log error tapi jangan crash
    logger.error(`Error in cache manager for ${endpoint}:`, error);
    
    // Untuk data kritis, coba ambil dari cache walau sudah expired
    if (cacheDuration.criticalData) {
      const staleData = nodeCache.get<T>(cacheKey, true);
      if (staleData) {
        logger.warn(`Returning stale data for critical endpoint ${endpoint}`, { params });
        return { data: staleData, isFromCache: true };
      }
    }
    
    // Jika tidak ada cache sama sekali, maka throw error
    throw error;
  }
};

// Invalidasi cache untuk endpoint tertentu
export const invalidateCache = (endpoint: string, params: Record<string, any> = {}): boolean => {
  const cacheKey = getCacheKey(endpoint, params);
  logger.info(`Invalidating cache for ${endpoint}`, { params });
  return nodeCache.del(cacheKey) > 0;
};

// Invalidasi semua cache yang terkait dengan endpoint tertentu
export const invalidateEndpointCache = (endpoint: string): number => {
  // Ambil semua key cache
  const keys = nodeCache.keys();
  
  // Filter key yang dimulai dengan endpoint yang diminta
  const matchingKeys = keys.filter(key => key.startsWith(endpoint));
  
  // Hapus semua key yang cocok
  let deletedCount = 0;
  matchingKeys.forEach(key => {
    if (nodeCache.del(key)) {
      deletedCount++;
    }
  });
  
  logger.info(`Invalidated ${deletedCount} cache entries for ${endpoint}`);
  return deletedCount;
};

// Export cache manager
export default {
  getCachedData,
  invalidateCache,
  invalidateEndpointCache,
  getCacheKey
};
