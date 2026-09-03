import type { DomainEvent, DomainEventHandler } from "./domain-event";

export interface DomainEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: DomainEventHandler): void;
  unsubscribe(eventType: string, handler: DomainEventHandler): void;
}

export function createDomainEventBus(): DomainEventBus {
  const handlers = new Map<string, Set<DomainEventHandler>>();

  return {
    async publish(event: DomainEvent) {
      const eventHandlers = handlers.get(event.eventType);
      if (eventHandlers === undefined) {
        return;
      }
      for (const handler of eventHandlers) {
        await handler(event);
      }
    },

    subscribe(eventType: string, handler: DomainEventHandler) {
      let eventHandlers = handlers.get(eventType);
      if (eventHandlers === undefined) {
        eventHandlers = new Set();
        handlers.set(eventType, eventHandlers);
      }
      eventHandlers.add(handler);
    },

    unsubscribe(eventType: string, handler: DomainEventHandler) {
      const eventHandlers = handlers.get(eventType);
      if (eventHandlers !== undefined) {
        eventHandlers.delete(handler);
        if (eventHandlers.size === 0) {
          handlers.delete(eventType);
        }
      }
    },
  };
}
