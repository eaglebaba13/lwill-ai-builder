import { describe, expect, it, vi } from "vitest";
import { createCrmNoteService } from "./crm-note-service";

function createPrisma(overrides: { notes?: Array<{ id: string; tenantId: string; body: string; leadId: string | null; customerId: string | null; opportunityId: string | null; createdAt: Date; updatedAt: Date }> } = {}) {
  const notes = overrides.notes === undefined ? [] : [...overrides.notes];
  let idCounter = 0;

  const prisma = {
    crmNote: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `note-${++idCounter}`, tenantId: data.tenantId as string, body: data.body as string, leadId: data.leadId ?? null, customerId: data.customerId ?? null, opportunityId: data.opportunityId ?? null, createdAt: new Date(), updatedAt: new Date() };
        notes.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => notes.find((n) => n.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = notes;
        if (where?.tenantId) filtered = filtered.filter((n) => n.tenantId === where.tenantId);
        if (where?.leadId) filtered = filtered.filter((n) => n.leadId === where.leadId);
        if (where?.customerId) filtered = filtered.filter((n) => n.customerId === where.customerId);
        if (where?.opportunityId) filtered = filtered.filter((n) => n.opportunityId === where.opportunityId);
        return filtered;
      }),
    },
  };

  return { prisma: prisma as never, notes };
}

describe("crm-note service: createNote", () => {
  it("creates a note linked to a customer", async () => {
    const { prisma, notes } = createPrisma();
    const service = createCrmNoteService(prisma);
    const note = await service.createNote({ tenantId: "t1", input: { body: "Called about renewal", customerId: "cust-1" } });
    expect(note.body).toBe("Called about renewal");
    expect(note.customerId).toBe("cust-1");
    expect(notes).toHaveLength(1);
  });

  it("creates a note linked to a lead", async () => {
    const { prisma } = createPrisma();
    const service = createCrmNoteService(prisma);
    const note = await service.createNote({ tenantId: "t1", input: { body: "Interested in package", leadId: "lead-1" } });
    expect(note.leadId).toBe("lead-1");
  });
});

describe("crm-note service: getNote", () => {
  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ notes: [{ id: "note-1", tenantId: "t1", body: "Test", leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createCrmNoteService(prisma);
    expect(await service.getNote({ tenantId: "t2", noteId: "note-1" })).toBeNull();
  });
});

describe("crm-note service: listNotes", () => {
  it("filters by customerId", async () => {
    const { prisma } = createPrisma({ notes: [
      { id: "n1", tenantId: "t1", body: "A", leadId: null, customerId: "cust-1", opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "n2", tenantId: "t1", body: "B", leadId: null, customerId: "cust-2", opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createCrmNoteService(prisma);
    const result = await service.listNotes({ tenantId: "t1", customerId: "cust-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe("A");
  });
});
