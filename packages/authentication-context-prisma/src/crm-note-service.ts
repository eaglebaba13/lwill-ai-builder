export interface CrmNoteRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly body: string;
  readonly leadId: string | null;
  readonly customerId: string | null;
  readonly opportunityId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CrmNoteCreateInput {
  readonly body: string;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface CrmNoteService {
  createNote(args: { tenantId: string; input: CrmNoteCreateInput }): Promise<CrmNoteRecord>;
  getNote(args: { tenantId: string; noteId: string }): Promise<CrmNoteRecord | null>;
  listNotes(args: { tenantId: string; leadId?: string; customerId?: string; opportunityId?: string }): Promise<readonly CrmNoteRecord[]>;
}

interface CrmNotePrismaClient {
  readonly crmNote: {
    create: (args: { data: Record<string, unknown> }) => Promise<CrmNoteRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<CrmNoteRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<CrmNoteRecord[]>;
  };
}

export function createCrmNoteService(prisma: CrmNotePrismaClient): CrmNoteService {
  return {
    async createNote({ tenantId, input }) {
      return prisma.crmNote.create({
        data: {
          tenantId,
          body: input.body,
          leadId: input.leadId ?? null,
          customerId: input.customerId ?? null,
          opportunityId: input.opportunityId ?? null,
        },
      });
    },

    async getNote({ tenantId, noteId }) {
      const note = await prisma.crmNote.findUnique({ where: { id: noteId } });
      if (note === null || note.tenantId !== tenantId) return null;
      return note;
    },

    async listNotes({ tenantId, leadId, customerId, opportunityId }) {
      const where: Record<string, unknown> = { tenantId };
      if (leadId !== undefined) where.leadId = leadId;
      if (customerId !== undefined) where.customerId = customerId;
      if (opportunityId !== undefined) where.opportunityId = opportunityId;
      return prisma.crmNote.findMany({ where, orderBy: { createdAt: "desc" } });
    },
  };
}
