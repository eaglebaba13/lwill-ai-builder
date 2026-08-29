import { describe, expect, it, vi } from "vitest";
import {
  handleCreateStockMovement,
  handleGetStockMovement,
  handleListStockMovements,
  type StockMovementAuthorization,
  type StockMovementRouteServices,
} from "../lib/crm/stock-movement-route-handlers";

function request(): Request {
  return new Request("https://builder.lwill.in/api/stock-movements", {
    method: "GET",
  });
}

function createServices(authorization: StockMovementAuthorization): StockMovementRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listStockMovements: vi.fn().mockResolvedValue([{ id: "movement-1" }]),
    getStockMovement: vi.fn().mockResolvedValue({ id: "movement-1" }),
    createStockMovement: vi.fn().mockResolvedValue({ id: "stock-item-1" }),
  };
}

describe("stock-movement route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListStockMovements(request(), services)).status).toBe(401);
    expect((await handleGetStockMovement(request(), services, "m1")).status).toBe(401);
    expect(services.listStockMovements).not.toHaveBeenCalled();
    expect(services.getStockMovement).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListStockMovements(request(), services)).status).toBe(403);
    expect((await handleGetStockMovement(request(), services, "m1")).status).toBe(403);
    expect(services.listStockMovements).not.toHaveBeenCalled();
  });
});

describe("stock-movement route handlers: permission code forwarding", () => {
  it("passes 'product.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListStockMovements(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("product.read");

    await handleGetStockMovement(request(), services, "m1");
    expect(services.authorize).toHaveBeenCalledWith("product.read");
  });
});

describe("stock-movement route handlers: authorized operations", () => {
  it("returns 200 with movement list for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.listStockMovements).mockResolvedValue([
      { id: "sm-1", productId: "p1", movementType: "SALE", quantity: -5 },
    ]);
    const result = await handleListStockMovements(request(), services);
    expect(result.status).toBe(200);
    expect(services.listStockMovements).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with movement for authorized get", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetStockMovement(request(), services, "sm-1");
    expect(result.status).toBe(200);
  });

  it("returns 404 for non-existent or cross-tenant stock movement", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getStockMovement).mockResolvedValue(null);
    expect((await handleGetStockMovement(request(), services, "missing")).status).toBe(404);
  });
});

describe("stock-movement route handlers: create", () => {
  it("passes 'product.write' to authorize for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 5 }),
      }),
      services,
    );
    expect(services.authorize).toHaveBeenCalledWith("product.write");
  });

  it("returns 401 for an unauthenticated caller on create", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(401);
    expect(services.createStockMovement).not.toHaveBeenCalled();
  });

  it("returns 403 for an unauthorized caller on create", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(403);
    expect(services.createStockMovement).not.toHaveBeenCalled();
  });

  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleCreateStockMovement(
        new Request("https://builder.lwill.in/api/stock-movements", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }),
        services,
      )).status,
    ).toBe(400);
    expect(
      (await handleCreateStockMovement(
        new Request("https://builder.lwill.in/api/stock-movements", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 0 }),
        }),
        services,
      )).status,
    ).toBe(400);
  });

  it("returns 201 for a valid PURCHASE create request", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockMovement).mockResolvedValue({ id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 5 });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createStockMovement).toHaveBeenCalledWith("tenant-1", {
      productId: "p1",
      branchId: "b1",
      movementType: "PURCHASE",
      quantity: 5,
      referenceType: null,
      referenceId: null,
      notes: null,
      adjustmentDirection: null,
    });
  });

  it("returns 201 for a valid SALE create request", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockMovement).mockResolvedValue({ id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: -5 });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "SALE", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createStockMovement).toHaveBeenCalledWith("tenant-1", {
      productId: "p1",
      branchId: "b1",
      movementType: "SALE",
      quantity: 5,
      referenceType: null,
      referenceId: null,
      notes: null,
      adjustmentDirection: null,
    });
  });

  it("returns 201 for a valid ADJUSTMENT create request with direction", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockMovement).mockResolvedValue({ id: "si-1", tenantId: "tenant-1", productId: "p1", branchId: "b1", quantity: 3 });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "ADJUSTMENT", quantity: 3, adjustmentDirection: "IN" }),
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createStockMovement).toHaveBeenCalledWith("tenant-1", {
      productId: "p1",
      branchId: "b1",
      movementType: "ADJUSTMENT",
      quantity: 3,
      referenceType: null,
      referenceId: null,
      notes: null,
      adjustmentDirection: "IN",
    });
  });

  it("rejects unsupported movement types", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "TRANSFER", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createStockMovement).not.toHaveBeenCalled();
  });

  it("rejects ADJUSTMENT without adjustmentDirection", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "ADJUSTMENT", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createStockMovement).not.toHaveBeenCalled();
  });

  it("rejects adjustmentDirection on non-ADJUSTMENT types", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 5, adjustmentDirection: "IN" }),
      }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createStockMovement).not.toHaveBeenCalled();
  });

  it("returns 403 when service throws tenant validation error", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockMovement).mockRejectedValue(new Error("product must belong to the same tenant"));
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "PURCHASE", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(403);
  });

  it("returns 409 when service throws insufficient stock error", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.createStockMovement).mockRejectedValue(new Error("insufficient stock for this operation"));
    const result = await handleCreateStockMovement(
      new Request("https://builder.lwill.in/api/stock-movements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "p1", branchId: "b1", movementType: "SALE", quantity: 5 }),
      }),
      services,
    );
    expect(result.status).toBe(409);
  });
});
