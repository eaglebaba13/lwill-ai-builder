import { describe, expect, it, vi } from "vitest";
import {
  handleCreateNotificationLog,
  handleGetNotificationLog,
  handleListNotificationLogs,
  type NotificationLogAuthorization,
  type NotificationLogRouteServices,
} from "../lib/communication/notification-log-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/notification-logs", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: NotificationLogAuthorization): NotificationLogRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    listNotificationLogs: vi.fn().mockResolvedValue([{ id: "log-1" }]),
    getNotificationLog: vi.fn().mockResolvedValue({ id: "log-1" }),
    createNotificationLog: vi.fn().mockResolvedValue({ id: "log-1" }),
  };
}

describe("notification log route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller on every operation", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    expect((await handleListNotificationLogs(request(), services)).status).toBe(401);
    expect(
      (await handleCreateNotificationLog(request({ channel: "email", body: "Hello", status: "sent" }), services)).status,
    ).toBe(401);
    expect((await handleGetNotificationLog(request(), services, "l1")).status).toBe(401);
    expect(services.listNotificationLogs).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    expect((await handleListNotificationLogs(request(), services)).status).toBe(403);
    expect(
      (await handleCreateNotificationLog(request({ channel: "email", body: "Hello", status: "sent" }), services)).status,
    ).toBe(403);
    expect(services.createNotificationLog).not.toHaveBeenCalled();
  });
});

describe("notification log route handlers: permission code forwarding", () => {
  it("passes 'notification.read' to authorize for list and get operations", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleListNotificationLogs(request(), services);
    expect(services.authorize).toHaveBeenCalledWith("notification.read");

    await handleGetNotificationLog(request(), services, "l1");
    expect(services.authorize).toHaveBeenCalledWith("notification.read");
  });

  it("passes 'notification.write' to authorize for create operation", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    await handleCreateNotificationLog(request({ channel: "email", body: "Hello", status: "sent" }), services);
    expect(services.authorize).toHaveBeenCalledWith("notification.write");
  });
});

describe("notification log route handlers: input validation", () => {
  it("rejects invalid create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleCreateNotificationLog(request({}), services)).status).toBe(400);
    expect((await handleCreateNotificationLog(request({ channel: "" }), services)).status).toBe(400);
    expect((await handleCreateNotificationLog(request({ channel: "email", body: "" }), services)).status).toBe(400);
    expect((await handleCreateNotificationLog(request({ channel: "email", body: "Hello", status: "" }), services)).status).toBe(400);
  });

  it("rejects unknown keys in create input", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect(
      (await handleCreateNotificationLog(request({ channel: "email", body: "Hello", status: "sent", tenantId: "attacker" }), services)).status,
    ).toBe(400);
  });

  it("accepts create with valid optional fields", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleCreateNotificationLog(
      request({
        recipientId: "user-1",
        channel: "email",
        subject: "Hi",
        body: "Hello",
        status: "sent",
        sentAt: "2024-01-01T00:00:00.000Z",
      }),
      services,
    );
    expect(result.status).toBe(201);
    expect(services.createNotificationLog).toHaveBeenCalledWith("tenant-1", {
      recipientId: "user-1",
      channel: "email",
      subject: "Hi",
      body: "Hello",
      status: "sent",
      errorMessage: null,
      sentAt: expect.any(Date),
      deliveredAt: null,
      readAt: null,
    });
  });

  it("returns 404 for non-existent log", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.getNotificationLog).mockResolvedValue(null);
    expect((await handleGetNotificationLog(request(), services, "missing")).status).toBe(404);
  });
});

describe("notification log route handlers: authorized operations", () => {
  it("returns 200 with log list for authorized caller", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    vi.mocked(services.listNotificationLogs).mockResolvedValue([
      { id: "log-1", channel: "email", status: "sent" },
      { id: "log-2", channel: "sms", status: "delivered" },
    ]);
    const result = await handleListNotificationLogs(request(), services);
    expect(result.status).toBe(200);
    expect(services.listNotificationLogs).toHaveBeenCalledWith("tenant-1");
  });

  it("returns 200 with log for authorized get", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const result = await handleGetNotificationLog(request(), services, "l1");
    expect(result.status).toBe(200);
  });
});
