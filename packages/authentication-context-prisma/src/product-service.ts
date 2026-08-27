export interface ProductRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly categoryId: string;
  readonly name: string;
  readonly sku: string;
  readonly unit: string;
  readonly priceCents: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ProductCreateInput {
  readonly tenantId: string;
  readonly categoryId: string;
  readonly name: string;
  readonly sku: string;
  readonly unit?: string;
  readonly priceCents: number;
  readonly isActive?: boolean;
}

export interface ProductUpdateInput {
  readonly categoryId?: string;
  readonly name?: string;
  readonly sku?: string;
  readonly unit?: string;
  readonly priceCents?: number;
  readonly isActive?: boolean;
}

export interface ProductService {
  createProduct(input: ProductCreateInput): Promise<ProductRecord>;
  getProduct(args: { tenantId: string; productId: string }): Promise<ProductRecord | null>;
  listProducts(args: { tenantId: string }): Promise<ProductRecord[]>;
  updateProduct(args: {
    tenantId: string;
    productId: string;
    input: ProductUpdateInput;
  }): Promise<ProductRecord | null>;
}

interface ProductPrismaClient {
  readonly product: {
    create: (args: { data: Record<string, unknown> }) => Promise<ProductRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<ProductRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<ProductRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<ProductRecord>;
  };
  readonly category: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createProductService(prisma: ProductPrismaClient): ProductService {
  return {
    async createProduct(input) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (category === null || category.tenantId !== input.tenantId) {
        throw new Error("category must belong to the same tenant");
      }

      return prisma.product.create({
        data: {
          tenantId: input.tenantId,
          categoryId: input.categoryId,
          name: input.name,
          sku: input.sku,
          unit: input.unit ?? "pcs",
          priceCents: input.priceCents,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getProduct({ tenantId, productId }) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (product === null || product.tenantId !== tenantId) {
        return null;
      }
      return product;
    },
    async listProducts({ tenantId }) {
      return prisma.product.findMany({ where: { tenantId } });
    },
    async updateProduct({ tenantId, productId, input }) {
      const existing = await prisma.product.findUnique({ where: { id: productId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.categoryId !== undefined) {
        const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
        if (category === null || category.tenantId !== tenantId) {
          throw new Error("category must belong to the same tenant");
        }
        data.categoryId = input.categoryId;
      }
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.sku !== undefined) {
        data.sku = input.sku;
      }
      if (input.unit !== undefined) {
        data.unit = input.unit;
      }
      if (input.priceCents !== undefined) {
        data.priceCents = input.priceCents;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.product.update({ where: { id: productId }, data });
    },
  };
}
