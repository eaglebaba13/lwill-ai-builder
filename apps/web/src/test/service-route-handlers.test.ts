import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreateService,
  handleGetService,
  handleListServices,
  handleUpdateService,
  type ServiceAuthorization,
  type ServiceRouteServices,
} from "../lib/crm/service-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/services", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: ServiceAuthorization): ServiceRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listServices: vi.fn().mockResolvedValue([{ id: "service-1" }]),
    getService: vi.fn().mockResolvedValue({ id: "service-1" }),
    createService: vi.fn().mockResolvedValue({ id: "service-1" }),
    updateService: vi.fn().mockResolvedValue({ id: "service-1" }),
  };
}

describe("service route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListServices(request(), services)).status).toBe(401);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 30, priceCents: 1000 }), services)).status).toBe(401);
    expect((await handleGetService(request(), services, "s1")).status).toBe(401);
    expect((await handleUpdateService(request({ name: "A" }), services, "s1")).status).toBe(401);
    expect(services.listServices).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListServices(request(), services)).status).toBe(403);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 30, priceCents: 1000 }), services)).status).toBe(403);
    expect(services.createService).not.toHaveBeenCalled();
  });
});

describe("service route handlers: permission code forwarding", () => {
  it("passes 'service.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListServices(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("service.read");

    await handleGetService(request(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("service.read");
  });

  it("passes 'service.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateService(request({ name: "Manicure", durationMinutes: 45, priceCents: 1500 }), services);
    expect(services.authorize).toHaveBeenCalledWith("service.write");

    await handleUpdateService(request({ name: "Manicure" }), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("service.write");
  });
});

describe("service-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({ outcome: "forbidden" });
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "service.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });

  it("returns 'forbidden' when the grant exists for a different permission code", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "service.write", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the grant exists for a different tenant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "service.read", scope: { kind: "tenant", tenantId: "tenant-2" } },
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({ outcome: "forbidden" });
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
    const { createServiceRouteServices } = await import("../lib/crm/service-runtime");
    const services = createServiceRouteServices();
    expect(await services.authorize("service.read")).toEqual({ outcome: "forbidden" });
  });
});

describe("service route handlers: authorized operations", () => {
  const authorized: ServiceAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing service data", async () => {
    const services = createServices(authorized);
    await handleListServices(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("service.read");
    await handleGetService(request(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("service.read");
    await handleCreateService(request({ name: "Manicure", durationMinutes: 45, priceCents: 1500 }), services);
    expect(services.authorize).toHaveBeenCalledWith("service.write");
    await handleUpdateService(request({ name: "Manicure" }), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("service.write");
  });

  it("lists services scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListServices(request(), services);
    expect(result.status).toBe(200);
    expect(services.listServices).toHaveBeenCalledWith("tenant-1");
  });

  it("creates a service using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreateService(
      request({ name: "Manicure", durationMinutes: 45, priceCents: 1500, tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400); // unknown key "tenantId" is rejected outright
    expect(services.createService).not.toHaveBeenCalled();

    const validResult = await handleCreateService(
      request({ name: "Manicure", durationMinutes: 45, priceCents: 1500 }),
      services,
    );
    expect(validResult.status).toBe(201);
    expect(services.createService).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ name: "Manicure", durationMinutes: 45, priceCents: 1500 }),
    );
  });

  it("rejects create with a missing or blank name", async () => {
    const services = createServices(authorized);
    expect((await handleCreateService(request({ durationMinutes: 30, priceCents: 1000 }), services)).status).toBe(400);
    expect((await handleCreateService(request({ name: "  ", durationMinutes: 30, priceCents: 1000 }), services)).status).toBe(400);
  });

  it("rejects create with invalid durationMinutes", async () => {
    const services = createServices(authorized);
    expect((await handleCreateService(request({ name: "A", durationMinutes: -1, priceCents: 1000 }), services)).status).toBe(400);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 0, priceCents: 1000 }), services)).status).toBe(400);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 1.5, priceCents: 1000 }), services)).status).toBe(400);
    expect((await handleCreateService(request({ name: "A", priceCents: 1000 }), services)).status).toBe(400);
  });

  it("rejects create with invalid priceCents", async () => {
    const services = createServices(authorized);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 30, priceCents: -1 }), services)).status).toBe(400);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 30, priceCents: 1.5 }), services)).status).toBe(400);
    expect((await handleCreateService(request({ name: "A", durationMinutes: 30 }), services)).status).toBe(400);
  });

  it("accepts create with priceCents of zero", async () => {
    const services = createServices(authorized);
    const result = await handleCreateService(
      request({ name: "Free Service", durationMinutes: 30, priceCents: 0 }),
      services,
    );
    expect(result.status).toBe(201);
  });

  it("returns 404 when the service does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getService).mockResolvedValue(null);
    expect((await handleGetService(request(), services, "missing")).status).toBe(404);
  });

  it("updates a service with valid fields and rejects unknown/invalid fields", async () => {
    const services = createServices(authorized);
    const okResult = await handleUpdateService(
      request({ name: "New Name", priceCents: 2000 }),
      services,
      "s1",
    );
    expect(okResult.status).toBe(200);
    expect(services.updateService).toHaveBeenCalledWith(
      "tenant-1", "s1", expect.objectContaining({ name: "New Name", priceCents: 2000 }),
    );

    expect((await handleUpdateService(request({ durationMinutes: 0 }), services, "s1")).status).toBe(400);
    expect((await handleUpdateService(request({}), services, "s1")).status).toBe(400);
    expect((await handleUpdateService(request({ tenantId: "attacker" }), services, "s1")).status).toBe(400);
  });

  it("returns 404 when updating a non-existent/cross-tenant service", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateService).mockResolvedValue(null);
    expect((await handleUpdateService(request({ name: "X" }), services, "missing")).status).toBe(404);
  });
});
