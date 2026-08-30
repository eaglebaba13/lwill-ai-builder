import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleListBranchPerformance,
  type BranchPerformanceAuthorization,
  type BranchPerformanceRouteServices,
} from "../lib/crm/branch-performance-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(): Request {
  return new Request("https://builder.lwill.in/api/reports/branch-performance", {
    method: "GET",
  });
}

function createServices(authorization: BranchPerformanceAuthorization): BranchPerformanceRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listBranchPerformance: vi.fn().mockResolvedValue([
      { branchId: "branch-1", branchName: "Main", staffCount: 5, attendanceCount: 12 },
    ]),
  };
}

describe("branch-performance route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListBranchPerformance(request(), services)).status).toBe(401);
    expect(services.listBranchPerformance).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListBranchPerformance(request(), services)).status).toBe(403);
    expect(services.listBranchPerformance).not.toHaveBeenCalled();
  });
});

describe("branch-performance route handlers: authorized access", () => {
  it("passes 'report.read' to authorize", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListBranchPerformance(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("report.read");
  });

  it("returns 200 with branch performance scoped to the authorized tenant", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListBranchPerformance(request(), services);
    expect(result.status).toBe(200);
    expect(services.listBranchPerformance).toHaveBeenCalledWith("tenant-1");
  });

  it("returns the branch performance in the response body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleListBranchPerformance(request(), services);
    expect(result.status).toBe(200);
    const body = (await result.json()) as { branchPerformance: unknown };
    expect(body.branchPerformance).toMatchObject([
      { branchId: "branch-1", branchName: "Main", staffCount: 5, attendanceCount: 12 },
    ]);
  });
});

describe("branch-performance route handlers: runtime authorization", () => {
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
    const { createBranchPerformanceRouteServices } = await import("../lib/crm/branch-performance-runtime");
    const services = createBranchPerformanceRouteServices();
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
    const { createBranchPerformanceRouteServices } = await import("../lib/crm/branch-performance-runtime");
    const services = createBranchPerformanceRouteServices();
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
    const { createBranchPerformanceRouteServices } = await import("../lib/crm/branch-performance-runtime");
    const services = createBranchPerformanceRouteServices();
    expect(await services.authorize("report.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });
});
