import { describe, expect, it, vi } from "vitest";
import {
  createNotificationLogService,
  type NotificationLogRecord,
  type NotificationLogCreateInput,
} from "./notification-log-service";

function createPrisma(overrides: {
  logs?: NotificationLogRecord[];
} = {}) {
  const logs = overrides.logs ?? [];
  const prisma = {
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
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return logs.find((l) => l.id === where.id) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) => {
        if (where?.tenantId) {
          return logs.filter((l) => l.tenantId === where.tenantId);
        }
        return logs;
      }),
    },
  };

  return { prisma: prisma as never, logs };
}

describe("notification log service", () => {
  it("creates a log with tenantId and required fields", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationLogService(prisma);

    const result = await service.createNotificationLog({
      tenantId: "tenant-1",
      recipientId: "user-1",
      channel: "email",
      subject: "Hello",
      body: "World",
      status: "sent",
      sentAt: new Date(),
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      recipientId: "user-1",
      channel: "email",
      subject: "Hello",
      body: "World",
      status: "sent",
    });
    expect(prisma.notificationLog.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for getNotificationLog when missing", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationLogService(prisma);

    const result = await service.getNotificationLog({ tenantId: "tenant-1", logId: "missing" });
    expect(result).toBeNull();
  });

  it("returns null for cross-tenant getNotificationLog", async () => {
    const { prisma } = createPrisma({
      logs: [
        {
          id: "log-1",
          tenantId: "tenant-1",
          recipientId: "user-1",
          channel: "email",
          subject: "Hello",
          body: "World",
          status: "sent",
          errorMessage: null,
          sentAt: new Date(),
          deliveredAt: null,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.getNotificationLog({ tenantId: "tenant-2", logId: "log-1" });
    expect(result).toBeNull();
  });

  it("returns a log for getNotificationLog when same tenant", async () => {
    const { prisma } = createPrisma({
      logs: [
        {
          id: "log-1",
          tenantId: "tenant-1",
          recipientId: "user-1",
          channel: "email",
          subject: "Hello",
          body: "World",
          status: "sent",
          errorMessage: null,
          sentAt: new Date(),
          deliveredAt: null,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.getNotificationLog({ tenantId: "tenant-1", logId: "log-1" });
    expect(result).toMatchObject({ id: "log-1", channel: "email" });
  });

  it("lists logs scoped to tenant", async () => {
    const { prisma } = createPrisma({
      logs: [
        {
          id: "log-1",
          tenantId: "tenant-1",
          recipientId: "user-1",
          channel: "email",
          subject: "Hello",
          body: "World",
          status: "sent",
          errorMessage: null,
          sentAt: new Date(),
          deliveredAt: null,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "log-2",
          tenantId: "tenant-2",
          recipientId: "user-2",
          channel: "sms",
          subject: null,
          body: "Hi",
          status: "delivered",
          errorMessage: null,
          sentAt: new Date(),
          deliveredAt: new Date(),
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.listNotificationLogs({ tenantId: "tenant-1" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ tenantId: "tenant-1" });
  });
});
