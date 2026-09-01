import { describe, expect, it, vi } from "vitest";
import {
  handleCreateSupplier,
  handleGetSupplier,
  handleListSuppliers,
  handleUpdateSupplier,
  type SupplierAuthorization,
  type SupplierRouteServices,
} from "../lib/crm/supplier-route-handlers";

function request(method: string, body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/suppliers", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: SupplierAuthorization): SupplierRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listSuppliers: vi.fn().mockResolvedValue([{ id: "sup-1" }]),
    getSupplier: vi.fn().mockResolvedValue({ id: "sup-1" }),
    createSupplier: vi.fn().mockResolvedValue({ id: "sup-1" }),
    updateSupplier: vi.fn().mockResolvedValue({ id: "sup-1" }),
  };
}

describe("supplier route handlers: permission code forwarding", () => {
  it("uses 'supplier.read' for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListSuppliers(request("GET"), services);
    expect(services.authorize).toHaveBeenCalledWith("supplier.read");

    await handleGetSupplier(request("GET"), services, "sup-1");
    expect(services.authorize).toHaveBeenCalledWith("supplier.read");
  });

  it("uses 'supplier.write' for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateSupplier(request("POST", { name: "Acme" }), services);
    expect(services.authorize).toHaveBeenCalledWith("supplier.write");

    await handleUpdateSupplier(request("PATCH", { name: "Acme Inc" }), services, "sup-1");
    expect(services.authorize).toHaveBeenCalledWith("supplier.write");
  });
});

describe("supplier route handlers: auth gating", () => {
  it("returns 401 for unauthenticated callers on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListSuppliers(request("GET"), services)).status).toBe(401);
    expect((await handleGetSupplier(request("GET"), services, "sup-1")).status).toBe(401);
    expect((await handleCreateSupplier(request("POST", { name: "Acme" }), services)).status).toBe(401);
    expect((await handleUpdateSupplier(request("PATCH", { name: "X" }), services, "sup-1")).status).toBe(401);
    expect(services.listSuppliers).not.toHaveBeenCalled();
    expect(services.createSupplier).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated callers without the grant", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListSuppliers(request("GET"), services)).status).toBe(403);
    expect((await handleCreateSupplier(request("POST", { name: "Acme" }), services)).status).toBe(403);
    expect(services.createSupplier).not.toHaveBeenCalled();
  });
});

describe("supplier route handlers: tenant isolation", () => {
  it("ignores client-supplied tenantId and uses server-derived tenantId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateSupplier(
      request("POST", { name: "Acme", tenantId: "attacker" }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createSupplier).not.toHaveBeenCalled();
  });
});
