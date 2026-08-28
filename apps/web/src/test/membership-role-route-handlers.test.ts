import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleAssignRole,
  handleRemoveRole,
  type MembershipRoleAuthorization,
  type MembershipRoleRouteServices,
} from "../lib/crm/membership-role-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function createServices(authorization: MembershipRoleAuthorization): MembershipRoleRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    assignRole: vi.fn().mockResolvedValue({ id: "assign-1" }),
    removeRole: vi.fn().mockResolvedValue(true),
  };
}

describe("membership-role route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const assignRequest = new Request("https://builder.lwill.in/api/membership-roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: "m-1", roleId: "r-1", scope: { kind: "tenant" } }),
    });
    const removeRequest = new Request("https://builder.lwill.in/api/membership-roles", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignmentId: "assign-1", scope: { kind: "tenant" } }),
    });
    expect((await handleAssignRole(assignRequest, services)).status).toBe(401);
    expect((await handleRemoveRole(removeRequest, services)).status).toBe(401);
    expect(services.assignRole).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    const assignRequest = new Request("https://builder.lwill.in/api/membership-roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: "m-1", roleId: "r-1", scope: { kind: "tenant" } }),
    });
    expect((await handleAssignRole(assignRequest, services)).status).toBe(403);
    expect(services.assignRole).not.toHaveBeenCalled();
  });
});

describe("membership-role route handlers: permission code forwarding", () => {
  it("passes 'tenant.manage' to authorize for all operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const assignRequest = new Request("https://builder.lwill.in/api/membership-roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipId: "m-1", roleId: "r-1", scope: { kind: "tenant" } }),
    });
    const removeRequest = new Request("https://builder.lwill.in/api/membership-roles", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignmentId: "assign-1", scope: { kind: "tenant" } }),
    });
    await handleAssignRole(assignRequest, services);
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");
    expect(services.assignRole).toHaveBeenCalledWith("tenant-1", expect.anything(), "user-1");

    await handleRemoveRole(removeRequest, services);
    expect(services.authorize).toHaveBeenCalledWith("tenant.manage");
    expect(services.removeRole).toHaveBeenCalledWith("tenant-1", expect.anything(), "user-1");
  });
});

describe("membership-role-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createMembershipRoleRouteServices } = await import("../lib/crm/membership-role-runtime");
    const services = createMembershipRoleRouteServices();
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
    const { createMembershipRoleRouteServices } = await import("../lib/crm/membership-role-runtime");
    const services = createMembershipRoleRouteServices();
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
    const { createMembershipRoleRouteServices } = await import("../lib/crm/membership-role-runtime");
    const services = createMembershipRoleRouteServices();
    expect(await services.authorize("tenant.manage")).toEqual({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
  });
});
