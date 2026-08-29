import { describe, expect, it, vi } from "vitest";
import {
  createSettingService,
  type SettingRecord,
  type SettingCreateInput,
  type SettingUpdateInput,
} from "./setting-service";

function createPrisma(overrides: {
  settings?: SettingRecord[];
  createInput?: SettingCreateInput;
  updateInput?: SettingUpdateInput;
} = {}): {
  prisma: ReturnType<ReturnType<typeof createSettingService> extends infer S ? S extends { (prisma: infer P): any } ? P : never : never>;
  settings: SettingRecord[];
} {
  const settings = overrides.settings ?? [];
  const prisma = {
    tenantSetting: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `setting-${Date.now()}`,
          tenantId: data.tenantId as string,
          key: data.key as string,
          value: data.value as string,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        settings.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return settings.find((s) => s.id === where.id) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) => {
        if (where?.tenantId) {
          return settings.filter((s) => s.tenantId === where.tenantId);
        }
        return settings;
      }),
      update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
        const index = settings.findIndex((s) => s.id === where.id);
        if (index === -1) {
          throw new Error("not found");
        }
        const updated = {
          ...settings[index],
          ...data,
          updatedAt: new Date(),
        } as SettingRecord;
        settings[index] = updated;
        return updated;
      }),
    },
  };

  return { prisma: prisma as never, settings };
}

describe("setting service", () => {
  it("creates a setting with tenantId and default isActive", async () => {
    const { prisma, settings } = createPrisma();
    const service = createSettingService(prisma);

    const result = await service.createSetting({
      tenantId: "tenant-1",
      key: "theme",
      value: "dark",
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      key: "theme",
      value: "dark",
      isActive: true,
    });
    expect(prisma.tenantSetting.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for getSetting when missing", async () => {
    const { prisma } = createPrisma();
    const service = createSettingService(prisma);

    const result = await service.getSetting({ tenantId: "tenant-1", settingId: "missing" });
    expect(result).toBeNull();
  });

  it("returns null for cross-tenant getSetting", async () => {
    const { prisma } = createPrisma({
      settings: [
        {
          id: "setting-1",
          tenantId: "tenant-1",
          key: "theme",
          value: "dark",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createSettingService(prisma);

    const result = await service.getSetting({ tenantId: "tenant-2", settingId: "setting-1" });
    expect(result).toBeNull();
  });

  it("returns a setting for getSetting when same tenant", async () => {
    const { prisma } = createPrisma({
      settings: [
        {
          id: "setting-1",
          tenantId: "tenant-1",
          key: "theme",
          value: "dark",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createSettingService(prisma);

    const result = await service.getSetting({ tenantId: "tenant-1", settingId: "setting-1" });
    expect(result).toMatchObject({ id: "setting-1", key: "theme" });
  });

  it("lists settings scoped to tenant", async () => {
    const { prisma } = createPrisma({
      settings: [
        {
          id: "setting-1",
          tenantId: "tenant-1",
          key: "theme",
          value: "dark",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "setting-2",
          tenantId: "tenant-2",
          key: "theme",
          value: "light",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createSettingService(prisma);

    const result = await service.listSettings({ tenantId: "tenant-1" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ tenantId: "tenant-1" });
  });

  it("updates a setting and returns null for cross-tenant update", async () => {
    const { prisma } = createPrisma({
      settings: [
        {
          id: "setting-1",
          tenantId: "tenant-1",
          key: "theme",
          value: "dark",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createSettingService(prisma);

    const crossTenant = await service.updateSetting({
      tenantId: "tenant-2",
      settingId: "setting-1",
      input: { value: "light" },
    });
    expect(crossTenant).toBeNull();

    const sameTenant = await service.updateSetting({
      tenantId: "tenant-1",
      settingId: "setting-1",
      input: { value: "light", isActive: false },
    });
    expect(sameTenant).toMatchObject({ value: "light", isActive: false });
  });

  it("returns null when updating a missing setting", async () => {
    const { prisma } = createPrisma();
    const service = createSettingService(prisma);

    const result = await service.updateSetting({
      tenantId: "tenant-1",
      settingId: "missing",
      input: { value: "light" },
    });
    expect(result).toBeNull();
  });
});
