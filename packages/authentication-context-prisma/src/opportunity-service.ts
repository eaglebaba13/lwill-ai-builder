export interface PipelineRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface StageRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly pipelineId: string;
  readonly name: string;
  readonly position: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OpportunityRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly pipelineId: string;
  readonly stageId: string;
  readonly name: string;
  readonly customerId: string | null;
  readonly leadId: string | null;
  readonly valueCents: number;
  readonly status: string;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PipelineCreateInput {
  readonly name: string;
}

export interface StageCreateInput {
  readonly pipelineId: string;
  readonly name: string;
  readonly position: number;
}

export interface OpportunityCreateInput {
  readonly pipelineId: string;
  readonly stageId: string;
  readonly name: string;
  readonly customerId?: string | null;
  readonly leadId?: string | null;
  readonly valueCents?: number;
  readonly notes?: string | null;
}

export interface OpportunityUpdateInput {
  readonly name?: string;
  readonly valueCents?: number;
  readonly notes?: string | null;
  readonly status?: string;
}

export interface OpportunityWithRelations extends OpportunityRecord {
  readonly pipeline: PipelineRecord;
  readonly stage: StageRecord;
}

export interface OpportunityService {
  createPipeline(args: { tenantId: string; input: PipelineCreateInput }): Promise<PipelineRecord>;
  listPipelines(args: { tenantId: string }): Promise<readonly PipelineRecord[]>;
  getPipeline(args: { tenantId: string; pipelineId: string }): Promise<PipelineRecord | null>;

  createStage(args: { tenantId: string; input: StageCreateInput }): Promise<StageRecord>;
  listStages(args: { tenantId: string; pipelineId: string }): Promise<readonly StageRecord[]>;

  createOpportunity(args: { tenantId: string; input: OpportunityCreateInput; actorUserId?: string | null }): Promise<OpportunityRecord>;
  getOpportunity(args: { tenantId: string; opportunityId: string }): Promise<OpportunityWithRelations | null>;
  listOpportunities(args: { tenantId: string; pipelineId?: string; status?: string }): Promise<readonly OpportunityWithRelations[]>;
  updateOpportunity(args: { tenantId: string; opportunityId: string; input: OpportunityUpdateInput; actorUserId?: string | null }): Promise<OpportunityRecord | null>;
  moveOpportunity(args: { tenantId: string; opportunityId: string; stageId: string; actorUserId?: string | null }): Promise<OpportunityRecord | null>;
}

interface OpportunityPrismaClient {
  readonly pipeline: {
    create: (args: { data: Record<string, unknown> }) => Promise<PipelineRecord>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<PipelineRecord[]>;
    findUnique: (args: { where: { id: string } }) => Promise<PipelineRecord | null>;
  };
  readonly stage: {
    create: (args: { data: Record<string, unknown> }) => Promise<StageRecord>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<StageRecord[]>;
    findUnique: (args: { where: { id: string } }) => Promise<StageRecord | null>;
  };
  readonly opportunity: {
    create: (args: { data: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<OpportunityRecord>;
    findUnique: (args: { where: { id: string }; include?: Record<string, unknown> }) => Promise<OpportunityRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown>; include?: Record<string, unknown> }) => Promise<OpportunityRecord[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<OpportunityRecord>;
  };
  readonly customer: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly lead: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string } | null>;
  };
  readonly auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
}

const PIPELINE_INCLUDE = { pipeline: true, stage: true };

function recordAudit(
  prisma: OpportunityPrismaClient,
  args: { tenantId: string; actorUserId: string | null; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> },
): void {
  const auditLog = (prisma as { auditLog?: unknown }).auditLog;
  if (auditLog === undefined) return;
  void (auditLog as { create: (a: { data: Record<string, unknown> }) => Promise<unknown> })
    .create({ data: args })
    .catch(() => {});
}

export function createOpportunityService(prisma: OpportunityPrismaClient): OpportunityService {
  return {
    async createPipeline({ tenantId, input }) {
      return prisma.pipeline.create({
        data: { tenantId, name: input.name },
      });
    },

    async listPipelines({ tenantId }) {
      return prisma.pipeline.findMany({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
    },

    async getPipeline({ tenantId, pipelineId }) {
      const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
      if (pipeline === null || pipeline.tenantId !== tenantId) return null;
      return pipeline;
    },

    async createStage({ tenantId, input }) {
      const pipeline = await prisma.pipeline.findUnique({ where: { id: input.pipelineId } });
      if (pipeline === null || pipeline.tenantId !== tenantId) {
        throw new Error("pipeline must belong to the same tenant");
      }
      return prisma.stage.create({
        data: { tenantId, pipelineId: input.pipelineId, name: input.name, position: input.position },
      });
    },

    async listStages({ tenantId, pipelineId }) {
      return prisma.stage.findMany({
        where: { tenantId, pipelineId, isActive: true },
        orderBy: { position: "asc" },
      });
    },

    async createOpportunity({ tenantId, input, actorUserId }) {
      const pipeline = await prisma.pipeline.findUnique({ where: { id: input.pipelineId } });
      if (pipeline === null || pipeline.tenantId !== tenantId) {
        throw new Error("pipeline must belong to the same tenant");
      }

      const stage = await prisma.stage.findUnique({ where: { id: input.stageId } });
      if (stage === null || stage.tenantId !== tenantId || stage.pipelineId !== input.pipelineId) {
        throw new Error("stage must belong to the same pipeline and tenant");
      }

      if (input.customerId !== undefined && input.customerId !== null) {
        const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
        if (customer === null || customer.tenantId !== tenantId) {
          throw new Error("customer must belong to the same tenant");
        }
      }

      if (input.leadId !== undefined && input.leadId !== null) {
        const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
        if (lead === null || lead.tenantId !== tenantId) {
          throw new Error("lead must belong to the same tenant");
        }
      }

      const opportunity = await prisma.opportunity.create({
        data: {
          tenantId,
          pipelineId: input.pipelineId,
          stageId: input.stageId,
          name: input.name,
          customerId: input.customerId ?? null,
          leadId: input.leadId ?? null,
          valueCents: input.valueCents ?? 0,
          notes: input.notes ?? null,
        },
      });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "opportunity.created",
        entityType: "Opportunity",
        entityId: opportunity.id,
        metadata: { name: opportunity.name, pipelineId: input.pipelineId, stageId: input.stageId },
      });

      return opportunity;
    },

    async getOpportunity({ tenantId, opportunityId }) {
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: PIPELINE_INCLUDE,
      });
      if (opportunity === null || opportunity.tenantId !== tenantId) return null;
      return opportunity as unknown as OpportunityWithRelations;
    },

    async listOpportunities({ tenantId, pipelineId, status }) {
      const where: Record<string, unknown> = { tenantId };
      if (pipelineId !== undefined) where.pipelineId = pipelineId;
      if (status !== undefined) where.status = status;
      return prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: PIPELINE_INCLUDE,
      }) as unknown as Promise<readonly OpportunityWithRelations[]>;
    },

    async updateOpportunity({ tenantId, opportunityId, input, actorUserId }) {
      const existing = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      if (existing === null || existing.tenantId !== tenantId) return null;

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.valueCents !== undefined) data.valueCents = input.valueCents;
      if (input.notes !== undefined) data.notes = input.notes;
      if (input.status !== undefined) data.status = input.status;

      if (Object.keys(data).length === 0) return existing;
      const updated = await prisma.opportunity.update({ where: { id: opportunityId }, data });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "opportunity.updated",
        entityType: "Opportunity",
        entityId: opportunityId,
        metadata: { changes: data },
      });

      return updated;
    },

    async moveOpportunity({ tenantId, opportunityId, stageId, actorUserId }) {
      const existing = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      if (existing === null || existing.tenantId !== tenantId) return null;

      const stage = await prisma.stage.findUnique({ where: { id: stageId } });
      if (stage === null || stage.tenantId !== tenantId || stage.pipelineId !== existing.pipelineId) {
        throw new Error("stage must belong to the same pipeline and tenant");
      }

      const previousStageId = existing.stageId;
      const updated = await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { stageId },
      });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "opportunity.moved",
        entityType: "Opportunity",
        entityId: opportunityId,
        metadata: { previousStageId, newStageId: stageId },
      });

      return updated;
    },
  };
}
