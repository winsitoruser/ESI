const db = require('../models');
const { Product, Stock, PosTransactionItem, StockMovement } = db;
const { Op } = require('sequelize');

/**
 * Inventory Analysis Service
 * Provides comprehensive inventory analysis including:
 * - Fast moving / Slow moving products
 * - Stock level suggestions
 * - FIFO/FEFO recommendations
 * - Reorder suggestions
 */

class InventoryAnalysisService {
  /**
   * Analyze product movement velocity
   * @param {number} days - Number of days to analyze
   * @returns {Object} Fast moving and slow moving products
   */
  async analyzeProductVelocity(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Check if pos_transaction_items table exists
      const tableCheck = await db.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'pos_transaction_items'
        )
      `, { type: db.Sequelize.QueryTypes.SELECT });

      let products = [];

      if (tableCheck[0].exists) {
        // Get sales data from POS transactions
        const salesQuery = `
          SELECT 
            p.id,
            p.name,
            p.sku,
            p.unit,
            COALESCE(SUM(pti.quantity), 0) as total_sold,
            COALESCE(SUM(pti.quantity), 0) / :days as avg_daily_sales,
            COALESCE(SUM(s.quantity), 0) as current_stock,
            p.minimum_stock,
            p.maximum_stock,
            p.sell_price
          FROM products p
          LEFT JOIN pos_transaction_items pti ON p.id = pti.product_id
          LEFT JOIN pos_transactions pt ON pti.transaction_id = pt.id
          LEFT JOIN inventory_stock s ON p.id = s.product_id
          WHERE p.is_active = true
            AND (pt.created_at >= :startDate OR pt.created_at IS NULL)
          GROUP BY p.id, p.name, p.sku, p.unit, p.minimum_stock, p.maximum_stock, p.sell_price
          HAVING COALESCE(SUM(pti.quantity), 0) > 0
          ORDER BY avg_daily_sales DESC
        `;

        products = await db.sequelize.query(salesQuery, {
          replacements: { days, startDate: startDate.toISOString() },
          type: db.Sequelize.QueryTypes.SELECT
        });
      } else {
        // Fallback: Use stock movements as proxy for sales
        const movementQuery = `
          SELECT 
            p.id,
            p.name,
            p.sku,
            p.unit,
            COALESCE(ABS(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END)), 0) as total_sold,
            COALESCE(ABS(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END)), 0) / :days as avg_daily_sales,
            COALESCE(SUM(s.quantity), 0) as current_stock,
            p.minimum_stock,
            p.maximum_stock,
            p.sell_price
          FROM products p
          LEFT JOIN stock_movements sm ON p.id = sm.product_id AND sm.created_at >= :startDate
          LEFT JOIN inventory_stock s ON p.id = s.product_id
          WHERE p.is_active = true
          GROUP BY p.id, p.name, p.sku, p.unit, p.minimum_stock, p.maximum_stock, p.sell_price
          HAVING COALESCE(ABS(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END)), 0) > 0
          ORDER BY avg_daily_sales DESC
        `;

        products = await db.sequelize.query(movementQuery, {
          replacements: { days, startDate: startDate.toISOString() },
          type: db.Sequelize.QueryTypes.SELECT
        });
      }

      if (products.length === 0) {
        return {
          fast_moving: [],
          slow_moving: [],
          average_daily_sales: 0,
          analysis_period_days: days
        };
      }

      // Calculate velocity metrics
      const avgSales = products.reduce((sum, p) => sum + parseFloat(p.avg_daily_sales), 0) / products.length;
      
      // Fast moving: > 150% of average
      const fastMoving = products
        .filter(p => parseFloat(p.avg_daily_sales) > avgSales * 1.5)
        .map(p => ({
          ...p,
          velocity: 'fast',
          days_of_stock: parseFloat(p.current_stock) / parseFloat(p.avg_daily_sales),
          velocity_ratio: parseFloat(p.avg_daily_sales) / avgSales
        }));

      // Slow moving: < 50% of average
      const slowMoving = products
        .filter(p => parseFloat(p.avg_daily_sales) < avgSales * 0.5 && parseFloat(p.avg_daily_sales) > 0)
        .map(p => ({
          ...p,
          velocity: 'slow',
          days_of_stock: parseFloat(p.current_stock) / parseFloat(p.avg_daily_sales),
          velocity_ratio: parseFloat(p.avg_daily_sales) / avgSales
        }));

      return {
        fast_moving: fastMoving,
        slow_moving: slowMoving,
        average_daily_sales: avgSales,
        analysis_period_days: days
      };
    } catch (error) {
      console.error('Error analyzing product velocity:', error);
      throw error;
    }
  }

  /**
   * Generate stock level suggestions based on min/max and sales velocity
   * @returns {Array} Stock suggestions
   */
  async generateStockSuggestions() {
    try {
      const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.unit,
          COALESCE(SUM(s.quantity), 0) as current_stock,
          p.minimum_stock,
          p.maximum_stock,
          p.sell_price,
          p.buy_price
        FROM products p
        LEFT JOIN inventory_stock s ON p.id = s.product_id
        WHERE p.is_active = true
        GROUP BY p.id, p.name, p.sku, p.unit, p.minimum_stock, p.maximum_stock, p.sell_price, p.buy_price
      `;

      const products = await db.sequelize.query(query, {
        type: db.Sequelize.QueryTypes.SELECT
      });

      const suggestions = [];

      products.forEach(product => {
        const currentStock = parseFloat(product.current_stock) || 0;
        const minStock = parseFloat(product.minimum_stock) || 0;
        const maxStock = parseFloat(product.maximum_stock) || 0;

        let suggestion = null;
        let severity = 'info';
        let action = '';

        // Critical: Out of stock
        if (currentStock === 0) {
          severity = 'critical';
          action = 'URGENT: Restock immediately';
          suggestion = {
            type: 'out_of_stock',
            recommended_order_quantity: maxStock > 0 ? maxStock : minStock * 2
          };
        }
        // Critical: Below minimum
        else if (minStock > 0 && currentStock < minStock) {
          severity = 'critical';
          action = 'Restock needed - below minimum level';
          suggestion = {
            type: 'below_minimum',
            recommended_order_quantity: maxStock > 0 ? maxStock - currentStock : minStock * 2
          };
        }
        // Warning: Approaching minimum (within 20%)
        else if (minStock > 0 && currentStock < minStock * 1.2) {
          severity = 'warning';
          action = 'Monitor closely - approaching minimum';
          suggestion = {
            type: 'approaching_minimum',
            recommended_order_quantity: maxStock > 0 ? maxStock - currentStock : minStock
          };
        }
        // Warning: Above maximum
        else if (maxStock > 0 && currentStock > maxStock) {
          severity = 'warning';
          action = 'Overstock - consider promotion or redistribution';
          suggestion = {
            type: 'overstock',
            excess_quantity: currentStock - maxStock
          };
        }

        if (suggestion) {
          suggestions.push({
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            current_stock: currentStock,
            minimum_stock: minStock,
            maximum_stock: maxStock,
            severity,
            action,
            ...suggestion
          });
        }
      });

      return suggestions;
    } catch (error) {
      console.error('Error generating stock suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze expiry dates and recommend FIFO/FEFO strategy
   * @returns {Object} Expiry analysis and recommendations
   */
  async analyzeExpiryAndStrategy() {
    try {
      // Get products with expiry dates
      const expiryQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.expiry as expiry_date,
          COALESCE(SUM(s.quantity), 0) as quantity,
          p.unit,
          EXTRACT(DAY FROM (p.expiry - NOW())) as days_until_expiry
        FROM products p
        LEFT JOIN inventory_stock s ON p.id = s.product_id
        WHERE p.is_active = true 
          AND p.expiry IS NOT NULL
          AND p.expiry > NOW()
        GROUP BY p.id, p.name, p.sku, p.expiry, p.unit
        ORDER BY days_until_expiry ASC
      `;

      const expiringProducts = await db.sequelize.query(expiryQuery, {
        type: db.Sequelize.QueryTypes.SELECT
      });

      const recommendations = expiringProducts.map(product => {
        const daysUntilExpiry = parseInt(product.days_until_expiry);
        let strategy = 'FEFO'; // First Expire First Out
        let priority = 'normal';
        let action = '';

        if (daysUntilExpiry <= 3) {
          priority = 'critical';
          action = 'URGENT: Sell immediately with 30-50% discount or return to supplier';
          strategy = 'FEFO';
        } else if (daysUntilExpiry <= 7) {
          priority = 'high';
          action = 'Promote with 20-30% discount or bundle deals';
          strategy = 'FEFO';
        } else if (daysUntilExpiry <= 14) {
          priority = 'medium';
          action = 'Feature in promotions, consider buy 1 get 1';
          strategy = 'FEFO';
        } else if (daysUntilExpiry <= 30) {
          priority = 'low';
          action = 'Monitor and prioritize in sales';
          strategy = 'FEFO';
        } else {
          priority = 'normal';
          action = 'Normal stock rotation';
          strategy = 'FIFO'; // Can use FIFO for longer shelf life
        }

        return {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          expiry_date: product.expiry_date,
          days_until_expiry: daysUntilExpiry,
          quantity: parseFloat(product.quantity),
          unit: product.unit,
          recommended_strategy: strategy,
          priority,
          action
        };
      });

      return {
        expiring_products: recommendations,
        total_expiring: recommendations.length,
        critical_count: recommendations.filter(r => r.priority === 'critical').length,
        high_priority_count: recommendations.filter(r => r.priority === 'high').length
      };
    } catch (error) {
      console.error('Error analyzing expiry strategy:', error);
      throw error;
    }
  }

  /**
   * Generate purchase order suggestions based on velocity and stock levels
   * @returns {Array} Purchase order suggestions
   */
  async generatePurchaseOrderSuggestions() {
    try {
      const velocity = await this.analyzeProductVelocity(30);
      const stockSuggestions = await this.generateStockSuggestions();

      // Combine velocity and stock data
      const purchaseSuggestions = [];

      // Fast moving products that need restock
      velocity.fast_moving.forEach(product => {
        const stockSuggestion = stockSuggestions.find(s => s.product_id === product.id);
        
        if (stockSuggestion && ['out_of_stock', 'below_minimum', 'approaching_minimum'].includes(stockSuggestion.type)) {
          purchaseSuggestions.push({
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            reason: 'Fast moving product needs restock',
            current_stock: product.current_stock,
            avg_daily_sales: product.avg_daily_sales,
            days_of_stock: product.days_of_stock,
            recommended_order_quantity: stockSuggestion.recommended_order_quantity,
            priority: 'high',
            urgency: stockSuggestion.severity
          });
        }
      });

      // Products below minimum (not fast moving)
      stockSuggestions
        .filter(s => ['out_of_stock', 'below_minimum'].includes(s.type))
        .forEach(suggestion => {
          if (!purchaseSuggestions.find(p => p.product_id === suggestion.product_id)) {
            purchaseSuggestions.push({
              product_id: suggestion.product_id,
              product_name: suggestion.product_name,
              sku: suggestion.sku,
              reason: 'Stock below minimum level',
              current_stock: suggestion.current_stock,
              minimum_stock: suggestion.minimum_stock,
              recommended_order_quantity: suggestion.recommended_order_quantity,
              priority: 'medium',
              urgency: suggestion.severity
            });
          }
        });

      return purchaseSuggestions.sort((a, b) => {
        const urgencyOrder = { critical: 0, warning: 1, info: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
    } catch (error) {
      console.error('Error generating purchase order suggestions:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive live updates for marquee
   * @returns {Array} Live update messages
   */
  async getLiveUpdates() {
    try {
      const updates = [];

      // Get critical stock alerts
      try {
        const stockSuggestions = await this.generateStockSuggestions();
        const criticalStock = stockSuggestions.filter(s => s.severity === 'critical').slice(0, 3);
        
        criticalStock.forEach(item => {
          updates.push({
            type: 'stock_alert',
            severity: 'critical',
            icon: '🚨',
            message: `${item.product_name} - ${item.action}`,
            product_id: item.product_id
          });
        });

        // Get warning stock alerts
        const warningStock = stockSuggestions.filter(s => s.severity === 'warning').slice(0, 2);
        warningStock.forEach(item => {
          updates.push({
            type: 'stock_alert',
            severity: 'warning',
            icon: '⚠️',
            message: `${item.product_name} - ${item.action}`,
            product_id: item.product_id
          });
        });
      } catch (err) {
        console.warn('Stock suggestions error:', err.message);
      }

      // Get expiry alerts
      try {
        const expiryAnalysis = await this.analyzeExpiryAndStrategy();
        const criticalExpiry = expiryAnalysis.expiring_products
          .filter(p => p.priority === 'critical' || p.priority === 'high')
          .slice(0, 2);

        criticalExpiry.forEach(item => {
          updates.push({
            type: 'expiry_alert',
            severity: item.priority === 'critical' ? 'critical' : 'warning',
            icon: item.priority === 'critical' ? '❌' : '⏰',
            message: `${item.product_name} - Expired dalam ${item.days_until_expiry} hari (${item.recommended_strategy})`,
            product_id: item.product_id
          });
        });
      } catch (err) {
        console.warn('Expiry analysis error:', err.message);
      }

      // Get fast moving products
      try {
        const velocity = await this.analyzeProductVelocity(7);
        const topFastMoving = velocity.fast_moving.slice(0, 2);

        topFastMoving.forEach(item => {
          updates.push({
            type: 'fast_moving',
            severity: 'info',
            icon: '📊',
            message: `${item.name} - Penjualan meningkat ${(item.velocity_ratio * 100).toFixed(0)}% dari rata-rata`,
            product_id: item.id
          });
        });

        // Get slow moving with overstock
        const slowWithOverstock = velocity.slow_moving
          .filter(p => p.maximum_stock && parseFloat(p.current_stock) > parseFloat(p.maximum_stock))
          .slice(0, 1);

        slowWithOverstock.forEach(item => {
          updates.push({
            type: 'slow_moving_overstock',
            severity: 'warning',
            icon: '⚠️',
            message: `${item.name} - Slow moving dengan overstock, pertimbangkan promo`,
            product_id: item.id
          });
        });
      } catch (err) {
        console.warn('Velocity analysis error:', err.message);
      }

      // If no updates, add a default message
      if (updates.length === 0) {
        updates.push({
          type: 'info',
          severity: 'info',
          icon: '✅',
          message: 'Semua inventory dalam kondisi baik',
          product_id: null
        });
      }

      return updates;
    } catch (error) {
      console.error('Error getting live updates:', error);
      // Return default message instead of throwing
      return [{
        type: 'info',
        severity: 'info',
        icon: 'ℹ️',
        message: 'Sistem sedang menganalisis inventory...',
        product_id: null
      }];
    }
  }
}

module.exports = new InventoryAnalysisService();
