export interface AppointmentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly customerId: string;
  readonly serviceId: string;
  readonly staffId: string | null;
  readonly branchId: string | null;
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
  readonly staffId?: string | null;
  readonly branchId?: string | null;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: string;
  readonly notes?: string | null;
}

export interface AppointmentUpdateInput {
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly status?: string;
  readonly notes?: string | null;
}

export interface AppointmentService {
  createAppointment(input: AppointmentCreateInput): Promise<AppointmentRecord>;
  getAppointment(args: { tenantId: string; appointmentId: string }): Promise<AppointmentRecord | null>;
  listAppointments(args: { tenantId: string }): Promise<AppointmentRecord[]>;
  updateAppointment(args: { tenantId: string; appointmentId: string; input: AppointmentUpdateInput }): Promise<AppointmentRecord | null>;
}

interface AppointmentPrismaClient {
  readonly appointment: {
    create: (args: { data: Record<string, unknown> }) => Promise<AppointmentRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AppointmentRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<AppointmentRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<AppointmentRecord>;
  };
  readonly customer: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly service: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly branch: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly staff: {
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

      let resolvedBranchId: string | null = null;
      if (input.branchId !== undefined && input.branchId !== null) {
        const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
        if (branch === null || branch.tenantId !== input.tenantId) {
          throw new Error("branch must belong to the same tenant");
        }
        resolvedBranchId = branch.id;
      }

      let resolvedStaffId: string | null = null;
      if (input.staffId !== undefined && input.staffId !== null) {
        const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
        if (staff === null || staff.tenantId !== input.tenantId) {
          throw new Error("staff must belong to the same tenant");
        }
        resolvedStaffId = staff.id;
      }

      return prisma.appointment.create({
        data: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          serviceId: input.serviceId,
          staffId: resolvedStaffId,
          branchId: resolvedBranchId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: input.status,
          notes: input.notes ?? null,
        },
      });
    },
    async getAppointment({ tenantId, appointmentId }) {
      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (appointment === null) {
        return null;
      }
      if (appointment.tenantId !== tenantId) {
        return null;
      }
      return appointment;
    },
    async listAppointments({ tenantId }) {
      return prisma.appointment.findMany({
        where: { tenantId },
        orderBy: { startsAt: "desc" },
      });
    },
    async updateAppointment({ tenantId, appointmentId, input }) {
      const existing = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.startsAt !== undefined) {
        if (!(input.startsAt instanceof Date) || Number.isNaN(input.startsAt.getTime())) {
          throw new Error("appointment startsAt must be a valid date");
        }
        data.startsAt = input.startsAt;
      }
      if (input.endsAt !== undefined) {
        if (!(input.endsAt instanceof Date) || Number.isNaN(input.endsAt.getTime())) {
          throw new Error("appointment endsAt must be a valid date");
        }
        const startsAt = (input.startsAt ?? existing.startsAt) as Date;
        if (input.endsAt <= startsAt) {
          throw new Error("appointment endsAt must be after startsAt");
        }
        data.endsAt = input.endsAt;
      }
      if (input.status !== undefined) {
        if (typeof input.status !== "string" || input.status.trim().length === 0) {
          throw new Error("appointment status is required");
        }
        data.status = input.status;
      }
      if (input.notes !== undefined) {
        if (input.notes !== null && (typeof input.notes !== "string" || input.notes.trim().length === 0)) {
          throw new Error("appointment notes must be null or a non-empty string");
        }
        data.notes = input.notes;
      }
      return prisma.appointment.update({ where: { id: appointmentId }, data });
    },
  };
}
