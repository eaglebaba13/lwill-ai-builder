import { createNotificationQueueService, type NotificationQueueCreateInput, type NotificationQueueUpdateInput } from "./notification-queue-service";
import { createNotificationLogService, type NotificationLogCreateInput } from "./notification-log-service";
import { createNotificationTemplateService, type NotificationTemplateRecord } from "./notification-template-service";
import { createMockChannelAdapter, createInAppChannelAdapter, createFailingChannelAdapter, type NotificationChannelAdapter, type NotificationDeliveryResult } from "./notification-channel-adapter";
import { renderVariables } from "./notification-variable-renderer";

export interface NotificationDispatchInput {
  readonly tenantId: string;
  readonly templateId: string;
  readonly recipientId?: string | null;
  readonly variables?: Record<string, unknown> | null;
  readonly scheduledAt?: Date | null;
  readonly channel?: string | null;
  readonly adapter?: NotificationChannelAdapter | null;
}

export interface NotificationDispatchResult {
  readonly success: boolean;
  readonly status: string;
  readonly queueId: string;
  readonly logId: string;
  readonly errorMessage: string | null;
  readonly deliveryMode: "MOCK" | "REAL";
}

interface NotificationDispatcherPrismaClient {
  readonly notificationTemplate: {
    findUnique: (args: { where: { id: string }; include?: Record<string, unknown> }) => Promise<NotificationTemplateRecord | null>;
  };
}

export interface NotificationDispatcherService {
  dispatchNotification(input: NotificationDispatchInput): Promise<NotificationDispatchResult>;
}

export function createNotificationDispatcherService(prisma: NotificationDispatcherPrismaClient): NotificationDispatcherService {
  const templateService = createNotificationTemplateService(prisma as never);
  const queueService = createNotificationQueueService(prisma as never);
  const logService = createNotificationLogService(prisma as never);

  function resolveAdapter(channel: string, providedAdapter: NotificationChannelAdapter | null | undefined): NotificationChannelAdapter {
    if (providedAdapter !== null && providedAdapter !== undefined) {
      return providedAdapter;
    }
    const normalized = channel.toLowerCase();
    if (normalized === "email" || normalized === "sms" || normalized === "whatsapp" || normalized === "push") {
      return createMockChannelAdapter();
    }
    if (normalized === "in-app") {
      return createInAppChannelAdapter();
    }
    return createMockChannelAdapter();
  }

  return {
    async dispatchNotification(input) {
      const template = await templateService.getNotificationTemplate({ tenantId: input.tenantId, templateId: input.templateId });
      if (template === null) {
        throw new Error("notification template not found");
      }
      if (!template.isActive) {
        throw new Error("notification template is inactive");
      }

      const channel = (input.channel ?? template.channel).toLowerCase();
      if (!channel) {
        throw new Error("notification channel is required");
      }

      const { rendered, missingVariables } = renderVariables(template.body, input.variables ?? null);
      if (missingVariables.length > 0) {
        throw new Error(`missing template variables: ${missingVariables.join(", ")}`);
      }

      const subject = template.subject ?? null;
      const body = rendered;

      const queueInput: NotificationQueueCreateInput = {
        tenantId: input.tenantId,
        templateId: input.templateId,
        recipientId: input.recipientId ?? null,
        channel,
        subject,
        body,
        variables: input.variables ?? null,
        status: "PENDING",
        scheduledAt: input.scheduledAt ?? null,
        maxAttempts: 3,
        nextAttemptAt: input.scheduledAt ?? new Date(),
      };

      const queue = await queueService.createNotificationQueue(queueInput);

      const adapter = resolveAdapter(channel, input.adapter ?? null);
      const sentAt = new Date();

      let deliveryResult: NotificationDeliveryResult;
      try {
        deliveryResult = await adapter.send({
          recipientId: input.recipientId ?? null,
          channel,
          subject,
          body,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "adapter failed";
        await queueService.updateNotificationQueue({
          tenantId: input.tenantId,
          queueId: queue.id,
          input: {
            status: "FAILED",
            attempts: 1,
            lastAttemptAt: sentAt,
            nextAttemptAt: null,
            errorMessage,
          },
        });

        const logInput: NotificationLogCreateInput = {
          tenantId: input.tenantId,
          recipientId: input.recipientId ?? null,
          channel,
          subject,
          body,
          status: "FAILED",
          errorMessage,
          sentAt,
          deliveryMode: "MOCK",
        };

        const log = await logService.createNotificationLog(logInput);
        return {
          success: false,
          status: "FAILED",
          queueId: queue.id,
          logId: log.id,
          errorMessage,
          deliveryMode: "MOCK",
        };
      }

      const status = deliveryResult.success ? "SENT" : "FAILED";
      const nextAttemptAt = deliveryResult.success ? null : new Date(Date.now() + 60_000);

      await queueService.updateNotificationQueue({
        tenantId: input.tenantId,
        queueId: queue.id,
        input: {
          status,
          attempts: 1,
          lastAttemptAt: deliveryResult.sentAt ?? sentAt,
          nextAttemptAt,
          errorMessage: deliveryResult.errorMessage,
        },
      });

      const logInput: NotificationLogCreateInput = {
        tenantId: input.tenantId,
        recipientId: input.recipientId ?? null,
        channel,
        subject,
        body,
        status,
        errorMessage: deliveryResult.errorMessage,
        sentAt: deliveryResult.sentAt ?? sentAt,
        deliveredAt: deliveryResult.deliveredAt,
        deliveryMode: deliveryResult.deliveryMode,
      };

      const log = await logService.createNotificationLog(logInput);
      return {
        success: deliveryResult.success,
        status,
        queueId: queue.id,
        logId: log.id,
        errorMessage: deliveryResult.errorMessage,
        deliveryMode: deliveryResult.deliveryMode,
      };
    },
  };
}
