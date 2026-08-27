export interface CategoryRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CategoryCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface CategoryUpdateInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface CategoryService {
  createCategory(input: CategoryCreateInput): Promise<CategoryRecord>;
  getCategory(args: { tenantId: string; categoryId: string }): Promise<CategoryRecord | null>;
  listCategories(args: { tenantId: string }): Promise<CategoryRecord[]>;
  updateCategory(args: {
    tenantId: string;
    categoryId: string;
    input: CategoryUpdateInput;
  }): Promise<CategoryRecord | null>;
}

interface CategoryPrismaClient {
  readonly category: {
    create: (args: { data: Record<string, unknown> }) => Promise<CategoryRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<CategoryRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<CategoryRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<CategoryRecord>;
  };
}

export function createCategoryService(prisma: CategoryPrismaClient): CategoryService {
  return {
    async createCategory(input) {
      return prisma.category.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          description: input.description ?? null,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getCategory({ tenantId, categoryId }) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (category === null || category.tenantId !== tenantId) {
        return null;
      }
      return category;
    },
    async listCategories({ tenantId }) {
      return prisma.category.findMany({ where: { tenantId } });
    },
    async updateCategory({ tenantId, categoryId, input }) {
      const existing = await prisma.category.findUnique({ where: { id: categoryId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.description !== undefined) {
        data.description = input.description;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.category.update({ where: { id: categoryId }, data });
    },
  };
}
