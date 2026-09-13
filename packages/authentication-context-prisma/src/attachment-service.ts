export interface AttachmentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly url: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly leadId: string | null;
  readonly customerId: string | null;
  readonly opportunityId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AttachmentCreateInput {
  readonly name: string;
  readonly url: string;
  readonly mimeType?: string | null;
  readonly sizeBytes?: number | null;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface AttachmentService {
  createAttachment(args: { tenantId: string; input: AttachmentCreateInput }): Promise<AttachmentRecord>;
  getAttachment(args: { tenantId: string; attachmentId: string }): Promise<AttachmentRecord | null>;
  listAttachments(args: { tenantId: string; leadId?: string; customerId?: string; opportunityId?: string }): Promise<readonly AttachmentRecord[]>;
}

interface AttachmentPrismaClient {
  readonly attachment: {
    create: (args: { data: Record<string, unknown> }) => Promise<AttachmentRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AttachmentRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<AttachmentRecord[]>;
  };
}

export function createAttachmentService(prisma: AttachmentPrismaClient): AttachmentService {
  return {
    async createAttachment({ tenantId, input }) {
      return prisma.attachment.create({
        data: {
          tenantId,
          name: input.name,
          url: input.url,
          mimeType: input.mimeType ?? null,
          sizeBytes: input.sizeBytes ?? null,
          leadId: input.leadId ?? null,
          customerId: input.customerId ?? null,
          opportunityId: input.opportunityId ?? null,
        },
      });
    },

    async getAttachment({ tenantId, attachmentId }) {
      const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      if (attachment === null || attachment.tenantId !== tenantId) return null;
      return attachment;
    },

    async listAttachments({ tenantId, leadId, customerId, opportunityId }) {
      const where: Record<string, unknown> = { tenantId };
      if (leadId !== undefined) where.leadId = leadId;
      if (customerId !== undefined) where.customerId = customerId;
      if (opportunityId !== undefined) where.opportunityId = opportunityId;
      return prisma.attachment.findMany({ where, orderBy: { createdAt: "desc" } });
    },
  };
}
