import { describe, expect, it, vi } from "vitest";
import {
  handleCreateStockAdjustment,
  handleGetStockAdjustment,
  handleListStockAdjustments,
  type StockAdjustmentAuthorization,
  type StockAdjustmentRouteServices,
} from "../lib/crm/stock-adjustment-route-handlers";

function request(method: string, body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/stock-adjustments", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: StockAdjustmentAuthorization): StockAdjustmentRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listStockAdjustments: vi.fn().mockResolvedValue([{ id: "adj-1" }]),
    getStockAdjustment: vi.fn().mockResolvedValue({ id: "adj-1" }),
    createStockAdjustment: vi.fn().mockResolvedValue({ id: "adj-1" }),
  };
}

describe("stock adjustment route handlers: permission code forwarding", () => {
  it("uses 'stockAdjustment.read' for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListStockAdjustments(request("GET"), services);
    expect(services.authorize).toHaveBeenCalledWith("stockAdjustment.read");

    await handleGetStockAdjustment(request("GET"), services, "adj-1");
    expect(services.authorize).toHaveBeenCalledWith("stockAdjustment.read");
  });

  it("uses 'stockAdjustment.write' for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateStockAdjustment(
      request("POST", { branchId: "b1", direction: "IN", items: [{ productId: "p1", quantity: 1 }] }),
      services,
    );
    expect(services.authorize).toHaveBeenCalledWith("stockAdjustment.write");
  });
});

describe("stock adjustment route handlers: auth gating", () => {
  it("returns 401 for unauthenticated callers on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListStockAdjustments(request("GET"), services)).status).toBe(401);
    expect((await handleGetStockAdjustment(request("GET"), services, "adj-1")).status).toBe(401);
    expect(
      (await handleCreateStockAdjustment(
        request("POST", { branchId: "b1", direction: "IN", items: [{ productId: "p1", quantity: 1 }] }),
        services,
      )).status,
    ).toBe(401);
    expect(services.listStockAdjustments).not.toHaveBeenCalled();
    expect(services.createStockAdjustment).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated callers without the grant", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListStockAdjustments(request("GET"), services)).status).toBe(403);
    expect(
      (await handleCreateStockAdjustment(
        request("POST", { branchId: "b1", direction: "IN", items: [{ productId: "p1", quantity: 1 }] }),
        services,
      )).status,
    ).toBe(403);
    expect(services.createStockAdjustment).not.toHaveBeenCalled();
  });
});

describe("stock adjustment route handlers: tenant isolation", () => {
  it("ignores client-supplied tenantId and uses server-derived tenantId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateStockAdjustment(
      request("POST", {
        branchId: "b1",
        direction: "IN",
        items: [{ productId: "p1", quantity: 1 }],
        tenantId: "attacker",
      }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createStockAdjustment).not.toHaveBeenCalled();
  });
});
