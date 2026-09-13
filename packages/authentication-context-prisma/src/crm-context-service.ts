export interface CrmEntityContext {
  readonly entity: {
    readonly type: "Lead" | "Customer" | "Opportunity";
    readonly id: string;
    readonly data: Record<string, unknown>;
  };
  readonly followups: ReadonlyArray<Record<string, unknown>>;
  readonly communications: ReadonlyArray<Record<string, unknown>>;
  readonly notes: ReadonlyArray<Record<string, unknown>>;
  readonly tags: ReadonlyArray<Record<string, unknown>>;
  readonly attachments: ReadonlyArray<Record<string, unknown>>;
}

interface CrmContextPrismaClient {
  readonly lead: {
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
  };
  readonly customer: {
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
  };
  readonly opportunity: {
    findUnique: (args: { where: { id: string }; include?: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
  };
  readonly followup: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly communication: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly crmNote: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly tagLink: {
    findMany: (args: { where: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly tag: {
    findMany: (args: { where: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
  readonly attachment: {
    findMany: (args: { where: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<ReadonlyArray<Record<string, unknown>>>;
  };
}

export interface CrmContextService {
  getEntityContext(args: { tenantId: string; entityType: "Lead" | "Customer" | "Opportunity"; entityId: string }): Promise<CrmEntityContext | null>;
}

const ENTITY_SELECT_FIELDS = {
  Lead: { id: true, tenantId: true, name: true, email: true, phone: true, source: true, status: true, createdAt: true },
  Customer: { id: true, tenantId: true, name: true, email: true, phone: true, notes: true, isActive: true, createdAt: true },
  Opportunity: { id: true, tenantId: true, name: true, valueCents: true, status: true, notes: true, createdAt: true, pipeline: { select: { name: true } }, stage: { select: { name: true, position: true } } },
};

const FOLLOWUP_SELECT = { id: true, title: true, notes: true, dueAt: true, status: true, createdAt: true };
const COMMUNICATION_SELECT = { id: true, channel: true, direction: true, contactName: true, subject: true, body: true, communicatedAt: true };
const NOTE_SELECT = { id: true, body: true, createdAt: true };
const ATTACHMENT_SELECT = { id: true, name: true, url: true, mimeType: true, sizeBytes: true, createdAt: true };
const TAG_SELECT = { id: true, name: true };

export function createCrmContextService(prisma: CrmContextPrismaClient): CrmContextService {
  return {
    async getEntityContext({ tenantId, entityType, entityId }) {
      const entityFinders: Record<string, () => Promise<Record<string, unknown> | null>> = {
        Lead: () => prisma.lead.findUnique({ where: { id: entityId } }),
        Customer: () => prisma.customer.findUnique({ where: { id: entityId } }),
        Opportunity: () => prisma.opportunity.findUnique({ where: { id: entityId }, include: { pipeline: { select: { name: true } }, stage: { select: { name: true, position: true } } } }),
      };

      const entity = await entityFinders[entityType]();
      if (entity === null || entity.tenantId !== tenantId) return null;

      const entityFilter: Record<string, unknown> = { tenantId };
      if (entityType === "Lead") entityFilter.leadId = entityId;
      if (entityType === "Customer") entityFilter.customerId = entityId;
      if (entityType === "Opportunity") entityFilter.opportunityId = entityId;

      const [followups, communications, notes, attachments] = await Promise.all([
        prisma.followup.findMany({ where: entityFilter, orderBy: { dueAt: "asc" } }),
        prisma.communication.findMany({ where: entityFilter, orderBy: { communicatedAt: "desc" } }),
        prisma.crmNote.findMany({ where: entityFilter, orderBy: { createdAt: "desc" } }),
        prisma.attachment.findMany({ where: entityFilter, orderBy: { createdAt: "desc" } }),
      ]);

      const tagLinks = await prisma.tagLink.findMany({ where: { entityType, entityId } });
      const tagIds = tagLinks.map((l) => l.tagId as string);
      const tags = tagIds.length > 0
        ? await prisma.tag.findMany({ where: { id: { in: tagIds } } })
        : [];

      const stripMeta = (records: ReadonlyArray<Record<string, unknown>>) =>
        records.map((r) => {
          const { tenantId: _t, leadId: _l, customerId: _c, opportunityId: _o, ...rest } = r;
          return rest;
        });

      return {
        entity: { type: entityType, id: entityId, data: entity },
        followups: stripMeta(followups),
        communications: stripMeta(communications),
        notes: stripMeta(notes),
        tags,
        attachments: stripMeta(attachments),
      };
    },
  };
}
