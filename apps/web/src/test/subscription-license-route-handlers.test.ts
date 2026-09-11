import { describe, expect, it, vi } from "vitest";
import {
  handleGetSubscription,
  handleCreateSubscription,
  handleUpdateSubscription,
  handleGetLicense,
  handleCreateLicense,
  handleUpdateLicense,
  type SubscriptionLicenseAuthorization,
  type SubscriptionLicenseRouteServices,
} from "../lib/platform/subscription-license-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/platform/tenants/t1/subscription", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: SubscriptionLicenseAuthorization): SubscriptionLicenseRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    getSubscription: vi.fn().mockResolvedValue({ id: "sub-1", tenantId: "t1", planName: "Pro", status: "ACTIVE" }),
    createSubscription: vi.fn().mockResolvedValue({ id: "sub-1", tenantId: "t1", planName: "Pro", status: "ACTIVE" }),
    updateSubscription: vi.fn().mockResolvedValue({ id: "sub-1", tenantId: "t1", planName: "Pro", status: "ACTIVE" }),
    getLicense: vi.fn().mockResolvedValue({ id: "lic-1", tenantId: "t1", status: "ACTIVE" }),
    createLicense: vi.fn().mockResolvedValue({ id: "lic-1", tenantId: "t1", status: "ACTIVE" }),
    updateLicense: vi.fn().mockResolvedValue({ id: "lic-1", tenantId: "t1", status: "ACTIVE" }),
  };
}

const authorized: SubscriptionLicenseAuthorization = { outcome: "authorized", userId: "user-1" };

describe("subscription route handlers", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetSubscription(request(), services, "t1")).status).toBe(401);
    expect((await handleCreateSubscription(request({ planName: "Pro" }), services, "t1")).status).toBe(401);
    expect((await handleUpdateSubscription(request({ planName: "Enterprise" }), services, "t1")).status).toBe(401);
    expect(services.getSubscription).not.toHaveBeenCalled();
  });

  it("returns 403 for forbidden requests", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleGetSubscription(request(), services, "t1")).status).toBe(403);
  });

  it("returns 200 with subscription for authorized get", async () => {
    const services = createServices(authorized);
    const result = await handleGetSubscription(request(), services, "t1");
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.subscription.planName).toBe("Pro");
  });

  it("returns 404 when subscription not found", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getSubscription).mockResolvedValue(null);
    expect((await handleGetSubscription(request(), services, "t1")).status).toBe(404);
  });

  it("creates subscription with valid input", async () => {
    const services = createServices(authorized);
    const result = await handleCreateSubscription(request({ planName: "Pro", status: "TRIAL" }), services, "t1");
    expect(result.status).toBe(201);
    expect(services.createSubscription).toHaveBeenCalledWith("t1", expect.objectContaining({ planName: "Pro", status: "TRIAL" }), "user-1");
  });

  it("rejects create without planName", async () => {
    const services = createServices(authorized);
    expect((await handleCreateSubscription(request({}), services, "t1")).status).toBe(400);
    expect((await handleCreateSubscription(request({ planName: "" }), services, "t1")).status).toBe(400);
    expect(services.createSubscription).not.toHaveBeenCalled();
  });

  it("rejects create with unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateSubscription(request({ planName: "Pro", unknown: true }), services, "t1")).status).toBe(400);
  });

  it("returns 409 when subscription already exists", async () => {
    const services = createServices(authorized);
    vi.mocked(services.createSubscription).mockRejectedValue(new Error("subscription already exists for this tenant"));
    expect((await handleCreateSubscription(request({ planName: "Pro" }), services, "t1")).status).toBe(409);
  });

  it("updates subscription with valid input", async () => {
    const services = createServices(authorized);
    const updateReq = new Request("https://builder.lwill.in/api/platform/tenants/t1/subscription", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    const result = await handleUpdateSubscription(updateReq, services, "t1");
    expect(result.status).toBe(200);
    expect(services.updateSubscription).toHaveBeenCalledWith("t1", expect.objectContaining({ status: "CANCELLED" }), "user-1");
  });

  it("returns 404 when updating non-existent subscription", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateSubscription).mockResolvedValue(null);
    const updateReq = new Request("https://builder.lwill.in/api/platform/tenants/t1/subscription", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    expect((await handleUpdateSubscription(updateReq, services, "t1")).status).toBe(404);
  });
});

describe("license route handlers", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleGetLicense(request(), services, "t1")).status).toBe(401);
    expect((await handleCreateLicense(request({}), services, "t1")).status).toBe(401);
    expect((await handleUpdateLicense(request({ status: "EXPIRED" }), services, "t1")).status).toBe(401);
  });

  it("returns 200 with license for authorized get", async () => {
    const services = createServices(authorized);
    const result = await handleGetLicense(request(), services, "t1");
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.license.status).toBe("ACTIVE");
  });

  it("returns 404 when license not found", async () => {
    const services = createServices(authorized);
    vi.mocked(services.getLicense).mockResolvedValue(null);
    expect((await handleGetLicense(request(), services, "t1")).status).toBe(404);
  });

  it("creates license with valid input", async () => {
    const services = createServices(authorized);
    const result = await handleCreateLicense(request({ status: "ACTIVE", features: { maxUsers: 10 } }), services, "t1");
    expect(result.status).toBe(201);
    expect(services.createLicense).toHaveBeenCalledWith("t1", expect.objectContaining({ status: "ACTIVE" }), "user-1");
  });

  it("rejects create with unknown fields", async () => {
    const services = createServices(authorized);
    expect((await handleCreateLicense(request({ unknown: true }), services, "t1")).status).toBe(400);
  });

  it("returns 409 when license already exists", async () => {
    const services = createServices(authorized);
    vi.mocked(services.createLicense).mockRejectedValue(new Error("license already exists for this tenant"));
    expect((await handleCreateLicense(request({}), services, "t1")).status).toBe(409);
  });

  it("updates license with valid input", async () => {
    const services = createServices(authorized);
    const updateReq = new Request("https://builder.lwill.in/api/platform/tenants/t1/license", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "SUSPENDED" }),
    });
    const result = await handleUpdateLicense(updateReq, services, "t1");
    expect(result.status).toBe(200);
    expect(services.updateLicense).toHaveBeenCalledWith("t1", expect.objectContaining({ status: "SUSPENDED" }), "user-1");
  });

  it("returns 404 when updating non-existent license", async () => {
    const services = createServices(authorized);
    vi.mocked(services.updateLicense).mockResolvedValue(null);
    const updateReq = new Request("https://builder.lwill.in/api/platform/tenants/t1/license", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "EXPIRED" }),
    });
    expect((await handleUpdateLicense(updateReq, services, "t1")).status).toBe(404);
  });

  it("passes platform.manage permission", async () => {
    const services = createServices(authorized);
    await handleGetSubscription(request(), services, "t1");
    expect(services.authorize).toHaveBeenCalledWith("platform.manage");
    await handleGetLicense(request(), services, "t1");
    expect(services.authorize).toHaveBeenCalledWith("platform.manage");
  });
});