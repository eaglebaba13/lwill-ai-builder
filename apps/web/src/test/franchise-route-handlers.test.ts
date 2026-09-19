import { describe, expect, it, vi } from "vitest";
import {
  handleListTerritories,
  handleGetTerritory,
  handleListPartners,
  handleGetPartner,
  handleListAgreements,
  handleGetAgreement,
  handleListOutlets,
  handleGetOutlet,
  handleGetFranchiseDashboard,
  handleUpdateOutletOwnership,
  type FranchiseAuthorization,
  type FranchiseRouteServices,
} from "../lib/crm/franchise-route-handlers";

function request(url = "https://builder.lwill.in/api/franchise/territories") {
  return new Request(url, { method: "GET" });
}

function createServices(authorization: FranchiseAuthorization): FranchiseRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listTerritories: vi.fn().mockResolvedValue([]),
    getTerritory: vi.fn().mockResolvedValue({ id: "t1", name: "Surat" }),
    createTerritory: vi.fn().mockResolvedValue({ id: "t1" }),
    listPartners: vi.fn().mockResolvedValue([]),
    getPartner: vi.fn().mockResolvedValue({ id: "p1", name: "Kushwaha" }),
    createPartner: vi.fn().mockResolvedValue({ id: "p1" }),
    updatePartner: vi.fn().mockResolvedValue({ id: "p1", name: "Updated" }),
    listAgreements: vi.fn().mockResolvedValue([]),
    getAgreement: vi.fn().mockResolvedValue({ id: "a1" }),
    createAgreement: vi.fn().mockResolvedValue({ id: "a1" }),
    listOutlets: vi.fn().mockResolvedValue([]),
    getOutlet: vi.fn().mockResolvedValue({ id: "o1" }),
    createOutlet: vi.fn().mockResolvedValue({ id: "o1" }),
    updateOutletOwnership: vi.fn().mockResolvedValue({ id: "o1", ownershipMode: "COMPANY_OWNED", partnerId: null }),
    getDashboard: vi.fn().mockResolvedValue({ territories: [], partners: [], agreements: [], outlets: [], summary: { totalTerritories: 0, totalPartners: 0, totalAgreements: 0, totalOutlets: 0, activeOutlets: 0, inactiveOutlets: 0 } }),
  };
}

describe("franchise route handlers: authentication/authorization gating", () => {
  it("returns 401 for unauthenticated callers on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListTerritories(request(), services)).status).toBe(401);
    expect((await handleGetTerritory(request(), services, "t1")).status).toBe(401);
    expect((await handleListPartners(request(), services)).status).toBe(401);
    expect((await handleGetPartner(request(), services, "p1")).status).toBe(401);
    expect((await handleListAgreements(request(), services)).status).toBe(401);
    expect((await handleGetAgreement(request(), services, "a1")).status).toBe(401);
    expect((await handleListOutlets(request(), services)).status).toBe(401);
    expect((await handleGetOutlet(request(), services, "o1")).status).toBe(401);
    expect((await handleGetFranchiseDashboard(request(), services)).status).toBe(401);
    expect(services.listTerritories).not.toHaveBeenCalled();
    expect(services.listPartners).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated callers without the grant", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListTerritories(request(), services)).status).toBe(403);
    expect((await handleListPartners(request(), services)).status).toBe(403);
    expect((await handleListAgreements(request(), services)).status).toBe(403);
    expect((await handleListOutlets(request(), services)).status).toBe(403);
    expect((await handleGetFranchiseDashboard(request(), services)).status).toBe(403);
    expect(services.listTerritories).not.toHaveBeenCalled();
  });
});

describe("franchise route handlers: permission code forwarding", () => {
  it("uses 'franchise.read' for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    await handleListTerritories(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleGetTerritory(request(), services, "t1");
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleListPartners(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleGetPartner(request(), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleListAgreements(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleGetAgreement(request(), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleListOutlets(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleGetOutlet(request(), services, "o1");
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");

    await handleGetFranchiseDashboard(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("franchise.read");
  });
});

describe("franchise route handlers: tenant isolation", () => {
  it("returns 404 when territory belongs to a different tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    vi.mocked(services.getTerritory).mockResolvedValue(null);
    const result = await handleGetTerritory(request(), services, "t1");
    expect(result.status).toBe(404);
  });

  it("returns 404 when partner belongs to a different tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    vi.mocked(services.getPartner).mockResolvedValue(null);
    const result = await handleGetPartner(request(), services, "p1");
    expect(result.status).toBe(404);
  });

  it("returns 404 when agreement belongs to a different tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    vi.mocked(services.getAgreement).mockResolvedValue(null);
    const result = await handleGetAgreement(request(), services, "a1");
    expect(result.status).toBe(404);
  });

  it("returns 404 when outlet belongs to a different tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    vi.mocked(services.getOutlet).mockResolvedValue(null);
    const result = await handleGetOutlet(request(), services, "o1");
    expect(result.status).toBe(404);
  });
});

describe("franchise route handlers: authorized access", () => {
  it("returns 200 with territories list", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleListTerritories(request(), services);
    expect(result.status).toBe(200);
    expect(services.listTerritories).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with territory detail", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleGetTerritory(request(), services, "t1");
    expect(result.status).toBe(200);
    expect(services.getTerritory).toHaveBeenCalledWith("tenant-1", "t1");
  });

  it("returns 200 with partners list", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleListPartners(request(), services);
    expect(result.status).toBe(200);
    expect(services.listPartners).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with agreements list", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleListAgreements(request(), services);
    expect(result.status).toBe(200);
    expect(services.listAgreements).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with outlets list", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleListOutlets(request(), services);
    expect(result.status).toBe(200);
    expect(services.listOutlets).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with franchise dashboard", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleGetFranchiseDashboard(request(), services);
    expect(result.status).toBe(200);
    expect(services.getDashboard).toHaveBeenCalledWith("tenant-1");
  });
});


describe("franchise route handlers: outlet ownership PATCH", () => {
  function patchRequest(body: unknown) {
    return new Request("https://builder.lwill.in/api/franchise/outlets/o1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 for unauthenticated PATCH callers", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "COMPANY_OWNED", partnerId: null }), services, "o1");
    expect(result.status).toBe(401);
    expect(services.updateOutletOwnership).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated PATCH callers without franchise.write", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "COMPANY_OWNED", partnerId: null }), services, "o1");
    expect(result.status).toBe(403);
    expect(services.updateOutletOwnership).not.toHaveBeenCalled();
  });

  it("updates COMPANY_OWNED with null partnerId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "COMPANY_OWNED", partnerId: null }), services, "o1");
    expect(result.status).toBe(200);
    expect(services.authorize).toHaveBeenCalledWith("franchise.write");
    expect(services.updateOutletOwnership).toHaveBeenCalledWith("tenant-1", "o1", { ownershipMode: "COMPANY_OWNED", partnerId: null });
  });

  it("rejects COMPANY_OWNED with partnerId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "COMPANY_OWNED", partnerId: "partner-1" }), services, "o1");
    expect(result.status).toBe(400);
    expect(services.updateOutletOwnership).not.toHaveBeenCalled();
  });

  it("rejects UNDER_FRANCHISE_PARTNER without partnerId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "UNDER_FRANCHISE_PARTNER" }), services, "o1");
    expect(result.status).toBe(400);
    expect(services.updateOutletOwnership).not.toHaveBeenCalled();
  });

  it("returns 400 when service rejects cross-tenant or inactive partner", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    vi.mocked(services.updateOutletOwnership).mockRejectedValueOnce(new Error("Outlet Franchise Partner must exist, belong to the same tenant, and be active."));
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "UNDER_FRANCHISE_PARTNER", partnerId: "partner-2" }), services, "o1");
    expect(result.status).toBe(400);
    expect(services.updateOutletOwnership).toHaveBeenCalledWith("tenant-1", "o1", { ownershipMode: "UNDER_FRANCHISE_PARTNER", partnerId: "partner-2" });
  });

  it("returns 404 for nonexistent or cross-tenant outlet", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    vi.mocked(services.updateOutletOwnership).mockResolvedValueOnce(null);
    const result = await handleUpdateOutletOwnership(patchRequest({ ownershipMode: "COMPANY_OWNED", partnerId: null }), services, "missing");
    expect(result.status).toBe(404);
  });
});
