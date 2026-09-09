import { describe, expect, it, vi } from "vitest";
import { createAiPromptService } from "./ai-prompt-service";

function createFixture() {
  type AiPromptState = {
    id: string;
    tenantId: string;
    projectId: string;
    sessionId: string;
    role: string;
    content: string;
    tokenCount: number | null;
    createdAt: Date;
  };
  const state = {
    prompts: new Map<string, AiPromptState>(),
  };
  const prisma = {
    aiPrompt: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = {
          id: `prompt-${Date.now()}`,
          tenantId: data.tenantId as string,
          projectId: data.projectId as string,
          sessionId: data.sessionId as string,
          role: data.role as string,
          content: data.content as string,
          tokenCount: (data.tokenCount as number | null) ?? null,
          createdAt: new Date(),
        };
        state.prompts.set(record.id, record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where?: { tenantId?: string; sessionId?: string } }) =>
        [...state.prompts.values()].filter((p) => {
          if (where?.tenantId && p.tenantId !== where.tenantId) return false;
          if (where?.sessionId && p.sessionId !== where.sessionId) return false;
          return true;
        })),
    },
  };
  return { prisma, state };
}

describe("ai-prompt service", () => {
  it("records a prompt with tenant/project/session linkage", async () => {
    const { prisma } = createFixture();
    const service = createAiPromptService(prisma as never);

    const prompt = await service.recordPrompt({
      tenantId: "tenant-1",
      projectId: "project-1",
      sessionId: "session-1",
      role: "user",
      content: "Hello",
      tokenCount: 5,
    });

    expect(prompt.role).toBe("user");
    expect(prompt.tokenCount).toBe(5);
    expect(prisma.aiPrompt.create).toHaveBeenCalledTimes(1);
  });

  it("lists prompts for a session ordered by createdAt", async () => {
    const { prisma, state } = createFixture();
    const service = createAiPromptService(prisma as never);

    state.prompts.set("prompt-1", {
      id: "prompt-1",
      tenantId: "tenant-1",
      projectId: "project-1",
      sessionId: "session-1",
      role: "user",
      content: "A",
      tokenCount: 1,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    state.prompts.set("prompt-2", {
      id: "prompt-2",
      tenantId: "tenant-2",
      projectId: "project-1",
      sessionId: "session-1",
      role: "assistant",
      content: "B",
      tokenCount: 2,
      createdAt: new Date("2026-01-02T00:00:00Z"),
    });

    const prompts = await service.listPromptsForSession({ tenantId: "tenant-1", sessionId: "session-1" });

    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.id).toBe("prompt-1");
  });

  it("returns empty list when no prompts match", async () => {
    const { prisma } = createFixture();
    const service = createAiPromptService(prisma as never);

    const prompts = await service.listPromptsForSession({ tenantId: "tenant-1", sessionId: "missing" });

    expect(prompts).toHaveLength(0);
  });
});
