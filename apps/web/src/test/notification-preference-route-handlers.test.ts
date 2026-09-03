import { describe, expect, it, vi } from "vitest";
import {
  handleListNotificationPreferences,
  handleCreateNotificationPreference,
  handleUpdateNotificationPreference,
  type NotificationPreferenceAuthorization,
  type NotificationPreferenceRouteServices,
} from "../lib/communication/notification-preference-route-handlers";

function request(body?: unknown, method?: string): Request {
  return new Request("https://builder.lwill.in/api/notification-preferences", {
    method: body === undefined ? "GET" : (method ?? "POST"),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: NotificationPreferenceAuthorization, overrides: Partial<NotificationPreferenceRouteServices> = {}): NotificationPreferenceRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listNotificationPreferences: vi.fn().mockResolvedValue([]),
    createNotificationPreference: vi.fn().mockResolvedValue({
      id: "pref-1",
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateNotificationPreference: vi.fn().mockResolvedValue({
      id: "pref-1",
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
      isEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    ...overrides,
  };
}

describe("notification preference route handlers: authentication/authorization gating", () => {
  it("GET returns 401 for unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleListNotificationPreferences(request(), services);
    expect(result.status).toBe(401);
    expect(services.listNotificationPreferences).not.toHaveBeenCalled();
  });

  it("POST returns 401 for unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleCreateNotificationPreference(request({ channel: "email" }), services);
    expect(result.status).toBe(401);
    expect(services.createNotificationPreference).not.toHaveBeenCalled();
  });

  it("PATCH returns 401 for unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleUpdateNotificationPreference(request({ channel: "email", isEnabled: false }), services);
    expect(result.status).toBe(401);
    expect(services.updateNotificationPreference).not.toHaveBeenCalled();
  });

  it("GET returns 403 for forbidden caller", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleListNotificationPreferences(request(), services);
    expect(result.status).toBe(403);
  });

  it("POST returns 403 for forbidden caller", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleCreateNotificationPreference(request({ channel: "email" }), services);
    expect(result.status).toBe(403);
  });

  it("PATCH returns 403 for forbidden caller", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleUpdateNotificationPreference(request({ channel: "email", isEnabled: false }), services);
    expect(result.status).toBe(403);
  });
});

describe("notification preference route handlers: GET", () => {
  it("returns tenant-scoped preferences for authorized caller", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1", userId: "user-1" },
      {
        listNotificationPreferences: vi.fn().mockResolvedValue([
          { id: "pref-1", tenantId: "tenant-1", userId: "user-1", channel: "email", isEnabled: true },
          { id: "pref-2", tenantId: "tenant-1", userId: "user-1", channel: "sms", isEnabled: false },
        ]),
      },
    );
    const result = await handleListNotificationPreferences(request(), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.notificationPreferences).toHaveLength(2);
    expect(services.listNotificationPreferences).toHaveBeenCalledWith("tenant-1", "user-1");
  });
});

describe("notification preference route handlers: POST", () => {
  it("creates a preference for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleCreateNotificationPreference(request({ channel: "email" }), services);
    expect(result.status).toBe(201);
    const body = await result.json();
    expect(body.notificationPreference).toBeDefined();
    expect(body.notificationPreference.channel).toBe("email");
    expect(services.createNotificationPreference).toHaveBeenCalledWith("tenant-1", "user-1", { channel: "email", isEnabled: undefined });
  });

  it("creates a preference with isEnabled", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleCreateNotificationPreference(request({ channel: "sms", isEnabled: false }), services);
    expect(result.status).toBe(201);
    expect(services.createNotificationPreference).toHaveBeenCalledWith("tenant-1", "user-1", { channel: "sms", isEnabled: false });
  });

  it("rejects missing channel", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleCreateNotificationPreference(request({}), services);
    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error).toContain("channel");
  });

  it("rejects empty channel", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleCreateNotificationPreference(request({ channel: "" }), services);
    expect(result.status).toBe(400);
  });

  it("rejects invalid isEnabled type", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleCreateNotificationPreference(request({ channel: "email", isEnabled: "yes" }), services);
    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error).toContain("isEnabled");
  });

  it("rejects extra fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleCreateNotificationPreference(request({ channel: "email", extra: "field" }), services);
    expect(result.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const invalidRequest = new Request("https://builder.lwill.in/api/notification-preferences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "invalid json",
    });
    const result = await handleCreateNotificationPreference(invalidRequest, services);
    expect(result.status).toBe(400);
  });
});

describe("notification preference route handlers: PATCH", () => {
  it("updates a preference for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateNotificationPreference(request({ channel: "email", isEnabled: false }), services);
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.notificationPreference).toBeDefined();
    expect(services.updateNotificationPreference).toHaveBeenCalledWith("tenant-1", "user-1", "email", { isEnabled: false });
  });

  it("returns 404 when preference not found", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1", userId: "user-1" },
      { updateNotificationPreference: vi.fn().mockResolvedValue(null) },
    );
    const result = await handleUpdateNotificationPreference(request({ channel: "nonexistent", isEnabled: false }), services);
    expect(result.status).toBe(404);
  });

  it("rejects missing channel", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateNotificationPreference(request({ isEnabled: false }), services);
    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error).toContain("channel");
  });

  it("rejects missing isEnabled", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateNotificationPreference(request({ channel: "email" }), services);
    expect(result.status).toBe(400);
    const body = await result.json();
    expect(body.error).toContain("isEnabled");
  });

  it("rejects empty body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateNotificationPreference(request({}), services);
    expect(result.status).toBe(400);
  });

  it("rejects extra fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1", userId: "user-1" });
    const result = await handleUpdateNotificationPreference(request({ channel: "email", isEnabled: false, extra: "field" }), services);
    expect(result.status).toBe(400);
  });
});
