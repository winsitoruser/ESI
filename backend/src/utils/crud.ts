import { Response } from 'express';
import { Model, ModelStatic, WhereOptions, FindOptions, Op } from 'sequelize';
import { AuthRequest, PaginationQuery } from '../types';
import { sendSuccess, sendError, sendPaginated, parsePagination } from './helpers';
import logger from './logger';

export class CrudController<T extends Model> {
  protected model: ModelStatic<T>;
  protected modelName: string;
  protected searchFields: string[];
  protected defaultIncludes: any[];

  constructor(model: ModelStatic<T>, modelName: string, searchFields: string[] = ['name'], defaultIncludes: any[] = []) {
    this.model = model;
    this.modelName = modelName;
    this.searchFields = searchFields;
    this.defaultIncludes = defaultIncludes;
  }

  list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const pagination = parsePagination(req.query);
      const where: any = {};

      if (req.tenantId) where.tenant_id = req.tenantId;
      if (req.branchId && req.query.branch_scope !== 'false') where.branch_id = req.branchId;

      if (pagination.search && this.searchFields.length > 0) {
        where[Op.or] = this.searchFields.map(field => ({
          [field]: { [Op.iLike]: `%${pagination.search}%` },
        }));
      }

      // Additional filters from query
      const filterKeys = Object.keys(req.query).filter(k =>
        !['page', 'limit', 'sortBy', 'sortOrder', 'search', 'branch_scope'].includes(k)
      );
      for (const key of filterKeys) {
        if (req.query[key]) where[key] = req.query[key];
      }

      const { count, rows } = await this.model.findAndCountAll({
        where,
        include: this.defaultIncludes,
        order: [[pagination.sortBy || 'created_at', pagination.sortOrder || 'DESC']],
        limit: pagination.limit,
        offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
      });

      sendPaginated(res, rows, count, pagination);
    } catch (error: any) {
      logger.error(`Error listing ${this.modelName}:`, error);
      sendError(res, `Failed to list ${this.modelName}`, 500);
    }
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const where: any = { id };
      if (req.tenantId) where.tenant_id = req.tenantId;

      const record = await this.model.findOne({ where, include: this.defaultIncludes });
      if (!record) {
        sendError(res, `${this.modelName} not found`, 404);
        return;
      }
      sendSuccess(res, record);
    } catch (error: any) {
      logger.error(`Error getting ${this.modelName}:`, error);
      sendError(res, `Failed to get ${this.modelName}`, 500);
    }
  };

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const data: any = { ...req.body };
      if (req.tenantId) data.tenant_id = req.tenantId;
      if (req.branchId && !data.branch_id) data.branch_id = req.branchId;
      if (req.user?.id) data.created_by = req.user.id;

      const record = await this.model.create(data);
      sendSuccess(res, record, `${this.modelName} created`, 201);
    } catch (error: any) {
      logger.error(`Error creating ${this.modelName}:`, error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        sendError(res, `${this.modelName} already exists`, 409);
        return;
      }
      if (error.name === 'SequelizeValidationError') {
        sendError(res, 'Validation error', 422, error.errors);
        return;
      }
      sendError(res, `Failed to create ${this.modelName}`, 500);
    }
  };

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const where: any = { id };
      if (req.tenantId) where.tenant_id = req.tenantId;

      const record = await this.model.findOne({ where });
      if (!record) {
        sendError(res, `${this.modelName} not found`, 404);
        return;
      }

      const data: any = { ...req.body };
      if (req.user?.id) data.updated_by = req.user.id;

      await record.update(data);
      sendSuccess(res, record, `${this.modelName} updated`);
    } catch (error: any) {
      logger.error(`Error updating ${this.modelName}:`, error);
      sendError(res, `Failed to update ${this.modelName}`, 500);
    }
  };

  delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const where: any = { id };
      if (req.tenantId) where.tenant_id = req.tenantId;

      const record = await this.model.findOne({ where });
      if (!record) {
        sendError(res, `${this.modelName} not found`, 404);
        return;
      }

      await record.destroy();
      sendSuccess(res, null, `${this.modelName} deleted`);
    } catch (error: any) {
      logger.error(`Error deleting ${this.modelName}:`, error);
      sendError(res, `Failed to delete ${this.modelName}`, 500);
    }
  };
}
