import { describe, expect, it, vi } from "vitest";
import {
  createNotificationTemplateService,
  type NotificationTemplateRecord,
  type NotificationTemplateCreateInput,
  type NotificationTemplateUpdateInput,
} from "./notification-template-service";

function createPrisma(overrides: {
  templates?: NotificationTemplateRecord[];
} = {}) {
  const templates = overrides.templates ?? [];
  const prisma = {
    notificationTemplate: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `template-${Date.now()}`,
          tenantId: data.tenantId as string,
          name: data.name as string,
          channel: data.channel as string,
          subject: data.subject ?? null,
          body: data.body as string,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        templates.push(record);
        return record;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return templates.find((t) => t.id === where.id) ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string } }) => {
        if (where?.tenantId) {
          return templates.filter((t) => t.tenantId === where.tenantId);
        }
        return templates;
      }),
      update: vi.fn(async ({ data, where }: { data: Record<string, unknown>; where: { id: string } }) => {
        const index = templates.findIndex((t) => t.id === where.id);
        if (index === -1) {
          throw new Error("not found");
        }
        const updated = {
          ...templates[index],
          ...data,
          updatedAt: new Date(),
        } as NotificationTemplateRecord;
        templates[index] = updated;
        return updated;
      }),
    },
  };

  return { prisma: prisma as never, templates };
}

describe("notification template service", () => {
  it("creates a template with tenantId and default isActive", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationTemplateService(prisma);

    const result = await service.createNotificationTemplate({
      tenantId: "tenant-1",
      name: "Welcome Email",
      channel: "email",
      subject: "Welcome",
      body: "Hello {{name}}",
    });

    expect(result).toMatchObject({
      tenantId: "tenant-1",
      name: "Welcome Email",
      channel: "email",
      subject: "Welcome",
      body: "Hello {{name}}",
      isActive: true,
    });
    expect(prisma.notificationTemplate.create).toHaveBeenCalledTimes(1);
  });

  it("returns null for getNotificationTemplate when missing", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationTemplateService(prisma);

    const result = await service.getNotificationTemplate({ tenantId: "tenant-1", templateId: "missing" });
    expect(result).toBeNull();
  });

  it("returns null for cross-tenant getNotificationTemplate", async () => {
    const { prisma } = createPrisma({
      templates: [
        {
          id: "template-1",
          tenantId: "tenant-1",
          name: "Welcome",
          channel: "email",
          subject: "Welcome",
          body: "Hello",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationTemplateService(prisma);

    const result = await service.getNotificationTemplate({ tenantId: "tenant-2", templateId: "template-1" });
    expect(result).toBeNull();
  });

  it("returns a template for getNotificationTemplate when same tenant", async () => {
    const { prisma } = createPrisma({
      templates: [
        {
          id: "template-1",
          tenantId: "tenant-1",
          name: "Welcome",
          channel: "email",
          subject: "Welcome",
          body: "Hello",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationTemplateService(prisma);

    const result = await service.getNotificationTemplate({ tenantId: "tenant-1", templateId: "template-1" });
    expect(result).toMatchObject({ id: "template-1", name: "Welcome" });
  });

  it("lists templates scoped to tenant", async () => {
    const { prisma } = createPrisma({
      templates: [
        {
          id: "template-1",
          tenantId: "tenant-1",
          name: "Welcome",
          channel: "email",
          subject: "Welcome",
          body: "Hello",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "template-2",
          tenantId: "tenant-2",
          name: "Goodbye",
          channel: "sms",
          subject: null,
          body: "Bye",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationTemplateService(prisma);

    const result = await service.listNotificationTemplates({ tenantId: "tenant-1" });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ tenantId: "tenant-1" });
  });

  it("updates a template and returns null for cross-tenant update", async () => {
    const { prisma } = createPrisma({
      templates: [
        {
          id: "template-1",
          tenantId: "tenant-1",
          name: "Welcome",
          channel: "email",
          subject: "Welcome",
          body: "Hello",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    const service = createNotificationTemplateService(prisma);

    const crossTenant = await service.updateNotificationTemplate({
      tenantId: "tenant-2",
      templateId: "template-1",
      input: { body: "Updated" },
    });
    expect(crossTenant).toBeNull();

    const sameTenant = await service.updateNotificationTemplate({
      tenantId: "tenant-1",
      templateId: "template-1",
      input: { body: "Updated", isActive: false },
    });
    expect(sameTenant).toMatchObject({ body: "Updated", isActive: false });
  });

  it("returns null when updating a missing template", async () => {
    const { prisma } = createPrisma();
    const service = createNotificationTemplateService(prisma);

    const result = await service.updateNotificationTemplate({
      tenantId: "tenant-1",
      templateId: "missing",
      input: { body: "Updated" },
    });
    expect(result).toBeNull();
  });
});
