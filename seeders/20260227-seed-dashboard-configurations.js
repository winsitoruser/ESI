'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Get business types
    const businessTypes = await queryInterface.sequelize.query(
      `SELECT id, code FROM business_types WHERE code IN ('fine_dining', 'cloud_kitchen', 'qsr', 'cafe')`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const btMap = {};
    businessTypes.forEach(bt => {
      btMap[bt.code] = bt.id;
    });
    
    // Define dashboard configurations for F&B
    const dashboards = [
      {
        id: uuidv4(),
        code: 'FNB_FINE_DINING_DASHBOARD',
        name: 'Fine Dining Dashboard',
        industry_type: 'fnb',
        business_type_id: btMap.fine_dining,
        layout_type: 'grid',
        widgets: JSON.stringify([
          {
            id: 'table-status',
            type: 'status',
            title: 'Status Meja',
            dataSource: '/api/tables/status',
            size: 'large',
            position: { x: 0, y: 0, w: 6, h: 4 },
            refreshInterval: 30,
            config: {
              displayType: 'floor-plan',
              showCapacity: true,
              colorCoding: true
            }
          },
          {
            id: 'reservation-calendar',
            type: 'calendar',
            title: 'Reservasi Hari Ini',
            dataSource: '/api/reservations/today',
            size: 'large',
            position: { x: 6, y: 0, w: 6, h: 4 },
            refreshInterval: 60,
            config: {
              view: 'timeline',
              showGuests: true,
              allowQuickEdit: true
            }
          },
          {
            id: 'kitchen-orders',
            type: 'list',
            title: 'Order Dapur',
            dataSource: '/api/kitchen/active-orders',
            size: 'large',
            position: { x: 0, y: 4, w: 8, h: 4 },
            refreshInterval: 15,
            config: {
              groupBy: 'station',
              showTimer: true,
              priorityIndicator: true
            }
          },
          {
            id: 'revenue-today',
            type: 'metric',
            title: 'Revenue Hari Ini',
            dataSource: '/api/analytics/revenue/today',
            size: 'small',
            position: { x: 8, y: 4, w: 4, h: 2 },
            refreshInterval: 300,
            config: {
              format: 'currency',
              showTrend: true,
              compareYesterday: true
            }
          },
          {
            id: 'top-selling',
            type: 'chart',
            title: 'Menu Terlaris',
            dataSource: '/api/analytics/top-items',
            size: 'small',
            position: { x: 8, y: 6, w: 4, h: 2 },
            refreshInterval: 600,
            config: {
              chartType: 'bar',
              limit: 5,
              showPercentage: true
            }
          }
        ]),
        theme: JSON.stringify({
          primaryColor: '#8B5CF6',
          accentColor: '#F59E0B',
          cardStyle: 'elevated',
          spacing: 'comfortable'
        }),
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FNB_CLOUD_KITCHEN_DASHBOARD',
        name: 'Cloud Kitchen Dashboard',
        industry_type: 'fnb',
        business_type_id: btMap.cloud_kitchen,
        layout_type: 'grid',
        widgets: JSON.stringify([
          {
            id: 'order-queue',
            type: 'list',
            title: 'Antrian Order',
            dataSource: '/api/orders/queue',
            size: 'large',
            position: { x: 0, y: 0, w: 8, h: 4 },
            refreshInterval: 10,
            config: {
              sortBy: 'priority',
              showETA: true,
              colorByStatus: true,
              autoRefresh: true
            }
          },
          {
            id: 'delivery-tracking',
            type: 'map',
            title: 'Tracking Delivery',
            dataSource: '/api/delivery/active',
            size: 'medium',
            position: { x: 8, y: 0, w: 4, h: 4 },
            refreshInterval: 30,
            config: {
              showRoutes: true,
              driverInfo: true,
              estimatedTime: true
            }
          },
          {
            id: 'kitchen-efficiency',
            type: 'chart',
            title: 'Efisiensi Dapur',
            dataSource: '/api/kitchen/efficiency',
            size: 'medium',
            position: { x: 0, y: 4, w: 6, h: 3 },
            refreshInterval: 300,
            config: {
              chartType: 'line',
              metrics: ['prep_time', 'completion_rate'],
              timeRange: 'today'
            }
          },
          {
            id: 'online-orders-chart',
            type: 'chart',
            title: 'Order Online',
            dataSource: '/api/analytics/online-orders',
            size: 'small',
            position: { x: 6, y: 4, w: 3, h: 3 },
            refreshInterval: 300,
            config: {
              chartType: 'donut',
              groupBy: 'platform',
              showLegend: true
            }
          },
          {
            id: 'revenue-metric',
            type: 'metric',
            title: 'Revenue',
            dataSource: '/api/analytics/revenue/today',
            size: 'small',
            position: { x: 9, y: 4, w: 3, h: 3 },
            refreshInterval: 300,
            config: {
              format: 'currency',
              showTrend: true
            }
          }
        ]),
        theme: JSON.stringify({
          primaryColor: '#F59E0B',
          accentColor: '#10B981',
          cardStyle: 'flat',
          spacing: 'compact'
        }),
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FNB_QSR_DASHBOARD',
        name: 'QSR Dashboard',
        industry_type: 'fnb',
        business_type_id: btMap.qsr,
        layout_type: 'grid',
        widgets: JSON.stringify([
          {
            id: 'order-display',
            type: 'list',
            title: 'Order Queue',
            dataSource: '/api/orders/active',
            size: 'large',
            position: { x: 0, y: 0, w: 8, h: 5 },
            refreshInterval: 5,
            config: {
              displayMode: 'kds',
              showTimer: true,
              autoAdvance: true,
              soundAlert: true
            }
          },
          {
            id: 'sales-velocity',
            type: 'chart',
            title: 'Kecepatan Penjualan',
            dataSource: '/api/analytics/sales-velocity',
            size: 'medium',
            position: { x: 8, y: 0, w: 4, h: 3 },
            refreshInterval: 60,
            config: {
              chartType: 'line',
              timeInterval: 'hourly',
              showPeak: true
            }
          },
          {
            id: 'inventory-alerts',
            type: 'list',
            title: 'Alert Stok',
            dataSource: '/api/inventory/alerts',
            size: 'small',
            position: { x: 8, y: 3, w: 4, h: 2 },
            refreshInterval: 300,
            config: {
              alertLevel: 'low',
              showQuantity: true,
              sortBy: 'urgency'
            }
          },
          {
            id: 'loyalty-stats',
            type: 'metric',
            title: 'Loyalty Members',
            dataSource: '/api/loyalty/stats',
            size: 'small',
            position: { x: 0, y: 5, w: 4, h: 2 },
            refreshInterval: 600,
            config: {
              showNewToday: true,
              showActive: true
            }
          },
          {
            id: 'revenue-today',
            type: 'metric',
            title: 'Revenue Hari Ini',
            dataSource: '/api/analytics/revenue/today',
            size: 'small',
            position: { x: 4, y: 5, w: 4, h: 2 },
            refreshInterval: 300,
            config: {
              format: 'currency',
              showTrend: true
            }
          },
          {
            id: 'avg-transaction',
            type: 'metric',
            title: 'Rata-rata Transaksi',
            dataSource: '/api/analytics/avg-transaction',
            size: 'small',
            position: { x: 8, y: 5, w: 4, h: 2 },
            refreshInterval: 300,
            config: {
              format: 'currency',
              compareYesterday: true
            }
          }
        ]),
        theme: JSON.stringify({
          primaryColor: '#EF4444',
          accentColor: '#F59E0B',
          cardStyle: 'minimal',
          spacing: 'compact'
        }),
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        code: 'FNB_CAFE_DASHBOARD',
        name: 'Cafe Dashboard',
        industry_type: 'fnb',
        business_type_id: btMap.cafe,
        layout_type: 'grid',
        widgets: JSON.stringify([
          {
            id: 'table-overview',
            type: 'status',
            title: 'Status Meja',
            dataSource: '/api/tables/status',
            size: 'medium',
            position: { x: 0, y: 0, w: 6, h: 3 },
            refreshInterval: 30,
            config: {
              displayType: 'grid',
              showOccupancy: true
            }
          },
          {
            id: 'sales-today',
            type: 'metric',
            title: 'Penjualan Hari Ini',
            dataSource: '/api/analytics/sales/today',
            size: 'small',
            position: { x: 6, y: 0, w: 3, h: 3 },
            refreshInterval: 300,
            config: {
              format: 'currency',
              showTrend: true,
              showTransactionCount: true
            }
          },
          {
            id: 'popular-items',
            type: 'chart',
            title: 'Menu Populer',
            dataSource: '/api/analytics/popular-items',
            size: 'small',
            position: { x: 9, y: 0, w: 3, h: 3 },
            refreshInterval: 600,
            config: {
              chartType: 'bar',
              limit: 5,
              showPercentage: true
            }
          },
          {
            id: 'recent-orders',
            type: 'list',
            title: 'Order Terbaru',
            dataSource: '/api/orders/recent',
            size: 'medium',
            position: { x: 0, y: 3, w: 6, h: 4 },
            refreshInterval: 30,
            config: {
              limit: 10,
              showStatus: true,
              showTable: true
            }
          },
          {
            id: 'inventory-status',
            type: 'list',
            title: 'Status Inventory',
            dataSource: '/api/inventory/status',
            size: 'medium',
            position: { x: 6, y: 3, w: 6, h: 4 },
            refreshInterval: 300,
            config: {
              showLowStock: true,
              categoryFilter: ['beverage', 'ingredient'],
              alertThreshold: 20
            }
          }
        ]),
        theme: JSON.stringify({
          primaryColor: '#10B981',
          accentColor: '#8B5CF6',
          cardStyle: 'elevated',
          spacing: 'comfortable'
        }),
        is_default: true,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ];
    
    await queryInterface.bulkInsert('dashboard_configurations', dashboards);
    
    // Update business packages to link with dashboards
    const dashMap = {};
    dashboards.forEach(d => {
      dashMap[d.code] = d.id;
    });
    
    // Link packages to dashboards via metadata - using simple JSON merge
    const packageDashboardLinks = [
      { packageCode: 'FNB_FINE_DINING_COMPLETE', dashboardId: dashMap.FNB_FINE_DINING_DASHBOARD },
      { packageCode: 'FNB_CLOUD_KITCHEN_STARTER', dashboardId: dashMap.FNB_CLOUD_KITCHEN_DASHBOARD },
      { packageCode: 'FNB_QSR_EXPRESS', dashboardId: dashMap.FNB_QSR_DASHBOARD },
      { packageCode: 'FNB_CAFE_ESSENTIALS', dashboardId: dashMap.FNB_CAFE_DASHBOARD }
    ];
    
    for (const link of packageDashboardLinks) {
      await queryInterface.sequelize.query(
        `UPDATE business_packages 
         SET metadata = COALESCE(metadata::jsonb, '{}'::jsonb) || :newData::jsonb
         WHERE code = :packageCode`,
        {
          replacements: {
            newData: JSON.stringify({ dashboardConfigId: link.dashboardId }),
            packageCode: link.packageCode
          }
        }
      );
    }
    
    console.log('✅ Seeded 4 F&B dashboard configurations and linked to packages');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('dashboard_configurations', {
      code: {
        [Sequelize.Op.in]: [
          'FNB_FINE_DINING_DASHBOARD',
          'FNB_CLOUD_KITCHEN_DASHBOARD',
          'FNB_QSR_DASHBOARD',
          'FNB_CAFE_DASHBOARD'
        ]
      }
    }, {});
  }
};
