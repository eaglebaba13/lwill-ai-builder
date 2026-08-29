export interface NotificationTemplateRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly channel: string;
  readonly subject: string | null;
  readonly body: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NotificationTemplateCreateInput {
  readonly tenantId: string;
  readonly name: string;
  readonly channel: string;
  readonly subject?: string | null;
  readonly body: string;
  readonly isActive?: boolean;
}

export interface NotificationTemplateUpdateInput {
  readonly name?: string;
  readonly channel?: string;
  readonly subject?: string | null;
  readonly body?: string;
  readonly isActive?: boolean;
}

export interface NotificationTemplateService {
  createNotificationTemplate(input: NotificationTemplateCreateInput): Promise<NotificationTemplateRecord>;
  getNotificationTemplate(args: { tenantId: string; templateId: string }): Promise<NotificationTemplateRecord | null>;
  listNotificationTemplates(args: { tenantId: string }): Promise<readonly NotificationTemplateRecord[]>;
  updateNotificationTemplate(args: {
    tenantId: string;
    templateId: string;
    input: NotificationTemplateUpdateInput;
  }): Promise<NotificationTemplateRecord | null>;
}

interface NotificationTemplatePrismaClient {
  readonly notificationTemplate: {
    create: (args: { data: Record<string, unknown> }) => Promise<NotificationTemplateRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<NotificationTemplateRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<NotificationTemplateRecord[]>;
    update: (args: { data: Record<string, unknown>; where: { id: string } }) => Promise<NotificationTemplateRecord>;
  };
}

export function createNotificationTemplateService(prisma: NotificationTemplatePrismaClient): NotificationTemplateService {
  return {
    async createNotificationTemplate(input) {
      return prisma.notificationTemplate.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          channel: input.channel,
          subject: input.subject ?? null,
          body: input.body,
          isActive: input.isActive ?? true,
        },
      });
    },
    async getNotificationTemplate({ tenantId, templateId }) {
      const template = await prisma.notificationTemplate.findUnique({ where: { id: templateId } });
      if (template === null || template.tenantId !== tenantId) {
        return null;
      }
      return template;
    },
    async listNotificationTemplates({ tenantId }) {
      return prisma.notificationTemplate.findMany({ where: { tenantId } });
    },
    async updateNotificationTemplate({ tenantId, templateId, input }) {
      const existing = await prisma.notificationTemplate.findUnique({ where: { id: templateId } });
      if (existing === null || existing.tenantId !== tenantId) {
        return null;
      }
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) {
        data.name = input.name;
      }
      if (input.channel !== undefined) {
        data.channel = input.channel;
      }
      if (input.subject !== undefined) {
        data.subject = input.subject;
      }
      if (input.body !== undefined) {
        data.body = input.body;
      }
      if (input.isActive !== undefined) {
        data.isActive = input.isActive;
      }
      return prisma.notificationTemplate.update({ where: { id: templateId }, data });
    },
  };
}
