import { describe, expect, it, vi } from "vitest";
import {
  handleCreateStockItem,
  handleGetStockItem,
  handleListStockItems,
  handleUpdateStockItem,
  type StockItemAuthorization,
  type StockItemRouteServices,
} from "../lib/crm/stock-item-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/stock-items", {
    method: "GET",
  });
}

function createServices(authorization: StockItemAuthorization): StockItemRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listStockItems: vi.fn().mockResolvedValue([{ id: "stock-item-1" }]),
    getStockItem: vi.fn().mockResolvedValue({ id: "stock-item-1" }),
    createStockItem: vi.fn().mockResolvedValue({ id: "stock-item-1" }),
    updateStockItem: vi.fn().mockResolvedValue({ id: "stock-item-1" }),
  };
}

describe("stock-item route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListStockItems(request(), services)).status).toBe(401);
    expect((await handleGetStockItem(request(), services, "s1")).status).toBe(401);
    expect(services.listStockItems).not.toHaveBeenCalled();
    expect(services.getStockItem).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListStockItems(request(), services)).status).toBe(403);
    expect((await handleGetStockItem(request(), services, "s1")).status).toBe(403);
    expect(services.listStockItems).not.toHaveBeenCalled();
  });
});

describe("stock-item route handlers: permission code forwarding", () => {
  it("passes 'product.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListStockItems(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("product.read");

    await handleGetStockItem(request(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("product.read");
  });
});

describe("stock-item route handlers: authorized operations", () => {
  it("returns 200 with stock item list for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.listStockItems).mockResolvedValue([
      { id: "si-1", productId: "p1", quantity: 100 },
    ]);
    const result = await handleListStockItems(request(), services);
    expect(result.status).toBe(200);
    expect(services.listStockItems).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with stock item for authorized get", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetStockItem(request(), services, "si-1");
    expect(result.status).toBe(200);
  });

  it("returns 404 for non-existent or cross-tenant stock item", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getStockItem).mockResolvedValue(null);
    expect((await handleGetStockItem(request(), services, "missing")).status).toBe(404);
  });
});

describe("stock-item route handlers: create and update", () => {
  it("passes 'product.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateStockItem(
      new Request("https://builder.lwill.in/api/stock-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", quantity: 10 }),
      }),
      services,
    );
    expect(services.authorize).toHaveBeenCalledWith("product.write");

    await handleUpdateStockItem(
      new Request("https://builder.lwill.in/api/stock-items/si-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: 20 }),
      }),
      services,
      "si-1",
    );
    expect(services.authorize).toHaveBeenCalledWith("product.write");
  });

  it("returns 401 for an unauthenticated caller on create", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleCreateStockItem(
      new Request("https://builder.lwill.in/api/stock-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1" }),
      }),
      services,
    );
    expect(result.status).toBe(401);
    expect(services.createStockItem).not.toHaveBeenCalled();
  });

  it("returns 403 for an unauthorized caller on create", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleCreateStockItem(
      new Request("https://builder.lwill.in/api/stock-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1" }),
      }),
      services,
    );
    expect(result.status).toBe(403);
    expect(services.createStockItem).not.toHaveBeenCalled();
  });

  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleCreateStockItem(
        new Request("https://builder.lwill.in/api/stock-items", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }),
        services,
      )).status,
    ).toBe(400);
    expect(
      (await handleCreateStockItem(
        new Request("https://builder.lwill.in/api/stock-items", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: "", branchId: "b1" }),
        }),
        services,
      )).status,
    ).toBe(400);
  });

  it("returns 201 for a valid create request", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockItem).mockResolvedValue({ id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 10 });
    const result = await handleCreateStockItem(
      new Request("https://builder.lwill.in/api/stock-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", quantity: 10 }),
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createStockItem).toHaveBeenCalledWith("tenant-1", {
      productId: "p1",
      branchId: "b1",
      quantity: 10,
    });
  });

  it("returns 409 for a duplicate stock item", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockItem).mockRejectedValue(new Error("stock item already exists for this product and branch"));
    const result = await handleCreateStockItem(
      new Request("https://builder.lwill.in/api/stock-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1" }),
      }),
      services,
    );
    expect(result.status).toBe(409);
  });

  it("returns 404 when updating a non-existent stock item", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateStockItem).mockResolvedValue(null);
    const result = await handleUpdateStockItem(
      new Request("https://builder.lwill.in/api/stock-items/missing", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: 20 }),
      }),
      services,
      "missing",
    );
    expect(result.status).toBe(404);
  });

  it("returns 200 for a valid update request", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateStockItem).mockResolvedValue({ id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 20 });
    const result = await handleUpdateStockItem(
      new Request("https://builder.lwill.in/api/stock-items/si-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity: 20 }),
      }),
      services,
      "si-1",
    );
    expect(result.status).toBe(200);
    expect(services.updateStockItem).toHaveBeenCalledWith("tenant-1", "si-1", { quantity: 20 });
  });
});
