import { describe, expect, it, vi } from "vitest";
import { createNotificationQueueProcessorService, type NotificationQueueProcessorResult } from "./notification-queue-processor-service";
import type { NotificationQueueRecord } from "./notification-queue-service";
import type { NotificationTemplateRecord } from "./notification-template-service";

function createPrisma(overrides: {
  templates?: NotificationTemplateRecord[];
  queues?: NotificationQueueRecord[];
} = {}) {
  const templates = overrides.templates ?? [];
  const queues = overrides.queues ?? [];

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
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; status?: string } }) => {
        let filtered = queues;
        if (where?.tenantId) {
          filtered = filtered.filter((q) => q.tenantId === where.tenantId);
        }
        if (where?.status) {
          filtered = filtered.filter((q) => q.status === where.status);
        }
        return filtered;
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
        return {
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
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    },
  };

  return { prisma: prisma as never, templates, queues };
}

describe("notification queue processor service", () => {
  it("processes pending queue items successfully", async () => {
    const { prisma, templates, queues } = createPrisma();
    const processor = createNotificationQueueProcessorService(prisma);

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

    queues.push({
      id: "queue-1",
      tenantId: "tenant-1",
      templateId: "template-1",
      recipientId: "user-1",
      channel: "email",
      subject: "Welcome",
      body: "Hello {{name}}",
      variables: { name: "Alice" },
      status: "PENDING",
      scheduledAt: null,
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      nextAttemptAt: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result: NotificationQueueProcessorResult = await processor({ tenantId: "tenant-1" });

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(queues[0]?.status).toBe("SENT");
  });

  it("skips items with future nextAttemptAt", async () => {
    const { prisma, queues } = createPrisma();
    const processor = createNotificationQueueProcessorService(prisma);

    queues.push({
      id: "queue-1",
      tenantId: "tenant-1",
      templateId: "template-1",
      recipientId: "user-1",
      channel: "email",
      subject: "Welcome",
      body: "Hello",
      variables: null,
      status: "PENDING",
      scheduledAt: null,
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      nextAttemptAt: new Date(Date.now() + 60_000),
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result: NotificationQueueProcessorResult = await processor({ tenantId: "tenant-1" });

    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("marks failed when template is missing", async () => {
    const { prisma, queues } = createPrisma();
    const processor = createNotificationQueueProcessorService(prisma);

    queues.push({
      id: "queue-1",
      tenantId: "tenant-1",
      templateId: "missing",
      recipientId: "user-1",
      channel: "email",
      subject: "Welcome",
      body: "Hello",
      variables: null,
      status: "PENDING",
      scheduledAt: null,
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      nextAttemptAt: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result: NotificationQueueProcessorResult = await processor({ tenantId: "tenant-1" });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0]?.error).toBe("template not found");
    expect(queues[0]?.status).toBe("FAILED");
  });
});
