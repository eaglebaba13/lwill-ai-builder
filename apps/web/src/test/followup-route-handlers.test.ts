import { describe, expect, it, vi } from "vitest";
import {
  handleListFollowups,
  handleGetFollowup,
  handleCreateFollowup,
  handleUpdateFollowup,
  type FollowupAuthorization,
  type FollowupRouteServices,
} from "../lib/crm/followup-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/followups", {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: FollowupAuthorization): FollowupRouteServices {
  const services: FollowupRouteServices = {
    authorize: vi.fn().mockResolvedValue(authorization),
    listFollowups: vi.fn().mockResolvedValue([{ id: "fup-1", title: "Call client", status: "PENDING" }]),
    getFollowup: vi.fn().mockResolvedValue({ id: "fup-1", title: "Call client", status: "PENDING" }),
    createFollowup: vi.fn().mockResolvedValue({ id: "fup-1", title: "Call client", status: "PENDING" }),
    updateFollowup: vi.fn().mockResolvedValue({ id: "fup-1", title: "Call client updated", status: "COMPLETED" }),
  };
  return services;
}

const authorized: FollowupAuthorization = { outcome: "authorized", tenantId: "tenant-1", userId: "user-1" };

describe("followup route handlers: authentication/authorization gating", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListFollowups(request(), services)).status).toBe(401);
    expect((await handleCreateFollowup(request({ title: "Test", dueAt: "2026-09-15T10:00:00Z" }), services)).status).toBe(401);
    expect((await handleGetFollowup(request(), services, "fup-1")).status).toBe(401);
    expect(services.listFollowups).not.toHaveBeenCalled();
  });

  it("returns 403 for forbidden requests", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListFollowups(request(), services)).status).toBe(403);
  });
});

describe("followup route handlers: list", () => {
  it("passes customer.read permission for list", async () => {
    const services = createServices(authorized);
    await handleListFollowups(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("customer.read");
    expect(services.listFollowups).toHaveBeenCalledWith("tenant-1", undefined, undefined, undefined, undefined);
  });

  it("returns 200 with followups", async () => {
    const services = createServices(authorized);
    const result = await handleListFollowups(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.followups).toHaveLength(1);
  });

  it("passes query params for filtering", async () => {
    const services = createServices(authorized);
    await handleListFollowups(request(undefined, "GET", "https://builder.lwill.in/api/followups?status=PENDING&leadId=lead-1"), services);
    expect(services.listFollowups).toHaveBeenCalledWith("tenant-1", "PENDING", "lead-1", undefined, undefined);
  });
});

describe("followup route handlers: get", () => {
  it("returns 200 with followup", async () => {
    const services = createServices(authorized);
    const result = await handleGetFollowup(request(), services, "fup-1");
    expect(result.status).toBe(200);
  });

  it("returns 404 for non-existent followup", async () => {
    const services = createServices(authorized);
    (services as { getFollowup: unknown }).getFollowup = vi.fn().mockResolvedValue(null);
    const result = await handleGetFollowup(request(), services, "missing");
    expect(result.status).toBe(404);
  });
});

describe("followup route handlers: create", () => {
  it("passes customer.write permission for create", async () => {
    const services = createServices(authorized);
    await handleCreateFollowup(request({ title: "Test", dueAt: "2026-09-15T10:00:00Z" }), services);
    expect(services.authorize).toHaveBeenCalledWith("customer.write");
  });

  it("returns 201 with created followup", async () => {
    const services = createServices(authorized);
    const result = await handleCreateFollowup(request({ title: "Test", dueAt: "2026-09-15T10:00:00Z" }), services);
    expect(result.status).toBe(201);
  });

  it("returns 400 for missing title", async () => {
    const services = createServices(authorized);
    const result = await handleCreateFollowup(request({ dueAt: "2026-09-15T10:00:00Z" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for missing dueAt", async () => {
    const services = createServices(authorized);
    const result = await handleCreateFollowup(request({ title: "Test" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    const result = await handleCreateFollowup(request({ title: "Test", dueAt: "2026-09-15T10:00:00Z", unknown: "field" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for invalid body", async () => {
    const services = createServices(authorized);
    const result = await handleCreateFollowup(new Request("https://builder.lwill.in/api/followups", { method: "POST", body: "not-json" }), services);
    expect(result.status).toBe(400);
  });
});

describe("followup route handlers: update", () => {
  it("passes customer.write permission for update", async () => {
    const services = createServices(authorized);
    await handleUpdateFollowup(request({ title: "Updated" }, "PATCH"), services, "fup-1");
    expect(services.authorize).toHaveBeenCalledWith("customer.write");
  });

  it("returns 200 with updated followup", async () => {
    const services = createServices(authorized);
    const result = await handleUpdateFollowup(request({ title: "Updated" }, "PATCH"), services, "fup-1");
    expect(result.status).toBe(200);
  });

  it("returns 400 for empty body", async () => {
    const services = createServices(authorized);
    const result = await handleUpdateFollowup(request({}, "PATCH"), services, "fup-1");
    expect(result.status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    const result = await handleUpdateFollowup(request({ title: "Test", unknown: "field" }, "PATCH"), services, "fup-1");
    expect(result.status).toBe(400);
  });

  it("returns 400 for invalid status", async () => {
    const services = createServices(authorized);
    const result = await handleUpdateFollowup(request({ status: "INVALID" }, "PATCH"), services, "fup-1");
    expect(result.status).toBe(400);
  });

  it("returns 404 for non-existent followup", async () => {
    const services = createServices(authorized);
    (services as { updateFollowup: unknown }).updateFollowup = vi.fn().mockResolvedValue(null);
    const result = await handleUpdateFollowup(request({ title: "Updated" }, "PATCH"), services, "missing");
    expect(result.status).toBe(404);
  });
});
