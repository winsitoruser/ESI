/**
 * Alert Service - Helper functions for creating and managing alerts
 */

const createAlert = async (alertData) => {
  try {
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertData)
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating alert:', error);
    return { success: false, error: error.message };
  }
};

const updateAlert = async (alertId, updateData) => {
  try {
    const response = await fetch(`/api/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating alert:', error);
    return { success: false, error: error.message };
  }
};

const markAsRead = async (alertId, userId) => {
  return updateAlert(alertId, {
    is_read: true,
    action_type: 'read',
    user_id: userId
  });
};

const resolveAlert = async (alertId, userId, notes) => {
  return updateAlert(alertId, {
    is_resolved: true,
    resolved_by: userId,
    resolution_notes: notes,
    action_type: 'resolved',
    user_id: userId
  });
};

const generateAlerts = async () => {
  try {
    const response = await fetch('/api/alerts/generate', {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    console.error('Error generating alerts:', error);
    return { success: false, error: error.message };
  }
};

// Alert type helpers
const AlertTypes = {
  STOCK_LOW: 'stock_low',
  STOCK_OUT: 'stock_out',
  EXPIRY_WARNING: 'expiry_warning',
  EXPIRY_CRITICAL: 'expiry_critical',
  PRICE_CHANGE: 'price_change',
  OVERSTOCK: 'overstock',
  QUALITY_ISSUE: 'quality_issue',
  SUPPLIER_ISSUE: 'supplier_issue',
  SYSTEM_ERROR: 'system_error',
  CUSTOM: 'custom'
};

const AlertCategories = {
  INVENTORY: 'inventory',
  SALES: 'sales',
  FINANCE: 'finance',
  PRODUCTION: 'production',
  QUALITY: 'quality',
  SYSTEM: 'system',
  CUSTOMER: 'customer'
};

const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  URGENT: 'urgent'
};

// Quick alert creators
const createStockAlert = async (product, severity = 'warning') => {
  return createAlert({
    alert_type: product.stock === 0 ? AlertTypes.STOCK_OUT : AlertTypes.STOCK_LOW,
    severity,
    title: `${product.stock === 0 ? 'Stock Habis' : 'Stock Rendah'}: ${product.name}`,
    message: `Produk ${product.name} (${product.sku}) memiliki stock ${product.stock} unit.`,
    category: AlertCategories.INVENTORY,
    source: 'stock_monitor',
    reference_type: 'product',
    reference_id: product.id,
    reference_data: {
      product_name: product.name,
      sku: product.sku,
      current_stock: product.stock,
      min_stock: product.min_stock
    },
    action_required: true,
    action_type: 'reorder',
    action_url: `/inventory/purchase-orders/new?product_id=${product.id}`,
    priority: product.stock === 0 ? 100 : 80
  });
};

const createExpiryAlert = async (product, daysUntilExpiry) => {
  const severity = daysUntilExpiry <= 7 ? 'urgent' : daysUntilExpiry <= 14 ? 'critical' : 'warning';
  
  return createAlert({
    alert_type: daysUntilExpiry <= 7 ? AlertTypes.EXPIRY_CRITICAL : AlertTypes.EXPIRY_WARNING,
    severity,
    title: `Produk Akan Kadaluarsa: ${product.name}`,
    message: `Produk ${product.name} akan kadaluarsa dalam ${daysUntilExpiry} hari.`,
    category: AlertCategories.INVENTORY,
    source: 'expiry_monitor',
    reference_type: 'product',
    reference_id: product.id,
    reference_data: {
      product_name: product.name,
      sku: product.sku,
      expiry_date: product.expiry,
      days_until_expiry: daysUntilExpiry,
      current_stock: product.stock
    },
    action_required: true,
    action_type: 'check_quality',
    action_url: `/inventory/products/${product.id}`,
    priority: daysUntilExpiry <= 7 ? 90 : 70
  });
};

const createPriceChangeAlert = async (product, oldPrice, newPrice, changedBy, reason) => {
  const changePercentage = ((newPrice - oldPrice) / oldPrice) * 100;
  
  return createAlert({
    alert_type: AlertTypes.PRICE_CHANGE,
    severity: 'info',
    title: `Perubahan Harga: ${product.name}`,
    message: `Harga ${product.name} diubah dari ${oldPrice} menjadi ${newPrice} (${changePercentage.toFixed(2)}%)`,
    category: AlertCategories.INVENTORY,
    source: 'price_monitor',
    reference_type: 'product',
    reference_id: product.id,
    reference_data: {
      product_name: product.name,
      sku: product.sku,
      old_price: oldPrice,
      new_price: newPrice,
      change_percentage: changePercentage,
      changed_by: changedBy,
      reason: reason
    },
    action_required: false,
    priority: 30
  });
};

module.exports = {
  createAlert,
  updateAlert,
  markAsRead,
  resolveAlert,
  generateAlerts,
  createStockAlert,
  createExpiryAlert,
  createPriceChangeAlert,
  AlertTypes,
  AlertCategories,
  AlertSeverity
};
