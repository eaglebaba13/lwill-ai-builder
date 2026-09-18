import { describe, expect, it, vi } from "vitest";
import {
  FranchiseHierarchyError,
  createFranchiseHierarchyService,
  periodsOverlap,
  type CityFranchiseInput,
  type StateFranchiseInput,
} from "./franchise-hierarchy-service";

const from = new Date("2026-01-01T00:00:00.000Z");
const boundary = new Date("2026-06-01T00:00:00.000Z");
const to = new Date("2027-01-01T00:00:00.000Z");

function state(overrides: Record<string, unknown> = {}) {
  return {
    id: "state-franchise-1", tenantId: "tenant-1", partnerId: "partner-1",
    stateId: "state-1", code: "GJ-1", displayName: "Gujarat",
    coverageMode: "PINCODE_SET", effectiveFrom: from, effectiveTo: to,
    status: "DRAFT", conflictApprovedAt: null, conflictApprovedBy: null,
    conflictApprovalReference: null, createdAt: from, updatedAt: from, ...overrides,
  };
}

function city(overrides: Record<string, unknown> = {}) {
  return {
    id: "city-franchise-1", tenantId: "tenant-1",
    stateFranchiseId: "state-franchise-1", partnerId: "partner-2",
    cityId: "city-1", areaCode: "SURAT-W", displayName: "Surat West",
    effectiveFrom: from, effectiveTo: to, status: "DRAFT",
    conflictApprovedAt: null, conflictApprovedBy: null,
    conflictApprovalReference: null, createdAt: from, updatedAt: from, ...overrides,
  };
}

function assignment(overrides: Record<string, unknown> = {}) {
  return {
    id: "assignment-1", tenantId: "tenant-1", outletProfileId: "outlet-1",
    cityFranchiseId: "city-franchise-1", effectiveFrom: from,
    effectiveTo: null, status: "ACTIVE", transferReference: null,
    createdAt: from, updatedAt: from, ...overrides,
  };
}

function createPrisma() {
  const db = {
    franchisePartner: {
      findUnique: vi.fn(async () => ({ id: "partner-1", tenantId: "tenant-1", isActive: true })),
    },
    geoState: { findUnique: vi.fn(async () => ({ id: "state-1" })) },
    geoCity: { findUnique: vi.fn(async () => ({ id: "city-1", stateId: "state-1" })) },
    geoPincode: {
      findMany: vi.fn(async () => [{ id: "pin-1", stateId: "state-1", cityId: "city-1", value: "395007" }]),
    },
    stateFranchise: {
      findUnique: vi.fn(async () => state()),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }) => state(data)),
      update: vi.fn(async ({ data }) => state(data)),
    },
    stateFranchisePincode: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    cityFranchise: {
      findUnique: vi.fn(async () => city()),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }) => city(data)),
      update: vi.fn(async ({ data }) => city(data)),
    },
    cityFranchiseArea: {
      create: vi.fn(async () => ({ id: "area-1" })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    cityFranchisePincode: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    franchiseOutletProfile: {
      findUnique: vi.fn(async () => ({ id: "outlet-1", tenantId: "tenant-1", currentCityFranchiseId: null })),
      update: vi.fn(async ({ data }) => ({ id: "outlet-1", tenantId: "tenant-1", ...data })),
    },
    franchiseOutletAssignment: {
      findUnique: vi.fn(async () => assignment()),
      findFirst: vi.fn(async () => assignment()),
      findMany: vi.fn(async () => []),
      create: vi.fn(async ({ data }) => assignment(data)),
      update: vi.fn(async ({ data }) => assignment(data)),
    },
    $transaction: vi.fn(async (callback, _options?: unknown) => callback(db)),
  };
  return db;
}

const stateInput: StateFranchiseInput = {
  tenantId: "tenant-1", partnerId: "partner-1", stateId: "state-1",
  code: "GJ-1", displayName: "Gujarat", coverageMode: "PINCODE_SET",
  pincodeIds: ["pin-1"], effectiveFrom: from, effectiveTo: to,
};

const cityInput: CityFranchiseInput = {
  tenantId: "tenant-1", stateFranchiseId: "state-franchise-1",
  partnerId: "partner-2", cityId: "city-1", areaCode: "SURAT-W",
  displayName: "Surat West", effectiveFrom: from, effectiveTo: to,
  areas: [{ name: "West", pincodeIds: ["pin-1"] }],
};

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("franchise hierarchy periods", () => {
  it("treats adjacent half-open periods as non-overlapping", () => {
    expect(periodsOverlap(
      { effectiveFrom: from, effectiveTo: boundary },
      { effectiveFrom: boundary, effectiveTo: to },
    )).toBe(false);
  });

  it("detects finite and open-ended overlap", () => {
    expect(periodsOverlap(
      { effectiveFrom: from, effectiveTo: null },
      { effectiveFrom: boundary, effectiveTo: to },
    )).toBe(true);
  });
});

describe("State Franchise domain", () => {
  it("creates a valid partial State assignment transactionally", async () => {
    const db = createPrisma();
    const result = await createFranchiseHierarchyService(db as never).createStateFranchise(stateInput);
    expect(result.tenantId).toBe("tenant-1");
    expect(db.stateFranchisePincode.createMany).toHaveBeenCalledOnce();
    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  it("creates whole-State coverage without pincode rows", async () => {
    const db = createPrisma();
    await createFranchiseHierarchyService(db as never).createStateFranchise({
      ...stateInput, coverageMode: "WHOLE_STATE", pincodeIds: [],
    });
    expect(db.stateFranchisePincode.createMany).not.toHaveBeenCalled();
  });

  it("rejects explicit pincodes for whole-State coverage", async () => {
    const db = createPrisma();
    await expectCode(createFranchiseHierarchyService(db as never).createStateFranchise({
      ...stateInput, coverageMode: "WHOLE_STATE",
    }), "INVALID_COVERAGE");
  });

  it("rejects an invalid effective period", async () => {
    const db = createPrisma();
    await expectCode(createFranchiseHierarchyService(db as never).createStateFranchise({
      ...stateInput, effectiveTo: from,
    }), "INVALID_EFFECTIVE_PERIOD");
  });

  it("fails closed for a Partner from another tenant", async () => {
    const db = createPrisma();
    db.franchisePartner.findUnique.mockResolvedValue({ id: "partner-1", tenantId: "tenant-2", isActive: true });
    await expectCode(createFranchiseHierarchyService(db as never).createStateFranchise(stateInput), "NOT_FOUND");
  });

  it("rejects missing canonical geography", async () => {
    const db = createPrisma();
    db.geoState.findUnique.mockResolvedValue(null);
    await expectCode(createFranchiseHierarchyService(db as never).createStateFranchise(stateInput), "INVALID_GEOGRAPHY");
  });

  it("rejects overlapping State activation", async () => {
    const db = createPrisma();
    db.stateFranchise.findUnique.mockResolvedValue(state({ coverageMode: "WHOLE_STATE" }));
    db.stateFranchise.findMany.mockResolvedValue([state({
      id: "state-franchise-2", status: "ACTIVE", effectiveFrom: boundary,
    })]);
    await expectCode(createFranchiseHierarchyService(db as never).activateStateFranchise({
      tenantId: "tenant-1", stateFranchiseId: "state-franchise-1",
    }), "COVERAGE_OVERLAP");
  });

  it("blocks ending while an effective City child remains", async () => {
    const db = createPrisma();
    db.stateFranchise.findUnique.mockResolvedValue(state({ status: "ACTIVE" }));
    db.cityFranchise.findFirst.mockResolvedValue(city({ status: "ACTIVE", effectiveTo: null }));
    await expectCode(createFranchiseHierarchyService(db as never).endStateFranchise({
      tenantId: "tenant-1", stateFranchiseId: "state-franchise-1", effectiveTo: boundary,
    }), "ACTIVE_CHILDREN");
  });
});

describe("City Franchise domain", () => {
  it("creates a valid City assignment with named pincode coverage", async () => {
    const db = createPrisma();
    const result = await createFranchiseHierarchyService(db as never).createCityFranchise(cityInput);
    expect(result.cityId).toBe("city-1");
    expect(db.cityFranchiseArea.create).toHaveBeenCalledOnce();
    expect(db.cityFranchisePincode.createMany).toHaveBeenCalledOnce();
  });

  it("rejects City and parent State geography mismatch", async () => {
    const db = createPrisma();
    db.geoCity.findUnique.mockResolvedValue({ id: "city-1", stateId: "state-2" });
    await expectCode(createFranchiseHierarchyService(db as never).createCityFranchise(cityInput), "INVALID_GEOGRAPHY");
  });

  it("allows multiple assignments in the same City", async () => {
    const db = createPrisma();
    const service = createFranchiseHierarchyService(db as never);
    await service.createCityFranchise(cityInput);
    await service.createCityFranchise({ ...cityInput, areaCode: "SURAT-E", displayName: "Surat East" });
    expect(db.cityFranchise.create).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate pincode input", async () => {
    const db = createPrisma();
    await expectCode(createFranchiseHierarchyService(db as never).createCityFranchise({
      ...cityInput, areas: [{ name: "West", pincodeIds: ["pin-1", "pin-1"] }],
    }), "INVALID_COVERAGE");
  });

  it("requires conflict approval when State and City Partners match", async () => {
    const db = createPrisma();
    db.stateFranchise.findUnique.mockResolvedValue(state({ status: "ACTIVE" }));
    db.cityFranchise.findUnique.mockResolvedValue(city({ partnerId: "partner-1" }));
    await expectCode(createFranchiseHierarchyService(db as never).activateCityFranchise({
      tenantId: "tenant-1", cityFranchiseId: "city-franchise-1",
    }), "CONFLICT_APPROVAL_REQUIRED");
  });

  it("rejects overlapping active City pincode coverage", async () => {
    const db = createPrisma();
    db.stateFranchise.findUnique.mockResolvedValue(state({ status: "ACTIVE" }));
    db.cityFranchisePincode.findMany
      .mockResolvedValueOnce([{ pincodeId: "pin-1", cityFranchiseId: "city-franchise-1", effectiveFrom: from, effectiveTo: to }])
      .mockResolvedValueOnce([{ pincodeId: "pin-1", cityFranchiseId: "city-franchise-2", effectiveFrom: boundary, effectiveTo: null }]);
    await expectCode(createFranchiseHierarchyService(db as never).activateCityFranchise({
      tenantId: "tenant-1", cityFranchiseId: "city-franchise-1",
    }), "COVERAGE_OVERLAP");
  });

  it("blocks ending while an effective Outlet assignment remains", async () => {
    const db = createPrisma();
    db.cityFranchise.findUnique.mockResolvedValue(city({ status: "ACTIVE", effectiveTo: null }));
    await expectCode(createFranchiseHierarchyService(db as never).endCityFranchise({
      tenantId: "tenant-1", cityFranchiseId: "city-franchise-1", effectiveTo: boundary,
    }), "ACTIVE_CHILDREN");
  });
});

describe("Outlet hierarchy history", () => {
  it("creates an initial assignment and synchronizes the pointer", async () => {
    const db = createPrisma();
    db.cityFranchise.findUnique.mockResolvedValue(city({ status: "ACTIVE", effectiveTo: null }));
    const result = await createFranchiseHierarchyService(db as never).assignOutletToCityFranchise({
      tenantId: "tenant-1", outletProfileId: "outlet-1",
      cityFranchiseId: "city-franchise-1", effectiveFrom: from,
    });
    expect(result.status).toBe("ACTIVE");
    expect(db.franchiseOutletProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentCityFranchiseId: "city-franchise-1" }),
    }));
  });

  it("rejects assignment overlap", async () => {
    const db = createPrisma();
    db.cityFranchise.findUnique.mockResolvedValue(city({ status: "ACTIVE", effectiveTo: null }));
    db.franchiseOutletAssignment.findMany.mockResolvedValue([assignment()]);
    await expectCode(createFranchiseHierarchyService(db as never).assignOutletToCityFranchise({
      tenantId: "tenant-1", outletProfileId: "outlet-1",
      cityFranchiseId: "city-franchise-1", effectiveFrom: boundary,
    }), "ASSIGNMENT_OVERLAP");
  });

  it("fails closed for cross-tenant Outlet access", async () => {
    const db = createPrisma();
    db.franchiseOutletProfile.findUnique.mockResolvedValue({
      id: "outlet-1", tenantId: "tenant-2", currentCityFranchiseId: null,
    });
    await expectCode(createFranchiseHierarchyService(db as never).assignOutletToCityFranchise({
      tenantId: "tenant-1", outletProfileId: "outlet-1",
      cityFranchiseId: "city-franchise-1", effectiveFrom: from,
    }), "NOT_FOUND");
  });

  it("reassignment closes history, creates a successor, and updates pointer", async () => {
    const db = createPrisma();
    db.cityFranchise.findUnique.mockResolvedValue(city({ id: "city-franchise-2", status: "ACTIVE", effectiveTo: null }));
    db.franchiseOutletAssignment.findMany.mockResolvedValue([]);
    await createFranchiseHierarchyService(db as never).reassignOutletToCityFranchise({
      tenantId: "tenant-1", outletProfileId: "outlet-1",
      cityFranchiseId: "city-franchise-2", effectiveFrom: boundary,
      transferReference: "approved-transfer",
    });
    expect(db.franchiseOutletAssignment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { effectiveTo: boundary, status: "ENDED" },
    }));
    expect(db.franchiseOutletAssignment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cityFranchiseId: "city-franchise-2", transferReference: "approved-transfer" }),
    }));
    expect(db.franchiseOutletProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ currentCityFranchiseId: "city-franchise-2" }),
    }));
  });

  it("returns the assignment effective at a timestamp", async () => {
    const db = createPrisma();
    db.franchiseOutletAssignment.findMany.mockResolvedValue([assignment()]);
    const result = await createFranchiseHierarchyService(db as never).getOutletAssignmentAt({
      tenantId: "tenant-1", outletProfileId: "outlet-1", timestamp: boundary,
    });
    expect(result?.id).toBe("assignment-1");
  });

  it("fails closed when corrupt history resolves more than one assignment", async () => {
    const db = createPrisma();
    db.franchiseOutletAssignment.findMany.mockResolvedValue([
      assignment(), assignment({ id: "assignment-2" }),
    ]);
    await expectCode(createFranchiseHierarchyService(db as never).getOutletAssignmentAt({
      tenantId: "tenant-1", outletProfileId: "outlet-1", timestamp: boundary,
    }), "ASSIGNMENT_OVERLAP");
  });

  it("resolves Outlet to City and State at transaction time", async () => {
    const db = createPrisma();
    db.franchiseOutletAssignment.findMany.mockResolvedValue([assignment()]);
    db.cityFranchise.findUnique.mockResolvedValue(city({ status: "ACTIVE", effectiveTo: null }));
    db.stateFranchise.findUnique.mockResolvedValue(state({ status: "ACTIVE" }));
    const result = await createFranchiseHierarchyService(db as never).resolveOutletHierarchyAt({
      tenantId: "tenant-1", outletProfileId: "outlet-1", timestamp: boundary,
    });
    expect(result?.cityFranchise.id).toBe("city-franchise-1");
    expect(result?.stateFranchise.id).toBe("state-franchise-1");
  });
});

describe("serializable hierarchy writes", () => {
  it("requests Serializable isolation and retries a transient write conflict", async () => {
    const db = createPrisma();
    db.stateFranchise.findUnique.mockResolvedValue(state({ coverageMode: "WHOLE_STATE" }));
    let attempts = 0;
    db.$transaction.mockImplementation(async (callback, options?: unknown) => {
      attempts += 1;
      expect(options).toEqual({ isolationLevel: "Serializable" });
      if (attempts < 3) throw { code: "P2034" };
      return callback(db);
    });

    await createFranchiseHierarchyService(db as never).activateStateFranchise({
      tenantId: "tenant-1", stateFranchiseId: "state-franchise-1",
    });

    expect(attempts).toBe(3);
  });

  it("allows at most one competing City coverage activation and maps retry exhaustion", async () => {
    const db = createPrisma();
    db.stateFranchise.findUnique.mockResolvedValue(state({ status: "ACTIVE" }));
    let admitted = false;
    db.$transaction.mockImplementation(async (callback, options?: unknown) => {
      expect(options).toEqual({ isolationLevel: "Serializable" });
      if (admitted) throw { code: "P2034" };
      admitted = true;
      return callback(db);
    });
    const service = createFranchiseHierarchyService(db as never);

    const results = await Promise.allSettled([
      service.activateCityFranchise({ tenantId: "tenant-1", cityFranchiseId: "city-franchise-1" }),
      service.activateCityFranchise({ tenantId: "tenant-1", cityFranchiseId: "city-franchise-2" }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONCURRENT_WRITE" },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(4);
  });

  it("allows at most one competing Outlet assignment and maps retry exhaustion", async () => {
    const db = createPrisma();
    db.cityFranchise.findUnique.mockResolvedValue(city({ status: "ACTIVE", effectiveTo: null }));
    let admitted = false;
    db.$transaction.mockImplementation(async (callback, options?: unknown) => {
      expect(options).toEqual({ isolationLevel: "Serializable" });
      if (admitted) throw { code: "P2034" };
      admitted = true;
      return callback(db);
    });
    const service = createFranchiseHierarchyService(db as never);
    const input = {
      tenantId: "tenant-1", outletProfileId: "outlet-1",
      cityFranchiseId: "city-franchise-1", effectiveFrom: from,
    };

    const results = await Promise.allSettled([
      service.assignOutletToCityFranchise(input),
      service.assignOutletToCityFranchise(input),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONCURRENT_WRITE" },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(4);
  });
});
describe("error model", () => {
  it("uses deterministic domain errors", () => {
    const error = new FranchiseHierarchyError("INVALID_PARENT", "invalid");
    expect(error).toMatchObject({ name: "FranchiseHierarchyError", code: "INVALID_PARENT" });
  });
});
