import { describe, expect, it, vi } from "vitest";
import { createAttachmentService } from "./attachment-service";

function createPrisma(overrides: { attachments?: Array<{ id: string; tenantId: string; name: string; url: string; mimeType: string | null; sizeBytes: number | null; leadId: string | null; customerId: string | null; opportunityId: string | null; createdAt: Date; updatedAt: Date }> } = {}) {
  const attachments = overrides.attachments === undefined ? [] : [...overrides.attachments];
  let idCounter = 0;

  const prisma = {
    attachment: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `att-${++idCounter}`, tenantId: data.tenantId as string, name: data.name as string, url: data.url as string, mimeType: data.mimeType ?? null, sizeBytes: data.sizeBytes ?? null, leadId: data.leadId ?? null, customerId: data.customerId ?? null, opportunityId: data.opportunityId ?? null, createdAt: new Date(), updatedAt: new Date() };
        attachments.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => attachments.find((a) => a.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = attachments;
        if (where?.tenantId) filtered = filtered.filter((a) => a.tenantId === where.tenantId);
        if (where?.leadId) filtered = filtered.filter((a) => a.leadId === where.leadId);
        if (where?.customerId) filtered = filtered.filter((a) => a.customerId === where.customerId);
        if (where?.opportunityId) filtered = filtered.filter((a) => a.opportunityId === where.opportunityId);
        return filtered;
      }),
    },
  };

  return { prisma: prisma as never, attachments };
}

describe("attachment service: createAttachment", () => {
  it("creates an attachment with all fields", async () => {
    const { prisma, attachments } = createPrisma();
    const service = createAttachmentService(prisma);
    const att = await service.createAttachment({ tenantId: "t1", input: { name: "contract.pdf", url: "https://storage.example.com/contract.pdf", mimeType: "application/pdf", sizeBytes: 1024, customerId: "cust-1" } });
    expect(att.name).toBe("contract.pdf");
    expect(att.url).toBe("https://storage.example.com/contract.pdf");
    expect(att.mimeType).toBe("application/pdf");
    expect(att.sizeBytes).toBe(1024);
    expect(att.customerId).toBe("cust-1");
    expect(attachments).toHaveLength(1);
  });

  it("creates an attachment with minimal fields", async () => {
    const { prisma } = createPrisma();
    const service = createAttachmentService(prisma);
    const att = await service.createAttachment({ tenantId: "t1", input: { name: "photo.jpg", url: "https://storage.example.com/photo.jpg" } });
    expect(att.mimeType).toBeNull();
    expect(att.sizeBytes).toBeNull();
  });
});

describe("attachment service: getAttachment", () => {
  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ attachments: [{ id: "att-1", tenantId: "t1", name: "test.pdf", url: "https://example.com/test.pdf", mimeType: null, sizeBytes: null, leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createAttachmentService(prisma);
    expect(await service.getAttachment({ tenantId: "t2", attachmentId: "att-1" })).toBeNull();
  });
});

describe("attachment service: listAttachments", () => {
  it("filters by leadId", async () => {
    const { prisma } = createPrisma({ attachments: [
      { id: "a1", tenantId: "t1", name: "A.pdf", url: "https://example.com/a.pdf", mimeType: null, sizeBytes: null, leadId: "lead-1", customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "a2", tenantId: "t1", name: "B.pdf", url: "https://example.com/b.pdf", mimeType: null, sizeBytes: null, leadId: "lead-2", customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createAttachmentService(prisma);
    const result = await service.listAttachments({ tenantId: "t1", leadId: "lead-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("A.pdf");
  });
});
