import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreateMembership,
  handleGetMembership,
  handleListMemberships,
  handleUpdateMembership,
  type MembershipAuthorization,
  type MembershipRouteServices,
} from "../lib/crm/membership-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/memberships", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: MembershipAuthorization): MembershipRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listMemberships: vi.fn().mockResolvedValue([{ id: "membership-1" }]),
    getMembership: vi.fn().mockResolvedValue({ id: "membership-1" }),
    createMembership: vi.fn().mockResolvedValue({ id: "membership-1" }),
    updateMembership: vi.fn().mockResolvedValue({ id: "membership-1" }),
  };
}

describe("membership route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListMemberships(request(), services)).status).toBe(401);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }), services)).status).toBe(401);
    expect((await handleGetMembership(request(), services, "m1")).status).toBe(401);
    expect(services.listMemberships).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListMemberships(request(), services)).status).toBe(403);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }), services)).status).toBe(403);
    expect(services.createMembership).not.toHaveBeenCalled();
  });
});

describe("membership route handlers: permission code forwarding", () => {
  it("passes 'membership.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListMemberships(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("membership.read");

    await handleGetMembership(request(), services, "m1");
    expect(services.authorize).toHaveBeenCalledWith("membership.read");
  });

  it("passes 'membership.write' to authorize for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }), services);
    expect(services.authorize).toHaveBeenCalledWith("membership.write");
  });
});

describe("membership-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the session is authenticated with a valid tenant context but no grants", async () => {
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "membership.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });

  it("returns 'forbidden' when the grant exists for a different permission code", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "membership.write", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the grant exists for a different tenant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "membership.read", scope: { kind: "tenant", tenantId: "tenant-2" } },
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({ outcome: "forbidden" });
  });

  it("fails closed when the grant loader throws", async () => {
    vi.mocked(loadPermissionGrants).mockRejectedValue(new Error("database unavailable"));
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
    const { createMembershipRouteServices } = await import("../lib/crm/membership-runtime");
    const services = createMembershipRouteServices();
    expect(await services.authorize("membership.read")).toEqual({ outcome: "forbidden" });
  });
});

describe("membership route handlers: authorized operations", () => {
  const authorized: MembershipAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing membership data", async () => {
    const services = createServices(authorized);
    await handleListMemberships(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("membership.read");
    await handleGetMembership(request(), services, "m1");
    expect(services.authorize).toHaveBeenCalledWith("membership.read");
    await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }), services);
    expect(services.authorize).toHaveBeenCalledWith("membership.write");
  });

  it("lists memberships scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListMemberships(request(), services);
    expect(result.status).toBe(200);
    expect(services.listMemberships).toHaveBeenCalledWith("tenant-1");
  });

  it("creates a membership using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreateMembership(
      request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z", tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createMembership).not.toHaveBeenCalled();

    const validResult = await handleCreateMembership(
      request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }),
      services,
    );
    expect(validResult.status).toBe(201);
    expect(services.createMembership).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ customerId: "cust-1", packageId: "pkg-1" }),
    );
  });

  it("rejects create with missing customerId or packageId", async () => {
    const services = createServices(authorized);
    expect((await handleCreateMembership(request({ packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }), services)).status).toBe(400);
    expect((await handleCreateMembership(request({ customerId: "cust-1", startedAt: "2026-08-12T00:00:00.000Z" }), services)).status).toBe(400);
    expect((await handleCreateMembership(request({ customerId: "", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z" }), services)).status).toBe(400);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "", startedAt: "2026-08-12T00:00:00.000Z" }), services)).status).toBe(400);
  });

  it("rejects create with invalid startedAt", async () => {
    const services = createServices(authorized);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "" }), services)).status).toBe(400);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "not-a-date" }), services)).status).toBe(400);
  });

  it("rejects create with invalid endsAt", async () => {
    const services = createServices(authorized);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z", endsAt: "not-a-date" }), services)).status).toBe(400);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z", endsAt: 123 }), services)).status).toBe(400);
  });

  it("rejects create with invalid status", async () => {
    const services = createServices(authorized);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z", status: 123 }), services)).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices(authorized);
    const result = await handleCreateMembership(
      request({
        customerId: "cust-1",
        packageId: "pkg-1",
        startedAt: "2026-08-12T00:00:00.000Z",
        endsAt: "2026-09-12T00:00:00.000Z",
        status: "active",
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createMembership).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        customerId: "cust-1",
        packageId: "pkg-1",
        startedAt: expect.any(Date),
        endsAt: expect.any(Date),
        status: "active",
      }),
    );
  });

  it("accepts create with null endsAt and null status", async () => {
    const services = createServices(authorized);
    const result = await handleCreateMembership(
      request({
        customerId: "cust-1",
        packageId: "pkg-1",
        startedAt: "2026-08-12T00:00:00.000Z",
        endsAt: null,
        status: null,
      }),
      services,
    );
    expect(result.status).toBe(201);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices(authorized);
    expect((await handleCreateMembership(request({ customerId: "cust-1", packageId: "pkg-1", startedAt: "2026-08-12T00:00:00.000Z", tenantId: "attacker" }), services)).status).toBe(400);
  });

  it("returns 404 when the membership does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getMembership).mockResolvedValue(null);
    expect((await handleGetMembership(request(), services, "missing")).status).toBe(404);
  });
});

describe("membership route handlers: update operations", () => {
  const authorized: MembershipAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleUpdateMembership(request({ status: "active" }), services, "m1")).status).toBe(401);
    expect(services.updateMembership).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleUpdateMembership(request({ status: "active" }), services, "m1")).status).toBe(403);
    expect(services.updateMembership).not.toHaveBeenCalled();
  });

  it("passes 'membership.write' to authorize for update", async () => {
    const services = createServices(authorized);
    await handleUpdateMembership(request({ status: "active" }), services, "m1");
    expect(services.authorize).toHaveBeenCalledWith("membership.write");
  });

  it("returns 400 for invalid JSON body", async () => {
    const services = createServices(authorized);
    const badRequest = new Request("https://builder.lwill.in/api/memberships/m1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    expect((await handleUpdateMembership(badRequest, services, "m1")).status).toBe(400);
  });

  it("rejects unknown keys in update input", async () => {
    const services = createServices(authorized);
    expect((await handleUpdateMembership(request({ status: "active", customerId: "cust-1" }), services, "m1")).status).toBe(400);
    expect((await handleUpdateMembership(request({ status: "active", tenantId: "attacker" }), services, "m1")).status).toBe(400);
  });

  it("returns 404 when the membership does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateMembership).mockResolvedValue(null);
    expect((await handleUpdateMembership(request({ status: "active" }), services, "missing")).status).toBe(404);
  });

  it("updates membership with valid partial fields", async () => {
    const services = createServices(authorized);
    const result = await handleUpdateMembership(
      request({ status: "active", endsAt: "2026-09-12T00:00:00.000Z" }),
      services,
      "m1",
    );
    expect(result.status).toBe(200);
    expect(services.updateMembership).toHaveBeenCalledWith(
      "tenant-1",
      "m1",
      expect.objectContaining({ status: "active", endsAt: expect.any(Date) }),
    );
  });

  it("accepts null status and null endsAt", async () => {
    const services = createServices(authorized);
    const result = await handleUpdateMembership(request({ status: null, endsAt: null }), services, "m1");
    expect(result.status).toBe(200);
  });

  it("rejects invalid endsAt date", async () => {
    const services = createServices(authorized);
    expect((await handleUpdateMembership(request({ endsAt: "not-a-date" }), services, "m1")).status).toBe(400);
  });

  it("rejects invalid status type", async () => {
    const services = createServices(authorized);
    expect((await handleUpdateMembership(request({ status: 123 }), services, "m1")).status).toBe(400);
  });
});
