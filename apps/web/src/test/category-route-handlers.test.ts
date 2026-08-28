import { describe, expect, it, vi } from "vitest";
import {
  handleCreateCategory,
  handleGetCategory,
  handleListCategories,
  handleUpdateCategory,
  type CategoryAuthorization,
  type CategoryRouteServices,
} from "../lib/crm/category-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/categories", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: CategoryAuthorization): CategoryRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listCategories: vi.fn().mockResolvedValue([{ id: "category-1" }]),
    getCategory: vi.fn().mockResolvedValue({ id: "category-1" }),
    createCategory: vi.fn().mockResolvedValue({ id: "category-1" }),
    updateCategory: vi.fn().mockResolvedValue({ id: "category-1" }),
  };
}

describe("category route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListCategories(request(), services)).status).toBe(401);
    expect(
      (
        await handleCreateCategory(
          request({ name: "Retail" }),
          services,
        )
      ).status,
    ).toBe(401);
    expect((await handleGetCategory(request(), services, "c1")).status).toBe(401);
    expect(
      (await handleUpdateCategory(request({ name: "Retail" }), services, "c1")).status,
    ).toBe(401);
    expect(services.listCategories).not.toHaveBeenCalled();
    expect(services.createCategory).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListCategories(request(), services)).status).toBe(403);
    expect(
      (
        await handleCreateCategory(
          request({ name: "Retail" }),
          services,
        )
      ).status,
    ).toBe(403);
    expect(services.createCategory).not.toHaveBeenCalled();
  });
});

describe("category route handlers: permission code forwarding", () => {
  it("passes 'product.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListCategories(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("product.read");

    await handleGetCategory(request(), services, "c1");
    expect(services.authorize).toHaveBeenCalledWith("product.read");
  });

  it("passes 'product.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateCategory(request({ name: "Retail" }), services);
    expect(services.authorize).toHaveBeenCalledWith("product.write");

    await handleUpdateCategory(request({ name: "Retail" }), services, "c1");
    expect(services.authorize).toHaveBeenCalledWith("product.write");
  });
});

describe("category route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateCategory(request({}), services)).status).toBe(400);
    expect((await handleCreateCategory(request({ name: "" }), services)).status).toBe(400);
    expect(
      (await handleCreateCategory(request({ name: "Retail", isActive: "yes" }), services)).status,
    ).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (
        await handleCreateCategory(
          request({ name: "Retail", tenantId: "attacker" }),
          services,
        )
      ).status,
    ).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateCategory(request({}), services, "c1")).status).toBe(400);
    expect((await handleUpdateCategory(request({ name: "" }), services, "c1")).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateCategory(
      request({ name: "Retail", description: "Retail products", isActive: false }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createCategory).toHaveBeenCalledWith("tenant-1", {
      name: "Retail",
      description: "Retail products",
      isActive: false,
    });
  });

  it("returns 404 for non-existent category", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getCategory).mockResolvedValue(null);
    expect((await handleGetCategory(request(), services, "missing")).status).toBe(404);
  });

  it("returns 404 when updating a non-existent/cross-tenant category", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateCategory).mockResolvedValue(null);
    expect((await handleUpdateCategory(request({ name: "X" }), services, "missing")).status).toBe(404);
  });
});

describe("category route handlers: authorized operations", () => {
  it("returns 200 with category list for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.listCategories).mockResolvedValue([
      { id: "cat-1", name: "Retail" },
      { id: "cat-2", name: "Services" },
    ]);
    const result = await handleListCategories(request(), services);
    expect(result.status).toBe(200);
    expect(services.listCategories).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with category for authorized get", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetCategory(request(), services, "cat-1");
    expect(result.status).toBe(200);
  });
});
