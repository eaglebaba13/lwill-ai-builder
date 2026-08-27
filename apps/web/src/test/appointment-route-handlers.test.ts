import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreateAppointment,
  handleGetAppointment,
  handleListAppointments,
  handleUpdateAppointment,
  type AppointmentAuthorization,
  type AppointmentRouteServices,
} from "../lib/crm/appointment-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

const VALID_CREATE_INPUT = {
  customerId: "cust-1",
  serviceId: "svc-1",
  startsAt: "2026-09-01T10:00:00.000Z",
  endsAt: "2026-09-01T11:00:00.000Z",
  status: "scheduled",
  notes: "First visit",
};

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/appointments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: AppointmentAuthorization): AppointmentRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listAppointments: vi.fn().mockResolvedValue([{ id: "appointment-1" }]),
    getAppointment: vi.fn().mockResolvedValue({ id: "appointment-1" }),
    createAppointment: vi.fn().mockResolvedValue({ id: "appointment-1" }),
    updateAppointment: vi.fn().mockResolvedValue({ id: "appointment-1" }),
  };
}

describe("appointment route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListAppointments(request(), services)).status).toBe(401);
    expect(
      (
        await handleCreateAppointment(
          request(VALID_CREATE_INPUT),
          services,
        )
      ).status,
    ).toBe(401);
    expect((await handleGetAppointment(request(), services, "a1")).status).toBe(401);
    expect(
      (await handleUpdateAppointment(request({ status: "Completed" }), services, "a1")).status,
    ).toBe(401);
    expect(services.listAppointments).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListAppointments(request(), services)).status).toBe(403);
    expect(
      (await handleCreateAppointment(request(VALID_CREATE_INPUT), services)).status,
    ).toBe(403);
    expect(services.createAppointment).not.toHaveBeenCalled();
  });
});

describe("appointment route handlers: permission code forwarding", () => {
  it("passes 'appointment.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListAppointments(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("appointment.read");

    await handleGetAppointment(request(), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("appointment.read");
  });

  it("passes 'appointment.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateAppointment(request(VALID_CREATE_INPUT), services);
    expect(services.authorize).toHaveBeenCalledWith("appointment.write");

    await handleUpdateAppointment(request({ status: "Completed" }), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("appointment.write");
  });
});

describe("appointment-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({ outcome: "forbidden" });
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "appointment.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });

  it("returns 'forbidden' when the grant exists for a different permission code", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "appointment.write", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the grant exists for a different tenant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "appointment.read", scope: { kind: "tenant", tenantId: "tenant-2" } },
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({ outcome: "forbidden" });
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
    const { createAppointmentRouteServices } = await import("../lib/crm/appointment-runtime");
    const services = createAppointmentRouteServices();
    expect(await services.authorize("appointment.read")).toEqual({ outcome: "forbidden" });
  });
});

describe("appointment route handlers: authorized operations", () => {
  const authorized: AppointmentAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing appointment data", async () => {
    const services = createServices(authorized);
    await handleListAppointments(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("appointment.read");
    await handleGetAppointment(request(), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("appointment.read");
    await handleCreateAppointment(request(VALID_CREATE_INPUT), services);
    expect(services.authorize).toHaveBeenCalledWith("appointment.write");
    await handleUpdateAppointment(request({ status: "Completed" }), services, "a1");
    expect(services.authorize).toHaveBeenCalledWith("appointment.write");
  });

  it("lists appointments scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListAppointments(request(), services);
    expect(result.status).toBe(200);
    expect(services.listAppointments).toHaveBeenCalledWith("tenant-1");
  });

  it("creates an appointment using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreateAppointment(
      request({ ...VALID_CREATE_INPUT, tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400); // unknown key "tenantId" is rejected outright
    expect(services.createAppointment).not.toHaveBeenCalled();

    const validResult = await handleCreateAppointment(request(VALID_CREATE_INPUT), services);
    expect(validResult.status).toBe(201);
    expect(services.createAppointment).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        customerId: "cust-1",
        serviceId: "svc-1",
        status: "scheduled",
        notes: "First visit",
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
      }),
    );
  });

  it("rejects create with a missing or blank customerId", async () => {
    const services = createServices(authorized);
    expect(
      (await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, customerId: "" }), services)).status,
    ).toBe(400);
  });

  it("rejects create with a missing or blank serviceId", async () => {
    const services = createServices(authorized);
    expect(
      (await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, serviceId: "   " }), services)).status,
    ).toBe(400);
  });

  it("rejects create with an invalid startsAt date", async () => {
    const services = createServices(authorized);
    expect(
      (await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, startsAt: "not-a-date" }), services)).status,
    ).toBe(400);
    expect(
      (await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, startsAt: undefined }), services)).status,
    ).toBe(400);
  });

  it("rejects create with an invalid endsAt or endsAt not after startsAt", async () => {
    const services = createServices(authorized);
    expect(
      (
        await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, endsAt: "not-a-date" }), services)
      ).status,
    ).toBe(400);
    expect(
      (
        await handleCreateAppointment(
          request({ ...VALID_CREATE_INPUT, endsAt: "2026-09-01T09:00:00.000Z" }),
          services,
        )
      ).status,
    ).toBe(400);
    expect(
      (await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, endsAt: undefined }), services)).status,
    ).toBe(400);
  });

  it("rejects create with a missing or blank status", async () => {
    const services = createServices(authorized);
    expect(
      (await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, status: "" }), services)).status,
    ).toBe(400);
    expect(
      (
        await handleCreateAppointment(request({ ...VALID_CREATE_INPUT, status: undefined }), services)
      ).status,
    ).toBe(400);
  });

  it("accepts create with notes null and notes omitted", async () => {
    const services = createServices(authorized);
    const withNullNotes = await handleCreateAppointment(
      request({ ...VALID_CREATE_INPUT, notes: null }),
      services,
    );
    expect(withNullNotes.status).toBe(201);
    expect(services.createAppointment).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ notes: null }),
    );

    const withoutNotes = await handleCreateAppointment(
      request({
        customerId: "cust-1",
        serviceId: "svc-1",
        startsAt: "2026-09-01T10:00:00.000Z",
        endsAt: "2026-09-01T11:00:00.000Z",
        status: "scheduled",
      }),
      services,
    );
    expect(withoutNotes.status).toBe(201);
    expect(services.createAppointment).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ notes: null }),
    );
  });

  it("returns 404 when the appointment does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getAppointment).mockResolvedValue(null);
    expect((await handleGetAppointment(request(), services, "missing")).status).toBe(404);
  });

  it("updates an appointment with valid fields and rejects unknown/invalid fields", async () => {
    const services = createServices(authorized);
    const okResult = await handleUpdateAppointment(
      request({ status: "Completed", notes: "Done" }),
      services,
      "a1",
    );
    expect(okResult.status).toBe(200);
    expect(services.updateAppointment).toHaveBeenCalledWith(
      "tenant-1",
      "a1",
      expect.objectContaining({ status: "Completed", notes: "Done" }),
    );

    expect(
      (await handleUpdateAppointment(request({ endsAt: "bad" }), services, "a1")).status,
    ).toBe(400);
    expect((await handleUpdateAppointment(request({}), services, "a1")).status).toBe(400);
    expect(
      (await handleUpdateAppointment(request({ tenantId: "attacker" }), services, "a1")).status,
    ).toBe(400);
  });

  it("returns 404 when updating a non-existent/cross-tenant appointment", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateAppointment).mockResolvedValue(null);
    expect((await handleUpdateAppointment(request({ status: "Completed" }), services, "missing")).status).toBe(404);
  });
});
