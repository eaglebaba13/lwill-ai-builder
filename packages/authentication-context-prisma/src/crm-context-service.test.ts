import { describe, expect, it, vi } from "vitest";
import { createCrmContextService } from "./crm-context-service";

function createPrisma() {
  const leads: Record<string, unknown>[] = [
    { id: "lead-1", tenantId: "t1", name: "John Doe", email: "john@example.com", phone: "123", source: "website", status: "ACTIVE", createdAt: new Date() },
  ];
  const customers: Record<string, unknown>[] = [
    { id: "cust-1", tenantId: "t1", name: "Acme Corp", email: "acme@example.com", phone: "456", notes: "Key account", isActive: true, createdAt: new Date() },
  ];
  const opportunities: Record<string, unknown>[] = [
    { id: "opp-1", tenantId: "t1", name: "Big Deal", valueCents: 50000, status: "OPEN", notes: "Hot lead", createdAt: new Date(), pipeline: { name: "Sales" }, stage: { name: "Proposal", position: 2 } },
  ];
  const followups: Record<string, unknown>[] = [
    { id: "fup-1", tenantId: "t1", leadId: "lead-1", title: "Call back", dueAt: new Date(), status: "PENDING", createdAt: new Date() },
  ];
  const communications: Record<string, unknown>[] = [
    { id: "comm-1", tenantId: "t1", leadId: "lead-1", channel: "email", direction: "outbound", body: "Sent proposal", communicatedAt: new Date() },
  ];
  const crmNotes: Record<string, unknown>[] = [
    { id: "note-1", tenantId: "t1", leadId: "lead-1", body: "Interested in premium", createdAt: new Date() },
  ];
  const tagLinks: Record<string, unknown>[] = [
    { id: "tl-1", tagId: "tag-1", entityType: "Lead", entityId: "lead-1" },
  ];
  const tags: Record<string, unknown>[] = [
    { id: "tag-1", tenantId: "t1", name: "VIP" },
  ];
  const attachments: Record<string, unknown>[] = [
    { id: "att-1", tenantId: "t1", leadId: "lead-1", name: "proposal.pdf", url: "https://example.com/proposal.pdf", createdAt: new Date() },
  ];

  const prisma = {
    lead: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => leads.find((l) => l.id === where.id) ?? null) },
    customer: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => customers.find((c) => c.id === where.id) ?? null) },
    opportunity: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => opportunities.find((o) => o.id === where.id) ?? null) },
    followup: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => followups.filter((f) => Object.entries(where).every(([k, v]) => f[k] === v))) },
    communication: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => communications.filter((c) => Object.entries(where).every(([k, v]) => c[k] === v))) },
    crmNote: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => crmNotes.filter((n) => Object.entries(where).every(([k, v]) => n[k] === v))) },
    tagLink: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => tagLinks.filter((l) => Object.entries(where).every(([k, v]) => l[k] === v))) },
    tag: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id && typeof where.id === "object" && "in" in (where.id as Record<string, unknown>)) {
        const ids = (where.id as { in: string[] }).in;
        return tags.filter((t) => ids.includes(t.id as string));
      }
      return tags;
    }) },
    attachment: { findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => attachments.filter((a) => Object.entries(where).every(([k, v]) => a[k] === v))) },
  };

  return { prisma: prisma as never };
}

describe("crm-context-service: getEntityContext", () => {
  it("returns full context for a Lead", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    const ctx = await service.getEntityContext({ tenantId: "t1", entityType: "Lead", entityId: "lead-1" });

    expect(ctx).not.toBeNull();
    expect(ctx?.entity.type).toBe("Lead");
    expect(ctx?.entity.id).toBe("lead-1");
    expect(ctx?.entity.data.name).toBe("John Doe");
    expect(ctx?.followups).toHaveLength(1);
    expect(ctx?.followups[0]?.title).toBe("Call back");
    expect(ctx?.communications).toHaveLength(1);
    expect(ctx?.communications[0]?.channel).toBe("email");
    expect(ctx?.notes).toHaveLength(1);
    expect(ctx?.notes[0]?.body).toBe("Interested in premium");
    expect(ctx?.tags).toHaveLength(1);
    expect(ctx?.tags[0]?.name).toBe("VIP");
    expect(ctx?.attachments).toHaveLength(1);
    expect(ctx?.attachments[0]?.name).toBe("proposal.pdf");
  });

  it("returns full context for a Customer", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    const ctx = await service.getEntityContext({ tenantId: "t1", entityType: "Customer", entityId: "cust-1" });

    expect(ctx).not.toBeNull();
    expect(ctx?.entity.type).toBe("Customer");
    expect(ctx?.entity.data.name).toBe("Acme Corp");
  });

  it("returns full context for an Opportunity", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    const ctx = await service.getEntityContext({ tenantId: "t1", entityType: "Opportunity", entityId: "opp-1" });

    expect(ctx).not.toBeNull();
    expect(ctx?.entity.type).toBe("Opportunity");
    expect(ctx?.entity.data.name).toBe("Big Deal");
    expect(ctx?.entity.data.pipeline).toEqual({ name: "Sales" });
    expect(ctx?.entity.data.stage).toEqual({ name: "Proposal", position: 2 });
  });

  it("returns null for non-existent entity", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    expect(await service.getEntityContext({ tenantId: "t1", entityType: "Lead", entityId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    expect(await service.getEntityContext({ tenantId: "t2", entityType: "Lead", entityId: "lead-1" })).toBeNull();
  });

  it("strips tenantId from related records", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    const ctx = await service.getEntityContext({ tenantId: "t1", entityType: "Lead", entityId: "lead-1" });

    expect(ctx?.followups[0]).not.toHaveProperty("tenantId");
    expect(ctx?.communications[0]).not.toHaveProperty("tenantId");
    expect(ctx?.notes[0]).not.toHaveProperty("tenantId");
    expect(ctx?.attachments[0]).not.toHaveProperty("tenantId");
  });

  it("returns empty arrays when no related records exist", async () => {
    const { prisma } = createPrisma();
    const service = createCrmContextService(prisma);

    const ctx = await service.getEntityContext({ tenantId: "t1", entityType: "Customer", entityId: "cust-1" });

    expect(ctx?.followups).toHaveLength(0);
    expect(ctx?.communications).toHaveLength(0);
    expect(ctx?.notes).toHaveLength(0);
    expect(ctx?.tags).toHaveLength(0);
    expect(ctx?.attachments).toHaveLength(0);
  });
});
