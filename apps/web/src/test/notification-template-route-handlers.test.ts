import { describe, expect, it, vi } from "vitest";
import {
  handleCreateNotificationTemplate,
  handleGetNotificationTemplate,
  handleListNotificationTemplates,
  handleUpdateNotificationTemplate,
  type NotificationTemplateAuthorization,
  type NotificationTemplateRouteServices,
} from "../lib/communication/notification-template-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/notification-templates", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: NotificationTemplateAuthorization): NotificationTemplateRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listNotificationTemplates: vi.fn().mockResolvedValue([{ id: "template-1" }]),
    getNotificationTemplate: vi.fn().mockResolvedValue({ id: "template-1" }),
    createNotificationTemplate: vi.fn().mockResolvedValue({ id: "template-1" }),
    updateNotificationTemplate: vi.fn().mockResolvedValue({ id: "template-1" }),
  };
}

describe("notification template route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListNotificationTemplates(request(), services)).status).toBe(401);
    expect(
      (await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "email", body: "Hello" }), services)).status,
    ).toBe(401);
    expect((await handleGetNotificationTemplate(request(), services, "t1")).status).toBe(401);
    expect((await handleUpdateNotificationTemplate(request({ name: "Welcome" }), services, "t1")).status).toBe(401);
    expect(services.listNotificationTemplates).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListNotificationTemplates(request(), services)).status).toBe(403);
    expect(
      (await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "email", body: "Hello" }), services)).status,
    ).toBe(403);
    expect(services.createNotificationTemplate).not.toHaveBeenCalled();
  });
});

describe("notification template route handlers: permission code forwarding", () => {
  it("passes 'notification.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListNotificationTemplates(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("notification.read");

    await handleGetNotificationTemplate(request(), services, "t1");
    expect(services.authorize).toHaveBeenCalledWith("notification.read");
  });

  it("passes 'notification.write' to authorize for create and update operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "email", body: "Hello" }), services);
    expect(services.authorize).toHaveBeenCalledWith("notification.write");

    await handleUpdateNotificationTemplate(request({ name: "Welcome" }), services, "t1");
    expect(services.authorize).toHaveBeenCalledWith("notification.write");
  });
});

describe("notification template route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateNotificationTemplate(request({}), services)).status).toBe(400);
    expect((await handleCreateNotificationTemplate(request({ name: "" }), services)).status).toBe(400);
    expect((await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "" }), services)).status).toBe(400);
    expect((await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "email", body: "" }), services)).status).toBe(400);
    expect(
      (await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "email", body: "Hello", isActive: "yes" }), services)).status,
    ).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleCreateNotificationTemplate(request({ name: "Welcome", channel: "email", body: "Hello", tenantId: "attacker" }), services)).status,
    ).toBe(400);
  });

  it("rejects invalid update input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleUpdateNotificationTemplate(request({}), services, "t1")).status).toBe(400);
    expect((await handleUpdateNotificationTemplate(request({ name: "" }), services, "t1")).status).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateNotificationTemplate(
      request({ name: "Welcome", channel: "email", subject: "Hi", body: "Hello", isActive: false }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createNotificationTemplate).toHaveBeenCalledWith("tenant-1", {
      name: "Welcome",
      channel: "email",
      subject: "Hi",
      body: "Hello",
      isActive: false,
    });
  });

  it("returns 404 for non-existent template", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getNotificationTemplate).mockResolvedValue(null);
    expect((await handleGetNotificationTemplate(request(), services, "missing")).status).toBe(404);
  });

  it("returns 404 when updating a non-existent/cross-tenant template", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.updateNotificationTemplate).mockResolvedValue(null);
    expect((await handleUpdateNotificationTemplate(request({ name: "X" }), services, "missing")).status).toBe(404);
  });
});

describe("notification template route handlers: authorized operations", () => {
  it("returns 200 with template list for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.listNotificationTemplates).mockResolvedValue([
      { id: "t1", name: "Welcome" },
      { id: "t2", name: "Goodbye" },
    ]);
    const result = await handleListNotificationTemplates(request(), services);
    expect(result.status).toBe(200);
    expect(services.listNotificationTemplates).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with template for authorized get", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetNotificationTemplate(request(), services, "t1");
    expect(result.status).toBe(200);
  });
});
