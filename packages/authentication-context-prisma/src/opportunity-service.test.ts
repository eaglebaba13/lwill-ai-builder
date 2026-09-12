import { describe, expect, it, vi } from "vitest";
import { createOpportunityService } from "./opportunity-service";

type AuditCapture = Array<{ tenantId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> }>;

function createPrisma(overrides: {
  pipelines?: Array<{ id: string; tenantId: string; name: string; isActive: boolean }>;
  stages?: Array<{ id: string; tenantId: string; pipelineId: string; name: string; position: number; isActive: boolean }>;
  opportunities?: Array<{ id: string; tenantId: string; pipelineId: string; stageId: string; name: string; customerId: string | null; leadId: string | null; valueCents: number; status: string; notes: string | null }>;
  customers?: Array<{ id: string; tenantId: string }>;
  leads?: Array<{ id: string; tenantId: string }>;
} = {}) {
  const pipelines = overrides.pipelines === undefined ? [{ id: "p1", tenantId: "t1", name: "Sales", isActive: true }] : [...overrides.pipelines];
  const stages = overrides.stages === undefined ? [
    { id: "s1", tenantId: "t1", pipelineId: "p1", name: "Lead", position: 0, isActive: true },
    { id: "s2", tenantId: "t1", pipelineId: "p1", name: "Qualified", position: 1, isActive: true },
  ] : [...overrides.stages];
  const opportunities = overrides.opportunities === undefined ? [] : [...overrides.opportunities];
  const customers = overrides.customers === undefined ? [{ id: "c1", tenantId: "t1" }] : [...overrides.customers];
  const leads = overrides.leads === undefined ? [{ id: "l1", tenantId: "t1" }] : [...overrides.leads];
  const auditLogs: AuditCapture = [];
  let idCounter = 0;

  const prisma = {
    pipeline: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `p${++idCounter}`, tenantId: data.tenantId as string, name: data.name as string, isActive: true };
        pipelines.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = pipelines;
        if (where?.tenantId) filtered = filtered.filter((p) => p.tenantId === where.tenantId);
        if (where?.isActive) filtered = filtered.filter((p) => p.isActive === where.isActive);
        return filtered;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => pipelines.find((p) => p.id === where.id) ?? null),
    },
    stage: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `s${++idCounter}`, tenantId: data.tenantId as string, pipelineId: data.pipelineId as string, name: data.name as string, position: data.position as number, isActive: true };
        stages.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = stages;
        if (where?.tenantId) filtered = filtered.filter((s) => s.tenantId === where.tenantId);
        if (where?.pipelineId) filtered = filtered.filter((s) => s.pipelineId === where.pipelineId);
        if (where?.isActive) filtered = filtered.filter((s) => s.isActive === where.isActive);
        return filtered;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => stages.find((s) => s.id === where.id) ?? null),
    },
    opportunity: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `o${++idCounter}`, tenantId: data.tenantId as string, pipelineId: data.pipelineId as string, stageId: data.stageId as string, name: data.name as string, customerId: data.customerId ?? null, leadId: data.leadId ?? null, valueCents: (data.valueCents as number) ?? 0, status: "OPEN", notes: data.notes ?? null };
        opportunities.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => opportunities.find((o) => o.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = opportunities;
        if (where?.tenantId) filtered = filtered.filter((o) => o.tenantId === where.tenantId);
        if (where?.pipelineId) filtered = filtered.filter((o) => o.pipelineId === where.pipelineId);
        if (where?.status) filtered = filtered.filter((o) => o.status === where.status);
        return filtered;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = opportunities.find((o) => o.id === where.id);
        if (!record) throw new Error("not found");
        Object.assign(record, data);
        return record;
      }),
    },
    customer: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => customers.find((c) => c.id === where.id) ?? null) },
    lead: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => leads.find((l) => l.id === where.id) ?? null) },
    auditLog: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { auditLogs.push(data as AuditCapture[number]); return {}; }) },
  };

  return { prisma: prisma as never, pipelines, stages, opportunities, auditLogs };
}

describe("opportunity service: pipelines", () => {
  it("creates a pipeline", async () => {
    const { prisma, pipelines, auditLogs } = createPrisma();
    const service = createOpportunityService(prisma);
    const pipeline = await service.createPipeline({ tenantId: "t1", input: { name: "Sales" } });
    expect(pipeline.name).toBe("Sales");
    expect(pipelines).toHaveLength(2);
  });

  it("lists pipelines for tenant", async () => {
    const { prisma } = createPrisma();
    const service = createOpportunityService(prisma);
    const result = await service.listPipelines({ tenantId: "t1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Sales");
  });

  it("returns null for non-existent pipeline", async () => {
    const { prisma } = createPrisma();
    const service = createOpportunityService(prisma);
    expect(await service.getPipeline({ tenantId: "t1", pipelineId: "missing" })).toBeNull();
  });
});

describe("opportunity service: stages", () => {
  it("creates a stage", async () => {
    const { prisma, stages } = createPrisma();
    const service = createOpportunityService(prisma);
    const stage = await service.createStage({ tenantId: "t1", input: { pipelineId: "p1", name: "Proposal", position: 2 } });
    expect(stage.name).toBe("Proposal");
    expect(stage.position).toBe(2);
  });

  it("rejects stage creation for wrong tenant pipeline", async () => {
    const { prisma } = createPrisma({ pipelines: [{ id: "p1", tenantId: "t2", name: "Other", isActive: true }] });
    const service = createOpportunityService(prisma);
    await expect(service.createStage({ tenantId: "t1", input: { pipelineId: "p1", name: "X", position: 0 } })).rejects.toThrow("pipeline must belong");
  });

  it("lists stages ordered by position", async () => {
    const { prisma } = createPrisma();
    const service = createOpportunityService(prisma);
    const result = await service.listStages({ tenantId: "t1", pipelineId: "p1" });
    expect(result).toHaveLength(2);
    expect(result[0]?.position).toBe(0);
    expect(result[1]?.position).toBe(1);
  });
});

describe("opportunity service: opportunities", () => {
  it("creates an opportunity", async () => {
    const { prisma, auditLogs } = createPrisma();
    const service = createOpportunityService(prisma);
    const opp = await service.createOpportunity({ tenantId: "t1", input: { pipelineId: "p1", stageId: "s1", name: "Big Deal" }, actorUserId: "user-1" });
    expect(opp.name).toBe("Big Deal");
    expect(opp.status).toBe("OPEN");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("opportunity.created");
  });

  it("rejects opportunity with wrong tenant pipeline", async () => {
    const { prisma } = createPrisma({ pipelines: [{ id: "p1", tenantId: "t2", name: "X", isActive: true }] });
    const service = createOpportunityService(prisma);
    await expect(service.createOpportunity({ tenantId: "t1", input: { pipelineId: "p1", stageId: "s1", name: "Deal" } })).rejects.toThrow("pipeline must belong");
  });

  it("rejects opportunity with stage from different pipeline", async () => {
    const { prisma } = createPrisma({ stages: [{ id: "s1", tenantId: "t1", pipelineId: "p2", name: "X", position: 0, isActive: true }] });
    const service = createOpportunityService(prisma);
    await expect(service.createOpportunity({ tenantId: "t1", input: { pipelineId: "p1", stageId: "s1", name: "Deal" } })).rejects.toThrow("stage must belong");
  });

  it("rejects opportunity with wrong tenant customer", async () => {
    const { prisma } = createPrisma({ customers: [{ id: "c1", tenantId: "t2" }] });
    const service = createOpportunityService(prisma);
    await expect(service.createOpportunity({ tenantId: "t1", input: { pipelineId: "p1", stageId: "s1", name: "Deal", customerId: "c1" } })).rejects.toThrow("customer must belong");
  });

  it("returns null for non-existent opportunity", async () => {
    const { prisma } = createPrisma();
    const service = createOpportunityService(prisma);
    expect(await service.getOpportunity({ tenantId: "t1", opportunityId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ opportunities: [{ id: "o1", tenantId: "t1", pipelineId: "p1", stageId: "s1", name: "Deal", customerId: null, leadId: null, valueCents: 0, status: "OPEN", notes: null }] });
    const service = createOpportunityService(prisma);
    expect(await service.getOpportunity({ tenantId: "t2", opportunityId: "o1" })).toBeNull();
  });

  it("updates opportunity fields", async () => {
    const { prisma, auditLogs } = createPrisma({ opportunities: [{ id: "o1", tenantId: "t1", pipelineId: "p1", stageId: "s1", name: "Deal", customerId: null, leadId: null, valueCents: 0, status: "OPEN", notes: null }] });
    const service = createOpportunityService(prisma);
    const updated = await service.updateOpportunity({ tenantId: "t1", opportunityId: "o1", input: { name: "Updated Deal", valueCents: 50000 }, actorUserId: "user-1" });
    expect(updated?.name).toBe("Updated Deal");
    expect(updated?.valueCents).toBe(50000);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("opportunity.updated");
  });

  it("moves opportunity to new stage", async () => {
    const { prisma, auditLogs } = createPrisma({ opportunities: [{ id: "o1", tenantId: "t1", pipelineId: "p1", stageId: "s1", name: "Deal", customerId: null, leadId: null, valueCents: 0, status: "OPEN", notes: null }] });
    const service = createOpportunityService(prisma);
    const moved = await service.moveOpportunity({ tenantId: "t1", opportunityId: "o1", stageId: "s2", actorUserId: "user-1" });
    expect(moved?.stageId).toBe("s2");
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("opportunity.moved");
    expect(auditLogs[0]?.metadata).toEqual({ previousStageId: "s1", newStageId: "s2" });
  });

  it("rejects move to stage from different pipeline", async () => {
    const { prisma } = createPrisma({ opportunities: [{ id: "o1", tenantId: "t1", pipelineId: "p1", stageId: "s1", name: "Deal", customerId: null, leadId: null, valueCents: 0, status: "OPEN", notes: null }], stages: [{ id: "s1", tenantId: "t1", pipelineId: "p1", name: "Lead", position: 0, isActive: true }, { id: "s2", tenantId: "t1", pipelineId: "p2", name: "Other", position: 0, isActive: true }] });
    const service = createOpportunityService(prisma);
    await expect(service.moveOpportunity({ tenantId: "t1", opportunityId: "o1", stageId: "s2" })).rejects.toThrow("stage must belong to the same pipeline");
  });
});