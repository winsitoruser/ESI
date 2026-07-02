import db from '../../models';
import { Op } from 'sequelize';

export interface KitchenInventoryItem {
  id: string;
  tenantId: string;
  productId?: string;
  name: string;
  category?: string;
  currentStock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unitCost?: number;
  totalValue?: number;
  lastRestocked?: Date;
  status: 'good' | 'low' | 'critical' | 'overstock';
  warehouseId?: string;
  locationId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryTransaction {
  id: string;
  tenantId: string;
  inventoryItemId: string;
  transactionType: 'in' | 'out' | 'adjustment' | 'waste' | 'transfer';
  quantity: number;
  unit: string;
  previousStock?: number;
  newStock?: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  performedBy?: string;
  transactionDate: Date;
}

export interface InventoryStats {
  totalItems: number;
  criticalItems: number;
  lowItems: number;
  goodItems: number;
  overstockItems: number;
  totalValue: number;
  topUsedItems: Array<{
    id: string;
    name: string;
    category: string;
    usageThisMonth: number;
    unit: string;
  }>;
  recentTransactions: InventoryTransaction[];
}

class KitchenInventoryService {
  // Get all inventory items with filters
  static async getInventoryItems(
    tenantId: string,
    options: {
      status?: string;
      category?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ items: KitchenInventoryItem[]; total: number }> {
    const { status, category, search, limit = 50, offset = 0 } = options;
    
    const whereClause: any = {
      tenantId,
      isActive: true
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.KitchenInventoryItem.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'price'],
          required: false
        }
      ],
      order: [['name', 'ASC']],
      limit,
      offset
    });

    return {
      items: rows.map(row => row.toJSON() as KitchenInventoryItem),
      total: count
    };
  }

  // Get single inventory item
  static async getInventoryItem(id: string): Promise<KitchenInventoryItem | null> {
    const item = await db.KitchenInventoryItem.findByPk(id, {
      include: [
        {
          model: db.Product,
          as: 'product',
          attributes: ['id', 'sku', 'name', 'price']
        }
      ]
    });

    return item ? item.toJSON() as KitchenInventoryItem : null;
  }

  // Create or update inventory item
  static async upsertInventoryItem(
    tenantId: string,
    data: Partial<KitchenInventoryItem>
  ): Promise<KitchenInventoryItem> {
    const {
      id,
      productId,
      name,
      category,
      currentStock,
      unit,
      minStock,
      maxStock,
      reorderPoint,
      unitCost,
      warehouseId,
      locationId
    } = data;

    // Calculate status and total value
    const status = this.calculateStockStatus(
      currentStock || 0,
      minStock || 0,
      maxStock || 0
    );
    
    const totalValue = unitCost && currentStock ? unitCost * currentStock : undefined;

    const [item] = await db.KitchenInventoryItem.findOrCreate({
      where: {
        id: id || undefined,
        tenantId,
        ...(id ? {} : { name })
      },
      defaults: {
        tenantId,
        productId,
        name: name!,
        category,
        currentStock: currentStock || 0,
        unit: unit!,
        minStock: minStock || 0,
        maxStock: maxStock || 0,
        reorderPoint: reorderPoint || 0,
        unitCost,
        totalValue,
        lastRestocked: new Date(),
        status,
        warehouseId,
        locationId,
        isActive: true
      }
    });

    if (!item.isNewRecord) {
      // Update existing item
      const previousStock = item.get('currentStock') as number;
      await item.update({
        productId,
        category,
        currentStock: currentStock || previousStock,
        unit,
        minStock: minStock || item.get('minStock'),
        maxStock: maxStock || item.get('maxStock'),
        reorderPoint: reorderPoint || item.get('reorderPoint'),
        unitCost,
        totalValue,
        status,
        warehouseId,
        locationId
      });

      // Create transaction if stock changed
      if (currentStock !== undefined && currentStock !== previousStock) {
        await this.createTransaction(tenantId, {
          inventoryItemId: item.get('id') as string,
          transactionType: 'adjustment',
          quantity: currentStock - previousStock,
          unit: unit || item.get('unit'),
          previousStock,
          newStock: currentStock,
          referenceType: 'manual',
          notes: 'Manual stock adjustment'
        });
      }
    }

    return item.toJSON() as KitchenInventoryItem;
  }

  // Create inventory transaction
  static async createTransaction(
    tenantId: string,
    data: {
      inventoryItemId: string;
      transactionType: 'in' | 'out' | 'adjustment' | 'waste' | 'transfer';
      quantity: number;
      unit: string;
      previousStock?: number;
      newStock?: number;
      referenceType?: string;
      referenceId?: string;
      notes?: string;
      performedBy?: string;
    }
  ): Promise<InventoryTransaction> {
    const inventoryItem = await db.KitchenInventoryItem.findByPk(data.inventoryItemId);
    
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    const previousStock = inventoryItem.get('currentStock') as number;
    let newStock = previousStock;

    // Calculate new stock based on transaction type
    switch (data.transactionType) {
      case 'in':
      case 'adjustment':
        newStock = previousStock + data.quantity;
        break;
      case 'out':
      case 'waste':
        newStock = previousStock - data.quantity;
        break;
      case 'transfer':
        // Transfer handled separately
        break;
    }

    // Update inventory item stock
    const status = this.calculateStockStatus(
      newStock,
      inventoryItem.get('minStock') as number,
      inventoryItem.get('maxStock') as number
    );

    await inventoryItem.update({
      currentStock: newStock,
      status,
      totalValue: inventoryItem.get('unitCost') ? (inventoryItem.get('unitCost') as number) * newStock : undefined,
      lastRestocked: data.transactionType === 'in' ? new Date() : inventoryItem.get('lastRestocked')
    });

    // Create transaction record
    const transaction = await db.KitchenInventoryTransaction.create({
      tenantId,
      inventoryItemId: data.inventoryItemId,
      transactionType: data.transactionType,
      quantity: data.quantity,
      unit: data.unit,
      previousStock,
      newStock,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      notes: data.notes,
      performedBy: data.performedBy
    });

    return transaction.toJSON() as InventoryTransaction;
  }

  // Get inventory statistics
  static async getInventoryStats(tenantId: string): Promise<InventoryStats> {
    // Get counts by status
    const statusCounts = await db.KitchenInventoryItem.findAll({
      where: {
        tenantId,
        isActive: true
      },
      attributes: [
        'status',
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('total_value')), 'value']
      ],
      group: ['status'],
      raw: true
    });

    const stats: InventoryStats = {
      totalItems: 0,
      criticalItems: 0,
      lowItems: 0,
      goodItems: 0,
      overstockItems: 0,
      totalValue: 0,
      topUsedItems: [],
      recentTransactions: []
    };

    statusCounts.forEach((row: any) => {
      const count = parseInt(row.count);
      const value = parseFloat(row.value) || 0;
      
      stats.totalItems += count;
      stats.totalValue += value;

      switch (row.status) {
        case 'critical':
          stats.criticalItems = count;
          break;
        case 'low':
          stats.lowItems = count;
          break;
        case 'good':
          stats.goodItems = count;
          break;
        case 'overstock':
          stats.overstockItems = count;
          break;
      }
    });

    // Get recent transactions
    const recentTrans = await db.KitchenInventoryTransaction.findAll({
      where: {
        tenantId
      },
      include: [
        {
          model: db.KitchenInventoryItem,
          as: 'inventoryItem',
          attributes: ['id', 'name', 'unit']
        }
      ],
      order: [['transactionDate', 'DESC']],
      limit: 10
    });

    stats.recentTransactions = recentTrans.map(t => t.toJSON() as InventoryTransaction);

    // Get top used items this month
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const usageData = await db.KitchenInventoryTransaction.findAll({
      where: {
        tenantId,
        transactionType: ['out', 'waste'],
        transactionDate: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          model: db.KitchenInventoryItem,
          as: 'inventoryItem',
          attributes: ['id', 'name', 'category', 'unit']
        }
      ],
      attributes: [
        'inventoryItemId',
        [db.Sequelize.fn('SUM', db.Sequelize.col('quantity')), 'totalUsage']
      ],
      group: ['inventoryItemId', 'inventoryItem.id'],
      order: [[db.Sequelize.literal('"totalUsage"'), 'DESC']],
      limit: 10,
      raw: true
    });

    stats.topUsedItems = usageData.map((row: any) => ({
      id: row.inventoryItemId,
      name: row['inventoryItem.name'],
      category: row['inventoryItem.category'],
      usageThisMonth: parseFloat(row.totalUsage),
      unit: row['inventoryItem.unit']
    }));

    return stats;
  }

  // Calculate stock status
  private static calculateStockStatus(
    currentStock: number,
    minStock: number,
    maxStock: number
  ): 'good' | 'low' | 'critical' | 'overstock' {
    if (currentStock <= minStock * 0.5) {
      return 'critical';
    } else if (currentStock <= minStock) {
      return 'low';
    } else if (currentStock >= maxStock) {
      return 'overstock';
    } else {
      return 'good';
    }
  }

  // Get categories
  static async getCategories(tenantId: string): Promise<string[]> {
    const categories = await db.KitchenInventoryItem.findAll({
      where: {
        tenantId,
        isActive: true,
        category: {
          [Op.not]: null
        }
      },
      attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('category')), 'category']],
      order: [[db.Sequelize.col('category'), 'ASC']],
      raw: true
    });

    return categories.map((c: any) => c.category).filter(Boolean);
  }

  // Delete inventory item
  static async deleteInventoryItem(id: string, tenantId: string): Promise<void> {
    const item = await db.KitchenInventoryItem.findOne({
      where: { id, tenantId }
    });

    if (!item) {
      throw new Error('Inventory item not found');
    }

    await item.update({ isActive: false });
  }
}

export default KitchenInventoryService;
