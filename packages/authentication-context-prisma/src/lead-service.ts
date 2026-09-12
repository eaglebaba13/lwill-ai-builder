export interface LeadRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly source: string | null;
  readonly status: string;
  readonly convertedToCustomerId: string | null;
  readonly convertedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface LeadCreateInput {
  readonly name: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly source?: string | null;
}

export interface LeadUpdateInput {
  readonly name?: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly source?: string | null;
}

export interface LeadConvertResult {
  readonly lead: LeadRecord;
  readonly customer: { readonly id: string; readonly name: string; readonly email: string | null; readonly phone: string | null };
}

export interface LeadService {
  createLead(args: { tenantId: string; input: LeadCreateInput; actorUserId?: string | null }): Promise<LeadRecord>;
  getLead(args: { tenantId: string; leadId: string }): Promise<LeadRecord | null>;
  listLeads(args: { tenantId: string; status?: string }): Promise<readonly LeadRecord[]>;
  updateLead(args: { tenantId: string; leadId: string; input: LeadUpdateInput }): Promise<LeadRecord | null>;
  convertLead(args: { tenantId: string; leadId: string; actorUserId?: string | null }): Promise<LeadConvertResult | null>;
}

interface LeadPrismaClient {
  readonly lead: {
    create: (args: { data: Record<string, unknown> }) => Promise<LeadRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<LeadRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<LeadRecord[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<LeadRecord>;
  };
  readonly customer: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; name: string; email: string | null; phone: string | null }>;
  };
  readonly auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  $transaction: <T>(callback: (client: LeadPrismaClient) => Promise<T>) => Promise<T>;
}

function recordAudit(
  prisma: LeadPrismaClient,
  args: { tenantId: string; actorUserId: string | null; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> },
): void {
  const auditLog = (prisma as { auditLog?: unknown }).auditLog;
  if (auditLog === undefined) return;
  void (auditLog as { create: (a: { data: Record<string, unknown> }) => Promise<unknown> })
    .create({ data: args })
    .catch(() => {});
}

export function createLeadService(prisma: LeadPrismaClient): LeadService {
  return {
    async createLead({ tenantId, input, actorUserId }) {
      const lead = await prisma.lead.create({
        data: {
          tenantId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          source: input.source ?? null,
        },
      });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "lead.created",
        entityType: "Lead",
        entityId: lead.id,
        metadata: { name: lead.name, source: lead.source },
      });

      return lead;
    },

    async getLead({ tenantId, leadId }) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead === null || lead.tenantId !== tenantId) return null;
      return lead;
    },

    async listLeads({ tenantId, status }) {
      const where: Record<string, unknown> = { tenantId };
      if (status !== undefined) where.status = status;
      return prisma.lead.findMany({ where, orderBy: { createdAt: "desc" } });
    },

    async updateLead({ tenantId, leadId, input }) {
      const existing = await prisma.lead.findUnique({ where: { id: leadId } });
      if (existing === null || existing.tenantId !== tenantId) return null;
      if (existing.status === "CONVERTED") return null;

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.email !== undefined) data.email = input.email;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.source !== undefined) data.source = input.source;

      if (Object.keys(data).length === 0) return existing;
      return prisma.lead.update({ where: { id: leadId }, data });
    },

    async convertLead({ tenantId, leadId, actorUserId }) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead === null || lead.tenantId !== tenantId) return null;
      if (lead.status === "CONVERTED") return null;

      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            tenantId,
            name: lead.name,
            email: lead.email ?? null,
            phone: lead.phone ?? null,
            notes: lead.source !== null ? `Converted from lead (source: ${lead.source})` : "Converted from lead",
          },
        });

        const updatedLead = await tx.lead.update({
          where: { id: leadId },
          data: {
            status: "CONVERTED",
            convertedToCustomerId: customer.id,
            convertedAt: new Date(),
          },
        });

        return { lead: updatedLead, customer };
      });

      recordAudit(prisma, {
        tenantId,
        actorUserId: actorUserId ?? null,
        action: "lead.converted",
        entityType: "Lead",
        entityId: leadId,
        metadata: { customerId: result.customer.id, leadName: lead.name },
      });

      return result;
    },
  };
}
