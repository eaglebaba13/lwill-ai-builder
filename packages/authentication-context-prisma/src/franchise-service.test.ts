import { describe, expect, it, vi } from "vitest";
import { createFranchiseService } from "./franchise-service";

type AgreementState = {
  id: string;
  tenantId: string;
  partnerId: string;
  territoryId: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  minimumGuaranteeCents: number | null;
  mgFormulaRateBp: number | null;
  mgFormulaBase: string | null;
  variableReturnRateBp: number | null;
  variableReturnBasis: string | null;
  payoutRule: string | null;
  termsSnapshot: Record<string, unknown> | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  partner: { name: string } | null;
  territory: { name: string } | null;
  outlets: { id: string }[];
};

function createFixture() {
  const state = {
    agreements: new Map<string, AgreementState>(),
    outlets: new Map<string, { id: string; agreementId: string; branchId: string }>(),
  };

  const prisma = {
    territory: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "territory-1", ...data })),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, name: "Territory 1" })),
      findMany: vi.fn(async () => [{ id: "territory-1", name: "Territory 1" }]),
      count: vi.fn(async () => 1),
    },
    franchisePartner: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "partner-1", ...data })),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, name: "Partner 1" })),
      findMany: vi.fn(async () => [{ id: "partner-1", name: "Partner 1" }]),
      count: vi.fn(async () => 1),
    },
    franchiseAgreement: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: "agreement-" + Math.random().toString(36).slice(2),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          partner: { name: "Partner 1" },
          territory: { name: "Territory 1" },
          outlets: [],
        } as AgreementState;
        state.agreements.set(record.id, record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.agreements.get(where.id) ?? null),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) =>
        [...state.agreements.values()].filter((a) => where?.tenantId === undefined || a.tenantId === where.tenantId)),
      count: vi.fn(async () => state.agreements.size),
    },
    franchiseOutletProfile: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "outlet-1", ...data, createdAt: new Date(), updatedAt: new Date(), isActive: true })),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, tenantId: "tenant-1", partnerId: "partner-1", branchId: "branch-1", territoryId: null, outletType: "STANDALONE", ownershipMode: null, investmentCents: null, isActive: true, createdAt: new Date(), updatedAt: new Date() })),
      findMany: vi.fn(async () => []),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({ id: where.id, tenantId: "tenant-1", partnerId: "partner-1", branchId: "branch-1", territoryId: null, outletType: "STANDALONE", ownershipMode: null, investmentCents: null, isActive: true, createdAt: new Date(), updatedAt: new Date(), ...data })),
      count: vi.fn(async () => 0),
    },
    franchiseAgreementOutlet: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "agreement-outlet-1", ...data })),
    },
  };

  return { prisma, state };
}

describe("franchise service — commercial terms foundation", () => {
  it("creates a new X NAIL ₹10L agreement with formula-based MG terms", async () => {
    const { prisma, state } = createFixture();
    const service = createFranchiseService(prisma as never);

    const agreement = await service.createAgreement({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      territoryId: "territory-1",
      startDate: new Date("2026-09-02"),
      endDate: null,
      minimumGuaranteeCents: null,
      mgFormulaRateBp: 300,
      mgFormulaBase: "INITIAL_INVESTMENT",
      variableReturnRateBp: 3000,
      variableReturnBasis: "NET_SALES",
      payoutRule: "HIGHER_OF_FIXED_AND_VARIABLE",
      termsSnapshot: {
        minimumGuaranteeCents: null,
        mgFormulaRateBp: 300,
        mgFormulaBase: "INITIAL_INVESTMENT",
        variableReturnRateBp: 3000,
        variableReturnBasis: "NET_SALES",
        payoutRule: "HIGHER_OF_FIXED_AND_VARIABLE",
      },
      effectiveFrom: new Date("2026-09-02"),
      effectiveTo: null,
    });

    expect(agreement.id).toBeTruthy();
    expect(agreement.mgFormulaRateBp).toBe(300);
    expect(agreement.mgFormulaBase).toBe("INITIAL_INVESTMENT");
    expect(agreement.variableReturnRateBp).toBe(3000);
    expect(agreement.variableReturnBasis).toBe("NET_SALES");
    expect(agreement.payoutRule).toBe("HIGHER_OF_FIXED_AND_VARIABLE");
    expect(agreement.termsSnapshot).toEqual({
      minimumGuaranteeCents: null,
      mgFormulaRateBp: 300,
      mgFormulaBase: "INITIAL_INVESTMENT",
      variableReturnRateBp: 3000,
      variableReturnBasis: "NET_SALES",
      payoutRule: "HIGHER_OF_FIXED_AND_VARIABLE",
    });
    expect(agreement.effectiveFrom).toEqual(new Date("2026-09-02"));
  });

  it("creates a historical ₹3.10L agreement with fixed MG only", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);

    const agreement = await service.createAgreement({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      territoryId: "territory-1",
      startDate: new Date("2026-08-29"),
      endDate: null,
      minimumGuaranteeCents: 1500000,
      mgFormulaRateBp: null,
      mgFormulaBase: null,
      variableReturnRateBp: null,
      variableReturnBasis: null,
      payoutRule: null,
      termsSnapshot: {
        minimumGuaranteeCents: 1500000,
        mgFormulaRateBp: null,
        mgFormulaBase: null,
        variableReturnRateBp: null,
        variableReturnBasis: null,
        payoutRule: null,
      },
      effectiveFrom: new Date("2026-08-29"),
      effectiveTo: null,
    });

    expect(agreement.minimumGuaranteeCents).toBe(1500000);
    expect(agreement.mgFormulaRateBp).toBeNull();
    expect(agreement.mgFormulaBase).toBeNull();
    expect(agreement.termsSnapshot).toEqual({
      minimumGuaranteeCents: 1500000,
      mgFormulaRateBp: null,
      mgFormulaBase: null,
      variableReturnRateBp: null,
      variableReturnBasis: null,
      payoutRule: null,
    });
  });

  it("returns agreement commercial terms through getAgreement", async () => {
    const { prisma, state } = createFixture();
    const service = createFranchiseService(prisma as never);

    const created = await service.createAgreement({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      territoryId: "territory-1",
      startDate: new Date("2026-09-02"),
      minimumGuaranteeCents: null,
      mgFormulaRateBp: 300,
      mgFormulaBase: "INITIAL_INVESTMENT",
      variableReturnRateBp: 3000,
      variableReturnBasis: "NET_SALES",
      payoutRule: "HIGHER_OF_FIXED_AND_VARIABLE",
      termsSnapshot: { test: true },
      effectiveFrom: new Date("2026-09-02"),
      effectiveTo: null,
    });

    const found = await service.getAgreement({ tenantId: "tenant-1", agreementId: created.id });
    expect(found).not.toBeNull();
    expect(found?.mgFormulaRateBp).toBe(300);
    expect(found?.termsSnapshot).toEqual({ test: true });
  });

  it("isolates agreement commercial terms by tenant", async () => {
    const { prisma, state } = createFixture();
    const service = createFranchiseService(prisma as never);

    await service.createAgreement({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      territoryId: "territory-1",
      startDate: new Date("2026-09-02"),
      minimumGuaranteeCents: null,
      mgFormulaRateBp: 300,
      mgFormulaBase: "INITIAL_INVESTMENT",
      variableReturnRateBp: 3000,
      variableReturnBasis: "NET_SALES",
      payoutRule: "HIGHER_OF_FIXED_AND_VARIABLE",
      termsSnapshot: null,
      effectiveFrom: new Date("2026-09-02"),
      effectiveTo: null,
    });

    const crossTenant = await service.getAgreement({ tenantId: "tenant-2", agreementId: state.agreements.keys().next().value! });
    expect(crossTenant).toBeNull();
  });

  it("preserves terms snapshot independently of later configuration", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);

    const snapshot = {
      minimumGuaranteeCents: 1500000,
      mgFormulaRateBp: null,
      mgFormulaBase: null,
      variableReturnRateBp: null,
      variableReturnBasis: null,
      payoutRule: null,
      effectiveFrom: "2026-08-29",
    };

    const agreement = await service.createAgreement({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      territoryId: "territory-1",
      startDate: new Date("2026-08-29"),
      minimumGuaranteeCents: 1500000,
      mgFormulaRateBp: null,
      mgFormulaBase: null,
      variableReturnRateBp: null,
      variableReturnBasis: null,
      payoutRule: null,
      termsSnapshot: snapshot,
      effectiveFrom: new Date("2026-08-29"),
      effectiveTo: null,
    });

    expect(agreement.termsSnapshot).toEqual(snapshot);
    expect(agreement.minimumGuaranteeCents).toBe(1500000);
  });
});

describe("franchise service — outlet ownership", () => {
  it("creates COMPANY_OWNED outlet with null partnerId", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);
    const outlet = await service.createOutlet({
      tenantId: "tenant-1",
      branchId: "branch-1",
      ownershipMode: "COMPANY_OWNED",
    });
    expect(outlet.partnerId).toBeNull();
    expect(outlet.ownershipMode).toBe("COMPANY_OWNED");
    expect(prisma.franchiseOutletProfile.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ partnerId: null, ownershipMode: "COMPANY_OWNED" }),
    }));
  });

  it("creates UNDER_FRANCHISE_PARTNER outlet with valid partnerId", async () => {
    const { prisma } = createFixture();
    (prisma.franchisePartner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "partner-1", tenantId: "tenant-1", isActive: true });
    const service = createFranchiseService(prisma as never);
    const outlet = await service.createOutlet({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      branchId: "branch-1",
      ownershipMode: "UNDER_FRANCHISE_PARTNER",
    });
    expect(outlet.partnerId).toBe("partner-1");
    expect(outlet.ownershipMode).toBe("UNDER_FRANCHISE_PARTNER");
  });

  it("rejects COMPANY_OWNED with non-null partnerId", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);
    await expect(service.createOutlet({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      branchId: "branch-1",
      ownershipMode: "COMPANY_OWNED",
    })).rejects.toThrow("COMPANY_OWNED outlets must not have an Outlet Franchise Partner.");
  });

  it("rejects UNDER_FRANCHISE_PARTNER without partnerId", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);
    await expect(service.createOutlet({
      tenantId: "tenant-1",
      branchId: "branch-1",
      ownershipMode: "UNDER_FRANCHISE_PARTNER",
    })).rejects.toThrow("UNDER_FRANCHISE_PARTNER outlets require an Outlet Franchise Partner.");
  });

  it("rejects UNDER_FRANCHISE_PARTNER with non-existent partner", async () => {
    const { prisma } = createFixture();
    (prisma.franchisePartner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const service = createFranchiseService(prisma as never);
    await expect(service.createOutlet({
      tenantId: "tenant-1",
      partnerId: "nonexistent",
      branchId: "branch-1",
      ownershipMode: "UNDER_FRANCHISE_PARTNER",
    })).rejects.toThrow("Outlet Franchise Partner must exist, belong to the same tenant, and be active.");
  });

  it("rejects UNDER_FRANCHISE_PARTNER with cross-tenant partner", async () => {
    const { prisma } = createFixture();
    (prisma.franchisePartner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "partner-2", tenantId: "other-tenant", isActive: true });
    const service = createFranchiseService(prisma as never);
    await expect(service.createOutlet({
      tenantId: "tenant-1",
      partnerId: "partner-2",
      branchId: "branch-1",
      ownershipMode: "UNDER_FRANCHISE_PARTNER",
    })).rejects.toThrow("Outlet Franchise Partner must exist, belong to the same tenant, and be active.");
  });

  it("rejects UNDER_FRANCHISE_PARTNER with inactive partner", async () => {
    const { prisma } = createFixture();
    (prisma.franchisePartner.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "partner-1", tenantId: "tenant-1", isActive: false });
    const service = createFranchiseService(prisma as never);
    await expect(service.createOutlet({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      branchId: "branch-1",
      ownershipMode: "UNDER_FRANCHISE_PARTNER",
    })).rejects.toThrow("Outlet Franchise Partner must exist, belong to the same tenant, and be active.");
  });

  it("updateOutletOwnership updates COMPANY_OWNED and clears partnerId", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);
    const result = await service.updateOutletOwnership("tenant-1", "outlet-1", { ownershipMode: "COMPANY_OWNED", partnerId: null });
    expect(result).not.toBeNull();
    expect(prisma.franchiseOutletProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "outlet-1" },
      data: expect.objectContaining({ ownershipMode: "COMPANY_OWNED", partnerId: null }),
    }));
  });

  it("updateOutletOwnership rejects COMPANY_OWNED with partnerId", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);
    await expect(service.updateOutletOwnership("tenant-1", "outlet-1", { ownershipMode: "COMPANY_OWNED", partnerId: "partner-1" }))
      .rejects.toThrow("COMPANY_OWNED outlets must not have an Outlet Franchise Partner.");
  });

  it("updateOutletOwnership rejects cross-tenant outlet", async () => {
    const { prisma } = createFixture();
    (prisma.franchiseOutletProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "outlet-1", tenantId: "other-tenant" });
    const service = createFranchiseService(prisma as never);
    const result = await service.updateOutletOwnership("tenant-1", "outlet-1", { ownershipMode: "COMPANY_OWNED", partnerId: null });
    expect(result).toBeNull();
  });

  it("updateOutletOwnership returns null for non-existent outlet", async () => {
    const { prisma } = createFixture();
    (prisma.franchiseOutletProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    const service = createFranchiseService(prisma as never);
    const result = await service.updateOutletOwnership("tenant-1", "nonexistent", { ownershipMode: "COMPANY_OWNED", partnerId: null });
    expect(result).toBeNull();
  });

  it("creates outlet without ownershipMode (legacy compatible)", async () => {
    const { prisma } = createFixture();
    const service = createFranchiseService(prisma as never);
    const outlet = await service.createOutlet({
      tenantId: "tenant-1",
      partnerId: "partner-1",
      branchId: "branch-1",
    });
    expect(outlet.partnerId).toBe("partner-1");
    expect(outlet.ownershipMode).toBeNull();
  });
});
