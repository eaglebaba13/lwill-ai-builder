import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleListDailySales,
  type DailySalesAuthorization,
  type DailySalesRouteServices,
} from "../lib/crm/daily-sales-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/daily-sales", {
    method: "GET",
  });
}

function createServices(authorization: DailySalesAuthorization): DailySalesRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listDailySales: vi.fn().mockResolvedValue([
      { date: "2026-08-01", invoiceCount: 2, totalRevenueCents: 3000 },
    ]),
  };
}

describe("daily-sales route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListDailySales(request(), services)).status).toBe(401);
    expect(services.listDailySales).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListDailySales(request(), services)).status).toBe(403);
    expect(services.listDailySales).not.toHaveBeenCalled();
  });
});

describe("daily-sales route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListDailySales(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with daily sales scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListDailySales(request(), services);
    expect(result.status).toBe(200);
    expect(services.listDailySales).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the daily sales in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListDailySales(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { dailySales: unknown };
    expect(body.dailySales).toMatchObject([
      { date: "2026-08-01", invoiceCount: 2, totalRevenueCents: 3000 },
    ]);
  });
});

describe("daily-sales route handlers: runtime authorization", () => {
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
    const { createDailySalesRouteServices } = await import("../lib/crm/daily-sales-runtime");
    const services = createDailySalesRouteServices();
    expect(await services.authorize("report.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createDailySalesRouteServices } = await import("../lib/crm/daily-sales-runtime");
    const services = createDailySalesRouteServices();
    expect(await services.authorize("report.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "report.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createDailySalesRouteServices } = await import("../lib/crm/daily-sales-runtime");
    const services = createDailySalesRouteServices();
    expect(await services.authorize("report.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });
});
