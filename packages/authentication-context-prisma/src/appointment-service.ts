export interface AppointmentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly customerId: string;
  readonly serviceId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: string;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AppointmentCreateInput {
  readonly tenantId: string;
  readonly customerId: string;
  readonly serviceId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: string;
  readonly notes?: string | null;
}

export interface AppointmentService {
  createAppointment(input: AppointmentCreateInput): Promise<AppointmentRecord>;
}

interface AppointmentPrismaClient {
  readonly appointment: {
    create: (args: { data: Record<string, unknown> }) => Promise<AppointmentRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AppointmentRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<AppointmentRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<AppointmentRecord>;
  };
  readonly customer: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly service: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createAppointmentService(prisma: AppointmentPrismaClient): AppointmentService {
  return {
    async createAppointment(input) {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      const service = await prisma.service.findUnique({ where: { id: input.serviceId } });

      if (customer === null || service === null || customer.tenantId !== input.tenantId || service.tenantId !== input.tenantId || customer.tenantId !== service.tenantId) {
        throw new Error("customer and service must belong to the same tenant");
      }

      return prisma.appointment.create({
        data: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          serviceId: input.serviceId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: input.status,
          notes: input.notes ?? null,
        },
      });
    },
  };
}
