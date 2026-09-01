import { describe, expect, it, vi } from "vitest";
import {
  handleCreateWarehouse,
  handleGetWarehouse,
  handleListWarehouses,
  handleUpdateWarehouse,
  type WarehouseAuthorization,
  type WarehouseRouteServices,
} from "../lib/crm/warehouse-route-handlers";

function request(method: string, body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/warehouses", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: WarehouseAuthorization): WarehouseRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listWarehouses: vi.fn().mockResolvedValue([{ id: "wh-1" }]),
    getWarehouse: vi.fn().mockResolvedValue({ id: "wh-1" }),
    createWarehouse: vi.fn().mockResolvedValue({ id: "wh-1" }),
    updateWarehouse: vi.fn().mockResolvedValue({ id: "wh-1" }),
  };
}

describe("warehouse route handlers: permission code forwarding", () => {
  it("uses 'warehouse.read' for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListWarehouses(request("GET"), services);
    expect(services.authorize).toHaveBeenCalledWith("warehouse.read");

    await handleGetWarehouse(request("GET"), services, "wh-1");
    expect(services.authorize).toHaveBeenCalledWith("warehouse.read");
  });

  it("uses 'warehouse.write' for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateWarehouse(request("POST", { name: "Main" }), services);
    expect(services.authorize).toHaveBeenCalledWith("warehouse.write");

    await handleUpdateWarehouse(request("PATCH", { name: "Main WH" }), services, "wh-1");
    expect(services.authorize).toHaveBeenCalledWith("warehouse.write");
  });
});

describe("warehouse route handlers: auth gating", () => {
  it("returns 401 for unauthenticated callers on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListWarehouses(request("GET"), services)).status).toBe(401);
    expect((await handleGetWarehouse(request("GET"), services, "wh-1")).status).toBe(401);
    expect((await handleCreateWarehouse(request("POST", { name: "Main" }), services)).status).toBe(401);
    expect((await handleUpdateWarehouse(request("PATCH", { name: "X" }), services, "wh-1")).status).toBe(401);
    expect(services.listWarehouses).not.toHaveBeenCalled();
    expect(services.createWarehouse).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated callers without the grant", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListWarehouses(request("GET"), services)).status).toBe(403);
    expect((await handleCreateWarehouse(request("POST", { name: "Main" }), services)).status).toBe(403);
    expect(services.createWarehouse).not.toHaveBeenCalled();
  });
});

describe("warehouse route handlers: tenant isolation", () => {
  it("ignores client-supplied tenantId and uses server-derived tenantId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateWarehouse(
      request("POST", { name: "Main", tenantId: "attacker" }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createWarehouse).not.toHaveBeenCalled();
  });
});
