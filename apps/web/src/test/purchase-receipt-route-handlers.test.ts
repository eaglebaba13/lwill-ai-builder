import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreatePurchaseReceipt,
  handleGetPurchaseReceipt,
  handleListPurchaseReceipts,
  type PurchaseReceiptAuthorization,
  type PurchaseReceiptRouteServices,
} from "../lib/crm/purchase-receipt-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/purchase-receipts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: PurchaseReceiptAuthorization): PurchaseReceiptRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listPurchaseReceipts: vi.fn().mockResolvedValue([{ id: "receipt-1" }]),
    getPurchaseReceipt: vi.fn().mockResolvedValue({ id: "receipt-1" }),
    createPurchaseReceipt: vi.fn().mockResolvedValue({ id: "receipt-1" }),
  };
}

describe("purchase receipt route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListPurchaseReceipts(request(), services)).status).toBe(401);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: 1 }] }), services)).status).toBe(401);
    expect((await handleGetPurchaseReceipt(request(), services, "r1")).status).toBe(401);
    expect(services.listPurchaseReceipts).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListPurchaseReceipts(request(), services)).status).toBe(403);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: 1 }] }), services)).status).toBe(403);
    expect(services.createPurchaseReceipt).not.toHaveBeenCalled();
  });
});

describe("purchase receipt route handlers: permission code forwarding", () => {
  it("passes 'branch.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListPurchaseReceipts(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("branch.read");

    await handleGetPurchaseReceipt(request(), services, "r1");
    expect(services.authorize).toHaveBeenCalledWith("branch.read");
  });

  it("passes 'branch.write' to authorize for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: 1 }] }), services);
    expect(services.authorize).toHaveBeenCalledWith("branch.write");
  });
});

describe("purchase receipt route handlers: input validation", () => {
  const authorized: PurchaseReceiptAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("rejects create with missing required fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePurchaseReceipt(request({}), services)).status).toBe(400);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1" }), services)).status).toBe(400);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1" }), services)).status).toBe(400);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [] }), services)).status).toBe(400);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "", quantity: 1 }] }), services)).status).toBe(400);
  });

  it("rejects create with invalid item fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: 0 }] }), services)).status).toBe(400);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: -1 }] }), services)).status).toBe(400);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: 123, quantity: 1 }] }), services)).status).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePurchaseReceipt(request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: 1 }], tenantId: "attacker" }), services)).status).toBe(400);
  });

  it("accepts valid optional fields", async () => {
    const services = createServices(authorized);
    const result = await handleCreatePurchaseReceipt(
      request({
        supplierId: "supplier-1",
        warehouseId: "warehouse-1",
        branchId: "branch-1",
        receivedBy: "John",
        notes: "Received goods",
        items: [{ productId: "product-1", quantity: 10 }],
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createPurchaseReceipt).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        supplierId: "supplier-1",
        warehouseId: "warehouse-1",
        branchId: "branch-1",
        receivedBy: "John",
        notes: "Received goods",
        items: expect.arrayContaining([
          expect.objectContaining({ productId: "product-1", quantity: 10 }),
        ]),
      }),
    );
  });

  it("returns 404 when the purchase receipt does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getPurchaseReceipt).mockResolvedValue(null);
    expect((await handleGetPurchaseReceipt(request(), services, "missing")).status).toBe(404);
  });
});

describe("purchase receipt route handlers: tenant isolation", () => {
  it("ignores client-supplied tenantId and uses server-derived tenantId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreatePurchaseReceipt(
      request({ warehouseId: "w1", branchId: "b1", items: [{ productId: "p1", quantity: 1 }], tenantId: "attacker" }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createPurchaseReceipt).not.toHaveBeenCalled();
  });
});

describe("purchase receipt route handlers: runtime authorization", () => {
  beforeEach(() => {
    setAuthenticationProvider(null);
    vi.mocked(loadPermissionGrants).mockResolvedValue([]);
  });

  it("returns 'unauthenticated' when the session is not authenticated", async () => {
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return { authenticated: false } as never;
      },
    });
    const { createPurchaseReceiptRouteServices } = await import("../lib/crm/purchase-receipt-runtime");
    const services = createPurchaseReceiptRouteServices();
    expect(await services.authorize("purchaseReceipt.read")).toEqual({ outcome: "unauthenticated" });
  });

  it("returns 'forbidden' when the session is authenticated but tenant context is null", async () => {
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return {
          authenticated: true,
          user: { userId: "user-1", externalAuthId: "ext-1", displayName: null, email: null },
          tenantContext: null,
          expiresAt: new Date(Date.now() + 3_600_000),
          sessionId: "sess-1",
        } as never;
      },
    });
    const { createPurchaseReceiptRouteServices } = await import("../lib/crm/purchase-receipt-runtime");
    const services = createPurchaseReceiptRouteServices();
    expect(await services.authorize("purchaseReceipt.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "purchaseReceipt.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
    ]);
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return {
          authenticated: true,
          user: { userId: "user-1", externalAuthId: "ext-1", displayName: "Admin", email: "admin@test.com" },
          tenantContext: { tenantId: "tenant-1", businessUnitId: "bu-1", branchId: "branch-1" },
          expiresAt: new Date(Date.now() + 3_600_000),
          sessionId: "sess-1",
        } as never;
      },
    });
    const { createPurchaseReceiptRouteServices } = await import("../lib/crm/purchase-receipt-runtime");
    const services = createPurchaseReceiptRouteServices();
    expect(await services.authorize("purchaseReceipt.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });
});
