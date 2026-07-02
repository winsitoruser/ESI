import { Sequelize, QueryTypes } from 'sequelize';

export interface AdjustmentItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  newStock: number;
  adjustmentQuantity: number;
  adjustmentType: "increase" | "decrease";
  reason: string;
  notes?: string;
}

export interface AdjustmentRequest {
  adjustmentNumber?: string;
  date: string;
  adjustedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  items: AdjustmentItem[];
}

export interface AdjustmentResponse {
  id: string;
  adjustmentNumber: string;
  date: string;
  adjustedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  totalItems: number;
  items: AdjustmentItem[];
  createdAt: string;
  updatedAt: string;
}

export class InventoryAdjustmentAdapter {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  async getAdjustments(filters: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    adjustmentType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ adjustments: AdjustmentResponse[]; pagination: any }> {
    const { page, limit, search, status, startDate, endDate } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (search) {
      whereClause += ' AND (adjustment_number ILIKE :search OR adjusted_by ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    if (startDate) {
      whereClause += ' AND date >= :startDate';
      replacements.startDate = startDate;
    }

    if (endDate) {
      whereClause += ' AND date <= :endDate';
      replacements.endDate = endDate;
    }

    const query = `
      SELECT 
        id,
        adjustment_number as "adjustmentNumber",
        date,
        adjusted_by as "adjustedBy",
        approved_by as "approvedBy",
        status,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM inventory_adjustments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_adjustments
      ${whereClause}
    `;

    const [adjustments, countResult] = await Promise.all([
      this.sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      }),
      this.sequelize.query(countQuery, {
        replacements,
        type: QueryTypes.SELECT
      })
    ]);

    const total = (countResult[0] as any).total;

    return {
      adjustments: adjustments as any[],
      pagination: {
        total: parseInt(total),
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createAdjustment(data: AdjustmentRequest): Promise<AdjustmentResponse> {
    const adjustmentNumber = data.adjustmentNumber || `ADJ-${Date.now()}`;
    
    const query = `
      INSERT INTO inventory_adjustments (
        adjustment_number, date, adjusted_by, approved_by, status, notes, created_at, updated_at
      ) VALUES (
        :adjustmentNumber, :date, :adjustedBy, :approvedBy, :status, :notes, NOW(), NOW()
      ) RETURNING *
    `;

    const result = await this.sequelize.query(query, {
      replacements: {
        adjustmentNumber,
        date: data.date,
        adjustedBy: data.adjustedBy,
        approvedBy: data.approvedBy || null,
        status: data.status,
        notes: data.notes || null
      },
      type: QueryTypes.INSERT
    });

    return {
      id: (result[0] as any).id,
      adjustmentNumber,
      date: data.date,
      adjustedBy: data.adjustedBy,
      approvedBy: data.approvedBy,
      status: data.status,
      notes: data.notes,
      totalItems: data.items.length,
      items: data.items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
