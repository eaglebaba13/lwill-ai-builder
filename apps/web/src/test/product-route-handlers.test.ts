import { describe, expect, it, vi } from "vitest";
import {
  handleCreateProduct,
  handleGetProduct,
  handleListProducts,
  handleUpdateProduct,
  type ProductAuthorization,
  type ProductRouteServices,
} from "../lib/crm/product-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: ProductAuthorization): ProductRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listProducts: vi.fn().mockResolvedValue([{ id: "product-1" }]),
    getProduct: vi.fn().mockResolvedValue({ id: "product-1" }),
    createProduct: vi.fn().mockResolvedValue({ id: "product-1" }),
    updateProduct: vi.fn().mockResolvedValue({ id: "product-1" }),
  };
}

describe("product route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListProducts(request(), services)).status).toBe(401);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1500 }), services)).status).toBe(401);
    expect((await handleGetProduct(request(), services, "p1")).status).toBe(401);
    expect((await handleUpdateProduct(request({ name: "Nail Polish" }), services, "p1")).status).toBe(401);
    expect(services.listProducts).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListProducts(request(), services)).status).toBe(403);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1500 }), services)).status).toBe(403);
    expect(services.createProduct).not.toHaveBeenCalled();
  });
});

describe("product route handlers: permission code forwarding", () => {
  it("passes 'product.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListProducts(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("product.read");

    await handleGetProduct(request(), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("product.read");
  });

  it("passes 'product.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1500 }), services);
    expect(services.authorize).toHaveBeenCalledWith("product.write");

    await handleUpdateProduct(request({ name: "Nail Polish" }), services, "p1");
    expect(services.authorize).toHaveBeenCalledWith("product.write");
  });
});

describe("product route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateProduct(request({}), services)).status).toBe(400);
    expect((await handleCreateProduct(request({ categoryId: "", name: "Nail Polish", sku: "NP-001", priceCents: 1500 }), services)).status).toBe(400);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "", sku: "NP-001", priceCents: 1500 }), services)).status).toBe(400);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "", priceCents: 1500 }), services)).status).toBe(400);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: -1 }), services)).status).toBe(400);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1.5 }), services)).status).toBe(400);
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1500, isActive: "yes" }), services)).status).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateProduct(request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1500, tenantId: "attacker" }), services)).status).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateProduct(request({}), services, "p1")).status).toBe(400);
    expect((await handleUpdateProduct(request({ name: "" }), services, "p1")).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateProduct(
      request({ categoryId: "cat-1", name: "Nail Polish", sku: "NP-001", priceCents: 1500, unit: "ml", isActive: false }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createProduct).toHaveBeenCalledWith("tenant-1", {
      categoryId: "cat-1",
      name: "Nail Polish",
      sku: "NP-001",
      unit: "ml",
      priceCents: 1500,
      isActive: false,
    });
  });

  it("returns 404 for non-existent product", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getProduct).mockResolvedValue(null);
    expect((await handleGetProduct(request(), services, "missing")).status).toBe(404);
  });

  it("returns 404 when updating a non-existent/cross-tenant product", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateProduct).mockResolvedValue(null);
    expect((await handleUpdateProduct(request({ name: "X" }), services, "missing")).status).toBe(404);
  });
});
