export interface StaffRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly branchId: string | null;
  readonly displayName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StaffCreateInput {
  readonly tenantId: string;
  readonly displayName: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly branchId?: string | null;
  readonly isActive?: boolean;
}

export interface StaffService {
  createStaff(input: StaffCreateInput): Promise<StaffRecord>;
  getStaff(args: { tenantId: string; staffId: string }): Promise<StaffRecord | null>;
  listStaff(args: { tenantId: string }): Promise<StaffRecord[]>;
  updateStaff(args: { tenantId: string; staffId: string; input: StaffUpdateInput }): Promise<StaffRecord | null>;
}

export interface StaffUpdateInput {
  readonly displayName?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly branchId?: string | null;
  readonly isActive?: boolean;
}

interface StaffPrismaClient {
  readonly staff: {
    create: (args: { data: Record<string, unknown> }) => Promise<StaffRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<StaffRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<StaffRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<StaffRecord>;
  };
  readonly branch: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createStaffService(prisma: StaffPrismaClient): StaffService {
  return {
    async createStaff(input) {
      if (input.branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
        if (branch === null || branch.tenantId !== input.tenantId) {
          throw new Error("branch must belong to the same tenant");
        }
      }

      return prisma.staff.create({
        data: {
          tenantId: input.tenantId,
          displayName: input.displayName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          branchId: input.branchId ?? null,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getStaff({ tenantId, staffId }) {
      const staff = await prisma.staff.findUnique({ where: { id: staffId } });
      if (staff === null || staff.tenantId !== tenantId) {
        return null;
      }
      return staff;
    },
    async listStaff({ tenantId }) {
      return prisma.staff.findMany({ where: { tenantId } });
    },
    async updateStaff({ tenantId, staffId, input }) {
      const existing = await prisma.staff.findUnique({ where: { id: staffId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.displayName !== undefined) {
        data.displayName = input.displayName;
      }
      if (input.email !== undefined) {
        data.email = input.email;
      }
      if (input.phone !== undefined) {
        data.phone = input.phone;
      }
      if (input.branchId !== undefined) {
        if (input.branchId !== null) {
          const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
          if (branch === null || branch.tenantId !== tenantId) {
            throw new Error("branch must belong to the same tenant");
          }
        }
        data.branchId = input.branchId;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.staff.update({ where: { id: staffId }, data });
    },
  };
}
