export interface MembershipRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly customerId: string;
  readonly packageId: string;
  readonly startedAt: Date;
  readonly endsAt: Date | null;
  readonly status: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MembershipCreateInput {
  readonly tenantId: string;
  readonly customerId: string;
  readonly packageId: string;
  readonly startedAt: Date;
  readonly endsAt?: Date | null;
  readonly status?: string | null;
}

export interface MembershipService {
  createMembership(input: MembershipCreateInput): Promise<MembershipRecord>;
  getMembership(args: { tenantId: string; membershipId: string }): Promise<MembershipRecord | null>;
  listMemberships(args: { tenantId: string }): Promise<MembershipRecord[]>;
}

interface MembershipPrismaClient {
  readonly membership: {
    create: (args: { data: Record<string, unknown> }) => Promise<MembershipRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<MembershipRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<MembershipRecord[]>;
  };
  readonly customer: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly package: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
}

export function createMembershipService(prisma: MembershipPrismaClient): MembershipService {
  return {
    async createMembership(input) {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });

      if (customer === null || pkg === null || customer.tenantId !== input.tenantId || pkg.tenantId !== input.tenantId || customer.tenantId !== pkg.tenantId) {
        throw new Error("customer and package must belong to the same tenant");
      }

      return prisma.membership.create({
        data: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          packageId: input.packageId,
          startedAt: input.startedAt,
          endsAt: input.endsAt ?? null,
          status: input.status ?? null,
        },
      });
    },
    async getMembership({ tenantId, membershipId }) {
      const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
      if (membership === null || membership.tenantId !== tenantId) {
        return null;
      }
      return membership;
    },
    async listMemberships({ tenantId }) {
      return prisma.membership.findMany({ where: { tenantId } });
    },
  };
}
