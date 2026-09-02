import { describe, expect, it, vi } from "vitest";
import {
  createNotificationQueueService,
  type NotificationQueueRecord,
  type NotificationQueueCreateInput,
  type NotificationQueueUpdateInput,
} from "./notification-queue-service";

function createPrisma(overrides: { queues?: NotificationQueueRecord[] } = {}) {
  const queues = overrides.queues ?? [];
  const prisma = {
    notificationQueue: {
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
  };

  return { prisma: prisma as never, queues };
}

describe("notification queue service", () => {
  it("creates a queue entry with defaults", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationQueueService(prisma);

    const result = await service.createNotificationQueue({
      tenantId: "tenant-1",
      templateId: "template-1",
      channel: "email",
      body: "Hello {{name}}",
      variables: { name: "Alice" },
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      templateId: "template-1",
      channel: "email",
      body: "Hello {{name}}",
      variables: { name: "Alice" },
      status: "PENDING",
      attempts: 0,
      maxAttempts: 3,
    });
    expect(prisma.notificationQueue.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for getNotificationQueue when missing", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationQueueService(prisma);

    const result = await service.getNotificationQueue({ tenantId: "tenant-1", queueId: "missing" });
    expect(result).toBeNull();
  });

  it("filters list by tenant and status", async () => {
    const { prisma, queues } = createPrisma();
    const service = createNotificationQueueService(prisma);

    queues.push({
      id: "queue-1",
      tenantId: "tenant-1",
      templateId: "template-1",
      recipientId: "user-1",
      channel: "email",
      subject: null,
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

    const result = await service.listNotificationQueues({ tenantId: "tenant-1", status: "PENDING" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("queue-1");
  });
});
