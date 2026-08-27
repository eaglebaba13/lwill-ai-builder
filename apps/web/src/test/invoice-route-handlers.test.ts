import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  handleCreateInvoice,
  handleGetInvoice,
  handleListInvoices,
  type InvoiceAuthorization,
  type InvoiceRouteServices,
} from "../lib/crm/invoice-route-handlers";
import {
  setAuthenticationProvider,
} from "../lib/auth/server-context";

vi.mock("@lwill/authorization-prisma/src/load-permission-grants", () => ({
  loadPermissionGrants: vi.fn().mockResolvedValue([]),
}));

import { loadPermissionGrants } from "@lwill/authorization-prisma/src/load-permission-grants";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: InvoiceAuthorization): InvoiceRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listInvoices: vi.fn().mockResolvedValue([{ id: "invoice-1" }]),
    getInvoice: vi.fn().mockResolvedValue({ id: "invoice-1" }),
    createInvoice: vi.fn().mockResolvedValue({ id: "invoice-1" }),
  };
}

describe("invoice route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListInvoices(request(), services)).status).toBe(401);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }] }), services)).status).toBe(401);
    expect((await handleGetInvoice(request(), services, "i1")).status).toBe(401);
    expect(services.listInvoices).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListInvoices(request(), services)).status).toBe(403);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }] }), services)).status).toBe(403);
    expect(services.createInvoice).not.toHaveBeenCalled();
  });
});

describe("invoice route handlers: permission code forwarding", () => {
  it("passes 'invoice.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListInvoices(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("invoice.read");

    await handleGetInvoice(request(), services, "i1");
    expect(services.authorize).toHaveBeenCalledWith("invoice.read");
  });

  it("passes 'invoice.write' to authorize for create operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }] }), services);
    expect(services.authorize).toHaveBeenCalledWith("invoice.write");
  });
});

describe("invoice-runtime authorize(): authentication vs authorization outcome", () => {
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({ outcome: "unauthenticated" });
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({ outcome: "forbidden" });
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'authorized' with tenantId when the session has a matching grant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "invoice.read", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({
      outcome: "authorized",
      tenantId: "tenant-1",
    });
  });

  it("returns 'forbidden' when the grant exists for a different permission code", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "invoice.write", scope: { kind: "tenant", tenantId: "tenant-1" } },
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({ outcome: "forbidden" });
  });

  it("returns 'forbidden' when the grant exists for a different tenant", async () => {
    vi.mocked(loadPermissionGrants).mockResolvedValue([
      { permissionCode: "invoice.read", scope: { kind: "tenant", tenantId: "tenant-2" } },
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({ outcome: "forbidden" });
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
    const { createInvoiceRouteServices } = await import("../lib/crm/invoice-runtime");
    const services = createInvoiceRouteServices();
    expect(await services.authorize("invoice.read")).toEqual({ outcome: "forbidden" });
  });
});

describe("invoice route handlers: authorized operations", () => {
  const authorized: InvoiceAuthorization = { outcome: "authorized", tenantId: "tenant-1" };

  it("authorizes every operation before accessing invoice data", async () => {
    const services = createServices(authorized);
    await handleListInvoices(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("invoice.read");
    await handleGetInvoice(request(), services, "i1");
    expect(services.authorize).toHaveBeenCalledWith("invoice.read");
    await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }] }), services);
    expect(services.authorize).toHaveBeenCalledWith("invoice.write");
  });

  it("lists invoices scoped to the authorized tenant", async () => {
    const services = createServices(authorized);
    const result = await handleListInvoices(request(), services);
    expect(result.status).toBe(200);
    expect(services.listInvoices).toHaveBeenCalledWith("tenant-1");
  });

  it("creates an invoice using only the server-derived tenantId, ignoring any client-supplied tenantId", async () => {
    const services = createServices(authorized);
    const result = await handleCreateInvoice(
      request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }], tenantId: "attacker-tenant" }),
      services,
    );
    expect(result.status).toBe(400);
    expect(services.createInvoice).not.toHaveBeenCalled();

    const validResult = await handleCreateInvoice(
      request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }] }),
      services,
    );
    expect(validResult.status).toBe(201);
    expect(services.createInvoice).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ customerId: "cust-1" }),
    );
  });

  it("rejects create with missing required fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateInvoice(request({}), services)).status).toBe(400);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z" }), services)).status).toBe(400);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [] }), services)).status).toBe(400);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "", quantity: 1, unitPriceCents: 1000 }] }), services)).status).toBe(400);
  });

  it("rejects create with invalid item fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: -1, unitPriceCents: 1000 }] }), services)).status).toBe(400);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: -1 }] }), services)).status).toBe(400);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000, serviceId: 123 }] }), services)).status).toBe(400);
  });

  it("rejects create with invalid discountCents and gstCents", async () => {
    const services = createServices(authorized);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }], discountCents: -1 }), services)).status).toBe(400);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }], gstCents: -1 }), services)).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices(authorized);
    const result = await handleCreateInvoice(
      request({
        customerId: "cust-1",
        issuedAt: "2026-08-12T10:00:00.000Z",
        items: [
          { description: "Classic manicure", serviceId: "service-1", quantity: 2, unitPriceCents: 1500 },
          { description: "Glow package", packageId: "pkg-1", quantity: 1, unitPriceCents: 2500 },
        ],
        discountCents: 500,
        gstCents: 450,
        notes: "Thank you",
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createInvoice).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        customerId: "cust-1",
        items: expect.arrayContaining([
          expect.objectContaining({ description: "Classic manicure", serviceId: "service-1" }),
          expect.objectContaining({ description: "Glow package", packageId: "pkg-1" }),
        ]),
        discountCents: 500,
        gstCents: 450,
        notes: "Thank you",
      }),
    );
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices(authorized);
    expect((await handleCreateInvoice(request({ customerId: "cust-1", issuedAt: "2026-08-12T10:00:00.000Z", items: [{ description: "X", quantity: 1, unitPriceCents: 1000 }], tenantId: "attacker" }), services)).status).toBe(400);
  });

  it("returns 404 when the invoice does not exist or belongs to another tenant", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getInvoice).mockResolvedValue(null);
    expect((await handleGetInvoice(request(), services, "missing")).status).toBe(404);
  });
});
