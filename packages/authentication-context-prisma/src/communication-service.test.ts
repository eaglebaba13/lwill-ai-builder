import { describe, expect, it, vi } from "vitest";
import { createCommunicationService, VALID_CHANNELS, VALID_DIRECTIONS } from "./communication-service";

function createPrisma(overrides: {
  communications?: Array<{ id: string; tenantId: string; channel: string; direction: string; contactName: string | null; subject: string | null; body: string; communicatedAt: Date; leadId: string | null; customerId: string | null; opportunityId: string | null; createdAt: Date; updatedAt: Date }>;
} = {}) {
  const communications = overrides.communications === undefined ? [] : [...overrides.communications];
  let idCounter = 0;

  const prisma = {
    communication: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `comm-${++idCounter}`, tenantId: data.tenantId as string, channel: data.channel as string, direction: data.direction as string, contactName: data.contactName ?? null, subject: data.subject ?? null, body: data.body as string, communicatedAt: data.communicatedAt as Date, leadId: data.leadId ?? null, customerId: data.customerId ?? null, opportunityId: data.opportunityId ?? null, createdAt: new Date(), updatedAt: new Date() };
        communications.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => communications.find((c) => c.id === where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        let filtered = communications;
        if (where?.tenantId) filtered = filtered.filter((c) => c.tenantId === where.tenantId);
        if (where?.channel) filtered = filtered.filter((c) => c.channel === where.channel);
        if (where?.direction) filtered = filtered.filter((c) => c.direction === where.direction);
        if (where?.leadId) filtered = filtered.filter((c) => c.leadId === where.leadId);
        if (where?.customerId) filtered = filtered.filter((c) => c.customerId === where.customerId);
        if (where?.opportunityId) filtered = filtered.filter((c) => c.opportunityId === where.opportunityId);
        return filtered;
      }),
    },
  };

  return { prisma: prisma as never, communications };
}

describe("communication service: createCommunication", () => {
  it("creates an email communication", async () => {
    const { prisma, communications } = createPrisma();
    const service = createCommunicationService(prisma);

    const comm = await service.createCommunication({ tenantId: "t1", input: { channel: "email", direction: "outbound", body: "Hello", communicatedAt: "2026-09-13T10:00:00Z" } });

    expect(comm.channel).toBe("email");
    expect(comm.direction).toBe("outbound");
    expect(comm.body).toBe("Hello");
    expect(comm.contactName).toBeNull();
    expect(comm.subject).toBeNull();
    expect(communications).toHaveLength(1);
  });

  it("creates a whatsapp communication with all fields", async () => {
    const { prisma } = createPrisma();
    const service = createCommunicationService(prisma);

    const comm = await service.createCommunication({ tenantId: "t1", input: { channel: "whatsapp", direction: "inbound", contactName: "John", subject: "Re: Quote", body: "Interested", communicatedAt: "2026-09-13T10:00:00Z", customerId: "cust-1" } });

    expect(comm.channel).toBe("whatsapp");
    expect(comm.direction).toBe("inbound");
    expect(comm.contactName).toBe("John");
    expect(comm.subject).toBe("Re: Quote");
    expect(comm.customerId).toBe("cust-1");
  });

  it("creates a phone communication linked to a lead", async () => {
    const { prisma } = createPrisma();
    const service = createCommunicationService(prisma);

    const comm = await service.createCommunication({ tenantId: "t1", input: { channel: "phone", direction: "outbound", body: "Discussed pricing", communicatedAt: "2026-09-13T10:00:00Z", leadId: "lead-1" } });

    expect(comm.leadId).toBe("lead-1");
  });
});

describe("communication service: getCommunication", () => {
  it("returns null for non-existent communication", async () => {
    const { prisma } = createPrisma();
    const service = createCommunicationService(prisma);
    expect(await service.getCommunication({ tenantId: "t1", communicationId: "missing" })).toBeNull();
  });

  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma({ communications: [{ id: "c1", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "Test", communicatedAt: new Date(), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createCommunicationService(prisma);
    expect(await service.getCommunication({ tenantId: "t2", communicationId: "c1" })).toBeNull();
  });

  it("returns the communication for same tenant", async () => {
    const { prisma } = createPrisma({ communications: [{ id: "c1", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "Test", communicatedAt: new Date(), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() }] });
    const service = createCommunicationService(prisma);
    const comm = await service.getCommunication({ tenantId: "t1", communicationId: "c1" });
    expect(comm).not.toBeNull();
    expect(comm?.body).toBe("Test");
  });
});

describe("communication service: listCommunications", () => {
  it("lists communications for a tenant", async () => {
    const { prisma } = createPrisma({ communications: [
      { id: "c1", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "A", communicatedAt: new Date("2026-09-13"), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "c2", tenantId: "t2", channel: "email", direction: "outbound", contactName: null, subject: null, body: "B", communicatedAt: new Date("2026-09-14"), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createCommunicationService(prisma);
    const result = await service.listCommunications({ tenantId: "t1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe("A");
  });

  it("filters by channel", async () => {
    const { prisma } = createPrisma({ communications: [
      { id: "c1", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "A", communicatedAt: new Date(), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "c2", tenantId: "t1", channel: "whatsapp", direction: "inbound", contactName: null, subject: null, body: "B", communicatedAt: new Date(), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createCommunicationService(prisma);
    const result = await service.listCommunications({ tenantId: "t1", channel: "whatsapp" });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe("B");
  });

  it("filters by direction", async () => {
    const { prisma } = createPrisma({ communications: [
      { id: "c1", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "A", communicatedAt: new Date(), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "c2", tenantId: "t1", channel: "email", direction: "inbound", contactName: null, subject: null, body: "B", communicatedAt: new Date(), leadId: null, customerId: null, opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createCommunicationService(prisma);
    const result = await service.listCommunications({ tenantId: "t1", direction: "inbound" });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe("B");
  });

  it("filters by customerId", async () => {
    const { prisma } = createPrisma({ communications: [
      { id: "c1", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "A", communicatedAt: new Date(), leadId: null, customerId: "cust-1", opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
      { id: "c2", tenantId: "t1", channel: "email", direction: "outbound", contactName: null, subject: null, body: "B", communicatedAt: new Date(), leadId: null, customerId: "cust-2", opportunityId: null, createdAt: new Date(), updatedAt: new Date() },
    ] });
    const service = createCommunicationService(prisma);
    const result = await service.listCommunications({ tenantId: "t1", customerId: "cust-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.body).toBe("A");
  });
});

describe("communication service: constants", () => {
  it("valid channels include expected values", () => {
    expect(VALID_CHANNELS).toContain("email");
    expect(VALID_CHANNELS).toContain("whatsapp");
    expect(VALID_CHANNELS).toContain("sms");
    expect(VALID_CHANNELS).toContain("phone");
    expect(VALID_CHANNELS).toContain("in_person");
    expect(VALID_CHANNELS).toContain("other");
  });

  it("valid directions include inbound and outbound", () => {
    expect(VALID_DIRECTIONS).toContain("inbound");
    expect(VALID_DIRECTIONS).toContain("outbound");
  });
});
