export interface SupplierRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly contactName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SupplierCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly contactName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly isActive?: boolean;
}

export interface SupplierUpdateInput {
  readonly name?: string;
  readonly contactName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly isActive?: boolean;
}

export interface SupplierService {
  createSupplier(input: SupplierCreateInput): Promise<SupplierRecord>;
  getSupplier(args: { tenantId: string; supplierId: string }): Promise<SupplierRecord | null>;
  listSuppliers(args: { tenantId: string }): Promise<SupplierRecord[]>;
  updateSupplier(args: {
    tenantId: string;
    supplierId: string;
    input: SupplierUpdateInput;
  }): Promise<SupplierRecord | null>;
}

interface SupplierPrismaClient {
  readonly supplier: {
    create: (args: { data: Record<string, unknown> }) => Promise<SupplierRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<SupplierRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<SupplierRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<SupplierRecord>;
  };
}

export function createSupplierService(prisma: SupplierPrismaClient): SupplierService {
  return {
    async createSupplier(input) {
      return prisma.supplier.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          contactName: input.contactName ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getSupplier({ tenantId, supplierId }) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (supplier === null || supplier.tenantId !== tenantId) {
        return null;
      }
      return supplier;
    },
    async listSuppliers({ tenantId }) {
      return prisma.supplier.findMany({
        where: { tenantId, isActive: true },
      });
    },
    async updateSupplier({ tenantId, supplierId, input }) {
      const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.contactName !== undefined) {
        data.contactName = input.contactName ?? null;
      }
      if (input.email !== undefined) {
        data.email = input.email ?? null;
      }
      if (input.phone !== undefined) {
        data.phone = input.phone ?? null;
      }
      if (input.address !== undefined) {
        data.address = input.address ?? null;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.supplier.update({ where: { id: supplierId }, data });
    },
  };
}
