import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleDeleteRole,
  handleGetRole,
  handleListRoles,
  handleUpdateRole,
  type RoleAuthorization,
  type RoleRouteServices,
} from "../lib/crm/role-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/roles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: RoleAuthorization): RoleRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listRoles: vi.fn().mockResolvedValue([{ id: "role-1" }]),
    getRole: vi.fn().mockResolvedValue({ id: "role-1" }),
    updateRole: vi.fn().mockResolvedValue({ id: "role-1" }),
    deleteRole: vi.fn().mockResolvedValue(true),
  };
}

describe("role route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListRoles(request(), services)).status).toBe(401);
    expect((await handleGetRole(request(), services, "r1")).status).toBe(401);
    expect((await handleUpdateRole(request({ name: "A" }), services, "r1")).status).toBe(401);
    expect((await handleDeleteRole(request(), services, "r1")).status).toBe(401);
    expect(services.listRoles).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListRoles(request(), services)).status).toBe(403);
    expect((await handleDeleteRole(request(), services, "r1")).status).toBe(403);
    expect(services.deleteRole).not.toHaveBeenCalled();
  });
});

describe("role route handlers: permission code forwarding", () => {
  it("passes 'tenant.manage' to authorize for all operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    await handleListRoles(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");

    await handleGetRole(request(), services, "r1");
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");

    await handleUpdateRole(request({ name: "A" }), services, "r1");
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");
    expect(services.updateRole).toHaveBeenCalledWith("tenant-1", "r1", expect.anything(), "user-1");

    await handleDeleteRole(request(), services, "r1");
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");
    expect(services.deleteRole).toHaveBeenCalledWith("tenant-1", "r1", "user-1");
  });
});

describe("role-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createRoleRouteServices } = await import("../lib/crm/role-runtime");
    const services = createRoleRouteServices();
    expect(await services.authorize("tenant.manage")).toEqual({ outcome: "unauthenticated" });
  });

  it("returns 'forbidden' when the session is authenticated but tenant context is null", async () => {
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return {
          authenticated: true,
          user: { userId: "user-1", externalAuthId: "ext-1", displayName: null, email: null },
          tenantContext: null,
          expiresAt: new Date(Date.now() + 3_600_000),
        } as never;
      },
    });
    const { createRoleRouteServices } = await import("../lib/crm/role-runtime");
    const services = createRoleRouteServices();
    expect(await services.authorize("tenant.manage")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId and userId when the grant exists", async () => {
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return {
          authenticated: true,
          user: { userId: "user-1", externalAuthId: "ext-1", displayName: null, email: null },
          tenantContext: { tenantId: "tenant-1", businessUnitId: null, branchId: null },
          expiresAt: new Date(Date.now() + 3_600_000),
        } as never;
      },
    });
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "tenant.manage", scope: { kind: "tenant", tenantId: "tenant-1" } },
    ]);
    const { createRoleRouteServices } = await import("../lib/crm/role-runtime");
    const services = createRoleRouteServices();
    expect(await services.authorize("tenant.manage")).toEqual({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
  });
});
