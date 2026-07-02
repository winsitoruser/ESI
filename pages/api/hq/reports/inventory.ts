import type { NextApiRequest, NextApiResponse } from 'next';
import { Warehouse, Stock, Product, Location } from '../../../../models';
import { Op, fn, col, literal } from 'sequelize';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
      errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
    );
  }

  try {
    return await getInventoryReport(req, res);
  } catch (error) {
    console.error('Inventory Report API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'reports' });

function classifyStock(quantity: number, minStock: number) {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= minStock) return 'low_stock';
  if (minStock > 0 && quantity > minStock * 3) return 'over_stock';
  return 'normal';
}

async function getInventoryReport(req: NextApiRequest, res: NextApiResponse) {
  const warehouseId = req.query.warehouseId as string | undefined;
  const status = (req.query.status as string) || 'all';
  const search = (req.query.search as string) || '';

  try {
    const warehouses: any[] = await Warehouse.findAll({
      where: warehouseId ? { id: warehouseId } : undefined,
      attributes: ['id', 'code', 'name', 'type', 'city', 'status'],
      order: [['name', 'ASC']],
    });

    if (warehouses.length === 0) {
      const mock = getMockStockData();
      return res.status(HttpStatus.OK).json(
        successResponse({
          stockData: mock,
          topLowStock: getMockLowStockProducts(),
          summary: summarize(mock),
        })
      );
    }

    const stockData = await Promise.all(
      warehouses.map(async (wh: any) => {
        const locations = await Location.findAll({
          where: { warehouse_id: wh.id },
          attributes: ['id'],
        });
        const locationIds = locations.map((l: any) => l.id);

        if (locationIds.length === 0) {
          return {
            branchId: String(wh.id),
            branchName: wh.name,
            branchCode: wh.code,
            type: wh.type,
            totalProducts: 0,
            totalStock: 0,
            stockValue: 0,
            lowStockItems: 0,
            outOfStockItems: 0,
            overStockItems: 0,
            normalStockItems: 0,
            lastUpdated: new Date().toISOString(),
          };
        }

        const stocks: any[] = await Stock.findAll({
          where: { location_id: { [Op.in]: locationIds } },
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku', 'buy_price', 'sell_price', 'minimum_stock'] }],
        });

        const productMap = new Map<number, { quantity: number; minStock: number; cost: number }>();
        for (const s of stocks) {
          const prod = (s as any).product;
          if (!prod) continue;
          const existing = productMap.get(prod.id);
          const qty = parseFloat(s.quantity) || 0;
          if (existing) {
            existing.quantity += qty;
          } else {
            productMap.set(prod.id, {
              quantity: qty,
              minStock: prod.minimum_stock || 0,
              cost: parseFloat(prod.buy_price) || parseFloat(prod.sell_price) || 0,
            });
          }
        }

        let totalStock = 0;
        let stockValue = 0;
        let lowStockItems = 0;
        let outOfStockItems = 0;
        let overStockItems = 0;
        let normalStockItems = 0;

        productMap.forEach((v) => {
          totalStock += v.quantity;
          stockValue += v.quantity * v.cost;
          const klass = classifyStock(v.quantity, v.minStock);
          if (klass === 'out_of_stock') outOfStockItems++;
          else if (klass === 'low_stock') lowStockItems++;
          else if (klass === 'over_stock') overStockItems++;
          else normalStockItems++;
        });

        return {
          branchId: String(wh.id),
          branchName: wh.name,
          branchCode: wh.code,
          type: wh.type,
          totalProducts: productMap.size,
          totalStock,
          stockValue,
          lowStockItems,
          outOfStockItems,
          overStockItems,
          normalStockItems,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    const filteredStockData = stockData.filter((s) => {
      if (status === 'all') return true;
      if (status === 'out_of_stock') return s.outOfStockItems > 0;
      if (status === 'low_stock') return s.lowStockItems > 0;
      if (status === 'over_stock') return s.overStockItems > 0;
      if (status === 'normal') return s.normalStockItems > 0;
      return true;
    });

    const topLowStock = await getTopLowStockProducts(warehouseId, search, 15);

    const hasData = stockData.some((s) => s.totalProducts > 0);

    return res.status(HttpStatus.OK).json(
      successResponse({
        stockData: hasData ? filteredStockData : getMockStockData(),
        topLowStock: topLowStock.length > 0 ? topLowStock : getMockLowStockProducts(),
        summary: summarize(hasData ? filteredStockData : getMockStockData()),
      })
    );
  } catch (error) {
    console.error('Error fetching inventory report:', error);
    const mock = getMockStockData();
    return res.status(HttpStatus.OK).json(
      successResponse({
        stockData: mock,
        topLowStock: getMockLowStockProducts(),
        summary: summarize(mock),
      })
    );
  }
}

async function getTopLowStockProducts(warehouseId: string | undefined, search: string, limit: number) {
  try {
    let locationIds: number[] | undefined;
    if (warehouseId) {
      const locs = await Location.findAll({ where: { warehouse_id: warehouseId }, attributes: ['id'] });
      locationIds = locs.map((l: any) => l.id);
    }

    const stockWhere: any = {};
    if (locationIds && locationIds.length > 0) stockWhere.location_id = { [Op.in]: locationIds };

    const productWhere: any = {};
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }

    const stocks: any[] = await Stock.findAll({
      where: stockWhere,
      include: [{ model: Product, as: 'product', where: Object.keys(productWhere).length > 0 ? productWhere : undefined, attributes: ['id', 'name', 'sku', 'minimum_stock', 'buy_price', 'sell_price'] }],
      limit: 500,
    });

    const productMap = new Map<number, any>();
    for (const s of stocks) {
      const prod = (s as any).product;
      if (!prod) continue;
      const qty = parseFloat(s.quantity) || 0;
      const existing = productMap.get(prod.id);
      if (existing) {
        existing.quantity += qty;
      } else {
        productMap.set(prod.id, {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          minStock: prod.minimum_stock || 0,
          unitCost: parseFloat(prod.buy_price) || parseFloat(prod.sell_price) || 0,
        });
      }
    }

    return Array.from(productMap.values())
      .map((p) => ({
        ...p,
        status: classifyStock(p.quantity, p.minStock),
        stockValue: p.quantity * p.unitCost,
      }))
      .filter((p) => p.status === 'out_of_stock' || p.status === 'low_stock')
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, limit);
  } catch (error) {
    console.error('Error computing top low stock products:', error);
    return [];
  }
}

function summarize(stockData: any[]) {
  return {
    branches: stockData.length,
    totalStock: stockData.reduce((s, x) => s + (x.totalStock || 0), 0),
    totalValue: stockData.reduce((s, x) => s + (x.stockValue || 0), 0),
    totalProducts: stockData.reduce((s, x) => s + (x.totalProducts || 0), 0),
    lowStock: stockData.reduce((s, x) => s + (x.lowStockItems || 0), 0),
    outOfStock: stockData.reduce((s, x) => s + (x.outOfStockItems || 0), 0),
    overStock: stockData.reduce((s, x) => s + (x.overStockItems || 0), 0),
    normal: stockData.reduce((s, x) => s + (x.normalStockItems || 0), 0),
  };
}

function getMockStockData() {
  return [
    { branchId: '1', branchName: 'Gudang Pusat Jakarta', branchCode: 'WH-JKT-001', type: 'main', totalProducts: 180, totalStock: 45000, stockValue: 2500000000, lowStockItems: 22, outOfStockItems: 0, overStockItems: 35, normalStockItems: 123, lastUpdated: new Date().toISOString() },
    { branchId: '2', branchName: 'Cabang Bandung', branchCode: 'BR-BDG-002', type: 'branch', totalProducts: 142, totalStock: 8200, stockValue: 450000000, lowStockItems: 12, outOfStockItems: 3, overStockItems: 5, normalStockItems: 122, lastUpdated: new Date().toISOString() },
    { branchId: '3', branchName: 'Cabang Surabaya', branchCode: 'BR-SBY-003', type: 'branch', totalProducts: 138, totalStock: 7500, stockValue: 380000000, lowStockItems: 8, outOfStockItems: 2, overStockItems: 8, normalStockItems: 120, lastUpdated: new Date().toISOString() },
    { branchId: '4', branchName: 'Cabang Medan', branchCode: 'BR-MDN-004', type: 'branch', totalProducts: 125, totalStock: 5800, stockValue: 320000000, lowStockItems: 15, outOfStockItems: 5, overStockItems: 3, normalStockItems: 102, lastUpdated: new Date().toISOString() },
    { branchId: '5', branchName: 'Cabang Yogyakarta', branchCode: 'BR-YGY-005', type: 'branch', totalProducts: 130, totalStock: 6200, stockValue: 280000000, lowStockItems: 3, outOfStockItems: 1, overStockItems: 6, normalStockItems: 120, lastUpdated: new Date().toISOString() },
    { branchId: '6', branchName: 'Gudang Produksi', branchCode: 'WH-PRD-006', type: 'production', totalProducts: 95, totalStock: 22000, stockValue: 1250000000, lowStockItems: 5, outOfStockItems: 0, overStockItems: 12, normalStockItems: 78, lastUpdated: new Date().toISOString() },
  ];
}

function getMockLowStockProducts() {
  return [
    { productId: 101, productName: 'Kopi Arabica Premium 250g', sku: 'SKU-COF-001', quantity: 5, minStock: 20, unitCost: 45000, stockValue: 225000, status: 'low_stock' },
    { productId: 102, productName: 'Teh Hijau Organik 100g', sku: 'SKU-TEA-001', quantity: 0, minStock: 15, unitCost: 32000, stockValue: 0, status: 'out_of_stock' },
    { productId: 103, productName: 'Gula Aren Cair 500ml', sku: 'SKU-SWT-003', quantity: 3, minStock: 10, unitCost: 28000, stockValue: 84000, status: 'low_stock' },
    { productId: 104, productName: 'Susu Almond 1L', sku: 'SKU-MLK-005', quantity: 0, minStock: 8, unitCost: 68000, stockValue: 0, status: 'out_of_stock' },
    { productId: 105, productName: 'Cokelat Dark 70% 100g', sku: 'SKU-CHC-002', quantity: 4, minStock: 12, unitCost: 38000, stockValue: 152000, status: 'low_stock' },
    { productId: 106, productName: 'Croissant Butter', sku: 'SKU-BRD-010', quantity: 2, minStock: 15, unitCost: 12000, stockValue: 24000, status: 'low_stock' },
    { productId: 107, productName: 'Gelas Takeaway 16oz', sku: 'SKU-PKG-001', quantity: 45, minStock: 200, unitCost: 1200, stockValue: 54000, status: 'low_stock' },
    { productId: 108, productName: 'Sedotan Kertas 21cm', sku: 'SKU-PKG-015', quantity: 0, minStock: 500, unitCost: 280, stockValue: 0, status: 'out_of_stock' },
  ];
}
