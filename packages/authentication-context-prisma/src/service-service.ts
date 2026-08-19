export interface ServiceRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceCents: number;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ServiceCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly durationMinutes: number;
  readonly priceCents: number;
  readonly description?: string | null;
}

export interface ServiceUpdateInput {
  readonly name?: string;
  readonly durationMinutes?: number;
  readonly priceCents?: number;
  readonly description?: string | null;
}

export interface ServiceService {
  createService(input: ServiceCreateInput): Promise<ServiceRecord>;
  getService(args: { tenantId: string; serviceId: string }): Promise<ServiceRecord | null>;
  listServices(args: { tenantId: string }): Promise<ServiceRecord[]>;
  updateService(args: { tenantId: string; serviceId: string; input: ServiceUpdateInput }): Promise<ServiceRecord | null>;
}

interface ServicePrismaClient {
  readonly service: {
    create: (args: { data: Record<string, unknown> }) => Promise<ServiceRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<ServiceRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<ServiceRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<ServiceRecord>;
    delete: (args: { where: { id: string } }) => Promise<ServiceRecord>;
  };
}

export function createServiceService(prisma: ServicePrismaClient): ServiceService {
  return {
    async createService(input) {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error("service name is required");
      }
      if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
        throw new Error("service duration must be a positive whole number of minutes");
      }
      if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
        throw new Error("service price must be a non-negative whole number of cents");
      }

      return prisma.service.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          durationMinutes: input.durationMinutes,
          priceCents: input.priceCents,
          description: input.description ?? null,
          isActive: true,
        },
      });
    },
    async getService({ tenantId, serviceId }) {
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (service === null) {
        return null;
      }
      if (service.tenantId !== tenantId) {
        return null;
      }
      return service;
    },
    async listServices({ tenantId }) {
      return prisma.service.findMany({ where: { tenantId } });
    },
    async updateService({ tenantId, serviceId, input }) {
      const existing = await prisma.service.findUnique({ where: { id: serviceId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        if (typeof input.name !== "string" || input.name.trim().length === 0) {
          throw new Error("service name is required");
        }
        data.name = input.name;
      }
      if (input.durationMinutes !== undefined) {
        if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
          throw new Error("service duration must be a positive whole number of minutes");
        }
        data.durationMinutes = input.durationMinutes;
      }
      if (input.priceCents !== undefined) {
        if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
          throw new Error("service price must be a non-negative whole number of cents");
        }
        data.priceCents = input.priceCents;
      }
      if (input.description !== undefined) {
        data.description = input.description;
      }
      return prisma.service.update({ where: { id: serviceId }, data });
    },
  };
}
