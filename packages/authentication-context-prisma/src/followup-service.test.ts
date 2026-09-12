import { describe, expect, it, vi } from "vitest";
import { createFollowupService } from "./followup-service";

function createPrisma(overrides: {
  followups?: Array<{ id: string; tenantId: string; title: string; notes: string | null; dueAt: Date; status: string; leadId: string | null; customerId: string | null; opportunityId: string | null; createdAt: Date; updatedAt: Date }>;
} = {}) {
  const followups = overrides.followups === undefined ? [] : [...overrides.followups];
  let idCounter = 0;

  const prisma = {
    followup: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `fup-${++idCounter}`, tenantId: data.tenantId as string, title: data.title as string, notes: data.notes ?? null, dueAt: data.dueAt as Date, status: "PENDING", leadId: data.leadId ?? null, customerId: data.customerId ?? null, opportunityId: data.opportunityId ?? null, createdAt: new Date(), updatedAt: new Date() };
        followups.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => followups.find((f) => f.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = followups;
        if (where?.tenantId) filtered = filtered.filter((f) => f.tenantId === where.tenantId);
        if (where?.status) filtered = filtered.filter((f) => f.status === where.status);
        if (where?.leadId) filtered = filtered.filter((f) => f.leadId === where.leadId);
        if (where?.customerId) filtered = filtered.filter((f) => f.customerId === where.customerId);
        if (where?.opportunityId) filtered = filtered.filter((f) => f.opportunityId === where.opportunityId);
        return filtered;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = followups.find((f) => f.id === where.id);
        if (!record) throw new Error("not found");
        Object.assign(record, data);
        return record;
      }),
    },
  };

  return { prisma: prisma as never, followups };
}

describe("followup service: createFollowup", () => {
  it("creates a followup with required fields only", async () => {
    const { prisma, followups } = createPrisma();
    const service = createFollowupService(prisma);

    const followup = await service.createFollowup({ tenantId: "t1", input: { title: "Call client", dueAt: "2026-09-15T10:00:00Z" } });

    expect(followup.title).toBe("Call client");
    expect(followup.status).toBe("PENDING");
    expect(followup.leadId).toBeNull();
    expect(followup.customerId).toBeNull();
    expect(followup.opportunityId).toBeNull();
    expect(followups).toHaveLength(1);
  });

  it("creates a followup linked to a lead", async () => {
    const { prisma } = createPrisma();
    const service = createFollowupService(prisma);

    const followup = await service.createFollowup({ tenantId: "t1", input: { title: "Follow up lead", dueAt: "2026-09-15T10:00:00Z", leadId: "lead-1" } });

    expect(followup.leadId).toBe("lead-1");
  });

  it("creates a followup linked to a customer", async () => {
    const { prisma } = createPrisma();
    const service = createFollowupService(prisma);

    const followup = await service.createFollowup({ tenantId: "t1", input: { title: "Renewal call", dueAt: "2026-09-15T10:00:00Z", customerId: "cust-1" } });

    expect(followup.customerId).toBe("cust-1");
  });

  it("creates a followup linked to an opportunity", async () => {
    const { prisma } = createPrisma();
    const service = createFollowupService(prisma);

    const followup = await service.createFollowup({ tenantId: "t1", input: { title: "Proposal follow-up", dueAt: "2026-09-15T10:00:00Z", opportunityId: "opp-1" } });

    expect(followup.opportunityId).toBe("opp-1");
  });
});

describe("followup service: getFollowup", () => {
  it("returns null for non-existent followup", async () => {
    const { prisma } = createPrisma();
    const service = createFollowupService(prisma);
    expect(await service.getFollowup({ tenantId: "t1", followupId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ followups: [{ id: "f1", tenantId: "t1", title: "Test", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createFollowupService(prisma);
    expect(await service.getFollowup({ tenantId: "t2", followupId: "f1" })).toBeNull();
  });

  it("returns the followup for same tenant", async () => {
    const { prisma } = createPrisma({ followups: [{ id: "f1", tenantId: "t1", title: "Test", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createFollowupService(prisma);
    const followup = await service.getFollowup({ tenantId: "t1", followupId: "f1" });
    expect(followup).not.toBeNull();
    expect(followup?.title).toBe("Test");
  });
});

describe("followup service: listFollowups", () => {
  it("lists followups for a tenant", async () => {
    const { prisma } = createPrisma({ followups: [
      { id: "f1", tenantId: "t1", title: "A", notes: null, dueAt: new Date("2026-09-15"), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "f2", tenantId: "t2", title: "B", notes: null, dueAt: new Date("2026-09-16"), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createFollowupService(prisma);
    const result = await service.listFollowups({ tenantId: "t1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("A");
  });

  it("filters by status", async () => {
    const { prisma } = createPrisma({ followups: [
      { id: "f1", tenantId: "t1", title: "A", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "f2", tenantId: "t1", title: "B", notes: null, dueAt: new Date(), status: "COMPLETED", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createFollowupService(prisma);
    const result = await service.listFollowups({ tenantId: "t1", status: "COMPLETED" });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("B");
  });

  it("filters by leadId", async () => {
    const { prisma } = createPrisma({ followups: [
      { id: "f1", tenantId: "t1", title: "A", notes: null, dueAt: new Date(), status: "PENDING", leadId: "lead-1", customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "f2", tenantId: "t1", title: "B", notes: null, dueAt: new Date(), status: "PENDING", leadId: "lead-2", customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createFollowupService(prisma);
    const result = await service.listFollowups({ tenantId: "t1", leadId: "lead-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("A");
  });
});

describe("followup service: updateFollowup", () => {
  it("returns null for non-existent followup", async () => {
    const { prisma } = createPrisma();
    const service = createFollowupService(prisma);
    expect(await service.updateFollowup({ tenantId: "t1", followupId: "missing", input: { title: "Updated" } })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ followups: [{ id: "f1", tenantId: "t1", title: "Test", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createFollowupService(prisma);
    expect(await service.updateFollowup({ tenantId: "t2", followupId: "f1", input: { title: "Hacked" } })).toBeNull();
  });

  it("updates title", async () => {
    const { prisma } = createPrisma({ followups: [{ id: "f1", tenantId: "t1", title: "Old", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createFollowupService(prisma);
    const result = await service.updateFollowup({ tenantId: "t1", followupId: "f1", input: { title: "New" } });
    expect(result?.title).toBe("New");
  });

  it("updates status to COMPLETED", async () => {
    const { prisma } = createPrisma({ followups: [{ id: "f1", tenantId: "t1", title: "Test", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createFollowupService(prisma);
    const result = await service.updateFollowup({ tenantId: "t1", followupId: "f1", input: { status: "COMPLETED" } });
    expect(result?.status).toBe("COMPLETED");
  });

  it("returns existing when no changes provided", async () => {
    const { prisma } = createPrisma({ followups: [{ id: "f1", tenantId: "t1", title: "Test", notes: null, dueAt: new Date(), status: "PENDING", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createFollowupService(prisma);
    const result = await service.updateFollowup({ tenantId: "t1", followupId: "f1", input: {} });
    expect(result?.title).toBe("Test");
  });
});
