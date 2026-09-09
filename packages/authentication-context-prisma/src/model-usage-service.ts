export interface ModelUsageRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly projectId: string | null;
  readonly provider: string;
  readonly modelName: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
  readonly createdAt: Date;
}

export interface ModelUsageRecordInput {
  readonly tenantId: string;
  readonly projectId?: string | null;
  readonly provider: string;
  readonly modelName: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly durationMs: number;
}

export interface ProjectUsageSummary {
  readonly totalPromptTokens: number;
  readonly totalCompletionTokens: number;
  readonly totalTokens: number;
  readonly totalDurationMs: number;
  readonly requestCount: number;
}

export interface ModelUsageService {
  recordUsage(input: ModelUsageRecordInput): Promise<ModelUsageRecord>;
  getProjectUsageSummary(args: {
    tenantId: string;
    projectId: string;
  }): Promise<ProjectUsageSummary | null>;
}

interface ModelUsagePrismaClient {
  readonly modelUsage: {
    create: (args: { data: Record<string, unknown> }) => Promise<ModelUsageRecord>;
    findMany: (args: { where?: Record<string, unknown>; select?: Record<string, unknown> }) => Promise<Array<{
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      durationMs: number;
    }>>;
  };
}

export function createModelUsageService(prisma: ModelUsagePrismaClient): ModelUsageService {
  return {
    async recordUsage(input) {
      return prisma.modelUsage.create({
        data: {
          tenantId: input.tenantId,
          projectId: input.projectId ?? null,
          provider: input.provider,
          modelName: input.modelName,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          totalTokens: input.totalTokens,
          durationMs: input.durationMs,
        },
      });
    },
    async getProjectUsageSummary({ tenantId, projectId }) {
      const rows = await prisma.modelUsage.findMany({
        where: { tenantId, projectId },
        select: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          durationMs: true,
        },
      });
      if (rows.length === 0) {
        return null;
      }
      const summary = rows.reduce(
        (acc, row) => ({
          totalPromptTokens: acc.totalPromptTokens + row.promptTokens,
          totalCompletionTokens: acc.totalCompletionTokens + row.completionTokens,
          totalTokens: acc.totalTokens + row.totalTokens,
          totalDurationMs: acc.totalDurationMs + row.durationMs,
          requestCount: acc.requestCount + 1,
        }),
        { totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, totalDurationMs: 0, requestCount: 0 },
      );
      return summary;
    },
  };
}
