import { describe, expect, it, vi } from "vitest";
import {
  handleListEventSubscriptions,
  handleGetEventSubscription,
  handleCreateEventSubscription,
  handleUpdateEventSubscription,
  handleDeleteEventSubscription,
  type EventSubscriptionAuthorization,
  type EventSubscriptionRouteServices,
} from "../lib/communication/event-subscription-route-handlers";

function request(body?: unknown, method?: string, url?: string): Request {
  return new Request(url ?? "https://builder.lwill.in/api/event-subscriptions", {
    method: body === undefined ? "GET" : (method ?? "POST"),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: EventSubscriptionAuthorization, overrides: Partial<EventSubscriptionRouteServices> = {}): EventSubscriptionRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listEventSubscriptions: vi.fn().mockResolvedValue([]),
    getEventSubscription: vi.fn().mockResolvedValue(null),
    createEventSubscription: vi.fn().mockResolvedValue({
      id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created",
      notificationTemplateId: "template-1", isEnabled: true,
      createdAt: new Date(), updatedAt: new Date(),
    }),
    updateEventSubscription: vi.fn().mockResolvedValue({
      id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created",
      notificationTemplateId: "template-1", isEnabled: false,
      createdAt: new Date(), updatedAt: new Date(),
    }),
    deleteEventSubscription: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("event subscription route handlers: authentication/authorization", () => {
  it("GET returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleListEventSubscriptions(request(), services);
    expect(result.status).toBe(401);
  });

  it("POST returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleCreateEventSubscription(request({ eventType: "appointment.created" }), services);
    expect(result.status).toBe(401);
  });

  it("GET by id returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleGetEventSubscription(request(), services, "sub-1");
    expect(result.status).toBe(401);
  });

  it("PATCH returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleUpdateEventSubscription(request({ isEnabled: false }), services, "sub-1");
    expect(result.status).toBe(401);
  });

  it("DELETE returns 401 for unauthenticated", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleDeleteEventSubscription(request(), services, "sub-1");
    expect(result.status).toBe(401);
  });

  it("GET returns 403 for forbidden", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleListEventSubscriptions(request(), services);
    expect(result.status).toBe(403);
  });
});

describe("event subscription route handlers: GET list", () => {
  it("returns tenant-scoped subscriptions", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { listEventSubscriptions: vi.fn().mockResolvedValue([
        { id: "sub-1", eventType: "appointment.created", isEnabled: true },
      ]) },
    );
    const result = await handleListEventSubscriptions(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.eventSubscriptions).toHaveLength(1);
    expect(services.listEventSubscriptions).toHaveBeenCalledWith("tenant-1", undefined);
  });

  it("passes eventType filter", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const url = "https://builder.lwill.in/api/event-subscriptions?eventType=appointment.created";
    await handleListEventSubscriptions(request(undefined, "GET", url), services);
    expect(services.listEventSubscriptions).toHaveBeenCalledWith("tenant-1", "appointment.created");
  });
});

describe("event subscription route handlers: GET by id", () => {
  it("returns 404 when not found", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetEventSubscription(request(), services, "sub-missing");
    expect(result.status).toBe(404);
  });

  it("returns subscription when found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { getEventSubscription: vi.fn().mockResolvedValue({ id: "sub-1", eventType: "appointment.created" }) },
    );
    const result = await handleGetEventSubscription(request(), services, "sub-1");
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.eventSubscription.id).toBe("sub-1");
  });
});

describe("event subscription route handlers: POST create", () => {
  it("creates subscription", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateEventSubscription(
      request({ eventType: "appointment.created", notificationTemplateId: "template-1" }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createEventSubscription).toHaveBeenCalledWith("tenant-1", {
      eventType: "appointment.created",
      notificationTemplateId: "template-1",
      isEnabled: undefined,
    });
  });

  it("rejects missing eventType", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateEventSubscription(request({}), services);
    expect(result.status).toBe(400);
  });

  it("rejects extra fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateEventSubscription(request({ eventType: "test", extra: "field" }), services);
    expect(result.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const invalidRequest = new Request("https://builder.lwill.in/api/event-subscriptions", {
      method: "POST", headers: { "content-type": "application/json" }, body: "invalid",
    });
    const result = await handleCreateEventSubscription(invalidRequest, services);
    expect(result.status).toBe(400);
  });
});

describe("event subscription route handlers: PATCH update", () => {
  it("updates subscription", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleUpdateEventSubscription(request({ isEnabled: false }), services, "sub-1");
    expect(result.status).toBe(200);
    expect(services.updateEventSubscription).toHaveBeenCalledWith("tenant-1", "sub-1", { isEnabled: false });
  });

  it("returns 404 when not found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { updateEventSubscription: vi.fn().mockResolvedValue(null) },
    );
    const result = await handleUpdateEventSubscription(request({ isEnabled: false }), services, "sub-missing");
    expect(result.status).toBe(404);
  });

  it("rejects empty body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleUpdateEventSubscription(request({}), services, "sub-1");
    expect(result.status).toBe(400);
  });
});

describe("event subscription route handlers: DELETE", () => {
  it("deletes subscription", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleDeleteEventSubscription(request(), services, "sub-1");
    expect(result.status).toBe(204);
    expect(services.deleteEventSubscription).toHaveBeenCalledWith("tenant-1", "sub-1");
  });

  it("returns 404 when not found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      { deleteEventSubscription: vi.fn().mockResolvedValue(false) },
    );
    const result = await handleDeleteEventSubscription(request(), services, "sub-missing");
    expect(result.status).toBe(404);
  });
});
