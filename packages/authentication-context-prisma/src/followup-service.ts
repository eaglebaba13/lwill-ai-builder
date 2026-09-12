export interface FollowupRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly notes: string | null;
  readonly dueAt: Date;
  readonly status: string;
  readonly leadId: string | null;
  readonly customerId: string | null;
  readonly opportunityId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FollowupCreateInput {
  readonly title: string;
  readonly notes?: string | null;
  readonly dueAt: string;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface FollowupUpdateInput {
  readonly title?: string;
  readonly notes?: string | null;
  readonly dueAt?: string;
  readonly status?: string;
}

export interface FollowupService {
  createFollowup(args: { tenantId: string; input: FollowupCreateInput }): Promise<FollowupRecord>;
  getFollowup(args: { tenantId: string; followupId: string }): Promise<FollowupRecord | null>;
  listFollowups(args: { tenantId: string; status?: string; leadId?: string; customerId?: string; opportunityId?: string }): Promise<readonly FollowupRecord[]>;
  updateFollowup(args: { tenantId: string; followupId: string; input: FollowupUpdateInput }): Promise<FollowupRecord | null>;
}

interface FollowupPrismaClient {
  readonly followup: {
    create: (args: { data: Record<string, unknown> }) => Promise<FollowupRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<FollowupRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<FollowupRecord[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<FollowupRecord>;
  };
}

export function createFollowupService(prisma: FollowupPrismaClient): FollowupService {
  return {
    async createFollowup({ tenantId, input }) {
      return prisma.followup.create({
        data: {
          tenantId,
          title: input.title,
          notes: input.notes ?? null,
          dueAt: new Date(input.dueAt),
          leadId: input.leadId ?? null,
          customerId: input.customerId ?? null,
          opportunityId: input.opportunityId ?? null,
        },
      });
    },

    async getFollowup({ tenantId, followupId }) {
      const followup = await prisma.followup.findUnique({ where: { id: followupId } });
      if (followup === null || followup.tenantId !== tenantId) return null;
      return followup;
    },

    async listFollowups({ tenantId, status, leadId, customerId, opportunityId }) {
      const where: Record<string, unknown> = { tenantId };
      if (status !== undefined) where.status = status;
      if (leadId !== undefined) where.leadId = leadId;
      if (customerId !== undefined) where.customerId = customerId;
      if (opportunityId !== undefined) where.opportunityId = opportunityId;
      return prisma.followup.findMany({ where, orderBy: { dueAt: "asc" } });
    },

    async updateFollowup({ tenantId, followupId, input }) {
      const existing = await prisma.followup.findUnique({ where: { id: followupId } });
      if (existing === null || existing.tenantId !== tenantId) return null;

      const data: Record<string, unknown> = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.dueAt !== undefined) data.dueAt = new Date(input.dueAt);
      if (input.status !== undefined) data.status = input.status;

      if (Object.keys(data).length === 0) return existing;
      return prisma.followup.update({ where: { id: followupId }, data });
    },
  };
}
