import { describe, expect, it, vi } from "vitest";
import { createDomainEvent, type DomainEvent } from "./domain-event";
import { createDomainEventBus } from "./domain-event-bus";
import { createEventSubscriptionService, type EventSubscriptionRecord } from "./event-subscription-service";
import { createNotificationEventHandler } from "./notification-event-handler";
import { createAppointmentEventEmitter } from "./appointment-event-emitter";
import type { AppointmentRecord, AppointmentService } from "./appointment-service";

describe("domain event", () => {
  it("creates event with required fields", () => {
    const event = createDomainEvent("appointment.created", "tenant-1", { appointmentId: "appt-1" });
    expect(event.eventType).toBe("appointment.created");
    expect(event.tenantId).toBe("tenant-1");
    expect(event.payload).toEqual({ appointmentId: "appt-1" });
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("creates unique timestamps per call", () => {
    const event1 = createDomainEvent("test.event", "tenant-1", {});
    const event2 = createDomainEvent("test.event", "tenant-1", {});
    expect(event1.timestamp.getTime()).toBeLessThanOrEqual(event2.timestamp.getTime());
  });
});

describe("domain event bus", () => {
  it("publishes event to matching subscribers", async () => {
    const bus = createDomainEventBus();
    const handler = vi.fn();
    bus.subscribe("appointment.created", handler);

    const event = createDomainEvent("appointment.created", "tenant-1", { appointmentId: "appt-1" });
    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("does not publish to non-matching subscribers", async () => {
    const bus = createDomainEventBus();
    const handler = vi.fn();
    bus.subscribe("invoice.paid", handler);

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("publishes to multiple subscribers", async () => {
    const bus = createDomainEventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.subscribe("appointment.created", handler1);
    bus.subscribe("appointment.created", handler2);

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await bus.publish(event);

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe removes handler", async () => {
    const bus = createDomainEventBus();
    const handler = vi.fn();
    bus.subscribe("appointment.created", handler);
    bus.unsubscribe("appointment.created", handler);

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await bus.publish(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it("publish completes silently when no subscribers exist", async () => {
    const bus = createDomainEventBus();
    const event = createDomainEvent("nonexistent.event", "tenant-1", {});
    await expect(bus.publish(event)).resolves.toBeUndefined();
  });
});

describe("event subscription service", () => {
  function createPrisma(overrides: { subscriptions?: EventSubscriptionRecord[] } = {}) {
    const subscriptions = overrides.subscriptions ?? [];
    return {
      eventSubscription: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const record: EventSubscriptionRecord = {
            id: `sub-${Date.now()}`,
            tenantId: data.tenantId as string,
            eventType: data.eventType as string,
            notificationTemplateId: (data.notificationTemplateId as string | null) ?? null,
            isEnabled: (data.isEnabled as boolean) ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          subscriptions.push(record);
          return record;
        }),
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
          return subscriptions.find((s) => s.id === where.id) ?? null;
        }),
        findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
          return subscriptions.filter((s) => {
            if (where?.tenantId && s.tenantId !== where.tenantId) return false;
            if (where?.eventType && s.eventType !== where.eventType) return false;
            if (where?.isEnabled !== undefined && s.isEnabled !== where.isEnabled) return false;
            if (where?.notificationTemplateId && typeof where.notificationTemplateId === "object") {
              const filter = where.notificationTemplateId as Record<string, unknown>;
              if (filter.not === null && s.notificationTemplateId === null) return false;
            }
            return true;
          });
        }),
        update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
          const index = subscriptions.findIndex((s) => s.id === where.id);
          if (index === -1) throw new Error("not found");
          subscriptions[index] = { ...subscriptions[index], ...data, updatedAt: new Date() } as EventSubscriptionRecord;
          return subscriptions[index];
        }),
        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          const index = subscriptions.findIndex((s) => s.id === where.id);
          if (index === -1) throw new Error("not found");
          const [removed] = subscriptions.splice(index, 1);
          return removed;
        }),
      },
    };
  }

  it("creates subscription", async () => {
    const prisma = createPrisma();
    const service = createEventSubscriptionService(prisma as never);
    const result = await service.createEventSubscription({
      tenantId: "tenant-1",
      eventType: "appointment.created",
      notificationTemplateId: "template-1",
    });
    expect(result.tenantId).toBe("tenant-1");
    expect(result.eventType).toBe("appointment.created");
    expect(result.notificationTemplateId).toBe("template-1");
    expect(result.isEnabled).toBe(true);
  });

  it("finds enabled subscriptions for tenant and event type", async () => {
    const prisma = createPrisma({
      subscriptions: [
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true, createdAt: new Date(), updatedAt: new Date() },
        { id: "sub-2", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: null, isEnabled: true, createdAt: new Date(), updatedAt: new Date() },
        { id: "sub-3", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-2", isEnabled: false, createdAt: new Date(), updatedAt: new Date() },
        { id: "sub-4", tenantId: "tenant-2", eventType: "appointment.created", notificationTemplateId: "template-3", isEnabled: true, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createEventSubscriptionService(prisma as never);
    const result = await service.findEnabledSubscriptions({ tenantId: "tenant-1", eventType: "appointment.created" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("sub-1");
  });

  it("rejects cross-tenant read", async () => {
    const prisma = createPrisma({
      subscriptions: [
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createEventSubscriptionService(prisma as never);
    const result = await service.getEventSubscription({ tenantId: "tenant-2", subscriptionId: "sub-1" });
    expect(result).toBeNull();
  });

  it("rejects cross-tenant update", async () => {
    const prisma = createPrisma({
      subscriptions: [
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createEventSubscriptionService(prisma as never);
    const result = await service.updateEventSubscription({ tenantId: "tenant-2", subscriptionId: "sub-1", input: { isEnabled: false } });
    expect(result).toBeNull();
  });

  it("rejects cross-tenant delete", async () => {
    const prisma = createPrisma({
      subscriptions: [
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true, createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const service = createEventSubscriptionService(prisma as never);
    const result = await service.deleteEventSubscription({ tenantId: "tenant-2", subscriptionId: "sub-1" });
    expect(result).toBe(false);
  });
});

describe("notification event handler", () => {
  it("dispatches notification for matching enabled subscription", async () => {
    const subscriptionService = {
      findEnabledSubscriptions: vi.fn().mockResolvedValue([
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true },
      ]),
    };
    const dispatcher = {
      dispatchNotification: vi.fn().mockResolvedValue({ success: true, status: "SENT" }),
    };
    const handler = createNotificationEventHandler({
      subscriptionService: subscriptionService as never,
      dispatcher: dispatcher as never,
    });

    const event = createDomainEvent("appointment.created", "tenant-1", { appointmentId: "appt-1" });
    await handler(event);

    expect(subscriptionService.findEnabledSubscriptions).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      eventType: "appointment.created",
    });
    expect(dispatcher.dispatchNotification).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      templateId: "template-1",
      variables: { appointmentId: "appt-1" },
    });
  });

  it("does not dispatch when no matching subscriptions exist", async () => {
    const subscriptionService = {
      findEnabledSubscriptions: vi.fn().mockResolvedValue([]),
    };
    const dispatcher = {
      dispatchNotification: vi.fn(),
    };
    const handler = createNotificationEventHandler({
      subscriptionService: subscriptionService as never,
      dispatcher: dispatcher as never,
    });

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await handler(event);

    expect(dispatcher.dispatchNotification).not.toHaveBeenCalled();
  });

  it("skips subscriptions with null notificationTemplateId", async () => {
    const subscriptionService = {
      findEnabledSubscriptions: vi.fn().mockResolvedValue([
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: null, isEnabled: true },
      ]),
    };
    const dispatcher = {
      dispatchNotification: vi.fn(),
    };
    const handler = createNotificationEventHandler({
      subscriptionService: subscriptionService as never,
      dispatcher: dispatcher as never,
    });

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await handler(event);

    expect(dispatcher.dispatchNotification).not.toHaveBeenCalled();
  });

  it("does not break business operation when dispatcher fails", async () => {
    const subscriptionService = {
      findEnabledSubscriptions: vi.fn().mockResolvedValue([
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true },
      ]),
    };
    const dispatcher = {
      dispatchNotification: vi.fn().mockRejectedValue(new Error("dispatch failed")),
    };
    const handler = createNotificationEventHandler({
      subscriptionService: subscriptionService as never,
      dispatcher: dispatcher as never,
    });

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await expect(handler(event)).resolves.toBeUndefined();
  });

  it("dispatches to multiple matching subscriptions", async () => {
    const subscriptionService = {
      findEnabledSubscriptions: vi.fn().mockResolvedValue([
        { id: "sub-1", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-1", isEnabled: true },
        { id: "sub-2", tenantId: "tenant-1", eventType: "appointment.created", notificationTemplateId: "template-2", isEnabled: true },
      ]),
    };
    const dispatcher = {
      dispatchNotification: vi.fn().mockResolvedValue({ success: true }),
    };
    const handler = createNotificationEventHandler({
      subscriptionService: subscriptionService as never,
      dispatcher: dispatcher as never,
    });

    const event = createDomainEvent("appointment.created", "tenant-1", {});
    await handler(event);

    expect(dispatcher.dispatchNotification).toHaveBeenCalledTimes(2);
  });
});

describe("appointment event emitter", () => {
  function createMockAppointmentService(): AppointmentService & { records: AppointmentRecord[] } {
    const records: AppointmentRecord[] = [];
    return {
      records,
      async createAppointment(input) {
        const record: AppointmentRecord = {
          id: `appt-${Date.now()}`,
          tenantId: input.tenantId,
          customerId: input.customerId,
          serviceId: input.serviceId,
          branchId: input.branchId ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: input.status,
          notes: input.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        records.push(record);
        return record;
      },
      async getAppointment() { return null; },
      async listAppointments() { return []; },
      async updateAppointment() { return null; },
    };
  }

  it("emits appointment.created event after successful creation", async () => {
    const baseService = createMockAppointmentService();
    const bus = createDomainEventBus();
    const handler = vi.fn();
    bus.subscribe("appointment.created", handler);

    const emitter = createAppointmentEventEmitter(baseService, bus);
    const result = await emitter.createAppointment({
      tenantId: "tenant-1",
      customerId: "customer-1",
      serviceId: "service-1",
      startsAt: new Date("2026-09-04T10:00:00Z"),
      endsAt: new Date("2026-09-04T11:00:00Z"),
      status: "CONFIRMED",
    });

    expect(result.tenantId).toBe("tenant-1");
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as DomainEvent;
    expect(event.eventType).toBe("appointment.created");
    expect(event.tenantId).toBe("tenant-1");
    expect(event.payload.appointmentId).toBe(result.id);
    expect(event.payload.customerId).toBe("customer-1");
    expect(event.payload.serviceId).toBe("service-1");
    expect(event.payload.status).toBe("CONFIRMED");
  });

  it("does not emit event when creation fails", async () => {
    const baseService: AppointmentService = {
      async createAppointment() { throw new Error("validation failed"); },
      async getAppointment() { return null; },
      async listAppointments() { return []; },
      async updateAppointment() { return null; },
    };
    const bus = createDomainEventBus();
    const handler = vi.fn();
    bus.subscribe("appointment.created", handler);

    const emitter = createAppointmentEventEmitter(baseService, bus);
    await expect(emitter.createAppointment({
      tenantId: "tenant-1",
      customerId: "customer-1",
      serviceId: "service-1",
      startsAt: new Date(),
      endsAt: new Date(),
      status: "CONFIRMED",
    })).rejects.toThrow("validation failed");

    expect(handler).not.toHaveBeenCalled();
  });

  it("delegates other methods unchanged", async () => {
    const baseService = createMockAppointmentService();
    const bus = createDomainEventBus();
    const emitter = createAppointmentEventEmitter(baseService, bus);

    const result = await emitter.getAppointment({ tenantId: "tenant-1", appointmentId: "appt-1" });
    expect(result).toBeNull();

    const list = await emitter.listAppointments({ tenantId: "tenant-1" });
    expect(list).toEqual([]);
  });
});
