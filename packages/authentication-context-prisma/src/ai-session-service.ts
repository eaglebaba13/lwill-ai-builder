export interface AiSessionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly userId: string | null;
  readonly title: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AiSessionCreateInput {
  readonly tenantId: string;
  readonly projectId: string;
  readonly userId?: string | null;
  readonly title: string;
}

export interface AiSessionService {
  createSession(input: AiSessionCreateInput): Promise<AiSessionRecord>;
  getSession(args: { tenantId: string; sessionId: string }): Promise<AiSessionRecord | null>;
  listSessions(args: { tenantId: string; projectId?: string }): Promise<readonly AiSessionRecord[]>;
}

interface AiSessionPrismaClient {
  readonly aiSession: {
    create: (args: { data: Record<string, unknown> }) => Promise<AiSessionRecord>;
    findUnique: (args: { where: { id: string } }) => Promise<AiSessionRecord | null>;
    findMany: (args: { where?: Record<string, unknown> }) => Promise<AiSessionRecord[]>;
  };
}

export function createAiSessionService(prisma: AiSessionPrismaClient): AiSessionService {
  return {
    async createSession(input) {
      return prisma.aiSession.create({
        data: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          userId: input.userId ?? null,
          title: input.title,
        },
      });
    },
    async getSession({ tenantId, sessionId }) {
      const session = await prisma.aiSession.findUnique({ where: { id: sessionId } });
      if (session === null) {
        return null;
      }
      if (session.tenantId !== tenantId) {
        return null;
      }
      return session;
    },
    async listSessions({ tenantId, projectId }) {
      const where: Record<string, unknown> = { tenantId };
      if (projectId !== undefined) {
        where.projectId = projectId;
      }
      return prisma.aiSession.findMany({ where });
    },
  };
}
