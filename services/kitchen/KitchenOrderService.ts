import db from '../../models';

export interface KitchenOrderItem {
  productId?: string;
  name: string;
  quantity: number;
  notes?: string;
  modifiers?: any[];
  category?: string;
}

export interface CreateKitchenOrderRequest {
  posTransactionId?: string;
  tableNumber?: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  customerName?: string;
  items: KitchenOrderItem[];
  priority?: 'normal' | 'urgent';
  notes?: string;
}

export interface KitchenOrderFilters {
  status?: string;
  orderType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

class KitchenOrderService {
  /**
   * Get all kitchen orders with filters
   */
  static async getOrders(tenantId: string, filters: KitchenOrderFilters = {}) {
    const {
      status = 'all',
      orderType = 'all',
      search = '',
      limit = 50,
      offset = 0
    } = filters;

    const whereClause: any = {
      tenantId
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    if (orderType !== 'all') {
      whereClause.orderType = orderType;
    }

    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { orderNumber: { [db.Sequelize.Op.like]: `%${search}%` } },
        { tableNumber: { [db.Sequelize.Op.like]: `%${search}%` } },
        { customerName: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const orders = await db.KitchenOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.KitchenOrderItem,
          as: 'items',
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'category', 'image']
            }
          ]
        },
        {
          model: db.POSTransaction,
          as: 'posTransaction',
          attributes: ['id', 'transactionNumber']
        },
        {
          model: db.Employee,
          as: 'assignedChef',
          attributes: ['id', 'name']
        }
      ],
      order: [
        ['priority', 'DESC'],
        ['receivedAt', 'ASC']
      ],
      limit,
      offset
    });

    return {
      orders: orders.rows,
      total: orders.count,
      hasMore: (offset + orders.rows.length) < orders.count
    };
  }

  /**
   * Create new kitchen order
   */
  static async createOrder(tenantId: string, data: CreateKitchenOrderRequest) {
    const t = await db.sequelize.transaction();

    try {
      // Generate order number
      const orderNumber = `KIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Calculate estimated time
      const estimatedTime = this.calculateEstimatedTime(data.items);

      // Create kitchen order
      const kitchenOrder = await db.KitchenOrder.create({
        tenantId,
        orderNumber,
        posTransactionId: data.posTransactionId,
        tableNumber: data.tableNumber,
        orderType: data.orderType,
        customerName: data.customerName,
        status: 'new',
        priority: data.priority || 'normal',
        notes: data.notes,
        estimatedTime,
        receivedAt: new Date()
      }, { transaction: t });

      // Create order items
      const orderItems = data.items.map(item => ({
        kitchenOrderId: kitchenOrder.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers || []
      }));

      await db.KitchenOrderItem.bulkCreate(orderItems, { transaction: t });

      // Update table status if dine-in
      if (data.orderType === 'dine-in' && data.tableNumber) {
        const table = await db.Table.findOne({
          where: { tableNumber: data.tableNumber, tenantId },
          transaction: t
        });
        
        if (table) {
          await table.update({ status: 'occupied' }, { transaction: t });
        }
      }

      // Update POS transaction if linked
      if (data.posTransactionId) {
        await db.POSTransaction.update(
          { kitchenOrderId: kitchenOrder.id },
          { where: { id: data.posTransactionId }, transaction: t }
        );
      }

      await t.commit();

      // Fetch complete order
      const completeOrder = await db.KitchenOrder.findByPk(kitchenOrder.id, {
        include: [
          {
            model: db.KitchenOrderItem,
            as: 'items'
          }
        ]
      });

      return completeOrder;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: string, chefId?: string) {
    const order = await db.KitchenOrder.findByPk(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const updateData: any = { status };

    // Update timestamps based on status
    const now = new Date();
    switch (status) {
      case 'preparing':
        if (!order.startedAt) {
          updateData.startedAt = now;
          if (chefId) {
            updateData.assignedChefId = chefId;
          }
        }
        break;
      
      case 'ready':
        if (!order.completedAt) {
          updateData.completedAt = now;
          // Calculate actual prep time
          if (order.startedAt) {
            const prepTime = Math.round((now.getTime() - order.startedAt.getTime()) / 60000);
            updateData.actualPrepTime = prepTime;
          }
        }
        break;
      
      case 'served':
        updateData.servedAt = now;
        
        // Update table status if dine-in
        if (order.orderType === 'dine-in' && order.tableNumber) {
          const table = await db.Table.findOne({
            where: { tableNumber: order.tableNumber, tenantId: order.tenantId }
          });
          
          if (table) {
            await table.update({ status: 'available' });
          }
        }
        break;
    }

    await order.update(updateData);

    // Update all items status if order is completed
    if (status === 'ready') {
      await db.KitchenOrderItem.update(
        { status: 'ready' },
        { where: { kitchenOrderId: orderId } }
      );
    }

    return order;
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string) {
    return await db.KitchenOrder.findByPk(orderId, {
      include: [
        {
          model: db.KitchenOrderItem,
          as: 'items',
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'name', 'category', 'image', 'description']
            }
          ]
        },
        {
          model: db.POSTransaction,
          as: 'posTransaction',
          include: [
            {
              model: db.POSTransactionItem,
              as: 'items'
            }
          ]
        },
        {
          model: db.Employee,
          as: 'assignedChef',
          attributes: ['id', 'name', 'role']
        }
      ]
    });
  }

  /**
   * Get cooking statistics
   */
  static async getCookingStats(tenantId: string, period: 'today' | 'week' | 'month' = 'today') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const orders = await db.KitchenOrder.findAll({
      where: {
        tenantId,
        receivedAt: { [db.Sequelize.Op.gte]: startDate }
      },
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'totalOrders'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('actual_prep_time')), 'avgPrepTime'],
        [db.Sequelize.fn('MIN', db.Sequelize.col('actual_prep_time')), 'minPrepTime'],
        [db.Sequelize.fn('MAX', db.Sequelize.col('actual_prep_time')), 'maxPrepTime']
      ],
      raw: true
    });

    const result = orders[0] as any;

    return {
      totalOrders: parseInt(result.totalOrders) || 0,
      averagePrepTime: parseFloat(result.avgPrepTime) || 0,
      fastestOrder: parseInt(result.minPrepTime) || 0,
      slowestOrder: parseInt(result.maxPrepTime) || 0,
      efficiencyRate: this.calculateEfficiencyRate(tenantId, startDate, now)
    };
  }

  /**
   * Get cooking history
   */
  static async getCookingHistory(tenantId: string, limit: number = 50) {
    const orders = await db.KitchenOrder.findAll({
      where: {
        tenantId,
        status: 'served',
        completedAt: { [db.Sequelize.Op.not]: null }
      },
      include: [
        {
          model: db.KitchenOrderItem,
          as: 'items',
          attributes: ['name', 'quantity']
        },
        {
          model: db.Employee,
          as: 'assignedChef',
          attributes: ['name']
        }
      ],
      order: [['completedAt', 'DESC']],
      limit
    });

    return orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      items: order.items?.map((item: any) => ({
        name: item.name,
        quantity: item.quantity
      })),
      chefName: order.assignedChef?.name,
      startTime: order.startedAt,
      endTime: order.completedAt,
      actualTime: order.actualPrepTime,
      estimatedTime: order.estimatedTime
    }));
  }

  /**
   * Helper: Calculate estimated time
   */
  private static calculateEstimatedTime(items: KitchenOrderItem[]): number {
    if (!items || items.length === 0) return 15;
    
    // Base time per item type (in minutes)
    const baseTimes: Record<string, number> = {
      'appetizer': 5,
      'main': 15,
      'dessert': 8,
      'beverage': 3,
      'default': 10
    };

    // Calculate total time
    let totalTime = 0;
    items.forEach(item => {
      const category = item.category || 'default';
      const itemTime = baseTimes[category] || baseTimes.default;
      totalTime += itemTime;
    });

    // Parallel preparation - divide by 2 for multiple items
    return Math.ceil(totalTime / 2) || 15;
  }

  /**
   * Helper: Calculate efficiency rate
   */
  private static async calculateEfficiencyRate(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    const orders = await db.KitchenOrder.findAll({
      where: {
        tenantId,
        completedAt: { [db.Sequelize.Op.between]: [startDate, endDate] },
        actualPrepTime: { [db.Sequelize.Op.not]: null },
        estimatedTime: { [db.Sequelize.Op.not]: null }
      },
      attributes: ['actualPrepTime', 'estimatedTime']
    });

    if (orders.length === 0) return 0;

    const onTimeOrders = orders.filter((order: any) => order.actualPrepTime! <= order.estimatedTime!).length;
    return Math.round((onTimeOrders / orders.length) * 100);
  }
}

export default KitchenOrderService;
