export interface NotificationProviderConfigRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly channel: string;
  readonly provider: string;
  readonly isActive: boolean;
  readonly config: Record<string, unknown> | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NotificationProviderConfigCreateInput {
  readonly tenantId: string;
  readonly channel: string;
  readonly provider: string;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface NotificationProviderConfigUpdateInput {
  readonly provider?: string;
  readonly isActive?: boolean;
  readonly config?: Record<string, unknown> | null;
}

export interface NotificationProviderConfigService {
  createNotificationProviderConfig(input: NotificationProviderConfigCreateInput): Promise<NotificationProviderConfigRecord>;
  getNotificationProviderConfig(args: { tenantId: string; channel: string }): Promise<NotificationProviderConfigRecord | null>;
  listNotificationProviderConfigs(args: { tenantId: string }): Promise<readonly NotificationProviderConfigRecord[]>;
  updateNotificationProviderConfig(args: {
    tenantId: string;
    channel: string;
    input: NotificationProviderConfigUpdateInput;
  }): Promise<NotificationProviderConfigRecord | null>;
}

interface NotificationProviderConfigPrismaClient {
  readonly notificationProviderConfig: {
    create: (args: { data: Record<string, unknown> }) => Promise<NotificationProviderConfigRecord>;
    findUnique: (args: { where: { tenantId_channel: { tenantId: string; channel: string } } }) => Promise<NotificationProviderConfigRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<NotificationProviderConfigRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { tenantId_channel: { tenantId: string; channel: string } } }) => Promise<NotificationProviderConfigRecord>;
  };
}

export function createNotificationProviderConfigService(
  prisma: NotificationProviderConfigPrismaClient,
): NotificationProviderConfigService {
  return {
    async createNotificationProviderConfig(input) {
      return prisma.notificationProviderConfig.create({
        data: {
          tenantId: input.tenantId,
          channel: input.channel,
          provider: input.provider,
          isActive: input.isActive ?? true,
          config: input.config ?? undefined,
        },
      });
    },
    async getNotificationProviderConfig({ tenantId, channel }) {
      const config = await prisma.notificationProviderConfig.findUnique({
        where: { tenantId_channel: { tenantId, channel } },
      });
      if (config === null || config.tenantId !== tenantId) {
        return null;
      }
      return config;
    },
    async listNotificationProviderConfigs({ tenantId }) {
      return prisma.notificationProviderConfig.findMany({ where: { tenantId } });
    },
    async updateNotificationProviderConfig({ tenantId, channel, input }) {
      const existing = await prisma.notificationProviderConfig.findUnique({
        where: { tenantId_channel: { tenantId, channel } },
      });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.provider !== undefined) data.provider = input.provider;
      if (input.isActive !== undefined) data.isActive = input.isActive;
      if (input.config !== undefined) data.config = input.config;
      return prisma.notificationProviderConfig.update({
        where: { tenantId_channel: { tenantId, channel } },
        data,
      });
    },
  };
}
