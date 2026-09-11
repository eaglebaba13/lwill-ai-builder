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
          deliveryMode: (data.deliveryMode as string | undefined | null) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        logs.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return logs.find((l) => l.id === where.id) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; recipientId?: string } }) => {
        let filtered = logs;
        if (where?.tenantId) {
          filtered = filtered.filter((l) => l.tenantId === where.tenantId);
        }
        if (where?.recipientId) {
          filtered = filtered.filter((l) => l.recipientId === where.recipientId);
        }
        return filtered;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const record = logs.find((l) => l.id === where.id);
        if (!record) throw new Error("not found");
        Object.assign(record, data);
        return record;
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
      deliveryMode: "MOCK",
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      recipientId: "user-1",
      channel: "email",
      subject: "Hello",
      body: "World",
      status: "sent",
      deliveryMode: "MOCK",
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
          deliveryMode: "MOCK",
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
          deliveryMode: "MOCK",
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
          deliveryMode: "MOCK",
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
          deliveryMode: "MOCK",
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

  it("filters logs by recipientId when provided", async () => {
    const { prisma } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
        { id: "l2", tenantId: "t1", recipientId: "user-2", channel: "email", subject: null, body: "B", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
        { id: "l3", tenantId: "t1", recipientId: null, channel: "email", subject: null, body: "C", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.listNotificationLogs({ tenantId: "t1", recipientId: "user-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("l1");
  });

  it("returns all tenant logs when recipientId is not provided", async () => {
    const { prisma } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
        { id: "l2", tenantId: "t1", recipientId: "user-2", channel: "email", subject: null, body: "B", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.listNotificationLogs({ tenantId: "t1" });
    expect(result).toHaveLength(2);
  });
});

describe("notification log service: mark as read", () => {
  it("sets readAt on an unread notification", async () => {
    const { prisma, logs } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.markNotificationAsRead({ tenantId: "t1", logId: "l1", recipientId: "user-1" });

    expect(result).not.toBeNull();
    expect(result?.readAt).toBeInstanceOf(Date);
    expect(logs[0]?.readAt).toBeInstanceOf(Date);
  });

  it("returns the existing record when already read (idempotent)", async () => {
    const alreadyRead = new Date("2026-09-01T10:00:00Z");
    const { prisma } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: alreadyRead, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.markNotificationAsRead({ tenantId: "t1", logId: "l1", recipientId: "user-1" });

    expect(result).not.toBeNull();
    expect(result?.readAt).toEqual(alreadyRead);
  });

  it("returns null when the notification belongs to another tenant", async () => {
    const { prisma } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.markNotificationAsRead({ tenantId: "t2", logId: "l1" });
    expect(result).toBeNull();
  });

  it("returns null when the notification belongs to another recipient", async () => {
    const { prisma } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.markNotificationAsRead({ tenantId: "t1", logId: "l1", recipientId: "user-2" });
    expect(result).toBeNull();
  });

  it("returns null for a non-existent notification", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationLogService(prisma);

    const result = await service.markNotificationAsRead({ tenantId: "t1", logId: "missing" });
    expect(result).toBeNull();
  });

  it("allows mark-as-read without recipientId scoping (admin path)", async () => {
    const { prisma, logs } = createPrisma({
      logs: [
        { id: "l1", tenantId: "t1", recipientId: "user-1", channel: "email", subject: null, body: "A", status: "SENT", errorMessage: null, sentAt: null, deliveredAt: null, readAt: null, deliveryMode: null, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createNotificationLogService(prisma);

    const result = await service.markNotificationAsRead({ tenantId: "t1", logId: "l1" });

    expect(result).not.toBeNull();
    expect(result?.readAt).toBeInstanceOf(Date);
    expect(logs[0]?.readAt).toBeInstanceOf(Date);
  });
});
