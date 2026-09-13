export interface CommunicationRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly channel: string;
  readonly direction: string;
  readonly contactName: string | null;
  readonly subject: string | null;
  readonly body: string;
  readonly communicatedAt: Date;
  readonly leadId: string | null;
  readonly customerId: string | null;
  readonly opportunityId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CommunicationCreateInput {
  readonly channel: string;
  readonly direction: string;
  readonly contactName?: string | null;
  readonly subject?: string | null;
  readonly body: string;
  readonly communicatedAt: string;
  readonly leadId?: string | null;
  readonly customerId?: string | null;
  readonly opportunityId?: string | null;
}

export interface CommunicationService {
  createCommunication(args: { tenantId: string; input: CommunicationCreateInput }): Promise<CommunicationRecord>;
  getCommunication(args: { tenantId: string; communicationId: string }): Promise<CommunicationRecord | null>;
  listCommunications(args: { tenantId: string; channel?: string; direction?: string; leadId?: string; customerId?: string; opportunityId?: string }): Promise<readonly CommunicationRecord[]>;
}

interface CommunicationPrismaClient {
  readonly communication: {
    create: (args: { data: Record<string, unknown> }) => Promise<CommunicationRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<CommunicationRecord | null>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<CommunicationRecord[]>;
  };
}

const VALID_CHANNELS = new Set(["email", "whatsapp", "sms", "phone", "in_person", "other"]);
const VALID_DIRECTIONS = new Set(["inbound", "outbound"]);

export function createCommunicationService(prisma: CommunicationPrismaClient): CommunicationService {
  return {
    async createCommunication({ tenantId, input }) {
      return prisma.communication.create({
        data: {
          tenantId,
          channel: input.channel,
          direction: input.direction,
          contactName: input.contactName ?? null,
          subject: input.subject ?? null,
          body: input.body,
          communicatedAt: new Date(input.communicatedAt),
          leadId: input.leadId ?? null,
          customerId: input.customerId ?? null,
          opportunityId: input.opportunityId ?? null,
        },
      });
    },

    async getCommunication({ tenantId, communicationId }) {
      const communication = await prisma.communication.findUnique({ where: { id: communicationId } });
      if (communication === null || communication.tenantId !== tenantId) return null;
      return communication;
    },

    async listCommunications({ tenantId, channel, direction, leadId, customerId, opportunityId }) {
      const where: Record<string, unknown> = { tenantId };
      if (channel !== undefined) where.channel = channel;
      if (direction !== undefined) where.direction = direction;
      if (leadId !== undefined) where.leadId = leadId;
      if (customerId !== undefined) where.customerId = customerId;
      if (opportunityId !== undefined) where.opportunityId = opportunityId;
      return prisma.communication.findMany({ where, orderBy: { communicatedAt: "desc" } });
    },
  };
}

export { VALID_CHANNELS, VALID_DIRECTIONS };
