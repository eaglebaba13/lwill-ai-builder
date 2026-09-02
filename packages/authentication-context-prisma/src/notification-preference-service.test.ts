import { describe, expect, it, vi } from "vitest";
import {
  createNotificationPreferenceService,
  type NotificationPreferenceRecord,
  type NotificationPreferenceCreateInput,
  type NotificationPreferenceUpdateInput,
} from "./notification-preference-service";

function createPrisma(overrides: { preferences?: NotificationPreferenceRecord[] } = {}) {
  const preferences = overrides.preferences ?? [];
  const prisma = {
    notificationPreference: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `pref-${Date.now()}`,
          tenantId: data.tenantId as string,
          userId: data.userId as string,
          channel: data.channel as string,
          isEnabled: (data.isEnabled as boolean | undefined) ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        preferences.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { tenantId_userId_channel: { tenantId: string; userId: string; channel: string } } }) => {
        return preferences.find((p) => p.tenantId === where.tenantId_userId_channel.tenantId && p.userId === where.tenantId_userId_channel.userId && p.channel === where.tenantId_userId_channel.channel) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; userId?: string } }) => {
        let filtered = preferences;
        if (where?.tenantId) {
          filtered = filtered.filter((p) => p.tenantId === where.tenantId);
        }
        if (where?.userId) {
          filtered = filtered.filter((p) => p.userId === where.userId);
        }
        return filtered;
      }),
      update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { tenantId_userId_channel: { tenantId: string; userId: string; channel: string } } }) => {
        const index = preferences.findIndex(
          (p) => p.tenantId === where.tenantId_userId_channel.tenantId && p.userId === where.tenantId_userId_channel.userId && p.channel === where.tenantId_userId_channel.channel,
        );
        if (index === -1) {
          throw new Error("not found");
        }
        const updated = {
          ...preferences[index],
          ...data,
          updatedAt: new Date(),
        } as NotificationPreferenceRecord;
        preferences[index] = updated;
        return updated;
      }),
    },
  };

  return { prisma: prisma as never, preferences };
}

describe("notification preference service", () => {
  it("creates a preference with defaults", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationPreferenceService(prisma);

    const result = await service.createNotificationPreference({
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
      isEnabled: true,
    });
    expect(prisma.notificationPreference.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for getNotificationPreference when missing", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationPreferenceService(prisma);

    const result = await service.getNotificationPreference({ tenantId: "tenant-1", userId: "user-1", channel: "email" });
    expect(result).toBeNull();
  });

  it("filters list by tenant and user", async () => {
    const { prisma, preferences } = createPrisma();
    const service = createNotificationPreferenceService(prisma);

    preferences.push({
      id: "pref-1",
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.listNotificationPreferences({ tenantId: "tenant-1", userId: "user-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("pref-1");
  });

  it("updates preference", async () => {
    const { prisma, preferences } = createPrisma();
    const service = createNotificationPreferenceService(prisma);

    preferences.push({
      id: "pref-1",
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.updateNotificationPreference({
      tenantId: "tenant-1",
      userId: "user-1",
      channel: "email",
      input: { isEnabled: false },
    });

    expect(result).not.toBeNull();
    expect(result?.isEnabled).toBe(false);
  });
});
