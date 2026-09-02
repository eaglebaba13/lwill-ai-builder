export interface NotificationPreferenceRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly channel: string;
  readonly isEnabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NotificationPreferenceCreateInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly channel: string;
  readonly isEnabled?: boolean;
}

export interface NotificationPreferenceUpdateInput {
  readonly isEnabled?: boolean;
}

export interface NotificationPreferenceService {
  createNotificationPreference(input: NotificationPreferenceCreateInput): Promise<NotificationPreferenceRecord>;
  getNotificationPreference(args: { tenantId: string; userId: string; channel: string }): Promise<NotificationPreferenceRecord | null>;
  listNotificationPreferences(args: { tenantId: string; userId: string }): Promise<readonly NotificationPreferenceRecord[]>;
  updateNotificationPreference(args: {
    tenantId: string;
    userId: string;
    channel: string;
    input: NotificationPreferenceUpdateInput;
  }): Promise<NotificationPreferenceRecord | null>;
}

interface NotificationPreferencePrismaClient {
  readonly notificationPreference: {
    create: (args: { data: Record<string, unknown> }) => Promise<NotificationPreferenceRecord>;
    findUnique: (args: { where: { tenantId_userId_channel: { tenantId: string; userId: string; channel: string } } }) => Promise<NotificationPreferenceRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<NotificationPreferenceRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { tenantId_userId_channel: { tenantId: string; userId: string; channel: string } } }) => Promise<NotificationPreferenceRecord>;
  };
}

export function createNotificationPreferenceService(
  prisma: NotificationPreferencePrismaClient,
): NotificationPreferenceService {
  return {
    async createNotificationPreference(input) {
      return prisma.notificationPreference.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          channel: input.channel,
          isEnabled: input.isEnabled ?? true,
        },
      });
    },
    async getNotificationPreference({ tenantId, userId, channel }) {
      const preference = await prisma.notificationPreference.findUnique({
        where: { tenantId_userId_channel: { tenantId, userId, channel } },
      });
      if (preference === null || preference.tenantId !== tenantId) {
        return null;
      }
      return preference;
    },
    async listNotificationPreferences({ tenantId, userId }) {
      return prisma.notificationPreference.findMany({ where: { tenantId, userId } });
    },
    async updateNotificationPreference({ tenantId, userId, channel, input }) {
      const existing = await prisma.notificationPreference.findUnique({
        where: { tenantId_userId_channel: { tenantId, userId, channel } },
      });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;
      return prisma.notificationPreference.update({
        where: { tenantId_userId_channel: { tenantId, userId, channel } },
        data,
      });
    },
  };
}
