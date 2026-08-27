import { describe, expect, it, vi } from "vitest";
import {
  handleCreateStaff,
  handleGetStaff,
  handleListStaff,
  handleUpdateStaff,
  type StaffAuthorization,
  type StaffRouteServices,
} from "../lib/crm/staff-route-handlers";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/staff", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createStaff(authorization: StaffAuthorization): StaffRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listStaff: vi.fn().mockResolvedValue([{ id: "staff-1", displayName: "Mina" }]),
    getStaff: vi.fn().mockResolvedValue({ id: "staff-1", displayName: "Mina" }),
    createStaff: vi.fn().mockResolvedValue({ id: "staff-1", displayName: "Mina" }),
    updateStaff: vi.fn().mockResolvedValue({ id: "staff-1", displayName: "Mina Updated" }),
  };
}

describe("staff route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createStaff({ outcome: "unauthenticated" });
    expect((await handleListStaff(request(), services)).status).toBe(401);
    expect((await handleCreateStaff(request({ displayName: "Mina" }), services)).status).toBe(401);
    expect((await handleGetStaff(request(), services, "s1")).status).toBe(401);
    expect((await handleUpdateStaff(request({ displayName: "Mina" }), services, "s1")).status).toBe(401);
    expect(services.listStaff).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createStaff({ outcome: "forbidden" });
    expect((await handleListStaff(request(), services)).status).toBe(403);
    expect((await handleCreateStaff(request({ displayName: "Mina" }), services)).status).toBe(403);
    expect(services.createStaff).not.toHaveBeenCalled();
  });
});

describe("staff route handlers: permission code forwarding", () => {
  it("passes 'staff.read' to authorize for list and get operations", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListStaff(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("staff.read");

    await handleGetStaff(request(), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("staff.read");
  });

  it("passes 'staff.write' to authorize for create and update operations", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateStaff(request({ displayName: "Mina" }), services);
    expect(services.authorize).toHaveBeenCalledWith("staff.write");

    await handleUpdateStaff(request({ displayName: "Mina Updated" }), services, "s1");
    expect(services.authorize).toHaveBeenCalledWith("staff.write");
  });
});

describe("staff route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateStaff(request({}), services)).status).toBe(400);
    expect((await handleCreateStaff(request({ displayName: "" }), services)).status).toBe(400);
    expect((await handleCreateStaff(request({ displayName: "Mina", email: 123 }), services)).status).toBe(400);
    expect((await handleCreateStaff(request({ displayName: "Mina", isActive: "yes" }), services)).status).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateStaff(request({ displayName: "Mina", unknown: true }), services)).status).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateStaff(request({}), services, "s1")).status).toBe(400);
    expect((await handleUpdateStaff(request({ displayName: "" }), services, "s1")).status).toBe(400);
  });
});

describe("staff route handlers: successful operations", () => {
  it("creates staff and returns 201", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    const response = await handleCreateStaff(
      request({ displayName: "Mina", email: "mina@example.com", phone: "555-0100", branchId: "branch-1", isActive: true }),
      services,
    );
    expect(response.status).toBe(201);
    expect(services.createStaff).toHaveBeenCalledWith("tenant-1", {
      displayName: "Mina",
      email: "mina@example.com",
      phone: "555-0100",
      branchId: "branch-1",
      isActive: true,
    });
  });

  it("returns 404 for non-existent staff", async () => {
    const services = createStaff({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getStaff).mockResolvedValue(null);
    expect((await handleGetStaff(request(), services, "missing")).status).toBe(404);
  });
});
