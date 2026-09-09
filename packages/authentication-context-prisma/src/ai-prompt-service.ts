export interface AiPromptRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly tokenCount: number | null;
  readonly createdAt: Date;
}

export interface AiPromptRecordInput {
  readonly tenantId: string;
  readonly projectId: string;
  readonly sessionId: string;
  readonly role: string;
  readonly content: string;
  readonly tokenCount?: number | null;
}

export interface AiPromptService {
  recordPrompt(input: AiPromptRecordInput): Promise<AiPromptRecord>;
  listPromptsForSession(args: { tenantId: string; sessionId: string }): Promise<readonly AiPromptRecord[]>;
}

interface AiPromptPrismaClient {
  readonly aiPrompt: {
    create: (args: { data: Record<string, unknown> }) => Promise<AiPromptRecord>;
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<AiPromptRecord[]>;
  };
}

export function createAiPromptService(prisma: AiPromptPrismaClient): AiPromptService {
  return {
    async recordPrompt(input) {
      return prisma.aiPrompt.create({
        data: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          sessionId: input.sessionId,
          role: input.role,
          content: input.content,
          tokenCount: input.tokenCount ?? null,
        },
      });
    },
    async listPromptsForSession({ tenantId, sessionId }) {
      return prisma.aiPrompt.findMany({
        where: { tenantId, sessionId },
        orderBy: { createdAt: "asc" },
      });
    },
  };
}
