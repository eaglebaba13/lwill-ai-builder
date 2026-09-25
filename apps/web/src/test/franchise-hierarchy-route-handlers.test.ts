import { describe, expect, it, vi } from "vitest";
import { FranchiseHierarchyError } from "../../../../packages/authentication-context-prisma/src/franchise-hierarchy-service";
import {
  handleActivateCityFranchise,
  handleActivateStateFranchise,
  handleAssignOutlet,
  handleCreateCityFranchise,
  handleCreateStateFranchise,
  handleEndCityFranchise,
  handleEndStateFranchise,
  handleGetCityFranchise,
  handleGetCurrentOutletAssignment,
  handleGetStateFranchise,
  handleListCityFranchises,
  handleListOutletAssignments,
  handleListStateFranchises,
  handleReassignOutlet,
  handleResolveOutletHierarchy,
  handleUpdateCityFranchise,
  handleUpdateStateFranchise,
  type HierarchyAuthorization,
  type HierarchyRouteServices,
} from "../lib/crm/franchise-hierarchy-route-handlers";

const stateId = "11111111-1111-4111-8111-111111111111";
const cityId = "22222222-2222-4222-8222-222222222222";
const partnerId = "33333333-3333-4333-8333-333333333333";
const outletId = "44444444-4444-4444-8444-444444444444";
const legacyOutletId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const stateFranchiseId = "55555555-5555-4555-8555-555555555555";
const cityFranchiseId = "66666666-6666-4666-8666-666666666666";
const timestamp = "2026-01-01T00:00:00.000Z";

function services(auth: HierarchyAuthorization): HierarchyRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    listStates: vi.fn().mockResolvedValue([{ id: stateFranchiseId, tenantId: "tenant-1", displayName: "Gujarat" }]),
    getState: vi.fn().mockResolvedValue({ id: stateFranchiseId, tenantId: "tenant-1" }),
    createState: vi.fn().mockResolvedValue({ id: stateFranchiseId, tenantId: "tenant-1", status: "DRAFT" }),
    updateState: vi.fn().mockResolvedValue({ id: stateFranchiseId, status: "DRAFT" }),
    activateState: vi.fn().mockResolvedValue({ id: stateFranchiseId, status: "ACTIVE" }),
    endState: vi.fn().mockResolvedValue({ id: stateFranchiseId, status: "ENDED" }),
    listCities: vi.fn().mockResolvedValue([{ id: cityFranchiseId, cityId }]),
    getCity: vi.fn().mockResolvedValue({ id: cityFranchiseId, cityId }),
    createCity: vi.fn().mockResolvedValue({ id: cityFranchiseId, cityId, status: "DRAFT" }),
    updateCity: vi.fn().mockResolvedValue({ id: cityFranchiseId, status: "DRAFT" }),
    activateCity: vi.fn().mockResolvedValue({ id: cityFranchiseId, status: "ACTIVE" }),
    endCity: vi.fn().mockResolvedValue({ id: cityFranchiseId, status: "ENDED" }),
    assignOutlet: vi.fn().mockResolvedValue({ id: stateId, outletProfileId: outletId, cityFranchiseId }),
    reassignOutlet: vi.fn().mockResolvedValue({ id: cityId, outletProfileId: outletId, cityFranchiseId }),
    getCurrentAssignment: vi.fn().mockResolvedValue({ id: stateId, outletProfileId: outletId }),
    listAssignmentHistory: vi.fn().mockResolvedValue([{ id: stateId, outletProfileId: outletId }]),
    resolveOutlet: vi.fn().mockResolvedValue({
      outlet: { id: outletId, currentCityFranchiseId: cityFranchiseId },
      assignment: { id: stateId, outletProfileId: outletId, cityFranchiseId },
      cityFranchise: { id: cityFranchiseId, stateFranchiseId },
      stateFranchise: { id: stateFranchiseId, stateId },
    }),
  };
}

const authorized: HierarchyAuthorization = {
  outcome: "authorized", tenantId: "tenant-1", userId: "user-1",
};

function get(path = "/api/franchise/hierarchy/states") {
  return new Request(`https://builder.lwill.in${path}`);
}

function post(path: string, value: unknown) {
  return new Request(`https://builder.lwill.in${path}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}

function stateBody(extra: Record<string, unknown> = {}) {
  return {
    partnerId, stateId, code: "GJ-1", displayName: "Gujarat",
    coverageMode: "PINCODE_SET", pincodeIds: [outletId],
    effectiveFrom: timestamp, effectiveTo: "2027-01-01T00:00:00.000Z", ...extra,
  };
}

function cityBody(extra: Record<string, unknown> = {}) {
  return {
    stateFranchiseId, partnerId, cityId, areaCode: "SURAT-W",
    displayName: "Surat West", areas: [{ name: "West", pincodeIds: [outletId] }],
    effectiveFrom: timestamp, effectiveTo: "2027-01-01T00:00:00.000Z", ...extra,
  };
}

describe("FH-4C authorization and tenant boundary", () => {
  it("rejects unauthenticated reads", async () => {
    const api = services({ outcome: "unauthenticated" });
    expect((await handleListStateFranchises(get(), api)).status).toBe(401);
    expect(api.listStates).not.toHaveBeenCalled();
  });

  it("rejects missing read permission", async () => {
    expect((await handleListCityFranchises(get("/api/franchise/hierarchy/cities"), services({ outcome: "forbidden" }))).status).toBe(403);
  });

  it("uses franchise.read for hierarchy reads", async () => {
    const api = services(authorized);
    await handleGetStateFranchise(get(), api, stateFranchiseId);
    expect(api.authorize).toHaveBeenCalledWith("franchise.read");
  });

  it("uses franchise.write for mutations", async () => {
    const api = services(authorized);
    await handleCreateStateFranchise(post("/api/franchise/hierarchy/states", stateBody()), api);
    expect(api.authorize).toHaveBeenCalledWith("franchise.write");
  });

  it("rejects client-supplied tenant identity even when it matches", async () => {
    const api = services(authorized);
    const result = await handleCreateStateFranchise(
      post("/api/franchise/hierarchy/states", stateBody({ tenantId: "tenant-1" })), api,
    );
    expect(result.status).toBe(400);
    expect(api.createState).not.toHaveBeenCalled();
  });

  it("derives tenant identity from authorization context", async () => {
    const api = services(authorized);
    await handleListStateFranchises(get(), api);
    expect(api.listStates).toHaveBeenCalledWith("tenant-1");
  });
});

describe("FH-4C State Franchise handlers", () => {
  it("lists and projects State assignments", async () => {
    const result = await handleListStateFranchises(get(), services(authorized));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ stateFranchises: [{ id: stateFranchiseId, displayName: "Gujarat" }] });
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 404 for a cross-tenant hidden State assignment", async () => {
    const api = services(authorized);
    vi.mocked(api.getState).mockResolvedValue(null);
    expect((await handleGetStateFranchise(get(), api, stateFranchiseId)).status).toBe(404);
  });

  it("creates a State assignment with parsed dates and server tenant", async () => {
    const api = services(authorized);
    const result = await handleCreateStateFranchise(post("/api/franchise/hierarchy/states", stateBody()), api);
    expect(result.status).toBe(201);
    expect(api.createState).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      tenantId: "tenant-1", effectiveFrom: new Date(timestamp),
    }));
  });

  it("rejects malformed timestamps and unsupported fields", async () => {
    const api = services(authorized);
    expect((await handleCreateStateFranchise(post("", stateBody({ effectiveFrom: "01/01/2026" })), api)).status).toBe(400);
    expect((await handleCreateStateFranchise(post("", stateBody({ currentCityFranchiseId: cityFranchiseId })), api)).status).toBe(400);
  });

  it("updates drafts and exposes lifecycle actions", async () => {
    const api = services(authorized);
    expect((await handleUpdateStateFranchise(post("", stateBody()), api, stateFranchiseId)).status).toBe(200);
    expect((await handleActivateStateFranchise(post("", {}), api, stateFranchiseId)).status).toBe(200);
    expect((await handleEndStateFranchise(post("", { effectiveTo: timestamp }), api, stateFranchiseId)).status).toBe(200);
  });

  it("maps active-child domain errors to a safe conflict", async () => {
    const api = services(authorized);
    vi.mocked(api.endState).mockRejectedValue(new FranchiseHierarchyError("ACTIVE_CHILDREN", "Resolve active children first."));
    const result = await handleEndStateFranchise(post("", { effectiveTo: timestamp }), api, stateFranchiseId);
    expect(result.status).toBe(409);
    expect(await result.json()).toEqual({ error: { code: "ACTIVE_CHILDREN", message: "Resolve active children first." } });
  });
});

describe("FH-4C City Franchise handlers", () => {
  it("supports parent-filtered lists", async () => {
    const api = services(authorized);
    await handleListCityFranchises(get(`/api/franchise/hierarchy/cities?stateFranchiseId=${stateFranchiseId}`), api);
    expect(api.listCities).toHaveBeenCalledWith("tenant-1", stateFranchiseId);
  });

  it("creates and updates City assignments with embedded coverage", async () => {
    const api = services(authorized);
    expect((await handleCreateCityFranchise(post("", cityBody()), api)).status).toBe(201);
    expect((await handleUpdateCityFranchise(post("", cityBody()), api, cityFranchiseId)).status).toBe(200);
    expect(api.createCity).toHaveBeenCalledWith("tenant-1", expect.objectContaining({
      areas: [{ name: "West", pincodeIds: [outletId] }],
    }));
  });

  it("preserves multiple same-city assignments", async () => {
    const api = services(authorized);
    await handleCreateCityFranchise(post("", cityBody({ areaCode: "SURAT-W" })), api);
    await handleCreateCityFranchise(post("", cityBody({ areaCode: "SURAT-E" })), api);
    expect(api.createCity).toHaveBeenCalledTimes(2);
  });

  it("maps coverage overlap and invalid parent errors safely", async () => {
    const api = services(authorized);
    vi.mocked(api.activateCity).mockRejectedValueOnce(new FranchiseHierarchyError("COVERAGE_OVERLAP", "Coverage overlaps."));
    expect((await handleActivateCityFranchise(post("", {}), api, cityFranchiseId)).status).toBe(409);
    vi.mocked(api.createCity).mockRejectedValueOnce(new FranchiseHierarchyError("INVALID_PARENT", "Invalid parent."));
    expect((await handleCreateCityFranchise(post("", cityBody()), api)).status).toBe(400);
  });

  it("supports get, activate, and end", async () => {
    const api = services(authorized);
    expect((await handleGetCityFranchise(get(), api, cityFranchiseId)).status).toBe(200);
    expect((await handleActivateCityFranchise(post("", {}), api, cityFranchiseId)).status).toBe(200);
    expect((await handleEndCityFranchise(post("", { effectiveTo: timestamp }), api, cityFranchiseId)).status).toBe(200);
  });
});

describe("FH-4C Outlet assignment handlers", () => {
  it("assigns and reassigns only through the history service", async () => {
    const api = services(authorized);
    const payload = { cityFranchiseId, effectiveFrom: timestamp, transferReference: "approved" };
    expect((await handleAssignOutlet(post("", payload), api, outletId)).status).toBe(201);
    expect((await handleReassignOutlet(post("", payload), api, outletId)).status).toBe(200);
    expect(api.assignOutlet).toHaveBeenCalledWith("tenant-1", outletId, expect.objectContaining({ cityFranchiseId }));
    expect(api.reassignOutlet).toHaveBeenCalled();
  });

  it("returns current assignment and complete history", async () => {
    const api = services(authorized);
    expect((await handleGetCurrentOutletAssignment(get(`/x?at=${encodeURIComponent(timestamp)}`), api, outletId)).status).toBe(200);
    expect((await handleListOutletAssignments(get(), api, outletId)).status).toBe(200);
  });

  it("accepts PostgreSQL UUID outlet IDs that are not RFC version UUIDs", async () => {
    const api = services(authorized);
    expect((await handleGetCurrentOutletAssignment(get(), api, legacyOutletId)).status).toBe(200);
    expect(api.getCurrentAssignment).toHaveBeenCalledWith("tenant-1", legacyOutletId, undefined);
  });

  it("still rejects malformed outlet IDs before calling the service", async () => {
    const api = services(authorized);
    const result = await handleGetCurrentOutletAssignment(get(), api, "not-an-outlet-id");
    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ error: { code: "INVALID_REQUEST", message: "Invalid Outlet ID." } });
    expect(api.getCurrentAssignment).not.toHaveBeenCalled();
  });

  it("lets correctly formatted unknown outlet IDs reach the domain layer", async () => {
    const api = services(authorized);
    vi.mocked(api.getCurrentAssignment).mockRejectedValueOnce(new FranchiseHierarchyError("NOT_FOUND", "Outlet was not found."));
    const result = await handleGetCurrentOutletAssignment(get(), api, legacyOutletId);
    expect(result.status).toBe(404);
    expect(api.getCurrentAssignment).toHaveBeenCalledWith("tenant-1", legacyOutletId, undefined);
  });

  it("maps cross-tenant and overlap errors without leaking internals", async () => {
    const api = services(authorized);
    vi.mocked(api.assignOutlet).mockRejectedValueOnce(new FranchiseHierarchyError("NOT_FOUND", "Outlet was not found."));
    expect((await handleAssignOutlet(post("", { cityFranchiseId, effectiveFrom: timestamp }), api, outletId)).status).toBe(404);
    vi.mocked(api.reassignOutlet).mockRejectedValueOnce(new FranchiseHierarchyError("ASSIGNMENT_OVERLAP", "Assignment overlaps."));
    expect((await handleReassignOutlet(post("", { cityFranchiseId, effectiveFrom: timestamp }), api, outletId)).status).toBe(409);
    vi.mocked(api.assignOutlet).mockRejectedValueOnce(new FranchiseHierarchyError("CONCURRENT_WRITE", "Concurrent hierarchy change."));
    expect((await handleAssignOutlet(post("", { cityFranchiseId, effectiveFrom: timestamp }), api, outletId)).status).toBe(409);
  });

  it("resolves hierarchy at an explicit timestamp", async () => {
    const api = services(authorized);
    const result = await handleResolveOutletHierarchy(
      get(`/api/franchise/hierarchy/outlets/${outletId}/resolve?timestamp=${encodeURIComponent(timestamp)}`),
      api, outletId,
    );
    expect(result.status).toBe(200);
    expect(api.resolveOutlet).toHaveBeenCalledWith("tenant-1", outletId, new Date(timestamp));
  });

  it("rejects direct current pointer input", async () => {
    const api = services(authorized);
    const result = await handleAssignOutlet(post("", {
      cityFranchiseId, effectiveFrom: timestamp, currentCityFranchiseId: cityFranchiseId,
    }), api, outletId);
    expect(result.status).toBe(400);
    expect(api.assignOutlet).not.toHaveBeenCalled();
  });
});
