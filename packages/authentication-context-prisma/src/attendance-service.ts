export interface AttendanceRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly staffId: string;
  readonly checkInAt: Date;
  readonly checkOutAt: Date | null;
  readonly status: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AttendanceCreateInput {
  readonly tenantId: string;
  readonly staffId: string;
  readonly checkInAt: Date;
  readonly checkOutAt?: Date | null;
  readonly status?: string | null;
  readonly notes?: string | null;
}

export interface AttendanceService {
  createAttendance(input: AttendanceCreateInput): Promise<AttendanceRecord>;
  getAttendance(args: { tenantId: string; attendanceId: string }): Promise<AttendanceRecord | null>;
  listAttendance(args: { tenantId: string }): Promise<AttendanceRecord[]>;
}

interface AttendancePrismaClient {
  readonly attendance: {
    create: (args: { data: Record<string, unknown> }) => Promise<AttendanceRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AttendanceRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<AttendanceRecord[]>;
  };
  readonly staff: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createAttendanceService(prisma: AttendancePrismaClient): AttendanceService {
  return {
    async createAttendance(input) {
      const staff = await prisma.staff.findUnique({ where: { id: input.staffId } });
      if (staff === null || staff.tenantId !== input.tenantId) {
        throw new Error("staff must belong to the same tenant");
      }

      return prisma.attendance.create({
        data: {
          tenantId: input.tenantId,
          staffId: input.staffId,
          checkInAt: input.checkInAt,
          checkOutAt: input.checkOutAt ?? null,
          status: input.status ?? null,
          notes: input.notes ?? null,
        },
      });
    },
    async getAttendance({ tenantId, attendanceId }) {
      const attendance = await prisma.attendance.findUnique({ where: { id: attendanceId } });
      if (attendance === null || attendance.tenantId !== tenantId) {
        return null;
      }
      return attendance;
    },
    async listAttendance({ tenantId }) {
      return prisma.attendance.findMany({ where: { tenantId } });
    },
  };
}
