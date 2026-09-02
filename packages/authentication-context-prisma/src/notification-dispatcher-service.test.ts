import { describe, expect, it, vi } from "vitest";
import { createNotificationDispatcherService, type NotificationDispatchInput } from "./notification-dispatcher-service";
import { createMockChannelAdapter, createFailingChannelAdapter } from "./notification-channel-adapter";
import type { NotificationQueueRecord } from "./notification-queue-service";
import type { NotificationTemplateRecord } from "./notification-template-service";
import type { NotificationLogRecord } from "./notification-log-service";

function createPrisma(overrides: {
  templates?: NotificationTemplateRecord[];
  queues?: NotificationQueueRecord[];
  logs?: NotificationLogRecord[];
} = {}) {
  const templates = overrides.templates ?? [];
  const queues = overrides.queues ?? [];
  const logs = overrides.logs ?? [];

  const prisma: Record<string, unknown> = {
    notificationTemplate: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return templates.find((t) => t.id === where.id) ?? null;
      }),
    },
    notificationQueue: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return queues.find((q) => q.id === where.id) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `queue-${Date.now()}`,
          tenantId: data.tenantId as string,
          templateId: data.templateId as string,
          recipientId: data.recipientId ?? null,
          channel: data.channel as string,
          subject: data.subject ?? null,
          body: data.body as string,
          variables: data.variables ?? null,
          status: (data.status ?? "PENDING") as string,
          scheduledAt: data.scheduledAt ?? null,
          attempts: (data.attempts ?? 0) as number,
          maxAttempts: (data.maxAttempts ?? 3) as number,
          lastAttemptAt: data.lastAttemptAt ?? null,
          nextAttemptAt: data.nextAttemptAt ?? null,
          errorMessage: data.errorMessage ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        queues.push(record);
        return record;
      }),
      update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
        const index = queues.findIndex((q) => q.id === where.id);
        if (index === -1) {
          throw new Error("not found");
        }
        const updated = {
          ...queues[index],
          ...data,
          updatedAt: new Date(),
        } as NotificationQueueRecord;
        queues[index] = updated;
        return updated;
      }),
    },
    notificationLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `log-${Date.now()}`,
          tenantId: data.tenantId as string,
          recipientId: data.recipientId ?? null,
          channel: data.channel as string,
          subject: data.subject ?? null,
          body: data.body as string,
          status: data.status as string,
          errorMessage: data.errorMessage ?? null,
          sentAt: data.sentAt ?? null,
          deliveredAt: data.deliveredAt ?? null,
          readAt: data.readAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        logs.push(record);
        return record;
      }),
    },
  };

  return { prisma: prisma as never, templates, queues, logs };
}

describe("notification dispatcher service", () => {
  it("dispatches notification successfully with mock adapter", async () => {
    const { prisma, templates } = createPrisma();
    const service = createNotificationDispatcherService(prisma as never);

    templates.push({
      id: "template-1",
      tenantId: "tenant-1",
      name: "Welcome",
      channel: "email",
      subject: "Welcome",
      body: "Hello {{name}}",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.dispatchNotification({
      tenantId: "tenant-1",
      templateId: "template-1",
      recipientId: "user-1",
      variables: { name: "Alice" },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("SENT");
    expect(result.queueId).toBeTruthy();
    expect(result.logId).toBeTruthy();
    expect(result.errorMessage).toBeNull();
  });

  it("renders template variables", async () => {
    const { prisma, templates } = createPrisma();
    const service = createNotificationDispatcherService(prisma as never);

    templates.push({
      id: "template-1",
      tenantId: "tenant-1",
      name: "Welcome",
      channel: "email",
      subject: "Welcome",
      body: "Hello {{name}}",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.dispatchNotification({
      tenantId: "tenant-1",
      templateId: "template-1",
      variables: { name: "Bob" },
    });

    expect(result.success).toBe(true);
    expect(prisma.notificationLog.create).toHaveBeenCalledTimes(1);
  });

  it("throws for missing template", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationDispatcherService(prisma as never);

    await expect(
      service.dispatchNotification({
        tenantId: "tenant-1",
        templateId: "missing",
        recipientId: "user-1",
      }),
    ).rejects.toThrow("notification template not found");
  });

  it("throws for inactive template", async () => {
    const { prisma, templates } = createPrisma();
    const service = createNotificationDispatcherService(prisma as never);

    templates.push({
      id: "template-1",
      tenantId: "tenant-1",
      name: "Welcome",
      channel: "email",
      subject: "Welcome",
      body: "Hello",
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.dispatchNotification({
        tenantId: "tenant-1",
        templateId: "template-1",
        recipientId: "user-1",
      }),
    ).rejects.toThrow("notification template is inactive");
  });

  it("handles adapter failure gracefully", async () => {
    const { prisma, templates } = createPrisma();
    const service = createNotificationDispatcherService(prisma as never);

    templates.push({
      id: "template-1",
      tenantId: "tenant-1",
      name: "Welcome",
      channel: "email",
      subject: "Welcome",
      body: "Hello",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.dispatchNotification({
      tenantId: "tenant-1",
      templateId: "template-1",
      adapter: createFailingChannelAdapter("provider error"),
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("provider error");
  });
});
