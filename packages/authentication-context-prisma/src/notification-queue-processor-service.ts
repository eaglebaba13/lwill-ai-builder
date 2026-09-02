import { createNotificationQueueService, type NotificationQueueRecord } from "./notification-queue-service";
import { createNotificationLogService, type NotificationLogCreateInput } from "./notification-log-service";
import { createNotificationTemplateService, type NotificationTemplateRecord } from "./notification-template-service";
import { createMockChannelAdapter, createInAppChannelAdapter, type NotificationChannelAdapter, type NotificationDeliveryResult } from "./notification-channel-adapter";
import { renderVariables } from "./notification-variable-renderer";

export interface NotificationQueueProcessorInput {
  readonly tenantId?: string;
  readonly batchSize?: number;
}

export interface NotificationQueueProcessorResult {
  readonly processed: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly errors: ReadonlyArray<{ readonly queueId: string; readonly error: string }>;
}

interface NotificationQueueProcessorPrismaClient {
  readonly notificationTemplate: {
    findUnique: (args: { where: { id: string } }) => Promise<NotificationTemplateRecord | null>;
  };
}

export function createNotificationQueueProcessorService(
  prisma: NotificationQueueProcessorPrismaClient,
): (input: NotificationQueueProcessorInput) => Promise<NotificationQueueProcessorResult> {
  const templateService = createNotificationTemplateService(prisma as never);
  const queueService = createNotificationQueueService(prisma as never);
  const logService = createNotificationLogService(prisma as never);

  function resolveAdapter(channel: string): NotificationChannelAdapter {
    const normalized = channel.toLowerCase();
    if (normalized === "email" || normalized === "sms" || normalized === "whatsapp" || normalized === "push") {
      return createMockChannelAdapter();
    }
    if (normalized === "in-app") {
      return createInAppChannelAdapter();
    }
    return createMockChannelAdapter();
  }

  return async function processQueue(input: NotificationQueueProcessorInput): Promise<NotificationQueueProcessorResult> {
    const batchSize = input.batchSize ?? 50;
    const now = new Date();

    const statuses = ["PENDING", "FAILED"];
    const allItems: NotificationQueueRecord[] = [];
    for (const status of statuses) {
      const items = await queueService.listNotificationQueues({
        tenantId: input.tenantId ?? "",
        status,
      });
      allItems.push(...items);
    }

    const ready = allItems.filter((item) => {
      if (item.status !== "PENDING" && item.status !== "FAILED") return false;
      const scheduledAt = item.scheduledAt ?? null;
      const nextAttemptAt = item.nextAttemptAt ?? null;
      const hasScheduledTime = scheduledAt !== null && scheduledAt > now;
      const hasFutureRetry = nextAttemptAt !== null && nextAttemptAt > now;
      if (hasScheduledTime || hasFutureRetry) return false;
      if (item.attempts >= item.maxAttempts) return false;
      return true;
    });

    const batch = ready.slice(0, batchSize);
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ queueId: string; error: string }> = [];

    for (const queueItem of batch) {
      try {
        const template = await templateService.getNotificationTemplate({
          tenantId: queueItem.tenantId,
          templateId: queueItem.templateId,
        });
        if (template === null || !template.isActive) {
          await queueService.updateNotificationQueue({
            tenantId: queueItem.tenantId,
            queueId: queueItem.id,
            input: {
              status: "FAILED",
              attempts: queueItem.attempts + 1,
              lastAttemptAt: new Date(),
              nextAttemptAt: null,
              errorMessage: template === null ? "template not found" : "template is inactive",
            },
          });
          failed += 1;
          errors.push({ queueId: queueItem.id, error: template === null ? "template not found" : "template is inactive" });
          continue;
        }

        const { rendered, missingVariables } = renderVariables(template.body, (queueItem.variables as Record<string, unknown> | null) ?? null);
        if (missingVariables.length > 0) {
          await queueService.updateNotificationQueue({
            tenantId: queueItem.tenantId,
            queueId: queueItem.id,
            input: {
              status: "FAILED",
              attempts: queueItem.attempts + 1,
              lastAttemptAt: new Date(),
              nextAttemptAt: null,
              errorMessage: `missing variables: ${missingVariables.join(", ")}`,
            },
          });
          failed += 1;
          errors.push({ queueId: queueItem.id, error: `missing variables: ${missingVariables.join(", ")}` });
          continue;
        }

        const adapter = resolveAdapter(queueItem.channel);
        const sentAt = new Date();

        let deliveryResult: NotificationDeliveryResult;
        try {
          deliveryResult = await adapter.send({
            recipientId: queueItem.recipientId,
            channel: queueItem.channel,
            subject: queueItem.subject,
            body: rendered,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "adapter failed";
          const nextAttemptAt = queueItem.attempts + 1 < queueItem.maxAttempts ? new Date(Date.now() + 60_000) : null;
          await queueService.updateNotificationQueue({
            tenantId: queueItem.tenantId,
            queueId: queueItem.id,
            input: {
              status: nextAttemptAt ? "PENDING" : "FAILED",
              attempts: queueItem.attempts + 1,
              lastAttemptAt: sentAt,
              nextAttemptAt,
              errorMessage,
            },
          });

          const logInput: NotificationLogCreateInput = {
            tenantId: queueItem.tenantId,
            recipientId: queueItem.recipientId,
            channel: queueItem.channel,
            subject: queueItem.subject,
            body: rendered,
            status: "FAILED",
            errorMessage,
            sentAt,
          };
          await logService.createNotificationLog(logInput);
          failed += 1;
          errors.push({ queueId: queueItem.id, error: errorMessage });
          continue;
        }

        const status = deliveryResult.success ? "SENT" : "FAILED";
        const nextAttemptAt = deliveryResult.success ? null : new Date(Date.now() + 60_000);

        await queueService.updateNotificationQueue({
          tenantId: queueItem.tenantId,
          queueId: queueItem.id,
          input: {
            status,
            attempts: queueItem.attempts + 1,
            lastAttemptAt: deliveryResult.sentAt ?? sentAt,
            nextAttemptAt,
            errorMessage: deliveryResult.errorMessage,
          },
        });

        const logInput: NotificationLogCreateInput = {
          tenantId: queueItem.tenantId,
          recipientId: queueItem.recipientId,
          channel: queueItem.channel,
          subject: queueItem.subject,
          body: rendered,
          status,
          errorMessage: deliveryResult.errorMessage,
          sentAt: deliveryResult.sentAt ?? sentAt,
          deliveredAt: deliveryResult.deliveredAt,
        };
        await logService.createNotificationLog(logInput);

        if (deliveryResult.success) {
          succeeded += 1;
        } else {
          failed += 1;
          errors.push({ queueId: queueItem.id, error: deliveryResult.errorMessage ?? "delivery failed" });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "processor failed";
        failed += 1;
        errors.push({ queueId: queueItem.id, error: errorMessage });
      }
    }

    return {
      processed: batch.length,
      succeeded,
      failed,
      errors,
    };
  };
}
