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

export interface ServiceService {
  createService(input: ServiceCreateInput): Promise<ServiceRecord>;
  getService(args: { tenantId: string; serviceId: string }): Promise<ServiceRecord | null>;
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
  };
}
