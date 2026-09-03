export interface EventSubscriptionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly eventType: string;
  readonly notificationTemplateId: string | null;
  readonly isEnabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface EventSubscriptionCreateInput {
  readonly tenantId: string;
  readonly eventType: string;
  readonly notificationTemplateId?: string | null;
  readonly isEnabled?: boolean;
}

export interface EventSubscriptionUpdateInput {
  readonly notificationTemplateId?: string | null;
  readonly isEnabled?: boolean;
}

export interface EventSubscriptionService {
  createEventSubscription(input: EventSubscriptionCreateInput): Promise<EventSubscriptionRecord>;
  getEventSubscription(args: { tenantId: string; subscriptionId: string }): Promise<EventSubscriptionRecord | null>;
  listEventSubscriptions(args: { tenantId: string; eventType?: string }): Promise<readonly EventSubscriptionRecord[]>;
  findEnabledSubscriptions(args: { tenantId: string; eventType: string }): Promise<readonly EventSubscriptionRecord[]>;
  updateEventSubscription(args: {
    tenantId: string;
    subscriptionId: string;
    input: EventSubscriptionUpdateInput;
  }): Promise<EventSubscriptionRecord | null>;
  deleteEventSubscription(args: { tenantId: string; subscriptionId: string }): Promise<boolean>;
}

interface EventSubscriptionPrismaClient {
  readonly eventSubscription: {
    create: (args: { data: Record<string, unknown> }) => Promise<EventSubscriptionRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<EventSubscriptionRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<EventSubscriptionRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<EventSubscriptionRecord>;
    delete: (args: { where: { id: string } }) => Promise<EventSubscriptionRecord>;
  };
}

export function createEventSubscriptionService(
  prisma: EventSubscriptionPrismaClient,
): EventSubscriptionService {
  return {
    async createEventSubscription(input) {
      return prisma.eventSubscription.create({
        data: {
          tenantId: input.tenantId,
          eventType: input.eventType,
          notificationTemplateId: input.notificationTemplateId ?? null,
          isEnabled: input.isEnabled ?? true,
        },
      });
    },

    async getEventSubscription({ tenantId, subscriptionId }) {
      const subscription = await prisma.eventSubscription.findUnique({ where: { id: subscriptionId } });
      if (subscription === null || subscription.tenantId !== tenantId) {
        return null;
      }
      return subscription;
    },

    async listEventSubscriptions({ tenantId, eventType }) {
      const where: Record<string, unknown> = { tenantId };
      if (eventType !== undefined && eventType !== null && eventType !== "") {
        where.eventType = eventType;
      }
      return prisma.eventSubscription.findMany({ where });
    },

    async findEnabledSubscriptions({ tenantId, eventType }) {
      return prisma.eventSubscription.findMany({
        where: {
          tenantId,
          eventType,
          isEnabled: true,
          notificationTemplateId: { not: null },
        },
      });
    },

    async updateEventSubscription({ tenantId, subscriptionId, input }) {
      const existing = await prisma.eventSubscription.findUnique({ where: { id: subscriptionId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.notificationTemplateId !== undefined) data.notificationTemplateId = input.notificationTemplateId;
      if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;
      return prisma.eventSubscription.update({ where: { id: subscriptionId }, data });
    },

    async deleteEventSubscription({ tenantId, subscriptionId }) {
      const existing = await prisma.eventSubscription.findUnique({ where: { id: subscriptionId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return false;
      }
      await prisma.eventSubscription.delete({ where: { id: subscriptionId } });
      return true;
    },
  };
}
