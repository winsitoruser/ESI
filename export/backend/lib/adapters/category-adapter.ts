import { prisma } from '../prisma';

interface CategoryData {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  tenantId: string;
}

export const categoryAdapter = {
  /**
   * Get all categories for a tenant with filtering options
   */
  getAll: async (
    tenantId: string, 
    search?: string, 
    activeOnly?: boolean,
    page = 1,
    limit = 20
  ) => {
    const skip = (page - 1) * limit;
    
    const where = {
      tenantId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ],
      } : {}),
      ...(activeOnly ? { isActive: true } : {}),
    };

    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  /**
   * Get a category by ID
   */
  getById: async (id: string, tenantId: string) => {
    return await prisma.category.findFirst({
      where: {
        id,
        tenantId
      }
    });
  },

  /**
   * Create a new category
   */
  create: async (data: CategoryData) => {
    return await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color || '#ef4444', // Default to red color to match theme
        isActive: data.isActive !== false,
        tenantId: data.tenantId
      }
    });
  },

  /**
   * Create multiple categories in a batch
   */
  createBatch: async (categories: CategoryData[]) => {
    return await prisma.$transaction(
      categories.map(category => 
        prisma.category.create({
          data: {
            name: category.name,
            description: category.description,
            color: category.color || '#ef4444', // Default to red color to match theme
            isActive: category.isActive !== false,
            tenantId: category.tenantId
          }
        })
      )
    );
  },

  /**
   * Update a category
   */
  update: async (id: string, data: Partial<CategoryData>, tenantId: string) => {
    return await prisma.category.updateMany({
      where: {
        id,
        tenantId
      },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        isActive: data.isActive
      }
    }).then(async () => {
      return await prisma.category.findFirst({
        where: { id, tenantId }
      });
    });
  },

  /**
   * Delete a category
   */
  delete: async (id: string, tenantId: string) => {
    const category = await prisma.category.findFirst({
      where: { id, tenantId }
    });

    if (!category) {
      return null;
    }

    return await prisma.category.delete({
      where: { id }
    });
  },

  /**
   * Delete multiple categories in a batch
   */
  deleteBatch: async (ids: string[], tenantId: string) => {
    try {
      // First verify that all categories belong to the tenant
      const categories = await prisma.category.findMany({
        where: {
          id: { in: ids },
          tenantId
        },
        select: { id: true }
      });

      const foundIds = categories.map(category => category.id);

      // Only delete categories that belong to the tenant
      const result = await prisma.category.deleteMany({
        where: {
          id: { in: foundIds }
        }
      });

      return { 
        count: result.count,
        deletedIds: foundIds
      };
    } catch (error) {
      // If we've deleted some categories but not others (due to foreign key constraints)
      // we should return the IDs of the ones we successfully deleted
      const successfullyDeleted = await prisma.category.findMany({
        where: {
          tenantId,
          id: { notIn: ids }
        },
        select: { id: true }
      });
      
      const deletedIds = ids.filter(id => 
        !successfullyDeleted.some(cat => cat.id === id)
      );
      
      throw {
        message: "Some categories could not be deleted due to constraints",
        deletedIds
      };
    }
  }
};
