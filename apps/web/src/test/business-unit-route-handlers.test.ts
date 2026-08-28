import { describe, expect, it, vi } from "vitest";
import {
  handleCreateBusinessUnit,
  handleGetBusinessUnit,
  handleListBusinessUnits,
  handleUpdateBusinessUnit,
  type BusinessUnitAuthorization,
  type BusinessUnitRouteServices,
} from "../lib/crm/business-unit-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/business-units", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: BusinessUnitAuthorization): BusinessUnitRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listBusinessUnits: vi.fn().mockResolvedValue([{ id: "bu-1", name: "BU", slug: "bu", isActive: true }]),
    getBusinessUnit: vi.fn().mockResolvedValue({ id: "bu-1", name: "BU", slug: "bu", isActive: true }),
    createBusinessUnit: vi.fn().mockResolvedValue({ id: "bu-1", name: "BU", slug: "bu", isActive: true }),
    updateBusinessUnit: vi.fn().mockResolvedValue({ id: "bu-1", name: "BU", slug: "bu", isActive: true }),
  };
}

describe("business unit route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListBusinessUnits(request(), services)).status).toBe(401);
    expect(
      (await handleCreateBusinessUnit(request({ name: "BU", slug: "bu" }), services)).status,
    ).toBe(401);
    expect((await handleGetBusinessUnit(request(), services, "bu-1")).status).toBe(401);
    expect(
      (await handleUpdateBusinessUnit(request({ name: "BU" }), services, "bu-1")).status,
    ).toBe(401);
    expect(services.listBusinessUnits).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListBusinessUnits(request(), services)).status).toBe(403);
    expect(
      (await handleCreateBusinessUnit(request({ name: "BU", slug: "bu" }), services)).status,
    ).toBe(403);
    expect(services.createBusinessUnit).not.toHaveBeenCalled();
  });
});

describe("business unit route handlers: permission code forwarding", () => {
  it("passes 'business-unit.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListBusinessUnits(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("business-unit.read");

    await handleGetBusinessUnit(request(), services, "bu-1");
    expect(services.authorize).toHaveBeenCalledWith("business-unit.read");
  });

  it("passes 'business-unit.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateBusinessUnit(request({ name: "BU", slug: "bu" }), services);
    expect(services.authorize).toHaveBeenCalledWith("business-unit.write");

    await handleUpdateBusinessUnit(request({ name: "BU" }), services, "bu-1");
    expect(services.authorize).toHaveBeenCalledWith("business-unit.write");
  });
});

describe("business unit route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateBusinessUnit(request({}), services)).status).toBe(400);
    expect((await handleCreateBusinessUnit(request({ name: "", slug: "bu" }), services)).status).toBe(400);
    expect(
      (await handleCreateBusinessUnit(request({ name: "BU", slug: "bu", isActive: "yes" }), services)).status,
    ).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleCreateBusinessUnit(request({ name: "BU", slug: "bu", tenantId: "attacker" }), services)).status,
    ).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateBusinessUnit(request({}), services, "bu-1")).status).toBe(400);
    expect((await handleUpdateBusinessUnit(request({ name: "" }), services, "bu-1")).status).toBe(400);
  });

  it("rejects unknown keys in update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleUpdateBusinessUnit(request({ name: "BU", unknown: true }), services, "bu-1")).status,
    ).toBe(400);
  });
});

describe("business unit route handlers: successful operations", () => {
  it("creates business unit and returns 201", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleCreateBusinessUnit(
      request({ name: "BU", slug: "bu" }),
      services,
    );
    expect(response.status).toBe(201);
    expect(services.createBusinessUnit).toHaveBeenCalledWith("tenant-1", {
      name: "BU",
      slug: "bu",
      isActive: true,
    });
  });

  it("gets business unit and returns 200", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleGetBusinessUnit(request(), services, "bu-1");
    expect(response.status).toBe(200);
    expect(services.getBusinessUnit).toHaveBeenCalledWith("tenant-1", "bu-1");
  });

  it("updates business unit and returns 200", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleUpdateBusinessUnit(
      request({ name: "Updated" }),
      services,
      "bu-1",
    );
    expect(response.status).toBe(200);
    expect(services.updateBusinessUnit).toHaveBeenCalledWith("tenant-1", "bu-1", {
      name: "Updated",
    });
  });
});
