import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreatePackage,
  handleGetPackage,
  handleListPackages,
  handleUpdatePackage,
  type PackageAuthorization,
  type PackageRouteServices,
} from "../lib/crm/package-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/packages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: PackageAuthorization): PackageRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listPackages: vi.fn().mockResolvedValue([{ id: "pkg-1" }]),
    getPackage: vi.fn().mockResolvedValue({ id: "pkg-1" }),
    createPackage: vi.fn().mockResolvedValue({ id: "pkg-1" }),
    updatePackage: vi.fn().mockResolvedValue({ id: "pkg-1" }),
  };
}

describe("package route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListPackages(request(), services)).status).toBe(401);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"] }), services)).status).toBe(401);
    expect((await handleGetPackage(request(), services, "p1")).status).toBe(401);
    expect((await handleUpdatePackage(request({ name: "Glow Facial" }), services, "p1")).status).toBe(401);
    expect(services.listPackages).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListPackages(request(), services)).status).toBe(403);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"] }), services)).status).toBe(403);
    expect(services.createPackage).not.toHaveBeenCalled();
  });
});

describe("package route handlers: permission code forwarding", () => {
  it("passes 'package.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListPackages(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("package.read");

    await handleGetPackage(request(), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("package.read");
  });

  it("passes 'package.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"] }), services);
    expect(services.authorize).toHaveBeenCalledWith("package.write");

    await handleUpdatePackage(request({ name: "Glow Facial" }), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("package.write");
  });
});

describe("package-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({ outcome: "forbidden" });
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "package.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });

  it("returns 'forbidden' when the grant exists for a different permission code", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "package.write", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the grant exists for a different tenant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "package.read", scope: { kind: "tenant", tenantId: "tenant-2" } },
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({ outcome: "forbidden" });
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
    const { createPackageRouteServices } = await import("../lib/crm/package-runtime");
    const services = createPackageRouteServices();
    expect(await services.authorize("package.read")).toEqual({ outcome: "forbidden" });
  });
});

describe("package route handlers: authorized operations", () => {
  const authorized: PackageAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing package data", async () => {
    const services = createServices(authorized);
    await handleListPackages(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("package.read");
    await handleGetPackage(request(), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("package.read");
    await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"] }), services);
    expect(services.authorize).toHaveBeenCalledWith("package.write");
    await handleUpdatePackage(request({ name: "Glow Facial" }), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("package.write");
  });

  it("lists packages scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListPackages(request(), services);
    expect(result.status).toBe(200);
    expect(services.listPackages).toHaveBeenCalledWith("tenant-1");
  });

  it("creates a package using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreatePackage(
      request({ name: "Glow Facial", serviceIds: ["svc-1"], priceCents: 12000, tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400); // unknown key "tenantId" is rejected outright
    expect(services.createPackage).not.toHaveBeenCalled();

    const validResult = await handleCreatePackage(
      request({ name: "Glow Facial", serviceIds: ["svc-1"], priceCents: 12000 }),
      services,
    );
    expect(validResult.status).toBe(201);
    expect(services.createPackage).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ name: "Glow Facial", serviceIds: ["svc-1"], priceCents: 12000 }),
    );
  });

  it("rejects create with a missing or blank name", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePackage(request({ serviceIds: ["svc-1"] }), services)).status).toBe(400);
    expect((await handleCreatePackage(request({ name: "  ", serviceIds: ["svc-1"] }), services)).status).toBe(400);
  });

  it("rejects create with missing serviceIds", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePackage(request({ name: "Glow Facial" }), services)).status).toBe(400);
  });

  it("accepts create with empty serviceIds", async () => {
    const services = createServices(authorized);
    const result = await handleCreatePackage(
      request({ name: "Standalone Package", serviceIds: [] }),
      services,
    );
    expect(result.status).toBe(201);
  });

  it("rejects create with invalid serviceIds", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: "svc-1" }), services)).status).toBe(400);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: [123] }), services)).status).toBe(400);
  });

  it("rejects create with invalid priceCents", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"], priceCents: -1 }), services)).status).toBe(400);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"], priceCents: 1.5 }), services)).status).toBe(400);
  });

  it("rejects create with invalid durationDays", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"], durationDays: -1 }), services)).status).toBe(400);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"], durationDays: 1.5 }), services)).status).toBe(400);
  });

  it("rejects create with invalid isActive", async () => {
    const services = createServices(authorized);
    expect((await handleCreatePackage(request({ name: "Glow Facial", serviceIds: ["svc-1"], isActive: "yes" }), services)).status).toBe(400);
  });

  it("accepts create with priceCents and durationDays of zero", async () => {
    const services = createServices(authorized);
    const result = await handleCreatePackage(
      request({ name: "Free Package", serviceIds: ["svc-1"], priceCents: 0, durationDays: 0 }),
      services,
    );
    expect(result.status).toBe(201);
  });

  it("accepts create with null priceCents and null durationDays", async () => {
    const services = createServices(authorized);
    const result = await handleCreatePackage(
      request({ name: "Custom Package", serviceIds: ["svc-1"], priceCents: null, durationDays: null }),
      services,
    );
    expect(result.status).toBe(201);
  });

  it("returns 404 when the package does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getPackage).mockResolvedValue(null);
    expect((await handleGetPackage(request(), services, "missing")).status).toBe(404);
  });

  it("updates a package with valid fields and rejects unknown/invalid fields", async () => {
    const services = createServices(authorized);
    const okResult = await handleUpdatePackage(
      request({ name: "New Name", priceCents: 15000 }),
      services,
      "p1",
    );
    expect(okResult.status).toBe(200);
    expect(services.updatePackage).toHaveBeenCalledWith(
      "tenant-1", "p1", expect.objectContaining({ name: "New Name", priceCents: 15000 }),
    );

    expect((await handleUpdatePackage(request({ priceCents: -1 }), services, "p1")).status).toBe(400);
    expect((await handleUpdatePackage(request({}), services, "p1")).status).toBe(400);
    expect((await handleUpdatePackage(request({ tenantId: "attacker" }), services, "p1")).status).toBe(400);
  });

  it("returns 404 when updating a non-existent/cross-tenant package", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updatePackage).mockResolvedValue(null);
    expect((await handleUpdatePackage(request({ name: "X" }), services, "missing")).status).toBe(404);
  });
});
