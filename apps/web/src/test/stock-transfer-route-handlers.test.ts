import { describe, expect, it, vi } from "vitest";
import {
  handleCreateStockTransfer,
  handleGetStockTransfer,
  handleListStockTransfers,
  type StockTransferAuthorization,
  type StockTransferRouteServices,
} from "../lib/crm/stock-transfer-route-handlers";

function request(method: string, body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/stock-transfers", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: StockTransferAuthorization): StockTransferRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listStockTransfers: vi.fn().mockResolvedValue([{ id: "xfer-1" }]),
    getStockTransfer: vi.fn().mockResolvedValue({ id: "xfer-1" }),
    createStockTransfer: vi.fn().mockResolvedValue({ id: "xfer-1" }),
  };
}

describe("stock transfer route handlers: permission code forwarding", () => {
  it("uses 'stockTransfer.read' for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListStockTransfers(request("GET"), services);
    expect(services.authorize).toHaveBeenCalledWith("stockTransfer.read");

    await handleGetStockTransfer(request("GET"), services, "xfer-1");
    expect(services.authorize).toHaveBeenCalledWith("stockTransfer.read");
  });

  it("uses 'stockTransfer.write' for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateStockTransfer(
      request("POST", {
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
        fromBranchId: "b1",
        toBranchId: "b2",
        items: [{ productId: "p1", quantity: 1 }],
      }),
      services,
    );
    expect(services.authorize).toHaveBeenCalledWith("stockTransfer.write");
  });
});

describe("stock transfer route handlers: auth gating", () => {
  it("returns 401 for unauthenticated callers on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListStockTransfers(request("GET"), services)).status).toBe(401);
    expect((await handleGetStockTransfer(request("GET"), services, "xfer-1")).status).toBe(401);
    expect(
      (await handleCreateStockTransfer(
        request("POST", {
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          fromBranchId: "b1",
          toBranchId: "b2",
          items: [{ productId: "p1", quantity: 1 }],
        }),
        services,
      )).status,
    ).toBe(401);
    expect(services.listStockTransfers).not.toHaveBeenCalled();
    expect(services.createStockTransfer).not.toHaveBeenCalled();
  });

  it("returns 403 for authenticated callers without the grant", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListStockTransfers(request("GET"), services)).status).toBe(403);
    expect(
      (await handleCreateStockTransfer(
        request("POST", {
          fromWarehouseId: "w1",
          toWarehouseId: "w2",
          fromBranchId: "b1",
          toBranchId: "b2",
          items: [{ productId: "p1", quantity: 1 }],
        }),
        services,
      )).status,
    ).toBe(403);
    expect(services.createStockTransfer).not.toHaveBeenCalled();
  });
});

describe("stock transfer route handlers: tenant isolation", () => {
  it("ignores client-supplied tenantId and uses server-derived tenantId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateStockTransfer(
      request("POST", {
        fromWarehouseId: "w1",
        toWarehouseId: "w2",
        fromBranchId: "b1",
        toBranchId: "b2",
        items: [{ productId: "p1", quantity: 1 }],
        tenantId: "attacker",
      }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createStockTransfer).not.toHaveBeenCalled();
  });
});
