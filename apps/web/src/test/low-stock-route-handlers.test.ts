import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleGetLowStockItems,
  type LowStockAuthorization,
  type LowStockRouteServices,
} from "../lib/crm/low-stock-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/low-stock", {
    method: "GET",
  });
}

function createServices(authorization: LowStockAuthorization): LowStockRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listLowStockItems: vi.fn().mockResolvedValue([
      { stockItemId: "si-1", productId: "p1", branchId: "b1", quantity: 3, minQuantity: 10, reorderQuantity: 50 },
    ]),
  };
}

describe("low-stock route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetLowStockItems(request(), services)).status).toBe(401);
    expect(services.listLowStockItems).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGetLowStockItems(request(), services)).status).toBe(403);
    expect(services.listLowStockItems).not.toHaveBeenCalled();
  });
});

describe("low-stock route handlers: authorized access", () => {
  it("passes 'reorderRule.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleGetLowStockItems(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("reorderRule.read");
  });

  it("returns 200 with low-stock items scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetLowStockItems(request(), services);
    expect(result.status).toBe(200);
    expect(services.listLowStockItems).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the low-stock items in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetLowStockItems(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { lowStockItems: unknown };
    expect(body.lowStockItems).toMatchObject([
      { stockItemId: "si-1", productId: "p1", branchId: "b1", quantity: 3, minQuantity: 10, reorderQuantity: 50 },
    ]);
  });
});

describe("low-stock route handlers: runtime authorization", () => {
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
    const { createLowStockRouteServices } = await import("../lib/crm/low-stock-runtime");
    const services = createLowStockRouteServices();
    expect(await services.authorize("reorderRule.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createLowStockRouteServices } = await import("../lib/crm/low-stock-runtime");
    const services = createLowStockRouteServices();
    expect(await services.authorize("reorderRule.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "reorderRule.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createLowStockRouteServices } = await import("../lib/crm/low-stock-runtime");
    const services = createLowStockRouteServices();
    expect(await services.authorize("reorderRule.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });
});
