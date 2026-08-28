import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleGetUser,
  handleListUsers,
  handleUpdateUser,
  type UserAuthorization,
  type UserRouteServices,
} from "../lib/crm/user-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: UserAuthorization): UserRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listUsers: vi.fn().mockResolvedValue([{ id: "user-1" }]),
    getUser: vi.fn().mockResolvedValue({ id: "user-1" }),
    updateUser: vi.fn().mockResolvedValue({ id: "user-1" }),
  };
}

describe("user route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListUsers(request(), services)).status).toBe(401);
    expect((await handleGetUser(request(), services, "u1")).status).toBe(401);
    expect((await handleUpdateUser(request({ displayName: "A" }), services, "u1")).status).toBe(401);
    expect(services.listUsers).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListUsers(request(), services)).status).toBe(403);
    expect((await handleUpdateUser(request({ displayName: "A" }), services, "u1")).status).toBe(403);
    expect(services.updateUser).not.toHaveBeenCalled();
  });
});

describe("user route handlers: permission code forwarding", () => {
  it("passes 'tenant.manage' to authorize for all operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    await handleListUsers(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");

    await handleGetUser(request(), services, "u1");
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");

    await handleUpdateUser(request({ displayName: "A" }), services, "u1");
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");
    expect(services.updateUser).toHaveBeenCalledWith("tenant-1", "u1", expect.anything(), "user-1");
  });
});

describe("user-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createUserRouteServices } = await import("../lib/crm/user-runtime");
    const services = createUserRouteServices();
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
    const { createUserRouteServices } = await import("../lib/crm/user-runtime");
    const services = createUserRouteServices();
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
    const { createUserRouteServices } = await import("../lib/crm/user-runtime");
    const services = createUserRouteServices();
    expect(await services.authorize("tenant.manage")).toEqual({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
  });
});
