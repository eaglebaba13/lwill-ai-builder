import { describe, expect, it, vi } from "vitest";
import { createCrmReportService } from "./crm-report-service";

function createPrisma() {
  const prisma = {
    lead: {
      groupBy: vi.fn().mockResolvedValue([
        { source: "website", _count: 5 },
        { source: "whatsapp", _count: 3 },
        { source: null, _count: 1 },
      ]),
      count: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(4),
    },
    opportunity: {
      groupBy: vi.fn().mockResolvedValue([
        { stageId: "s1", _count: 3, _sum: { valueCents: 150000 } },
        { stageId: "s2", _count: 1, _sum: { valueCents: 50000 } },
      ]),
    },
    followup: {
      findMany: vi.fn().mockResolvedValue([
        { id: "f1", title: "Call client", dueAt: new Date("2026-09-15"), leadId: "lead-1", customerId: null, opportunityId: null },
        { id: "f2", title: "Send proposal", dueAt: new Date("2026-09-20"), leadId: null, customerId: null, opportunityId: "opp-1" },
      ]),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([
        { createdAt: new Date("2026-07-15") },
        { createdAt: new Date("2026-07-20") },
        { createdAt: new Date("2026-08-05") },
        { createdAt: new Date("2026-08-25") },
        { createdAt: new Date("2026-09-01") },
      ]),
    },
    stage: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", name: "Lead", position: 0 },
        { id: "s2", name: "Proposal", position: 1 },
        { id: "s3", name: "Won", position: 2 },
      ]),
    },
  };

  return { prisma: prisma as never };
}

describe("crm-report-service: getLeadSourceReport", () => {
  it("groups leads by source", async () => {
    const { prisma } = createPrisma();
    const service = createCrmReportService(prisma);

    const result = await service.getLeadSourceReport({ tenantId: "t1" });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ source: "website", count: 5 });
    expect(result[1]).toEqual({ source: "whatsapp", count: 3 });
    expect(result[2]).toEqual({ source: "Unknown", count: 1 });
  });
});

describe("crm-report-service: getSalesFunnel", () => {
  it("returns stages with opportunity counts and values", async () => {
    const { prisma } = createPrisma();
    const service = createCrmReportService(prisma);

    const result = await service.getSalesFunnel({ tenantId: "t1" });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ stageName: "Lead", position: 0, count: 3, valueCents: 150000 });
    expect(result[1]).toEqual({ stageName: "Proposal", position: 1, count: 1, valueCents: 50000 });
    expect(result[2]).toEqual({ stageName: "Won", position: 2, count: 0, valueCents: 0 });
  });
});

describe("crm-report-service: getConversionReport", () => {
  it("calculates conversion rate correctly", async () => {
    const { prisma } = createPrisma();
    const service = createCrmReportService(prisma);

    const result = await service.getConversionReport({ tenantId: "t1" });

    expect(result.totalLeads).toBe(10);
    expect(result.convertedLeads).toBe(4);
    expect(result.conversionRate).toBe(40);
  });

  it("returns 0% for zero leads", async () => {
    const { prisma } = createPrisma();
    prisma.lead.count = vi.fn().mockResolvedValue(0);
    const service = createCrmReportService(prisma);

    const result = await service.getConversionReport({ tenantId: "t1" });

    expect(result.totalLeads).toBe(0);
    expect(result.conversionRate).toBe(0);
  });
});

describe("crm-report-service: getPendingFollowups", () => {
  it("returns pending followups ordered by due date", async () => {
    const { prisma } = createPrisma();
    const service = createCrmReportService(prisma);

    const result = await service.getPendingFollowups({ tenantId: "t1" });

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe("Call client");
    expect(result[0]?.entityType).toBe("Lead");
    expect(result[1]?.title).toBe("Send proposal");
    expect(result[1]?.entityType).toBe("Opportunity");
  });
});

describe("crm-report-service: getCustomerGrowth", () => {
  it("groups customers by month", async () => {
    const { prisma } = createPrisma();
    const service = createCrmReportService(prisma);

    const result = await service.getCustomerGrowth({ tenantId: "t1" });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ month: "2026-07", count: 2 });
    expect(result[1]).toEqual({ month: "2026-08", count: 2 });
    expect(result[2]).toEqual({ month: "2026-09", count: 1 });
  });
});
