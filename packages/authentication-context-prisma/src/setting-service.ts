export interface SettingRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly key: string;
  readonly value: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SettingCreateInput {
  readonly tenantId: string;
  readonly key: string;
  readonly value: string;
  readonly isActive?: boolean;
}

export interface SettingUpdateInput {
  readonly key?: string;
  readonly value?: string;
  readonly isActive?: boolean;
}

export interface SettingService {
  createSetting(input: SettingCreateInput): Promise<SettingRecord>;
  getSetting(args: { tenantId: string; settingId: string }): Promise<SettingRecord | null>;
  listSettings(args: { tenantId: string }): Promise<readonly SettingRecord[]>;
  updateSetting(args: {
    tenantId: string;
    settingId: string;
    input: SettingUpdateInput;
  }): Promise<SettingRecord | null>;
}

interface SettingPrismaClient {
  readonly tenantSetting: {
    create: (args: { data: Record<string, unknown> }) => Promise<SettingRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<SettingRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<SettingRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<SettingRecord>;
  };
}

export function createSettingService(prisma: SettingPrismaClient): SettingService {
  return {
    async createSetting(input) {
      return prisma.tenantSetting.create({
        data: {
          tenantId: input.tenantId,
          key: input.key,
          value: input.value,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getSetting({ tenantId, settingId }) {
      const setting = await prisma.tenantSetting.findUnique({ where: { id: settingId } });
      if (setting === null || setting.tenantId !== tenantId) {
        return null;
      }
      return setting;
    },
    async listSettings({ tenantId }) {
      return prisma.tenantSetting.findMany({ where: { tenantId } });
    },
    async updateSetting({ tenantId, settingId, input }) {
      const existing = await prisma.tenantSetting.findUnique({ where: { id: settingId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.key !== undefined) {
        data.key = input.key;
      }
      if (input.value !== undefined) {
        data.value = input.value;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.tenantSetting.update({ where: { id: settingId }, data });
    },
  };
}
