import { describe, expect, it, vi } from "vitest";
import {
  handleListCommunications,
  handleGetCommunication,
  handleCreateCommunication,
  type CommunicationAuthorization,
  type CommunicationRouteServices,
} from "../lib/crm/communication-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/communications", {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: CommunicationAuthorization): CommunicationRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listCommunications: vi.fn().mockResolvedValue([{ id: "comm-1", channel: "email", direction: "outbound", body: "Hello" }]),
    getCommunication: vi.fn().mockResolvedValue({ id: "comm-1", channel: "email", direction: "outbound", body: "Hello" }),
    createCommunication: vi.fn().mockResolvedValue({ id: "comm-1", channel: "email", direction: "outbound", body: "Hello" }),
  };
}

const authorized: CommunicationAuthorization = { outcome: "authorized", tenantId: "tenant-1", userId: "user-1" };

describe("communication route handlers: authentication/authorization gating", () => {
  it("returns 401 for unauthenticated requests", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListCommunications(request(), services)).status).toBe(401);
    expect((await handleCreateCommunication(request({ channel: "email", direction: "outbound", body: "Test", communicatedAt: "2026-09-13T10:00:00Z" }), services)).status).toBe(401);
    expect((await handleGetCommunication(request(), services, "comm-1")).status).toBe(401);
    expect(services.listCommunications).not.toHaveBeenCalled();
  });

  it("returns 403 for forbidden requests", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListCommunications(request(), services)).status).toBe(403);
  });
});

describe("communication route handlers: list", () => {
  it("passes customer.read permission for list", async () => {
    const services = createServices(authorized);
    await handleListCommunications(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("customer.read");
    expect(services.listCommunications).toHaveBeenCalledWith("tenant-1", undefined, undefined, undefined, undefined, undefined);
  });

  it("returns 200 with communications", async () => {
    const services = createServices(authorized);
    const result = await handleListCommunications(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.communications).toHaveLength(1);
  });

  it("passes query params for filtering", async () => {
    const services = createServices(authorized);
    await handleListCommunications(request(undefined, "GET", "https://builder.lwill.in/api/communications?channel=whatsapp&direction=inbound&customerId=cust-1"), services);
    expect(services.listCommunications).toHaveBeenCalledWith("tenant-1", "whatsapp", "inbound", undefined, "cust-1", undefined);
  });
});

describe("communication route handlers: get", () => {
  it("returns 200 with communication", async () => {
    const services = createServices(authorized);
    const result = await handleGetCommunication(request(), services, "comm-1");
    expect(result.status).toBe(200);
  });

  it("returns 404 for non-existent communication", async () => {
    const services = createServices(authorized);
    (services as { getCommunication: unknown }).getCommunication = vi.fn().mockResolvedValue(null);
    const result = await handleGetCommunication(request(), services, "missing");
    expect(result.status).toBe(404);
  });
});

describe("communication route handlers: create", () => {
  it("passes customer.write permission for create", async () => {
    const services = createServices(authorized);
    await handleCreateCommunication(request({ channel: "email", direction: "outbound", body: "Test", communicatedAt: "2026-09-13T10:00:00Z" }), services);
    expect(services.authorize).toHaveBeenCalledWith("customer.write");
  });

  it("returns 201 with created communication", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ channel: "email", direction: "outbound", body: "Test", communicatedAt: "2026-09-13T10:00:00Z" }), services);
    expect(result.status).toBe(201);
  });

  it("returns 400 for missing channel", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ direction: "outbound", body: "Test", communicatedAt: "2026-09-13T10:00:00Z" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for invalid channel", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ channel: "invalid", direction: "outbound", body: "Test", communicatedAt: "2026-09-13T10:00:00Z" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for invalid direction", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ channel: "email", direction: "invalid", body: "Test", communicatedAt: "2026-09-13T10:00:00Z" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ channel: "email", direction: "outbound", communicatedAt: "2026-09-13T10:00:00Z" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for missing communicatedAt", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ channel: "email", direction: "outbound", body: "Test" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for unknown fields", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(request({ channel: "email", direction: "outbound", body: "Test", communicatedAt: "2026-09-13T10:00:00Z", unknown: "field" }), services);
    expect(result.status).toBe(400);
  });

  it("returns 400 for invalid body", async () => {
    const services = createServices(authorized);
    const result = await handleCreateCommunication(new Request("https://builder.lwill.in/api/communications", { method: "POST", body: "not-json" }), services);
    expect(result.status).toBe(400);
  });
});
