import { describe, expect, it, vi } from "vitest";
import {
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
