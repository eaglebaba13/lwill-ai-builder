import { describe, expect, it, vi } from "vitest";
import { toEffectiveTimestamp } from "../components/xnail/hierarchy-dashboard";
import {
  handleAssignOutlet,
  handleEndCityFranchise,
  handleReassignOutlet,
  type HierarchyAuthorization,
  type HierarchyRouteServices,
} from "../lib/crm/franchise-hierarchy-route-handlers";

const cityFranchiseId = "66666666-6666-4666-8666-666666666666";
const outletId = "44444444-4444-4444-8444-444444444444";
const dateOnly = "2026-09-24";

function services(auth: HierarchyAuthorization): HierarchyRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(auth),
    listStates: vi.fn().mockResolvedValue([]),
    getState: vi.fn().mockResolvedValue(null),
    createState: vi.fn().mockResolvedValue({ id: "state-1" }),
    updateState: vi.fn().mockResolvedValue({ id: "state-1" }),
    activateState: vi.fn().mockResolvedValue({ id: "state-1" }),
    endState: vi.fn().mockResolvedValue({ id: "state-1" }),
    listCities: vi.fn().mockResolvedValue([]),
    getCity: vi.fn().mockResolvedValue(null),
    createCity: vi.fn().mockResolvedValue({ id: "city-1" }),
    updateCity: vi.fn().mockResolvedValue({ id: "city-1" }),
    activateCity: vi.fn().mockResolvedValue({ id: "city-1" }),
    endCity: vi.fn().mockResolvedValue({ id: "city-1" }),
    assignOutlet: vi.fn().mockResolvedValue({ id: "assignment-1", outletProfileId: outletId, cityFranchiseId }),
    reassignOutlet: vi.fn().mockResolvedValue({ id: "assignment-2", outletProfileId: outletId, cityFranchiseId }),
    getCurrentAssignment: vi.fn().mockResolvedValue(null),
    listAssignmentHistory: vi.fn().mockResolvedValue([]),
    resolveOutlet: vi.fn().mockResolvedValue(null),
  };
}

const authorized: HierarchyAuthorization = { outcome: "authorized", tenantId: "tenant-1", userId: "user-1" };

function post(value: unknown) {
  return new Request("https://builder.lwill.in/api/franchise/hierarchy/outlets/x/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("hierarchy dashboard effective timestamps", () => {
  it("normalizes date-input values to an ISO date-time", () => {
    expect(toEffectiveTimestamp("2026-09-24")).toBe("2026-09-24T00:00:00.000Z");
  });

  it("passes explicit ISO timestamps through unchanged", () => {
    expect(toEffectiveTimestamp("2026-09-24T06:30:00.000Z")).toBe("2026-09-24T06:30:00.000Z");
  });

  it("passes invalid values through so server validation still reports them", () => {
    expect(toEffectiveTimestamp("not-a-date")).toBe("not-a-date");
    expect(toEffectiveTimestamp("")).toBe("");
  });

  it("makes the dashboard assignment payload acceptable to the hierarchy API", async () => {
    const rejected = services(authorized);
    const raw = await handleAssignOutlet(post({
      cityFranchiseId, effectiveFrom: dateOnly, effectiveTo: null,
    }), rejected, outletId);
    expect(raw.status).toBe(400);
    expect(rejected.assignOutlet).not.toHaveBeenCalled();

    const accepted = services(authorized);
    const normalized = await handleAssignOutlet(post({
      cityFranchiseId,
      effectiveFrom: toEffectiveTimestamp(dateOnly),
      effectiveTo: null,
    }), accepted, outletId);
    expect(normalized.status).toBe(201);
    expect(accepted.assignOutlet).toHaveBeenCalledWith("tenant-1", outletId, expect.objectContaining({
      effectiveFrom: new Date("2026-09-24T00:00:00.000Z"),
      effectiveTo: null,
    }));
  });

  it("makes the dashboard end-date payload acceptable to the hierarchy API", async () => {
    const rejected = services(authorized);
    const raw = await handleEndCityFranchise(post({ effectiveTo: dateOnly }), rejected, cityFranchiseId);
    expect(raw.status).toBe(400);
    expect(rejected.endCity).not.toHaveBeenCalled();

    const accepted = services(authorized);
    const normalized = await handleEndCityFranchise(
      post({ effectiveTo: toEffectiveTimestamp(dateOnly) }), accepted, cityFranchiseId,
    );
    expect(normalized.status).toBe(200);
    expect(accepted.endCity).toHaveBeenCalledWith("tenant-1", cityFranchiseId, new Date("2026-09-24T00:00:00.000Z"));
  });

  it("makes the dashboard reassignment payload acceptable to the hierarchy API", async () => {
    const rejected = services(authorized);
    const raw = await handleReassignOutlet(post({ cityFranchiseId, effectiveFrom: dateOnly }), rejected, outletId);
    expect(raw.status).toBe(400);
    expect(rejected.reassignOutlet).not.toHaveBeenCalled();

    const accepted = services(authorized);
    const normalized = await handleReassignOutlet(
      post({ cityFranchiseId, effectiveFrom: toEffectiveTimestamp(dateOnly) }), accepted, outletId,
    );
    expect(normalized.status).toBe(200);
    expect(accepted.reassignOutlet).toHaveBeenCalledWith("tenant-1", outletId, expect.objectContaining({
      effectiveFrom: new Date("2026-09-24T00:00:00.000Z"),
      cityFranchiseId,
    }));
  });
});
