import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreateCustomer,
  handleGetCustomer,
  handleListCustomers,
  handleUpdateCustomer,
  type CustomerAuthorization,
  type CustomerRouteServices,
} from "../lib/crm/customer-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: CustomerAuthorization): CustomerRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listCustomers: vi.fn().mockResolvedValue([{ id: "customer-1" }]),
    getCustomer: vi.fn().mockResolvedValue({ id: "customer-1" }),
    createCustomer: vi.fn().mockResolvedValue({ id: "customer-1" }),
    updateCustomer: vi.fn().mockResolvedValue({ id: "customer-1" }),
  };
}

describe("customer route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListCustomers(request(), services)).status).toBe(401);
    expect((await handleCreateCustomer(request({ name: "A" }), services)).status).toBe(401);
    expect((await handleGetCustomer(request(), services, "c1")).status).toBe(401);
    expect((await handleUpdateCustomer(request({ name: "A" }), services, "c1")).status).toBe(401);
    expect(services.listCustomers).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListCustomers(request(), services)).status).toBe(403);
    expect((await handleCreateCustomer(request({ name: "A" }), services)).status).toBe(403);
    expect(services.createCustomer).not.toHaveBeenCalled();
  });
});

describe("customer-runtime authorize(): authentication vs authorization outcome", () => {
  beforeEach(() => {
    setAuthenticationProvider(null);
  });

  it("returns 'unauthenticated' when the session is not authenticated", async () => {
    setAuthenticationProvider({
      async getAuthenticationContext() {
        return { authenticated: false } as never;
      },
    });
    const { createCustomerRouteServices } = await import("../lib/crm/customer-runtime");
    const services = createCustomerRouteServices();
    expect(await services.authorize()).toEqual({ outcome: "unauthenticated" });
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
    const { createCustomerRouteServices } = await import("../lib/crm/customer-runtime");
    const services = createCustomerRouteServices();
    expect(await services.authorize()).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the session is authenticated with a valid tenant context (fail-closed until permission catalog exists)", async () => {
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
    const { createCustomerRouteServices } = await import("../lib/crm/customer-runtime");
    const services = createCustomerRouteServices();
    expect(await services.authorize()).toEqual({ outcome: "forbidden" });
  });
});

describe("customer route handlers: authorized operations", () => {
  const authorized: CustomerAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing customer data", async () => {
    const services = createServices(authorized);
    await handleListCustomers(request(), services);
    expect(services.authorize).toHaveBeenCalled();
    await handleGetCustomer(request(), services, "c1");
    expect(services.authorize).toHaveBeenCalled();
    await handleCreateCustomer(request({ name: "Jane" }), services);
    expect(services.authorize).toHaveBeenCalled();
    await handleUpdateCustomer(request({ name: "Jane" }), services, "c1");
    expect(services.authorize).toHaveBeenCalled();
  });

  it("lists customers scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListCustomers(request(), services);
    expect(result.status).toBe(200);
    expect(services.listCustomers).toHaveBeenCalledWith("tenant-1");
  });

  it("creates a customer using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCustomer(
      request({ name: "Jane", tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400); // unknown key "tenantId" is rejected outright
    expect(services.createCustomer).not.toHaveBeenCalled();

    const validResult = await handleCreateCustomer(request({ name: "Jane" }), services);
    expect(validResult.status).toBe(201);
    expect(services.createCustomer).toHaveBeenCalledWith("tenant-1", expect.objectContaining({ name: "Jane" }));
  });

  it("rejects create with a missing or blank name", async () => {
    const services = createServices(authorized);
    expect((await handleCreateCustomer(request({}), services)).status).toBe(400);
    expect((await handleCreateCustomer(request({ name: "  " }), services)).status).toBe(400);
  });

  it("returns 404 when the customer does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getCustomer).mockResolvedValue(null);
    expect((await handleGetCustomer(request(), services, "missing")).status).toBe(404);
  });

  it("updates a customer with valid fields and rejects unknown/invalid fields", async () => {
    const services = createServices(authorized);
    const okResult = await handleUpdateCustomer(request({ name: "New Name", isActive: false }), services, "c1");
    expect(okResult.status).toBe(200);
    expect(services.updateCustomer).toHaveBeenCalledWith(
      "tenant-1", "c1", expect.objectContaining({ name: "New Name", isActive: false }),
    );

    expect((await handleUpdateCustomer(request({ isActive: "not-a-boolean" }), services, "c1")).status).toBe(400);
    expect((await handleUpdateCustomer(request({}), services, "c1")).status).toBe(400);
    expect((await handleUpdateCustomer(request({ tenantId: "attacker" }), services, "c1")).status).toBe(400);
  });

  it("returns 404 when updating a non-existent/cross-tenant customer", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateCustomer).mockResolvedValue(null);
    expect((await handleUpdateCustomer(request({ name: "X" }), services, "missing")).status).toBe(404);
  });
});
