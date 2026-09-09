import { describe, expect, it, vi } from "vitest";
import { createModelUsageService } from "./model-usage-service";

function createFixture() {
  const state = {
    usages: new Map<string, { tenantId: string; projectId: string | null; promptTokens: number; completionTokens: number; totalTokens: number; durationMs: number }>(),
  };
  const prisma = {
    modelUsage: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `usage-${Date.now()}`,
          tenantId: data.tenantId as string,
          projectId: (data.projectId as string | null) ?? null,
          provider: data.provider as string,
          modelName: data.modelName as string,
          promptTokens: data.promptTokens as number,
          completionTokens: data.completionTokens as number,
          totalTokens: data.totalTokens as number,
          durationMs: data.durationMs as number,
          createdAt: new Date(),
        };
        state.usages.set(record.id, record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; projectId?: string | null } } = {}) =>
        [...state.usages.values()].filter((u) => {
          if (where?.tenantId && u.tenantId !== where.tenantId) return false;
          if (where?.projectId !== undefined && u.projectId !== where.projectId) return false;
          return true;
        })),
    },
  };
  return { prisma, state };
}

describe("model-usage service", () => {
  it("records usage with provider-independent fields", async () => {
    const { prisma } = createFixture();
    const service = createModelUsageService(prisma as never);

    const usage = await service.recordUsage({
      tenantId: "tenant-1",
      projectId: "project-1",
      provider: "openai",
      modelName: "gpt-4o",
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      durationMs: 1200,
    });

    expect(usage.provider).toBe("openai");
    expect(usage.totalTokens).toBe(300);
    expect(prisma.modelUsage.create).toHaveBeenCalledTimes(1);
  });

  it("returns summary for a project", async () => {
    const { prisma, state } = createFixture();
    const service = createModelUsageService(prisma as never);

    state.usages.set("usage-1", {
      tenantId: "tenant-1",
      projectId: "project-1",
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      durationMs: 1000,
    });
    state.usages.set("usage-2", {
      tenantId: "tenant-1",
      projectId: "project-1",
      promptTokens: 50,
      completionTokens: 150,
      totalTokens: 200,
      durationMs: 500,
    });
    state.usages.set("usage-3", {
      tenantId: "tenant-2",
      projectId: "project-1",
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      durationMs: 100,
    });

    const summary = await service.getProjectUsageSummary({ tenantId: "tenant-1", projectId: "project-1" });

    expect(summary).toEqual({
      totalPromptTokens: 150,
      totalCompletionTokens: 350,
      totalTokens: 500,
      totalDurationMs: 1500,
      requestCount: 2,
    });
  });

  it("returns null when no usage exists for the project", async () => {
    const { prisma } = createFixture();
    const service = createModelUsageService(prisma as never);

    const summary = await service.getProjectUsageSummary({ tenantId: "tenant-1", projectId: "missing" });

    expect(summary).toBeNull();
  });
});
