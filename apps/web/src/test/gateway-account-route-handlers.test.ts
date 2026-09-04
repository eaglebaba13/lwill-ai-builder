import { describe, expect, it, vi } from "vitest";
import {
  handleListGatewayAccounts,
  handleGetGatewayAccount,
  handleCreateGatewayAccount,
  handleUpdateGatewayAccount,
  handleDeleteGatewayAccount,
  type GatewayAccountAuthorization,
  type GatewayAccountRouteServices,
} from "../lib/crm/gateway-account-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/gateway-accounts", {
    method: body === undefined ? "GET" : (method ?? "POST"),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: GatewayAccountAuthorization, overrides: Partial<GatewayAccountRouteServices> = {}): GatewayAccountRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listGatewayAccounts: vi.fn().mockResolvedValue([]),
    getGatewayAccount: vi.fn().mockResolvedValue(null),
    createGatewayAccount: vi.fn().mockResolvedValue({
      id: "gw-1", provider: "razorpay", label: "Test Gateway", isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    }),
    updateGatewayAccount: vi.fn().mockResolvedValue({
      id: "gw-1", provider: "razorpay", label: "Updated", isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
    }),
    deleteGatewayAccount: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("gateway account route handlers: authentication", () => {
  it("GET returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleListGatewayAccounts(request(), services);
    expect(result.status).toBe(401);
  });

  it("POST returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleCreateGatewayAccount(request({ provider: "razorpay" }), services);
    expect(result.status).toBe(401);
  });

  it("GET by id returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleGetGatewayAccount(request(), services, "gw-1");
    expect(result.status).toBe(401);
  });

  it("PATCH returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleUpdateGatewayAccount(request({ label: "test" }), services, "gw-1");
    expect(result.status).toBe(401);
  });

  it("DELETE returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleDeleteGatewayAccount(request(), services, "gw-1");
    expect(result.status).toBe(401);
  });

  it("GET returns 403 for forbidden", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleListGatewayAccounts(request(), services);
    expect(result.status).toBe(403);
  });
});

describe("gateway account route handlers: GET list", () => {
  it("returns tenant-scoped accounts", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { listGatewayAccounts: vi.fn().mockResolvedValue([
        { id: "gw-1", provider: "razorpay", isActive: true },
      ]) },
    );
    const result = await handleListGatewayAccounts(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.gatewayAccounts).toHaveLength(1);
  });
});

describe("gateway account route handlers: GET by id", () => {
  it("returns 404 when not found", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetGatewayAccount(request(), services, "gw-missing");
    expect(result.status).toBe(404);
  });

  it("returns account when found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { getGatewayAccount: vi.fn().mockResolvedValue({ id: "gw-1", provider: "razorpay" }) },
    );
    const result = await handleGetGatewayAccount(request(), services, "gw-1");
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.gatewayAccount.id).toBe("gw-1");
  });
});

describe("gateway account route handlers: POST create", () => {
  it("creates account", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateGatewayAccount(
      request({ provider: "razorpay", label: "HDK Gateway", config: { apiKey: "test" } }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createGatewayAccount).toHaveBeenCalledWith("tenant-1", {
      provider: "razorpay",
      label: "HDK Gateway",
      isActive: undefined,
      config: { apiKey: "test" },
    });
  });

  it("rejects missing provider", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateGatewayAccount(request({}), services);
    expect(result.status).toBe(400);
  });

  it("rejects extra fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateGatewayAccount(request({ provider: "test", extra: "field" }), services);
    expect(result.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const invalidRequest = new Request("https://builder.lwill.in/api/gateway-accounts", {
      method: "POST", headers: { "content-type": "application/json" }, body: "invalid",
    });
    const result = await handleCreateGatewayAccount(invalidRequest, services);
    expect(result.status).toBe(400);
  });
});

describe("gateway account route handlers: PATCH update", () => {
  it("updates account", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleUpdateGatewayAccount(request({ label: "Updated" }), services, "gw-1");
    expect(result.status).toBe(200);
    expect(services.updateGatewayAccount).toHaveBeenCalledWith("tenant-1", "gw-1", { label: "Updated" });
  });

  it("returns 404 when not found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { updateGatewayAccount: vi.fn().mockResolvedValue(null) },
    );
    const result = await handleUpdateGatewayAccount(request({ label: "test" }), services, "gw-missing");
    expect(result.status).toBe(404);
  });

  it("rejects empty body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleUpdateGatewayAccount(request({}), services, "gw-1");
    expect(result.status).toBe(400);
  });
});

describe("gateway account route handlers: DELETE", () => {
  it("deletes account", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleDeleteGatewayAccount(request(), services, "gw-1");
    expect(result.status).toBe(204);
    expect(services.deleteGatewayAccount).toHaveBeenCalledWith("tenant-1", "gw-1");
  });

  it("returns 404 when not found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { deleteGatewayAccount: vi.fn().mockResolvedValue(false) },
    );
    const result = await handleDeleteGatewayAccount(request(), services, "gw-missing");
    expect(result.status).toBe(404);
  });
});

describe("gateway account security: config stripping", () => {
  it("does not expose config in create response", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        createGatewayAccount: vi.fn().mockResolvedValue({
          id: "gw-1", provider: "razorpay", label: null, isActive: true,
          createdAt: new Date(), updatedAt: new Date(),
        }),
      },
    );
    const result = await handleCreateGatewayAccount(
      request({ provider: "razorpay", config: { apiKey: "secret-key", apiSecret: "secret-value" } }),
      services,
    );
    expect(result.status).toBe(201);
    const body = await result.json();
    expect(body.gatewayAccount).not.toHaveProperty("config");
    expect(body.gatewayAccount).not.toHaveProperty("apiKey");
    expect(body.gatewayAccount).not.toHaveProperty("apiSecret");
  });
});

describe("gateway account tenant isolation", () => {
  it("cannot access another tenant account", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-2" },
      { getGatewayAccount: vi.fn().mockResolvedValue(null) },
    );
    const result = await handleGetGatewayAccount(request(), services, "gw-1");
    expect(result.status).toBe(404);
    expect(services.getGatewayAccount).toHaveBeenCalledWith("tenant-2", "gw-1");
  });
});
