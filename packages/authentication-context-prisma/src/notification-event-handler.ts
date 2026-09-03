import type { DomainEvent, DomainEventHandler } from "./domain-event";
import type { EventSubscriptionService } from "./event-subscription-service";
import type { NotificationDispatcherService } from "./notification-dispatcher-service";

export interface NotificationEventHandlerDeps {
  readonly subscriptionService: EventSubscriptionService;
  readonly dispatcher: NotificationDispatcherService;
}

export function createNotificationEventHandler(deps: NotificationEventHandlerDeps): DomainEventHandler {
  return async (event: DomainEvent) => {
    const subscriptions = await deps.subscriptionService.findEnabledSubscriptions({
      tenantId: event.tenantId,
      eventType: event.eventType,
    });

    for (const subscription of subscriptions) {
      if (subscription.notificationTemplateId === null) {
        continue;
      }

      try {
        await deps.dispatcher.dispatchNotification({
          tenantId: event.tenantId,
          templateId: subscription.notificationTemplateId,
          variables: event.payload,
        });
      } catch {
        // Notification dispatch failure must not break the business operation.
        // The dispatcher already handles queue creation and error logging.
      }
    }
  };
}
