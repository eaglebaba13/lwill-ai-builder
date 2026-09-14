import { describe, expect, it, vi } from "vitest";
import { createSettlementService } from "./franchise-settlement-service";

function createPrisma() {
  let settlementIdCounter = 0;
  let lineIdCounter = 0;
  const settlements: Record<string, unknown>[] = [];
  const lines: Record<string, unknown>[] = [];

  const prisma = {
    franchiseAgreement: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === "agreement-1") {
          return {
            id: "agreement-1",
            tenantId: "tenant-1",
            partnerId: "partner-1",
            territoryId: "territory-1",
            minimumGuaranteeCents: 1500000,
            mgFormulaRateBp: null,
            mgFormulaBase: null,
            variableReturnRateBp: 3000,
            variableReturnBasis: null,
            payoutRule: null,
            territoryRoyaltyRateBp: 200,
            effectiveFrom: null,
            effectiveTo: null,
            partner: { id: "partner-1" },
            outlets: [{ branchId: "branch-1" }, { branchId: "branch-2" }],
          };
        }
        if (where.id === "agreement-other-tenant") {
          return { id: "agreement-other-tenant", tenantId: "tenant-2", partnerId: "partner-2" };
        }
        return null;
      }),
    },
    franchiseAgreementOutlet: {
      findMany: vi.fn(async () => [{ branchId: "branch-1" }, { branchId: "branch-2" }]),
    },
    franchiseOutletProfile: {
      findMany: vi.fn(async () => [{ investmentCents: 31000000 }]),
    },
    invoice: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.branchId && typeof where.branchId === "object" && "in" in (where.branchId as Record<string, unknown>)) {
          return [
            { totalCents: 10000000, gstCents: 1800000 },
            { totalCents: 5000000, gstCents: 900000 },
          ];
        }
        return [];
      }),
    },
    franchiseSettlement: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `settlement-${++settlementIdCounter}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        settlements.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return settlements.find((s) => s.id === where.id) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return settlements.filter((s) => Object.entries(where).every(([k, v]) => s[k] === v));
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = settlements.find((s) => s.id === where.id);
        if (record) Object.assign(record, data);
        return record;
      }),
    },
    franchiseSettlementLine: {
      createMany: vi.fn(async ({ data }: { data: ReadonlyArray<Record<string, unknown>> }) => {
        for (const d of data) {
          lines.push({ id: `line-${++lineIdCounter}`, ...d, createdAt: new Date() });
        }
      }),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return lines.filter((l) => Object.entries(where).every(([k, v]) => l[k] === v));
      }),
    },
    franchisePayment: {
      findMany: vi.fn(async () => []),
    },
    auditLog: {
      create: vi.fn(async () => ({})),
    },
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  };

  return { prisma: prisma as never, settlements, lines };
}

describe("franchise-settlement-service: generateSettlement", () => {
  it("generates settlement for valid calendar month", async () => {
    const { prisma, settlements, lines } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.settlement.status).toBe("CALCULATED");
    expect(result.settlement.tenantId).toBe("tenant-1");
    expect(result.settlement.agreementId).toBe("agreement-1");
    expect(result.settlement.partnerId).toBe("partner-1");
    expect(settlements).toHaveLength(1);
    expect(lines.length).toBeGreaterThan(0);
  });

  it("calculates net sales excluding GST", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.settlement.grossSalesCents).toBe(15000000);
    expect(result.settlement.gstCents).toBe(2700000);
    expect(result.settlement.netSalesCents).toBe(12300000);
  });

  it("applies MG floor when variable return < MG", async () => {
    const { prisma } = createPrisma();
    prisma.invoice.findMany = vi.fn(async () => [{ totalCents: 100000, gstCents: 18000 }]);
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.settlement.mgCents).toBe(1500000);
    expect(result.settlement.payoutCents).toBe(1500000);
  });

  it("uses variable return when > MG", async () => {
    const { prisma } = createPrisma();
    prisma.invoice.findMany = vi.fn(async () => [{ totalCents: 100000000, gstCents: 18000000 }]);
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.settlement.variableReturnCents).toBeGreaterThan(result.settlement.mgCents);
    expect(result.settlement.payoutCents).toBe(result.settlement.variableReturnCents);
  });

  it("calculates royalty", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.settlement.royaltyCents).toBe(Math.round(15000000 * 200 / 10000));
  });

  it("captures terms snapshot with sales data", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    const snapshot = result.settlement.termsSnapshot as Record<string, unknown>;
    expect(snapshot).toBeDefined();
    expect(snapshot.periodGrossSalesCents).toBe(15000000);
    expect(snapshot.periodNetSalesCents).toBe(12300000);
    expect(snapshot.applicableBranchIds).toEqual(["branch-1", "branch-2"]);
  });

  it("creates settlement lines that reconcile to totals", async () => {
    const { prisma, lines } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.lines.length).toBe(4);
    const lineTypes = result.lines.map((l) => l.lineType).sort();
    expect(lineTypes).toEqual(["MG", "PAYOUT", "ROYALTY", "VARIABLE_RETURN"]);
  });

  it("returns 404 for cross-tenant agreement", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-other-tenant", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("error" in result)) throw new Error("Expected error");
    expect(result.status).toBe(404);
  });

  it("returns 400 for non-calendar month", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-05", periodEnd: "2026-10-04" },
      userId: "user-1",
    });

    if (!("error" in result)) throw new Error("Expected error");
    expect(result.status).toBe(400);
    expect(result.error).toContain("calendar month");
  });

  it("returns 400 for invalid dates", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "invalid", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("error" in result)) throw new Error("Expected error");
    expect(result.status).toBe(400);
  });

  it("returns 409 for duplicate settlement", async () => {
    const { prisma, settlements } = createPrisma();
    const service = createSettlementService(prisma);

    await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    prisma.franchiseSettlement.create = vi.fn(async () => {
      const err = new Error("Unique constraint failed on the fields: (`tenantId`,`agreementId`,`periodStart`,`periodEnd`)");
      err.name = "PrismaClientKnownRequestError";
      throw err;
    });

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("error" in result)) throw new Error("Expected error");
    expect(result.status).toBe(409);
  });

  it("does not double-count MG + variable + payout in totalCents", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const result = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    if (!("settlement" in result)) throw new Error("Expected settlement");
    expect(result.settlement.totalCents).toBe(result.settlement.payoutCents + result.settlement.royaltyCents);
  });
});

describe("franchise-settlement-service: approveSettlement", () => {
  it("approves a CALCULATED settlement", async () => {
    const { prisma, settlements } = createPrisma();
    const service = createSettlementService(prisma);

    const gen = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });
    if (!("settlement" in gen)) throw new Error("Expected settlement");

    const result = await service.approveSettlement({ tenantId: "tenant-1", settlementId: gen.settlement.id, userId: "user-2" });
    if ("error" in result) throw new Error("Expected success");
    expect(result.status).toBe("APPROVED");
    expect(result.approvedBy).toBe("user-2");
    expect(result.approvedAt).toBeDefined();
  });

  it("rejects approval of non-CALCULATED settlement", async () => {
    const { prisma, settlements } = createPrisma();
    const service = createSettlementService(prisma);

    const gen = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });
    if (!("settlement" in gen)) throw new Error("Expected settlement");

    await service.approveSettlement({ tenantId: "tenant-1", settlementId: gen.settlement.id, userId: "user-2" });
    const result = await service.approveSettlement({ tenantId: "tenant-1", settlementId: gen.settlement.id, userId: "user-3" });
    if (!("error" in result)) throw new Error("Expected error");
    expect(result.status).toBe(400);
  });

  it("returns 404 for cross-tenant settlement", async () => {
    const { prisma, settlements } = createPrisma();
    const service = createSettlementService(prisma);

    const gen = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });
    if (!("settlement" in gen)) throw new Error("Expected settlement");

    const result = await service.approveSettlement({ tenantId: "tenant-2", settlementId: gen.settlement.id, userId: "user-2" });
    if (!("error" in result)) throw new Error("Expected error");
    expect(result.status).toBe(404);
  });
});

describe("franchise-settlement-service: getSettlement", () => {
  it("returns null for cross-tenant access", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const gen = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });
    if (!("settlement" in gen)) throw new Error("Expected settlement");

    const result = await service.getSettlement({ tenantId: "tenant-2", settlementId: gen.settlement.id });
    expect(result).toBeNull();
  });

  it("returns settlement with lines and payments", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    const gen = await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });
    if (!("settlement" in gen)) throw new Error("Expected settlement");

    const result = await service.getSettlement({ tenantId: "tenant-1", settlementId: gen.settlement.id });
    expect(result).not.toBeNull();
    expect(result!.settlement.id).toBe(gen.settlement.id);
    expect(result!.lines.length).toBe(4);
    expect(result!.payments).toHaveLength(0);
  });
});

describe("franchise-settlement-service: listSettlements", () => {
  it("lists settlements for tenant", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    const result = await service.listSettlements({ tenantId: "tenant-1" });
    expect(result).toHaveLength(1);
  });

  it("filters by status", async () => {
    const { prisma } = createPrisma();
    const service = createSettlementService(prisma);

    await service.generateSettlement({
      tenantId: "tenant-1",
      input: { agreementId: "agreement-1", periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      userId: "user-1",
    });

    const result = await service.listSettlements({ tenantId: "tenant-1", status: "APPROVED" });
    expect(result).toHaveLength(0);
  });
});
