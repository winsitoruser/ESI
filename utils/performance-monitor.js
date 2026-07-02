/**
 * Utility untuk memantau performa database operations
 * Memungkinkan perbandingan ORM Prisma vs Sequelize
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Konfigurasi logging
const LOG_DIR = path.join(process.cwd(), 'logs');
const PERF_LOG_FILE = path.join(LOG_DIR, 'db-performance.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'db-errors.log');

// Pastikan direktori log ada
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Metrik yang dipantau
const metrics = {
  prisma: {
    operations: 0,
    errors: 0,
    totalTime: 0,
    maxTime: 0,
    minTime: Infinity
  },
  sequelize: {
    operations: 0,
    errors: 0,
    totalTime: 0,
    maxTime: 0,
    minTime: Infinity
  }
};

/**
 * Track performa operasi database dan simpan hasilnya
 * 
 * @param {string} orm - ORM yang digunakan ('prisma' or 'sequelize')
 * @param {string} operation - Nama operasi (e.g., 'getProducts', 'createTransaction')
 * @param {Function} fn - Fungsi database yang akan dieksekusi dan diukur
 * @param {Object} params - Parameter untuk log (optional)
 * @returns {*} - Hasil dari fungsi yang dieksekusi
 */
async function trackPerformance(orm, operation, fn, params = {}) {
  // Validasi input
  if (!['prisma', 'sequelize'].includes(orm)) {
    throw new Error('Invalid ORM specified. Must be "prisma" or "sequelize"');
  }
  
  if (typeof fn !== 'function') {
    throw new Error('Function to measure must be a valid function');
  }
  
  // Waktu mulai
  const startTime = performance.now();
  let result;
  let error = null;
  
  try {
    // Eksekusi fungsi
    result = await fn();
    return result;
  } catch (err) {
    error = err;
    // Track error
    metrics[orm].errors++;
    
    // Log error
    const errorLog = {
      timestamp: new Date().toISOString(),
      orm,
      operation,
      error: {
        message: err.message,
        stack: err.stack
      },
      params: JSON.stringify(params)
    };
    
    fs.appendFileSync(
      ERROR_LOG_FILE,
      JSON.stringify(errorLog) + '\n',
      { flag: 'a' }
    );
    
    throw err;
  } finally {
    // Waktu selesai
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Update metrik
    metrics[orm].operations++;
    metrics[orm].totalTime += executionTime;
    metrics[orm].maxTime = Math.max(metrics[orm].maxTime, executionTime);
    metrics[orm].minTime = Math.min(metrics[orm].minTime, executionTime);
    
    // Log performance
    const perfLog = {
      timestamp: new Date().toISOString(),
      orm,
      operation,
      executionTime,
      success: error === null,
      resultSize: result ? 
        (Array.isArray(result) ? result.length : 'single_object') : 
        null,
      params: JSON.stringify(params)
    };
    
    fs.appendFileSync(
      PERF_LOG_FILE,
      JSON.stringify(perfLog) + '\n',
      { flag: 'a' }
    );
  }
}

/**
 * Mendapatkan statistik performa saat ini
 */
function getPerformanceStats() {
  return {
    prisma: {
      ...metrics.prisma,
      avgTime: metrics.prisma.operations > 0 ? 
        metrics.prisma.totalTime / metrics.prisma.operations : 
        0
    },
    sequelize: {
      ...metrics.sequelize,
      avgTime: metrics.sequelize.operations > 0 ? 
        metrics.sequelize.totalTime / metrics.sequelize.operations : 
        0
    },
    comparison: {
      operationsRatio: metrics.prisma.operations > 0 ?
        metrics.sequelize.operations / metrics.prisma.operations :
        0,
      errorRatio: metrics.prisma.errors > 0 ?
        metrics.sequelize.errors / metrics.prisma.errors :
        (metrics.sequelize.errors > 0 ? Infinity : 0),
      avgTimeRatio: metrics.prisma.operations > 0 && metrics.sequelize.operations > 0 ?
        (metrics.sequelize.totalTime / metrics.sequelize.operations) / 
        (metrics.prisma.totalTime / metrics.prisma.operations) :
        0
    }
  };
}

/**
 * Reset statistik performa
 */
function resetPerformanceStats() {
  Object.keys(metrics).forEach(orm => {
    metrics[orm] = {
      operations: 0,
      errors: 0,
      totalTime: 0,
      maxTime: 0,
      minTime: Infinity
    };
  });
}

module.exports = {
  trackPerformance,
  getPerformanceStats,
  resetPerformanceStats
};
