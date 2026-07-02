/**
 * Supplier Adapter - Sequelize Database Operations
 * Handles supplier and principal database queries
 */

import { Sequelize, QueryTypes } from 'sequelize';

export interface SupplierResponse {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  taxId?: string;
  status: 'active' | 'inactive';
  paymentTerms?: string;
  bankName?: string;
  bankAccount?: string;
  notes?: string;
  rating?: number;
  categories?: string[];
  registrationDate?: string;
  lastOrder?: string;
  totalOrders?: number;
  totalSpent?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrincipalResponse {
  id: string;
  name: string;
  code: string;
  country: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: 'active' | 'inactive';
  categories?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export class SupplierAdapter {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
  }

  async getSuppliers(filters: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    city?: string;
    province?: string;
  }): Promise<{ suppliers: SupplierResponse[]; pagination: any }> {
    const { page, limit, search, status, city, province } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (search) {
      whereClause += ' AND (name ILIKE :search OR code ILIKE :search OR contact_person ILIKE :search OR email ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    if (city) {
      whereClause += ' AND city ILIKE :city';
      replacements.city = `%${city}%`;
    }

    if (province) {
      whereClause += ' AND province ILIKE :province';
      replacements.province = `%${province}%`;
    }

    const query = `
      SELECT
        id,
        name,
        code,
        contact_person as "contactPerson",
        email,
        phone,
        address,
        city,
        province,
        postal_code as "postalCode",
        tax_id as "taxId",
        status,
        payment_terms as "paymentTerms",
        bank_name as "bankName",
        bank_account as "bankAccount",
        notes,
        rating,
        categories,
        registration_date as "registrationDate",
        last_order as "lastOrder",
        total_orders as "totalOrders",
        total_spent as "totalSpent",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM suppliers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM suppliers
      ${whereClause}
    `;

    const [suppliers, countResult] = await Promise.all([
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
      suppliers: suppliers as SupplierResponse[],
      pagination: {
        total: parseInt(total),
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPrincipals(filters: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    country?: string;
  }): Promise<{ principals: PrincipalResponse[]; pagination: any }> {
    const { page, limit, search, status, country } = filters;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const replacements: any = { limit, offset };

    if (search) {
      whereClause += ' AND (name ILIKE :search OR code ILIKE :search OR contact_person ILIKE :search)';
      replacements.search = `%${search}%`;
    }

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    if (country) {
      whereClause += ' AND country ILIKE :country';
      replacements.country = `%${country}%`;
    }

    const query = `
      SELECT
        id,
        name,
        code,
        country,
        contact_person as "contactPerson",
        email,
        phone,
        website,
        status,
        categories,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM principals
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM principals
      ${whereClause}
    `;

    const [principals, countResult] = await Promise.all([
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
      principals: principals as PrincipalResponse[],
      pagination: {
        total: parseInt(total),
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createSupplier(data: any): Promise<SupplierResponse> {
    const query = `
      INSERT INTO suppliers (
        name, code, contact_person, email, phone, address, city, province,
        postal_code, tax_id, status, payment_terms, bank_name, bank_account,
        notes, rating, categories, created_at, updated_at
      ) VALUES (
        :name, :code, :contactPerson, :email, :phone, :address, :city, :province,
        :postalCode, :taxId, :status, :paymentTerms, :bankName, :bankAccount,
        :notes, :rating, :categories, NOW(), NOW()
      ) RETURNING *
    `;

    const [result] = await this.sequelize.query(query, {
      replacements: {
        name: data.name,
        code: data.code,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
        taxId: data.taxId || null,
        status: data.status || 'active',
        paymentTerms: data.paymentTerms || null,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        notes: data.notes || null,
        rating: data.rating || null,
        categories: data.categories || null
      },
      type: QueryTypes.SELECT
    });

    return result as unknown as SupplierResponse;
  }

  async createPrincipal(data: any): Promise<PrincipalResponse> {
    const query = `
      INSERT INTO principals (
        name, code, country, contact_person, email, phone, website,
        status, categories, created_at, updated_at
      ) VALUES (
        :name, :code, :country, :contactPerson, :email, :phone, :website,
        :status, :categories, NOW(), NOW()
      ) RETURNING *
    `;

    const [result] = await this.sequelize.query(query, {
      replacements: {
        name: data.name,
        code: data.code,
        country: data.country,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        status: data.status || 'active',
        categories: data.categories || null
      },
      type: QueryTypes.SELECT
    });

    return result as unknown as PrincipalResponse;
  }
}
