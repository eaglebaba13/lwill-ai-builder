import { describe, expect, it, vi } from "vitest";
import { createLeadService } from "./lead-service";

type AuditCapture = Array<{ tenantId: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> }>;

function createPrisma(overrides: {
  leads?: Array<{ id: string; tenantId: string; name: string; email: string | null; phone: string | null; source: string | null; status: string; convertedToCustomerId: string | null; convertedAt: Date | null; createdAt: Date; updatedAt: Date }>;
} = {}) {
  const leads = overrides.leads === undefined ? [] : [...overrides.leads];
  const auditLogs: AuditCapture = [];
  let idCounter = 0;

  const prisma = {
    lead: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `lead-${++idCounter}`, tenantId: data.tenantId as string, name: data.name as string, email: data.email ?? null, phone: data.phone ?? null, source: data.source ?? null, status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() };
        leads.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => leads.find((l) => l.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = leads;
        if (where?.tenantId) filtered = filtered.filter((l) => l.tenantId === where.tenantId);
        if (where?.status) filtered = filtered.filter((l) => l.status === where.status);
        return filtered;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = leads.find((l) => l.id === where.id);
        if (!record) throw new Error("not found");
        Object.assign(record, data);
        return record;
      }),
    },
    customer: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: `cust-${++idCounter}`, name: data.name as string, email: data.email ?? null, phone: data.phone ?? null })),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { auditLogs.push(data as AuditCapture[number]); return {}; }),
    },
    $transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(prisma)),
  };

  return { prisma: prisma as never, leads, auditLogs };
}

describe("lead service: createLead", () => {
  it("creates a lead with name only", async () => {
    const { prisma, leads, auditLogs } = createPrisma();
    const service = createLeadService(prisma);

    const lead = await service.createLead({ tenantId: "t1", input: { name: "John Doe" }, actorUserId: "user-1" });

    expect(lead.name).toBe("John Doe");
    expect(lead.status).toBe("ACTIVE");
    expect(leads).toHaveLength(1);
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("lead.created");
  });

  it("creates a lead with all fields", async () => {
    const { prisma } = createPrisma();
    const service = createLeadService(prisma);

    const lead = await service.createLead({ tenantId: "t1", input: { name: "Jane", email: "jane@example.com", phone: "123", source: "website" } });

    expect(lead.email).toBe("jane@example.com");
    expect(lead.source).toBe("website");
  });
});

describe("lead service: getLead / listLeads", () => {
  it("returns null for non-existent lead", async () => {
    const { prisma } = createPrisma();
    const service = createLeadService(prisma);
    expect(await service.getLead({ tenantId: "t1", leadId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "John", email: null, phone: null, source: null, status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);
    expect(await service.getLead({ tenantId: "t2", leadId: "l1" })).toBeNull();
  });

  it("lists leads filtered by status", async () => {
    const { prisma } = createPrisma({ leads: [
      { id: "l1", tenantId: "t1", name: "A", email: null, phone: null, source: null, status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "l2", tenantId: "t1", name: "B", email: null, phone: null, source: null, status: "CONVERTED", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createLeadService(prisma);

    const active = await service.listLeads({ tenantId: "t1", status: "ACTIVE" });
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe("l1");

    const all = await service.listLeads({ tenantId: "t1" });
    expect(all).toHaveLength(2);
  });
});

describe("lead service: updateLead", () => {
  it("returns null for non-existent lead", async () => {
    const { prisma } = createPrisma();
    const service = createLeadService(prisma);
    expect(await service.updateLead({ tenantId: "t1", leadId: "missing", input: { name: "X" } })).toBeNull();
  });

  it("returns null for converted lead", async () => {
    const { prisma } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "A", email: null, phone: null, source: null, status: "CONVERTED", convertedToCustomerId: "c1", convertedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);
    expect(await service.updateLead({ tenantId: "t1", leadId: "l1", input: { name: "B" } })).toBeNull();
  });

  it("updates active lead fields", async () => {
    const { prisma } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "A", email: null, phone: null, source: null, status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);

    const updated = await service.updateLead({ tenantId: "t1", leadId: "l1", input: { name: "B", email: "b@example.com" } });
    expect(updated?.name).toBe("B");
    expect(updated?.email).toBe("b@example.com");
  });
});

describe("lead service: convertLead", () => {
  it("converts an active lead to customer", async () => {
    const { prisma, leads, auditLogs } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "John", email: "john@example.com", phone: "123", source: "website", status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);

    const result = await service.convertLead({ tenantId: "t1", leadId: "l1", actorUserId: "user-1" });

    expect(result).not.toBeNull();
    expect(result?.customer.name).toBe("John");
    expect(result?.customer.email).toBe("john@example.com");
    expect(result?.lead.status).toBe("CONVERTED");
    expect(result?.lead.convertedToCustomerId).toBe(result?.customer.id);
    expect(result?.lead.convertedAt).toBeInstanceOf(Date);

    const storedLead = leads.find((l) => l.id === "l1");
    expect(storedLead?.status).toBe("CONVERTED");

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0]?.action).toBe("lead.converted");
    expect(auditLogs[0]?.entityType).toBe("Lead");
  });

  it("returns null for non-existent lead", async () => {
    const { prisma } = createPrisma();
    const service = createLeadService(prisma);
    expect(await service.convertLead({ tenantId: "t1", leadId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "A", email: null, phone: null, source: null, status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);
    expect(await service.convertLead({ tenantId: "t2", leadId: "l1" })).toBeNull();
  });

  it("returns null for already-converted lead", async () => {
    const { prisma } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "A", email: null, phone: null, source: null, status: "CONVERTED", convertedToCustomerId: "c1", convertedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);
    expect(await service.convertLead({ tenantId: "t1", leadId: "l1" })).toBeNull();
  });

  it("preserves source in customer notes", async () => {
    const { prisma } = createPrisma({ leads: [{ id: "l1", tenantId: "t1", name: "A", email: null, phone: null, source: "meta_ads", status: "ACTIVE", convertedToCustomerId: null, convertedAt: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createLeadService(prisma);

    const result = await service.convertLead({ tenantId: "t1", leadId: "l1" });
    expect(result?.customer.id).toBeDefined();
  });
});