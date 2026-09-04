import { describe, expect, it, vi } from "vitest";
import {
  handleListTenants,
  handleGetTenant,
  handleCreateTenant,
  handleUpdateTenant,
  type TenantManagementAuthorization,
  type TenantManagementRouteServices,
} from "../lib/platform/tenant-route-handlers";

function request(body?: Record<string, unknown>) {
  return new Request("https://builder.lwill.in/api/platform/tenants", {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function createServices(authorization: TenantManagementAuthorization): TenantManagementRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listTenants: vi.fn().mockResolvedValue([]),
    getTenant: vi.fn().mockResolvedValue(null),
    createTenant: vi.fn().mockResolvedValue({ id: "tenant-1", name: "New Tenant", slug: "new-tenant", isActive: true, createdAt: new Date(), updatedAt: new Date() }),
    updateTenant: vi.fn().mockResolvedValue(null),
  };
}

describe("tenant management route handlers", () => {
  describe("handleListTenants", () => {
    it("returns 401 for unauthenticated callers", async () => {
      const services = createServices({ outcome: "unauthenticated" });
      const result = await handleListTenants(request(), services);
      expect(result.status).toBe(401);
      expect(services.authorize).toHaveBeenCalledWith("platform.manage");
    });

    it("returns 403 for authenticated callers without platform permission", async () => {
      const services = createServices({ outcome: "forbidden" });
      const result = await handleListTenants(request(), services);
      expect(result.status).toBe(403);
    });

    it("returns 200 with tenants for authorized callers", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      vi.mocked(services.listTenants).mockResolvedValue([{ id: "tenant-1", name: "HDK", slug: "hdk", isActive: true, createdAt: new Date(), updatedAt: new Date() }]);
      const result = await handleListTenants(request(), services);
      expect(result.status).toBe(200);
      const body = await result.json() as { tenants: unknown[] };
      expect(body.tenants).toHaveLength(1);
    });
  });

  describe("handleGetTenant", () => {
    it("returns 401 for unauthenticated callers", async () => {
      const services = createServices({ outcome: "unauthenticated" });
      const result = await handleGetTenant(request(), services, "tenant-1");
      expect(result.status).toBe(401);
    });

    it("returns 403 for authenticated callers without platform permission", async () => {
      const services = createServices({ outcome: "forbidden" });
      const result = await handleGetTenant(request(), services, "tenant-1");
      expect(result.status).toBe(403);
    });

    it("returns 404 when tenant does not exist", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      vi.mocked(services.getTenant).mockResolvedValue(null);
      const result = await handleGetTenant(request(), services, "tenant-missing");
      expect(result.status).toBe(404);
    });

    it("returns 200 with tenant detail for authorized callers", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      vi.mocked(services.getTenant).mockResolvedValue({ id: "tenant-1", name: "HDK", slug: "hdk", isActive: true, createdAt: new Date(), updatedAt: new Date(), domains: [], _count: { businessUnits: 1, branches: 2, users: 3 } });
      const result = await handleGetTenant(request(), services, "tenant-1");
      expect(result.status).toBe(200);
      const body = await result.json() as { tenant: unknown };
      expect(body.tenant).toBeDefined();
    });
  });

  describe("handleCreateTenant", () => {
    it("returns 401 for unauthenticated callers", async () => {
      const services = createServices({ outcome: "unauthenticated" });
      const result = await handleCreateTenant(request({ name: "HDK", slug: "hdk" }), services);
      expect(result.status).toBe(401);
    });

    it("returns 400 when name is missing", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      const result = await handleCreateTenant(request({ slug: "hdk" }), services);
      expect(result.status).toBe(400);
      const body = await result.json() as { error: string };
      expect(body.error).toBe("name is required");
    });

    it("returns 400 when slug is missing", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      const result = await handleCreateTenant(request({ name: "HDK" }), services);
      expect(result.status).toBe(400);
      const body = await result.json() as { error: string };
      expect(body.error).toBe("slug is required and must be lowercase alphanumeric with hyphens");
    });

    it("returns 409 on unique constraint violation", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      vi.mocked(services.createTenant).mockRejectedValue(new Error("Unique constraint"));
      const result = await handleCreateTenant(request({ name: "HDK", slug: "hdk" }), services);
      expect(result.status).toBe(409);
      const body = await result.json() as { error: string };
      expect(body.error).toBe("A tenant with this slug already exists");
    });

    it("returns 201 with created tenant for valid input", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      const result = await handleCreateTenant(request({ name: "HDK", slug: "hdk" }), services);
      expect(result.status).toBe(201);
      const body = await result.json() as { tenant: { name: string; slug: string } };
      expect(body.tenant.name).toBe("New Tenant");
      expect(body.tenant.slug).toBe("new-tenant");
    });
  });

  describe("handleUpdateTenant", () => {
    it("returns 401 for unauthenticated callers", async () => {
      const services = createServices({ outcome: "unauthenticated" });
      const result = await handleUpdateTenant(request({ isActive: false }), services, "tenant-1");
      expect(result.status).toBe(401);
    });

    it("returns 403 for authenticated callers without platform permission", async () => {
      const services = createServices({ outcome: "forbidden" });
      const result = await handleUpdateTenant(request({ isActive: false }), services, "tenant-1");
      expect(result.status).toBe(403);
    });

    it("returns 400 when no valid fields are provided", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      const result = await handleUpdateTenant(request({}), services, "tenant-1");
      expect(result.status).toBe(400);
      const body = await result.json() as { error: string };
      expect(body.error).toBe("No valid fields to update");
    });

    it("returns 404 when tenant does not exist", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      vi.mocked(services.updateTenant).mockResolvedValue(null);
      const result = await handleUpdateTenant(request({ isActive: false }), services, "tenant-missing");
      expect(result.status).toBe(404);
    });

    it("returns 200 with updated tenant for valid input", async () => {
      const services = createServices({ outcome: "authorized", userId: "user-1" });
      vi.mocked(services.updateTenant).mockResolvedValue({ id: "tenant-1", name: "HDK Beauty", slug: "hdk", isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const result = await handleUpdateTenant(request({ name: "HDK Beauty" }), services, "tenant-1");
      expect(result.status).toBe(200);
      const body = await result.json() as { tenant: { name: string } };
      expect(body.tenant.name).toBe("HDK Beauty");
    });
  });
});
