import { describe, expect, it, vi } from "vitest";
import {
  createNotificationProviderConfigService,
  type NotificationProviderConfigRecord,
  type NotificationProviderConfigCreateInput,
  type NotificationProviderConfigUpdateInput,
} from "./notification-provider-config-service";

function createPrisma(overrides: { configs?: NotificationProviderConfigRecord[] } = {}) {
  const configs = overrides.configs ?? [];
  const prisma = {
    notificationProviderConfig: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `config-${Date.now()}`,
          tenantId: data.tenantId as string,
          channel: data.channel as string,
          provider: data.provider as string,
          isActive: (data.isActive as boolean | undefined) ?? true,
          config: data.config ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        configs.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { tenantId_channel: { tenantId: string; channel: string } } }) => {
        return configs.find((c) => c.tenantId === where.tenantId_channel.tenantId && c.channel === where.tenantId_channel.channel) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) => {
        let filtered = configs;
        if (where?.tenantId) {
          filtered = filtered.filter((c) => c.tenantId === where.tenantId);
        }
        return filtered;
      }),
      update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { tenantId_channel: { tenantId: string; channel: string } } }) => {
        const index = configs.findIndex(
          (c) => c.tenantId === where.tenantId_channel.tenantId && c.channel === where.tenantId_channel.channel,
        );
        if (index === -1) {
          throw new Error("not found");
        }
        const updated = {
          ...configs[index],
          ...data,
          updatedAt: new Date(),
        } as NotificationProviderConfigRecord;
        configs[index] = updated;
        return updated;
      }),
    },
  };

  return { prisma: prisma as never, configs };
}

describe("notification provider config service", () => {
  it("creates a provider config with defaults", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationProviderConfigService(prisma);

    const result = await service.createNotificationProviderConfig({
      tenantId: "tenant-1",
      channel: "email",
      provider: "smtp",
      config: { host: "smtp.example.com" },
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      channel: "email",
      provider: "smtp",
      isActive: true,
      config: { host: "smtp.example.com" },
    });
    expect(prisma.notificationProviderConfig.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for getNotificationProviderConfig when missing", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationProviderConfigService(prisma);

    const result = await service.getNotificationProviderConfig({ tenantId: "tenant-1", channel: "email" });
    expect(result).toBeNull();
  });

  it("filters list by tenant", async () => {
    const { prisma, configs } = createPrisma();
    const service = createNotificationProviderConfigService(prisma);

    configs.push({
      id: "config-1",
      tenantId: "tenant-1",
      channel: "email",
      provider: "smtp",
      isActive: true,
      config: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.listNotificationProviderConfigs({ tenantId: "tenant-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("config-1");
  });

  it("updates provider config", async () => {
    const { prisma, configs } = createPrisma();
    const service = createNotificationProviderConfigService(prisma);

    configs.push({
      id: "config-1",
      tenantId: "tenant-1",
      channel: "email",
      provider: "smtp",
      isActive: true,
      config: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateNotificationProviderConfig({
      tenantId: "tenant-1",
      channel: "email",
      input: { provider: "sendgrid", isActive: false },
    });

    expect(result).not.toBeNull();
    expect(result?.provider).toBe("sendgrid");
    expect(result?.isActive).toBe(false);
  });
});
