export interface WarehouseRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly location: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WarehouseCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly location?: string | null;
  readonly isActive?: boolean;
}

export interface WarehouseUpdateInput {
  readonly name?: string;
  readonly location?: string | null;
  readonly isActive?: boolean;
}

export interface WarehouseService {
  createWarehouse(input: WarehouseCreateInput): Promise<WarehouseRecord>;
  getWarehouse(args: { tenantId: string; warehouseId: string }): Promise<WarehouseRecord | null>;
  listWarehouses(args: { tenantId: string }): Promise<WarehouseRecord[]>;
  updateWarehouse(args: {
    tenantId: string;
    warehouseId: string;
    input: WarehouseUpdateInput;
  }): Promise<WarehouseRecord | null>;
}

interface WarehousePrismaClient {
  readonly warehouse: {
    create: (args: { data: Record<string, unknown> }) => Promise<WarehouseRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<WarehouseRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<WarehouseRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<WarehouseRecord>;
  };
}

export function createWarehouseService(prisma: WarehousePrismaClient): WarehouseService {
  return {
    async createWarehouse(input) {
      return prisma.warehouse.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          location: input.location ?? null,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getWarehouse({ tenantId, warehouseId }) {
      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (warehouse === null || warehouse.tenantId !== tenantId) {
        return null;
      }
      return warehouse;
    },
    async listWarehouses({ tenantId }) {
      return prisma.warehouse.findMany({
        where: { tenantId, isActive: true },
      });
    },
    async updateWarehouse({ tenantId, warehouseId, input }) {
      const existing = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.location !== undefined) {
        data.location = input.location ?? null;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.warehouse.update({ where: { id: warehouseId }, data });
    },
  };
}
