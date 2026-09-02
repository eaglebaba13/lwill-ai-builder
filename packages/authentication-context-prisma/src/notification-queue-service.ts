export interface NotificationQueueRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly templateId: string;
  readonly recipientId: string | null;
  readonly channel: string;
  readonly subject: string | null;
  readonly body: string;
  readonly variables: Record<string, unknown> | null;
  readonly status: string;
  readonly scheduledAt: Date | null;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly lastAttemptAt: Date | null;
  readonly nextAttemptAt: Date | null;
  readonly errorMessage: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NotificationQueueCreateInput {
  readonly tenantId: string;
  readonly templateId: string;
  readonly recipientId?: string | null;
  readonly channel: string;
  readonly subject?: string | null;
  readonly body: string;
  readonly variables?: Record<string, unknown> | null;
  readonly status?: string;
  readonly scheduledAt?: Date | null;
  readonly maxAttempts?: number;
  readonly nextAttemptAt?: Date | null;
}

export interface NotificationQueueUpdateInput {
  readonly status?: string;
  readonly attempts?: number;
  readonly lastAttemptAt?: Date | null;
  readonly nextAttemptAt?: Date | null;
  readonly errorMessage?: string | null;
}

export interface NotificationQueueService {
  createNotificationQueue(input: NotificationQueueCreateInput): Promise<NotificationQueueRecord>;
  getNotificationQueue(args: { tenantId: string; queueId: string }): Promise<NotificationQueueRecord | null>;
  listNotificationQueues(args: { tenantId: string; status?: string }): Promise<readonly NotificationQueueRecord[]>;
  updateNotificationQueue(args: { tenantId: string; queueId: string; input: NotificationQueueUpdateInput }): Promise<NotificationQueueRecord | null>;
}

interface NotificationQueuePrismaClient {
  readonly notificationQueue: {
    create: (args: { data: Record<string, unknown> }) => Promise<NotificationQueueRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<NotificationQueueRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<NotificationQueueRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<NotificationQueueRecord>;
  };
}

export function createNotificationQueueService(prisma: NotificationQueuePrismaClient): NotificationQueueService {
  return {
    async createNotificationQueue(input) {
      return prisma.notificationQueue.create({
        data: {
          tenantId: input.tenantId,
          templateId: input.templateId,
          recipientId: input.recipientId ?? null,
          channel: input.channel,
          subject: input.subject ?? null,
          body: input.body,
          variables: input.variables ?? undefined,
          status: input.status ?? "PENDING",
          scheduledAt: input.scheduledAt ?? undefined,
          maxAttempts: input.maxAttempts ?? 3,
          nextAttemptAt: input.nextAttemptAt ?? undefined,
        },
      });
    },
    async getNotificationQueue({ tenantId, queueId }) {
      const queue = await prisma.notificationQueue.findUnique({ where: { id: queueId } });
      if (queue === null || queue.tenantId !== tenantId) {
        return null;
      }
      return queue;
    },
    async listNotificationQueues({ tenantId, status }) {
      const where: Record<string, unknown> = { tenantId };
      if (status !== undefined && status !== null && status !== "") {
        where.status = status;
      }
      return prisma.notificationQueue.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    },
    async updateNotificationQueue({ tenantId, queueId, input }) {
      const existing = await prisma.notificationQueue.findUnique({ where: { id: queueId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.status !== undefined) data.status = input.status;
      if (input.attempts !== undefined) data.attempts = input.attempts;
      if (input.lastAttemptAt !== undefined) data.lastAttemptAt = input.lastAttemptAt;
      if (input.nextAttemptAt !== undefined) data.nextAttemptAt = input.nextAttemptAt;
      if (input.errorMessage !== undefined) data.errorMessage = input.errorMessage;
      return prisma.notificationQueue.update({ where: { id: queueId }, data });
    },
  };
}
