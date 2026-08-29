export interface NotificationLogRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly recipientId: string | null;
  readonly channel: string;
  readonly subject: string | null;
  readonly body: string;
  readonly status: string;
  readonly errorMessage: string | null;
  readonly sentAt: Date | null;
  readonly deliveredAt: Date | null;
  readonly readAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NotificationLogCreateInput {
  readonly tenantId: string;
  readonly recipientId?: string | null;
  readonly channel: string;
  readonly subject?: string | null;
  readonly body: string;
  readonly status: string;
  readonly errorMessage?: string | null;
  readonly sentAt?: Date | null;
  readonly deliveredAt?: Date | null;
  readonly readAt?: Date | null;
}

export interface NotificationLogService {
  createNotificationLog(input: NotificationLogCreateInput): Promise<NotificationLogRecord>;
  getNotificationLog(args: { tenantId: string; logId: string }): Promise<NotificationLogRecord | null>;
  listNotificationLogs(args: { tenantId: string }): Promise<readonly NotificationLogRecord[]>;
}

interface NotificationLogPrismaClient {
  readonly notificationLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<NotificationLogRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<NotificationLogRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<NotificationLogRecord[]>;
  };
}

export function createNotificationLogService(prisma: NotificationLogPrismaClient): NotificationLogService {
  return {
    async createNotificationLog(input) {
      return prisma.notificationLog.create({
        data: {
          tenantId: input.tenantId,
          recipientId: input.recipientId ?? null,
          channel: input.channel,
          subject: input.subject ?? null,
          body: input.body,
          status: input.status,
          errorMessage: input.errorMessage ?? null,
          sentAt: input.sentAt ?? null,
          deliveredAt: input.deliveredAt ?? null,
          readAt: input.readAt ?? null,
        },
      });
    },
    async getNotificationLog({ tenantId, logId }) {
      const log = await prisma.notificationLog.findUnique({ where: { id: logId } });
      if (log === null || log.tenantId !== tenantId) {
        return null;
      }
      return log;
    },
    async listNotificationLogs({ tenantId }) {
      return prisma.notificationLog.findMany({ where: { tenantId } });
    },
  };
}
