import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreateAttendance,
  handleGetAttendance,
  handleListAttendance,
  type AttendanceAuthorization,
  type AttendanceRouteServices,
} from "../lib/crm/attendance-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/attendance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: AttendanceAuthorization): AttendanceRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listAttendance: vi.fn().mockResolvedValue([{ id: "attendance-1" }]),
    getAttendance: vi.fn().mockResolvedValue({ id: "attendance-1" }),
    createAttendance: vi.fn().mockResolvedValue({ id: "attendance-1" }),
  };
}

describe("attendance route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListAttendance(request(), services)).status).toBe(401);
    expect((await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z" }), services)).status).toBe(401);
    expect((await handleGetAttendance(request(), services, "a1")).status).toBe(401);
    expect(services.listAttendance).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListAttendance(request(), services)).status).toBe(403);
    expect((await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z" }), services)).status).toBe(403);
    expect(services.createAttendance).not.toHaveBeenCalled();
  });
});

describe("attendance route handlers: permission code forwarding", () => {
  it("passes 'attendance.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListAttendance(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("attendance.read");

    await handleGetAttendance(request(), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("attendance.read");
  });

  it("passes 'attendance.write' to authorize for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z" }), services);
    expect(services.authorize).toHaveBeenCalledWith("attendance.write");
  });
});

describe("attendance-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({ outcome: "forbidden" });
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "attendance.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });

  it("returns 'forbidden' when the grant exists for a different permission code", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "attendance.write", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the grant exists for a different tenant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "attendance.read", scope: { kind: "tenant", tenantId: "tenant-2" } },
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({ outcome: "forbidden" });
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
    const { createAttendanceRouteServices } = await import("../lib/crm/attendance-runtime");
    const services = createAttendanceRouteServices();
    expect(await services.authorize("attendance.read")).toEqual({ outcome: "forbidden" });
  });
});

describe("attendance route handlers: authorized operations", () => {
  const authorized: AttendanceAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing attendance data", async () => {
    const services = createServices(authorized);
    await handleListAttendance(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("attendance.read");
    await handleGetAttendance(request(), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("attendance.read");
    await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z" }), services);
    expect(services.authorize).toHaveBeenCalledWith("attendance.write");
  });

  it("lists attendance scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListAttendance(request(), services);
    expect(result.status).toBe(200);
    expect(services.listAttendance).toHaveBeenCalledWith("tenant-1");
  });

  it("creates attendance using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreateAttendance(
      request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z", tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createAttendance).not.toHaveBeenCalled();

    const validResult = await handleCreateAttendance(
      request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z" }),
      services,
    );
    expect(validResult.status).toBe(201);
    expect(services.createAttendance).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ staffId: "staff-1" }),
    );
  });

  it("rejects create with missing staffId or checkInAt", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttendance(request({ checkInAt: "2026-08-12T09:00:00.000Z" }), services)).status).toBe(400);
    expect((await handleCreateAttendance(request({ staffId: "staff-1" }), services)).status).toBe(400);
    expect((await handleCreateAttendance(request({ staffId: "", checkInAt: "2026-08-12T09:00:00.000Z" }), services)).status).toBe(400);
  });

  it("rejects create with invalid checkInAt", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "" }), services)).status).toBe(400);
    expect((await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "not-a-date" }), services)).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices(authorized);
    const result = await handleCreateAttendance(
      request({
        staffId: "staff-1",
        checkInAt: "2026-08-12T09:00:00.000Z",
        checkOutAt: "2026-08-12T17:00:00.000Z",
        status: "present",
        notes: "Arrived on time",
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createAttendance).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        staffId: "staff-1",
        checkInAt: expect.any(Date),
        checkOutAt: expect.any(Date),
        status: "present",
        notes: "Arrived on time",
      }),
    );
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices(authorized);
    expect((await handleCreateAttendance(request({ staffId: "staff-1", checkInAt: "2026-08-12T09:00:00.000Z", tenantId: "attacker" }), services)).status).toBe(400);
  });

  it("returns 404 when the attendance does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getAttendance).mockResolvedValue(null);
    expect((await handleGetAttendance(request(), services, "missing")).status).toBe(404);
  });
});
