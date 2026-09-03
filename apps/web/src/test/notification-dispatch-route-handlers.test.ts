import { describe, expect, it, vi } from "vitest";
import {
  handleDispatchNotification,
  type NotificationDispatchAuthorization,
  type NotificationDispatchRouteServices,
} from "../lib/communication/notification-dispatch-route-handlers";

function request(body?: unknown): Request {
  return new Request("https://builder.lwill.in/api/notifications/dispatch", {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createServices(authorization: NotificationDispatchAuthorization, dispatchResult: unknown = {}): NotificationDispatchRouteServices {
  return {
    authorize: vi.fn().mockResolvedValue(authorization),
    dispatchNotification: vi.fn().mockResolvedValue(dispatchResult),
  };
}

describe("notification dispatch route handlers: authentication/authorization gating", () => {
  it("returns 401 for an unauthenticated caller", async () => {
    const services = createServices({ outcome: "unauthenticated" });
    const result = await handleDispatchNotification(
      request({ templateId: "template-1", channel: "email", body: "Hello" }),
      services,
    );
    expect(result.status).toBe(401);
    expect(services.dispatchNotification).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated caller lacking the permission", async () => {
    const services = createServices({ outcome: "forbidden" });
    const result = await handleDispatchNotification(
      request({ templateId: "template-1", channel: "email", body: "Hello" }),
      services,
    );
    expect(result.status).toBe(403);
    expect(services.dispatchNotification).not.toHaveBeenCalled();
  });
});

describe("notification dispatch route handlers: input validation", () => {
  it("rejects missing templateId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleDispatchNotification(request({}), services)).status).toBe(400);
  });

  it("rejects empty templateId", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleDispatchNotification(request({ templateId: "" }), services)).status).toBe(400);
  });

  it("rejects non-object body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    expect((await handleDispatchNotification(request("invalid"), services)).status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const services = createServices({ outcome: "authorized", tenantId: "tenant-1" });
    const invalidRequest = new Request("https://builder.lwill.in/api/notifications/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "invalid json",
    });
    expect((await handleDispatchNotification(invalidRequest, services)).status).toBe(400);
  });
});

describe("notification dispatch route handlers: successful dispatch", () => {
  it("returns 200 with dispatch result for authorized caller", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        success: true,
        status: "SENT",
        queueId: "queue-1",
        logId: "log-1",
        errorMessage: null,
        deliveryMode: "MOCK",
      },
    );

    const result = await handleDispatchNotification(
      request({
        templateId: "template-1",
        recipientId: "user-1",
        channel: "email",
        variables: { name: "Alice" },
      }),
      services,
    );

    expect(result.status).toBe(200);
    expect(services.authorize).toHaveBeenCalledWith("notification.write");
    expect(services.dispatchNotification).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      templateId: "template-1",
      recipientId: "user-1",
      channel: "email",
      variables: { name: "Alice" },
      scheduledAt: null,
    });
  });

  it("preserves deliveryMode in API response", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        success: true,
        status: "SENT",
        queueId: "queue-1",
        logId: "log-1",
        errorMessage: null,
        deliveryMode: "MOCK",
      },
    );

    const result = await handleDispatchNotification(
      request({
        templateId: "template-1",
        recipientId: "user-1",
        channel: "email",
        variables: { name: "Alice" },
      }),
      services,
    );

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toHaveProperty("dispatch");
    expect(body.dispatch).toHaveProperty("deliveryMode", "MOCK");
  });

  it("returns QUEUED status for future scheduled notification", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        success: false,
        status: "QUEUED",
        queueId: "queue-1",
        logId: "log-1",
        errorMessage: null,
        deliveryMode: null,
      },
    );

    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    const result = await handleDispatchNotification(
      request({
        templateId: "template-1",
        recipientId: "user-1",
        channel: "email",
        scheduledAt: futureDate.toISOString(),
      }),
      services,
    );

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.dispatch.status).toBe("QUEUED");
    expect(body.dispatch.deliveryMode).toBeNull();
    expect(body.dispatch.queueId).toBe("queue-1");
  });

  it("normalizes scheduledAt string to Date before passing to dispatcher", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        success: false,
        status: "QUEUED",
        queueId: "queue-1",
        logId: "log-1",
        errorMessage: null,
        deliveryMode: null,
      },
    );

    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    await handleDispatchNotification(
      request({
        templateId: "template-1",
        recipientId: "user-1",
        scheduledAt: futureDate.toISOString(),
      }),
      services,
    );

    expect(services.dispatchNotification).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(services.dispatchNotification).mock.calls[0]?.[0];
    expect(callArg?.scheduledAt).toBeInstanceOf(Date);
    expect(callArg?.scheduledAt?.getTime()).toBe(futureDate.getTime());
  });

  it("passes null scheduledAt when not provided", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        success: true,
        status: "SENT",
        queueId: "queue-1",
        logId: "log-1",
        errorMessage: null,
        deliveryMode: "MOCK",
      },
    );

    await handleDispatchNotification(
      request({
        templateId: "template-1",
        recipientId: "user-1",
      }),
      services,
    );

    expect(services.dispatchNotification).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(services.dispatchNotification).mock.calls[0]?.[0];
    expect(callArg?.scheduledAt).toBeNull();
  });

  it("normalizes past scheduledAt string to Date", async () => {
    const services = createServices(
      { outcome: "authorized", tenantId: "tenant-1" },
      {
        success: true,
        status: "SENT",
        queueId: "queue-1",
        logId: "log-1",
        errorMessage: null,
        deliveryMode: "MOCK",
      },
    );

    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    await handleDispatchNotification(
      request({
        templateId: "template-1",
        recipientId: "user-1",
        scheduledAt: pastDate.toISOString(),
      }),
      services,
    );

    expect(services.dispatchNotification).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(services.dispatchNotification).mock.calls[0]?.[0];
    expect(callArg?.scheduledAt).toBeInstanceOf(Date);
    expect(callArg?.scheduledAt?.getTime()).toBe(pastDate.getTime());
  });
});
