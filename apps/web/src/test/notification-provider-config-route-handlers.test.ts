import { describe, expect, it, vi } from "vitest";
import {
  handleCreateNotificationProviderConfig,
  handleGetNotificationProviderConfig,
  handleListNotificationProviderConfigs,
  handleUpdateNotificationProviderConfig,
  type NotificationProviderConfigAuthorization,
  type NotificationProviderConfigRouteServices,
} from "../lib/communication/notification-provider-config-route-handlers";

function request(body?: unknown, method?: string): Request {
  return new Request("https://builder.lwill.in/api/notification-provider-configs", {
    method: body === undefined ? "GET" : method ?? "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(
  authorization: NotificationProviderConfigAuthorization,
  overrides: Partial<NotificationProviderConfigRouteServices> = {},
): NotificationProviderConfigRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listNotificationProviderConfigs: vi.fn().mockResolvedValue([{ id: "config-1", channel: "email", provider: "smtp", isActive: true }]),
    getNotificationProviderConfig: vi.fn().mockResolvedValue({ id: "config-1", channel: "email", provider: "smtp", isActive: true }),
    createNotificationProviderConfig: vi.fn().mockResolvedValue({ id: "config-1", channel: "email", provider: "smtp", isActive: true }),
    updateNotificationProviderConfig: vi.fn().mockResolvedValue({ id: "config-1", channel: "email", provider: "sendgrid", isActive: true }),
    ...overrides,
  };
}

describe("notification provider config route handlers", () => {
  it("returns 401 for unauthenticated GET", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListNotificationProviderConfigs(request(), services)).status).toBe(401);
  });

  it("returns 403 for unauthorized GET", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListNotificationProviderConfigs(request(), services)).status).toBe(403);
  });

  it("returns authorized configs without secrets", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" }, {
      listNotificationProviderConfigs: vi.fn().mockResolvedValue([{ id: "config-1", tenantId: "tenant-1", channel: "email", provider: "smtp", isActive: true }]),
    });
    const result = await handleListNotificationProviderConfigs(request(), services);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ notificationProviderConfigs: [{ id: "config-1", tenantId: "tenant-1", channel: "email", provider: "smtp", isActive: true }] });
  });

  it("validates and creates authorized provider configs", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateNotificationProviderConfig(request({ channel: "email", provider: "smtp", config: { password: "secret" } }), services)).status).toBe(201);
    expect(services.createNotificationProviderConfig).toHaveBeenCalledWith("tenant-1", { channel: "email", provider: "smtp", isActive: undefined, config: { password: "secret" } });
    expect((await handleCreateNotificationProviderConfig(request({ provider: "smtp" }), services)).status).toBe(400);
  });

  it("returns 401 and 403 for POST as appropriate", async () => {
    expect((await handleCreateNotificationProviderConfig(request({ channel: "email", provider: "smtp" }), createServices({ outcome: "unauthenticated" }))).status).toBe(401);
    expect((await handleCreateNotificationProviderConfig(request({ channel: "email", provider: "smtp" }), createServices({ outcome: "forbidden" }))).status).toBe(403);
  });

  it("gets, updates, and returns 404 for provider config ids", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleGetNotificationProviderConfig(request(), services, "config-1")).status).toBe(200);
    expect((await handleGetNotificationProviderConfig(request(), createServices({ outcome: "authorized", tenantId: "tenant-1" }, { getNotificationProviderConfig: vi.fn().mockResolvedValue(null) }), "missing")).status).toBe(404);
    expect((await handleUpdateNotificationProviderConfig(request({ provider: "sendgrid" }, "PATCH"), services, "config-1")).status).toBe(200);
    expect((await handleUpdateNotificationProviderConfig(request({ provider: "sendgrid" }, "PATCH"), createServices({ outcome: "authorized", tenantId: "tenant-1" }, { updateNotificationProviderConfig: vi.fn().mockResolvedValue(null) }), "missing")).status).toBe(404);
  });

  it("returns 403 for unauthorized PATCH", async () => {
    expect((await handleUpdateNotificationProviderConfig(request({ provider: "sendgrid" }, "PATCH"), createServices({ outcome: "forbidden" }), "config-1")).status).toBe(403);
  });
});
